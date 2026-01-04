import React, { useEffect, useState } from "react";
import { setDeletedRecipients, setHiddenRecipients, setRecipientLabels, setRecipients } from "../store/slices/contactsSlice";
import { setEmails, setLabels } from "../store/slices/mailSlice";

import { clearSelection } from "../store/slices/uiSlice";
import { openDB } from "idb";
import { setLoggedInUser } from "../store/slices/userSlice";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";

const VERIFICATION_INITIAL_CONFIG_KEY = "__verification_initial_config__";
const LOCAL_STORAGE_KEYS = [
  "loggedInUser", "emails", "recipients", "recipientLabels", "deletedRecipients", "hiddenRecipients",
  "allSearchQueries", "mailg_search_history", "currentView", "selectedEmails", "labels", "sortOrder",
  "currentPage", "itemsPerPage", "panelState", "isLeftSidebarExpanded", "showQuickSettings", "density",
  "threading", "inboxType", "mailg-notification-settings", "rightSidebarExpanded", "rightSidebarActiveTab",
  "vacationResponder", "sendAsSettings", "signatures", "notificationSettings", "privacySettings",
  "settingsGeneral", "settingsAdvanced", "settingsLabels", "settingsInbox", "settingsChat", "settingsFilters",
  "settingsForwarding", "settingsOffline", "settingsThemes", "settingsAccounts", "mailGAccountPersonalInfo",
  "mailGAccountDataPrivacy", "thirdPartyApps", "signInSettings", "keyboardShortcuts", "manualSyncCount",
];

const captureInitialConfig = () => {
  const config = {};
  LOCAL_STORAGE_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      try {
        config[key] = JSON.parse(value);
      } catch (e) {
        config[key] = value;
      }
    } else {
      config[key] = null;
    }
  });
  return config;
};

export let db = null;

const ReduxInitialization = ({ children }) => {
  const dispatch = useDispatch();
  const location = useLocation();
  const [isDbReady, setIsDbReady] = useState(false);

  // Migration logic (Optional but good for backward compatibility)
  useEffect(() => {
    const isMigrated = localStorage.getItem('__redux_migrated__');
    if (!isMigrated) {
      const getOld = (key) => {
        const val = localStorage.getItem(key);
        if (!val) return null;
        try { return JSON.parse(val); } catch(e) { return val; }
      };

      const oldUser = getOld('loggedInUser');
      if (oldUser) dispatch(setLoggedInUser(oldUser));

      const oldEmails = getOld('emails');
      if (oldEmails) dispatch(setEmails(oldEmails));

      const oldLabels = getOld('labels');
      if (oldLabels) dispatch(setLabels(oldLabels));

      const oldRecipients = getOld('recipients');
      if (oldRecipients) dispatch(setRecipients(oldRecipients));

      const oldRecipientLabels = getOld('recipientLabels');
      if (oldRecipientLabels) dispatch(setRecipientLabels(oldRecipientLabels));

      localStorage.setItem('__redux_migrated__', 'true');
    }
  }, [dispatch]);

  // Clear selection on navigation
  useEffect(() => {
    dispatch(clearSelection());
  }, [location.pathname, dispatch]);

  // Handle localStorage.clear()
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === null) {
        window.location.href = "/";
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      try {
        const database = await openDB("my-database", 2, {
          upgrade(db) {
            if (!db.objectStoreNames.contains("attachments")) {
              const store = db.createObjectStore("attachments", { keyPath: "id" });
              store.createIndex("name", "name", { unique: false });
            }
            if (!db.objectStoreNames.contains("embeddedImages")) {
              const store = db.createObjectStore("embeddedImages", { keyPath: "id" });
              store.createIndex("emailId", "emailId", { unique: false });
            }
          },
        });
        db = database;
        setIsDbReady(true);
      } catch (error) {
        console.error("Failed to open database:", error);
      }
    };
    initDB();
  }, []);

  // Capture initial config for verification
  useEffect(() => {
    const existingInitialConfig = localStorage.getItem(VERIFICATION_INITIAL_CONFIG_KEY);
    if (existingInitialConfig) {
      try {
        window.initialConfig = JSON.parse(existingInitialConfig);
      } catch (e) {
        console.error("Failed to parse existing initial config:", e);
      }
      return;
    }

    let attempts = 0;
    const MAX_ATTEMPTS = 50;
    const interval = setInterval(() => {
      attempts += 1;
      const allReady = LOCAL_STORAGE_KEYS.every((key) => localStorage.getItem(key) !== null);

      if (allReady || attempts >= MAX_ATTEMPTS) {
        const initialConfig = captureInitialConfig();
        localStorage.setItem(VERIFICATION_INITIAL_CONFIG_KEY, JSON.stringify(initialConfig));
        window.initialConfig = initialConfig;
        localStorage.setItem("__verification_baseline_ready__", Date.now().toString());
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return children;
};

export default ReduxInitialization;

