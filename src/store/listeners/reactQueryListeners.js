import {
  createLabelThunk,
  deleteLabelThunk,
  fetchLabels,
  sendEmailThunk,
  updateLabelThunk,
  updateLabelsThunk,
  updateEmailStarredThunk,
  bulkUpdateEmailStarredThunk,
  updateEmailImportantThunk,
  bulkUpdateEmailsThunk,
  bulkUnstarThreadsThunk,
  snoozeEmailThunk,
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
    actionCreator: updateLabelsThunk.fulfilled,
    effect: async () => {
      // Invalidate all email queries (all categories and folders)
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["labels"] });
      // Invalidate email counts since label changes can move emails between categories
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

  // Email starred/important mutation listeners
  listenerMiddleware.startListening({
    actionCreator: updateEmailStarredThunk.fulfilled,
    effect: async () => {
      // Invalidate all email queries to refresh starred emails
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate email counts since starring affects counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: bulkUpdateEmailStarredThunk.fulfilled,
    effect: async () => {
      // Invalidate all email queries to refresh starred emails
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate email counts since starring affects counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: bulkUnstarThreadsThunk.fulfilled,
    effect: async () => {
      // Invalidate all email queries to refresh unstarred emails
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate email counts since unstarring affects counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: updateEmailImportantThunk.fulfilled,
    effect: async () => {
      // Invalidate all email queries to refresh important emails
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate email counts since importance affects counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: bulkUpdateEmailsThunk.fulfilled,
    effect: async () => {
      // Invalidate all email queries to refresh all affected emails
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      // Invalidate email counts since bulk updates affect counts
      queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
    },
  });

  // Snooze, trash, spam, delete mutation listeners
  listenerMiddleware.startListening({
    actionCreator: snoozeEmailThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
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
