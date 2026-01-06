import axios from "axios";
import { logout } from "../store/slices/userSlice";
import { store } from "../store";

const apiClient = axios.create({
  // Prefer Vite env var when provided; fall back to local backend.
  // Note: the backend is expected to be mounted under /api so services can call "/emails", etc.
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8766/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add the access token from Redux store
apiClient.interceptors.request.use(
  (config) => {
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
