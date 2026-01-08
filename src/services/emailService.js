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
   * Fetch emails by filter (e.g., is_starred, is_important, is_snoozed, folder)
   * @param {Object} options - Options for fetching
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.pageSize - Page size (default: 20)
   * @param {boolean} options.is_starred - Filter by starred status
   * @param {boolean} options.is_important - Filter by important status
   * @param {boolean} options.is_snoozed - Filter by snoozed status
   * @param {string} options.folder - Filter by folder (sent, trash, spam, drafts)
   */
  getEmailsByFilter: async ({
    page = 1,
    pageSize = 20,
    is_starred = null,
    is_important = null,
    is_snoozed = null,
    folder = null,
  } = {}) => {
    try {
      const params = {
        page,
        page_size: pageSize,
      };

      // Add is_starred parameter if provided
      if (is_starred !== null) {
        params.is_starred = is_starred;
      }

      // Add is_important parameter if provided
      if (is_important !== null) {
        params.is_important = is_important;
      }

      // Add is_snoozed parameter if provided
      if (is_snoozed !== null) {
        params.is_snoozed = is_snoozed;
      }

      // Add folder parameter if provided
      if (folder !== null) {
        params.folder = folder;
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
      console.error("Error fetching emails by filter:", error);
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

  /**
   * Update email starred status
   * @param {string} emailId - Email ID
   * @param {boolean} is_starred - Starred status
   * @returns {Promise<Object>} Updated email object
   */
  updateEmailStarred: async (emailId, is_starred) => {
    const response = await apiClient.patch(`/v1/emails/${emailId}/star`, { is_starred });
    const payload = response?.data?.data ?? response?.data ?? {};

    // Map the response using emailAPIMapper to normalize
    const mapped = emailAPIMapper([payload]);
    return mapped[0] || payload;
  },

  /**
   * Update email important status
   * @param {string} emailId - Email ID
   * @param {boolean} is_important - Important status
   * @returns {Promise<Object>} Updated email object
   */
  updateEmailImportant: async (emailId, is_important) => {
    const response = await apiClient.patch(`/v1/emails/${emailId}`, { is_important });
    const payload = response?.data?.data ?? response?.data ?? {};

    // Map the response using emailAPIMapper to normalize
    const mapped = emailAPIMapper([payload]);
    return mapped[0] || payload;
  },

  /**
   * Bulk update emails (starred, important, etc.)
   * @param {Array} emailIds - Array of email IDs
   * @param {Object} updates - Updates to apply { is_starred, is_important, etc. }
   * @returns {Promise<Object>} Response data
   */
  bulkUpdateEmails: async (emailIds, updates) => {
    const response = await apiClient.patch("/v1/emails/bulk", {
      email_ids: emailIds,
      ...updates,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Snooze email until a specific date/time
   * @param {string} emailId - Email ID
   * @param {string} snooze_until - ISO 8601 datetime string
   * @returns {Promise<Object>} Updated email object
   */
  snoozeEmail: async (emailId, snooze_until) => {
    const response = await apiClient.patch(`/v1/emails/${emailId}`, { snooze_until });
    const payload = response?.data?.data ?? response?.data ?? {};

    const mapped = emailAPIMapper([payload]);
    return mapped[0] || payload;
  },

  /**
   * Move email to trash
   * @param {string} emailId - Email ID
   * @returns {Promise<Object>} Updated email object
   */
  moveToTrash: async (emailId) => {
    const response = await apiClient.delete(`/v1/emails/${emailId}`, {
      params: { permanent: false },
    });
    const payload = response?.data?.data ?? response?.data ?? {};

    const mapped = emailAPIMapper([payload]);
    return mapped[0] || payload;
  },

  /**
   * Move email to spam
   * @param {string} emailId - Email ID
   * @returns {Promise<Object>} Updated email object
   */
  moveToSpam: async (emailId) => {
    const response = await apiClient.patch(`/v1/emails/${emailId}`, { folder: "spam" });
    const payload = response?.data?.data ?? response?.data ?? {};

    const mapped = emailAPIMapper([payload]);
    return mapped[0] || payload;
  },

  /**
   * Permanently delete email
   * @param {string} emailId - Email ID
   * @returns {Promise<void>}
   */
  deleteEmail: async (emailId) => {
    const response = await apiClient.delete(`/v1/emails/${emailId}`, {
      params: { permanent: true },
    });
    return response?.data?.data ?? response?.data ?? {};
  },
};

export default emailService;
