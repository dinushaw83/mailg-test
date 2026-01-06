import { useCallback, useMemo } from "react";
import { useGlobalContext } from "../contexts/GlobalContext";

export const ROOT = null;

const getThreadKey = (m) => {
  if (!m) return null;
  if (m.threadId) {
    return String(m.threadId).replace("#thread-f:", "");
  }
  return m.legacyThreadId || null;
};

export const normalizeLabelName = (name) => name.replace(/::/g, "/");

export function makeKey(name, parentKey = ROOT) {
  return parentKey ? `${parentKey}::${name}` : name;
}

export function splitKey(key) {
  const idx = key.lastIndexOf("::");
  if (idx === -1) return { parentKey: ROOT, name: key };
  return { parentKey: key.slice(0, idx), name: key.slice(idx + 2) };
}

function buildTree(labels) {
  const nodes = Object.entries(labels || {}).map(([key, meta]) => {
    // fallback to composite parsing when fields are missing
    let name = meta?.name;
    let parentKey = meta?.parentKey;

    if (!name || !parentKey) {
      const parsed = splitKey(key); // "__ROOT__::Parent::Child"
      name = name ?? parsed.name;
      parentKey = parentKey ?? parsed.parentKey ?? ROOT;
    }

    return {
      key,
      name,
      parentKey,
      system: !!meta?.system,
      children: [],
    };
  });

  const byKey = Object.fromEntries(nodes.map((n) => [n.key, n]));
  const roots = [];
  for (const n of nodes) {
    if (n.parentKey && byKey[n.parentKey]) byKey[n.parentKey].children.push(n);
    else roots.push(n);
  }
  const sortRec = (arr) => {
    arr.sort((a, b) => a.name.localeCompare(b.name));
    arr.forEach((c) => sortRec(c.children));
  };
  sortRec(roots);
  return roots;
}

// Useful for <Select> and MoveTo menus: makes [{key, name, depth}] flat list
export function flattenTreeForSelect(roots, depth = 0, out = []) {
  for (const node of roots) {
    out.push({
      key: node.key,
      name: node.name,
      depth,
      system: node.system,
      children: node.children?.map((c) => c.key) ?? [], // keep child keys
    });
    if (node.children?.length) flattenTreeForSelect(node.children, depth + 1, out);
  }
  return out;
}

export function getPathLabelFromKey(labelsMap, key) {
  if (!key) return "";
  const parts = key.split("::");
  const paths = [];
  for (let i = 0; i < parts.length; i++) {
    const k = parts.slice(0, i + 1).join("::"); // cumulative key
    const nm = labelsMap?.[k]?.name ?? parts[i]; // fallback to raw segment
    paths.push(nm);
  }
  return paths.join("/");
}

export default function useLabels() {
  const { emails, setEmails, labels, setLabels } = useGlobalContext();

  const createLabel = useCallback(
    (name, { parentKey = ROOT, ...meta } = {}) => {
      const nm = String(name || "").trim();
      if (!nm) return;

      setLabels((prev) => {
        const cur = prev || {};

        // sibling uniqueness: check names under same parentKey (fallback to key parsing)
        const isDup = Object.entries(cur).some(([key, v]) => {
          let nm = v?.name,
            pk = v?.parentKey;
          if (nm == null || pk === undefined) {
            const parsed = splitKey(key);
            nm = nm ?? parsed.name;
            pk = pk ?? parsed.parentKey ?? ROOT;
          }
          return (pk ?? ROOT) === parentKey && (nm || "").toLowerCase() === name.toLowerCase();
        });
        if (isDup) return cur;

        const key = makeKey(name, parentKey);
        if (cur[key]) return cur;

        return {
          ...cur,
          [key]: { name, parentKey, system: false, color: null, ...meta },
        };
      });
    },
    [setLabels]
  );

  const renameLabel = useCallback(
    (key, newName, newParentKey = undefined) => {
      console.log("renameLabel", key, newName, newParentKey);

      const nm = String(newName || "").trim();
      if (!nm) return;

      let oldToNew = new Map();

      setLabels((prev) => {
        const cur = { ...(prev || {}) };
        const lbl = cur[key];
        if (!lbl) return prev;

        // Determine target parent (explicit override or existing)
        const targetParent = newParentKey === undefined ? (lbl.parentKey ?? null) : newParentKey;

        // Prevent circular nesting (self or descendant)
        if (targetParent === key || (targetParent && targetParent.startsWith(key + "::"))) {
          console.warn("Invalid move: cannot nest label under its own descendant");
          return prev;
        }

        // New key for renamed/moved label
        const newKey = targetParent ? `${targetParent}::${nm}` : nm;
        if (newKey === key) return prev;

        // --- Build children index ---
        const childrenByParent = {};
        for (const [k, v] of Object.entries(cur)) {
          const parsed = splitKey(k);
          const p = v.parentKey ?? parsed.parentKey ?? ROOT;
          (childrenByParent[p] ||= []).push(k);
        }

        // --- BFS collect subtree ---
        oldToNew = new Map();
        const queue = [key];
        oldToNew.set(key, newKey);

        while (queue.length) {
          const oldK = queue.shift();
          const mappedParent = oldToNew.get(oldK);
          const childKeys = childrenByParent[oldK] || [];
          for (const ck of childKeys) {
            const child = cur[ck];
            const childName = child?.name ?? splitKey(ck).name;
            const childNewKey = `${mappedParent}::${childName}`;
            oldToNew.set(ck, childNewKey);
            queue.push(ck);
          }
        }

        // --- Prevent collisions with existing labels outside the moved subtree ---
        for (const [, newK] of oldToNew.entries()) {
          if (cur[newK] && !oldToNew.has(newK)) {
            console.warn("Invalid move: target path collides with an existing label", newK);
            return prev;
          }
        }

        // --- Rebuild map with corrected parent references ---
        const next = { ...cur };
        for (const [oldK, newK] of oldToNew.entries()) {
          const node = cur[oldK];
          if (!node) continue;
          const oldParent = node.parentKey;
          const newParent = oldK === key ? targetParent || null : oldToNew.get(oldParent) || node.parentKey || null;

          next[newK] = {
            ...node,
            name: oldK === key ? nm : node.name,
            parentKey: newParent,
          };
        }

        // Clean out the old keys
        for (const oldK of oldToNew.keys()) delete next[oldK];

        return next;
      });

      // --- Sync email labels ---
      setEmails((prevEmails) =>
        (prevEmails || []).map((m) => ({
          ...m,
          labels: (m.labels || []).map((l) => oldToNew.get(l) || l),
        }))
      );
    },
    [setLabels, setEmails]
  );

  const deleteLabel = useCallback(
    (key) => {
      setLabels((prev) => {
        const cur = { ...(prev || {}) };
        const lbl = cur[key];
        if (!lbl || lbl.system) return prev;

        // collect subtree by parentKey (cascade delete)
        const toDelete = new Set([key]);
        let changed = true;
        while (changed) {
          changed = false;
          for (const [k, v] of Object.entries(cur)) {
            if (toDelete.has(v.parentKey) && !toDelete.has(k)) {
              toDelete.add(k);
              changed = true;
            }
          }
        }

        for (const k of toDelete) delete cur[k];

        setEmails((prevEmails) =>
          (prevEmails || []).map((m) => ({
            ...m,
            labels: (m.labels || []).filter((l) => !toDelete.has(l)),
          }))
        );

        return cur;
      });
    },
    [setLabels, setEmails]
  );

  const removeLabelFromThread = useCallback(
    (threadId, labelKey) => {
      const normalizedThreadId = String(threadId).replace(/^#thread-f:/, "");
      setEmails((prev) =>
        (prev || []).map((m) =>
          getThreadKey(m) === normalizedThreadId ? { ...m, labels: (m.labels || []).filter((l) => l !== labelKey) } : m
        )
      );
    },
    [setEmails]
  );

  const addLabelToThread = useCallback(
    (threadId, labelKey) => {
      setEmails((prev) =>
        (prev || []).map((m) =>
          getThreadKey(m) === String(threadId).replace("#thread-f:", "")
            ? {
                ...m,
                labels: Array.from(new Set([...(m.labels || []), labelKey])),
              }
            : m
        )
      );
    },
    [setEmails]
  );

  // Counts by label key
  const labelIndex = useMemo(() => {
    const map = {};
    for (const m of emails || []) {
      for (const key of m.labels || []) {
        if (!map[key]) map[key] = { total: 0, unread: 0, items: [] };
        map[key].total += 1;
        if (!m.read) map[key].unread += 1;
        map[key].items.push(m);
      }
    }
    return map;
  }, [emails]);

  const setLabelColor = (key, color, { withSublabels = false } = {}) => {
    setLabels((prev) => {
      const next = { ...prev };
      const update = (k) => {
        if (next[k]) {
          next[k] = { ...next[k], color };
          if (withSublabels) {
            Object.entries(next)
              .filter(([_, v]) => v.parentKey === k)
              .forEach(([childKey]) => update(childKey));
          }
        }
      };
      update(key);
      return next;
    });
  };

  const labelTree = useMemo(() => buildTree(labels || {}), [labels]);

  const getSelectionLabels = useCallback(
    (selectedIds) => {
      const ids = new Set(Array.from(selectedIds ?? []).map(String));

      const hasAnyId = (m) => {
        const keys = [
          m.id,
          m.messageId,
          m.threadId,
          m.threadId && String(m.threadId).replace("#thread-f:", ""),
          m.legacyThreadId,
          m.legacyLastMessageId,
          m.legacyLastNonDraftMessageId,
        ]
          .map((v) => String(v ?? "").trim())
          .filter(Boolean);

        return keys.some((k) => ids.has(k));
      };

      const selectedList = (emails || []).filter(hasAnyId);
      const nSel = selectedList.length;

      // count labels across selected
      const labelCounts = new Map();
      for (const m of selectedList) {
        for (const l of m.labels ?? []) {
          labelCounts.set(l, (labelCounts.get(l) || 0) + 1);
        }
      }

      // intersection (labels on ALL selected)
      const currentLabels =
        nSel === 0 ? new Set() : new Set([...labelCounts.entries()].filter(([_, c]) => c === nSel).map(([l]) => l));

      return { currentLabels, labelCounts, nSel };
    },
    [emails]
  );

  return {
    labels,
    createLabel,
    renameLabel,
    deleteLabel,
    labelIndex,
    labelTree,
    flattenTreeForSelect,
    ROOT,
    makeKey,
    splitKey,
    setLabelColor,
    removeLabelFromThread,
    addLabelToThread,
    getSelectionLabels,
  };
}
