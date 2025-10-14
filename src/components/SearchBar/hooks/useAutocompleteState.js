import { useState, useEffect } from "react";
import { getAutoCompleteSuggestion } from "../../../utils/search";

/**
 * Custom hook to manage autocomplete suggestion and highlighted index for keyboard navigation
 * @param {string} searchValue - Current search value
 * @param {Array} emails - Array of email objects
 * @param {boolean} isFocused - Whether search bar is focused
 * @returns {Object} Object containing suggestion state and highlighted index state
 */
export function useAutocompleteState(searchValue, emails, isFocused) {
  const [autoCompleteSuggestion, setAutoCompleteSuggestion] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Update auto-complete suggestion when search value changes
  useEffect(() => {
    if (searchValue.trim() && emails && emails.length > 0) {
      const suggestion = getAutoCompleteSuggestion(searchValue, emails);
      setAutoCompleteSuggestion(suggestion);
    } else {
      setAutoCompleteSuggestion(null);
    }
  }, [searchValue, emails]);

  // Reset highlighted index when search value changes or dropdown closes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchValue, isFocused]);

  return {
    autoCompleteSuggestion,
    setAutoCompleteSuggestion,
    highlightedIndex,
    setHighlightedIndex,
  };
}
