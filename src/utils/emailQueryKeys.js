/**
 * Utility function for building React Query keys for email-related queries.
 * Backend now handles all filtering logic based on folder and category parameters.
 *
 * Query key structure examples:
 * - ["emails", "folder", "inbox", "category", "primary", page, pageSize] for inbox with category
 * - ["emails", "folder", "starred", page, pageSize] for starred folder
 * - ["emails", "folder", "sent", page, pageSize] for sent folder
 * - ["emails", "folder", "inbox", page, pageSize] for inbox (no category)
 *
 * @param {Object} options - Options for fetching emails
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.pageSize - Page size (default: 20)
 * @param {string|null} options.folder - Filter by folder (inbox, starred, important, snoozed, sent, trash, spam, drafts, scheduled, all mail)
 * @param {string|null} options.category - Filter by category (primary, promotions, social, updates)
 * @returns {Array} React Query key array
 */
export function buildEmailQueryKey(options = {}) {
  const { page = 1, pageSize = 20, folder = null, category = null } = options;

  // Build query key based on folder and category
  const keyParts = ["emails"];

  if (folder) {
    keyParts.push("folder", folder);
  }

  if (category) {
    keyParts.push("category", category);
  }

  // Add pagination parameters
  keyParts.push(page, pageSize);

  return keyParts;
}
