import React from "react";

/**
 * Component that highlights search terms in text
 * @param {string} text - The text to highlight
 * @param {string} searchQuery - The search query (can contain multiple words)
 * @returns {React.ReactNode} - React element with highlighted text
 */
const HighlightedText = ({ text, searchQuery }) => {
  // If no search query or text, return text as-is
  if (!searchQuery || !text || typeof text !== "string") {
    return text;
  }

  // Split search query into individual words, filtering out empty strings
  const searchTerms = searchQuery
    .trim()
    .split(/\s+/)
    .filter((term) => term.length > 0);

  // If no valid search terms, return text as-is
  if (searchTerms.length === 0) {
    return text;
  }

  // Create a regex pattern that matches any of the search terms (case-insensitive)
  // Escape special regex characters in each term
  const escapedTerms = searchTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = `(${escapedTerms.join("|")})`;
  const regex = new RegExp(pattern, "gi");

  // Split text by matches while preserving the matches
  const parts = text.split(regex);

  // Map parts to React elements, wrapping matches in <mark> tags
  return (
    <>
      {parts.map((part, index) => {
        // Check if this part matches any search term (case-insensitive)
        const isMatch = searchTerms.some((term) => {
          const termRegex = new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
          return termRegex.test(part);
        });

        if (isMatch && part.trim().length > 0) {
          return (
            <mark key={index} style={{ backgroundColor: "#fef08a", padding: "0 2px" }}>
              {part}
            </mark>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};

export default HighlightedText;
