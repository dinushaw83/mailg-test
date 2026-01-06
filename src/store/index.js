import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistReducer, persistStore } from "redux-persist";
import { combineReducers, configureStore, createListenerMiddleware } from "@reduxjs/toolkit";

import composeReducer from "./slices/composeSlice";
import contactsReducer from "./slices/contactsSlice";
import mailGAccountReducer from "./slices/mailGAccountSlice";
import mailReducer from "./slices/mailSlice";
import notificationReducer from "./slices/notificationSlice";
import { registerReactQueryListeners } from "./listeners/reactQueryListeners";
import settingsReducer from "./slices/settingsSlice";
import storage from "redux-persist/lib/storage";
import uiReducer from "./slices/uiSlice";
import userReducer from "./slices/userSlice";

const rootReducer = combineReducers({
  user: userReducer,
  mail: mailReducer,
  contacts: contactsReducer,
  ui: uiReducer,
  settings: settingsReducer,
  notification: notificationReducer,
  mailGAccount: mailGAccountReducer,
  compose: composeReducer,
});

const persistConfig = {
  key: "root",
  version: 1,
  storage,
  blacklist: ["ui", "compose"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const listenerMiddleware = createListenerMiddleware();
registerReactQueryListeners(listenerMiddleware);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        ignoredActionPaths: ["payload.action", "payload.snackbar.action"],
        ignoredPaths: ["ui.snackbar.action"],
      },
    }).prepend(listenerMiddleware.middleware),
});

export const persistor = persistStore(store);
