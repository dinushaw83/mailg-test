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
  console.log("Building simple search index with", emails.length, "emails");

  try {
    // Store email documents
    emailDocuments = emails.map((email) => ({
      id: email.id,
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

    console.log("Search index built successfully with", emailDocuments.length, "documents");
    return true;
  } catch (error) {
    console.error("Error building search index:", error);
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
    console.log("Searching for:", trimmedQuery);

    // Try exact search first
    let results = searchIndex.search(trimmedQuery);
    console.log("Exact search results:", results.length);

    // If no results, try with wildcards
    if (results.length === 0 && trimmedQuery.length > 2) {
      const wildcardQuery = trimmedQuery + "*";
      results = searchIndex.search(wildcardQuery);
      console.log("Wildcard search results:", results.length);
    }

    // Map results back to email documents
    const emailResults = results
      .map((result) => emailDocuments.find((doc) => doc.id == result.ref))
      .filter(Boolean)
      .slice(0, options.limit || 5);

    console.log("Final results:", emailResults.length);
    return emailResults;
  } catch (error) {
    console.error("Search error:", error);
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
