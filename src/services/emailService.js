import apiClient from "./apiClient";
import { emailAPIMapper } from "../utils/emails";

const emailService = {
  /**
   * Fetch emails for the current user with optional folder and category filtering
   * Backend handles all filtering logic internally based on folder and category
   * @param {Object} options - Options for fetching
   * @param {number} options.page - Page number (default: 1)
   * @param {number} options.pageSize - Page size (default: 20)
   * @param {string} options.folder - Filter by folder (inbox, starred, important, snoozed, sent, trash, spam, drafts, scheduled, all mail)
   * @param {string} options.category - Filter by category (primary, promotions, social, updates)
   */
  getEmails: async ({ page = 1, pageSize = 20, folder = null, category = null } = {}) => {
    try {
      const params = {
        page,
        page_size: pageSize,
      };

      // Add folder parameter if provided
      if (folder) {
        params.folder = folder;
      }

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
   * Fetch threads by label ID
   * @param {string} labelId - Label UUID (not composite key)
   * @param {number} page - Page number
   * @param {number} pageSize - Items per page
   * @returns {Promise<Object>} { results: [...], pagination: {...} }
   */
  getThreadsByLabel: async (labelId, page = 1, pageSize = 20) => {
    try {
      const response = await apiClient.get(`/v1/labels/${labelId}/threads`, {
        params: { page, page_size: pageSize },
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
      console.error("Error fetching threads by label:", error);
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
   * Create a reply draft
   * @param {string} emailId - Email UUID to reply to
   * @param {Object} draftData - Reply draft payload (body, html_body, reply_all)
   * @returns {Promise<Object>} Backend draft object
   */
  createReplyDraft: async (emailId, draftData) => {
    try {
      const response = await apiClient.post(`/v1/emails/${emailId}/reply`, draftData);
      const payload = response?.data?.data ?? response?.data;
      return payload;
    } catch (error) {
      console.error("Error creating reply draft:", error);
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

  /**
   * Delete an email by ID
   * @param {string} emailId - Email UUID
   * @returns {Promise<Object>} Delete response
   */
  deleteEmail: async (emailId) => {
    try {
      const response = await apiClient.delete(`/v1/emails/${emailId}?permanent=true`);
      const payload = response?.data?.data ?? response?.data;
      return payload;
    } catch (error) {
      console.error("Error deleting email:", error);
      throw error;
    }
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
   * Unstar all emails in a thread
   * @param {string} threadId - Thread ID
   * @returns {Promise<Object>} Response data
   */
  unstarThread: async (threadId) => {
    const response = await apiClient.post(`/v1/threads/${threadId}/unstar`);
    const payload = response?.data?.data ?? response?.data ?? {};
    return payload;
  },

  /**
   * Update email important status
   * @param {string} emailId - Email ID
   * @param {boolean} is_important - Important status
   * @returns {Promise<Object>} Updated email object
   */
  updateEmailImportant: async (emailId, is_important) => {
    const response = await apiClient.patch(`/v1/emails/${emailId}/important`, { is_important });
    const payload = response?.data?.data ?? response?.data ?? {};

    // Map the response using emailAPIMapper to normalize
    const mapped = emailAPIMapper([payload]);
    return mapped[0] || payload;
  },

  /**
   * Update thread important status
   * @param {string} threadId - Thread ID
   * @param {boolean} is_important - Important status
   * @returns {Promise<Object>} Response data
   */
  updateThreadImportant: async (threadId, is_important) => {
    const response = await apiClient.patch(`/v1/threads/${threadId}/important`, { is_important });
    const payload = response?.data?.data ?? response?.data ?? {};
    return payload;
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
   * Snooze a thread until a specific date/time
   * @param {string} threadId - Thread ID
   * @param {string} snooze_until - ISO 8601 datetime string
   * @returns {Promise<Object>} Response data
   */
  snoozeThread: async (threadId, snooze_until) => {
    const response = await apiClient.post(`/v1/threads/${threadId}/snooze`, { snooze_until });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Unsnooze a thread, making it immediately visible again
   * @param {string} threadId - Thread ID
   * @returns {Promise<Object>} Response data
   */
  unsnoozeThread: async (threadId) => {
    const response = await apiClient.post(`/v1/threads/${threadId}/unsnooze`);
    return response?.data?.data ?? response?.data ?? {};
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
    const response = await apiClient.post(`/v1/emails/${emailId}/spam`);
    const payload = response?.data?.data ?? response?.data ?? {};

    const mapped = emailAPIMapper([payload]);
    return mapped[0] || payload;
  },

  /**
   * Remove spam mark from email (move from spam back to inbox)
   * @param {string} emailId - Email ID
   * @returns {Promise<Object>} Updated email object
   */
  moveFromSpam: async (emailId) => {
    const response = await apiClient.post(`/v1/emails/${emailId}/unspam`);
    const payload = response?.data?.data ?? response?.data ?? {};

    const mapped = emailAPIMapper([payload]);
    return mapped[0] || payload;
  },

  /* ────────────────────────────────────────────────────────────────────────────
   * BULK OPERATIONS
   * ────────────────────────────────────────────────────────────────────────── */

  /**
   * Bulk star/unstar emails
   * @param {Array<string>} emailIds - Array of email IDs
   * @param {boolean} is_starred - Starred status
   * @returns {Promise<Object>} Response data
   */
  bulkStarEmails: async (emailIds, is_starred) => {
    const response = await apiClient.post("/v1/bulk/star", {
      email_ids: emailIds,
      is_starred,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk unstar threads (unstars all emails in the specified threads)
   * @param {Array<string>} threadIds - Array of thread IDs
   * @returns {Promise<Object>} Response data
   */
  bulkUnstarThreads: async (threadIds) => {
    const response = await apiClient.post("/v1/bulk/threads/unstar", {
      thread_ids: threadIds,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk mark emails as important/unimportant
   * @param {Array<string>} emailIds - Array of email IDs
   * @param {boolean} is_important - Important status
   * @returns {Promise<Object>} Response data
   */
  bulkImportantEmails: async (threadIds, is_important) => {
    const response = await apiClient.post("/v1/bulk/important", {
      thread_ids: threadIds,
      is_important,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk mark emails as read/unread
   * @param {Array<string>} emailIds - Array of email IDs
   * @param {boolean} is_read - Read status
   * @returns {Promise<Object>} Response data
   */
  bulkReadEmails: async (emailIds, is_read) => {
    const response = await apiClient.post("/v1/bulk/read", {
      email_ids: emailIds,
      is_read,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk move emails to spam
   * @param {Array<string>} emailIds - Array of email IDs
   * @returns {Promise<Object>} Response data
   */
  bulkSpamEmails: async (emailIds) => {
    const response = await apiClient.post("/v1/bulk/spam", {
      email_ids: emailIds,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk remove spam mark from emails
   * @param {Array<string>} emailIds - Array of email IDs
   * @returns {Promise<Object>} Response data
   */
  bulkUnspamEmails: async (emailIds) => {
    const response = await apiClient.post("/v1/bulk/unspam", {
      email_ids: emailIds,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk delete emails (move to trash or permanent delete)
   * @param {Array<string>} emailIds - Array of email IDs
   * @param {boolean} permanent - Whether to permanently delete
   * @returns {Promise<Object>} Response data
   */
  bulkDeleteEmails: async (emailIds, permanent = false) => {
    const response = await apiClient.post("/v1/bulk/delete", {
      email_ids: emailIds,
      permanent,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk move emails to a folder
   * @param {Array<string>} emailIds - Array of email IDs
   * @param {string} folder - Folder name (inbox, trash, spam, etc.)
   * @returns {Promise<Object>} Response data
   */
  bulkMoveEmails: async (emailIds, folder) => {
    const response = await apiClient.post("/v1/bulk/move", {
      email_ids: emailIds,
      folder,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk archive emails
   * @param {Array<string>} emailIds - Array of email IDs
   * @returns {Promise<Object>} Response data
   */
  bulkArchiveEmails: async (emailIds) => {
    const response = await apiClient.post("/v1/bulk/archive", {
      email_ids: emailIds,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk unarchive emails
   * @param {Array<string>} emailIds - Array of email IDs
   * @returns {Promise<Object>} Response data
   */
  bulkUnarchiveEmails: async (emailIds) => {
    const response = await apiClient.post("/v1/bulk/unarchive", {
      email_ids: emailIds,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk snooze threads
   * @param {Array<string>} threadIds - Array of thread IDs
   * @param {string} snooze_until - ISO 8601 datetime string
   * @returns {Promise<Object>} Response data
   */
  bulkSnoozeThreads: async (threadIds, snooze_until) => {
    const response = await apiClient.post("/v1/bulk/snooze", {
      thread_ids: threadIds,
      snooze_until,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk unsnooze threads
   * @param {Array<string>} threadIds - Array of thread IDs
   * @returns {Promise<Object>} Response data
   */
  bulkUnsnoozeThreads: async (threadIds) => {
    const response = await apiClient.post("/v1/bulk/unsnooze", {
      thread_ids: threadIds,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk add labels to emails
   * @param {Array<string>} emailIds - Array of email IDs
   * @param {Array<string>} labelIds - Array of label IDs
   * @returns {Promise<Object>} Response data
   */
  bulkAddLabels: async (emailIds, labelIds) => {
    const response = await apiClient.post("/v1/bulk/labels/add", {
      email_ids: emailIds,
      label_ids: labelIds,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk remove labels from emails
   * @param {Array<string>} emailIds - Array of email IDs
   * @param {Array<string>} labelIds - Array of label IDs
   * @returns {Promise<Object>} Response data
   */
  bulkRemoveLabels: async (emailIds, labelIds) => {
    const response = await apiClient.post("/v1/bulk/labels/remove", {
      email_ids: emailIds,
      label_ids: labelIds,
    });
    return response?.data?.data ?? response?.data ?? {};
  },

  /**
   * Bulk update labels on threads (add and/or remove labels in a single operation)
   * @param {Array<string>} threadIds - Array of thread UUIDs
   * @param {Object} labels - Labels to add and/or remove
   * @param {Array<string>} labels.add - Array of label UUIDs to add
   * @param {Array<string>} labels.remove - Array of label UUIDs to remove
   * @returns {Promise<Object>} Response data
   */
  bulkUpdateLabels: async (threadIds, labels) => {
    const response = await apiClient.post("/v1/bulk/labels/update", {
      thread_ids: threadIds,
      labels: {
        add: labels.add || [],
        remove: labels.remove || [],
      },
    });
    return response?.data?.data ?? response?.data ?? {};
  },
};

export default emailService;
