import ComposeEmail from "./ComposeEmail";
import React from "react";
import { useGlobalContext } from "../../contexts/GlobalContext";

// Wrapper for multiple compose windows
export default function ComposeEmailWrapper() {
  const { composeWindows } = useGlobalContext();

  // Always render all windows to preserve component state
  // ComposeEmail component will handle visibility based on isMinimized and visibleWindowCount
  return composeWindows.map((window) => <ComposeEmail key={window.id} composeWindow={window} />);
}
