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
 * @param {boolean} options.is_starred - Filter by starred status
 * @param {boolean} options.is_important - Filter by important status
 * @param {boolean} options.is_snoozed - Filter by snoozed status
 * @param {string} options.folder - Filter by folder (sent, trash, spam, drafts, inbox)
 * @param {boolean} options.include_archived - Include archived emails (for all mail)
 * @param {boolean} options.is_starred - Filter by starred status
 * @param {boolean} options.is_important - Filter by important status
 * @param {boolean} options.is_snoozed - Filter by snoozed status
 * @param {string} options.folder - Filter by folder (sent, trash, spam, drafts, inbox)
 * @param {boolean} options.include_archived - Include archived emails (for all mail)
 */
export const fetchEmails = createAsyncThunk("mail/fetchEmails", async (options = {}, { rejectWithValue }) => {
  const {
    page = 1,
    pageSize = 20,
    category = null,
    is_starred = null,
    is_important = null,
    is_snoozed = null,
    folder = null,
    include_archived = null,
  } = options;

  try {
    // Structure query key for separate cache invalidation:
    // - ["emails", "category", "primary", page, pageSize] for categories
    // - ["emails", "is_starred", true, page, pageSize] for starred
    // - ["emails", "is_important", true, page, pageSize] for important
    // - ["emails", "is_snoozed", true, page, pageSize] for snoozed
    // - ["emails", "folder", "sent", page, pageSize] for folders (sent, trash, spam, drafts)
    // - ["emails", "inbox", page, pageSize] for inbox (no filter)
    let queryKey;
    const filterType =
      is_starred === true
        ? "is_starred"
        : is_important === true
          ? "is_important"
          : is_snoozed === true
            ? "is_snoozed"
            : include_archived === true
              ? "all"
              : folder
                ? "folder"
                : category
                  ? "category"
                  : "inbox";

    switch (filterType) {
      case "is_starred":
        queryKey = ["emails", "is_starred", true, page, pageSize];
        break;
      case "is_important":
        queryKey = ["emails", "is_important", true, page, pageSize];
        break;
      case "is_snoozed":
        queryKey = ["emails", "is_snoozed", true, page, pageSize];
        break;
      case "folder":
        queryKey = ["emails", "folder", folder, page, pageSize];
        break;
      case "category":
        queryKey = ["emails", "category", category, page, pageSize];
        break;
      default:
        queryKey = ["emails", "inbox", page, pageSize];
        break;
    }

    const data = await queryClient.fetchQuery({
      queryKey,
      queryFn: () => {
        // Use getEmailsByFilter if is_starred, is_important, is_snoozed, folder, or include_archived is provided, otherwise use getEmails
        if (
          is_starred !== null ||
          is_important !== null ||
          is_snoozed !== null ||
          folder !== null ||
          include_archived !== null
        ) {
          return emailService.getEmailsByFilter({
            page,
            pageSize,
            is_starred,
            is_important,
            is_snoozed,
            folder,
            include_archived,
          });
        }
        return emailService.getEmails({ page, pageSize, category });
      },
      staleTime: 1000 * 60 * 5,
    });
    return { ...data, category, is_starred, is_important, is_snoozed, folder };
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
      // Call unstar endpoint for each thread
      const promises = threadIds.map((threadId) => emailService.unstarThread(threadId));

      const results = await Promise.all(promises);
      return { threadIds, results };
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
export const sendEmailByIdThunk = createAsyncThunk("mail/sendEmailById", async (emailId, { rejectWithValue }) => {
  try {
    // Call service directly - React Query cache invalidation is handled by listeners
    const response = await emailService.sendEmailById(emailId);
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

/**
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
 * MUTATION THUNK: Snooze email
 */
export const snoozeEmailThunk = createAsyncThunk(
  "mail/snoozeEmail",
  async ({ emailId, snooze_until }, { rejectWithValue }) => {
    try {
      const response = await emailService.snoozeEmail(emailId, snooze_until);
      return { emailId, snooze_until, email: response };
    } catch (error) {
      console.error("Failed to snooze email:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to snooze email");
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

/**
 * MUTATION THUNK: Permanently delete email
 */
export const deleteEmailThunk = createAsyncThunk("mail/deleteEmail", async ({ emailId }, { rejectWithValue }) => {
  try {
    const response = await emailService.deleteEmail(emailId);
    return { emailId, response };
  } catch (error) {
    console.error("Failed to delete email:", error);
    return rejectWithValue(error.response?.data?.message || error.message || "Failed to delete email");
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
 * BULK MUTATION THUNK: Archive multiple emails
 */
export const bulkArchiveEmailsThunk = createAsyncThunk(
  "mail/bulkArchiveEmails",
  async ({ emailIds }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkArchiveEmails(emailIds);
      return { emailIds, response };
    } catch (error) {
      console.error("Failed to bulk archive emails:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk archive emails");
    }
  }
);

/**
 * BULK MUTATION THUNK: Snooze multiple emails
 */
export const bulkSnoozeEmailsThunk = createAsyncThunk(
  "mail/bulkSnoozeEmails",
  async ({ emailIds, snooze_until }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkSnoozeEmails(emailIds, snooze_until);
      return { emailIds, snooze_until, response };
    } catch (error) {
      console.error("Failed to bulk snooze emails:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk snooze emails");
    }
  }
);

/**
 * BULK MUTATION THUNK: Unsnooze multiple emails
 */
export const bulkUnsnoozeEmailsThunk = createAsyncThunk(
  "mail/bulkUnsnoozeEmails",
  async ({ emailIds }, { rejectWithValue }) => {
    try {
      const response = await emailService.bulkUnsnoozeEmails(emailIds);
      return { emailIds, response };
    } catch (error) {
      console.error("Failed to bulk unsnooze emails:", error);
      return rejectWithValue(error.response?.data?.message || error.message || "Failed to bulk unsnooze emails");
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
        const category = action.payload?.category;
        const is_starred = action.payload?.is_starred;
        const is_important = action.payload?.is_important;
        const is_snoozed = action.payload?.is_snoozed;
        const folder = action.payload?.folder;
        const include_archived = action.payload?.include_archived;

        // Store emails in the appropriate folder/category
        const filterType =
          is_starred === true
            ? "is_starred"
            : is_important === true
              ? "is_important"
              : is_snoozed === true
                ? "is_snoozed"
                : include_archived === true
                  ? "all"
                  : folder
                    ? "folder"
                    : category
                      ? "category"
                      : "inbox";

        switch (filterType) {
          case "is_starred":
            // Store starred emails in is_starred state
            state.is_starred = results;
            break;
          case "is_important":
            // Store important emails in is_important state
            state.is_important = results;
            break;
          case "is_snoozed":
            // Store snoozed emails in is_snoozed state
            state.is_snoozed = results;
            break;
          case "folder":
            // Store folder-based emails (sent, trash, spam, drafts)
            const folderKey = folder.toLowerCase();
            if (state.hasOwnProperty(folderKey)) {
              state[folderKey] = results;
            }
            break;
          case "category":
            // Map category to state property
            const categoryKey = category.toLowerCase();
            if (state.hasOwnProperty(categoryKey)) {
              state[categoryKey] = results;
            }
            break;
          default:
            // If no category specified, store in inbox
            state.inbox = results;
            break;
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
            "mail/bulkDeleteEmail/fulfilled",
            "mail/bulkArchiveEmails/fulfilled",
            "mail/bulkSnoozeEmails/fulfilled",
            "mail/bulkUnsnoozeEmails/fulfilled",
            "mail/snoozeEmail/fulfilled",
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
