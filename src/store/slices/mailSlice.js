import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import emailService from "../../services/emailService";
import searchService from "../../services/searchService";
import { initialEmails } from "../../contexts/fixtures/emails";
import { initialLabels } from "../../contexts/fixtures/labels";
import labelService from "../../services/labelService";
import { queryClient } from "../../lib/query-client";
import { transformLabelsArray } from "../../utils/labelTransform";
import { buildEmailQueryKey } from "../../utils/emailQueryKeys";

/**
 * Fetch emails with optional folder and category filtering
 * Backend handles all filtering logic internally
 * @param {Object} options - Options for fetching
 * @param {number} options.page - Page number
 * @param {number} options.pageSize - Items per page
 * @param {string} options.folder - Filter by folder (inbox, starred, important, snoozed, sent, trash, spam, drafts, scheduled, all mail)
 * @param {string} options.category - Filter by category (primary, promotions, social, updates)
 */
export const fetchEmails = createAsyncThunk("mail/fetchEmails", async (options = {}, { rejectWithValue, getState }) => {
  const state = getState();
  const defaultPageSize = state?.ui?.itemsPerPage ?? 25;

  const { page = 1, pageSize = defaultPageSize, folder = null, category = null } = options;

  try {
    // Build query key using the shared utility function
    const queryKey = buildEmailQueryKey({
      page,
      pageSize,
      folder,
      category,
    });

    const data = await queryClient.fetchQuery({
      queryKey,
      queryFn: () => emailService.getEmails({ page, pageSize, folder, category }),
      staleTime: 1000 * 60 * 5,
    });
    return { ...data, folder, category };
  } catch (error) {
    console.error("Failed to fetch emails:", error);
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
    console.error("Failed to fetch email counts:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to fetch email counts");
  }
});

/**
 * MUTATION THUNK: Bulk unstar threads
 */
export const bulkUnstarThreadsThunk = createAsyncThunk(
  "mail/bulkUnstarThreads",
  async ({ threadIds }, { rejectWithValue }) => {
    try {
      // Use bulk endpoint to unstar all threads in a single request
      const result = await emailService.bulkUnstarThreads(threadIds);
      return { threadIds, result };
    } catch (error) {
      console.error("Failed to unstar threads:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to unstar threads");
    }
  }
);

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
    console.error("Failed to send email:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to send email");
  }
});

/**
 * MUTATION THUNK: Send email by ID (for drafts)
 * Note: Mutations are called directly (not through React Query fetchQuery)
 * Cache invalidation is handled by RTK listener middleware.
 */
export const sendEmailByIdThunk = createAsyncThunk("mail/sendEmailById", async (payload, { rejectWithValue }) => {
  try {
    // Determine if payload is just an ID (legacy) or an object
    const emailId = typeof payload === "object" ? payload.emailId : payload;
    const data = typeof payload === "object" ? payload.data : {};

    // Call service directly - React Query cache invalidation is handled by listeners
    const response = await emailService.sendEmailById(emailId, data);
    return { emailId, data: response };
  } catch (error) {
    console.error("❌ Failed to send email by ID:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to send email");
  }
});

/**
 * MUTATION THUNK: Cancel/unsend email by ID (undo send)
 * Note: Mutations are called directly (not through React Query fetchQuery)
 * Cache invalidation is handled by RTK listener middleware.
 */
export const cancelSendEmailByIdThunk = createAsyncThunk(
  "mail/cancelSendEmailById",
  async (emailId, { rejectWithValue }) => {
    try {
      // Call service directly - React Query cache invalidation is handled by listeners
      const response = await emailService.cancelSendEmailById(emailId);
      return { emailId, data: response };
    } catch (error) {
      console.error("❌ Failed to cancel send email by ID:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to cancel send email");
    }
  }
);

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
      console.error("Failed to update labels:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to update labels");
    }
  }
);

/**
 * MUTATION THUNK: Bulk update labels on threads (add and/or remove in single operation)
 */
export const bulkUpdateLabelsThunk = createAsyncThunk(
  "mail/bulkUpdateLabels",
  async ({ threadIds, labels }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkUpdateLabels(threadIds, labels);
      // React Query cache invalidation is handled by RTK listener middleware.
      return response;
    } catch (error) {
      console.error("Failed to bulk update labels:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk update labels");
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
    console.error("Failed to fetch labels:", error);
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
      console.error("Failed to create label:", error);
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
      console.error("Failed to update label:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to update label");
    }
  }
);

/**
 * MUTATION THUNK: Delete a label
 */
export const deleteLabelThunk = createAsyncThunk("mail/deleteLabel", async (id, { rejectWithValue }) => {
  try {
    const response = await labelService.deleteLabel(id);
    // React Query cache invalidation is handled by RTK listener middleware.
    return { id, ...response };
  } catch (error) {
    console.error("Failed to delete label:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to delete label");
  }
});

/*
 * MUTATION THUNK: Create a new draft
 * Note: Mutations are called directly (not through React Query fetchQuery)
 * Cache invalidation is handled by RTK listener middleware.
 */
export const createDraftThunk = createAsyncThunk("mail/createDraft", async (draftData, { rejectWithValue }) => {
  try {
    const response = await emailService.createDraft(draftData);
    // React Query cache invalidation is handled by RTK listener middleware.
    return response;
  } catch (error) {
    console.error("❌ Failed to create draft:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to create draft");
  }
});

/**
 * MUTATION THUNK: Create a reply draft
 * Note: Mutations are called directly (not through React Query fetchQuery)
 * Cache invalidation is handled by RTK listener middleware.
 */
export const createReplyDraftThunk = createAsyncThunk(
  "mail/createReplyDraft",
  async ({ emailId, draftData }, { rejectWithValue }) => {
    try {
      const response = await emailService.createReplyDraft(emailId, draftData);
      // React Query cache invalidation is handled by RTK listener middleware.
      return response;
    } catch (error) {
      console.error("❌ Failed to create reply draft:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to create reply draft");
    }
  }
);

/**
 * MUTATION THUNK: Update an existing draft
 * Note: Mutations are called directly (not through React Query fetchQuery)
 * Cache invalidation is handled by RTK listener middleware.
 */
export const updateDraftThunk = createAsyncThunk(
  "mail/updateDraft",
  async ({ emailId, draftData }, { rejectWithValue }) => {
    try {
      const response = await emailService.updateDraft(emailId, draftData);
      // React Query cache invalidation is handled by RTK listener middleware.
      return response;
    } catch (error) {
      console.error("❌ Failed to update draft:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to update draft");
    }
  }
);

/**
 * MUTATION THUNK: Delete an email by ID
 * Note: Mutations are called directly (not through React Query fetchQuery)
 * Cache invalidation is handled by RTK listener middleware.
 * @param {Object} params - Parameters
 * @param {string} params.emailId - Email UUID
 * @param {string} params.thread_id - Thread ID for refetching thread after deletion
 */
export const deleteEmailThunk = createAsyncThunk(
  "mail/deleteEmail",
  async ({ emailId, thread_id }, { rejectWithValue }) => {
    try {
      const response = await emailService.deleteEmail(emailId);
      // React Query cache invalidation is handled by RTK listener middleware.
      return { emailId, thread_id, data: response };
    } catch (error) {
      console.error("❌ Failed to delete email:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to delete email");
    }
  }
);

/**
 * Fetch a single email by ID
 */
export const fetchEmailByIdThunk = createAsyncThunk("mail/fetchEmailById", async (emailId, { rejectWithValue }) => {
  try {
    const data = await queryClient.fetchQuery({
      queryKey: ["email", emailId],
      queryFn: () => emailService.getEmailById(emailId),
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });
    return data;
  } catch (error) {
    console.error("❌ Failed to fetch email by ID:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to fetch email");
  }
});
/*
 * Fetch search results from backend API
 */
export const fetchSearchResults = createAsyncThunk(
  "mail/fetchSearchResults",
  async (searchParams, { rejectWithValue }) => {
    try {
      const data = await searchService.searchEmails(searchParams);
      return {
        results: data.results,
        pagination: data.pagination,
        query: data.query,
        execution_time_ms: data.execution_time_ms,
        originalParams: searchParams.originalParams || {},
      };
    } catch (error) {
      console.error("❌ Failed to fetch search results:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to fetch search results");
    }
  }
);

/* ────────────────────────────────────────────────────────────────────────────
 * EMAIL MUTATION THUNKS
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * MUTATION THUNK: Update email important status
 */
export const updateEmailImportantThunk = createAsyncThunk(
  "mail/updateEmailImportant",
  async ({ emailId, is_important }, { rejectWithValue }) => {
    try {
      const response = await emailService.updateEmailImportant(emailId, is_important);
      // React Query cache invalidation is handled by RTK listener middleware.
      return { emailId, is_important, email: response };
    } catch (error) {
      console.error("Failed to update email important status:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to update important status");
    }
  }
);

/**
 * MUTATION THUNK: Bulk update emails (starred, important, etc.)
 */
export const bulkUpdateEmailsThunk = createAsyncThunk(
  "mail/bulkUpdateEmails",
  async ({ emailIds, updates }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkUpdateEmails(emailIds, updates);
      // React Query cache invalidation is handled by RTK listener middleware.
      return { emailIds, updates, response };
    } catch (error) {
      console.error("Failed to bulk update emails:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk update emails");
    }
  }
);

/**
 * MUTATION THUNK: Snooze thread
 */
export const snoozeThreadThunk = createAsyncThunk(
  "mail/snoozeThread",
  async ({ threadId, snooze_until }, { rejectWithValue }) => {
    try {
      const response = await emailService.snoozeThread(threadId, snooze_until);
      return { threadId, snooze_until, response };
    } catch (error) {
      console.error("Failed to snooze thread:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to snooze thread");
    }
  }
);

/**
 * MUTATION THUNK: Unsnooze thread
 */
export const unsnoozeThreadThunk = createAsyncThunk(
  "mail/unsnoozeThread",
  async ({ threadId }, { rejectWithValue }) => {
    try {
      const response = await emailService.unsnoozeThread(threadId);
      return { threadId, response };
    } catch (error) {
      console.error("Failed to unsnooze thread:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to unsnooze thread");
    }
  }
);

/**
 * MUTATION THUNK: Move email to trash
 */
export const moveToTrashThunk = createAsyncThunk("mail/moveToTrash", async ({ emailId }, { rejectWithValue }) => {
  try {
    const response = await emailService.moveToTrash(emailId);
    return { emailId, email: response };
  } catch (error) {
    console.error("Failed to move email to trash:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to move to trash");
  }
});

/**
 * MUTATION THUNK: Move email to spam
 */
export const moveToSpamThunk = createAsyncThunk("mail/moveToSpam", async ({ emailId }, { rejectWithValue }) => {
  try {
    const response = await emailService.moveToSpam(emailId);
    return { emailId, email: response };
  } catch (error) {
    console.error("Failed to move email to spam:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to move to spam");
  }
});

/* ────────────────────────────────────────────────────────────────────────────
 * BULK OPERATION THUNKS
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * MUTATION THUNK: Update individual email starred status
 * Uses individual email endpoint: PATCH /v1/emails/{email_id}/star
 */
export const updateEmailStarredThunk = createAsyncThunk(
  "mail/updateEmailStarred",
  async ({ emailId, is_starred }, { rejectWithValue }) => {
    try {
      const response = await emailService.updateEmailStarred(emailId, is_starred);
      return { emailId, is_starred, response };
    } catch (error) {
      console.error("Failed to update email starred status:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to update starred status");
    }
  }
);

/**
 * BULK MUTATION THUNK: Update multiple emails' starred status using bulk endpoint
 */
export const bulkUpdateEmailStarredThunk = createAsyncThunk(
  "mail/bulkUpdateEmailStarred",
  async ({ emailIds, is_starred }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkStarEmails(emailIds, is_starred);
      return { emailIds, is_starred, response };
    } catch (error) {
      console.error("Failed to bulk update email starred status:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk update starred status");
    }
  }
);

/**
 * BULK MUTATION THUNK: Update multiple emails' important status
 */
export const bulkUpdateEmailImportantThunk = createAsyncThunk(
  "mail/bulkUpdateEmailImportant",
  async ({ threadIds, is_important }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkImportantEmails(threadIds, is_important);
      return { threadIds, is_important, response };
    } catch (error) {
      console.error("Failed to bulk update email important status:", error);
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to bulk update important status"
      );
    }
  }
);
/**
 * Update thread important status using thread-level endpoint
 */
export const updateThreadImportantThunk = createAsyncThunk(
  "mail/updateThreadImportant",
  async ({ threadId, is_important }, { rejectWithValue }) => {
    try {
      const response = await emailService.updateThreadImportant(threadId, is_important);
      return { threadId, is_important, response };
    } catch (error) {
      console.error("Failed to update thread important status:", error);
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to update thread important status"
      );
    }
  }
);
/**
 * BULK MUTATION THUNK: Update multiple emails' read status
 */
export const bulkUpdateEmailReadThunk = createAsyncThunk(
  "mail/bulkUpdateEmailRead",
  async ({ emailIds, is_read }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkReadEmails(emailIds, is_read);
      return { emailIds, is_read, response };
    } catch (error) {
      console.error("Failed to bulk update email read status:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk update read status");
    }
  }
);

/**
 * BULK MUTATION THUNK: Move multiple emails to spam
 */
export const bulkMoveToSpamThunk = createAsyncThunk(
  "mail/bulkMoveToSpam",
  async ({ emailIds }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkSpamEmails(emailIds);
      return { emailIds, response };
    } catch (error) {
      console.error("Failed to bulk move emails to spam:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk move to spam");
    }
  }
);

/**
 * BULK MUTATION THUNK: Remove spam mark from multiple emails
 */
export const bulkMoveFromSpamThunk = createAsyncThunk(
  "mail/bulkMoveFromSpam",
  async ({ emailIds }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkUnspamEmails(emailIds);
      return { emailIds, response };
    } catch (error) {
      console.error("Failed to bulk remove spam from emails:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk remove spam");
    }
  }
);

/**
 * BULK MUTATION THUNK: Move multiple emails to trash
 */
export const bulkMoveToTrashThunk = createAsyncThunk(
  "mail/bulkMoveToTrash",
  async ({ emailIds }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkDeleteEmails(emailIds, false);
      return { emailIds, response };
    } catch (error) {
      console.error("Failed to bulk move emails to trash:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk move to trash");
    }
  }
);

/**
 * BULK MUTATION THUNK: Move multiple emails to a folder
 */
export const bulkMoveToFolderThunk = createAsyncThunk(
  "mail/bulkMoveToFolder",
  async ({ emailIds, folder }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkMoveEmails(emailIds, folder);
      return { emailIds, folder, response };
    } catch (error) {
      console.error("Failed to bulk move emails to folder:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk move to folder");
    }
  }
);

/**
 * BULK MUTATION THUNK: Permanently delete multiple emails
 */
export const bulkDeleteEmailThunk = createAsyncThunk(
  "mail/bulkDeleteEmail",
  async ({ emailIds }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkDeleteEmails(emailIds, true);
      return { emailIds, response };
    } catch (error) {
      console.error("Failed to bulk delete emails:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk delete emails");
    }
  }
);

/**
 * BULK MUTATION THUNK: Archive multiple threads
 */
export const bulkArchiveEmailsThunk = createAsyncThunk(
  "mail/bulkArchiveEmails",
  async ({ threadIds }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkArchiveEmails(threadIds);
      return { threadIds, response };
    } catch (error) {
      console.error("Failed to bulk archive threads:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk archive threads");
    }
  }
);

/**
 * BULK MUTATION THUNK: Unarchive multiple threads
 */
export const bulkUnarchiveEmailsThunk = createAsyncThunk(
  "mail/bulkUnarchiveEmails",
  async ({ threadIds }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkUnarchiveEmails(threadIds);
      return { threadIds, response };
    } catch (error) {
      console.error("Failed to bulk unarchive threads:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk unarchive threads");
    }
  }
);

/**
 * BULK MUTATION THUNK: Snooze multiple threads
 */
export const bulkSnoozeThreadsThunk = createAsyncThunk(
  "mail/bulkSnoozeThreads",
  async ({ threadIds, snooze_until }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkSnoozeThreads(threadIds, snooze_until);
      return { threadIds, snooze_until, response };
    } catch (error) {
      console.error("Failed to bulk snooze threads:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk snooze threads");
    }
  }
);

/**
 * BULK MUTATION THUNK: Unsnooze multiple threads
 */
export const bulkUnsnoozeThreadsThunk = createAsyncThunk(
  "mail/bulkUnsnoozeThreads",
  async ({ threadIds }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkUnsnoozeThreads(threadIds);
      return { threadIds, response };
    } catch (error) {
      console.error("Failed to bulk unsnooze threads:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk unsnooze threads");
    }
  }
);

const mailSlice = createSlice({
  name: "mail",
  initialState: {
    // Folder/Category-based email storage
    inbox: [],
    is_starred: [],
    is_snoozed: [],
    sent: [],
    drafts: [],
    is_important: [],
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
    // Search results state
    searchResults: [],
    searchPagination: null,
    searchQuery: "",
    searchLoading: false,
    searchError: null,
    searchOriginalParams: {}, // Store original params for frontend post-processing
    lastMutationTime: null, // Timestamp of last mutation to trigger refetch
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
      state.is_starred = [];
      state.is_important = [];
      state.is_snoozed = [];
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
        const folder = action.payload?.folder;
        const category = action.payload?.category;

        // Store emails in the appropriate folder/category based on folder parameter
        if (folder) {
          const folderKey = folder.toLowerCase().replace(/\s+/g, ""); // Remove spaces for "all mail"
          // Map folder names to state properties
          const folderStateMap = {
            starred: "is_starred",
            important: "is_important",
            snoozed: "is_snoozed",
            sent: "sent",
            trash: "trash",
            spam: "spam",
            drafts: "drafts",
            scheduled: "scheduled",
            inbox: "inbox",
            allmail: "all", // "all mail" becomes "allmail"
          };

          const stateKey = folderStateMap[folderKey] || folderKey;
          if (state.hasOwnProperty(stateKey)) {
            state[stateKey] = results;
          }
        } else if (category) {
          // Store category-based emails
          const categoryKey = category.toLowerCase();
          if (state.hasOwnProperty(categoryKey)) {
            state[categoryKey] = results;
          }
        } else {
          // Default to inbox if no folder or category specified
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
        
        // Only keep system labels (which use composite keys like "Inbox", "Sent", etc.)
        // Remove all backend labels (which use UUIDs) and replace with fresh data
        const systemLabelsOnly = {};
        Object.entries(state.labels).forEach(([key, label]) => {
          // System labels don't have UUIDs and use composite keys
          if (label.is_system || label.system) {
            systemLabelsOnly[key] = label;
          }
        });

        // Merge system labels with fresh backend labels
        const mergedLabels = { ...systemLabelsOnly };
        Object.entries(transformedLabels).forEach(([id, label]) => {
          mergedLabels[id] = label;
        });

        state.labels = mergedLabels;
        // Replace ID mappings entirely with fresh data from API
        state.labelIdToKeyMap = { ...idToKeyMap };
        state.keyToLabelIdMap = { ...keyToIdMap };
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
          // Recursive function to collect all descendant label IDs
          const collectDescendants = (parentId, collected = new Set()) => {
            Object.entries(state.labels).forEach(([id, label]) => {
              if (label.parent_id === parentId && !collected.has(id)) {
                collected.add(id);
                // Recursively collect children of this child
                collectDescendants(id, collected);
              }
            });
            return collected;
          };

          // Collect all descendants (deeply nested children)
          const descendantIds = collectDescendants(deletedId);

          // Remove the deleted label itself
          delete state.labels[deletedId];
          const compositeKey = state.labelIdToKeyMap[deletedId];
          if (compositeKey) {
            delete state.labelIdToKeyMap[deletedId];
            delete state.keyToLabelIdMap[compositeKey];
          }

          // Remove all descendants (cascade delete)
          descendantIds.forEach((id) => {
            delete state.labels[id];
            const childKey = state.labelIdToKeyMap[id];
            if (childKey) {
              delete state.labelIdToKeyMap[id];
              delete state.keyToLabelIdMap[childKey];
            }
          });
        }
      })

      // Fetch Search Results
      .addCase(fetchSearchResults.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(fetchSearchResults.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.results || [];
        state.searchPagination = action.payload.pagination || null;
        state.searchQuery = action.payload.query || "";
        state.searchOriginalParams = action.payload.originalParams || {};
      })
      .addCase(fetchSearchResults.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload;
        state.searchResults = [];
        state.searchPagination = null;
        state.searchOriginalParams = {};
      })
      // Delete Email
      .addCase(deleteEmailThunk.fulfilled, (state, action) => {
        const emailId = action.payload?.emailId;
        if (emailId) {
          // Remove email from drafts array
          state.drafts = state.drafts.filter((email) => email.id?.toString() !== emailId?.toString());
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
        (action) => {
          // Only update lastMutationTime for actual mutation operations, not fetches
          const mutationActions = [
            "mail/updateEmailStarred/fulfilled",
            "mail/updateEmailImportant/fulfilled",
            "mail/bulkUpdateEmails/fulfilled",
            "mail/bulkUpdateEmailStarred/fulfilled",
            "mail/bulkUpdateEmailImportant/fulfilled",
            "mail/bulkUpdateEmailRead/fulfilled",
            "mail/bulkMoveToSpam/fulfilled",
            "mail/bulkMoveFromSpam/fulfilled",
            "mail/bulkMoveToTrash/fulfilled",
            "mail/bulkMoveToFolder/fulfilled",
            "mail/bulkUpdateLabels/fulfilled",
            "mail/bulkDeleteEmail/fulfilled",
            "mail/bulkArchiveEmails/fulfilled",
            "mail/bulkUnarchiveEmails/fulfilled",
            "mail/bulkSnoozeThreads/fulfilled",
            "mail/bulkUnsnoozeThreads/fulfilled",
            "mail/snoozeThread/fulfilled",
            "mail/unsnoozeThread/fulfilled",
            "mail/moveToTrash/fulfilled",
            "mail/moveToSpam/fulfilled",
            "mail/deleteEmail/fulfilled",
          ];
          const isMatch = mutationActions.includes(action.type);
          // Debug: Log all mutation actions to see what's firing
          if (action.type.includes("mail/") && action.type.includes("/fulfilled")) {
            console.log("🎯 Mail action fulfilled:", action.type, "- Will update lastMutationTime?", isMatch);
          }
          return isMatch;
        },
        (state, action) => {
          state.mutationLoading = false;
          // Update mutation timestamp to trigger refetch in components
          const timestamp = Date.now();
          state.lastMutationTime = timestamp;
          console.log("🔄 Mutation completed, updating lastMutationTime:", timestamp, "Action:", action.type);
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
