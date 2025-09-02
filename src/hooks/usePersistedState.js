import { useState, useEffect } from "react";

export const usePersistedState = (
  key,
  initialValue,
  addToWindowObject = false
) => {
  const [state, setState] = useState(() => {
    const persistedValue = localStorage.getItem(key);
    return persistedValue ? JSON.parse(persistedValue) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
    if (addToWindowObject && typeof window !== "undefined") {
      window[key] = state;
    }
  }, [key, state, addToWindowObject]);

  return [state, setState];
};
