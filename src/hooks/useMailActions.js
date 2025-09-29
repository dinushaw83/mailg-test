// hooks/useMailActions.js
import React, { useCallback, useContext, useMemo } from "react";
import { GlobalContext } from "../contexts/GlobalContext";

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
            item?.threadId && String(item.threadId).replace("#thread-f:", ""),
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
  add(m.threadId && String(m.threadId).replace("#thread-f:", ""));
  add(m.legacyThreadId);
  add(m.legacyLastMessageId);
  add(m.legacyLastNonDraftMessageId);
  return out;
};

const makeMatch = (selection) => {
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

/* ────────────────────────────────────────────────────────────────────────────
 * Hook
 * ────────────────────────────────────────────────────────────────────────── */

export default function useMailActions() {
  const { setEmails } = useContext(GlobalContext);

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

  const moveToInbox = useCallback(
    (ids) =>
      updateByIds(ids, (labels) => {
        labels.delete("Trash");
        labels.delete("Spam");
        labels.delete("Snoozed");
        labels.add("Inbox");
      }),
    [updateByIds]
  );

  const archive = useCallback(
    (ids) =>
      updateByIds(ids, (labels) => {
        labels.delete("Inbox");
      }),
    [updateByIds]
  );

  const moveToSpam = useCallback(
    (ids) =>
      updateByIds(ids, (labels) => {
        labels.clear();
        labels.add("Spam");
      }),
    [updateByIds]
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
    (ids) =>
      updateByIds(ids, (labels) => {
        labels.delete("Inbox");
        labels.delete("Spam");
        labels.add("Trash");
      }),
    [updateByIds]
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
    (ids) => {
      const match = makeMatch(ids);
      setEmails((prev) => prev.map((m) => (match(m) ? { ...m, starred: !m.starred } : m)));
    },
    [setEmails]
  );

  const setStar = useCallback(
    (ids, value = true) => {
      const match = makeMatch(ids);
      setEmails((prev) => prev.map((m) => (match(m) ? { ...m, starred: value } : m)));
    },
    [setEmails]
  );

  const markRead = useCallback(
    (ids, read = true) => {
      const match = makeMatch(ids);
      setEmails((prev) => prev.map((m) => (match(m) ? { ...m, read } : m)));
    },
    [setEmails]
  );

  const toggleImportant = useCallback(
    (ids) => {
      const match = makeMatch(ids);
      setEmails((prev) => prev.map((m) => (match(m) ? { ...m, important: !m.important } : m)));
    },
    [setEmails]
  );

  const setImportant = useCallback(
    (ids, value = true) => {
      const match = makeMatch(ids);
      setEmails((prev) => prev.map((m) => (match(m) ? { ...m, important: !!value } : m)));
    },
    [setEmails]
  );

  const moveToLabel = useCallback(
    (ids, name) =>
      updateByIds(ids, (labels) => {
        if (!name) return;
        
        // Define system labels that are mutually exclusive
        const systemLabels = ["Inbox", "Sent", "Drafts", "Scheduled", "Spam", "Trash"];
        
        // If the target label is a system label, remove other system labels
        if (systemLabels.includes(String(name))) {
          systemLabels.forEach(systemLabel => {
            if (systemLabel !== String(name)) {
              labels.delete(systemLabel);
            }
          });
        }
        
        if (!labels.has(String(name))) {
          labels.add(String(name)); // add if not present
        }
      }),
    [updateByIds]
  );

  const moveToLabelFrom = useCallback(
    (ids, sourceLabel, dest) =>
      updateByIds(ids, (labels) => {
        if (sourceLabel) labels.delete(String(sourceLabel)); // remove old
        if (dest) labels.add(String(dest));                 // add new
      }),
    [updateByIds]
  );

  const deleteForever = useCallback(
    (ids) => {
      const match = makeMatch(ids);
      setEmails((prev) => prev.filter((m) => !match(m)));
    },
    [setEmails]
  );

  const snooze = useCallback(
    (ids, snoozeUntil) => {
      const match = makeMatch(ids);
      setEmails((prev) =>
        prev.map((m) => {
          if (match(m)) {
            const currentLabels = m.labels || [];
            const updatedLabels = currentLabels.includes("Snoozed") ? currentLabels : [...currentLabels, "Snoozed"];
            // Remove from inbox when snoozed
            const labelsWithoutInbox = updatedLabels.filter((label) => label !== "Inbox");
            return { ...m, labels: labelsWithoutInbox, snoozeUntil: snoozeUntil.toISOString() };
          }
          return m;
        })
      );
    },
    [setEmails]
  );

  const toggleMute = useCallback(
    (ids, value = true) => {
      const match = makeMatch(ids);
      setEmails((prev) =>
        prev.map((m) => {
          if (match(m)) {
            const currentLabels = m.labels || [];
            const updatedLabels = value
              ? currentLabels.includes("Muted")
                ? currentLabels
                : [...currentLabels, "Muted"]
              : currentLabels.filter((label) => label !== "Muted");
            // Remove from inbox when muted
            const labelsWithoutInbox = updatedLabels.filter((label) => label !== "Inbox");
            return { ...m, labels: labelsWithoutInbox };
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
      toggleMute,
    }),
    [
      addLabels,
      removeLabels,
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
      toggleMute,
    ]
  );
}
