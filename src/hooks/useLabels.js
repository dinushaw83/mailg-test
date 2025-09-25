import { useCallback, useMemo } from "react";
import { useGlobalContext } from "../contexts/GlobalContext";

export const ROOT = null;

const getThreadKey = (m) => {
  if (!m) return null;
  if (m.threadId) {
    return String(m.threadId).replace(/^#thread-f:/, "");
  }
  return m.legacyThreadId || null;
};

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
      const parsed = splitKey(key);        // "__ROOT__::Parent::Child"
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

  const byKey = Object.fromEntries(nodes.map(n => [n.key, n]));
  const roots = [];
  for (const n of nodes) {
    if (n.parentKey && byKey[n.parentKey]) byKey[n.parentKey].children.push(n);
    else roots.push(n);
  }
  const sortRec = arr => { arr.sort((a, b) => a.name.localeCompare(b.name)); arr.forEach(c => sortRec(c.children)); };
  sortRec(roots);
  return roots;
}

// Useful for <Select> and MoveTo menus: makes [{key, name, depth}] flat list
export function flattenTreeForSelect(roots, depth = 0, out = []) {
  for (const node of roots) {
    out.push({ key: node.key, name: node.name, depth, system: node.system });
    if (node.children?.length) flattenTreeForSelect(node.children, depth + 1, out);
  }
  return out;
}

export function getPathLabelFromKey(labelsMap, key) {
  if (!key) return "";
  const parts = key.split("::");
  const paths = [];
  for (let i = 0; i < parts.length; i++) {
    const k = parts.slice(0, i + 1).join("::");       // cumulative key
    const nm = labelsMap?.[k]?.name ?? parts[i];      // fallback to raw segment
    paths.push(nm);
  }
  return paths.join(" / ");
}

export default function useLabels() {
  const { emails, setEmails, labels, setLabels } = useGlobalContext();

  const createLabel = useCallback(
    (name, { parentKey = ROOT, ...meta } = {}) => {
      const nm = String(name || "").trim();
      if (!nm) return;

      setLabels(prev => {
        const cur = prev || {};

        // sibling uniqueness: check names under same parentKey (fallback to key parsing)
        const isDup = Object.entries(cur).some(([key, v]) => {
          let nm = v?.name, pk = v?.parentKey;
          if (nm == null || pk === undefined) {
            const parsed = splitKey(key);
            nm = nm ?? parsed.name;
            pk = pk ?? (parsed.parentKey ?? ROOT);
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

  // Rekey an entire subtree when a node is renamed
  const renameLabel = useCallback(
    (key, newName) => {
      const nm = String(newName || "").trim();
      if (!nm) return;

      setLabels(prev => {
        const cur = { ...(prev || {}) };
        const lbl = cur[key];
        if (!lbl) return prev;

        // sibling uniqueness
        const dup = Object.entries(cur).some(([k, v]) =>
          v.parentKey === lbl.parentKey &&
          (v.name || "").toLowerCase() === nm.toLowerCase() &&
          k !== key
        );
        if (dup) return prev;

        const newKey = makeKey(nm, lbl.parentKey);

        // Fast path: key unchanged (case-only rename)
        if (newKey === key) {
          cur[key] = { ...lbl, name: nm };
          return cur;
        }

        // Build parent→children index to walk the whole subtree
        const childrenByParent = {};
        for (const [k, v] of Object.entries(cur)) {
          const p = v.parentKey ?? ROOT;
          (childrenByParent[p] ||= []).push(k);
        }

        // Collect subtree (BFS)
        const oldToNew = new Map();
        const queue = [key];
        oldToNew.set(key, newKey);

        while (queue.length) {
          const oldK = queue.shift();
          const mappedParent = oldToNew.get(oldK); // new parent key for its children
          const childKeys = childrenByParent[oldK] || [];
          for (const ck of childKeys) {
            const child = cur[ck];
            const childNewKey = makeKey(child.name, mappedParent);
            oldToNew.set(ck, childNewKey);
            queue.push(ck);
          }
        }

        // Apply rekey operations
        const next = { ...cur };
        // 1) create new entries
        for (const [oldK, newK] of oldToNew.entries()) {
          const v = next[oldK];
          if (!v) continue;
          const isRoot = oldK === key;
          const newParentKey = isRoot ? v.parentKey : oldToNew.get(v.parentKey) || v.parentKey;
          next[newK] = { ...v, name: isRoot ? nm : v.name, parentKey: newParentKey };
        }
        // 2) delete old keys
        for (const oldK of oldToNew.keys()) {
          delete next[oldK];
        }

        // Update emails for the **renamed node only**
        // (descendant keys are not in emails unless assigned; if they are, they’ve been rekeyed above)
        const renamedOldKey = key;
        const renamedNewKey = newKey;
        if (renamedOldKey !== renamedNewKey) {
          setEmails(prevEmails =>
            (prevEmails || []).map(m => ({
              ...m,
              labels: (m.labels || []).map(l => (l === renamedOldKey ? renamedNewKey : l)),
            }))
          );
        }

        return next;
      });
    },
    [setLabels, setEmails]
  );

  const deleteLabel = useCallback(
    (key) => {
      setLabels(prev => {
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

  const removeLabelFromThread = useCallback(
    (threadId, labelKey) => {
      const normalizedThreadId = String(threadId).replace(/^#thread-f:/, "");
      setEmails((prev) =>
        (prev || []).map((m) =>
          getThreadKey(m) === normalizedThreadId
            ? { ...m, labels: (m.labels || []).filter((l) => l !== labelKey) }
            : m
        )
      );
    },
    [setEmails]
  );

  const addLabelToThread = useCallback(
    (threadId, labelKey) => {
      setEmails(prev =>
        (prev || []).map(m =>
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

  const labelTree = useMemo(() => buildTree(labels || {}), [labels]);

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
    removeLabelFromThread,
    addLabelToThread,
  };
}
