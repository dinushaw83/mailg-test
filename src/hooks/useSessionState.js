import { useState, useEffect } from "react";

export const useSessionState = (key, initialValue, addToWindowObject = false) => {
  const [state, setState] = useState(() => {
    const persistedValue = sessionStorage.getItem(key);
    return persistedValue ? JSON.parse(persistedValue) : initialValue;
  });

  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(state));
    if (addToWindowObject && typeof window !== "undefined") {
      window[key] = state;
    }
  }, [key, state, addToWindowObject]);

  return [state, setState];
};
