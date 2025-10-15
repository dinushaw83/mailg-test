import { useState, useEffect } from "react";

/**
 * Custom hook to track location changes and clear search input when navigating away
 * @param {Object} location - React Router location object
 * @param {string} searchValue - Current search value
 * @param {Function} setSearchValue - State setter for search value
 */
export function useSearchNavigation(location, searchValue, setSearchValue) {
  const [previousLocation, setPreviousLocation] = useState(null);

  useEffect(() => {
    const currentPath = location.pathname;
    const isCurrentlyOnSearchResults = currentPath.startsWith("/search/");
    const wasOnSearchResults = previousLocation && previousLocation.startsWith("/search/");

    // If we were on search results page and now we're not, clear the search input
    if (wasOnSearchResults && !isCurrentlyOnSearchResults && searchValue.trim()) {
      setSearchValue("");
    }

    // Update previous location for next comparison
    setPreviousLocation(currentPath);
  }, [location.pathname, previousLocation, searchValue, setSearchValue]);
}
