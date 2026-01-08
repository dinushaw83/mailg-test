import { useGlobalContext } from "../hooks/useGlobalContext";

// For backward compatibility with any files still importing from here
export { useGlobalContext };

// Placeholder provider components that do nothing
export const GlobalContextProvider = ({ children }) => children;
export const GlobalContext = {
  // Empty context object for safety
};
