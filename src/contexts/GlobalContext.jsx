import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { usePersistedState } from "../hooks/usePersistedState";
import { useSessionState } from "../hooks/useSessionState";

import { initialUser } from "./fixtures/me";
import { initialEmails } from "./fixtures/emails";
import { recipients as initialRecipients } from "./fixtures/recipients";
import { recipientLabels as initialRecipientLabels } from "./fixtures/recipientLabels";
import { initialLabels } from "./fixtures/labels";
import { normalizeEmails } from "../utils/emails";

export const GlobalContext = createContext();

export const GlobalContextProvider = ({ children }) => {
  const [loggedInUser, setLoggedInUser] = usePersistedState("loggedInUser", initialUser);
  const [emails, setEmails] = usePersistedState("emails", initialEmails);
  const [recipients, setRecipients] = usePersistedState("recipients", initialRecipients);
  const [recipientLabels, setRecipientLabels] = usePersistedState("recipientLabels", initialRecipientLabels);
  const [currentView, setCurrentView] = usePersistedState("currentView", "inbox");
  const [selectedEmails, setSelectedEmails] = usePersistedState("selectedEmails", []);
  const [composeOpen, setComposeOpen] = usePersistedState("composeOpen", false);
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
  const [previewEmail, setPreviewEmail] = useState(null);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [density, setDensity] = useState("default");
  const [threading, setThreading] = useState(true);
  const [inboxType, setInboxType] = useState("default");
  const [isLeftSidebarExpanded, setIsLeftSidebarExpanded] = usePersistedState("isLeftSidebarExpanded", true);
  const [rightSidebarExpanded, setRightSidebarExpanded] = usePersistedState("rightSidebarExpanded", true);

  // Global snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    action: null,
    autoHideDuration: null,
  });

  const [selected, setSelected] = useState(() => new Set());

  const refreshEmails = useCallback(() => {
    setEmails(initialEmails);
  }, []);

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
    previewEmail,
    setPreviewEmail,
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
    rightSidebarExpanded,
    setRightSidebarExpanded,
  };

  return <GlobalContext.Provider value={contextValue}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => useContext(GlobalContext);
