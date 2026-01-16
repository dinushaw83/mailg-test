import {
  cancelSendEmailByIdThunk,
  createDraftThunk,
  createLabelThunk,
  deleteLabelThunk,
  fetchLabels,
  sendEmailByIdThunk,
  sendEmailThunk,
  updateDraftThunk,
  updateLabelThunk,
  updateLabelsThunk,
  bulkUpdateLabelsThunk,
  updateEmailStarredThunk,
  bulkUpdateEmailStarredThunk,
  updateEmailImportantThunk,
  bulkUpdateEmailImportantThunk,
  bulkUpdateEmailsThunk,
  bulkUnstarThreadsThunk,
  updateThreadImportantThunk,
  snoozeThreadThunk,
  unsnoozeThreadThunk,
  bulkSnoozeThreadsThunk,
  bulkUnsnoozeThreadsThunk,
  moveToTrashThunk,
  moveToSpamThunk,
  deleteEmailThunk,
} from "../slices/mailSlice";
import { logout, setAuth } from "../slices/userSlice";

import { queryClient } from "../../lib/query-client";

/**
 * Register React Query side-effects (invalidate/clear) in one place.
 */
export function registerReactQueryListeners(listenerMiddleware) {
  listenerMiddleware.startListening({
    actionCreator: sendEmailThunk.fulfilled,
    effect: async () => {
      // Invalidate all email queries (all categories and folders)
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate email counts since sending an email affects counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: sendEmailByIdThunk.fulfilled,
    effect: async (action) => {
      const emailId = action.payload?.emailId;
      // Invalidate specific email query
      if (emailId) {
        queryClient.invalidateQueries({ queryKey: ["email", emailId] });
      }
      // Invalidate all email queries
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate email counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: cancelSendEmailByIdThunk.fulfilled,
    effect: async (action) => {
      const emailId = action.payload?.emailId;
      // Invalidate specific email query
      if (emailId) {
        queryClient.invalidateQueries({ queryKey: ["email", emailId] });
      }
      // Invalidate all email queries
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate email counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: updateLabelsThunk.fulfilled,
    effect: async () => {
      // Invalidate all email list queries (all categories and folders)
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate single email detail queries (used by detail page)
      queryClient.invalidateQueries({ queryKey: ["email"] });
      queryClient.invalidateQueries({ queryKey: ["labels"] });
      // Invalidate email counts since label changes can move emails between categories
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: bulkUpdateLabelsThunk.fulfilled,
    effect: async () => {
      // Note: Email list/detail cache invalidation is handled in useMailActions.js
      // Only invalidate labels and counts here
      queryClient.invalidateQueries({ queryKey: ["labels"] });
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: createDraftThunk.fulfilled,
    effect: async (action) => {
      const emailId = action.payload?.id;
      // Invalidate specific email query
      if (emailId) {
        queryClient.invalidateQueries({ queryKey: ["email", emailId] });
      }
      // Invalidate all email queries (drafts might appear in different folders)
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate email counts since creating a draft affects counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: updateDraftThunk.fulfilled,
    effect: async (action) => {
      const emailId = action.meta.arg?.emailId;
      // Invalidate specific email query
      if (emailId) {
        queryClient.invalidateQueries({ queryKey: ["email", emailId] });
      }
      // Invalidate all email queries (drafts might appear in different folders)
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate email counts since updating a draft might affect counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  // Label mutation listeners
  listenerMiddleware.startListening({
    actionCreator: createLabelThunk.fulfilled,
    effect: async (action, listenerApi) => {
      // Invalidate labels cache
      queryClient.invalidateQueries({ queryKey: ["labels"] });
      // Explicitly refetch labels by dispatching the thunk
      await listenerApi.dispatch(fetchLabels());
      // Invalidate emails since label structure changed
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: updateLabelThunk.fulfilled,
    effect: async (action, listenerApi) => {
      // Invalidate labels cache
      queryClient.invalidateQueries({ queryKey: ["labels"] });
      // Explicitly refetch labels by dispatching the thunk
      await listenerApi.dispatch(fetchLabels());
      // Invalidate emails since label changes may affect email categorization
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate email counts since label changes can affect counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: deleteLabelThunk.fulfilled,
    effect: async (action, listenerApi) => {
      // Invalidate labels cache
      queryClient.invalidateQueries({ queryKey: ["labels"] });
      // Explicitly refetch labels by dispatching the thunk
      await listenerApi.dispatch(fetchLabels());
      // Invalidate emails since deleted labels should be removed from emails
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate email counts since label deletion affects counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  // Note: Star/important cache invalidation is handled directly in useMailActions.js
  // to avoid double invalidation. Only email counts need to be refreshed here.
  listenerMiddleware.startListening({
    actionCreator: updateEmailStarredThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: bulkUpdateEmailStarredThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: bulkUnstarThreadsThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: updateThreadImportantThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: updateEmailImportantThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: bulkUpdateEmailImportantThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: bulkUpdateEmailsThunk.fulfilled,
    effect: async () => {
      // Invalidate all email list queries to refresh all affected emails
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate single email detail queries (used by detail page)
      queryClient.invalidateQueries({ queryKey: ["email"] });
      // Invalidate email counts since bulk updates affect counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  // Snooze, trash, spam, delete mutation listeners
  listenerMiddleware.startListening({
    actionCreator: snoozeThreadThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: unsnoozeThreadThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: bulkSnoozeThreadsThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: bulkUnsnoozeThreadsThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: moveToTrashThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: moveToSpamThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: deleteEmailThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  // Clear React Query cache on logout (and optionally on login) to prevent cross-user leaks
  listenerMiddleware.startListening({
    actionCreator: logout,
    effect: async () => {
      queryClient.clear();
    },
  });

  listenerMiddleware.startListening({
    actionCreator: setAuth,
    effect: async () => {
      // When switching users / logging in, clear any previous user's cached queries
      queryClient.clear();
    },
  });

  listenerMiddleware.startListening({
    matcher: (action) => action.type.startsWith("mail/") && action.type.endsWith("/rejected"),
    effect: async (action) => {
      console.error("[mail] thunk failed:", action.payload || action.error);
    },
  });
}
