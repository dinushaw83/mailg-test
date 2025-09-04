// hooks/useMailActions.js
import React, { useCallback, useContext, useMemo } from "react";
import { GlobalContext } from "../contexts/GlobalContext";

export default function useMailActions() {
  const { setState } = useContext(GlobalContext);

  const updateLabelsByIds = useCallback(
    (ids, transform) => {
      const idSet = new Set(ids);
      setState((prev) => ({
        ...prev,
        emails: prev.emails.map((m) => {
          if (!idSet.has(m.id)) return m;
          const labels = new Set(m.labels || []);
          transform(labels, m);
          return { ...m, labels: Array.from(labels) };
        }),
      }));
    },
    [setState]
  );

  const actions = useMemo(() => {
    const addLabels = (ids, names = []) =>
      updateLabelsByIds(ids, (labels) => names.forEach((n) => labels.add(n)));

    const removeLabels = (ids, names = []) =>
      updateLabelsByIds(ids, (labels) =>
        names.forEach((n) => labels.delete(n))
      );

    const moveToInbox = (ids) =>
      updateLabelsByIds(ids, (labels) => {
        labels.delete("Spam");
        labels.delete("Trash");
        labels.add("Inbox");
      });

    const archive = (ids) =>
      updateLabelsByIds(ids, (labels) => {
        labels.delete("Inbox");
      });

    const moveToSpam = (ids) => {
      const idSet = new Set(ids);
      setState((prev) => ({
        ...prev,
        emails: prev.emails.map((m) => {
          if (!idSet.has(m.id)) return m;

          const labels = new Set(m.labels || []);
          labels.delete("Inbox");
          labels.delete("Trash");
          labels.add("Spam");

          return {
            ...m,
            important: false,
            labels: Array.from(labels),
          };
        }),
      }));
    };

    const moveToTrash = (ids) =>
      updateLabelsByIds(ids, (labels) => {
        labels.delete("Inbox");
        labels.delete("Spam");
        labels.add("Trash");
      });

    const restoreFromTrash = (ids) =>
      updateLabelsByIds(ids, (labels) => {
        labels.delete("Trash");
        labels.add("Inbox");
      });

    const toggleStar = (ids) =>
      setState((prev) => ({
        ...prev,
        emails: prev.emails.map((m) =>
          ids.includes(m.id) ? { ...m, starred: !m.starred } : m
        ),
      }));

    const markRead = (ids, read = true) =>
      setState((prev) => ({
        ...prev,
        emails: prev.emails.map((m) =>
          ids.includes(m.id) ? { ...m, read } : m
        ),
      }));

    const toggleImportant = (ids) =>
      setState((prev) => ({
        ...prev,
        emails: prev.emails.map((m) =>
          ids.includes(m.id) ? { ...m, important: !m.important } : m
        ),
      }));

    const setImportant = (ids, value = true) =>
      setState((prev) => ({
        ...prev,
        emails: prev.emails.map((m) =>
          ids.includes(m.id) ? { ...m, important: value } : m
        ),
      }));
    
    const notSpam = (ids) =>
      updateLabelsByIds(ids, (labels) => {
        labels.delete("Spam");
        labels.add("Inbox");
      });

    const moveToLabel = (ids, name) => {
      const idSet = new Set(ids);
      setState(prev => ({
        ...prev,
        emails: prev.emails.map(m => {
          if (!idSet.has(m.id)) return m;
          const labels = new Set(m.labels || []);
          labels.delete("Inbox");
          labels.delete("Spam");
          labels.delete("Trash");
          labels.add(name);      // e.g. "Work"
          return { ...m, labels: Array.from(labels) };
        }),
      }));
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
      moveToLabel
    };
  }, [setState, updateLabelsByIds]);

  return actions;
}
