import { useEffect } from "react";

/**
 * Custom hook to sync active filters from URL when on search results page
 * @param {Object} location - React Router location object
 * @param {Function} setActiveFilters - State setter for active filters
 * @param {string} loggedInUserEmail - Optional logged-in user's email to detect "From me" filter
 */
export function useActiveFiltersSync(location, setActiveFilters, loggedInUserEmail = null) {
  // Sync activeFilters from URL when on search results page
  useEffect(() => {
    const isOnSearchResults = location.pathname.startsWith("/search");
    if (isOnSearchResults) {
      const urlParams = new URLSearchParams(location.search);
      const isRefinementSearch = urlParams.get("isrefinement") === "true";

      if (isRefinementSearch) {
        const filters = [];
        if (urlParams.get("attach_or_drive") === "true") {
          filters.push("Has attachment");
        }
        if (urlParams.get("is_unread") === "true") {
          filters.push("Is unread");
        }
        if (
          urlParams.get("daterangetype") === "custom_range" &&
          (urlParams.has("datestart") || urlParams.has("dateend"))
        ) {
          filters.push("Last 7 days");
        }
        // Check if "from" parameter matches logged-in user's email
        const fromParam = urlParams.get("from");
        if (fromParam && loggedInUserEmail && fromParam.toLowerCase() === loggedInUserEmail.toLowerCase()) {
          filters.push("From me");
        }
        setActiveFilters(filters);
      } else {
        // Clear filters if not a refinement search
        setActiveFilters([]);
      }
    }
  }, [location.pathname, location.search, setActiveFilters, loggedInUserEmail]);
}
