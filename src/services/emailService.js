import apiClient from "./apiClient";
import { emailAPIMapper } from "../utils/emails";

const emailService = {
  /**
   * Fetch all emails for the current user
   */
  getEmails: async ({ page = 1, pageSize = 20 } = {}) => {
    try {
      const response = await apiClient.get("/v1/emails", {
        params: {
          page,
          page_size: pageSize,
        },
      });

      const payload = response?.data?.data ?? response?.data ?? {};
      const results = Array.isArray(payload?.results) ? payload.results : [];

      let mappedResults = emailAPIMapper(results);
      return {
        results: mappedResults,
        pagination: {
          total: payload?.total ?? results.length,
          page: payload?.page ?? page,
          pageSize: payload?.page_size ?? pageSize,
          totalPages: payload?.total_pages ?? 1,
        },
      };
    } catch (error) {
      console.error("Error fetching emails:", error);
      throw error;
    }
  },

  /**
   * Fetch a specific thread by ID
   */
  getThread: async (threadId) => {
    const response = await apiClient.get(`/emails/threads/${threadId}`);
    return response.data;
  },

  /**
   * Send a new email
   */
  sendEmail: async (emailData) => {
    const response = await apiClient.post("/emails/send", emailData);
    return response.data;
  },

  /**
   * Update labels for specific emails
   */
  updateLabels: async (emailIds, labels) => {
    const response = await apiClient.post("/emails/labels", { emailIds, labels });
    return response.data;
  },
};

export default emailService;
