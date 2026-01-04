import { createSlice } from '@reduxjs/toolkit';
import { initialEmails } from '../../contexts/fixtures/emails';
import { initialLabels } from '../../contexts/fixtures/labels';

const mailSlice = createSlice({
  name: 'mail',
  initialState: {
    emails: JSON.parse(JSON.stringify(initialEmails)),
    labels: JSON.parse(JSON.stringify(initialLabels)),
    selectedEmails: [],
    previewEmailId: null,
    softRemovedLabels: {},
  },
  reducers: {
    setEmails: (state, action) => {
      state.emails = action.payload;
    },
    setLabels: (state, action) => {
      state.labels = action.payload;
    },
    setSelectedEmails: (state, action) => {
      state.selectedEmails = action.payload;
    },
    setPreviewEmailId: (state, action) => {
      state.previewEmailId = action.payload;
    },
    setSoftRemovedLabels: (state, action) => {
      state.softRemovedLabels = action.payload;
    },
    refreshEmails: (state) => {
      state.emails = JSON.parse(JSON.stringify(initialEmails));
    },
  },
});

export const { 
  setEmails, 
  setLabels, 
  setSelectedEmails, 
  setPreviewEmailId, 
  setSoftRemovedLabels,
  refreshEmails 
} = mailSlice.actions;

export default mailSlice.reducer;

