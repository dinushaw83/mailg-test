/**
 * Label synchronization utilities
 * Keep email labels in sync when labels are created/renamed/deleted
 */

/**
 * Remap email label references when labels are renamed
 * @param {Array} emails - Array of email objects
 * @param {Object} oldKeyMap - Old mapping of { [compositeKey]: id }
 * @param {Object} newKeyMap - New mapping of { [compositeKey]: id }
 * @returns {Array} Updated emails array
 */
export function remapEmailLabels(emails, oldKeyMap, newKeyMap) {
  if (!Array.isArray(emails) || emails.length === 0) {
    return emails;
  }

  // Build reverse mapping: oldId -> newId
  const oldIdToNewIdMap = {};
  Object.entries(oldKeyMap).forEach(([key, oldId]) => {
    const newId = newKeyMap[key];
    if (newId && newId !== oldId) {
      oldIdToNewIdMap[oldId] = newId;
    }
  });

  // If no changes, return original array
  if (Object.keys(oldIdToNewIdMap).length === 0) {
    return emails;
  }

  // Update email labels
  return emails.map((email) => {
    if (!email.labels || !Array.isArray(email.labels)) {
      return email;
    }

    const updatedLabels = email.labels.map((label) => {
      // If label is a UUID and needs remapping
      if (typeof label === "string" && oldIdToNewIdMap[label]) {
        return oldIdToNewIdMap[label];
      }
      
      // If label is an object with id
      if (label && typeof label === "object" && label.id && oldIdToNewIdMap[label.id]) {
        return {
          ...label,
          id: oldIdToNewIdMap[label.id],
        };
      }
      
      return label;
    });

    return {
      ...email,
      labels: updatedLabels,
    };
  });
}

/**
 * Remove deleted label references from emails
 * @param {Array} emails - Array of email objects
 * @param {Array} deletedLabelIds - Array of deleted label UUIDs
 * @returns {Array} Updated emails array with deleted labels removed
 */
export function syncLabelReferences(emails, deletedLabelIds) {
  if (!Array.isArray(emails) || emails.length === 0) {
    return emails;
  }

  if (!Array.isArray(deletedLabelIds) || deletedLabelIds.length === 0) {
    return emails;
  }

  const deletedSet = new Set(deletedLabelIds);

  return emails.map((email) => {
    if (!email.labels || !Array.isArray(email.labels)) {
      return email;
    }

    // Filter out deleted label references
    const filteredLabels = email.labels.filter((label) => {
      // If label is a UUID string
      if (typeof label === "string") {
        return !deletedSet.has(label);
      }
      
      // If label is an object with id
      if (label && typeof label === "object" && label.id) {
        return !deletedSet.has(label.id);
      }
      
      // If label is a composite key (old format), keep it for now
      return true;
    });

    return {
      ...email,
      labels: filteredLabels,
    };
  });
}

/**
 * Transform email labels from composite keys to UUIDs
 * @param {Array} emails - Array of email objects with labels as composite keys
 * @param {Object} keyToIdMap - Map of { [compositeKey]: id }
 * @returns {Array} Updated emails array with labels as UUIDs
 */
export function transformEmailLabelsToIds(emails, keyToIdMap) {
  if (!Array.isArray(emails) || emails.length === 0) {
    return emails;
  }

  if (!keyToIdMap || Object.keys(keyToIdMap).length === 0) {
    return emails;
  }

  return emails.map((email) => {
    if (!email.labels || !Array.isArray(email.labels)) {
      return email;
    }

    const transformedLabels = email.labels
      .map((label) => {
        // If label is a composite key string, convert to UUID
        if (typeof label === "string" && keyToIdMap[label]) {
          return keyToIdMap[label];
        }
        
        // If label is already a UUID or object with id, keep it
        return label;
      })
      .filter(Boolean); // Remove any undefined/null values

    return {
      ...email,
      labels: transformedLabels,
    };
  });
}

/**
 * Transform email labels from UUIDs to composite keys (for display/filtering)
 * @param {Array} emails - Array of email objects with labels as UUIDs
 * @param {Object} idToKeyMap - Map of { [id]: compositeKey }
 * @returns {Array} Updated emails array with labels as composite keys
 */
export function transformEmailLabelsToKeys(emails, idToKeyMap) {
  if (!Array.isArray(emails) || emails.length === 0) {
    return emails;
  }

  if (!idToKeyMap || Object.keys(idToKeyMap).length === 0) {
    return emails;
  }

  return emails.map((email) => {
    if (!email.labels || !Array.isArray(email.labels)) {
      return email;
    }

    const transformedLabels = email.labels
      .map((label) => {
        // If label is a UUID string, convert to composite key
        if (typeof label === "string" && idToKeyMap[label]) {
          return idToKeyMap[label];
        }
        
        // If label is an object with id, convert id to composite key
        if (label && typeof label === "object" && label.id && idToKeyMap[label.id]) {
          return {
            ...label,
            // Keep original id but add composite key for reference
            compositeKey: idToKeyMap[label.id],
          };
        }
        
        // If label is already a composite key or unknown format, keep it
        return label;
      })
      .filter(Boolean);

    return {
      ...email,
      labels: transformedLabels,
    };
  });
}
