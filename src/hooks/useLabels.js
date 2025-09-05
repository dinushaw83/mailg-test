// hooks/useLabels.js
import { useCallback, useMemo } from "react";
import { useGlobalContext } from "../contexts/GlobalContext";

// Build a simple tree for rendering (indent, expand, etc.)
function buildTree(labels) {
  const nodes = Object.entries(labels || {}).map(([name, meta]) => ({
    name,
    ...meta,
    children: [],
  }));
  const byName = Object.fromEntries(nodes.map(n => [n.name, n]));
  const roots = [];
  for (const n of nodes) {
    if (n.parent && byName[n.parent]) byName[n.parent].children.push(n);
    else roots.push(n);
  }
  const sortRec = (arr) => {
    arr.sort((a, b) => a.name.localeCompare(b.name));
    arr.forEach(c => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

export default function useLabels() {
  const { emails, setEmails, labels, setLabels } = useGlobalContext();

  // Create a label; supports optional parent (by name).
  // Enforces sibling-unique names (case-insensitive).
  const createLabel = useCallback(
    (name, { parent = null, ...meta } = {}) => {
      const nm = String(name || "").trim();
      if (!nm) return;

      setLabels(prev => {
        const cur = prev || {};
        // sibling uniqueness (same parent)
        const siblingNames = Object.entries(cur)
          .filter(([, m]) => (m.parent || null) === (parent || null))
          .map(([n]) => n.toLowerCase());

        if (siblingNames.includes(nm.toLowerCase())) return cur;

        return {
          ...cur,
          [nm]: { system: false, color: null, parent: parent || null, ...meta },
        };
      });
    },
    [setLabels]
  );

  // Rename a label; update emails and children parent refs.
  const renameLabel = useCallback(
    (oldName, newName) => {
      const nextName = String(newName || "").trim();
      if (!nextName || oldName === nextName) return;

      setLabels(prev => {
        const cur = { ...(prev || {}) };
        const meta = cur[oldName];
        if (!meta || cur[nextName]) return prev; // guard: must exist; no duplicate

        // Move label entry
        delete cur[oldName];
        cur[nextName] = { ...meta, system: !!meta.system };

        // Fix children parent refs (names are our keys)
        for (const [n, m] of Object.entries(cur)) {
          if (m.parent === oldName) {
            cur[n] = { ...m, parent: nextName };
          }
        }

        // Update emails -> replace oldName with nextName in label arrays
        setEmails(prevEmails =>
          (prevEmails || []).map(m => ({
            ...m,
            labels: (m.labels || []).map(l => (l === oldName ? nextName : l)),
          }))
        );

        return cur;
      });
    },
    [setLabels, setEmails]
  );

  // Delete a label; cascade to descendants; remove from emails.
  const deleteLabel = useCallback(
    (name) => {
      setLabels(prev => {
        const cur = { ...(prev || {}) };
        const meta = cur[name];
        if (!meta || meta.system) return prev; // don't delete system labels or non-existent

        // Collect all descendants (cascade)
        const toDelete = new Set([name]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const [n, m] of Object.entries(cur)) {
            if (m.parent && toDelete.has(m.parent) && !toDelete.has(n)) {
              toDelete.add(n);
              changed = true;
            }
          }
        }

        // Remove from labels map
        for (const n of toDelete) delete cur[n];

        // Remove from emails
        setEmails(prevEmails =>
          (prevEmails || []).map(m => ({
            ...m,
            labels: (m.labels || []).filter(l => !toDelete.has(l)),
          }))
        );

        return cur;
      });
    },
    [setLabels, setEmails]
  );

  // Counts by label (flat). Works with nested too.
  const labelIndex = useMemo(() => {
    const map = {};
    for (const m of emails || []) {
      for (const l of m.labels || []) {
        if (!map[l]) map[l] = { total: 0, unread: 0, items: [] };
        map[l].total += 1;
        if (!m.read) map[l].unread += 1;
        map[l].items.push(m);
      }
    }
    return map;
  }, [emails]);

  // Optional: tree for sidebar / MoveTo menu (indent via depth)
  const labelTree = useMemo(() => buildTree(labels || {}), [labels]);

  return {
    labels,
    createLabel,
    renameLabel,
    deleteLabel,
    labelIndex,
    labelTree,
  };
}
