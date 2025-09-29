import lunr from "lunr";

// Basic search implementation
let searchIndex = null;
let emailDocuments = [];
let lastEmailHash = null; // Track when emails change to rebuild index

// Search history management
const SEARCH_HISTORY_KEY = "mailg_search_history";
const MAX_SEARCH_HISTORY = 10;

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
 * Get search history
 */
export function getSearchHistoryItems() {
  return getSearchHistory();
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
    .map((email) => `${email.id}-${email.timestamp}-${email.subject || ""}`)
    .join("|")
    .slice(0, 100); // Use first 100 chars for performance
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

    // If no results, try with wildcards
    if (results.length === 0 && trimmedQuery.length > 1) {
      const wildcardQuery = trimmedQuery + "*";
      results = searchIndex.search(wildcardQuery);
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
      const fromQuery = searchCriteria.from.trim().toLowerCase();
      filteredEmails = filteredEmails.filter((email) => {
        return (
          (email.fromName && email.fromName.toLowerCase().includes(fromQuery)) ||
          (email.fromEmail && email.fromEmail.toLowerCase().includes(fromQuery))
        );
      });
    }

    // Apply "to" filter
    if (searchCriteria.to && searchCriteria.to.trim()) {
      const toQuery = searchCriteria.to.trim().toLowerCase();
      filteredEmails = filteredEmails.filter((email) => {
        // Note: We don't have 'to' field in our email documents, so we'll skip this for now
        // This would need to be added to the email document structure
        return true;
      });
    }

    // Apply "subject" filter
    if (searchCriteria.subject && searchCriteria.subject.trim()) {
      const subjectQuery = searchCriteria.subject.trim().toLowerCase();
      filteredEmails = filteredEmails.filter((email) => {
        return email.subject && email.subject.toLowerCase().includes(subjectQuery);
      });
    }

    // Apply "has attachment" filter
    if (searchCriteria.hasAttachment) {
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
 * Advanced search with full email data (including attachments)
 */
export function advancedSearchWithFullData(searchCriteria, emails, options = {}) {
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
      const fromQuery = searchCriteria.from.trim().toLowerCase();
      filteredEmails = filteredEmails.filter((email) => {
        return (
          (email.from?.name && email.from.name.toLowerCase().includes(fromQuery)) ||
          (email.from?.email && email.from.email.toLowerCase().includes(fromQuery))
        );
      });
    }

    // Apply "to" filter
    if (searchCriteria.to && searchCriteria.to.trim()) {
      const toQuery = searchCriteria.to.trim().toLowerCase();
      filteredEmails = filteredEmails.filter((email) => {
        if (Array.isArray(email.to)) {
          return email.to.some((recipient) => recipient.toLowerCase().includes(toQuery));
        } else if (typeof email.to === "string") {
          return email.to.toLowerCase().includes(toQuery);
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

    // Apply "has attachment" filter
    if (searchCriteria.hasAttachment) {
      filteredEmails = filteredEmails.filter((email) => {
        return email.attachments && email.attachments.length > 0;
      });
    }

    // Apply "has words" filter
    if (searchCriteria.hasWords && searchCriteria.hasWords.trim()) {
      const wordsQuery = searchCriteria.hasWords.trim().toLowerCase();
      const words = wordsQuery.split(/\s+/);
      filteredEmails = filteredEmails.filter((email) => {
        const searchableText = `${email.subject || ""} ${email.preview || ""} ${email.body || ""}`.toLowerCase();
        return words.every((word) => searchableText.includes(word));
      });
    }

    // Apply "doesn't have" filter
    if (searchCriteria.doesntHave && searchCriteria.doesntHave.trim()) {
      const excludeQuery = searchCriteria.doesntHave.trim().toLowerCase();
      const excludeWords = excludeQuery.split(/\s+/);
      filteredEmails = filteredEmails.filter((email) => {
        const searchableText = `${email.subject || ""} ${email.preview || ""} ${email.body || ""}`.toLowerCase();
        return !excludeWords.some((word) => searchableText.includes(word));
      });
    }

    // Apply date filter
    if (searchCriteria.dateWithin && searchCriteria.dateValue) {
      const now = new Date();
      let daysBack = 3; // default

      switch (searchCriteria.dateWithin) {
        case "1 day":
          daysBack = 1;
          break;
        case "3 days":
          daysBack = 3;
          break;
        case "1 week":
          daysBack = 7;
          break;
        case "1 month":
          daysBack = 30;
          break;
        case "1 year":
          daysBack = 365;
          break;
      }

      const cutoffDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      filteredEmails = filteredEmails.filter((email) => {
        const emailDate = new Date(email.timestamp);
        return emailDate >= cutoffDate;
      });
    }

    // Apply search location filter
    if (searchCriteria.searchIn && searchCriteria.searchIn !== "All Mail") {
      filteredEmails = filteredEmails.filter((email) => {
        return email.labels && email.labels.includes(searchCriteria.searchIn);
      });
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

  if (searchCriteria.hasWords) {
    parts.push(`has: ${searchCriteria.hasWords}`);
  }

  if (searchCriteria.doesntHave) {
    parts.push(`doesn't have: ${searchCriteria.doesntHave}`);
  }

  if (searchCriteria.hasAttachment) {
    parts.push("has attachment");
  }

  if (searchCriteria.dateWithin && searchCriteria.dateValue) {
    parts.push(`within ${searchCriteria.dateWithin}`);
  }

  if (searchCriteria.searchIn && searchCriteria.searchIn !== "All Mail") {
    parts.push(`in ${searchCriteria.searchIn}`);
  }

  return parts.length > 0 ? parts.join(", ") : "all emails";
}
