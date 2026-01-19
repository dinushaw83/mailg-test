/**
 * Utility function for building React Query keys for email-related queries.
 *
 * Query key structure examples:
 * - ["emails", "category", "primary", page, pageSize] for categories
 * - ["emails", "is_starred", true, page, pageSize] for starred
 * - ["emails", "is_important", true, page, pageSize] for important
 * - ["emails", "is_snoozed", true, page, pageSize] for snoozed
 * - ["emails", "folder", "sent", page, pageSize] for folders (sent, trash, spam, drafts)
 * - ["emails", "all", page, pageSize] for all mail (folder=inbox&include_archived=true)
 * - ["emails", "inbox", page, pageSize] for inbox (no filter)
 *
 * @param {Object} options - Options for fetching emails
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.pageSize - Page size (default: 20)
 * @param {string|null} options.category - Email category filter (primary, promotions, social, updates)
 * @param {boolean|null} options.is_starred - Filter by starred status
 * @param {boolean|null} options.is_important - Filter by important status
 * @param {boolean|null} options.is_snoozed - Filter by snoozed status
 * @param {string|null} options.folder - Filter by folder (sent, trash, spam, drafts, inbox)
 * @param {boolean|null} options.include_archived - Include archived emails (for all mail)
 * @returns {Array} React Query key array
 */
export function buildEmailQueryKey(options = {}) {
  const {
    page = 1,
    pageSize = 20,
    category = null,
    is_starred = null,
    is_important = null,
    is_snoozed = null,
    folder = null,
    include_archived = null,
  } = options;

  // Determine filter type based on priority:
  // is_starred > is_important > is_snoozed > include_archived > folder > category > inbox
  const filterType =
    is_starred === true
      ? "is_starred"
      : is_important === true
        ? "is_important"
        : is_snoozed === true
          ? "is_snoozed"
          : include_archived === true
            ? "all"
            : folder
              ? "folder"
              : category
                ? "category"
                : "inbox";

  switch (filterType) {
    case "is_starred":
      return ["emails", "is_starred", true, page, pageSize];
    case "is_important":
      return ["emails", "is_important", true, page, pageSize];
    case "is_snoozed":
      return ["emails", "is_snoozed", true, page, pageSize];
    case "all":
      return ["emails", "all", page, pageSize];
    case "folder":
      return ["emails", "folder", folder, page, pageSize];
    case "category":
      return ["emails", "category", category, page, pageSize];
    case "inbox":
      return ["emails", "inbox", page, pageSize];
    default:
      return ["emails", "inbox", page, pageSize];
  }
}
