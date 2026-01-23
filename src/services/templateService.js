import apiClient from "./apiClient";

const templateService = {
  /**
   * Fetch templates list with pagination and filtering
   * @param {Object} [params] - Query parameters
   * @param {number} [params.page] - Page number (default: 1)
   * @param {number} [params.page_size] - Items per page (default: 20)
   * @param {boolean} [params.include_shared] - Include shared templates from others (default: true)
   * @param {string} [params.search] - Search term for template name
   * @returns {Promise<Object>} Paginated response with { results, total, page, page_size, total_pages }
   */
  getTemplates: async (params = {}) => {
    try {
      const { page, page_size, include_shared, search } = params;
      const queryParams = new URLSearchParams();

      if (page !== undefined) queryParams.append("page", page);
      if (page_size !== undefined) queryParams.append("page_size", page_size);
      if (include_shared !== undefined) queryParams.append("include_shared", include_shared);
      if (search) queryParams.append("search", search);

      const queryString = queryParams.toString();
      const url = `/v1/templates${queryString ? `?${queryString}` : ""}`;

      const response = await apiClient.get(url);

      // Extract data from BE response structure
      // Expected: { success: true, data: { results, total, page, page_size, total_pages }, message: "...", statusCode: 200 }
      return response?.data?.data ?? response?.data;
    } catch (error) {
      console.error("Error fetching templates:", error);
      throw error;
    }
  },

  /**
   * Fetch a single template by ID
   * @param {string} id - Template UUID
   * @returns {Promise<Object>} Template object
   */
  getTemplate: async (id) => {
    try {
      const response = await apiClient.get(`/v1/templates/${id}`);

      return response?.data?.data ?? response?.data;
    } catch (error) {
      console.error("Error fetching template:", error);
      throw error;
    }
  },

  /**
   * Create a new template
   * @param {Object} templateData - Template data
   * @param {string} templateData.name - Template name (required)
   * @param {string} [templateData.body] - Plain text body template
   * @param {string} [templateData.html_body] - HTML body template
   * @param {boolean} [templateData.is_shared] - Share template with team (default: false)
   * @returns {Promise<Object>} Created template object
   */
  createTemplate: async ({ name, body = null, html_body = null, is_shared = false }) => {
    try {
      const response = await apiClient.post("/v1/templates", {
        name,
        body,
        html_body,
        is_shared,
      });

      return response?.data?.data ?? response?.data;
    } catch (error) {
      console.error("Error creating template:", error);
      throw error;
    }
  },

  /**
   * Update an existing template
   * @param {string} id - Template UUID
   * @param {Object} updates - Template updates (all fields optional)
   * @param {string} [updates.name] - New template name
   * @param {string} [updates.body] - New plain text body
   * @param {string} [updates.html_body] - New HTML body
   * @param {boolean} [updates.is_shared] - New shared status
   * @returns {Promise<Object>} Updated template object
   */
  updateTemplate: async (id, { name, body, html_body, is_shared } = {}) => {
    try {
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (body !== undefined) updateData.body = body;
      if (html_body !== undefined) updateData.html_body = html_body;
      if (is_shared !== undefined) updateData.is_shared = is_shared;

      const response = await apiClient.put(`/v1/templates/${id}`, updateData);

      return response?.data?.data ?? response?.data;
    } catch (error) {
      console.error("Error updating template:", error);
      throw error;
    }
  },

  /**
   * Delete a template
   * @param {string} id - Template UUID
   * @returns {Promise<void>} Deletion response
   */
  deleteTemplate: async (id) => {
    try {
      const response = await apiClient.delete(`/v1/templates/${id}`);
      return response?.data?.data ?? response?.data;
    } catch (error) {
      console.error("Error deleting template:", error);
      throw error;
    }
  },
};

export default templateService;
