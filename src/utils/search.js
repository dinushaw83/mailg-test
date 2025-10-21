import lunr from "lunr";

// Basic search implementation
let searchIndex = null;
let emailDocuments = [];
let lastEmailHash = null; // Track when emails change to rebuild index

// Search history management
const SEARCH_HISTORY_KEY = "mailg_search_history";
const MAX_SEARCH_HISTORY = 10;
const ALL_SEARCH_QUERIES_KEY = "allSearchQueries";

function getSearchHistory() {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    return [];
  }
}

function saveSearchHistory(history) {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn("Failed to save search history:", error);
  }
}

export function addToSearchHistory(query) {
  if (!query || !query.trim()) return;

  const trimmedQuery = query.trim();
  let history = getSearchHistory();

  // Remove if already exists (to move to front)
  history = history.filter((item) => item !== trimmedQuery);

  history.unshift(trimmedQuery);

  // Limit to max history size
  history = history.slice(0, MAX_SEARCH_HISTORY);

  saveSearchHistory(history);
}

/**
 * Remove a specific item from search history
 */
export function removeFromSearchHistory(query) {
  if (!query) return;

  let history = getSearchHistory();
  history = history.filter((item) => item !== query);
  saveSearchHistory(history);
}

/**
 * Get search history
 */
export function getSearchHistoryItems() {
  return getSearchHistory();
}

/**
 * Get all search queries from localStorage
 */
function getAllSearchQueries() {
  try {
    const queries = localStorage.getItem(ALL_SEARCH_QUERIES_KEY);
    if (queries) {
      return JSON.parse(queries);
    }
    return {
      basic: [],
      advanced: [],
    };
  } catch (error) {
    console.warn("Failed to get all search queries:", error);
    return {
      basic: [],
      advanced: [],
    };
  }
}

/**
 * Save all search queries to localStorage
 */
function saveAllSearchQueries(queries) {
  try {
    localStorage.setItem(ALL_SEARCH_QUERIES_KEY, JSON.stringify(queries));
  } catch (error) {
    console.warn("Failed to save all search queries:", error);
  }
}

/**
 * Add a basic search query to the tracking system
 */
export function addBasicSearchQuery(query) {
  if (!query || !query.trim()) return;

  const trimmedQuery = query.trim();
  const allQueries = getAllSearchQueries();

  // Add to basic array if not already present
  if (!allQueries.basic.includes(trimmedQuery)) {
    allQueries.basic.unshift(trimmedQuery);
  }

  saveAllSearchQueries(allQueries);
}

/**
 * Add an advanced search query to the tracking system
 * @param {Object} formData - The advanced search form data
 */
export function addAdvancedSearchQuery(formData) {
  if (!formData) return;

  const allQueries = getAllSearchQueries();

  // Add the complete formData object to the advanced array
  allQueries.advanced.unshift(formData);

  saveAllSearchQueries(allQueries);
}

/**
 * Clear all tracked search queries (useful for testing/debugging)
 */
export function clearTrackedSearchQueries() {
  try {
    localStorage.removeItem(ALL_SEARCH_QUERIES_KEY);
  } catch (error) {
    console.warn("Failed to clear tracked search queries:", error);
  }
}

/**
 * basic text normalization
 */
function normalizeText(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate a simple hash for emails to detect changes
 */
function generateEmailHash(emails) {
  if (!emails || emails.length === 0) return "";
  return emails
    .map((email) => {
      const labels = email.labels ? email.labels.sort().join(",") : "";
      return `${email.id}-${email.timestamp}-${labels}`;
    })
    .join("|")
    .slice(0, 150);
}

/**
 * Save search index to localStorage
 */
function saveSearchIndexToStorage() {
  if (!searchIndex || !emailDocuments.length) return;

  try {
    const indexData = {
      index: searchIndex.toJSON(),
      documents: emailDocuments,
      emailHash: lastEmailHash,
      timestamp: Date.now(),
    };
    localStorage.setItem("searchIndex", JSON.stringify(indexData));
  } catch (error) {
    console.warn("Failed to save search index to localStorage:", error);
  }
}

/**
 * Load search index from localStorage
 */
function loadSearchIndexFromStorage() {
  try {
    const stored = localStorage.getItem("searchIndex");
    if (!stored) return false;

    const indexData = JSON.parse(stored);

    // Check if stored data is recent (within 24 hours)
    const isRecent = Date.now() - indexData.timestamp < 24 * 60 * 60 * 1000;
    if (!isRecent) {
      localStorage.removeItem("searchIndex");
      return false;
    }

    // Restore the index
    searchIndex = lunr.Index.load(indexData.index);
    emailDocuments = indexData.documents;
    lastEmailHash = indexData.emailHash;

    return true;
  } catch (error) {
    console.warn("Failed to load search index from localStorage:", error);
    localStorage.removeItem("searchIndex");
    return false;
  }
}

export function buildSearchIndex(emails) {
  try {
    // Generate hash for current emails
    const currentEmailHash = generateEmailHash(emails);

    // If we have a cached index and emails haven't changed, use it
    if (searchIndex && lastEmailHash === currentEmailHash) {
      return true;
    }

    // Try to load from localStorage first
    if (!searchIndex && loadSearchIndexFromStorage()) {
      // Check if the loaded index matches current emails
      if (lastEmailHash === currentEmailHash) {
        return true;
      }
    }

    // Build new index
    emailDocuments = emails.map((email) => ({
      id: email.id,
      threadId: email.threadId,
      subject: email.subject || "",
      body: email.body || "",
      preview: email.preview || "",
      fromName: email.from?.name || "",
      fromEmail: email.from?.email || "",
      timestamp: email.timestamp,
      attachments: email.attachments || [],
      // Create searchable text
      searchableText: normalizeText(
        `${email.subject || ""} ${email.preview || ""} ${email.body || ""} ${email.from?.name || ""} ${
          email.from?.email || ""
        }`
      ),
    }));

    // Build simple lunr index
    searchIndex = lunr(function () {
      this.field("subject", { boost: 3 });
      this.field("preview", { boost: 2 });
      this.field("body", { boost: 1 });
      this.field("fromName", { boost: 2 });
      this.field("fromEmail", { boost: 2 });
      this.field("searchableText", { boost: 1 });
      this.ref("id");

      // Add documents
      emailDocuments.forEach((doc) => {
        this.add(doc);
      });
    });

    // Update hash and save to localStorage
    lastEmailHash = currentEmailHash;
    saveSearchIndexToStorage();

    return true;
  } catch (error) {
    searchIndex = null;
    return false;
  }
}

/**
 * Advanced search function with multiple criteria
 */
export function searchEmails(query, options = {}) {
  if (!searchIndex || !query || !query.trim()) {
    return [];
  }

  try {
    const trimmedQuery = query.trim().toLowerCase();

    // Try exact search first
    let results = searchIndex.search(trimmedQuery);

    // If no results, try with wildcards (including single character searches)
    if (results.length === 0) {
      const wildcardQuery = trimmedQuery + "*";
      try {
        results = searchIndex.search(wildcardQuery);
      } catch (error) {
        // Wildcard search might fail for very short queries, fallback to simple contains search
        results = [];
      }
    }

    // If still no results and query is short, do a simple substring match
    if (results.length === 0 && trimmedQuery.length >= 1) {
      const matchingDocs = emailDocuments.filter((doc) => {
        return (
          doc.subject?.toLowerCase().includes(trimmedQuery) ||
          doc.body?.toLowerCase().includes(trimmedQuery) ||
          doc.preview?.toLowerCase().includes(trimmedQuery) ||
          doc.fromName?.toLowerCase().includes(trimmedQuery) ||
          doc.fromEmail?.toLowerCase().includes(trimmedQuery) ||
          doc.searchableText?.includes(trimmedQuery) ||
          doc.attachments?.some((attachment) => attachment.name?.toLowerCase().includes(trimmedQuery))
        );
      });

      // Convert to results format with scoring
      results = matchingDocs.map((doc, index) => ({
        ref: doc.id,
        score: 1 / (index + 1), // Simple scoring based on order
      }));
    }

    // Map results back to email documents
    let emailResults = results.map((result) => emailDocuments.find((doc) => doc.id == result.ref)).filter(Boolean);

    // Apply limit only if specified
    if (options.limit !== null && options.limit !== undefined) {
      emailResults = emailResults.slice(0, options.limit || 5);
    }

    return emailResults;
  } catch (error) {
    return [];
  }
}

/**
 * Advanced search function with multiple criteria
 */
export function advancedSearchEmails(searchCriteria, options = {}) {
  if (!emailDocuments || emailDocuments.length === 0) {
    return [];
  }

  try {
    let filteredEmails = [...emailDocuments];

    // Apply text search if provided
    if (searchCriteria.query && searchCriteria.query.trim()) {
      const query = searchCriteria.query.trim().toLowerCase();
      filteredEmails = filteredEmails.filter((email) => {
        const searchableText = `${email.subject || ""} ${email.preview || ""} ${email.body || ""} ${
          email.fromName || ""
        } ${email.fromEmail || ""}`.toLowerCase();
        return searchableText.includes(query);
      });
    }

    // Apply "from" filter
    if (searchCriteria.from && searchCriteria.from.trim()) {
      const fromEmails = searchCriteria.from.split(",").map((email) => email.trim().toLowerCase());
      filteredEmails = filteredEmails.filter((email) => {
        return fromEmails.some(
          (fromEmail) =>
            (email.from?.name && email.from.name.toLowerCase().includes(fromEmail)) ||
            (email.from?.email && email.from.email.toLowerCase().includes(fromEmail))
        );
      });
    }

    // Apply "to" filter
    if (searchCriteria.to && searchCriteria.to.trim()) {
      const toEmails = searchCriteria.to.split(",").map((email) => email.trim().toLowerCase());
      filteredEmails = filteredEmails.filter((email) => {
        if (Array.isArray(email.to)) {
          return email.to.some((recipient) => toEmails.some((toEmail) => recipient.toLowerCase().includes(toEmail)));
        } else if (typeof email.to === "string") {
          return toEmails.some((toEmail) => email.to.toLowerCase().includes(toEmail));
        }
        return false;
      });
    }

    // Apply "subject" filter
    if (searchCriteria.subject && searchCriteria.subject.trim()) {
      const subjectQuery = searchCriteria.subject.trim().toLowerCase();
      filteredEmails = filteredEmails.filter((email) => {
        return email.subject && email.subject.toLowerCase().includes(subjectQuery);
      });
    }

    // Apply "attachment" filter
    if (searchCriteria.attachment) {
      // We need to get the original email data to check for attachments
      // Since our emailDocuments don't include attachment info, we'll need to cross-reference
      filteredEmails = filteredEmails.filter((email) => {
        // This will be handled by cross-referencing with original emails
        return true; // Placeholder - will be filtered later
      });
    }

    // Apply limit only if specified
    if (options.limit !== null && options.limit !== undefined) {
      filteredEmails = filteredEmails.slice(0, options.limit || 5);
    }

    return filteredEmails;
  } catch (error) {
    console.error("Advanced search error:", error);
    return [];
  }
}

/**
 * Parse size string like "1.2 MB" or "980 KB" to bytes
 */
function parseSizeToBytes(sizeString) {
  if (!sizeString || typeof sizeString !== "string") {
    return 0;
  }

  const match = sizeString.match(/^([\d.]+)\s*(MB|KB|Bytes?)$/i);
  if (!match) {
    return 0;
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();

  switch (unit) {
    case "MB":
      return value * 1024 * 1024;
    case "KB":
      return value * 1024;
    case "BYTES":
    case "BYTE":
      return value;
    default:
      return 0;
  }
}

/**
 * Advanced search with full email data (including attachments)
 */
export function advancedSearchWithFullData(searchCriteria, emails) {
  if (!emails || emails.length === 0) {
    return [];
  }

  try {
    let filteredEmails = [...emails];

    // Apply text search if provided
    if (searchCriteria.query && searchCriteria.query.trim()) {
      const query = searchCriteria.query.trim().toLowerCase();
      filteredEmails = filteredEmails.filter((email) => {
        const searchableText = `${email.subject || ""} ${email.preview || ""} ${email.body || ""} ${
          email.from?.name || ""
        } ${email.from?.email || ""}`.toLowerCase();
        return searchableText.includes(query);
      });
    }

    // Apply "from" filter
    if (searchCriteria.from && searchCriteria.from.trim()) {
      const fromEmails = searchCriteria.from.split(",").map((email) => email.trim().toLowerCase());
      filteredEmails = filteredEmails.filter((email) => {
        return fromEmails.some(
          (fromEmail) =>
            (email.from?.name && email.from.name.toLowerCase().includes(fromEmail)) ||
            (email.from?.email && email.from.email.toLowerCase().includes(fromEmail))
        );
      });
    }

    // Apply "to" filter
    if (searchCriteria.to && searchCriteria.to.trim()) {
      const toEmails = searchCriteria.to.split(",").map((email) => email.trim().toLowerCase());
      filteredEmails = filteredEmails.filter((email) => {
        if (Array.isArray(email.to)) {
          return email.to.some((recipient) => toEmails.some((toEmail) => recipient.toLowerCase().includes(toEmail)));
        } else if (typeof email.to === "string") {
          return toEmails.some((toEmail) => email.to.toLowerCase().includes(toEmail));
        }
        return false;
      });
    }

    // Apply "subject" filter
    if (searchCriteria.subject && searchCriteria.subject.trim()) {
      const subjectQuery = searchCriteria.subject.trim().toLowerCase();
      filteredEmails = filteredEmails.filter((email) => {
        return email.subject && email.subject.toLowerCase().includes(subjectQuery);
      });
    }

    // Apply "attachment" filter
    if (searchCriteria.attachment) {
      filteredEmails = filteredEmails.filter((email) => {
        return email.attachments && email.attachments.length > 0;
      });
    }

    // Apply "has" filter
    if (searchCriteria.has && searchCriteria.has.trim()) {
      const wordsQuery = searchCriteria.has.trim().toLowerCase();
      const words = wordsQuery.split(/\s+/);
      filteredEmails = filteredEmails.filter((email) => {
        const searchableText = `${email.subject || ""} ${email.preview || ""} ${email.body || ""}`.toLowerCase();
        return words.every((word) => searchableText.includes(word));
      });
    }

    // Apply "hasnot" filter
    if (searchCriteria.hasnot && searchCriteria.hasnot.trim()) {
      const excludeQuery = searchCriteria.hasnot.trim().toLowerCase();
      const excludeWords = excludeQuery.split(/\s+/);
      filteredEmails = filteredEmails.filter((email) => {
        const searchableText = `${email.subject || ""} ${email.preview || ""} ${email.body || ""}`.toLowerCase();
        return !excludeWords.some((word) => searchableText.includes(word));
      });
    }

    // Apply date and within filter
    if (searchCriteria.within && searchCriteria.date) {
      // Parse the selected date and set it to start of day in local timezone
      const selectedDate = new Date(searchCriteria.date + "T00:00:00");
      let daysOffset = 1; // default to 1 day

      switch (searchCriteria.within) {
        case "1 day":
          daysOffset = 1;
          break;
        case "3 days":
          daysOffset = 3;
          break;
        case "1 week":
          daysOffset = 7;
          break;
        case "2 weeks":
          daysOffset = 14;
          break;
        case "1 month":
          daysOffset = 30;
          break;
        case "2 months":
          daysOffset = 60;
          break;
        case "3 months":
          daysOffset = 90;
          break;
        case "6 months":
          daysOffset = 180;
          break;
        case "1 year":
          daysOffset = 365;
          break;
      }

      // Calculate after and before dates
      // For "1 day" with Aug 31: after = Aug 30, before = Sep 2 (exclusive)
      const afterDate = new Date(selectedDate.getTime() - daysOffset * 24 * 60 * 60 * 1000);
      const beforeDate = new Date(selectedDate.getTime() + (daysOffset + 1) * 24 * 60 * 60 * 1000);

      // console.log("Date filter debug:", {
      //   selectedDate: searchCriteria.dateValue,
      //   dateWithin: searchCriteria.dateWithin,
      //   afterDate: afterDate.toISOString(),
      //   beforeDate: beforeDate.toISOString(),
      //   daysOffset,
      // });

      filteredEmails = filteredEmails.filter((email) => {
        const emailDate = new Date(email.timestamp);
        const isInRange = emailDate >= afterDate && emailDate < beforeDate;
        return isInRange;
      });
    }

    // Apply subset filter (search in specific folder/label)
    if (searchCriteria.subset && searchCriteria.subset.trim() !== "" && searchCriteria.subset !== "All Mail") {
      const targetLabel = searchCriteria.subset.trim();

      filteredEmails = filteredEmails.filter((email) => {
        // Check if email has labels and includes the target subset
        if (!email.labels || !Array.isArray(email.labels)) {
          return false;
        }
        // Case-sensitive match for system labels (Inbox, Sent, Drafts, Spam, Trash)
        const matches = email.labels.includes(targetLabel);
        return matches;
      });
    }

    // Apply size filter
    if (searchCriteria.size && searchCriteria.size.trim()) {
      const sizeValue = parseFloat(searchCriteria.size);
      const sizeUnit = searchCriteria.sizeUnit || "MB";
      const sizeOperator = searchCriteria.sizeOperator || "less than";

      if (!isNaN(sizeValue)) {
        filteredEmails = filteredEmails.filter((email) => {
          if (!email.attachments || email.attachments.length === 0) {
            return false; // No attachments means size is 0
          }

          // Calculate total size of all attachments in bytes
          let totalSizeInBytes = 0;
          email.attachments.forEach((attachment) => {
            if (attachment.size) {
              totalSizeInBytes += parseSizeToBytes(attachment.size);
            }
          });

          // Convert the search size to bytes
          let searchSizeInBytes = sizeValue;
          if (sizeUnit === "MB") {
            searchSizeInBytes = sizeValue * 1024 * 1024;
          } else if (sizeUnit === "KB") {
            searchSizeInBytes = sizeValue * 1024;
          }
          // else Bytes - no conversion needed

          // Apply operator comparison
          if (sizeOperator === "greater than") {
            return totalSizeInBytes > searchSizeInBytes;
          } else {
            // "less than"
            return totalSizeInBytes < searchSizeInBytes;
          }
        });
      }
    }

    return filteredEmails;
  } catch (error) {
    console.error("Advanced search with full data error:", error);
    return [];
  }
}

/**
 * Get recent search suggestions with search history priority
 */
export function getRecentSearchSuggestions(limit = 6) {
  if (!emailDocuments || emailDocuments.length === 0) {
    return [];
  }

  // Get search history first
  const searchHistory = getSearchHistory();

  // Get recent emails and extract subjects
  const recentEmails = emailDocuments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);

  const suggestions = [];
  recentEmails.forEach((email) => {
    if (email.subject && email.subject.length < 50) {
      suggestions.push(email.subject);
    }
    if (email.fromName && email.fromName.length < 30) {
      suggestions.push(email.fromName);
    }
  });

  // Remove duplicates from recent suggestions
  const recentSuggestions = [...new Set(suggestions)];

  // Combine search history with recent suggestions
  // Search history items come first, then fill remaining slots with recent suggestions
  const combinedSuggestions = [];

  // Add search history items first (up to the limit)
  searchHistory.forEach((historyItem) => {
    if (combinedSuggestions.length < limit) {
      combinedSuggestions.push(historyItem);
    }
  });

  // Fill remaining slots with recent suggestions (excluding those already in history)
  recentSuggestions.forEach((suggestion) => {
    if (combinedSuggestions.length < limit && !searchHistory.includes(suggestion)) {
      combinedSuggestions.push(suggestion);
    }
  });

  return combinedSuggestions;
}

/**
 * Check if search index is ready
 */
export function isSearchIndexReady() {
  return searchIndex !== null && emailDocuments.length > 0;
}

/**
 * Get search statistics
 */
export function getSearchStats() {
  return {
    isReady: isSearchIndexReady(),
    totalEmails: emailDocuments.length,
    indexSize: searchIndex ? "built" : "not built",
  };
}

/**
 * Initialize search index from persisted data
 * This should be called on app startup
 */
export function initializeSearchIndex() {
  // Try to load from localStorage
  if (loadSearchIndexFromStorage()) {
    return true;
  }
  return false;
}

/**
 * Clear search index and localStorage
 */
export function clearSearchIndex() {
  searchIndex = null;
  emailDocuments = [];
  lastEmailHash = null;
  localStorage.removeItem("searchIndex");
}

/**
 * Extract unique contacts from emails (excluding noreply emails)
 */
export function getEmailContacts(emails) {
  if (!emails || emails.length === 0) {
    return [];
  }

  const contactsMap = new Map();

  emails.forEach((email) => {
    if (email.from && email.from.email) {
      const emailAddress = email.from.email.toLowerCase();

      // Skip noreply emails
      if (emailAddress.includes("noreply") || emailAddress.includes("no-reply")) {
        return;
      }

      // Use email as key to avoid duplicates
      if (!contactsMap.has(emailAddress)) {
        contactsMap.set(emailAddress, {
          name: email.from.name || "",
          email: email.from.email,
          avatar: email.from.avatar || null,
        });
      }
    }
  });

  return Array.from(contactsMap.values());
}

/**
 * Search contacts by query
 */
export function searchContacts(query, emails, limit = 3) {
  if (!query || !query.trim()) {
    return [];
  }

  const trimmedQuery = query.trim().toLowerCase();
  const contacts = getEmailContacts(emails);

  // Filter contacts that match the query
  const matchingContacts = contacts.filter((contact) => {
    return contact.name?.toLowerCase().includes(trimmedQuery) || contact.email?.toLowerCase().includes(trimmedQuery);
  });

  return matchingContacts.slice(0, limit);
}

/**
 * Get auto-complete suggestion for current query
 * Returns the best suggestion to complete with Tab key
 */
export function getAutoCompleteSuggestion(query, emails) {
  if (!query || !query.trim()) {
    return null;
  }

  const trimmedQuery = query.trim().toLowerCase();

  // First, try to match email addresses from contacts
  const contacts = getEmailContacts(emails);

  for (const contact of contacts) {
    if (contact.email.toLowerCase().startsWith(trimmedQuery)) {
      return {
        type: "email",
        value: contact.email,
        displayName: contact.name,
      };
    }
  }

  // Next, try to match contact names
  for (const contact of contacts) {
    if (contact.name && contact.name.toLowerCase().startsWith(trimmedQuery)) {
      return {
        type: "name",
        value: contact.name,
        email: contact.email,
      };
    }
  }

  // Finally, try to match subjects from recent emails
  if (emailDocuments && emailDocuments.length > 0) {
    const recentEmails = emailDocuments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);

    for (const email of recentEmails) {
      if (email.subject && email.subject.toLowerCase().startsWith(trimmedQuery)) {
        return {
          type: "subject",
          value: email.subject,
        };
      }
    }
  }

  return null;
}

/**
 * Create a human-readable search summary from search criteria
 */
export function createSearchSummary(searchCriteria) {
  const parts = [];

  if (searchCriteria.from) {
    parts.push(`from: ${searchCriteria.from}`);
  }

  if (searchCriteria.to) {
    parts.push(`to: ${searchCriteria.to}`);
  }

  if (searchCriteria.subject) {
    parts.push(`subject: ${searchCriteria.subject}`);
  }

  if (searchCriteria.has) {
    parts.push(`has: ${searchCriteria.has}`);
  }

  if (searchCriteria.hasnot) {
    parts.push(`hasnot: ${searchCriteria.hasnot}`);
  }

  if (searchCriteria.attachment) {
    parts.push("attachment");
  }

  if (searchCriteria.within && searchCriteria.date) {
    parts.push(`within ${searchCriteria.within}`);
  }

  if (searchCriteria.subset && searchCriteria.subset !== "All Mail") {
    parts.push(`subset ${searchCriteria.subset}`);
  }

  return parts.length > 0 ? parts.join(", ") : "all emails";
}
