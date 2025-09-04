import React, { useEffect } from "react";
import { createPortal } from "react-dom";

export default function UndoToast({
    open,
    message,
    onUndo,
    onClose,
    autoHideMs = 5000,
    showLink = true
}) {
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

    const linkStyle = {
        background: "none",
        border: 0,
        padding: 0,
        cursor: "pointer",
        color: "#1a73e8",
        font: "inherit",
    };

    const closeStyle = {
        marginLeft: 8,
        background: "none",
        border: 0,
        cursor: "pointer",
        fontSize: 20,
        lineHeight: "20px",
        color: "#5f6368",
    };

    return createPortal(
        <div role="status" aria-live="polite" style={wrapStyle}>
            <span style={{ color: "#202124" }}>{message}</span>
            {showLink && <button type="button" style={linkStyle} onClick={onUndo}>Undo</button>}
            <button type="button" style={closeStyle} aria-label="Dismiss" onClick={onClose}>×</button>
        </div>,
        document.body
    );
}
