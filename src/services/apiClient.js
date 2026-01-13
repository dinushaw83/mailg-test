import axios from "axios";
import { logout } from "../store/slices/userSlice";
import { store } from "../store";

// Create axios instance without baseURL initially
// baseURL will be set after fetching config
const apiClient = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Store the config promise to ensure we only fetch once
let configPromise = null;

/**
 * Fetches the API configuration from the UI backend server
 * This allows the API URL to be configured via environment variables on the server
 */
async function fetchConfig() {
  if (configPromise) {
    return configPromise;
  }

  configPromise = (async () => {
    try {
      // Use a temporary axios instance to fetch config (no baseURL needed for same-origin)
      const tempClient = axios.create({
        baseURL: window.location.origin,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await tempClient.get('/config');
      const { apiUrl } = response.data;
      
      if (apiUrl) {
        apiClient.defaults.baseURL = apiUrl;
      } else {
        // Fallback to Vite env var or default
        apiClient.defaults.baseURL = import.meta.env.VITE_API_URL || "http://localhost:8766/api";
      }
      
      return apiUrl || apiClient.defaults.baseURL;
    } catch (error) {
      console.warn('Failed to fetch API config, using fallback:', error);
      // Fallback to Vite env var or default if config fetch fails
      apiClient.defaults.baseURL = import.meta.env.VITE_API_URL || "http://localhost:8766/api";
      return apiClient.defaults.baseURL;
    }
  })();

  return configPromise;
}

// Initialize config on module load
// This will be called before any API requests are made
fetchConfig();

// Request interceptor to ensure config is loaded and add the access token
apiClient.interceptors.request.use(
  async (config) => {
    // Ensure config is loaded before making any requests
    if (!apiClient.defaults.baseURL) {
      await fetchConfig();
    }

    const state = store.getState();
    const token = state.user?.accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors (e.g., 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Centralized auth failure handling:
      // - Clear Redux auth state
      // - ProtectedRoute will redirect to /login
      // - Listener middleware clears React Query cache to prevent cross-user leaks
      store.dispatch(logout());
    }
    return Promise.reject(error);
  }
);

export default apiClient;
