import { Button } from "@mui/material";
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../InboxView/ActionBar";

export default function UndoToast({ open, message, onUndo, onClose, autoHideMs = 5000, showLink = true }) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, autoHideMs);
    return () => clearTimeout(t);
  }, [open, autoHideMs, onClose]);

  if (!open) return null;

  const wrapStyle = {
    position: "fixed",
    bottom: 16,
    left: "12%",
    transform: "translateX(-50%)",
    background: "#fff",
    borderRadius: 8,
    boxShadow: "0 4px 16px rgba(0,0,0,.2)",
    padding: "12px 16px",
    display: "flex",
    gap: 16,
    alignItems: "center",
    zIndex: 4000,
    fontFamily: '"Google Sans", Roboto, Helvetica, Arial, sans-serif',
    fontSize: 14,
    lineHeight: "20px",
  };

  return createPortal(
    <div role="status" aria-live="polite" style={wrapStyle}>
      <span style={{ color: "#202124" }}>{message}</span>
      {showLink && (
        <Button sx={{ textTransform: "none" }} type="button" variant="text" onClick={onUndo}>
          Undo
        </Button>
      )}
      <Icon name="close" onClick={onClose} aria-label="Dismiss" />
    </div>,
    document.body
  );
}
