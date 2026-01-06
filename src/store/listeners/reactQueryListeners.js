import { logout, setAuth } from "../slices/userSlice";
import { sendEmailThunk, updateLabelsThunk } from "../slices/mailSlice";

import { queryClient } from "../../lib/query-client";

/**
 * Register React Query side-effects (invalidate/clear) in one place.
 */
export function registerReactQueryListeners(listenerMiddleware) {
  listenerMiddleware.startListening({
    actionCreator: sendEmailThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
    },
  });

  listenerMiddleware.startListening({
    actionCreator: updateLabelsThunk.fulfilled,
    effect: async () => {
      queryClient.invalidateQueries({ queryKey: ["emails"] });
      queryClient.invalidateQueries({ queryKey: ["labels"] });
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
