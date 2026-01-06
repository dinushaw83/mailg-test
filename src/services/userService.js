import apiClient from "./apiClient";

const userService = {
  createToken: async (email) => {
    const response = await apiClient.post("/v1/auth/token", { email });

    return response.data?.data ?? response.data;
  },
};

export default userService;
