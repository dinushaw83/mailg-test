import React, { createContext, useState, useContext } from "react";
import { usePersistedState } from "../hooks/usePersistedState";

import { initialUser } from "./fixtures/me";
import { initialEmails } from "./fixtures/emails";
import { recipients as initialRecipients } from "./fixtures/recipients";
import { recipientLabels as initialRecipientLabels } from "./fixtures/recipientLabels";

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

  const contextValue = {
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
  };

  return <GlobalContext.Provider value={contextValue}>{children}</GlobalContext.Provider>;
};

export const useGlobalContext = () => useContext(GlobalContext);
