import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notification',
  initialState: {
    notificationSettings: {
      type: 'off', // 'off', 'new', 'important'
      sound: '1',  // Sound ID
      enabled: false,
    },
    permissionStatus: 'default',
  },
  reducers: {
    setNotificationSettings: (state, action) => {
      state.notificationSettings = { ...state.notificationSettings, ...action.payload };
    },
    setPermissionStatus: (state, action) => {
      state.permissionStatus = action.payload;
    },
  },
});

export const { setNotificationSettings, setPermissionStatus } = notificationSlice.actions;
export default notificationSlice.reducer;

