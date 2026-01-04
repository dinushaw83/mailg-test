import { FLUSH, PAUSE, PERSIST, PURGE, REGISTER, REHYDRATE, persistReducer, persistStore } from 'redux-persist';
import { combineReducers, configureStore } from '@reduxjs/toolkit';

import composeReducer from './slices/composeSlice';
import contactsReducer from './slices/contactsSlice';
import mailGAccountReducer from './slices/mailGAccountSlice';
import mailReducer from './slices/mailSlice';
import notificationReducer from './slices/notificationSlice';
import settingsReducer from './slices/settingsSlice';
import storage from 'redux-persist/lib/storage';
import uiReducer from './slices/uiSlice';
import userReducer from './slices/userSlice';

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
  key: 'root',
  version: 1,
  storage,
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

