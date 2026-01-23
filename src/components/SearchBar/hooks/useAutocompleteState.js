import { useState, useEffect, useRef } from "react";
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
  
  // Track previous values to prevent unnecessary updates
  const prevSearchValueRef = useRef(searchValue);
  const prevIsFocusedRef = useRef(isFocused);

  // Update auto-complete suggestion when search value changes
  useEffect(() => {
    if (searchValue.trim() && emails && emails.length > 0) {
      const suggestion = getAutoCompleteSuggestion(searchValue, emails);
      setAutoCompleteSuggestion((prev) => {
        // Only update if suggestion actually changed
        if (prev === suggestion) return prev;
        return suggestion;
      });
    } else {
      setAutoCompleteSuggestion((prev) => {
        if (prev === null) return prev;
        return null;
      });
    }
  }, [searchValue, emails]);

  // Reset highlighted index when search value changes or dropdown closes
  useEffect(() => {
    const searchValueChanged = prevSearchValueRef.current !== searchValue;
    const focusChanged = prevIsFocusedRef.current !== isFocused;
    
    if (searchValueChanged || focusChanged) {
      setHighlightedIndex(-1);
      prevSearchValueRef.current = searchValue;
      prevIsFocusedRef.current = isFocused;
    }
  }, [searchValue, isFocused]);

  return {
    autoCompleteSuggestion,
    setAutoCompleteSuggestion,
    highlightedIndex,
    setHighlightedIndex,
  };
}
