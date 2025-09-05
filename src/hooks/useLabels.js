// hooks/useLabels.js
import React, { useCallback, useMemo } from "react";
import { useGlobalContext } from "../contexts/GlobalContext";

export default function useLabels() {
  const { emails, setEmails, labels, setLabels } = useGlobalContext();

  const createLabel = useCallback(
    (name, meta = {}) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setLabels((prev) => {
        if (prev[trimmed]) return prev; // no dupes
        return {
          ...prev,
          [trimmed]: { system: false, color: null, ...meta },
        };
      });
    },
    [setLabels]
  );

  const renameLabel = useCallback(
    (oldName, newName) => {
      const next = newName.trim();
      if (!next || oldName === next) return;
      setLabels((prev) => {
        const meta = prev[oldName];
        if (!meta || prev[next]) return prev; // guard
        const labels = { ...prev };
        labels[next] = { ...meta, system: false };
        delete labels[oldName];
        const emails = emails.map((m) => ({
          ...m,
          labels: (m || []).map((l) => (l === oldName ? next : l)),
        }));
        setEmails(emails);
        return labels;
      });
    },
    [setLabels]
  );

  const deleteLabel = useCallback(
    (name) => {
      setLabels((prev) => {
        const meta = prev[name];
        if (!meta || meta.system) return prev; // don’t delete system labels
        const labels = { ...prev };
        delete labels[name];
        const emails = emails.map((m) => ({
          ...m,
          labels: (m.labels || []).filter((l) => l !== name),
        }));
        setEmails(emails);
        return labels;
      });
    },
    [setLabels]
  );

  const labelIndex = useMemo(() => {
    const map = {};
    for (const m of emails) {
      for (const l of m.labels || []) {
        if (!map[l]) map[l] = { total: 0, unread: 0, items: [] };
        map[l].total += 1;
        if (!m.read) map[l].unread += 1;
        map[l].items.push(m);
      }
    }
    return map;
  }, [emails]);

  return {
    labels,
    createLabel,
    renameLabel,
    deleteLabel,
    labelIndex,
  };
}
