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
   * Fetch emails by filter (e.g., is_starred, is_important, is_snoozed, folder, include_archived)
   * @param {Object} options - Options for fetching
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.pageSize - Page size (default: 20)
   * @param {boolean} options.is_starred - Filter by starred status
   * @param {boolean} options.is_important - Filter by important status
   * @param {boolean} options.is_snoozed - Filter by snoozed status
   * @param {string} options.folder - Filter by folder (sent, trash, spam, drafts, inbox)
   * @param {boolean} options.include_archived - Include archived emails (for all mail)
   */
  getEmailsByFilter: async ({
    page = 1,
    pageSize = 20,
    is_starred = null,
    is_important = null,
    is_snoozed = null,
    folder = null,
    include_archived = null,
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

      // Add include_archived parameter if provided
      if (include_archived !== null) {
        params.include_archived = include_archived;
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
   * @param {string} thread_id - Email UUID or thread UUID
   * @returns {Promise<Array>} Array of email objects in the thread
   */
  getEmail: async (thread_id) => {
    try {
      const response = await apiClient.get(`v1/threads/${thread_id}/emails`);
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
  getThread: async (thread_id) => {
    const response = await apiClient.get(`/threads/${thread_id}/emails`);
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
   * Send an email by ID (for drafts)
   * @param {string} emailId - Email UUID
   * @returns {Promise<Object>} Sent email object
   */
  sendEmailById: async (emailId) => {
    try {
      const response = await apiClient.post(`/v1/emails/${emailId}/send`);
      const payload = response?.data?.data ?? response?.data;
      return payload;
    } catch (error) {
      console.error("Error sending email by ID:", error);
      throw error;
    }
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
   * Fetch a single email by ID
   * @param {string} emailId - Email UUID
   * @returns {Promise<Object>} Email object
   */
  getEmailById: async (emailId) => {
    try {
      const response = await apiClient.get(`/v1/emails/${emailId}`);
      const payload = response?.data?.data ?? response?.data;
      // Transform using emailAPIMapper
      const mappedEmails = emailAPIMapper([payload]);
      return mappedEmails[0] || payload;
    } catch (error) {
      console.error("Error fetching email by ID:", error);
      throw error;
    }
  },

  /**
   * Create a new draft
   * @param {Object} draftData - Draft payload (subject, recipients, body, html_body, is_draft, scheduled_send_at)
   * @returns {Promise<Object>} Backend draft object
   */
  createDraft: async (draftData) => {
    try {
      const response = await apiClient.post("/v1/emails", draftData);
      const payload = response?.data?.data ?? response?.data;
      return payload;
    } catch (error) {
      console.error("Error creating draft:", error);
      throw error;
    }
  },

  /**
   * Update an existing draft
   * @param {string} emailId - Email UUID
   * @param {Object} draftData - Draft update payload
   * @returns {Promise<Object>} Backend draft object
   */
  updateDraft: async (emailId, draftData) => {
    try {
      const response = await apiClient.put(`/v1/emails/${emailId}`, draftData);
      const payload = response?.data?.data ?? response?.data;
      return payload;
    } catch (error) {
      console.error("Error updating draft:", error);
      throw error;
    }
  },

  /**
   * Cancel/unsend an email by ID (undo send)
   * @param {string} emailId - Email UUID
   * @returns {Promise<Object>} Email object (moved back to draft)
   */
  cancelSendEmailById: async (emailId) => {
    try {
      const response = await apiClient.post(`/v1/emails/${emailId}/cancel-send`);
      const payload = response?.data?.data ?? response?.data;
      return payload;
    } catch (error) {
      console.error("Error canceling send email by ID:", error);
      throw error;
    }
  },
};

export default emailService;
