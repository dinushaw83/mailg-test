import { createSlice } from '@reduxjs/toolkit';
import { initialUser } from '../../contexts/fixtures/me';

const userSlice = createSlice({
  name: 'user',
  initialState: {
    loggedInUser: initialUser,
  },
  reducers: {
    setLoggedInUser: (state, action) => {
      state.loggedInUser = action.payload;
    },
  },
});

export const { setLoggedInUser } = userSlice.actions;
export default userSlice.reducer;

