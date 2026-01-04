import { createSlice } from '@reduxjs/toolkit';
import { recipients as initialRecipients } from '../../contexts/fixtures/recipients';
import { recipientLabels as initialRecipientLabels } from '../../contexts/fixtures/recipientLabels';

const contactsSlice = createSlice({
  name: 'contacts',
  initialState: {
    recipients: initialRecipients,
    recipientLabels: initialRecipientLabels,
    deletedRecipients: [],
    hiddenRecipients: [],
    contactsLeftSidebarExpanded: true,
  },
  reducers: {
    setRecipients: (state, action) => {
      state.recipients = action.payload;
    },
    setRecipientLabels: (state, action) => {
      state.recipientLabels = action.payload;
    },
    setDeletedRecipients: (state, action) => {
      state.deletedRecipients = action.payload;
    },
    setHiddenRecipients: (state, action) => {
      state.hiddenRecipients = action.payload;
    },
    setContactsLeftSidebarExpanded: (state, action) => {
      state.contactsLeftSidebarExpanded = action.payload;
    },
  },
});

export const { 
  setRecipients, 
  setRecipientLabels, 
  setDeletedRecipients, 
  setHiddenRecipients,
  setContactsLeftSidebarExpanded 
} = contactsSlice.actions;

export default contactsSlice.reducer;

