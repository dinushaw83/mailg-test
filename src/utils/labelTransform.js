/**
 * Label transformation utilities
 * Converts between backend format (UUID-based) and frontend format (composite keys)
 */

/**
 * Build a mapping from label ID to composite key by traversing parent_id relationships
 * @param {Array} labelsArray - Array of label objects from backend
 * @returns {Object} Map of { [id]: compositeKey }
 */
export function buildIdToKeyMapping(labelsArray) {
  if (!Array.isArray(labelsArray) || labelsArray.length === 0) {
    return {};
  }

  // Build a map of id -> label for quick lookup
  const labelMap = new Map();
  labelsArray.forEach((label) => {
    if (label.id) {
      labelMap.set(label.id, label);
    }
  });

  // Cache for computed composite keys
  const keyCache = new Map();

  /**
   * Recursively build composite key for a label
   * @param {string} id - Label UUID
   * @returns {string} Composite key (e.g., "Work::Clients")
   */
  const buildCompositeKey = (id) => {
    if (keyCache.has(id)) {
      return keyCache.get(id);
    }

    const label = labelMap.get(id);
    if (!label) {
      return null;
    }

    // If no parent, composite key is just the name
    if (!label.parent_id) {
      const key = label.name;
      keyCache.set(id, key);
      return key;
    }

    // Recursively get parent's composite key
    const parentKey = buildCompositeKey(label.parent_id);
    if (!parentKey) {
      // Parent not found, use just the name
      const key = label.name;
      keyCache.set(id, key);
      return key;
    }

    // Build composite key: parentKey::name
    const key = `${parentKey}::${label.name}`;
    keyCache.set(id, key);
    return key;
  };

  // Build mapping for all labels
  const idToKeyMap = {};
  labelsArray.forEach((label) => {
    if (label.id) {
      idToKeyMap[label.id] = buildCompositeKey(label.id);
    }
  });

  return idToKeyMap;
}

/**
 * Build a reverse mapping from composite key to label ID
 * @param {Object} idToKeyMap - Map of { [id]: compositeKey }
 * @returns {Object} Map of { [compositeKey]: id }
 */
export function buildKeyToIdMapping(idToKeyMap) {
  const keyToIdMap = {};
  Object.entries(idToKeyMap).forEach(([id, key]) => {
    if (key) {
      keyToIdMap[key] = id;
    }
  });
  return keyToIdMap;
}

/**
 * Convert backend label format to frontend format
 * @param {Object} beLabel - Backend label object: { id, name, color, parent_id, email_count }
 * @param {Object} idToKeyMap - Map of { [id]: compositeKey }
 * @returns {Object} Frontend label object: { id, name, color (hex), parent_id, parentKey (composite), system, email_count }
 */
export function beToFeLabel(beLabel, idToKeyMap) {
  if (!beLabel || !beLabel.id) {
    return null;
  }

  const compositeKey = idToKeyMap[beLabel.id] || beLabel.name;
  const parentKey = beLabel.parent_id ? idToKeyMap[beLabel.parent_id] || null : null;

  return {
    id: beLabel.id,
    name: beLabel.name,
    color: beLabel.color || null, // Store hex color as-is
    parent_id: beLabel.parent_id || null,
    parentKey: parentKey, // Composite key for tree building
    system: beLabel.is_system || false, // Preserve system label flag from backend
    email_count: beLabel.email_count || 0,
    ...beLabel,
  };
}

/**
 * Convert frontend label format to backend format for mutations
 * @param {Object} feLabel - Frontend label object
 * @param {Object} keyToIdMap - Map of { [compositeKey]: id } (optional, for parent lookup)
 * @returns {Object} Backend label object: { name, color, parent_id }
 */
export function feToBeLabel(feLabel, keyToIdMap = {}) {
  // If feLabel has parentKey (composite key), convert it to parent_id (UUID)
  let parent_id = feLabel.parent_id || null;

  if (feLabel.parentKey && keyToIdMap[feLabel.parentKey]) {
    parent_id = keyToIdMap[feLabel.parentKey];
  }

  return {
    name: feLabel.name,
    color: feLabel.color || null,
    parent_id: parent_id,
  };
}

/**
 * Transform array of backend labels to frontend format
 * @param {Array} labelsArray - Array of backend label objects
 * @returns {Object} Object with transformed labels and mappings
 *   - labels: { [id]: feLabel }
 *   - idToKeyMap: { [id]: compositeKey }
 *   - keyToIdMap: { [compositeKey]: id }
 */
export function transformLabelsArray(labelsArray) {
  if (!Array.isArray(labelsArray) || labelsArray.length === 0) {
    return {
      labels: {},
      idToKeyMap: {},
      keyToIdMap: {},
    };
  }

  // Build ID to composite key mapping
  const idToKeyMap = buildIdToKeyMapping(labelsArray);

  // Build reverse mapping
  const keyToIdMap = buildKeyToIdMapping(idToKeyMap);

  // Transform all labels
  const labels = {};
  labelsArray.forEach((beLabel) => {
    const feLabel = beToFeLabel(beLabel, idToKeyMap);
    if (feLabel) {
      labels[feLabel.id] = feLabel;
    }
  });

  return {
    labels,
    idToKeyMap,
    keyToIdMap,
  };
}

/**
 * Get composite key from label ID
 * @param {string} id - Label UUID
 * @param {Object} idToKeyMap - Map of { [id]: compositeKey }
 * @returns {string|null} Composite key or null if not found
 */
export function getCompositeKey(id, idToKeyMap) {
  return idToKeyMap[id] || null;
}

/**
 * Get label ID from composite key
 * @param {string} compositeKey - Composite key (e.g., "Work::Clients")
 * @param {Object} keyToIdMap - Map of { [compositeKey]: id }
 * @returns {string|null} Label UUID or null if not found
 */
export function getLabelId(compositeKey, keyToIdMap) {
  return keyToIdMap[compositeKey] || null;
}
