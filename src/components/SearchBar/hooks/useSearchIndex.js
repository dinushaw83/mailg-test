import { useEffect } from "react";
import { buildSearchIndex } from "../../../utils/search";

/**
 * Custom hook to build and maintain the search index when emails change
 * @param {Array} emails - Array of email objects
 */
export function useSearchIndex(emails) {
  useEffect(() => {
    if (emails && emails.length > 0) {
      buildSearchIndex(emails);
    }
  }, [emails]);
}
