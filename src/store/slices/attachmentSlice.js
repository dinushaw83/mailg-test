import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import attachmentService from "../../services/attachmentService";
import { queryClient } from "../../lib/query-client";

/**
 * Fetch attachments for an email
 */
export const fetchAttachments = createAsyncThunk(
  "attachments/fetchAttachments",
  async (emailId, { rejectWithValue }) => {
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["attachments", emailId],
        queryFn: () => attachmentService.listAttachments(emailId),
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
      return { emailId, attachments: data };
    } catch (error) {
      console.error("Failed to fetch attachments:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to fetch attachments");
    }
  }
);

/**
 * Get attachment details
 */
export const fetchAttachmentById = createAsyncThunk(
  "attachments/fetchAttachmentById",
  async (attachmentId, { rejectWithValue }) => {
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["attachment", attachmentId],
        queryFn: () => attachmentService.getAttachment(attachmentId),
        staleTime: 1000 * 60 * 5,
      });
      return data;
    } catch (error) {
      console.error("Failed to fetch attachment:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to fetch attachment");
    }
  }
);

/**
 * Create an attachment (mock)
 */
export const createAttachmentThunk = createAsyncThunk(
  "attachments/createAttachment",
  async ({ emailId, attachmentData }, { rejectWithValue }) => {
    try {
      const response = await attachmentService.createAttachment(emailId, attachmentData);
      return { emailId, attachment: response };
    } catch (error) {
      console.error("Failed to create attachment:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to create attachment");
    }
  }
);

/**
 * Delete an attachment
 */
export const deleteAttachmentThunk = createAsyncThunk(
  "attachments/deleteAttachment",
  async ({ attachmentId, emailId }, { rejectWithValue }) => {
    try {
      await attachmentService.deleteAttachment(attachmentId);
      return { attachmentId, emailId };
    } catch (error) {
      console.error("Failed to delete attachment:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to delete attachment");
    }
  }
);

/**
 * Download an attachment (get download URL)
 */
export const downloadAttachmentThunk = createAsyncThunk(
  "attachments/downloadAttachment",
  async (attachmentId, { rejectWithValue }) => {
    try {
      const response = await attachmentService.downloadAttachment(attachmentId);
      return { attachmentId, data: response };
    } catch (error) {
      console.error("Failed to download attachment:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to download attachment");
    }
  }
);

const attachmentSlice = createSlice({
  name: "attachments",
  initialState: {
    attachmentsByEmail: {}, // { [emailId]: [attachment1, ...] }
    currentAttachment: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentAttachment: (state) => {
      state.currentAttachment = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Attachments
      .addCase(fetchAttachments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttachments.fulfilled, (state, action) => {
        state.loading = false;
        const { emailId, attachments } = action.payload;
        state.attachmentsByEmail[emailId] = attachments;
      })
      .addCase(fetchAttachments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Attachment By ID
      .addCase(fetchAttachmentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttachmentById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentAttachment = action.payload;
      })
      .addCase(fetchAttachmentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, clearCurrentAttachment } = attachmentSlice.actions;
export default attachmentSlice.reducer;
