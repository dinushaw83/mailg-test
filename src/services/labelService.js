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
   * @param {string} [updates.parent_id] - New parent label UUID
   * @returns {Promise<Object>} Updated label object
   */
  updateLabel: async (id, { name, color, parent_id } = {}) => {
    try {
      const response = await apiClient.patch(`/v1/labels/${id}`, {
        name,
        color,
        parent_id,
      });

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
