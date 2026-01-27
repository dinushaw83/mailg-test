/* eslint-disable */

/**
 * Dynamic timestamp fields that should be ignored during verification.
 * These fields change automatically based on execution time and cannot be
 * verified against fixed expected values.
 */
export const IGNORED_DYNAMIC_FIELDS = [
  "updated_at",
  "created_at",
  "deleted_at",
  "last_login_at",
];

/**
 * Fields that may contain HTML content which should be stripped for comparison.
 */
export const HTML_CONTENT_FIELDS = ["description", "body", "message"];

/**
 * Table name mapping: expected JSON table names → actual API table names.
 * This handles schema differences between expected test data and actual API responses.
 */
export const TABLE_NAME_MAP = {
  ticket_comments: "conversations",
};

/**
 * Field name mapping: expected JSON field names → actual API field names.
 * Used when comparing rows to handle schema differences.
 */
export const FIELD_NAME_MAP = {
  comment_type: "type",
};

/**
 * Fields that have plain text alternatives in the actual response.
 * When comparing these fields, prefer the plain_* version if available.
 */
export const PLAIN_TEXT_FIELD_MAP = {
  body: "plain_body",
};

// Helper function inlined to avoid circular dependency
const stripHtmlTagsInline = (html) => {
  if (!html || typeof html !== "string") return html || "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .trim();
};

export const ASSERTION_OPERATORS = {
  NUMERIC_MATCH: (actual, expected) => Number(actual) === Number(expected),
  STRING_EQUALS: (actual, expected) => {
    if (actual == null || expected == null) return actual == expected;
    return String(actual).toLowerCase() === String(expected).toLowerCase();
  },
  STRING_CONTAINS: (actual, expected) => {
    if (actual == null) return false;
    const actualStr = stripHtmlTagsInline(String(actual)).toLowerCase();
    const expectedStr = stripHtmlTagsInline(String(expected)).toLowerCase();
    return actualStr.includes(expectedStr);
  },
  ARRAY_CONTAINS: (actual, expected) => {
    if (actual == null || expected == null) return false;
    return actual.some((item) => expected.includes(item));
  },
  ARRAY_EQUALS: (actual, expected, arrayKey) => {
    if (actual == null || expected == null) return false;
    return actual.some((item) => {
      if (arrayKey) {
        return JSON.stringify(item[arrayKey]) === JSON.stringify(expected);
      }
      return JSON.stringify(item) === JSON.stringify(expected);
    });
  },
  EXISTS: (actual, expected) =>
    expected === true ? actual != null : actual == null,
  BOOL: (actual, expected) => {
    const norm = (v) =>
      typeof v === "boolean"
        ? v
        : typeof v === "string"
          ? v.toLowerCase() === "true" || v === "1"
          : Boolean(v);
    return norm(actual) === norm(expected);
  },
};
