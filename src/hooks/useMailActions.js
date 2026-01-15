import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";

import {
  updateLabelsThunk,
  bulkUpdateLabelsThunk,
  updateEmailStarredThunk,
  updateEmailImportantThunk,
  snoozeEmailThunk,
  moveToTrashThunk,
  moveToSpamThunk,
  deleteEmailThunk,
  bulkUpdateEmailStarredThunk,
  bulkUpdateEmailImportantThunk,
  bulkUpdateEmailReadThunk,
  bulkMoveToSpamThunk,
  bulkMoveFromSpamThunk,
  bulkMoveToTrashThunk,
  bulkDeleteEmailThunk,
  bulkArchiveEmailsThunk,
  bulkSnoozeEmailsThunk,
  bulkUnsnoozeEmailsThunk,
  bulkUnstarThreadsThunk,
  updateThreadImportantThunk,
} from "../store/slices/mailSlice";
import { useGlobalContext } from "../contexts/GlobalContext";

/* ────────────────────────────────────────────────────────────────────────────
 * ID utilities (thread-aware)
 * ────────────────────────────────────────────────────────────────────────── */

const toArray = (v) => (Array.isArray(v) ? v : v instanceof Set ? [...v] : v == null ? [] : [v]);

const buildIdIndex = (selection) =>
  new Set(
    toArray(selection)
      .flatMap((item) => {
        if (item && typeof item === "object") {
          return [
            item.id,
            item.messageId,
            item.threadId,
            item.thread_id,
            item.legacyThreadId,
            item.legacyLastMessageId,
            item.legacyLastNonDraftMessageId,
            item.legacy_thread_id,
            item.legacy_last_message_id,
            item.legacy_last_non_draft_message_id,
          ];
        }
        return [item];
      })
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
  );

const collectKeysFromMessage = (m) => {
  const out = [];
  const add = (v) => {
    if (v == null) return;
    const s = String(v).trim();
    if (s) out.push(s);
  };
  add(m.id);
  add(m.messageId);
  add(m.threadId);
  add(m.thread_id);
  add(m.legacyThreadId);
  add(m.legacyLastMessageId);
  add(m.legacyLastNonDraftMessageId);
  add(m.legacy_thread_id);
  add(m.legacy_last_message_id);
  add(m.legacy_last_non_draft_message_id);
  return out;
};

export const makeMatch = (selection) => {
  const index = buildIdIndex(selection);
  return (m) => collectKeysFromMessage(m).some((k) => index.has(k));
};

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

  return () => {
    setEmails((prev) =>
      prev.map((m) => (match(m) && originalStates.has(m.id) ? { ...m, labels: originalStates.get(m.id).labels } : m))
    );
  };
};

/* ────────────────────────────────────────────────────────────────────────────
 * Hook
 * ────────────────────────────────────────────────────────────────────────── */

export default function useMailActions() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { setEmails, emails, labels, setSoftRemovedLabels, softRemovedLabels } = useGlobalContext();

  // Get key to ID mapping for transforming composite keys to UUIDs
  const keyToLabelIdMap = useSelector((state) => state.mail.keyToLabelIdMap || {});

  // Helper to update React Query cache optimistically
  const updateQueryCache = useCallback(
    (ids, updater) => {
      const match = makeMatch(ids);

      // Update all queries that match the "emails" pattern
      queryClient.setQueriesData({ queryKey: ["emails"] }, (oldData) => {
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
          const labels = new Set(m.labels || []);
          transform(labels, m);
          return { ...m, labels: normaliseLabels([...labels]) };
        })
      );
    },
    [setEmails]
  );

  const addLabels = useCallback(
    (ids, names = []) =>
      updateByIds(ids, (labels) => {
        for (const n of names) {
          if (!n) continue;
          labels.add(String(n));
        }
      }),
    [updateByIds]
  );

  const removeLabels = useCallback(
    (ids, names = []) =>
      updateByIds(ids, (labels) => {
        for (const n of names) labels.delete(String(n));
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
        for (const n of add) {
          if (n) labelSet.add(String(n));
        }
        for (const n of remove) {
          if (n) labelSet.delete(String(n));
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
        // Use provided threadIds or extract from emails
        let threadIdsToUse;

        if (threadIds && threadIds.length > 0) {
          // Thread IDs explicitly provided
          threadIdsToUse = Array.isArray(threadIds) ? threadIds : [threadIds];
        } else {
          // Try to extract from emails context
          threadIdsToUse = [
            ...new Set(
              emails
                .filter((email) => ids.includes(email.id))
                .map((email) => email.thread_id)
                .filter(Boolean)
            ),
          ];
        }

        if (threadIdsToUse.length > 0) {
          // Use bulk update endpoint with thread IDs
          dispatch(
            bulkUpdateLabelsThunk({
              threadIds: threadIdsToUse,
              labels: { add: backendLabelsToAdd, remove: backendLabelsToRemove },
            })
          ).catch((error) => {
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
    [updateByIds, dispatch, keyToLabelIdMap, emails, setEmails]
  );

  const moveToInbox = useCallback(
    (ids) => {
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
          labelSet.add("Inbox");
        });
      });

      return () => {
        undo();
        setSoftRemovedLabels((prev) => {
          const updated = { ...prev };
          ids.forEach((id) => delete updated[id]);
          return updated;
        });
      };
    },
    [updateByIds, setEmails, labels, setSoftRemovedLabels]
  );

  const archive = useCallback(
    (ids) => {
      // Extract email IDs for backend sync
      const match = makeMatch(ids);
      const emailIds = emails.filter(match).map((email) => email.id);

      // Call bulk backend API
      if (emailIds.length > 0) {
        dispatch(bulkArchiveEmailsThunk({ emailIds })).catch((error) => {
          console.error("Failed to bulk archive emails:", error);
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
  }, [updateByIds]);

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

      if (emailIds.length) {
        // Successfully extracted email IDs from matching emails
      } else if (normalizedIds.every((id) => uuidPattern.test(id))) {
        emailIds = normalizedIds;
      } else {
        console.warn("moveToSpam: could not resolve email IDs for selection", normalizedIds);
      }

      // Optimistically update React Query cache
      updateQueryCache(ids, (email) => {
        const updatedLabels = [...(email.labels || [])];
        const labelSet = new Set(updatedLabels);
        removeSystemLabels(labelSet, labels, ["Spam"]);
        labelSet.add("Spam");
        return { ...email, labels: [...labelSet] };
      });

      // Backward compatibility: update local state
      const undo = withUndo(ids, setEmails, () => {
        updateByIds(ids, (labelSet) => {
          removeSystemLabels(labelSet, labels, ["Spam"]);
          labelSet.add("Spam");
        });
      });

      // Call bulk backend API with all email IDs at once
      if (emailIds && emailIds.length > 0) {
        dispatch(bulkMoveToSpamThunk({ emailIds }))
          .unwrap()
          .then(() => {
            // Successfully moved emails to spam
          })
          .catch((error) => {
            console.error("Failed to bulk move emails to spam:", error);
            // Revert optimistic update on error
            updateQueryCache(ids, (email) => {
              const updatedLabels = [...(email.labels || [])];
              const labelSet = new Set(updatedLabels);
              labelSet.delete("Spam");
              return { ...email, labels: [...labelSet] };
            });
          });
      } else {
        console.warn("moveToSpam: No email IDs to process, skipping API call");
      }

      return undo;
    },
    [updateByIds, setEmails, labels, dispatch, emails, updateQueryCache]
  );

  const notSpam = useCallback(
    (ids) => {
      // Extract email IDs for backend sync
      const match = makeMatch(ids);
      const emailIds = emails.filter(match).map((email) => email.id);

      // Call bulk backend API FIRST
      if (emailIds.length > 0) {
        dispatch(bulkMoveFromSpamThunk({ emailIds }))
          .unwrap()
          .then(() => {
            // Successfully removed spam from emails
          })
          .catch((error) => {
            console.error("Failed to bulk remove spam from emails:", error);
            // Revert optimistic update on error
            updateQueryCache(ids, (email) => {
              const updatedLabels = [...(email.labels || [])];
              const labelSet = new Set(updatedLabels);
              labelSet.add("Spam");
              labelSet.delete("Inbox");
              return { ...email, labels: [...labelSet] };
            });
          });
      }

      // Optimistically update React Query cache
      updateQueryCache(ids, (email) => {
        const updatedLabels = [...(email.labels || [])];
        const labelSet = new Set(updatedLabels);
        labelSet.delete("Spam");
        labelSet.add("Inbox");
        return { ...email, labels: [...labelSet] };
      });

      // Backward compatibility: update local state
      const undo = updateByIds(ids, (labels) => {
        labels.delete("Spam");
        labels.add("Inbox");
      });

      return undo;
    },
    [updateByIds, emails, dispatch, updateQueryCache]
  );

  const moveToTrash = useCallback(
    (ids) => {
      // If ids are already email UUIDs (from ActionBar), use them directly
      // Otherwise, find matching emails by thread ID or other keys
      let emailIds;

      // Check if first ID looks like a UUID (contains hyphens, 32+ chars)
      const firstId = String(ids[0] || "");
      const isUUID = firstId.includes("-") && firstId.length >= 32;

      if (isUUID) {
        // Already email IDs, use directly
        emailIds = ids;
      } else {
        // Find matching emails by thread/message IDs
        const match = makeMatch(ids);
        const matchingEmails = emails.filter(match);
        emailIds = matchingEmails.map((email) => email.id);
      }

      // Call bulk backend API with all email IDs at once
      if (emailIds.length > 0) {
        dispatch(bulkMoveToTrashThunk({ emailIds })).catch((error) => {
          console.error("Failed to bulk move emails to trash:", error);
        });
      }

      return withUndo(ids, setEmails, () => {
        updateByIds(ids, (labelSet) => {
          removeSystemLabels(labelSet, labels, ["Trash"]);
          labelSet.add("Trash");
        });
      });
    },
    [updateByIds, setEmails, labels, dispatch, emails]
  );

  const restoreFromTrash = useCallback(
    (ids) =>
      updateByIds(ids, (labels) => {
        labels.delete("Trash");
        labels.add("Inbox");
      }),
    [updateByIds]
  );

  const toggleStar = useCallback(
    (ids, currentStarredState, context = "list", threadIds = null) => {
      // Determine the new state - if currentStarredState is provided, use opposite
      // Otherwise, we'll need to look it up (not ideal, but fallback)
      const newState = currentStarredState !== undefined ? !currentStarredState : true;

      // Optimistically update React Query cache immediately
      updateQueryCache(ids, (email) => ({ ...email, is_starred: newState }));

      // Also update local state for backward compatibility
      const match = makeMatch(ids);
      setEmails((prev) => {
        return prev.map((m) => {
          if (match(m)) {
            return { ...m, is_starred: newState };
          }
          return m;
        });
      });

      // Use ids directly as email IDs array
      const emailIds = Array.isArray(ids) ? ids : [ids];

      if (emailIds.length === 0) return;

      // Determine which API to call based on number of emails and action
      if (newState === true) {
        // STARRING: Use individual endpoint for single email, bulk for multiple
        if (emailIds.length === 1) {
          // Single email - use individual endpoint
          dispatch(
            updateEmailStarredThunk({
              emailId: emailIds[0],
              is_starred: true,
            })
          ).catch((error) => {
            console.error("Failed to star email:", error);
            updateQueryCache(ids, (email) => ({ ...email, is_starred: false }));
          });
        } else {
          // Multiple emails - use bulk endpoint
          dispatch(
            bulkUpdateEmailStarredThunk({
              emailIds,
              is_starred: true,
            })
          ).catch((error) => {
            console.error("Failed to star emails:", error);
            updateQueryCache(ids, (email) => ({ ...email, is_starred: false }));
          });
        }
      } else {
        // UNSTARRING: Different logic based on context
        if (context === "list") {
          // From List: Use thread-level unstar with thread IDs
          // Use provided threadIds or fallback to extracting from emails
          let threadIdsToUse = threadIds;
          if (!threadIdsToUse || threadIdsToUse.length === 0) {
            const match = makeMatch(ids);
            threadIdsToUse = [...new Set(emails.filter((m) => match(m)).map((m) => m.thread_id))];
          }

          if (threadIdsToUse && threadIdsToUse.length > 0) {
            dispatch(bulkUnstarThreadsThunk({ threadIds: threadIdsToUse })).catch((error) => {
              console.error("Failed to unstar threads:", error);
              updateQueryCache(ids, (email) => ({ ...email, is_starred: true }));
            });
          }
        } else {
          // From Detail: Use individual email endpoint for each email
          const promises = emailIds.map((emailId) =>
            dispatch(
              updateEmailStarredThunk({
                emailId,
                is_starred: false,
              })
            )
          );

          Promise.all(promises).catch((error) => {
            console.error("Failed to unstar emails:", error);
            updateQueryCache(ids, (email) => ({ ...email, is_starred: true }));
          });
        }
      }
    },
    [setEmails, dispatch, updateQueryCache, emails]
  );

  const setStar = useCallback(
    (ids, value = true, context = "detail", threadIds = null) => {
      const match = makeMatch(ids);

      // Optimistically update React Query cache immediately
      updateQueryCache(ids, (email) => ({ ...email, is_starred: value }));

      // Also update local state for backward compatibility
      setEmails((prev) => {
        return prev.map((m) => {
          if (match(m)) {
            return { ...m, is_starred: value };
          }
          return m;
        });
      });

      // Use ids directly as email IDs array
      const emailIds = Array.isArray(ids) ? ids : [ids];

      if (emailIds.length === 0) return;

      // Determine which API to call based on number of emails and action
      if (value === true) {
        // STARRING: Use individual endpoint for single email, bulk for multiple
        if (emailIds.length === 1) {
          // Single email - use individual endpoint
          dispatch(
            updateEmailStarredThunk({
              emailId: emailIds[0],
              is_starred: true,
            })
          ).catch((error) => {
            console.error("Failed to star email:", error);
            updateQueryCache(ids, (email) => ({ ...email, is_starred: false }));
          });
        } else {
          // Multiple emails - use bulk endpoint
          dispatch(
            bulkUpdateEmailStarredThunk({
              emailIds,
              is_starred: true,
            })
          ).catch((error) => {
            console.error("Failed to star emails:", error);
            updateQueryCache(ids, (email) => ({ ...email, is_starred: false }));
          });
        }
      } else {
        // UNSTARRING: Different logic based on context
        if (context === "list") {
          // From List: Use thread-level unstar to unstar ALL emails in threads
          let threadIdsToUse = threadIds;
          if (!threadIdsToUse || threadIdsToUse.length === 0) {
            // Extract thread IDs from the provided email IDs
            threadIdsToUse = [...new Set(emails.filter(match).map((m) => m.thread_id).filter(Boolean))];
          }

          if (threadIdsToUse && threadIdsToUse.length > 0) {
            const threadIdSet = new Set(threadIdsToUse);

            // Optimistically update all emails in these threads
            setEmails((prev) => {
              return prev.map((m) => {
                if (threadIdSet.has(m.thread_id)) {
                  return { ...m, is_starred: false };
                }
                return m;
              });
            });

            // Use thread-level unstar endpoint (unstars ALL emails in each thread)
            dispatch(bulkUnstarThreadsThunk({ threadIds: threadIdsToUse })).catch((error) => {
              console.error("Failed to unstar threads:", error);
              // Revert optimistic update
              setEmails((prev) => {
                return prev.map((m) => {
                  if (threadIdSet.has(m.thread_id)) {
                    return { ...m, is_starred: true };
                  }
                  return m;
                });
              });
            });
          }
        } else {
          // From Detail: Use individual email endpoint
          if (emailIds.length === 1) {
            dispatch(
              updateEmailStarredThunk({
                emailId: emailIds[0],
                is_starred: false,
              })
            ).catch((error) => {
              console.error("Failed to unstar email:", error);
              updateQueryCache(ids, (email) => ({ ...email, is_starred: true }));
            });
          } else {
            dispatch(
              bulkUpdateEmailStarredThunk({
                emailIds,
                is_starred: false,
              })
            ).catch((error) => {
              console.error("Failed to unstar emails:", error);
              updateQueryCache(ids, (email) => ({ ...email, is_starred: true }));
            });
          }
        }
      }
    },
    [setEmails, dispatch, updateQueryCache, emails]
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

      // Optimistically update React Query cache immediately
      updateQueryCache(ids, (email) => ({ ...email, is_important: newState }));

      // Also update local state for backward compatibility
      const match = makeMatch(ids);
      setEmails((prev) => {
        return prev.map((m) => {
          if (match(m)) {
            return { ...m, is_important: newState };
          }
          return m;
        });
      });

      // Get thread IDs - use provided ones or extract from emails
      let threadIdsToUpdate = threadIds;
      if (!threadIdsToUpdate || threadIdsToUpdate.length === 0) {
        threadIdsToUpdate = [...new Set(emails.filter((m) => match(m)).map((m) => m.thread_id))];
      }

      // Call thread-level endpoint for each thread
      if (threadIdsToUpdate && threadIdsToUpdate.length > 0) {
        const promises = threadIdsToUpdate.map((threadId) =>
          dispatch(
            updateThreadImportantThunk({
              threadId,
              is_important: newState,
            })
          )
        );

        Promise.all(promises).catch((error) => {
          console.error("Failed to update important status:", error);
          // Revert optimistic update on error
          updateQueryCache(ids, (email) => ({ ...email, is_important: !newState }));
        });
      }
    },
    [setEmails, dispatch, updateQueryCache, emails]
  );

  const setImportant = useCallback(
    (threadIds, value = true) => {
      // threadIds are passed directly now (not email IDs)
      const threadIdSet = new Set(Array.isArray(threadIds) ? threadIds : [threadIds]);

      // Optimistically update React Query cache
      updateQueryCache(threadIds, (email) => ({ ...email, is_important: !!value }));

      // Update local state immediately (optimistic update)
      setEmails((prev) => {
        return prev.map((m) => {
          if (threadIdSet.has(m.thread_id)) {
            return { ...m, is_important: !!value };
          }
          return m;
        });
      });

      const threadIdsArray = Array.isArray(threadIds) ? threadIds : [threadIds];

      if (threadIdsArray.length > 0) {
        // Use bulk endpoint for all threads at once
        dispatch(
          bulkUpdateEmailImportantThunk({
            threadIds: threadIdsArray,
            is_important: !!value,
          })
        ).catch((error) => {
          console.error("Failed to update important status:", error);
          // Revert optimistic update on error
          updateQueryCache(threadIds, (email) => ({ ...email, is_important: !value }));
        });
      }
    },
    [setEmails, dispatch, updateQueryCache]
  );

  const moveToLabel = useCallback(
    (ids, name) =>
      withUndo(ids, setEmails, () => {
        updateByIds(ids, (labelSet) => {
          if (!name) return;
          const isSystem = labels[name]?.system;
          if (isSystem) removeSystemLabels(labelSet, labels, [name]);
          else removeSystemLabels(labelSet, labels);
          labelSet.add(name);
        });
      }),
    [updateByIds, setEmails, labels]
  );

  const moveToLabelFrom = useCallback(
    (ids, sourceLabel, dest) =>
      withUndo(ids, setEmails, () => {
        updateByIds(ids, (labelSet) => {
          if (sourceLabel) labelSet.delete(String(sourceLabel));
          if (!dest) return;
          const isSystem = labels[dest]?.system;
          if (isSystem) removeSystemLabels(labelSet, labels, [dest]);
          else removeSystemLabels(labelSet, labels);
          labelSet.add(dest);
        });
      }),
    [updateByIds, setEmails, labels]
  );

  const deleteForever = useCallback(
    (ids) => {
      // If ids are already email UUIDs (from ActionBar), use them directly
      // Otherwise, find matching emails by thread ID or other keys
      let emailIds;

      // Check if first ID looks like a UUID (contains hyphens, 32+ chars)
      const firstId = String(ids[0] || "");
      const isUUID = firstId.includes("-") && firstId.length >= 32;

      if (isUUID) {
        // Already email IDs, use directly
        emailIds = ids;
      } else {
        // Find matching emails by thread/message IDs
        const match = makeMatch(ids);
        const matchingEmails = emails.filter(match);
        emailIds = matchingEmails.map((email) => email.id);
      }

      // Call bulk backend API with all email IDs at once
      if (emailIds.length > 0) {
        dispatch(bulkDeleteEmailThunk({ emailIds })).catch((error) => {
          console.error("Failed to bulk delete emails permanently:", error);
        });
      }

      // Remove from local state
      const match = makeMatch(ids);
      setEmails((prev) => prev.filter((m) => !match(m)));
    },
    [setEmails, dispatch, emails]
  );

  const snooze = useCallback(
    (ids, snoozeUntil) => {
      const match = makeMatch(ids);
      const removedInboxIds = new Set();
      const snoozeUntilISO = snoozeUntil.toISOString();

      // Call bulk backend API with all email IDs at once
      if (ids.length > 0) {
        dispatch(
          bulkSnoozeEmailsThunk({
            emailIds: ids,
            snooze_until: snoozeUntilISO,
          })
        ).catch((error) => {
          console.error("Failed to bulk snooze emails:", error);
        });
      }

      setEmails((prev) =>
        prev.map((m) => {
          if (!match(m)) return m;

          const currentLabels = m.labels || [];
          const hadInbox = currentLabels.includes("Inbox");
          const withSnoozed = currentLabels.includes("Snoozed") ? currentLabels : [...currentLabels, "Snoozed"];
          const labelsWithoutInbox = withSnoozed.filter((label) => label !== "Inbox");

          if (hadInbox) {
            removedInboxIds.add(String(m.id));
          }

          return { ...m, labels: labelsWithoutInbox, snoozeUntil: snoozeUntilISO };
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
    [setEmails, setSoftRemovedLabels]
  );

  const unsnooze = useCallback(
    (ids, options = {}) => {
      const match = makeMatch(ids);
      const overrideIds = new Set((options.removedInboxIds || []).map((id) => String(id)));
      const restoredInboxIds = new Set();

      setEmails((prev) =>
        prev.map((m) => {
          if (!match(m)) return m;

          const currentLabels = m.labels || [];
          const labelsWithoutSnoozed = currentLabels.filter((label) => label !== "Snoozed");

          const key = String(m.id);
          const softRemoved = softRemovedLabels[key] || [];
          const shouldRestoreFromSoftRemoved = softRemoved.includes("Inbox");
          const shouldRestoreFromOverride = overrideIds.has(key);
          const shouldRestoreInbox = shouldRestoreFromSoftRemoved || shouldRestoreFromOverride;

          const nextLabels =
            shouldRestoreInbox && !labelsWithoutSnoozed.includes("Inbox")
              ? [...labelsWithoutSnoozed, "Inbox"]
              : labelsWithoutSnoozed;

          if (shouldRestoreInbox) {
            restoredInboxIds.add(key);
          }

          return { ...m, labels: nextLabels, snoozeUntil: undefined };
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
    [setEmails, softRemovedLabels, setSoftRemovedLabels]
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
