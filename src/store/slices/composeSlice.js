import { createSlice } from "@reduxjs/toolkit";

const composeSlice = createSlice({
  name: "compose",
  initialState: {
    composeWindows: [],
  },
  reducers: {
    setComposeWindows: (state, action) => {
      state.composeWindows = action.payload;
    },
    addComposeWindow: (state, action) => {
      state.composeWindows.push(action.payload);
    },
    removeComposeWindow: (state, action) => {
      state.composeWindows = state.composeWindows.filter((win) => win.id !== action.payload);
    },
  },
});

export const { setComposeWindows, addComposeWindow, removeComposeWindow } = composeSlice.actions;
export default composeSlice.reducer;
