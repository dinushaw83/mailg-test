import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { usePersistedState } from "../hooks/usePersistedState";

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

  // Global snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    action: null,
    autoHideDuration: null,
  });

  const [selected, setSelected] = useState(() => new Set());
  const [labels, setLabels] = useState(initialLabels);

  // Clear selection on navigation (folder/label changes)
  const location = useLocation();
  useEffect(() => {
    setSelected(new Set());
  }, [location.pathname]);

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
    composeOpen,
    setComposeOpen,
    snackbar,
    setSnackbar,
    labels,
    setLabels,
    normalizedEmails,
  };

  return <GlobalContext.Provider value={contextValue}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => useContext(GlobalContext);
