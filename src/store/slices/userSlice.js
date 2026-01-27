import { createSlice } from "@reduxjs/toolkit";
import { initialUser } from "../../contexts/fixtures/me";

const userSlice = createSlice({
  name: "user",
  initialState: {
    loggedInUser: JSON.parse(JSON.stringify(initialUser)),
    accessToken: null,
    isAuthenticated: false,
    role: null,
    runId: null,
    expiresIn: null,
  },
  reducers: {
    setLoggedInUser: (state, action) => {
      state.loggedInUser = action.payload;
    },
    setAuth: (state, action) => {
      const payload = action.payload || {};
      const token = payload.access_token ?? null;

      const updatedPayload = {
        ...payload,
        user: {
          ...payload.user,
          name: payload.user.first_name + " " + payload.user.last_name,
          firstName: payload.user.first_name,
          lastName: payload.user.last_name,
          email: payload.user.email,
          avatar: payload.user.avatar || null,
          lastName: payload.user.last_name,
          avatar: payload.user.avatar || null,
          email: payload.user.email,
          emails: [{ value: payload.user.email, label: "Home" }],
        },
      };
      state.accessToken = token;
      state.isAuthenticated = !!token;

      if (updatedPayload.user) state.loggedInUser = updatedPayload.user;
      if (payload.role !== undefined) state.role = payload.role;
      if (payload.run_id !== undefined) {
        state.runId = payload.run_id;
        // Store run_id in localStorage as current_run_id
        if (typeof window !== "undefined" && payload.run_id) {
          localStorage.setItem("current_run_id", payload.run_id);
        }
      }
      if (payload.expires_in !== undefined) state.expiresIn = payload.expires_in;
    },
    logout: (state) => {
      state.accessToken = null;
      state.isAuthenticated = false;
      state.loggedInUser = null;
      state.role = null;
      state.runId = null;
      state.expiresIn = null;
      // Remove current_run_id from localStorage on logout
      if (typeof window !== "undefined") {
        localStorage.removeItem("current_run_id");
      }
    },
  },
});

export const { setLoggedInUser, setAuth, logout } = userSlice.actions;
export default userSlice.reducer;
