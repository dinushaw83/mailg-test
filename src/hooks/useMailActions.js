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
  bulkUnarchiveEmailsThunk,
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
  const { setEmails, emails, labels, setSoftRemovedLabels, softRemovedLabels, setSearchResults, searchResults, searchQuery } =
    useGlobalContext();

  // Centralized ID resolution hook
  const { resolveIds, resolveThreadIds } = useIdResolver();

  // Get key to ID mapping for transforming composite keys to UUIDs
  const keyToLabelIdMap = useSelector((state) => state.mail.keyToLabelIdMap || {});

  // Helper to check if current search is a single-term search matching a specific action
  // Returns true if the search is exactly "is:starred", "in:starred", "is:important", or "in:important" (case-insensitive, trimmed)
  const isSimpleSingleSearch = useCallback(
    (searchType) => {
      if (!searchQuery) return false;
      const trimmed = searchQuery.trim().toLowerCase();
      // Support both "is:" and "in:" prefixes
      return trimmed === `is:${searchType}` || trimmed === `in:${searchType}`;
    },
    [searchQuery]
  );

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
    (ids, { resolvedThreadIds } = {}) => {
      // Use pre-resolved thread IDs if provided, otherwise find from emails context
      let threadIds = resolvedThreadIds || [];

      if (!threadIds.length) {
        // IDs can be email IDs or thread IDs
        // First try to match against emails to get thread IDs
        const match = makeMatch(ids);
        const matchingEmails = emails.filter(match);

        if (matchingEmails.length > 0) {
          // Found matching emails, extract thread IDs
          threadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];
        } else {
          // No matching emails found - assume ids are already thread IDs
          // This handles cases where emails come from React Query cache
          // or other folders not in the global context
          threadIds = Array.isArray(ids) ? ids.filter(Boolean) : [ids].filter(Boolean);
        }
      }

      if (threadIds.length === 0) {
        console.warn("Archive: No thread IDs to archive");
        return () => {};
      }

      // Capture thread IDs for undo (must capture before async operations)
      const undoThreadIds = [...threadIds];

      // Optimistic local update using both original IDs and thread IDs
      const allIds = [...new Set([...ids, ...threadIds])];
      updateByIds(allIds, (labels) => {
        labels.delete("Inbox");
      });

      // Also update React Query cache optimistically
      updateQueryCache(allIds, (email) => {
        const updatedLabels = (email.labels || []).filter((l) => l !== "Inbox");
        return { ...email, labels: updatedLabels };
      });

      // Call bulk backend API with thread IDs
      dispatch(bulkArchiveEmailsThunk({ threadIds }))
        .then(() => {
          invalidateEmailCaches(threadIds);
        })
        .catch((error) => {
          console.error("Failed to bulk archive threads:", error);
        });

      // Return undo function that calls unarchive API
      return () => {
        // Call unarchive API first - this is the authoritative action
        if (undoThreadIds.length > 0) {
          dispatch(bulkUnarchiveEmailsThunk({ threadIds: undoThreadIds }))
            .then(() => {
              // Force refetch to get fresh data from server
              invalidateEmailCaches(undoThreadIds);
            })
            .catch((error) => {
              console.error("Failed to unarchive threads:", error);
            });
        }
      };
    },
    [updateByIds, updateQueryCache, emails, dispatch, invalidateEmailCaches]
  );

  const unarchive = useCallback(
    (ids, { resolvedThreadIds } = {}) => {
      // Use pre-resolved thread IDs if provided, otherwise find from emails context
      let threadIds = resolvedThreadIds || [];

      if (!threadIds.length) {
        // IDs can be email IDs or thread IDs
        // First try to match against emails to get thread IDs
        const match = makeMatch(ids);
        const matchingEmails = emails.filter(match);

        if (matchingEmails.length > 0) {
          // Found matching emails, extract thread IDs
          threadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];
        } else {
          // No matching emails found - assume ids are already thread IDs
          threadIds = Array.isArray(ids) ? ids.filter(Boolean) : [ids].filter(Boolean);
        }
      }

      if (threadIds.length === 0) {
        console.warn("Unarchive: No thread IDs to unarchive");
        return () => {};
      }

      // Capture thread IDs for undo (must capture before async operations)
      const undoThreadIds = [...threadIds];

      // Optimistic local update - add Inbox label back
      const allIds = [...new Set([...ids, ...threadIds])];
      updateByIds(allIds, (labels) => {
        labels.add("Inbox");
      });

      // Also update React Query cache optimistically
      updateQueryCache(allIds, (email) => {
        const updatedLabels = [...(email.labels || [])];
        if (!updatedLabels.includes("Inbox")) {
          updatedLabels.push("Inbox");
        }
        return { ...email, labels: updatedLabels };
      });

      // Call bulk backend API with thread IDs
      dispatch(bulkUnarchiveEmailsThunk({ threadIds }))
        .then(() => {
          invalidateEmailCaches(threadIds);
        })
        .catch((error) => {
          console.error("Failed to bulk unarchive threads:", error);
        });

      // Return undo function that calls archive API
      return () => {
        // Call archive API first - this is the authoritative action
        if (undoThreadIds.length > 0) {
          dispatch(bulkArchiveEmailsThunk({ threadIds: undoThreadIds }))
            .then(() => {
              // Force refetch to get fresh data from server
              invalidateEmailCaches(undoThreadIds);
            })
            .catch((error) => {
              console.error("Failed to archive threads:", error);
            });
        }
      };
    },
    [updateByIds, updateQueryCache, emails, dispatch, invalidateEmailCaches]
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
    (ids, { resolvedEmailIds, resolvedThreadIds } = {}) => {
      // Use pre-resolved IDs if provided, otherwise find from emails context
      let emailIds = resolvedEmailIds || [];
      let threadIds = resolvedThreadIds || [];

      if (!emailIds.length) {
        // If ids are already email UUIDs (from ActionBar), use them directly
        // Otherwise, find matching emails by thread ID or other keys
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

      // Check if we should remove from search results (only for single-term is:starred search when unstarring)
      const shouldRemoveFromSearch = !newState && isSimpleSingleSearch("starred");

      // Capture original searchResults before modification (for revert on error if removing)
      const originalSearchResults = shouldRemoveFromSearch ? [...searchResults] : null;

      // Optimistic updates using resolved IDs
      updateQueryCache(allIds, (email) => ({ ...email, is_starred: newState }));
      setEmails((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_starred: newState } : m)));
      // Update searchResults - remove if unstarring on is:starred search, otherwise just update the flag
      if (shouldRemoveFromSearch) {
        setSearchResults((prev) => prev.filter((m) => !matchAll(m)));
      } else {
        setSearchResults((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_starred: newState } : m)));
      }

      // Revert function for error handling
      const revertUpdate = () => {
        updateQueryCache(allIds, (email) => ({ ...email, is_starred: !newState }));
        setEmails((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_starred: !newState } : m)));
        if (shouldRemoveFromSearch && originalSearchResults) {
          setSearchResults(originalSearchResults);
        } else {
          setSearchResults((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_starred: !newState } : m)));
        }
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
    [setEmails, setSearchResults, searchResults, isSimpleSingleSearch, dispatch, updateQueryCache, invalidateEmailCaches, resolveIds]
  );

  const setStar = useCallback(
    (ids, value = true, context = "detail", threadIds = null) => {
      // Use centralized ID resolver
      const { emailIds, threadIds: resolvedThreadIds, allIds, matchAll, isSingle } = resolveIds(ids, threadIds);

      if (!emailIds.length) return;

      // Check if we should remove from search results (only for single-term is:starred search when unstarring)
      const shouldRemoveFromSearch = !value && isSimpleSingleSearch("starred");

      // Capture original searchResults before modification (for revert on error if removing)
      const originalSearchResults = shouldRemoveFromSearch ? [...searchResults] : null;

      // Optimistic updates using resolved IDs
      updateQueryCache(allIds, (email) => ({ ...email, is_starred: value }));
      setEmails((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_starred: value } : m)));
      // Update searchResults - remove if unstarring on is:starred search, otherwise just update the flag
      if (shouldRemoveFromSearch) {
        setSearchResults((prev) => prev.filter((m) => !matchAll(m)));
      } else {
        setSearchResults((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_starred: value } : m)));
      }

      // Revert function for error handling
      const revertUpdate = () => {
        updateQueryCache(allIds, (email) => ({ ...email, is_starred: !value }));
        setEmails((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_starred: !value } : m)));
        if (shouldRemoveFromSearch && originalSearchResults) {
          setSearchResults(originalSearchResults);
        } else {
          setSearchResults((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_starred: !value } : m)));
        }
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
    [setEmails, setSearchResults, searchResults, isSimpleSingleSearch, dispatch, updateQueryCache, invalidateEmailCaches, resolveIds]
  );

  const markRead = useCallback(
    (ids, read = true) => {
      const match = makeMatch(ids);
      const normalizedIds = ids.map((value) => String(value || "").trim()).filter(Boolean);
      const uuidPattern = /^[0-9a-fA-F-]{32,}$/;

      // Optimistically update React Query cache immediately
      updateQueryCache(ids, (email) => ({ ...email, is_read: read }));

      // Also update local state for backward compatibility
      setEmails((prev) => prev.map((m) => (match(m) ? { ...m, is_read: read } : m)));

      // Extract email IDs for backend sync
      let emailIds = [];

      // If all ids are already UUIDs, use them directly (most reliable)
      if (normalizedIds.length > 0 && normalizedIds.every((id) => uuidPattern.test(id))) {
        emailIds = normalizedIds;
      } else {
        // Otherwise try to find matching emails in context
        const matchingEmails = emails.filter(match);
        if (matchingEmails.length > 0) {
          emailIds = matchingEmails.map((m) => m.id).filter(Boolean);
        }
      }

      // Call bulk backend API
      if (emailIds.length > 0) {
        dispatch(bulkUpdateEmailReadThunk({ emailIds, is_read: read }))
          .unwrap()
          .catch((error) => {
            console.error("Failed to bulk update read status:", error);
            // Revert optimistic update on error
            updateQueryCache(ids, (email) => ({ ...email, is_read: !read }));
            setEmails((prev) => prev.map((m) => (match(m) ? { ...m, is_read: !read } : m)));
          });
      } else {
        console.warn("markRead: No email IDs to process, skipping API call", { ids, normalizedIds });
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

      // Check if we should remove from search results (only for single-term is:important search when unmarking)
      const shouldRemoveFromSearch = !newState && isSimpleSingleSearch("important");

      // Capture original searchResults before modification (for revert on error if removing)
      const originalSearchResults = shouldRemoveFromSearch ? [...searchResults] : null;

      // Optimistic updates using resolved IDs
      updateQueryCache(allIds, (email) => ({ ...email, is_important: newState }));
      setEmails((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_important: newState } : m)));
      // Update searchResults - remove if unmarking important on is:important search, otherwise just update the flag
      if (shouldRemoveFromSearch) {
        setSearchResults((prev) => prev.filter((m) => !matchAll(m)));
      } else {
        setSearchResults((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_important: newState } : m)));
      }

      // Revert function for error handling
      const revertUpdate = () => {
        updateQueryCache(allIds, (email) => ({ ...email, is_important: !newState }));
        setEmails((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_important: !newState } : m)));
        if (shouldRemoveFromSearch && originalSearchResults) {
          setSearchResults(originalSearchResults);
        } else {
          setSearchResults((prev) => prev.map((m) => (matchAll(m) ? { ...m, is_important: !newState } : m)));
        }
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
    [setEmails, setSearchResults, searchResults, isSimpleSingleSearch, dispatch, updateQueryCache, invalidateEmailCaches, resolveIds]
  );

  const setImportant = useCallback(
    (threadIds, value = true) => {
      // Use centralized thread ID resolver
      const { threadIds: resolvedThreadIds, match } = resolveThreadIds(threadIds);

      if (!resolvedThreadIds.length) return;

      const threadIdSet = new Set(resolvedThreadIds);
      const newValue = !!value;

      // Check if we should remove from search results (only for single-term is:important search when unmarking)
      const shouldRemoveFromSearch = !newValue && isSimpleSingleSearch("important");

      // Capture original searchResults before modification (for revert on error if removing)
      const originalSearchResults = shouldRemoveFromSearch ? [...searchResults] : null;

      // Optimistic updates - update both query cache and local state synchronously
      updateQueryCache(resolvedThreadIds, (email) => ({ ...email, is_important: newValue }));

      // Force immediate state update with new object references to trigger re-render
      setEmails((prev) => prev.map((m) => (threadIdSet.has(m.thread_id) ? { ...m, is_important: newValue } : m)));
      // Update searchResults - remove if unmarking important on is:important search, otherwise just update the flag
      if (shouldRemoveFromSearch) {
        setSearchResults((prev) => prev.filter((m) => !threadIdSet.has(m.thread_id)));
      } else {
        setSearchResults((prev) =>
          prev.map((m) => (threadIdSet.has(m.thread_id) ? { ...m, is_important: newValue } : m))
        );
      }

      // Revert function for error handling
      const revertUpdate = () => {
        updateQueryCache(resolvedThreadIds, (email) => ({ ...email, is_important: !newValue }));
        setEmails((prev) => prev.map((m) => (threadIdSet.has(m.thread_id) ? { ...m, is_important: !newValue } : m)));
        if (shouldRemoveFromSearch && originalSearchResults) {
          setSearchResults(originalSearchResults);
        } else {
          setSearchResults((prev) =>
            prev.map((m) => (threadIdSet.has(m.thread_id) ? { ...m, is_important: !newValue } : m))
          );
        }
      };

      // Use bulk endpoint for all threads at once
      dispatch(bulkUpdateEmailImportantThunk({ threadIds: resolvedThreadIds, is_important: newValue }))
        .then(() => {
          // Force cache refresh after API success
          invalidateEmailCaches(resolvedThreadIds);
        })
        .catch((error) => {
          console.error("Failed to update important status:", error);
          revertUpdate();
        });
    },
    [setEmails, setSearchResults, searchResults, isSimpleSingleSearch, dispatch, updateQueryCache, invalidateEmailCaches, resolveThreadIds]
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
      const idsToDelete = [...ids]; // Copy to avoid mutation issues

      // Check if first ID looks like a UUID (contains hyphens, 32+ chars)
      const firstId = String(idsToDelete[0] || "");
      const isUUID = firstId.includes("-") && firstId.length >= 32;

      // Use the IDs directly for the API call
      // For UUIDs, use them as email IDs; otherwise treat as thread IDs
      const emailIds = isUUID ? idsToDelete : [];

      // If not UUIDs, we need to resolve them - but do it via functional update
      // to avoid stale closure issues with the emails array
      if (!isUUID) {
        // For thread IDs, we still use them directly for deletion
        // The backend handles thread_id to email_id resolution
        const match = makeMatch(idsToDelete);

        // Remove from local state first (optimistic update)
        setEmails((prev) => {
          const matchingEmails = prev.filter(match);
          const resolvedEmailIds = matchingEmails.map((email) => email.id);
          const resolvedThreadIds = [...new Set(matchingEmails.map((email) => email.thread_id).filter(Boolean))];

          // Call bulk backend API with resolved email IDs
          if (resolvedEmailIds.length > 0) {
            dispatch(bulkDeleteEmailThunk({ emailIds: resolvedEmailIds }))
              .then(() => {
                invalidateEmailCaches(resolvedThreadIds.length ? resolvedThreadIds : resolvedEmailIds);
              })
              .catch((error) => {
                console.error("Failed to bulk delete emails permanently:", error);
              });
          }

          return prev.filter((m) => !match(m));
        });
        return;
      }

      // For UUID email IDs, proceed directly
      if (emailIds.length > 0) {
        dispatch(bulkDeleteEmailThunk({ emailIds }))
          .then(() => {
            invalidateEmailCaches(emailIds);
          })
          .catch((error) => {
            console.error("Failed to bulk delete emails permanently:", error);
          });
      }

      // Remove from local state
      const idSet = new Set(idsToDelete);
      setEmails((prev) => prev.filter((m) => !idSet.has(m.id) && !idSet.has(m.thread_id)));
    },
    [setEmails, dispatch, invalidateEmailCaches]
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
      unarchive,
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
      unarchive,
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
