import { JSONPath } from 'jsonpath-plus';

export const deepParseJson = (jsonString: string): any => {
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

export const resolvePath = (data: any, path: string): any => {
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

const convertPathToBracketNotation = (path: string): string => {
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
