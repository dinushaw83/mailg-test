export const KEYS_TO_CLEAN = ["plain_body", "body", "description"];

export const stringifyReplacer = (key, value) => {
  const ignoredFields = [
    "createdAt",
    "updatedAt",
    "lastUpdated",
    "created_at",
    "updated_at",
    "last_updated",
    "last_login_at",
    "id",
    "snapshots",
    "versions",
    "suspendedAt",
    "time",
    "html_body",
    "timezone",
    "timezoneOffset",
    "timestamp",
    "editedAt",
    "solvedAt",
    "lastSearchInfo",
    "searchResults",
  ];

  if (ignoredFields.includes(key) || /id$/i.test(key)) {
    return undefined;
  }
  return value;
};

export const processJsonWithHtmlTags = (json, keysToClean = KEYS_TO_CLEAN) => {
  const processed = { ...json };
  for (const key of keysToClean) {
    if (processed[key]) {
      processed[key] = processed[key].replace(/<[^>]*>/g, "").trim();
    }
  }
  return processed;
};

export const sortObjectKeys = (obj) => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    const hasPrimitiveItems = obj.some((item) => item !== null && typeof item !== "object");
    if (hasPrimitiveItems) {
      return [...obj].sort();
    } else {
      // For object arrays, sort the objects by a consistent key
      // and then sort the keys within each object
      const sortedArray = obj.map(sortObjectKeys);

      // Try to sort by common keys that might exist in cart items
      if (sortedArray.length > 0 && typeof sortedArray[0] === "object" && sortedArray[0] !== null) {
        const firstItem = sortedArray[0];
        // Check for common sorting keys in cart items
        if ("id" in firstItem) {
          return sortedArray.sort((a, b) => {
            if (typeof a.id === "number" && typeof b.id === "number") {
              return a.id - b.id;
            }
            return String(a.id).localeCompare(String(b.id));
          });
        } else if ("itemName" in firstItem) {
          return sortedArray.sort((a, b) => String(a.itemName || "").localeCompare(String(b.itemName || "")));
        } else if ("name" in firstItem) {
          return sortedArray.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
        }
      }

      return sortedArray;
    }
  }

  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = sortObjectKeys(obj[key]);
      return result;
    }, {});
};
