import lunr from "lunr";

// Basic search implementation
let searchIndex = null;
let emailDocuments = [];
let lastEmailHash = null; // Track when emails change to rebuild index

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
 * Simple search function
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
 * Get recent search suggestions
 */
export function getRecentSearchSuggestions(limit = 6) {
  if (!emailDocuments || emailDocuments.length === 0) {
    return [];
  }

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

  // Remove duplicates and limit
  return [...new Set(suggestions)].slice(0, limit);
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
