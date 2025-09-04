import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { usePersistedState } from "../hooks/usePersistedState";

import { initialState } from "./fixtures";

export const GlobalContext = createContext();

export const GlobalContextProvider = ({ children }) => {
  const [state, setState] = usePersistedState("state", initialState);

  const [selected, setSelected] = useState(() => new Set());

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

    const setMany = (ids) =>
      setSelected(() => new Set(ids)); // replace with exactly these ids

    return {
      ids: selected,
      isSelected,
      select,
      deselect,
      toggle,
      clear,
      setMany,
      count,
      hasSelection
    };
  }, [selected]);

  const contextValue = {
    state,
    setState,
    selection,
  };

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);