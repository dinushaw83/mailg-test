import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { usePersistedState } from "../hooks/usePersistedState";

import { initialUser } from "./fixtures/me";
import { initialEmails } from "./fixtures/emails";
import { recipients as initialRecipients } from "./fixtures/recipients";
import { recipientLabels as initialRecipientLabels } from "./fixtures/recipientLabels";
import { initialLabels } from "./fixtures/labels";
import { normalizeEmails } from "../utils/emails";
import { openDB } from "idb";

export const GlobalContext = createContext();

export const GlobalContextProvider = ({ children }) => {
  const [loggedInUser, setLoggedInUser] = usePersistedState("loggedInUser", initialUser);
  const [emails, setEmails] = usePersistedState("emails", initialEmails);

  // Recipients / Contacts
  const [recipients, setRecipients] = usePersistedState("recipients", initialRecipients);
  const [recipientLabels, setRecipientLabels] = usePersistedState("recipientLabels", initialRecipientLabels);
  const [deletedRecipients, setDeletedRecipients] = usePersistedState("deletedRecipients", []);

  const [currentView, setCurrentView] = usePersistedState("currentView", "inbox");
  const [selectedEmails, setSelectedEmails] = usePersistedState("selectedEmails", []);
  const [labels, setLabels] = usePersistedState("labels", initialLabels);
  // Store multiple compose windows
  const [composeWindows, setComposeWindows] = useState([]);
  const [sortOrder, setSortOrder] = usePersistedState("sortOrder", "newest");
  const [currentPage, setCurrentPage] = usePersistedState("currentPage", 1);
  const [itemsPerPage, setItemsPerPage] = usePersistedState("itemsPerPage", 25);
  const [panelState, setPanelState] = useState({
    showPanel: false,
    direction: "vertical",
  });
  const [previewEmailId, setPreviewEmailId] = useState(null);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [density, setDensity] = useState("default");
  const [threading, setThreading] = useState(true);
  const [inboxType, setInboxType] = useState("default");
  const [isLeftSidebarExpanded, setIsLeftSidebarExpanded] = usePersistedState("isLeftSidebarExpanded", true);
  // Right sidebar states
  const [rightSidebarExpanded, setRightSidebarExpanded] = usePersistedState("rightSidebarExpanded", true);
  const [rightSidebarActiveTab, setRightSidebarActiveTab] = usePersistedState("rightSidebarActiveTab", {
    contact: { screen: "CONTACTS" },
    activeTab: null,
  });

  // Signatures related settings
  /**
   *  {
   *     list: {
   *       name: string;
   *       content: string;
   *     }[];
   *     useForNewEmails: string;
   *     useForRepliesAndForwards: string;
   *   }
   *  }
   */
  const [signaturesState, setSignaturesState] = usePersistedState("signatures", {
    list: [],
    useForNewEmails: "",
    useForRepliesAndForwards: "",
  });


  // Global snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    action: null,
    autoHideDuration: null,
    hideClose: false,
  });

  const [selected, setSelected] = useState(() => new Set());

  // Clear selection on navigation (folder/label changes)
  const location = useLocation();
  useEffect(() => {
    setSelected(new Set());
  }, [location.pathname]);

  // Reset compose windows

  const selection = useMemo(() => {
    const isSelected = (id) => selected.has(id);
    const count = selected.size;
    const hasSelection = count > 0;

    const select = (id) =>
      setSelected((prev) => {
        const s = new Set(prev);
        s.add(id);
        return s;
      });

    const deselect = (id) =>
      setSelected((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });

    const toggle = (id) =>
      setSelected((prev) => {
        const s = new Set(prev);
        s.has(id) ? s.delete(id) : s.add(id);
        return s;
      });

    const clear = () => setSelected(new Set());

    const setMany = (ids) => setSelected(() => new Set(ids)); // replace with exactly these ids

    return {
      ids: selected,
      isSelected,
      select,
      deselect,
      toggle,
      clear,
      setMany,
      count,
      hasSelection,
    };
  }, [selected]);

  const normalizedEmails = useMemo(() => {
    return normalizeEmails(emails);
  }, [emails]);

  // Handle IndexedDB as a state
  const [db, setDb] = useState(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        const database = await openDB("my-database", 1, {
          upgrade(db, oldVer, newVer, tx) {
            // runs only when version > oldVer
            if (!db.objectStoreNames.contains("attachments")) {
              const store = db.createObjectStore("attachments", { keyPath: "id" }); // primary key
              store.createIndex("name", "name", { unique: false }); // secondary index
            }
          },
        });

        setDb(database);
      } catch (error) {
        console.error("Failed to open database:", error);
      }
    };

    initDB();
  }, []);

  const refreshEmails = useCallback(async () => {
    setEmails(initialEmails);

    // reset the database, delete all attachments
    if (db) {
      console.log(`deleting all attachments`);
      const attachmentStore = db.transaction("attachments", "readwrite").objectStore("attachments");
      await attachmentStore.clear();
    }
  }, [db]);

  const contextValue = {
    selection,
    loggedInUser,
    setLoggedInUser,
    emails,
    setEmails,
    recipients,
    setRecipients,
    recipientLabels,
    setRecipientLabels,
    currentView,
    setCurrentView,
    selectedEmails,
    setSelectedEmails,
    snackbar,
    setSnackbar,
    labels,
    setLabels,
    composeWindows,
    setComposeWindows,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    normalizedEmails,
    refreshEmails,
    panelState,
    setPanelState,
    previewEmailId,
    setPreviewEmailId,
    showQuickSettings,
    setShowQuickSettings,
    density,
    setDensity,
    inboxType,
    setInboxType,
    threading,
    setThreading,
    isLeftSidebarExpanded,
    setIsLeftSidebarExpanded,
    db,
    rightSidebarExpanded,
    setRightSidebarExpanded,
    rightSidebarActiveTab,
    setRightSidebarActiveTab,
    deletedRecipients,
    setDeletedRecipients,
    signaturesState,
    setSignaturesState
  };

  return <GlobalContext.Provider value={contextValue}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => useContext(GlobalContext);
