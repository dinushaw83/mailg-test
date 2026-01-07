import apiClient from "./apiClient";
import { emailAPIMapper } from "../utils/emails";

const emailService = {
  /**
   * Fetch all emails for the current user
   */
  getEmails: async ({ page = 1, pageSize = 20, category = null } = {}) => {
    try {
      const params = {
        page,
        page_size: pageSize,
      };

      // Add category parameter if provided
      if (category) {
        params.category = category;
      }

      const response = await apiClient.get("/v1/emails", { params });

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
   * Fetch email counts for all categories
   * Returns mock data for now
   */
  getEmailCounts: async () => {
    try {
      // TODO: Replace with actual API call when backend is ready
      // const response = await apiClient.get("/v1/emails/counts");
      // return response.data;

      // Mock data for now
      return {
        primary: 15,
        promotions: 8,
        social: 12,
        updates: 3,
      };
    } catch (error) {
      console.error("Error fetching email counts:", error);
      throw error;
    }
  },

  /**
   * Fetch a thread by email ID or thread ID
   * @param {string} threadId - Email UUID or thread UUID
   * @returns {Promise<Array>} Array of email objects in the thread
   */
  getEmail: async (threadId) => {
    try {
      const response = await apiClient.get(`v1/emails/thread/${threadId}`);
      const payload = response?.data?.data ?? response?.data ?? {};
      
      // API returns an array of emails in the thread
      const emailsArray = Array.isArray(payload) ? payload : [payload];
      
      // Map all emails using the same mapper
      const mappedEmails = emailAPIMapper(emailsArray);
      return mappedEmails;
    } catch (error) {
      console.error("Error fetching thread:", error);
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
   * @param {Array} emailIds - Array of email IDs
   * @param {Array} labels - Array of label UUIDs (not composite keys)
   */
  updateLabels: async (emailIds, labels) => {
    // Labels should already be UUIDs at this point
    // If composite keys are passed, they should be transformed before calling this method
    const response = await apiClient.post("/emails/labels", { emailIds, labels });
    return response.data;
  },
};

export default emailService;
