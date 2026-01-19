import { buildSearchBarFromUrl } from "./helperFunctions";

/**
 * Helper function to extract and merge comma-separated values from searchQuery and URL params
 * Removes duplicates and handles parentheses in searchQuery
 * @param {string} searchQuery - The search query string
 * @param {string} operator - The operator to search for (e.g., "from:", "to:")
 * @param {string} urlValue - The value from URL search params
 * @returns {string} Merged comma-separated values without duplicates
 */
function extractAndMergeCommaSeparated(searchQuery, operator, urlValue) {
  const values = new Set();

  // Add values from URL params
  if (urlValue && urlValue.trim()) {
    urlValue
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .forEach((v) => values.add(v));
  }

  // Extract from searchQuery
  if (searchQuery.includes(operator)) {
    const afterOperator = searchQuery.split(operator)[1].trim();
    // Match parentheses group or extract until next operator/space boundary
    // Pattern: (value) or value (stopping at space before next operator like " to:", " cc:", etc.)
    const parenMatch = afterOperator.match(/^\(([^)]+)\)/);
    if (parenMatch) {
      // Extract from parentheses
      parenMatch[1]
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
        .forEach((v) => values.add(v));
    } else {
      // Extract single value until space or next operator
      const singleMatch = afterOperator.match(/^([^\s]+)/);
      if (singleMatch) {
        singleMatch[1]
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean)
          .forEach((v) => values.add(v));
      }
    }
  }

  return Array.from(values).join(",");
}

/**
 * Helper function to extract and merge single string values from searchQuery and URL params
 * Prefers searchQuery value if both exist and are different, removes duplicates if same
 * @param {string} searchQuery - The search query string
 * @param {string} operator - The operator to search for (e.g., "subject:", "filename:")
 * @param {string} urlValue - The value from URL search params
 * @returns {string|undefined} The merged value or undefined if neither exists
 */
function extractAndMergeString(searchQuery, operator, urlValue) {
  let urlResult = urlValue && urlValue.trim() ? urlValue.trim() : "";
  let searchResult = "";

  if (searchQuery.includes(operator)) {
    const afterOperator = searchQuery.split(operator)[1].trim();
    // Match parentheses group or extract until next operator/space boundary
    const parenMatch = afterOperator.match(/^\(([^)]+)\)/);
    if (parenMatch) {
      // Extract from parentheses
      searchResult = parenMatch[1].trim();
    } else {
      // Extract single value until space or next operator
      const singleMatch = afterOperator.match(/^([^\s]+)/);
      if (singleMatch) {
        searchResult = singleMatch[1].trim();
      }
    }
  }

  // Prefer searchQuery value if it exists (more explicit), otherwise use URL value
  // If both exist and are the same, use one (remove duplicate)
  if (searchResult) {
    return searchResult;
  }

  return urlResult || undefined;
}

/**
 * Convert URL location and search parameters to backend API search parameters
 * @param {Object} location - React Router location object
 * @param {Object} options - Additional options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.pageSize - Page size (default: 20)
 * @returns {Object} Backend API search parameters
 */
export function buildSearchParams(location, options = {}) {
  const { page = 1, pageSize = 20 } = options;
  const searchParams = new URLSearchParams(location.search);
  const isAdvancedSearch = location.pathname.startsWith("/search/advanced");
  let searchQuery = "";
  searchQuery = buildSearchBarFromUrl(location);

  // Build API parameters
  const apiParams = {
    page,
    page_size: pageSize,
    sort_by: "date",
    sort_order: "desc",
  };

  // Map from filter
  const from = searchParams.get("from");
  const mergedFrom = extractAndMergeCommaSeparated(searchQuery, "from:", from);
  if (mergedFrom) {
    apiParams.from = mergedFrom;
  }

  apiParams.q = decodeURIComponent(searchQuery);
  // Map to filter
  const to = searchParams.get("to");
  const mergedTo = extractAndMergeCommaSeparated(searchQuery, "to:", to);
  if (mergedTo) {
    apiParams.to = mergedTo;
  }

  // For advanced search, also check searchQuery for subject
  const subject = searchParams.get("subject");
  const mergedSubject = extractAndMergeString(searchQuery, "subject:", subject);
  if (mergedSubject) {
    apiParams.subject = mergedSubject;
  }

  // Map attachment filter
  const attachOrDrive = searchParams.get("attach_or_drive");
  const attachment = searchParams.get("attachment");
  if (attachOrDrive === "true" || attachment === "true") {
    apiParams.has_attachment = true;
  }
  // Check searchQuery for has:attachment
  if (searchQuery.includes("has:attachment")) {
    apiParams.has_attachment = true;
  }

  // Map unread filter
  const isUnread = searchParams.get("is_unread");
  if (isUnread === "true") {
    apiParams.is_read = false;
  }
  // Check searchQuery for is:unread or is:read
  if (searchQuery.includes("is:unread")) {
    apiParams.is_read = false;
  } else if (searchQuery.includes("is:read")) {
    apiParams.is_read = true;
  }

  // Map hasnot filter (exclude emails containing this text)
  const hasnot = searchParams.get("hasnot");
  const mergedHasnot = extractAndMergeString(searchQuery, "hasnot:", hasnot);
  if (mergedHasnot) {
    apiParams.hasnot = mergedHasnot;
  }

  // Map size filters
  const size = searchParams.get("size");
  const sizeOperator = searchParams.get("sizeOperator");
  const sizeUnit = searchParams.get("sizeUnit");
  if (size && size.trim() && sizeOperator) {
    const sizeValue = parseFloat(size);
    if (!isNaN(sizeValue) && sizeValue > 0) {
      // Convert to bytes based on unit
      let sizeInBytes = sizeValue;
      if (sizeUnit === "MB") {
        sizeInBytes = sizeValue * 1024 * 1024;
      } else if (sizeUnit === "KB") {
        sizeInBytes = sizeValue * 1024;
      }
      // else Bytes - no conversion needed

      // Map based on operator (handle both "less than" and "less_than" from URL)
      const normalizedOperator = sizeOperator.replace(/_/g, " ");
      if (normalizedOperator === "less than") {
        apiParams.smaller = Math.floor(sizeInBytes);
      } else if (normalizedOperator === "greater than") {
        apiParams.larger = Math.floor(sizeInBytes);
      }
    }
  }

  // Check searchQuery for size filters (larger: and smaller:)
  if (searchQuery.includes("larger:")) {
    const largerMatch = searchQuery.match(/larger:(\d+[KMG]?)/i);
    if (largerMatch) {
      const sizeStr = largerMatch[1];
      // If the sizeStr starts with a letter (e.g., "k512"), remove the leading letter before parse
      let numericSizeStr = sizeStr.replace(/[a-zA-Z]/g, "");
      let sizeValue = parseFloat(numericSizeStr);
      const unit = sizeStr.replace(/[\d.]/g, "").toUpperCase();
      if (unit === "M" || unit === "MB") {
        sizeValue = sizeValue * 1024 * 1024;
      } else if (unit === "K" || unit === "KB") {
        sizeValue = sizeValue * 1024;
      }
      if (!isNaN(sizeValue) && sizeValue > 0) {
        apiParams.larger = Math.floor(sizeValue);
      }
    }
  }

  if (searchQuery.includes("smaller:")) {
    const smallerMatch = searchQuery.match(/smaller:(\d+[KMG]?)/i);
    if (smallerMatch) {
      const sizeStr = smallerMatch[1];
      let numericSizeStr = sizeStr.replace(/[a-zA-Z]/g, "");
      let sizeValue = parseFloat(numericSizeStr);
      const unit = sizeStr.replace(/[\d.]/g, "").toUpperCase();
      if (unit === "M" || unit === "MB") {
        sizeValue = sizeValue * 1024 * 1024;
      } else if (unit === "K" || unit === "KB") {
        sizeValue = sizeValue * 1024;
      }
      if (!isNaN(sizeValue) && sizeValue > 0) {
        apiParams.smaller = Math.floor(sizeValue);
      }
    }
  }

  // Map CC filter
  const cc = searchParams.get("cc");
  const mergedCc = extractAndMergeCommaSeparated(searchQuery, "cc:", cc);
  if (mergedCc) {
    apiParams.cc = mergedCc;
  }

  // Map BCC filter
  const bcc = searchParams.get("bcc");
  const mergedBcc = extractAndMergeCommaSeparated(searchQuery, "bcc:", bcc);
  if (mergedBcc) {
    apiParams.bcc = mergedBcc;
  }

  // Map filename filter
  const filename = searchParams.get("filename");
  const mergedFilename = extractAndMergeString(searchQuery, "filename:", filename);
  if (mergedFilename) {
    apiParams.filename = mergedFilename;
  }

  // Map category filter
  const category = searchParams.get("category");
  const mergedCategory = extractAndMergeString(searchQuery, "category:", category);
  if (mergedCategory) {
    apiParams.category = mergedCategory;
  }

  // Map deliveredto filter
  const deliveredto = searchParams.get("deliveredto");
  const mergedDeliveredto = extractAndMergeString(searchQuery, "deliveredto:", deliveredto);
  if (mergedDeliveredto) {
    apiParams.deliveredto = mergedDeliveredto;
  }

  // Map is_snoozed filter
  const isSnoozed = searchParams.get("is_snoozed");
  if (isSnoozed === "true") {
    apiParams.is_snoozed = true;
  } else if (isSnoozed === "false") {
    apiParams.is_snoozed = false;
  }
  // Check searchQuery for in:snoozed
  if (searchQuery.includes("in:snoozed")) {
    apiParams.is_snoozed = true;
  }

  if (searchQuery.includes("in:starred")) {
    apiParams.is_starred = true;
  }

  // Map has_userlabels filter
  const hasUserLabels = searchParams.get("has_userlabels");
  if (hasUserLabels === "true") {
    apiParams.has_userlabels = true;
  } else if (hasUserLabels === "false") {
    apiParams.has_userlabels = false;
  }
  // Check searchQuery for has:userlabels or has:nouserlabels
  if (searchQuery.includes("has:userlabels")) {
    apiParams.has_userlabels = true;
  } else if (searchQuery.includes("has:nouserlabels")) {
    apiParams.has_userlabels = false;
  }

  // Map in_anywhere filter
  const inAnywhere = searchParams.get("in_anywhere");
  if (inAnywhere === "true") {
    apiParams.in_anywhere = true;
  }
  // Check searchQuery for in:anywhere
  if (searchQuery.includes("in:anywhere")) {
    apiParams.in_anywhere = true;
  }

  // Map in_archive filter
  const inArchive = searchParams.get("in_archive");
  if (inArchive === "true") {
    apiParams.in_archive = true;
  } else if (inArchive === "false") {
    apiParams.in_archive = false;
  }
  // Check searchQuery for in:archive
  if (searchQuery.includes("in:archive")) {
    apiParams.in_archive = true;
  }

  // Map date range filters
  const beforeDate = searchParams.get("before");
  const afterDate = searchParams.get("after");

  if (beforeDate) {
    // Convert to YYYY-MM-DD format
    const date = new Date(beforeDate);
    if (!isNaN(date.getTime())) {
      apiParams.date_to = date.toISOString().split("T")[0];
    }
  }

  if (afterDate) {
    // Convert to YYYY-MM-DD format
    const date = new Date(afterDate);
    if (!isNaN(date.getTime())) {
      apiParams.date_from = date.toISOString().split("T")[0];
    }
  }
  // Fix: Parse both "after:" and "before:" with flexible date formats (YYYY-MM-DD, YYYY/MM/DD, etc.)
  // Allow non-padded months/days (e.g., 2024-6-1 or 2024/6/1)

  // Helper to normalize date to YYYY-MM-DD
  function normalizeDateStr(str) {
    // Match groups for year, month, day, with or without leading zeros
    const match = str.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (!match) return null;
    const year = match[1];
    // padStart ensures 01, 02, etc.
    const month = match[2].padStart(2, "0");
    const day = match[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Find all after: and before: in searchQuery, with various separators and non-padded numbers
  let afterMatches = [];
  let beforeMatches = [];
  // Regex finds all after:date or before:date occurrences
  const afterRegex = /after:(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/g;
  const beforeRegex = /before:(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/g;

  let match;
  while ((match = afterRegex.exec(searchQuery))) {
    const norm = normalizeDateStr(match[1]);
    if (norm) {
      afterMatches.push(norm);
    }
  }
  while ((match = beforeRegex.exec(searchQuery))) {
    const norm = normalizeDateStr(match[1]);
    if (norm) {
      beforeMatches.push(norm);
    }
  }

  // Set the latest "after:" date as date_from
  if (afterMatches.length > 0) {
    // compare as strings, lexically YYYY-MM-DD
    const latestAfter = afterMatches.sort().pop();
    if (!apiParams.date_from || latestAfter > apiParams.date_from) {
      apiParams.date_from = latestAfter;
    }
  }
  // Set the earliest "before:" date as date_to
  if (beforeMatches.length > 0) {
    const earliestBefore = beforeMatches.sort()[0];
    if (!apiParams.date_to || earliestBefore < apiParams.date_to) {
      apiParams.date_to = earliestBefore;
    }
  }

  // Map subset filter (folder or label)
  const subset = searchParams.get("subset");
  if (subset && subset.trim() && subset !== "All Mail") {
    // Check if it's a folder name
    const validFolders = ["inbox", "sent", "drafts", "trash", "spam"];
    if (validFolders.includes(subset.toLowerCase())) {
      apiParams.folder = subset.toLowerCase();
    } else {
      // Assume it's a label name
      apiParams.label_name = subset.trim();
    }
  }

  // Check searchQuery for folder (in:folder) and label (label:name)
  if (searchQuery.includes("in:")) {
    const inMatch = searchQuery.match(/in:(\w+)/);
    if (inMatch) {
      const folderName = inMatch[1].toLowerCase();
      const validFolders = ["inbox", "sent", "drafts", "trash", "spam"];
      // Only set if it's a valid folder and not already set, or if it's a different folder
      if (validFolders.includes(folderName) && (!apiParams.folder || apiParams.folder !== folderName)) {
        apiParams.folder = folderName;
      }
    }
  }

  if (searchQuery.includes("label:")) {
    const labelMatch = searchQuery.match(/label:(\S+)/);
    if (labelMatch) {
      const labelName = labelMatch[1].trim();
      // Only set if not already set or if it's a different label
      if (!apiParams.label_name || apiParams.label_name !== labelName) {
        apiParams.label_name = labelName;
      }
    }
  }

  // Note: The following filters are now implemented and mapped to backend API:
  // - hasnot (mapped to apiParams.hasnot)
  // - size/sizeOperator/sizeUnit (mapped to apiParams.smaller or apiParams.larger)
  // - Multiple from/to emails (backend supports comma-separated)
  //
  // Note: excludeChats is not supported by backend API

  // Clean up q parameter by removing all parsed fields
  if (apiParams.q) {
    let cleanedQuery = apiParams.q;

    // Remove from: patterns (handles parentheses and comma-separated values)
    cleanedQuery = cleanedQuery.replace(/from:\([^)]+\)/g, "");
    cleanedQuery = cleanedQuery.replace(/from:[^\s]+/g, "");

    // Remove to: patterns
    cleanedQuery = cleanedQuery.replace(/to:\([^)]+\)/g, "");
    cleanedQuery = cleanedQuery.replace(/to:[^\s]+/g, "");

    // Remove subject: patterns
    cleanedQuery = cleanedQuery.replace(/subject:\([^)]+\)/g, "");
    cleanedQuery = cleanedQuery.replace(/subject:[^\s]+/g, "");

    // Remove cc: patterns
    cleanedQuery = cleanedQuery.replace(/cc:\([^)]+\)/g, "");
    cleanedQuery = cleanedQuery.replace(/cc:[^\s]+/g, "");

    // Remove bcc: patterns
    cleanedQuery = cleanedQuery.replace(/bcc:\([^)]+\)/g, "");
    cleanedQuery = cleanedQuery.replace(/bcc:[^\s]+/g, "");

    // Remove filename: patterns
    cleanedQuery = cleanedQuery.replace(/filename:\([^)]+\)/g, "");
    cleanedQuery = cleanedQuery.replace(/filename:[^\s]+/g, "");

    // Remove category: patterns
    cleanedQuery = cleanedQuery.replace(/category:\([^)]+\)/g, "");
    cleanedQuery = cleanedQuery.replace(/category:[^\s]+/g, "");

    // Remove deliveredto: patterns
    cleanedQuery = cleanedQuery.replace(/deliveredto:\([^)]+\)/g, "");
    cleanedQuery = cleanedQuery.replace(/deliveredto:[^\s]+/g, "");

    // Remove hasnot: patterns
    cleanedQuery = cleanedQuery.replace(/hasnot:\([^)]+\)/g, "");
    cleanedQuery = cleanedQuery.replace(/hasnot:[^\s]+/g, "");

    // Remove has:attachment, has:userlabels, has:nouserlabels
    cleanedQuery = cleanedQuery.replace(/has:attachment\b/g, "");
    cleanedQuery = cleanedQuery.replace(/has:userlabels\b/g, "");
    cleanedQuery = cleanedQuery.replace(/has:nouserlabels\b/g, "");

    // Remove is:unread, is:read
    cleanedQuery = cleanedQuery.replace(/is:unread\b/g, "");
    cleanedQuery = cleanedQuery.replace(/is:read\b/g, "");

    // Remove larger: and smaller: patterns
    cleanedQuery = cleanedQuery.replace(/larger:\d+[KMG]B?\b/gi, "");
    cleanedQuery = cleanedQuery.replace(/smaller:\d+[KMG]B?\b/gi, "");

    // Remove in: patterns (inbox, sent, drafts, trash, spam, starred, snoozed, archive, anywhere)
    cleanedQuery = cleanedQuery.replace(/in:(inbox|sent|drafts|trash|spam|starred|snoozed|archive|anywhere)\b/gi, "");

    // Remove label: patterns
    cleanedQuery = cleanedQuery.replace(/label:\S+/g, "");

    // Remove after: and before: date patterns
    // Remove after: and before: patterns with no spaces after ':' (e.g., after:somedate)
    cleanedQuery = cleanedQuery.replace(/after:[^\s]+\b/g, "");
    cleanedQuery = cleanedQuery.replace(/before:[^\s]+\b/g, "");
    cleanedQuery = cleanedQuery.replace(/after:\d{4}-\d{2}-\d{2}\b/g, "");
    cleanedQuery = cleanedQuery.replace(/before:\d{4}-\d{2}-\d{2}\b/g, "");

    // Remove -NegativeWord patterns (negated words like -foo, -bar etc)
    cleanedQuery = cleanedQuery.replace(/-\w+\b/g, "");

    // Clean up extra whitespace (multiple spaces, leading/trailing spaces)
    cleanedQuery = cleanedQuery.replace(/\s+/g, " ").trim();

    // Update apiParams.q with cleaned query, or remove it if empty
    if (cleanedQuery) {
      apiParams.q = cleanedQuery;
    } else {
      delete apiParams.q;
    }
  }

  return {
    // Store original params for reference (some are also mapped to API params above)
    originalParams: {
      hasnot: searchParams.get("hasnot"),
      size: searchParams.get("size"),
      sizeOperator: searchParams.get("sizeOperator"),
      sizeUnit: searchParams.get("sizeUnit"),
      fromEmails: from
        ? from
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean)
        : [],
      toEmails: to
        ? to
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean)
        : [],
    },
    // API params to send to backend
    apiParams,
  };
}

export const getDateString = (dateObj) => {
  if (!dateObj) return "";
  dateObj = new Date(dateObj);
  const date = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = String(dateObj.getFullYear());
  return `${year}-${month}-${date}`;
};

export const ACTIVE_FILTERS = {
  HAS_ATTACHMENT: "has_attachment",
  IS_UNREAD: "is_unread",
  LAST_WEEK: "last_week",
  LAST_MONTH: "last_month",
  LAST_3_MONTHS: "last_3_months",
  LAST_6_MONTHS: "last_6_months",
  LAST_YEAR: "last_year",
  CUSTOM_RANGE: "custom_range",
  FROM_ME: "from_me",
};

export const getActiveFilters = (location, loggedInUserEmail = null) => {
  const { apiParams } = buildSearchParams(location);
  const activeFilters = [];

  if (apiParams.has_attachment) {
    activeFilters.push(ACTIVE_FILTERS.HAS_ATTACHMENT);
  }
  if (apiParams.is_read === false) {
    activeFilters.push(ACTIVE_FILTERS.IS_UNREAD);
  }

  if (apiParams.date_from && apiParams.date_to) {
    const statDate = new Date(apiParams.date_from);
    const endDate = new Date(apiParams.date_to);
    const today = new Date();
    let foundMatch = false;
    const lastWeekDate = new Date(today);
    lastWeekDate.setDate(today.getDate() - 7);
    if (lastWeekDate.toLocaleDateString() === statDate.toLocaleDateString()) {
      activeFilters.push(ACTIVE_FILTERS.LAST_WEEK);
      foundMatch = true;
    }
    const lastMonthDate = new Date(today);
    lastMonthDate.setMonth(today.getMonth() - 1);
    if (lastMonthDate.toLocaleDateString() === statDate.toLocaleDateString()) {
      activeFilters.push(ACTIVE_FILTERS.LAST_MONTH);
      foundMatch = true;
    }
    const last3MonthsDate = new Date(today);
    last3MonthsDate.setMonth(today.getMonth() - 3);
    if (last3MonthsDate.toLocaleDateString() === statDate.toLocaleDateString()) {
      activeFilters.push(ACTIVE_FILTERS.LAST_3_MONTHS);
      foundMatch = true;
    }
    const last6MonthsDate = new Date(today);
    last6MonthsDate.setMonth(today.getMonth() - 6);
    if (last6MonthsDate.toLocaleDateString() === statDate.toLocaleDateString()) {
      activeFilters.push(ACTIVE_FILTERS.LAST_6_MONTHS);
      foundMatch = true;
    }
    const lastYearDate = new Date(today);
    lastYearDate.setFullYear(today.getFullYear() - 1);
    if (lastYearDate.toLocaleDateString() === statDate.toLocaleDateString()) {
      activeFilters.push(ACTIVE_FILTERS.LAST_YEAR);
      foundMatch = true;
    }
    if (!foundMatch) {
      activeFilters.push(ACTIVE_FILTERS.CUSTOM_RANGE);
    }
  }
  if (loggedInUserEmail && apiParams.from) {
    const fromEmails = apiParams.from.split(",");
    if (fromEmails.includes(loggedInUserEmail.toLowerCase())) {
      activeFilters.push(ACTIVE_FILTERS.FROM_ME);
    }
  }
  return activeFilters;
};
