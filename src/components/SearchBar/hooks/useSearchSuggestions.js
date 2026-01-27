import { useState, useEffect } from "react";
import searchService from "../../../services/searchService";

/**
 * Custom hook to fetch search suggestions from the API
 * @param {string} searchValue - Current search value (should be throttled)
 * @param {boolean} isFocused - Whether search bar is focused
 * @returns {Object} Object containing suggestions data and loading state
 */
export function useSearchSuggestions(searchValue, isFocused) {
  const [suggestions, setSuggestions] = useState({
    contacts: [],
    labels: [],
    folders: [],
    categories: [],
    recent_searches: [],
    operators: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch suggestions when search bar is focused
    if (!isFocused) {
      setSuggestions({
        contacts: [],
        labels: [],
        folders: [],
        categories: [],
        recent_searches: [],
        operators: [],
      });
      return;
    }

    // Fetch suggestions from API
    const fetchSuggestions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await searchService.getSearchSuggestions({
          q: searchValue || "",
          limit: 10,
        });

        setSuggestions({
          contacts: result.contacts || [],
          labels: result.labels || [],
          folders: result.folders || [],
          categories: result.categories || [],
          recent_searches: result.recent_searches || [],
          operators: result.operators || [],
        });
      } catch (err) {
        console.error("Error fetching search suggestions:", err);
        setError(err);
        // On error, set empty suggestions
        setSuggestions({
          contacts: [],
          labels: [],
          folders: [],
          categories: [],
          recent_searches: [],
          operators: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [searchValue, isFocused]);

  return { suggestions, isLoading, error };
}
