import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";

import {
  updateLabelsThunk,
  bulkUpdateLabelsThunk,
  updateEmailStarredThunk,
  updateEmailImportantThunk,
  snoozeThreadThunk,
  unsnoozeThreadThunk,
  moveToTrashThunk,
  moveToSpamThunk,
  deleteEmailThunk,
  bulkUpdateEmailStarredThunk,
  bulkUpdateEmailImportantThunk,
  bulkUpdateEmailReadThunk,
  bulkMoveToSpamThunk,
  bulkMoveFromSpamThunk,
  bulkMoveToTrashThunk,
  bulkMoveToFolderThunk,
  bulkDeleteEmailThunk,
  bulkArchiveEmailsThunk,
  bulkSnoozeThreadsThunk,
  bulkUnsnoozeThreadsThunk,
  bulkUnstarThreadsThunk,
  updateThreadImportantThunk,
} from "../store/slices/mailSlice";
import { useGlobalContext } from "../contexts/GlobalContext";
import { useIdResolver, makeMatch } from "./useIdResolver";

// Re-export makeMatch for backward compatibility
export { makeMatch };

const normaliseLabels = (arr) => {
  const out = [];
  const seen = new Set();
  for (const v of arr || []) {
    const s = String(v).trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
};

// Remove all system labels except those in `except` array
const removeSystemLabels = (labelSet, labelsMap, except = []) => {
  for (const [key, meta] of Object.entries(labelsMap)) {
    if (meta.system && !except.includes(key)) {
      labelSet.delete(key);
    }
  }
};

// Helper to apply an operation with Undo support
const withUndo = (ids, setEmails, operation) => {
  const match = makeMatch(ids);
  const originalStates = new Map();

  setEmails((prev) => {
    prev.forEach((m) => {
      if (match(m)) {
        originalStates.set(m.id, { labels: [...(m.labels || [])] });
      }
    });
    return prev;
  });

  operation(match);

  const undo = () => {
    setEmails((prev) =>
      prev.map((m) => (match(m) && originalStates.has(m.id) ? { ...m, labels: originalStates.get(m.id).labels } : m))
    );
  };

  undo.originalStates = originalStates;

  return undo;
};

/* ────────────────────────────────────────────────────────────────────────────
 * Hook
 * ────────────────────────────────────────────────────────────────────────── */

export default function useMailActions() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { setEmails, emails, labels, setSoftRemovedLabels, softRemovedLabels } = useGlobalContext();

  // Centralized ID resolution hook
  const { resolveIds, resolveThreadIds } = useIdResolver();

  // Get key to ID mapping for transforming composite keys to UUIDs
  const keyToLabelIdMap = useSelector((state) => state.mail.keyToLabelIdMap || {});

  // Helper to update React Query cache optimistically
  const updateQueryCache = useCallback(
    (ids, updater) => {
      const match = makeMatch(ids);

      // Update all queries that start with "emails" using predicate for broader matching
      queryClient.setQueriesData(
        {
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key[0] === "emails";
          },
        },
        (oldData) => {
          if (!oldData?.results) return oldData;

          return {
            ...oldData,
            results: oldData.results.map((email) => {
              if (match(email)) {
                return updater(email);
              }
              return email;
            }),
          };
        }
      );
    },
    [queryClient]
  );

  // Helper to remove items from React Query cache (for snooze, trash, etc.)
  const removeFromQueryCache = useCallback(
    (ids) => {
      const match = makeMatch(ids);

      // Remove from all queries that start with "emails"
      queryClient.setQueriesData(
        {
          predicate: (query) => {
            const key = query.queryKey;
            return Array.isArray(key) && key[0] === "emails";
          },
        },
        (oldData) => {
          if (!oldData?.results) return oldData;

          return {
            ...oldData,
            results: oldData.results.filter((email) => !match(email)),
          };
        }
      );
    },
    [queryClient]
  );

  // Helper to invalidate thread cache and email list after actions (star, important, labels, etc.)
  // This ensures the list will refetch with correct thread-level status
  // Accepts a single threadId or an array of threadIds to batch invalidations
  const invalidateEmailCaches = useCallback(
    (threadIds) => {
      // Normalize to array
      const ids = Array.isArray(threadIds) ? threadIds : [threadIds];

      // Invalidate each specific thread cache so they get fresh data
      ids.forEach((threadId) => {
        if (threadId) {
          queryClient.invalidateQueries({ queryKey: ["email", threadId] });
        }
      });

      // Invalidate email list queries ONCE so they refetch with updated status
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return Array.isArray(key) && key[0] === "emails";
        },
      });
    },
    [queryClient]
  );

  const updateByIds = useCallback(
    (ids, transform) => {
      const match = makeMatch(ids);
      setEmails((prev) =>
        prev.map((m) => {
          if (!match(m)) return m;
          // Use a Map to preserve order and handle both string and object labels
          const labelMap = new Map();
          (m.labels || []).forEach((l) => {
            const name = typeof l === "object" ? l.name : String(l);
            if (name && !labelMap.has(name)) {
              labelMap.set(name, typeof l === "object" ? l : { name: l, id: null, color: null });
            }
          });
          // Create a wrapper that provides Set-like interface but works with the Map
          const labelSet = {
            has: (name) => labelMap.has(String(name)),
            add: (name) => {
              const key = String(name);
              if (!labelMap.has(key)) {
                // Look up the label from labels store to get color
                const labelInfo = labels[key];
                labelMap.set(key, {
                  name: key,
                  id: labelInfo?.id || null,
                  color: labelInfo?.color || null,
                });
              }
            },
            delete: (name) => labelMap.delete(String(name)),
          };
          transform(labelSet, m);
          // Convert back to array of label objects
          return { ...m, labels: Array.from(labelMap.values()) };
        })
      );
    },
    [setEmails, labels]
  );

  const addLabels = useCallback(
    (ids, names = []) =>
      updateByIds(ids, (labelSet) => {
        for (const n of names) {
          if (n) labelSet.add(String(n));
        }
      }),
    [updateByIds]
  );

  const removeLabels = useCallback(
    (ids, names = []) =>
      updateByIds(ids, (labelSet) => {
        for (const n of names) {
          if (n) labelSet.delete(String(n));
        }
      }),
    [updateByIds]
  );

  const modifyLabels = useCallback(
    (ids, { add = [], remove = [] }, threadIds = null) => {
      // Transform composite keys to UUIDs for backend sync
      const transformToIds = (labelKeys) => {
        return labelKeys
          .map((key) => {
            // If it's already a UUID (matches UUID pattern), keep it
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
              return key;
            }
            // If it's a composite key, look up UUID
            if (keyToLabelIdMap[key]) {
              return keyToLabelIdMap[key];
            }
            // If it's a system label (Inbox, Sent, etc.), keep as-is for now
            // System labels might not be in backend yet
            return key;
          })
          .filter(Boolean);
      };

      const labelIdsToAdd = transformToIds(add);
      const labelIdsToRemove = transformToIds(remove);

      // Store previous state for rollback
      const previousState = new Map();
      emails.forEach((email) => {
        if (ids.includes(email.id)) {
          previousState.set(email.id, new Set(email.labels || []));
        }
      });

      // Update local state immediately for optimistic UI feedback
      updateByIds(ids, (labelSet) => {
        // Remove labels first
        for (const n of remove) {
          if (n) labelSet.delete(String(n));
        }
        // Then add new labels (appended at the end)
        for (const n of add) {
          if (n) labelSet.add(String(n));
        }
      });

      // Sync with backend (only for backend labels, skip system labels)
      const backendLabelsToAdd = labelIdsToAdd.filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );
      const backendLabelsToRemove = labelIdsToRemove.filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );

      if (backendLabelsToAdd.length > 0 || backendLabelsToRemove.length > 0) {
        // Use centralized ID resolver for thread IDs
        const { threadIds: resolvedThreadIds } = resolveIds(ids, threadIds);

        if (resolvedThreadIds.length > 0) {
          // Use bulk update endpoint with thread IDs
          dispatch(
            bulkUpdateLabelsThunk({
              threadIds: resolvedThreadIds,
              labels: { add: backendLabelsToAdd, remove: backendLabelsToRemove },
            })
          )
            .then(() => {
              // Invalidate caches after successful label update
              invalidateEmailCaches(resolvedThreadIds);
            })
            .catch((error) => {
              console.error("Failed to sync labels with backend:", error);
              // Rollback local optimistic updates on error
              setEmails((prevEmails) =>
                prevEmails.map((email) => {
                  const prevLabels = previousState.get(email.id);
                  if (prevLabels) {
                    return { ...email, labels: Array.from(prevLabels) };
                  }
                  return email;
                })
              );
            });
        }
      }
    },
    [updateByIds, dispatch, keyToLabelIdMap, emails, setEmails, invalidateEmailCaches, resolveIds]
  );

  const moveToInbox = useCallback(
    (ids, { resolvedEmailIds, resolvedThreadIds } = {}) => {
      // Use pre-resolved IDs if provided, otherwise find from emails context
      let emailIds = resolvedEmailIds;
      let threadIds = resolvedThreadIds || [];

      if (!emailIds || emailIds.length === 0) {
        const match = makeMatch(ids);
        const matchingEmails = emails.filter(match);
        emailIds = matchingEmails.map((email) => email.id).filter(Boolean);
        threadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];
      }

      // Use folder move API (same as bulk action)
      if (emailIds.length > 0) {
        dispatch(bulkMoveToFolderThunk({ emailIds, folder: "inbox" }))
          .then(() => {
            invalidateEmailCaches(threadIds.length ? threadIds : emailIds);
          })
          .catch((error) => {
            console.error("Failed to move to inbox:", error);
          });
      }

      const undoEmailIds = emailIds ? [...emailIds] : [];
      const undoThreadIds = threadIds.length ? [...threadIds] : [];

      // Optimistic update
      const undo = withUndo(ids, setEmails, () => {
        updateByIds(ids, (labelSet, email) => {
          if (labelSet.has("Muted")) {
            setSoftRemovedLabels((prev) => ({
              ...prev,
              [email.id]: [...(prev[email.id] || []), "Muted"],
            }));
          }

          removeSystemLabels(labelSet, labels, ["Inbox"]);
          labelSet.delete("Muted");
          labelSet.delete("Trash");
          labelSet.delete("Spam");
          labelSet.add("Inbox");
        });
      });

      return () => {
        // Revert optimistic update locally
        undo();
        setSoftRemovedLabels((prev) => {
          const updated = { ...prev };
          ids.forEach((id) => delete updated[id]);
          return updated;
        });

        const targetEmailIds = undoEmailIds.length ? undoEmailIds : ids.filter(Boolean);
        if (targetEmailIds.length > 0) {
          dispatch(bulkMoveToTrashThunk({ emailIds: targetEmailIds }))
            .then(() => {
              invalidateEmailCaches(undoThreadIds.length ? undoThreadIds : targetEmailIds);
            })
            .catch((error) => {
              console.error("Failed to undo move to inbox:", error);
            });
        }
      };
    },
    [updateByIds, setEmails, labels, setSoftRemovedLabels, emails, dispatch, invalidateEmailCaches]
  );

  const archive = useCallback(
    (ids) => {
      // Extract thread IDs for backend sync
      const match = makeMatch(ids);
      const threadIds = [
        ...new Set(
          emails
            .filter(match)
            .map((email) => email.thread_id)
            .filter(Boolean)
        ),
      ];

      // Call bulk backend API with thread IDs
      if (threadIds.length > 0) {
        dispatch(bulkArchiveEmailsThunk({ threadIds })).catch((error) => {
          console.error("Failed to bulk archive threads:", error);
        });
      }

      return updateByIds(ids, (labels) => {
        labels.delete("Inbox");
      });
    },
    [updateByIds, emails, dispatch]
  );

  const deleteAllSpam = useCallback(() => {
    // fully delete all spam emails
    setEmails((prev) => prev.filter((m) => !m.labels.includes("Spam")));
  }, [setEmails]);

  const moveToSpam = useCallback(
    (ids) => {
      // If ids are already email UUIDs (from ActionBar), use them directly
      // Otherwise, find matching emails by thread ID or other keys
      let emailIds = [];
      const normalizedIds = ids.map((value) => String(value || "").trim()).filter(Boolean);
      const uuidPattern = /^[0-9a-fA-F-]{32,}$/;

      const match = makeMatch(normalizedIds);
      const matchingEmails = emails.filter(match);

      emailIds = matchingEmails.map((email) => email.id).filter(Boolean);
      const threadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];

      if (emailIds.length) {
        // Successfully extracted email IDs from matching emails
      } else if (normalizedIds.every((id) => uuidPattern.test(id))) {
        emailIds = normalizedIds;
      } else {
        console.warn("moveToSpam: could not resolve email IDs for selection", normalizedIds);
      }

      const undoEmailIds = emailIds.length ? [...emailIds] : ids.filter(Boolean);
      const undoThreadIds = threadIds.length ? [...threadIds] : [];

      // Optimistically update React Query cache
      updateQueryCache(ids, (email) => {
        const updatedLabels = [...(email.labels || [])];
        const labelSet = new Set(updatedLabels);
        removeSystemLabels(labelSet, labels, ["Spam"]);
        labelSet.add("Spam");
        return { ...email, labels: [...labelSet] };
      });

      // Backward compatibility: update local state
      let revertLocalState = withUndo(ids, setEmails, () => {
        updateByIds(ids, (labelSet) => {
          removeSystemLabels(labelSet, labels, ["Spam"]);
          labelSet.add("Spam");
        });
      });
      const originalStates = revertLocalState.originalStates || new Map();
      let hasRestored = false;
      let actionFailed = false;

      const restoreOriginalState = () => {
        if (hasRestored) return;

        updateQueryCache(ids, (email) => {
          const original = originalStates.get(email.id);
          if (original) {
            return { ...email, labels: [...(original.labels || [])] };
          }
          const labelSet = new Set(email.labels || []);
          labelSet.delete("Spam");
          return { ...email, labels: [...labelSet] };
        });

        if (revertLocalState) {
          revertLocalState();
          revertLocalState = null;
        }

        hasRestored = true;
      };

      // Call bulk backend API with all email IDs at once
      if (emailIds && emailIds.length > 0) {
        dispatch(bulkMoveToSpamThunk({ emailIds }))
          .unwrap()
          .then(() => {
            // Invalidate caches after successful spam move
            invalidateEmailCaches(threadIds);
          })
          .catch((error) => {
            console.error("Failed to bulk move emails to spam:", error);
            actionFailed = true;
            restoreOriginalState();
          });
      } else {
        console.warn("moveToSpam: No email IDs to process, skipping API call");
        actionFailed = true;
        restoreOriginalState();
      }

      return () => {
        if (actionFailed) return;

        restoreOriginalState();

        const targetEmailIds = undoEmailIds.length ? undoEmailIds : ids.filter(Boolean);
        const targetThreadIds = undoThreadIds.length ? undoThreadIds : [];

        if (targetEmailIds.length > 0) {
          dispatch(bulkMoveFromSpamThunk({ emailIds: targetEmailIds }))
            .unwrap()
            .then(() => {
              invalidateEmailCaches(targetThreadIds.length ? targetThreadIds : targetEmailIds);
            })
            .catch((error) => {
              console.error("Failed to restore from spam:", error);
            });
        }
      };
    },
    [updateByIds, setEmails, labels, dispatch, emails, updateQueryCache, invalidateEmailCaches]
  );

  const notSpam = useCallback(
    (ids) => {
      // Extract email IDs and thread IDs for backend sync
      const match = makeMatch(ids);
      const matchingEmails = emails.filter(match);
      let emailIds = matchingEmails.map((email) => email.id);
      const threadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];

      // If no matching emails found, check if ids are already UUIDs (e.g., from undo action)
      if (emailIds.length === 0) {
        const normalizedIds = ids.map((value) => String(value || "").trim()).filter(Boolean);
        const uuidPattern = /^[0-9a-fA-F-]{32,}$/;
        if (normalizedIds.every((id) => uuidPattern.test(id))) {
          emailIds = normalizedIds;
        }
      }

      const undoEmailIds = emailIds.length ? [...emailIds] : ids.filter(Boolean);
      const undoThreadIds = threadIds.length ? [...threadIds] : [];

      let revertLocalState = withUndo(ids, setEmails, () => {
        updateByIds(ids, (labels) => {
          labels.delete("Spam");
          labels.add("Inbox");
        });
      });
      const originalStates = revertLocalState.originalStates || new Map();
      let hasRestored = false;
      let actionFailed = false;

      const restoreSpamState = () => {
        if (hasRestored) return;

        updateQueryCache(ids, (email) => {
          const original = originalStates.get(email.id);
          if (original) {
            return { ...email, labels: [...(original.labels || [])] };
          }
          const labelSet = new Set(email.labels || []);
          labelSet.add("Spam");
          labelSet.delete("Inbox");
          return { ...email, labels: [...labelSet] };
        });

        if (revertLocalState) {
          revertLocalState();
          revertLocalState = null;
        }

        hasRestored = true;
      };

      // Call bulk backend API FIRST
      if (emailIds.length > 0) {
        dispatch(bulkMoveFromSpamThunk({ emailIds }))
          .unwrap()
          .then(() => {
            // Invalidate caches after successful unspam
            invalidateEmailCaches(threadIds);
          })
          .catch((error) => {
            console.error("Failed to bulk remove spam from emails:", error);
            actionFailed = true;
            restoreSpamState();
          });
      } else {
        console.warn("notSpam: No email IDs to process, skipping API call");
        actionFailed = true;
        restoreSpamState();
      }

      if (!actionFailed) {
        // Optimistically update React Query cache
        updateQueryCache(ids, (email) => {
          const updatedLabels = [...(email.labels || [])];
          const labelSet = new Set(updatedLabels);
          labelSet.delete("Spam");
          labelSet.add("Inbox");
          return { ...email, labels: [...labelSet] };
        });
      }

      return () => {
        if (actionFailed) return;

        restoreSpamState();

        const targetEmailIds = undoEmailIds.length ? undoEmailIds : ids.filter(Boolean);
        const targetThreadIds = undoThreadIds.length ? undoThreadIds : [];

        if (targetEmailIds.length > 0) {
          dispatch(bulkMoveToSpamThunk({ emailIds: targetEmailIds }))
            .unwrap()
            .then(() => {
              invalidateEmailCaches(targetThreadIds.length ? targetThreadIds : targetEmailIds);
            })
            .catch((error) => {
              console.error("Failed to undo spam removal:", error);
            });
        }
      };
    },
    [updateByIds, emails, dispatch, updateQueryCache, invalidateEmailCaches, setEmails]
  );

  const moveToTrash = useCallback(
    (ids) => {
      // If ids are already email UUIDs (from ActionBar), use them directly
      // Otherwise, find matching emails by thread ID or other keys
      let emailIds = [];
      let threadIds = [];

      // Check if first ID looks like a UUID (contains hyphens, 32+ chars)
      const firstId = String(ids[0] || "");
      const isUUID = firstId.includes("-") && firstId.length >= 32;

      if (isUUID) {
        // Already email IDs, use directly
        emailIds = ids.filter(Boolean);
        // Still need to find thread IDs for cache invalidation
        const matchingEmails = emails.filter((email) => emailIds.includes(email.id));
        threadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];
      } else {
        // Find matching emails by thread/message IDs
        const match = makeMatch(ids);
        const matchingEmails = emails.filter(match);
        emailIds = matchingEmails.map((email) => email.id).filter(Boolean);
        threadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];
      }

      const undoEmailIds = [...emailIds];
      const undoThreadIds = [...threadIds];

      // Optimistically update local state
      updateByIds(ids, (labelSet) => {
        removeSystemLabels(labelSet, labels, ["Trash"]);
        labelSet.add("Trash");
      });

      // Call bulk backend API with all email IDs at once
      if (emailIds.length > 0) {
        dispatch(bulkMoveToTrashThunk({ emailIds }))
          .then(() => {
            // Invalidate caches after successful trash move
            invalidateEmailCaches(threadIds.length ? threadIds : emailIds);
          })
          .catch((error) => {
            console.error("Failed to bulk move emails to trash:", error);
            // Revert optimistic update on error
            updateByIds(ids, (labelSet) => {
              labelSet.delete("Trash");
              labelSet.add("Inbox");
            });
          });
      }

      // Return proper undo function that calls backend API to restore from trash
      return () => {
        // Optimistically revert local state immediately
        updateByIds(ids, (labelSet) => {
          labelSet.delete("Trash");
          labelSet.add("Inbox");
        });

        const targetEmailIds = undoEmailIds.length ? undoEmailIds : ids.filter(Boolean);
        const targetThreadIds = undoThreadIds.length ? undoThreadIds : [];

        if (targetEmailIds.length > 0) {
          dispatch(bulkMoveToFolderThunk({ emailIds: targetEmailIds, folder: "inbox" }))
            .then(() => {
              invalidateEmailCaches(targetThreadIds.length ? targetThreadIds : targetEmailIds);
            })
            .catch((error) => {
              console.error("Failed to restore from trash:", error);
            });
        }
      };
    },
    [updateByIds, labels, dispatch, emails, invalidateEmailCaches]
  );

  const restoreFromTrash = useCallback(
    (ids) => {
      // Get email IDs and thread IDs for API call
      const match = makeMatch(ids);
      const matchingEmails = emails.filter(match);
      const emailIds = matchingEmails.map((email) => email.id).filter(Boolean);
      const threadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];

      // Use folder move API with email IDs
      if (emailIds.length > 0) {
        dispatch(bulkMoveToFolderThunk({ emailIds, folder: "inbox" }))
          .then(() => {
            invalidateEmailCaches(threadIds.length ? threadIds : emailIds);
          })
          .catch((error) => {
            console.error("Failed to restore from trash:", error);
          });
      }

      // Optimistic update
      return updateByIds(ids, (labelSet) => {
        let emailIds;
        labelSet.add("Inbox");
      });
    },
    [updateByIds, emails, dispatch, invalidateEmailCaches]
  );

  const toggleStar = useCallback(
    (ids, currentStarredState, context = "list", threadIds = null) => {
      // Determine the new state
      const newState = currentStarredState !== undefined ? !currentStarredState : true;

      // Use centralized ID resolver
      const { emailIds, threadIds: resolvedThreadIds, allIds, matchAll, isSingle } = resolveIds(ids, threadIds);

      if (!emailIds.length) return;

      // Optimistic updates using resolved IDs
      updateQueryCache(allIds, (email) => ({ ...email, is_starred: newState }));
      setEmails((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_starred: newState } : m)));

      // Revert function for error handling
      const revertUpdate = () => {
        updateQueryCache(allIds, (email) => ({ ...email, is_starred: !newState }));
      };

      // API call based on action and context
      if (newState === true) {
        // STARRING: Use email-level endpoints
        const apiCall = isSingle
          ? dispatch(updateEmailStarredThunk({ emailId: emailIds[0], is_starred: true }))
          : dispatch(bulkUpdateEmailStarredThunk({ emailIds, is_starred: true }));

        apiCall
          .then(() => invalidateEmailCaches(resolvedThreadIds))
          .catch((error) => {
            console.error("Failed to star email(s):", error);
            revertUpdate();
          });
      } else {
        // UNSTARRING: Context-dependent
        if (context === "list" && resolvedThreadIds.length > 0) {
          // From List: Use thread-level unstar
          dispatch(bulkUnstarThreadsThunk({ threadIds: resolvedThreadIds }))
            .then(() => invalidateEmailCaches(resolvedThreadIds))
            .catch((error) => {
              console.error("Failed to unstar threads:", error);
              revertUpdate();
            });
        } else {
          // From Detail: Use individual email endpoints
          Promise.all(emailIds.map((emailId) => dispatch(updateEmailStarredThunk({ emailId, is_starred: false }))))
            .then(() => invalidateEmailCaches(resolvedThreadIds))
            .catch((error) => {
              console.error("Failed to unstar emails:", error);
              revertUpdate();
            });
        }
      }
    },
    [setEmails, dispatch, updateQueryCache, invalidateEmailCaches, resolveIds]
  );

  const setStar = useCallback(
    (ids, value = true, context = "detail", threadIds = null) => {
      // Use centralized ID resolver
      const { emailIds, threadIds: resolvedThreadIds, allIds, matchAll, isSingle } = resolveIds(ids, threadIds);

      if (!emailIds.length) return;

      // Optimistic updates using resolved IDs
      updateQueryCache(allIds, (email) => ({ ...email, is_starred: value }));
      setEmails((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_starred: value } : m)));

      // Revert function for error handling
      const revertUpdate = () => {
        updateQueryCache(allIds, (email) => ({ ...email, is_starred: !value }));
      };

      // API call based on action and context
      if (value === true) {
        // STARRING: Use email-level endpoints
        const apiCall = isSingle
          ? dispatch(updateEmailStarredThunk({ emailId: emailIds[0], is_starred: true }))
          : dispatch(bulkUpdateEmailStarredThunk({ emailIds, is_starred: true }));

        apiCall
          .then(() => invalidateEmailCaches(resolvedThreadIds))
          .catch((error) => {
            console.error("Failed to star email(s):", error);
            revertUpdate();
          });
      } else {
        // UNSTARRING: Context-dependent
        if (context === "list" && resolvedThreadIds.length > 0) {
          // From List: Use thread-level unstar
          dispatch(bulkUnstarThreadsThunk({ threadIds: resolvedThreadIds }))
            .then(() => invalidateEmailCaches(resolvedThreadIds))
            .catch((error) => {
              console.error("Failed to unstar threads:", error);
              revertUpdate();
            });
        } else {
          // From Detail: Use email-level endpoints
          const apiCall = isSingle
            ? dispatch(updateEmailStarredThunk({ emailId: emailIds[0], is_starred: false }))
            : dispatch(bulkUpdateEmailStarredThunk({ emailIds, is_starred: false }));

          apiCall
            .then(() => invalidateEmailCaches(resolvedThreadIds))
            .catch((error) => {
              console.error("Failed to unstar email(s):", error);
              revertUpdate();
            });
        }
      }
    },
    [setEmails, dispatch, updateQueryCache, invalidateEmailCaches, resolveIds]
  );

  const markRead = useCallback(
    (ids, read = true) => {
      const match = makeMatch(ids);

      // Optimistically update React Query cache immediately
      updateQueryCache(ids, (email) => ({ ...email, is_read: read }));

      // Also update local state for backward compatibility
      setEmails((prev) => prev.map((m) => (match(m) ? { ...m, is_read: read } : m)));

      // Extract email IDs for backend sync
      const emailIds = [];
      emails.forEach((m) => {
        if (match(m)) {
          emailIds.push(m.id);
        }
      });

      // Call bulk backend API
      if (emailIds.length > 0) {
        dispatch(bulkUpdateEmailReadThunk({ emailIds, is_read: read })).catch((error) => {
          console.error("Failed to bulk update read status:", error);
          // Revert optimistic update on error
          updateQueryCache(ids, (email) => ({ ...email, is_read: !read }));
        });
      }
    },
    [setEmails, dispatch, updateQueryCache, emails]
  );

  const toggleImportant = useCallback(
    (ids, currentImportantState, context = "list", threadIds = null) => {
      // Determine the new state
      const newState = currentImportantState !== undefined ? !currentImportantState : true;

      // Use centralized ID resolver
      const { threadIds: resolvedThreadIds, allIds, matchAll } = resolveIds(ids, threadIds);

      if (!resolvedThreadIds.length) return;

      // Optimistic updates using resolved IDs
      updateQueryCache(allIds, (email) => ({ ...email, is_important: newState }));
      setEmails((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_important: newState } : m)));

      // Revert function for error handling
      const revertUpdate = () => {
        updateQueryCache(allIds, (email) => ({ ...email, is_important: !newState }));
      };

      // Call thread-level endpoint for each thread
      Promise.all(
        resolvedThreadIds.map((threadId) => dispatch(updateThreadImportantThunk({ threadId, is_important: newState })))
      )
        .then(() => invalidateEmailCaches(resolvedThreadIds))
        .catch((error) => {
          console.error("Failed to update important status:", error);
          revertUpdate();
        });
    },
    [setEmails, dispatch, updateQueryCache, invalidateEmailCaches, resolveIds]
  );

  const setImportant = useCallback(
    (threadIds, value = true) => {
      // Use centralized thread ID resolver
      const { threadIds: resolvedThreadIds, match } = resolveThreadIds(threadIds);

      if (!resolvedThreadIds.length) return;

      // Optimistic updates
      updateQueryCache(resolvedThreadIds, (email) => ({ ...email, is_important: !!value }));
      setEmails((prev) =>
        prev.map((m) => {
          const threadIdSet = new Set(resolvedThreadIds);
          return threadIdSet.has(m.thread_id) ? { ...m, is_important: !!value } : m;
        })
      );

      // Revert function for error handling
      const revertUpdate = () => {
        updateQueryCache(resolvedThreadIds, (email) => ({ ...email, is_important: !value }));
      };

      // Use bulk endpoint for all threads at once
      dispatch(bulkUpdateEmailImportantThunk({ threadIds: resolvedThreadIds, is_important: !!value }))
        .then(() => invalidateEmailCaches(resolvedThreadIds))
        .catch((error) => {
          console.error("Failed to update important status:", error);
          revertUpdate();
        });
    },
    [setEmails, dispatch, updateQueryCache, invalidateEmailCaches, resolveThreadIds]
  );

  const moveToLabel = useCallback(
    (ids, name, { resolvedEmailIds, resolvedThreadIds } = {}) => {
      if (!name) return;

      // Use pre-resolved IDs if provided, otherwise find from emails context
      let emailIds = resolvedEmailIds;
      let threadIds = resolvedThreadIds || [];

      if (!emailIds || emailIds.length === 0) {
        const match = makeMatch(ids);
        const matchingEmails = emails.filter(match);

        // Get thread IDs from matched emails
        threadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];

        // Find ALL emails in those threads, not just the matched ones
        // This ensures all emails in a thread are moved together
        const allThreadEmails =
          threadIds.length > 0 ? emails.filter((email) => threadIds.includes(email.thread_id)) : matchingEmails;

        emailIds = allThreadEmails.map((email) => email.id).filter(Boolean);
      }

      // Check if this is a system folder (use move endpoint) vs user label (use labels endpoint)
      // labels object is keyed by UUID, so we need to look up by ID first
      const labelId = keyToLabelIdMap[name];
      const labelMeta = labelId ? labels[labelId] : labels[name];
      const isSystemFolder = labelMeta?.system || labelMeta?.is_system || labelMeta?.is_exclusive;

      if (isSystemFolder && emailIds.length > 0) {
        // Convert label name to folder name (lowercase)
        const folderName = name.toLowerCase();
        dispatch(bulkMoveToFolderThunk({ emailIds, folder: folderName }))
          .then(() => {
            invalidateEmailCaches(threadIds.length ? threadIds : emailIds);
          })
          .catch((error) => {
            console.error("Failed to move to folder:", error);
          });
      } else if (threadIds.length > 0) {
        // For user labels, use labels update
        const targetLabelId = keyToLabelIdMap[name] || labels[name]?.id || name;
        const trashLabelId = keyToLabelIdMap["Trash"] || labels["Trash"]?.id || "Trash";
        const spamLabelId = keyToLabelIdMap["Spam"] || labels["Spam"]?.id || "Spam";
        const labelsToRemove = [trashLabelId, spamLabelId];

        dispatch(
          bulkUpdateLabelsThunk({
            threadIds,
            labels: { add: [targetLabelId], remove: labelsToRemove },
          })
        )
          .then(() => {
            invalidateEmailCaches(threadIds);
          })
          .catch((error) => {
            console.error("Failed to move to label:", error);
          });
      }

      // Optimistic update
      return withUndo(ids, setEmails, () => {
        updateByIds(ids, (labelSet) => {
          labelSet.delete("Trash");
          labelSet.delete("Spam");
          if (isSystemFolder) removeSystemLabels(labelSet, labels, [name]);
          else removeSystemLabels(labelSet, labels);
          labelSet.add(name);
        });
      });
    },
    [updateByIds, setEmails, labels, emails, dispatch, keyToLabelIdMap, invalidateEmailCaches]
  );

  const moveToLabelFrom = useCallback(
    (ids, sourceLabel, dest, { resolvedEmailIds, resolvedThreadIds } = {}) => {
      if (!dest) return;

      // Use pre-resolved IDs if provided, otherwise find from emails context
      let emailIds = resolvedEmailIds;
      let threadIds = resolvedThreadIds || [];

      if (!emailIds || emailIds.length === 0) {
        const match = makeMatch(ids);
        const matchingEmails = emails.filter(match);

        // Get thread IDs from matched emails
        threadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];

        // Find ALL emails in those threads, not just the matched ones
        // This ensures all emails in a thread are moved together
        const allThreadEmails =
          threadIds.length > 0 ? emails.filter((email) => threadIds.includes(email.thread_id)) : matchingEmails;

        emailIds = allThreadEmails.map((email) => email.id).filter(Boolean);
      }

      // Check if this is a system folder (use move endpoint) vs user label (use labels endpoint)
      // labels object is keyed by UUID, so we need to look up by ID first
      const labelId = keyToLabelIdMap[dest];
      const labelMeta = labelId ? labels[labelId] : labels[dest];
      const isSystemFolder = labelMeta?.system || labelMeta?.is_system || labelMeta?.is_exclusive;

      // For system folders (Inbox, Trash, Spam, etc.), use the move endpoint
      // For user labels, use the labels update endpoint
      if (isSystemFolder && emailIds.length > 0) {
        // Convert label name to folder name (lowercase)
        const folderName = dest.toLowerCase();
        dispatch(bulkMoveToFolderThunk({ emailIds, folder: folderName }))
          .then(() => {
            invalidateEmailCaches(threadIds);
          })
          .catch((error) => {
            console.error("Failed to move to folder:", error);
          });
      } else if (threadIds.length > 0) {
        // For user labels, use labels update
        const targetLabelId = keyToLabelIdMap[dest] || labels[dest]?.id || dest;
        const sourceLabelId = sourceLabel
          ? keyToLabelIdMap[sourceLabel] || labels[sourceLabel]?.id || sourceLabel
          : null;

        const trashLabelId = keyToLabelIdMap["Trash"] || labels["Trash"]?.id || "Trash";
        const spamLabelId = keyToLabelIdMap["Spam"] || labels["Spam"]?.id || "Spam";
        const labelsToRemove = [trashLabelId, spamLabelId];

        if (sourceLabelId && !labelsToRemove.includes(sourceLabelId)) {
          labelsToRemove.push(sourceLabelId);
        }

        dispatch(
          bulkUpdateLabelsThunk({
            threadIds,
            labels: { add: [targetLabelId], remove: labelsToRemove },
          })
        )
          .then(() => {
            invalidateEmailCaches(threadIds);
          })
          .catch((error) => {
            console.error("Failed to move to label from:", error);
          });
      }

      // Optimistic update
      return withUndo(ids, setEmails, () => {
        updateByIds(ids, (labelSet) => {
          labelSet.delete("Trash");
          labelSet.delete("Spam");
          if (sourceLabel) labelSet.delete(String(sourceLabel));
          if (isSystemFolder) removeSystemLabels(labelSet, labels, [dest]);
          else removeSystemLabels(labelSet, labels);
          labelSet.add(dest);
        });
      });
    },
    [updateByIds, setEmails, labels, emails, dispatch, keyToLabelIdMap, invalidateEmailCaches]
  );

  const deleteForever = useCallback(
    (ids) => {
      // If ids are already email UUIDs (from ActionBar), use them directly
      // Otherwise, find matching emails by thread ID or other keys
      let emailIds;
      let threadIds = [];

      // Check if first ID looks like a UUID (contains hyphens, 32+ chars)
      const firstId = String(ids[0] || "");
      const isUUID = firstId.includes("-") && firstId.length >= 32;

      if (isUUID) {
        // Already email IDs, use directly
        emailIds = ids;
        // Still need to find thread IDs for cache invalidation
        const matchingEmails = emails.filter((email) => ids.includes(email.id));
        threadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];
      } else {
        // Find matching emails by thread/message IDs
        const match = makeMatch(ids);
        const matchingEmails = emails.filter(match);
        emailIds = matchingEmails.map((email) => email.id);
        threadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];
      }

      // Call bulk backend API with all email IDs at once
      if (emailIds.length > 0) {
        dispatch(bulkDeleteEmailThunk({ emailIds }))
          .then(() => {
            // Invalidate caches after successful delete
            invalidateEmailCaches(threadIds.length ? threadIds : emailIds);
          })
          .catch((error) => {
            console.error("Failed to bulk delete emails permanently:", error);
          });
      }

      // Remove from local state
      const match = makeMatch(ids);
      setEmails((prev) => prev.filter((m) => !match(m)));
    },
    [setEmails, dispatch, emails, invalidateEmailCaches]
  );

  const snooze = useCallback(
    (ids, snoozeUntil, providedThreadIds = null) => {
      // Resolve thread IDs - snooze is thread-level
      const { threadIds: resolvedThreadIds, allIds, matchAll } = resolveIds(ids, providedThreadIds);
      const removedInboxIds = new Set();
      const snoozeUntilISO = snoozeUntil.toISOString();

      // Call backend API with thread IDs
      if (resolvedThreadIds.length === 1) {
        // Single thread snooze
        dispatch(
          snoozeThreadThunk({
            threadId: resolvedThreadIds[0],
            snooze_until: snoozeUntilISO,
          })
        )
          .then(() => invalidateEmailCaches(resolvedThreadIds))
          .catch((error) => {
            console.error("Failed to snooze thread:", error);
          });
      } else if (resolvedThreadIds.length > 1) {
        // Bulk thread snooze
        dispatch(
          bulkSnoozeThreadsThunk({
            threadIds: resolvedThreadIds,
            snooze_until: snoozeUntilISO,
          })
        )
          .then(() => invalidateEmailCaches(resolvedThreadIds))
          .catch((error) => {
            console.error("Failed to bulk snooze threads:", error);
          });
      }

      // Optimistic update - remove snoozed items from the current list and query cache
      removeFromQueryCache(allIds);
      setEmails((prev) =>
        prev.filter((m) => {
          if (!matchAll(m)) return true; // Keep non-matching emails

          // Track emails that had Inbox label for undo purposes
          const currentLabels = m.labels || [];
          if (currentLabels.includes("Inbox")) {
            removedInboxIds.add(String(m.id));
          }

          // Remove from list (filter out snoozed items)
          return false;
        })
      );

      if (removedInboxIds.size) {
        setSoftRemovedLabels((prev) => {
          const updated = { ...prev };
          removedInboxIds.forEach((id) => {
            const existing = new Set(prev[id] || []);
            existing.add("Inbox");
            updated[id] = [...existing];
          });
          return updated;
        });
      }

      return { removedInboxIds: [...removedInboxIds] };
    },
    [setEmails, setSoftRemovedLabels, dispatch, resolveIds, invalidateEmailCaches, removeFromQueryCache]
  );

  const unsnooze = useCallback(
    (ids, options = {}, providedThreadIds = null) => {
      // Resolve thread IDs - unsnooze is thread-level
      const { threadIds: resolvedThreadIds, allIds, matchAll } = resolveIds(ids, providedThreadIds);
      const overrideIds = new Set((options.removedInboxIds || []).map((id) => String(id)));
      const restoredInboxIds = new Set();

      // Call backend API with thread IDs
      if (resolvedThreadIds.length === 1) {
        // Single thread unsnooze
        dispatch(
          unsnoozeThreadThunk({
            threadId: resolvedThreadIds[0],
          })
        )
          .then(() => invalidateEmailCaches(resolvedThreadIds))
          .catch((error) => {
            console.error("Failed to unsnooze thread:", error);
          });
      } else if (resolvedThreadIds.length > 1) {
        // Bulk thread unsnooze
        dispatch(
          bulkUnsnoozeThreadsThunk({
            threadIds: resolvedThreadIds,
          })
        )
          .then(() => invalidateEmailCaches(resolvedThreadIds))
          .catch((error) => {
            console.error("Failed to bulk unsnooze threads:", error);
          });
      }

      // Optimistic update - remove unsnoozed items from snoozed list view
      // This removes them from the React Query cache (snoozed folder view)
      removeFromQueryCache(allIds);

      // Also filter out from local state (for snoozed folder view)
      setEmails((prev) =>
        prev.filter((m) => {
          if (!matchAll(m)) return true; // Keep non-matching emails

          // Track emails that had Inbox label for undo purposes
          const currentLabels = m.labels || [];
          const key = String(m.id);
          const softRemoved = softRemovedLabels[key] || [];
          const shouldRestoreFromSoftRemoved = softRemoved.includes("Inbox");
          const shouldRestoreFromOverride = overrideIds.has(key);
          const shouldRestoreInbox = shouldRestoreFromSoftRemoved || shouldRestoreFromOverride;

          if (shouldRestoreInbox || currentLabels.includes("Inbox")) {
            restoredInboxIds.add(key);
          }

          // Remove from list (filter out unsnoozed items)
          return false;
        })
      );

      if (restoredInboxIds.size) {
        setSoftRemovedLabels((prev) => {
          const updated = { ...prev };
          restoredInboxIds.forEach((id) => {
            const remaining = (updated[id] || []).filter((label) => label !== "Inbox");
            if (remaining.length) {
              updated[id] = remaining;
            } else {
              delete updated[id];
            }
          });
          return updated;
        });
      }
    },
    [
      setEmails,
      softRemovedLabels,
      setSoftRemovedLabels,
      dispatch,
      resolveIds,
      invalidateEmailCaches,
      removeFromQueryCache,
    ]
  );

  const toggleMuted = useCallback(
    (threadIds) => {
      let previousState = [];

      setEmails((prev) => {
        // Store the previous state for undo functionality
        previousState = prev
          .filter((m) => {
            const emailThreadId = m.threadId;
            return threadIds.includes(emailThreadId);
          })
          .map((m) => ({
            threadId: m.threadId,
            labels: [...(m.labels || [])],
          }));

        return prev.map((m) => {
          const emailThreadId = m.threadId;
          if (threadIds.includes(emailThreadId)) {
            const currentLabels = m.labels || [];
            const isCurrentlyMuted = currentLabels.includes("Muted");

            let updatedLabels;
            if (isCurrentlyMuted) {
              // Currently muted, so unmute: remove "Muted" and add "Inbox"
              updatedLabels = [...currentLabels.filter((label) => label !== "Muted"), "Inbox"];
            } else {
              // Currently unmuted, so mute: add "Muted" and remove "Inbox"
              updatedLabels = [...currentLabels.filter((label) => label !== "Inbox"), "Muted"];
            }

            return { ...m, labels: updatedLabels };
          }
          return m;
        });
      });

      const undo = () => {
        setEmails((prev) =>
          prev.map((m) => {
            const emailThreadId = m.threadId;
            const previousEmail = previousState.find((p) => p.threadId === emailThreadId);
            if (previousEmail) {
              return { ...m, labels: [...previousEmail.labels] };
            }
            return m;
          })
        );
      };

      return undo;
    },
    [setEmails]
  );

  const setMuted = useCallback(
    (ids, value) => {
      const match = makeMatch(ids);
      setEmails((prev) =>
        prev.map((m) => {
          if (match(m)) {
            const currentLabels = m.labels || [];
            const isCurrentlyMuted = currentLabels.includes("Muted");

            let updatedLabels;
            if (value) {
              // Muting: add "Muted" label and remove "Inbox"
              if (isCurrentlyMuted) {
                // Already muted, no change needed
                return m;
              }
              updatedLabels = [...currentLabels.filter((label) => label !== "Inbox"), "Muted"];
            } else {
              // Unmuting: remove "Muted" label and add "Inbox" back
              if (!isCurrentlyMuted) {
                // Already unmuted, no change needed
                return m;
              }
              updatedLabels = [...currentLabels.filter((label) => label !== "Muted"), "Inbox"];
            }

            return { ...m, labels: updatedLabels };
          }
          return m;
        })
      );
    },
    [setEmails]
  );

  return useMemo(
    () => ({
      addLabels,
      removeLabels,
      modifyLabels,
      moveToInbox,
      archive,
      moveToSpam,
      notSpam,
      moveToTrash,
      restoreFromTrash,
      moveToLabel,
      moveToLabelFrom,
      toggleStar,
      markRead,
      toggleImportant,
      setImportant,
      deleteForever,
      setStar,
      snooze,
      unsnooze,
      toggleMuted,
      setMuted,
      deleteAllSpam,
    }),
    [
      addLabels,
      removeLabels,
      modifyLabels,
      moveToInbox,
      archive,
      moveToSpam,
      notSpam,
      moveToTrash,
      restoreFromTrash,
      moveToLabel,
      moveToLabelFrom,
      toggleStar,
      markRead,
      toggleImportant,
      setImportant,
      deleteForever,
      setStar,
      snooze,
      unsnooze,
      toggleMuted,
      setMuted,
      deleteAllSpam,
    ]
  );
}
