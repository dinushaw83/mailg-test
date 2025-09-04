// hooks/useLabels.js
import React, { useCallback, useMemo } from "react";
import { useGlobalContext } from "../contexts/GlobalContext";

export default function useLabels() {
  const { state, setState } = useGlobalContext();

  const createLabel = useCallback(
    (name, meta = {}) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setState((prev) => {
        if (prev.labels[trimmed]) return prev; // no dupes
        return {
          ...prev,
          labels: {
            ...prev.labels,
            [trimmed]: { system: false, color: null, ...meta },
          },
        };
      });
    },
    [setState]
  );

  const renameLabel = useCallback(
    (oldName, newName) => {
      const next = newName.trim();
      if (!next || oldName === next) return;
      setState((prev) => {
        const meta = prev.labels[oldName];
        if (!meta || prev.labels[next]) return prev; // guard
        const labels = { ...prev.labels };
        labels[next] = { ...meta, system: false };
        delete labels[oldName];
        const emails = prev.emails.map((m) => ({
          ...m,
          labels: (m.labels || []).map((l) => (l === oldName ? next : l)),
        }));
        return { ...prev, labels, emails };
      });
    },
    [setState]
  );

  const deleteLabel = useCallback(
    (name) => {
      setState((prev) => {
        const meta = prev.labels[name];
        if (!meta || meta.system) return prev; // don’t delete system labels
        const labels = { ...prev.labels };
        delete labels[name];
        const emails = prev.emails.map((m) => ({
          ...m,
          labels: (m.labels || []).filter((l) => l !== name),
        }));
        return { ...prev, labels, emails };
      });
    },
    [setState]
  );

  const labelIndex = useMemo(() => {
    const map = {};
    for (const m of state.emails) {
      for (const l of m.labels || []) {
        if (!map[l]) map[l] = { total: 0, unread: 0, items: [] };
        map[l].total += 1;
        if (!m.read) map[l].unread += 1;
        map[l].items.push(m);
      }
    }
    return map;
  }, [state.emails]);

  return {
    labels: state.labels,
    createLabel,
    renameLabel,
    deleteLabel,
    labelIndex,
  };
}
