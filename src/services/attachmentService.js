import apiClient from "./apiClient";

const attachmentService = {
  /**
   * Create attachment metadata for an email
   * @param {string} emailId - Email UUID
   * @param {Object} attachmentData - Attachment metadata
   * @param {string} attachmentData.filename - Name of the file
   * @param {string} attachmentData.content_type - MIME type
   * @param {number} attachmentData.size_bytes - Size in bytes
   * @returns {Promise<Object>} Created attachment object
   */
  createAttachment: async (emailId, attachmentData) => {
    try {
      const response = await apiClient.post(`/v1/emails/${emailId}/attachments`, attachmentData);
      return response?.data?.data ?? response?.data ?? {};
    } catch (error) {
      console.error("Error creating attachment:", error);
      throw error;
    }
  },

  /**
   * Delete an attachment
   * @param {string} attachmentId - Attachment UUID
   * @returns {Promise<void>}
   */
  deleteAttachment: async (attachmentId) => {
    try {
      await apiClient.delete(`/v1/attachments/${attachmentId}`);
    } catch (error) {
      console.error("Error deleting attachment:", error);
      throw error;
    }
  },

  /**
   * Get attachment details
   * @param {string} attachmentId - Attachment UUID
   * @returns {Promise<Object>} Attachment details
   */
  getAttachment: async (attachmentId) => {
    try {
      const response = await apiClient.get(`/v1/attachments/${attachmentId}`);
      return response?.data?.data ?? response?.data ?? {};
    } catch (error) {
      console.error("Error getting attachment:", error);
      throw error;
    }
  },

  /**
   * Get download URL/metadata for an attachment
   * @param {string} attachmentId - Attachment UUID
   * @returns {Promise<Object>} Download metadata or URL
   */
  downloadAttachment: async (attachmentId) => {
    try {
      const response = await apiClient.get(`/v1/attachments/${attachmentId}/download`);
      return response?.data?.data ?? response?.data ?? {};
    } catch (error) {
      console.error("Error downloading attachment:", error);
      throw error;
    }
  },

  /**
   * List attachments for an email
   * @param {string} emailId - Email UUID
   * @returns {Promise<Array>} List of attachments
   */
  listAttachments: async (emailId) => {
    try {
      const response = await apiClient.get(`/v1/emails/${emailId}/attachments`);
      return response?.data?.data ?? response?.data ?? [];
    } catch (error) {
      console.error("Error listing attachments:", error);
      throw error;
    }
  },
};

export default attachmentService;
