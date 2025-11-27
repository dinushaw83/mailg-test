/**
 * Deep parse JSON strings within an object
 * Recursively parses JSON strings found in object values
 */
function deepParseJson(obj) {
  if (typeof obj === 'string') {
    try {
      return deepParseJson(JSON.parse(obj));
    } catch (e) {
      return obj;
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepParseJson(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const parsed = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        parsed[key] = deepParseJson(obj[key]);
      }
    }
    return parsed;
  }

  return obj;
}

/**
 * Resolve a path in a nested object
 * Supports dot notation and array indexing
 * Examples:
 *   resolvePath(data, "user.name")
 *   resolvePath(data, "items[0].title")
 *   resolvePath(data, "jiraState.tickets[24].assignee.name")
 */
function resolvePath(data, path) {
  if (!path) return null;

  // Handle JSONPath expressions using jsonpath-plus
  if (path.includes('[?(@.') || path.includes('[?(')) {
    try {
      const { JSONPath } = require('jsonpath-plus');
      const result = JSONPath({ path: `$.${path}`, json: data });
      return result && result.length > 0 ? result[0] : null;
    } catch (e) {
      console.error('JSONPath error:', e);
      return null;
    }
  }

  const keys = path.split('.');
  let current = data;

  for (const key of keys) {
    if (current === null || current === undefined) return null;

    // Handle array indices like "items[0]"
    if (key.includes('[') && key.includes(']')) {
      const arrayKey = key.substring(0, key.indexOf('['));
      const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));

      if (current[arrayKey] && Array.isArray(current[arrayKey])) {
        current = current[arrayKey][index];
      } else {
        return null;
      }
    } else {
      current = current[key];

      // If the current value is a string that looks like JSON, try to parse it
      if (typeof current === 'string' && isJsonString(current)) {
        try {
          current = JSON.parse(current);
        } catch (e) {
          // If parsing fails, keep the string value
        }
      }
    }
  }

  return current;
}

/**
 * Check if a string is valid JSON
 */
function isJsonString(str) {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  deepParseJson,
  resolvePath,
  isJsonString
};
