import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  updateLabelsThunk,
  updateEmailStarredThunk,
  updateEmailImportantThunk,
  snoozeEmailThunk,
  moveToTrashThunk,
  moveToSpamThunk,
  deleteEmailThunk,
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
            item.legacyThreadId,
            item.legacyLastMessageId,
            item.legacyLastNonDraftMessageId,
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
  add(m.legacyThreadId);
  add(m.legacyLastMessageId);
  add(m.legacyLastNonDraftMessageId);
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
  const { setEmails, emails, labels, setSoftRemovedLabels, softRemovedLabels } = useGlobalContext();

  // Get key to ID mapping for transforming composite keys to UUIDs
  const keyToLabelIdMap = useSelector((state) => state.mail.keyToLabelIdMap || {});

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
    (ids, { add = [], remove = [] }) => {
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

      // Update local state immediately for UI feedback
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
        // Determine final label state: add new ones, remove old ones
        // For simplicity, we'll send the full label set, but backend should handle add/remove
        // This might need adjustment based on actual backend API expectations
        dispatch(
          updateLabelsThunk({
            emailIds: ids.map(String),
            labels: { add: backendLabelsToAdd, remove: backendLabelsToRemove },
          })
        ).catch((error) => {
          console.error("Failed to sync labels with backend:", error);
          // Could rollback local changes here if needed
        });
      }
    },
    [updateByIds, dispatch, keyToLabelIdMap]
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
    (ids) =>
      updateByIds(ids, (labels) => {
        labels.delete("Inbox");
      }),
    [updateByIds]
  );

  const deleteAllSpam = useCallback(() => {
    // fully delete all spam emails
    setEmails((prev) => prev.filter((m) => !m.labels.includes("Spam")));
  }, [updateByIds]);

  const moveToSpam = useCallback(
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

      // Call backend API for each email using actual email ID
      emailIds.forEach((emailId) => {
        dispatch(moveToSpamThunk({ emailId })).catch((error) => {
          console.error("Failed to move email to spam:", error);
        });
      });

      return withUndo(ids, setEmails, () => {
        updateByIds(ids, (labelSet) => {
          removeSystemLabels(labelSet, labels, ["Spam"]);
          labelSet.add("Spam");
        });
      });
    },
    [updateByIds, setEmails, labels, dispatch, emails]
  );

  const notSpam = useCallback(
    (ids) =>
      updateByIds(ids, (labels) => {
        labels.delete("Spam");
        labels.add("Inbox");
      }),
    [updateByIds]
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

      // Call backend API for each email using actual email ID
      emailIds.forEach((emailId) => {
        dispatch(moveToTrashThunk({ emailId })).catch((error) => {
          console.error("Failed to move email to trash:", error);
        });
      });

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
    (ids, currentStarredState) => {
      // Determine the new state - if currentStarredState is provided, use opposite
      // Otherwise, we'll need to look it up (not ideal, but fallback)
      const newState = currentStarredState !== undefined ? !currentStarredState : true;

      console.log("⭐ toggleStar called for ids:", ids, "newState:", newState);

      ids.forEach((id) => {
        dispatch(
          updateEmailStarredThunk({
            emailId: id,
            is_starred: newState,
          })
        ).catch((error) => {
          console.error("Failed to sync starred status with backend:", error);
        });
      });

      // Update local state optimistically for immediate feedback
      const match = makeMatch(ids);
      setEmails((prev) => {
        return prev.map((m) => {
          if (match(m)) {
            return { ...m, is_starred: newState };
          }
          return m;
        });
      });
    },
    [setEmails, dispatch]
  );

  const setStar = useCallback(
    (ids, value = true) => {
      const match = makeMatch(ids);

      // Update local state immediately (optimistic update)
      setEmails((prev) => {
        const updated = prev.map((m) => {
          if (match(m)) {
            // Dispatch to backend for each email
            dispatch(
              updateEmailStarredThunk({
                emailId: m.id,
                is_starred: value,
              })
            ).catch((error) => {
              console.error("Failed to sync starred status with backend:", error);
            });

            return { ...m, is_starred: value };
          }
          return m;
        });
        return updated;
      });
    },
    [setEmails, dispatch]
  );

  const markRead = useCallback(
    (ids, read = true) => {
      const match = makeMatch(ids);
      setEmails((prev) => prev.map((m) => (match(m) ? { ...m, is_read: read } : m)));
    },
    [setEmails]
  );

  const toggleImportant = useCallback(
    (ids, currentImportantState) => {
      // Determine the new state
      const newState = currentImportantState !== undefined ? !currentImportantState : true;

      ids.forEach((id) => {
        dispatch(
          updateEmailImportantThunk({
            emailId: id,
            is_important: newState,
          })
        ).catch((error) => {
          console.error("Failed to sync important status with backend:", error);
        });
      });

      // Update local state optimistically for immediate feedback
      const match = makeMatch(ids);
      setEmails((prev) => {
        return prev.map((m) => {
          if (match(m)) {
            return { ...m, is_important: newState };
          }
          return m;
        });
      });
    },
    [setEmails, dispatch]
  );

  const setImportant = useCallback(
    (ids, value = true) => {
      const match = makeMatch(ids);

      // Update local state immediately (optimistic update)
      setEmails((prev) => {
        const updated = prev.map((m) => {
          if (match(m)) {
            // Dispatch to backend for each email
            dispatch(
              updateEmailImportantThunk({
                emailId: m.id,
                is_important: !!value,
              })
            ).catch((error) => {
              console.error("Failed to sync important status with backend:", error);
            });

            return { ...m, is_important: !!value };
          }
          return m;
        });
        return updated;
      });
    },
    [setEmails, dispatch]
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

      // Call backend API for each email using actual email ID
      emailIds.forEach((emailId) => {
        dispatch(deleteEmailThunk({ emailId })).catch((error) => {
          console.error("Failed to delete email permanently:", error);
        });
      });

      // Remove from local state
      setEmails((prev) => prev.filter((m) => !match(m)));
    },
    [setEmails, dispatch, emails]
  );

  const snooze = useCallback(
    (ids, snoozeUntil) => {
      const match = makeMatch(ids);
      const removedInboxIds = new Set();
      const snoozeUntilISO = snoozeUntil.toISOString();

      // Call backend API for each email
      ids.forEach((id) => {
        dispatch(
          snoozeEmailThunk({
            emailId: id,
            snooze_until: snoozeUntilISO,
          })
        ).catch((error) => {
          console.error("Failed to snooze email:", error);
        });
      });

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
