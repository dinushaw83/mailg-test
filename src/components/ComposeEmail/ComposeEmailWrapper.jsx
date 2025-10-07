import React, { useMemo } from "react";
import { useLocation } from 'react-router-dom';
import ComposeEmail from "./ComposeEmail";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useComposeModal } from "../../hooks/useComposeModal";

// Wrapper for multiple compose windows
export default function ComposeEmailWrapper() {
  const location = useLocation();
  const { composeWindows } = useGlobalContext();
  const { visibleWindowCount } = useComposeModal();

  // Memoize the visible windows to prevent unnecessary re-renders
  const visibleWindows = useMemo(() => {
    return composeWindows.slice(-visibleWindowCount);
  }, [composeWindows, visibleWindowCount]);

  // If the location starts with /contacts, then return null
  if (location.pathname.startsWith("/contacts")) {
    return null;
  }

  // Only render visible windows
  return visibleWindows.map((window) => (
    <ComposeEmail key={window.id} composeWindow={window} />
  ));
}
