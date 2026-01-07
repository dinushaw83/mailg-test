import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import emailService from "../../services/emailService";
import { initialEmails } from "../../contexts/fixtures/emails";
import { initialLabels } from "../../contexts/fixtures/labels";
import { queryClient } from "../../lib/query-client";

/**
 * @param {Object} options - Options for fetching
 * @param {string} options.category - Email category filter (primary, promotions, social, updates)
 */
export const fetchEmails = createAsyncThunk("mail/fetchEmails", async (options = {}, { rejectWithValue }) => {
  const { page = 1, pageSize = 20, category = null } = options;

  try {
    const data = await queryClient.fetchQuery({
      queryKey: ["emails", { category, page, pageSize }],
      queryFn: () => {
        return emailService.getEmails({ page, pageSize, category });
      },
      staleTime: 1000 * 60 * 5, 
    });
    return { ...data, category };
  } catch (error) {
    console.error("❌ Failed to fetch emails:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to fetch emails");
  }
});

/**
 * Fetch email counts for all categories
 */
export const fetchEmailCounts = createAsyncThunk("mail/fetchEmailCounts", async (_, { rejectWithValue }) => {
  try {
    const data = await queryClient.fetchQuery({
      queryKey: ["emailCounts"],
      queryFn: () => {
        return emailService.getEmailCounts();
      },
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
    return data;
  } catch (error) {
    console.error("❌ Failed to fetch email counts:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to fetch email counts");
  }
});

/**
 * MUTATION THUNK: Sends email and invalidates relevant caches.
 * Mirrors the 'onSuccess' logic provided by the user.
 */
export const sendEmailThunk = createAsyncThunk("mail/sendEmail", async (emailData, { rejectWithValue }) => {
  try {
    const response = await emailService.sendEmail(emailData);
    // React Query cache invalidation is handled by RTK listener middleware.
    return response;
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to send email");
  }
});

/**
 * MUTATION THUNK: Updates labels and revalidates.
 */
export const updateLabelsThunk = createAsyncThunk(
  "mail/updateLabels",
  async ({ emailIds, labels }, { rejectWithValue }) => {
    try {
      const response = await emailService.updateLabels(emailIds, labels);
      // React Query cache invalidation is handled by RTK listener middleware.
      return response;
    } catch (error) {
      console.error("❌ Failed to update labels:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to update labels");
    }
  }
);

const mailSlice = createSlice({
  name: "mail",
  initialState: {
    // Folder/Category-based email storage
    inbox: JSON.parse(JSON.stringify(initialEmails)),
    starred: JSON.parse(JSON.stringify(initialEmails)),
    snoozed: JSON.parse(JSON.stringify(initialEmails)),
    sent: JSON.parse(JSON.stringify(initialEmails)),
    drafts: JSON.parse(JSON.stringify(initialEmails)),
    important: JSON.parse(JSON.stringify(initialEmails)),
    scheduled: JSON.parse(JSON.stringify(initialEmails)),
    all: [],
    spam: JSON.parse(JSON.stringify(initialEmails)),
    trash: JSON.parse(JSON.stringify(initialEmails)),
    // Category-based email storage (for inbox tabs)
    primary: JSON.parse(JSON.stringify(initialEmails)),
    promotions: JSON.parse(JSON.stringify(initialEmails)),
    social: JSON.parse(JSON.stringify(initialEmails)),
    updates: JSON.parse(JSON.stringify(initialEmails)),
    // Other state
    labels: JSON.parse(JSON.stringify(initialLabels)),
    selectedEmails: [],
    previewEmailId: null,
    softRemovedLabels: {},
    emailCounts: {},
    activeCategory: null,
    activeFolder: null,
    loading: false,
    mutationLoading: false, // Separate loading for mutations
    error: null,
  },
  reducers: {
    setEmails: (state, action) => {
      // Legacy support: set emails to inbox
      state.inbox = action.payload;
    },
    setEmailsForCategory: (state, action) => {
      const { category, emails } = action.payload;
      if (state.hasOwnProperty(category)) {
        state[category] = emails;
      }
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
      // Reset inbox to initial emails
      state.inbox = JSON.parse(JSON.stringify(initialEmails));
      // Clear other categories
      state.primary = [];
      state.promotions = [];
      state.social = [];
      state.updates = [];
      state.starred = [];
      state.sent = [];
      state.drafts = [];
      state.spam = [];
      state.trash = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Emails
      .addCase(fetchEmails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmails.fulfilled, (state, action) => {
        state.loading = false;
        const results = action.payload?.results ?? [];
        const category = action.payload?.category;
        
        // Store emails in the appropriate folder/category
        if (category) {
          // Map category to state property
          const categoryKey = category.toLowerCase();
          if (state.hasOwnProperty(categoryKey)) {
            state[categoryKey] = results;
          }
        } else {
          // If no category specified, store in inbox
          state.inbox = results;
        }
        
        state.activeCategory = category ?? null;
      })
      .addCase(fetchEmails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch Email Counts
      .addCase(fetchEmailCounts.pending, (state) => {
        // Don't set loading for counts to avoid UI flicker
        state.error = null;
      })
      .addCase(fetchEmailCounts.fulfilled, (state, action) => {
        state.emailCounts = action.payload ?? {};
      })
      .addCase(fetchEmailCounts.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Mutations (Send/Update)
      .addMatcher(
        (action) => action.type.endsWith("/pending") && action.type.includes("Thunk"),
        (state) => {
          state.mutationLoading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith("/fulfilled") && action.type.includes("Thunk"),
        (state) => {
          state.mutationLoading = false;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith("/rejected") && action.type.includes("Thunk"),
        (state, action) => {
          state.mutationLoading = false;
          state.error = action.payload;
        }
      );
  },
});

export const {
  setEmails,
  setEmailsForCategory,
  setLabels,
  setSelectedEmails,
  setPreviewEmailId,
  setSoftRemovedLabels,
  refreshEmails,
  clearError,
} = mailSlice.actions;

export default mailSlice.reducer;
