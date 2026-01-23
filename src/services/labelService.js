import apiClient from "./apiClient";

const labelService = {
  /**
   * Fetch all labels for the current user
   * @returns {Promise<Array>} Array of label objects
   */
  getLabels: async () => {
    try {
      const response = await apiClient.get("/v1/labels");

      // Extract data array from BE response structure
      // Expected: { success: true, data: [...], message: "...", statusCode: 200 }
      const labelsArray = response?.data?.data ?? response?.data ?? [];

      return Array.isArray(labelsArray) ? labelsArray : [];
    } catch (error) {
      console.error("Error fetching labels:", error);
      throw error;
    }
  },

  /**
   * Create a new label
   * @param {Object} labelData - Label data
   * @param {string} labelData.name - Label name
   * @param {string} [labelData.color] - Hex color (e.g., "#FF0000")
   * @param {string} [labelData.parent_id] - Parent label UUID (optional)
   * @returns {Promise<Object>} Created label object
   */
  createLabel: async ({ name, color = null, parent_id = null }) => {
    try {
      const response = await apiClient.post("/v1/labels", {
        name,
        color,
        parent_id,
      });

      return response?.data?.data ?? response?.data;
    } catch (error) {
      console.error("Error creating label:", error);
      throw error;
    }
  },

  /**
   * Update an existing label
   * @param {string} id - Label UUID
   * @param {Object} updates - Label updates
   * @param {string} [updates.name] - New label name
   * @param {string} [updates.color] - New hex color
   * @param {string|null} [updates.parent_id] - New parent label UUID (null to move to root)
   * @param {boolean} [updates.show_in_label_list] - Show in label list
   * @param {boolean} [updates.show_in_message_list] - Show in message list
   * @param {boolean} [updates.show_if_unread] - Show if unread
   * @returns {Promise<Object>} Updated label object
   */
  updateLabel: async (
    id,
    { name, color, parent_id, show_in_label_list, show_in_message_list, show_if_unread } = {}
  ) => {
    try {
      // Build request body with only defined values
      const body = {};
      if (name !== undefined) body.name = name;
      if (color !== undefined) body.color = color;
      if (parent_id !== undefined) body.parent_id = parent_id;
      if (show_in_label_list !== undefined) body.show_in_label_list = show_in_label_list;
      if (show_in_message_list !== undefined) body.show_in_message_list = show_in_message_list;
      if (show_if_unread !== undefined) body.show_if_unread = show_if_unread;

      const response = await apiClient.put(`/v1/labels/${id}`, body);

      return response?.data?.data ?? response?.data;
    } catch (error) {
      console.error("Error updating label:", error);
      throw error;
    }
  },

  /**
   * Delete a label
   * @param {string} id - Label UUID
   * @returns {Promise<Object>} Deletion response
   */
  deleteLabel: async (id) => {
    try {
      const response = await apiClient.delete(`/v1/labels/${id}`);
      return response?.data?.data ?? response?.data;
    } catch (error) {
      console.error("Error deleting label:", error);
      throw error;
    }
  },
};

export default labelService;
