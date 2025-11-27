import { JSONPath } from 'jsonpath-plus';

export const deepParseJson = (jsonString) => {
  try {
    return JSON.parse(jsonString, (key, value) => {
      // If the value is a string, attempt to parse it as JSON
      if (typeof value === 'string') {
        try {
          // Recursively call deepParseJson on the stringified value
          return deepParseJson(value);
        } catch (e) {
          // If parsing fails, return the original string
          return value;
        }
      }
      // Return other types of values as they are
      return value;
    });
  } catch (e) {
    // If the initial parse fails, return the original string
    return jsonString;
  }
};

export const resolvePath = (data, path) => {
  if (!path || !data) return undefined;
  try {
    const convertedPath = convertPathToBracketNotation(path);
    const result = JSONPath({ path: `$.${convertedPath}`, json: data });
    return result[0];
  } catch (e) {
    console.error('Invalid path:', e);
    return undefined;
  }
};

const convertPathToBracketNotation = (path) => {
  if (!path) return '';

  const parts = path.split('.');
  let result = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part.includes('-')) {
      if (i === 0) {
        result += `['${part}']`;
      } else {
        result += `['${part}']`;
      }
    } else {
      if (i === 0) {
        result += `.${part}`;
      } else {
        result += `.${part}`;
      }
    }
  }

  return result;
};


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
