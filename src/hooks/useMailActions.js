// hooks/useMailActions.js
import React, { useCallback, useContext, useMemo } from "react";
import { GlobalContext } from "../contexts/GlobalContext";

export default function useMailActions() {
  const { setEmails } = useContext(GlobalContext);

  const updateLabelsByIds = useCallback(
    (ids, transform) => {
      const idSet = new Set(ids.map((id) => String(id)));
      setEmails((prev) =>
        prev.map((m) => {
          if (!idSet.has(String(m.id))) return m;
          const labels = new Set(m.labels || []);
          transform(labels, m);
          return { ...m, labels: Array.from(labels) };
        })
      );
    },
    [setEmails]
  );

  const actions = useMemo(() => {
    const addLabels = (ids, names = []) => updateLabelsByIds(ids, (labels) => names.forEach((n) => labels.add(n)));

    const removeLabels = (ids, names = []) =>
      updateLabelsByIds(ids, (labels) => names.forEach((n) => labels.delete(n)));

    const moveToInbox = (ids) =>
      updateLabelsByIds(ids, (labels) => {
        labels.clear();
        labels.add("Inbox");
      });

    const archive = (ids) =>
      updateLabelsByIds(ids, (labels) => {
        labels.clear();
        labels.add("Archive");
      });

    const moveToSpam = (ids) => {
      const idSet = new Set(ids.map((id) => String(id)));
      setEmails((prev) =>
        prev.map((m) => {
          if (!idSet.has(String(m.id))) return m;

          const labels = new Set(m.labels || []);
          labels.clear();
          labels.add("Spam");

          return {
            ...m,
            important: false,
            labels: Array.from(labels),
          };
        })
      );
    };

    const moveToTrash = (ids) =>
      updateLabelsByIds(ids, (labels) => {
        labels.clear();
        labels.add("Trash");
      });

    const restoreFromTrash = (ids) =>
      updateLabelsByIds(ids, (labels) => {
        labels.clear();
        labels.add("Inbox");
      });

    const toggleStar = (ids) =>
      setEmails((prev) =>
        prev.map((m) => (ids.map((id) => String(id)).includes(String(m.id)) ? { ...m, starred: !m.starred } : m))
      );

    const markRead = (ids, read = true) =>
      setEmails((prev) => prev.map((m) => (ids.map((id) => String(id)).includes(String(m.id)) ? { ...m, read } : m)));

    const toggleImportant = (ids) =>
      setEmails((prev) =>
        prev.map((m) => (ids.map((id) => String(id)).includes(String(m.id)) ? { ...m, important: !m.important } : m))
      );

    const setImportant = (ids, value = true) =>
      setEmails((prev) =>
        prev.map((m) => (ids.map((id) => String(id)).includes(String(m.id)) ? { ...m, important: value } : m))
      );

    const notSpam = (ids) =>
      updateLabelsByIds(ids, (labels) => {
        labels.clear();
        labels.add("Inbox");
      });

    const moveToLabel = (ids, name) => {
      const idSet = new Set(ids.map((id) => String(id)));
      setEmails((prev) =>
        prev.map((m) => {
          if (!idSet.has(String(m.id))) return m;
          const labels = new Set(m.labels || []);
          labels.clear();
          labels.add(name); // e.g. "Work"
          return { ...m, labels: Array.from(labels) };
        })
      );
    };

    // When moving from one label view to another label,
    // remove the current label and add the new one.
    const moveToLabelFrom = (ids, sourceLabel, dest) => {
      const idSet = new Set(ids.map((id) => String(id)));
      setEmails((prev) =>
        prev.map((m) => {
          if (!idSet.has(String(m.id))) return m;
          const labels = new Set(m.labels || []);
          labels.clear();
          if (sourceLabel) labels.delete(sourceLabel);
          labels.add(dest);
          return { ...m, labels: Array.from(labels) };
        })
      );
    };

    return {
      addLabels,
      removeLabels,
      moveToInbox,
      archive,
      moveToSpam,
      moveToTrash,
      restoreFromTrash,
      toggleStar,
      markRead,
      toggleImportant,
      setImportant,
      notSpam,
      moveToLabel,
      moveToLabelFrom,
    };
  }, [setEmails, updateLabelsByIds]);

  return actions;
}
