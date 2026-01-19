import { useEffect } from "react";
import { queryToSearchBarString } from "../../../utils/helperFunctions";

/**
 * Custom hook to sync search value with URL query parameters
 * @param {Object} location - React Router location object
 * @param {string} searchQuery - Parsed search query from URL
 * @param {boolean} isAdvancedSearch - Whether current route is advanced search
 * @param {Function} setSearchValue - State setter for search value
 */
export function useSearchUrlSync(location, searchQuery, isAdvancedSearch, setSearchValue) {
  useEffect(() => {
    if (isAdvancedSearch) {
      // For advanced search, use the query string directly with queryToSearchBarString
      const queryString = new URLSearchParams(location.search);
      const searchValue = queryString.get("q");
      if (searchValue) {
        setSearchValue(searchValue);
      }
    } else if (searchQuery) {
      setSearchValue(searchQuery);
    }
  }, [searchQuery, isAdvancedSearch, location, setSearchValue]);
}
