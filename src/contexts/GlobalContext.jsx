import React, { createContext, useState } from "react";
import { usePersistedState } from "../hooks/usePersistedState";

import { initialState } from "./fixtures";

export const GlobalContext = createContext();

export const GlobalContextProvider = ({ children }) => {
  const [state, setState] = usePersistedState("state", initialState);
  
  // Global snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    action: null,
    autoHideDuration: null,
  });

  const contextValue = {
    state,
    setState,
    snackbar,
    setSnackbar,
  };

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};
