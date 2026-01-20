import { useEffect } from "react";
import { getActiveFilters } from "../../../utils/searchParams";

/**
 * Custom hook to sync active filters from URL when on search results page
 * @param {Object} location - React Router location object
 * @param {Function} setActiveFilters - State setter for active filters
 * @param {string} loggedInUserEmail - Optional logged-in user's email to detect "From me" filter
 */
export function useActiveFiltersSync(location, setActiveFilters, loggedInUserEmail = null) {
  // Sync activeFilters from URL when on search results page
  useEffect(() => {
    const activeFilters = getActiveFilters(location, loggedInUserEmail);
    setActiveFilters(activeFilters);
  }, [location.pathname, location.search, setActiveFilters, loggedInUserEmail]);
}
