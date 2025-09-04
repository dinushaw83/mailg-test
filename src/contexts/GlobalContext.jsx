import React, { createContext, useContext } from "react";
import { usePersistedState } from "../hooks/usePersistedState";

import { initialState } from "./fixtures";

export const GlobalContext = createContext();

export const GlobalContextProvider = ({ children }) => {
  const [state, setState] = usePersistedState("state", initialState);

  const contextValue = {
    state,
    setState,
  };

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);