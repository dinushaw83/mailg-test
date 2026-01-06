import React, { useMemo } from "react";
import ComposeEmail from "./ComposeEmail";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useComposeModal } from "../../hooks/useComposeModal";

// Wrapper for multiple compose windows
export default function ComposeEmailWrapper() {
  const { composeWindows } = useGlobalContext();
  const { visibleWindowCount } = useComposeModal();

  // Memoize the visible windows to prevent unnecessary re-renders
  const visibleWindows = useMemo(() => {
    return composeWindows.slice(-visibleWindowCount);
  }, [composeWindows, visibleWindowCount]);

  // Only render visible windows
  return visibleWindows.map((window) => <ComposeEmail key={window.id} composeWindow={window} />);
}
