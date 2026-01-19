import { createLabelThunk, deleteLabelThunk, updateLabelThunk } from "../store/slices/mailSlice";
import { getCompositeKey, getLabelId } from "../utils/labelTransform";
import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";

import { useGlobalContext } from "../contexts/GlobalContext";

export const ROOT = null;

const getThreadKey = (m) => {
  if (!m) return null;
  if (m.thread_id) {
    return String(m.thread_id);
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

function buildTree(labels, idToKeyMap = {}) {
  const nodes = Object.entries(labels || {}).map(([key, meta]) => {
    let name = meta?.name;
    let parentKey = meta?.parentKey;
    let compositeKey = key;

    // Check if this is a UUID-based label (from backend)
    if (meta?.id && idToKeyMap[meta.id]) {
      // This is a backend label: use derived composite key
      compositeKey = idToKeyMap[meta.id];
      name = meta.name;
      parentKey = meta.parentKey || ROOT;
    } else {
      // This is a system label or legacy label: use composite key directly
      if (!name || parentKey === undefined) {
        const parsed = splitKey(key);
        name = name ?? parsed.name;
        parentKey = parentKey ?? parsed.parentKey ?? ROOT;
      }
      compositeKey = key; // System labels use composite keys as-is
    }

    return {
      key: compositeKey, // Use composite key for tree structure
      id: meta?.id, // Keep UUID for backend labels
      name,
      parentKey,
      system: !!meta?.system,
      children: [],
      ...meta,
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
      ...node,
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
  const dispatch = useDispatch();
  const { emails, setEmails, labels, setLabels } = useGlobalContext();

  // Get mappings from Redux mail state
  const labelIdToKeyMap = useSelector((state) => state.mail.labelIdToKeyMap || {});
  const keyToLabelIdMap = useSelector((state) => state.mail.keyToLabelIdMap || {});
  // Get Redux mail state for folder-based emails
  const reduxMailState = useSelector((state) => state.mail || {});

  const createLabel = useCallback(
    async (name, { parentKey = ROOT, color = null, ...meta } = {}) => {
      const nm = String(name || "").trim();
      if (!nm) return;

      // Check for duplicates
      const cur = labels || {};
      const isDup = Object.entries(cur).some(([key, v]) => {
        let labelName = v?.name;
        let pk = v?.parentKey;
        if (labelName == null || pk === undefined) {
          const parsed = splitKey(key);
          labelName = labelName ?? parsed.name;
          pk = pk ?? parsed.parentKey ?? ROOT;
        }
        return (pk ?? ROOT) === parentKey && (labelName || "").toLowerCase() === name.toLowerCase();
      });

      if (isDup) {
        throw new Error("Label with this name already exists");
      }

      // Convert parentKey (composite key) to parent_id (UUID) if it's a backend label
      let parent_id = null;
      if (parentKey && keyToLabelIdMap[parentKey]) {
        parent_id = keyToLabelIdMap[parentKey];
      }

      // Dispatch thunk to create label in backend
      try {
        const createdLabel = await dispatch(createLabelThunk({ name: nm, color, parent_id })).unwrap();
        // Return the created label so the caller can use its UUID
        return createdLabel;
      } catch (error) {
        console.error("Failed to create label:", error);
        throw error;
      }
    },
    [dispatch, labels, keyToLabelIdMap]
  );

  const renameLabel = useCallback(
    async (key, newName, newParentKey = undefined) => {
      const nm = String(newName || "").trim();
      if (!nm) return;

      const cur = labels || {};

      // Find the label - could be by composite key or UUID
      let labelId = null;
      let label = null;

      if (keyToLabelIdMap[key]) {
        // Key is a composite key, get UUID
        labelId = keyToLabelIdMap[key];
        label = cur[labelId];
      } else if (cur[key]?.id) {
        // Key is already a UUID
        labelId = key;
        label = cur[key];
      } else if (cur[key]) {
        // Key is a composite key for a system label (legacy)
        label = cur[key];
        // System labels can't be renamed via backend, handle differently
        console.warn("Cannot rename system label via backend");
        return;
      }

      if (!label || !labelId) {
        console.warn("Label not found:", key);
        return;
      }

      // Determine target parent (explicit override or existing)
      const targetParent = newParentKey === undefined ? (label.parentKey ?? null) : newParentKey;

      // Convert parentKey (composite key) to parent_id (UUID) if it's a backend label
      let parent_id = null;
      if (targetParent && keyToLabelIdMap[targetParent]) {
        parent_id = keyToLabelIdMap[targetParent];
      }

      // Prevent circular nesting
      if (targetParent === key || (targetParent && targetParent.startsWith(key + "::"))) {
        console.warn("Invalid move: cannot nest label under its own descendant");
        throw new Error("Cannot nest label under its own descendant");
      }

      // Dispatch thunk to update label in backend
      try {
        await dispatch(updateLabelThunk({ id: labelId, name: nm, parent_id })).unwrap();
      } catch (error) {
        console.error("Failed to rename label:", error);
        throw error;
      }
    },
    [dispatch, labels, keyToLabelIdMap]
  );

  const deleteLabel = useCallback(
    async (key) => {
      const cur = labels || {};

      // Find the label - could be by composite key or UUID
      let labelId = null;
      let label = null;

      if (keyToLabelIdMap[key]) {
        // Key is a composite key, get UUID
        labelId = keyToLabelIdMap[key];
        label = cur[labelId];
      } else if (cur[key]?.id) {
        // Key is already a UUID
        labelId = key;
        label = cur[key];
      } else if (cur[key]) {
        // System label (legacy) - cannot delete
        label = cur[key];
        if (label.system) {
          console.warn("Cannot delete system label");
          throw new Error("Cannot delete system label");
        }
      }

      if (!label || !labelId) {
        console.warn("Label not found:", key);
        throw new Error("Label not found");
      }

      if (label.system) {
        console.warn("Cannot delete system label");
        throw new Error("Cannot delete system label");
      }

      // Dispatch thunk to delete label in backend (cascade delete handled by backend)
      try {
        await dispatch(deleteLabelThunk(labelId)).unwrap();
      } catch (error) {
        console.error("Failed to delete label:", error);
        throw error;
      }
    },
    [dispatch, labels, keyToLabelIdMap]
  );

  const removeLabelFromThread = useCallback(
    (thread_id, labelKey) => {
      const normalizedThreadId = String(thread_id);
      setEmails((prev) =>
        (prev || []).map((m) =>
          getThreadKey(m) === normalizedThreadId ? { ...m, labels: (m.labels || []).filter((l) => l !== labelKey) } : m
        )
      );
    },
    [setEmails]
  );

  const addLabelToThread = useCallback(
    (thread_id, labelKey) => {
      setEmails((prev) =>
        (prev || []).map((m) =>
          getThreadKey(m) === String(thread_id)
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
        if (!m.is_read) map[key].unread += 1;
        map[key].items.push(m);
      }
    }
    return map;
  }, [emails]);

  const setLabelColor = useCallback(
    async (key, color, { withSublabels = false } = {}) => {
      const cur = labels || {};

      // Find the label - could be by composite key or UUID
      let labelId = null;
      let label = null;

      if (keyToLabelIdMap[key]) {
        // Key is a composite key, get UUID
        labelId = keyToLabelIdMap[key];
        label = cur[labelId];
      } else if (cur[key]?.id) {
        // Key is already a UUID
        labelId = key;
        label = cur[key];
      } else if (cur[key]) {
        // System label (legacy) - handle locally
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
        return;
      }

      if (!label || !labelId) {
        // console.warn("Label not found:", key);
        throw new Error("Label not found");
      }

      // Dispatch thunk to update label color in backend
      try {
        await dispatch(updateLabelThunk({ id: labelId, color })).unwrap();

        // If withSublabels, update children (this would need to be handled by backend or multiple calls)
        if (withSublabels) {
          // Find and update all children
          const children = Object.entries(cur).filter(([_, v]) => v.parent_id === labelId);
          for (const [childId] of children) {
            await dispatch(updateLabelThunk({ id: childId, color })).unwrap();
          }
        }
      } catch (error) {
        console.error("Failed to update label color:", error);
        throw error;
      }
    },
    [dispatch, labels, keyToLabelIdMap, setLabels]
  );

  const labelTree = useMemo(() => buildTree(labels || {}, labelIdToKeyMap), [labels, labelIdToKeyMap]);

  const getSelectionLabels = useCallback(
    (selectedIds, folder = null, providedEmails = null) => {
      const ids = new Set(Array.from(selectedIds ?? []).map(String));

      // If emails are provided directly (e.g., from detail view), use them first
      // This handles the case where emails are fetched via React Query and not in Redux
      if (providedEmails && Array.isArray(providedEmails) && providedEmails.length > 0) {
        // Search by thread_id in provided emails
        const hasAnyId = (m) => {
          const threadId = String(m.thread_id ?? "").trim();
          const emailId = String(m.id ?? "").trim();
          return (threadId && ids.has(threadId)) || (emailId && ids.has(emailId));
        };

        const selectedList = providedEmails.filter(hasAnyId);
        const nSel = selectedList.length;

        // count labels across selected, using label ID as key for consistency
        const labelCounts = new Map();
        for (const m of selectedList) {
          for (const l of m.labels ?? []) {
            // Use label object as key (for backward compatibility with Labels.jsx iteration)
            labelCounts.set(l, (labelCounts.get(l) || 0) + 1);
          }
        }

        // Helper to find UUID for a label by name
        const findLabelUuidByName = (name) => {
          if (!name || !labels) return null;
          // labels is keyed by UUID, so we need to search values
          const normalizedName = String(name).toLowerCase();
          for (const [uuid, labelMeta] of Object.entries(labels)) {
            if (String(labelMeta.name || "").toLowerCase() === normalizedName) {
              return uuid;
            }
          }
          return null;
        };

        // intersection (labels on ALL selected)
        // Store label UUIDs in currentLabels for comparison with availableLabels keys
        const currentLabels =
          nSel === 0
            ? new Set()
            : new Set(
                [...labelCounts.entries()]
                  .filter(([_, c]) => c === nSel)
                  .map(([l]) => {
                    // First try to use the label's ID if it exists
                    if (l.id) return l.id;
                    // Otherwise, look up the UUID by name
                    const uuidFromName = findLabelUuidByName(l.name || l);
                    if (uuidFromName) return uuidFromName;
                    // Fallback to name/string for backwards compatibility
                    return l.name || l;
                  })
                  .filter(Boolean)
              );

        return { currentLabels, labelCounts, nSel };
      }

      // If folder is provided, get emails from Redux state for that folder
      let emailsToSearch = emails || [];
      if (folder) {
        // Handle label routes (format: "label:labelName")
        if (folder.startsWith("label:")) {
          // For label routes, search all emails across all folders
          // since labeled emails can be in any folder/category
          const allFolders = [
            "inbox",
            "primary",
            "promotions",
            "social",
            "updates",
            "sent",
            "drafts",
            "trash",
            "spam",
            "is_starred",
            "is_important",
            "is_snoozed",
            "all",
          ];
          const allEmails = [];
          const seenIds = new Set();

          for (const folderName of allFolders) {
            const folderEmails = reduxMailState[folderName] || [];
            for (const email of folderEmails) {
              const id = String(email.id ?? "");
              if (!seenIds.has(id)) {
                seenIds.add(id);
                allEmails.push(email);
              }
            }
          }
          emailsToSearch = allEmails;
        } else {
          const folderKey = folder.toLowerCase();

          // Special handling for inbox: when in inbox, we need to check all category tabs
          // (primary, promotions, social, updates) since we don't know which tab is active
          // We optimize by only searching categories that might contain the selected threads
          if (folderKey === "inbox") {
            const inboxCategories = ["primary", "promotions", "social", "updates"];

            // First, quickly find which categories contain any of the selected thread_ids
            const categoriesWithMatches = new Set();
            for (const category of inboxCategories) {
              const categoryEmails = reduxMailState[category] || [];
              // Check if any email in this category has a matching thread_id
              if (
                categoryEmails.some((email) => {
                  const threadId = String(email.thread_id ?? "").trim();
                  return threadId && ids.has(threadId);
                })
              ) {
                categoriesWithMatches.add(category);
              }
            }

            // If we found matches in specific categories, only search those
            // Otherwise, search all categories (fallback for safety)
            const categoriesToSearch =
              categoriesWithMatches.size > 0 ? Array.from(categoriesWithMatches) : inboxCategories;

            // Combine emails from relevant categories and deduplicate by thread_id
            const allCategoryEmails = categoriesToSearch.reduce((acc, category) => {
              const categoryEmails = reduxMailState[category] || [];
              return [...acc, ...categoryEmails];
            }, []);
            // Deduplicate by thread_id to avoid counting same thread multiple times
            const seenThreadIds = new Set();
            emailsToSearch = allCategoryEmails.filter((email) => {
              const threadId = String(email.thread_id ?? "").trim();
              if (!threadId || seenThreadIds.has(threadId)) return false;
              seenThreadIds.add(threadId);
              return true;
            });
          } else {
            // Map folder names to Redux state keys for other folders
            const folderMap = {
              sent: "sent",
              trash: "trash",
              spam: "spam",
              drafts: "drafts",
              all: "all",
              starred: "is_starred",
              important: "is_important",
              snoozed: "is_snoozed",
            };
            const reduxKey = folderMap[folderKey] || folderKey;
            emailsToSearch = reduxMailState[reduxKey] || [];
          }
        }
      }

      // Search by thread_id instead of id
      const hasAnyId = (m) => {
        const threadId = String(m.thread_id ?? "").trim();
        return threadId && ids.has(threadId);
      };

      const selectedList = (emailsToSearch || []).filter(hasAnyId);
      const nSel = selectedList.length;

      // count labels across selected
      const labelCounts = new Map();
      for (const m of selectedList) {
        for (const l of m.labels ?? []) {
          labelCounts.set(l, (labelCounts.get(l) || 0) + 1);
        }
      }

      // Helper to find UUID for a label by name
      const findLabelUuidByName = (name) => {
        if (!name || !labels) return null;
        // labels is keyed by UUID, so we need to search values
        const normalizedName = String(name).toLowerCase();
        for (const [uuid, labelMeta] of Object.entries(labels)) {
          if (String(labelMeta.name || "").toLowerCase() === normalizedName) {
            return uuid;
          }
        }
        return null;
      };

      // intersection (labels on ALL selected)
      // Convert label objects to UUIDs for consistent comparison with availableLabels keys
      const currentLabels =
        nSel === 0
          ? new Set()
          : new Set(
              [...labelCounts.entries()]
                .filter(([_, c]) => c === nSel)
                .map(([l]) => {
                  // l could be a label object { id, name, color } or a string
                  if (typeof l === "object" && l !== null) {
                    // First try to use the label's ID if it exists
                    if (l.id) return l.id;
                    // Otherwise, look up the UUID by name
                    const uuidFromName = findLabelUuidByName(l.name);
                    if (uuidFromName) return uuidFromName;
                    // Fallback to name for backwards compatibility
                    return l.name;
                  }
                  // If it's a string, try to look up UUID
                  const uuidFromString = findLabelUuidByName(l);
                  if (uuidFromString) return uuidFromString;
                  return l;
                })
                .filter(Boolean)
            );
      /**
       * nSel: number of selected emails
       * labelCounts: count of each label on the selected emails
       * currentLabels: labels on ALL selected emails (as UUIDs for comparison)
       */
      return { currentLabels, labelCounts, nSel };
    },
    [emails, reduxMailState, labels]
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
