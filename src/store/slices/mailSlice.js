import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import emailService from "../../services/emailService";
import { initialEmails } from "../../contexts/fixtures/emails";
import { initialLabels } from "../../contexts/fixtures/labels";
import labelService from "../../services/labelService";
import { queryClient } from "../../lib/query-client";
import { transformLabelsArray } from "../../utils/labelTransform";

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

/**
 * Fetch all labels from backend
 */
export const fetchLabels = createAsyncThunk("mail/fetchLabels", async (_, { rejectWithValue }) => {
  try {
    const data = await queryClient.fetchQuery({
      queryKey: ["labels"],
      queryFn: () => {
        return labelService.getLabels();
      },
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
    return data;
  } catch (error) {
    console.error("❌ Failed to fetch labels:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to fetch labels");
  }
});

/**
 * MUTATION THUNK: Create a new label
 */
export const createLabelThunk = createAsyncThunk(
  "mail/createLabel",
  async ({ name, color, parent_id }, { rejectWithValue }) => {
    try {
      const response = await labelService.createLabel({ name, color, parent_id });
      // React Query cache invalidation is handled by RTK listener middleware.
      return response;
    } catch (error) {
      console.error("❌ Failed to create label:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to create label");
    }
  }
);

/**
 * MUTATION THUNK: Update an existing label
 */
export const updateLabelThunk = createAsyncThunk(
  "mail/updateLabel",
  async ({ id, name, color, parent_id }, { rejectWithValue }) => {
    try {
      const response = await labelService.updateLabel(id, { name, color, parent_id });
      // React Query cache invalidation is handled by RTK listener middleware.
      return { id, ...response };
    } catch (error) {
      console.error("❌ Failed to update label:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to update label");
    }
  }
);

/**
 * MUTATION THUNK: Delete a label
 */
export const deleteLabelThunk = createAsyncThunk(
  "mail/deleteLabel",
  async (id, { rejectWithValue }) => {
    try {
      const response = await labelService.deleteLabel(id);
      // React Query cache invalidation is handled by RTK listener middleware.
      return { id, ...response };
    } catch (error) {
      console.error("❌ Failed to delete label:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to delete label");
    }
  }
);

const mailSlice = createSlice({
  name: "mail",
  initialState: {
    // Folder/Category-based email storage
    inbox: [],
    starred: [],
    snoozed: [],
    sent: [],
    drafts: [],
    important: [],
    scheduled: [],
    all: [],
    spam: [],
    trash: [],
    // Category-based email storage (for inbox tabs)
    primary: [],
    promotions: [],
    social: [],
    updates: [],
    // Other state
    labels: [], // Will be replaced with UUID-based labels from BE
    labelIdToKeyMap: {}, // Map of { [uuid]: compositeKey } for quick lookup
    keyToLabelIdMap: {}, // Map of { [compositeKey]: uuid } for reverse lookup
    selectedEmails: [],
    previewEmailId: null,
    softRemovedLabels: {},
    emailCounts: {},
    activeCategory: null,
    activeFolder: null,
    loading: false,
    mutationLoading: false, // Separate loading for mutations
    labelLoading: false, // Separate loading for label operations
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
    setLabelIdToKeyMap: (state, action) => {
      state.labelIdToKeyMap = action.payload;
    },
    setKeyToLabelIdMap: (state, action) => {
      state.keyToLabelIdMap = action.payload;
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

      // Fetch Labels
      .addCase(fetchLabels.pending, (state) => {
        state.labelLoading = true;
        state.error = null;
      })
      .addCase(fetchLabels.fulfilled, (state, action) => {
        state.labelLoading = false;
        const labelsArray = action.payload ?? [];
        
        // Transform backend labels to frontend format
        const { labels: transformedLabels, idToKeyMap, keyToIdMap } = transformLabelsArray(labelsArray);
        
        // Merge with system labels (keep system labels as-is, they use composite keys)
        const mergedLabels = { ...state.labels };
        
        // Add/update backend labels (UUID-based)
        Object.entries(transformedLabels).forEach(([id, label]) => {
          mergedLabels[id] = label;
        });
        
        state.labels = mergedLabels;
        state.labelIdToKeyMap = { ...state.labelIdToKeyMap, ...idToKeyMap };
        state.keyToLabelIdMap = { ...state.keyToLabelIdMap, ...keyToIdMap };
      })
      .addCase(fetchLabels.rejected, (state, action) => {
        state.labelLoading = false;
        state.error = action.payload;
      })

      // Create Label
      // No state update needed - React Query cache invalidation will trigger refetch
      // which will update state via fetchLabels.fulfilled
      .addCase(createLabelThunk.fulfilled, (state) => {
        // Cache invalidation is handled by React Query listeners
        // Labels will be refetched automatically
      })

      // Update Label
      .addCase(updateLabelThunk.fulfilled, (state, action) => {
        const updatedLabel = action.payload;
        const labelId = action.payload.id;
        
        if (labelId && state.labels[labelId]) {
          // Re-fetch labels to get updated tree structure (or rebuild mapping)
          // For now, update the label in place
          const existingLabel = state.labels[labelId];
          state.labels[labelId] = {
            ...existingLabel,
            name: updatedLabel.name ?? existingLabel.name,
            color: updatedLabel.color ?? existingLabel.color,
            parent_id: updatedLabel.parent_id ?? existingLabel.parent_id,
          };
          
          // Rebuild mappings if parent or name changed
          if (updatedLabel.name !== existingLabel.name || updatedLabel.parent_id !== existingLabel.parent_id) {
            // Rebuild all mappings by transforming all labels
            const allLabelsArray = Object.values(state.labels)
              .filter((l) => l.id && !l.system) // Only backend labels
              .map((l) => ({
                id: l.id,
                name: l.name,
                color: l.color,
                parent_id: l.parent_id,
              }));
            
            const { idToKeyMap, keyToIdMap } = transformLabelsArray(allLabelsArray);
            state.labelIdToKeyMap = { ...idToKeyMap };
            state.keyToLabelIdMap = { ...keyToIdMap };
          }
        }
      })

      // Delete Label
      .addCase(deleteLabelThunk.fulfilled, (state, action) => {
        const deletedId = action.payload.id;
        if (deletedId) {
          // Remove label from state
          delete state.labels[deletedId];
          
          // Remove from mappings
          const compositeKey = state.labelIdToKeyMap[deletedId];
          if (compositeKey) {
            delete state.labelIdToKeyMap[deletedId];
            delete state.keyToLabelIdMap[compositeKey];
          }
          
          // Also remove children (cascade delete)
          Object.entries(state.labels).forEach(([id, label]) => {
            if (label.parent_id === deletedId) {
              delete state.labels[id];
              const childKey = state.labelIdToKeyMap[id];
              if (childKey) {
                delete state.labelIdToKeyMap[id];
                delete state.keyToLabelIdMap[childKey];
              }
            }
          });
        }
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
  setLabelIdToKeyMap,
  setKeyToLabelIdMap,
  setSelectedEmails,
  setPreviewEmailId,
  setSoftRemovedLabels,
  refreshEmails,
  clearError,
} = mailSlice.actions;

export default mailSlice.reducer;
