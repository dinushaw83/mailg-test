import apiClient from "./apiClient";
import { emailAPIMapper } from "../utils/emails";

const searchService = {
  /**
   * Search emails using the backend API
   * @param {Object} params - Search parameters
   * @param {string} params.q - Text search query
   * @param {string} params.from - Filter by sender email
   * @param {string} params.to - Filter by recipient email
   * @param {string} params.subject - Search in subject
   * @param {string} params.folder - Filter by folder
   * @param {string} params.label_id - Filter by label ID
   * @param {string} params.label_name - Filter by label name
   * @param {boolean} params.is_read - Filter by read status
   * @param {boolean} params.is_starred - Filter by starred
   * @param {boolean} params.is_important - Filter by important
   * @param {boolean} params.has_attachment - Has attachments
   * @param {string} params.date_from - Emails after date (YYYY-MM-DD)
   * @param {string} params.date_to - Emails before date (YYYY-MM-DD)
   * @param {number} params.page - Page number
   * @param {number} params.page_size - Items per page
   * @param {string} params.sort_by - Sort by: date, subject, sender
   * @param {string} params.sort_order - Sort order: asc, desc
   * @returns {Promise<Object>} Search results with pagination
   */
  searchEmails: async (params = {}) => {
    try {
      // Build query parameters, only including defined values
      const queryParams = {};

      if (params.q !== undefined && params.q !== null && params.q !== "") {
        queryParams.q = params.q;
      }
      if (params.from !== undefined && params.from !== null && params.from !== "") {
        queryParams.from = params.from;
      }
      if (params.to !== undefined && params.to !== null && params.to !== "") {
        queryParams.to = params.to;
      }
      if (params.subject !== undefined && params.subject !== null && params.subject !== "") {
        queryParams.subject = params.subject;
      }
      if (params.folder !== undefined && params.folder !== null && params.folder !== "") {
        queryParams.folder = params.folder;
      }
      if (params.label_id !== undefined && params.label_id !== null && params.label_id !== "") {
        queryParams.label_id = params.label_id;
      }
      if (params.label_name !== undefined && params.label_name !== null && params.label_name !== "") {
        queryParams.label_name = params.label_name;
      }
      if (params.is_read !== undefined && params.is_read !== null) {
        queryParams.is_read = params.is_read;
      }
      if (params.is_starred !== undefined && params.is_starred !== null) {
        queryParams.is_starred = params.is_starred;
      }
      if (params.is_important !== undefined && params.is_important !== null) {
        queryParams.is_important = params.is_important;
      }
      if (params.has_attachment !== undefined && params.has_attachment !== null) {
        queryParams.has_attachment = params.has_attachment;
      }
      if (params.date_from !== undefined && params.date_from !== null && params.date_from !== "") {
        queryParams.date_from = params.date_from;
      }
      if (params.date_to !== undefined && params.date_to !== null && params.date_to !== "") {
        queryParams.date_to = params.date_to;
      }
      if (params.larger !== undefined && params.larger !== null && params.larger !== "") {
        queryParams.size_larger = params.larger;
      }
      if (params.smaller !== undefined && params.smaller !== null && params.smaller !== "") {
        queryParams.size_smaller = params.smaller;
      }

      if (params.category !== undefined && params.category !== null && params.category !== "") {
        queryParams.category = params.category;
      }

      // Pagination
      queryParams.page = params.page || 1;
      queryParams.page_size = params.page_size || 20;

      // Sorting
      queryParams.sort_by = params.sort_by || "date";
      queryParams.sort_order = params.sort_order || "desc";
      queryParams.tz_offset = new Date().getTimezoneOffset();

      const response = await apiClient.get("/v1/search", { params: queryParams });

      const payload = response?.data?.data ?? {};
      const results = Array.isArray(payload.results) ? payload.results : [];

      // Map results using emailAPIMapper
      const mappedResults = emailAPIMapper(results);
      return {
        results: mappedResults,
        pagination: {
          total: payload?.total ?? 0,
          page: payload?.page ?? queryParams.page,
          pageSize: payload?.page_size ?? queryParams.page_size,
          totalPages: payload?.total_pages ?? 1,
        },
        query: payload?.query || params.q || "",
        execution_time_ms: payload?.execution_time_ms,
      };
    } catch (error) {
      console.error("Error searching emails:", error);
      throw error;
    }
  },
};

export default searchService;
