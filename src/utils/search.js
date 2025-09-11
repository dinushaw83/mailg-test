import lunr from "lunr";

// Basic search implementation
let searchIndex = null;
let emailDocuments = [];

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

export function buildSearchIndex(emails) {
  try {
    // Store email documents
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
