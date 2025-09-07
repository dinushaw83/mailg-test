// components/SpamOrUnsubModal.jsx
import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function SpamOrUnsubModal({
    open,
    onClose,
    onReportSpam,
    onUnsubscribe,
}) {
    const dialogRef = useRef(null);

    // Close on ESC and move focus in when opened
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
            // simple focus trap
            if (e.key === "Tab") {
                const f = dialogRef.current?.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (!f || !f.length) return;
                const first = f[0];
                const last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        const t = setTimeout(() => {
            dialogRef.current?.querySelector("button")?.focus();
        }, 0);
        document.addEventListener("keydown", onKey);
        return () => {
            clearTimeout(t);
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open) return null;

    const overlay = {
        position: "fixed",
        inset: 0,
        background: "rgba(32,33,36,.5)",
        zIndex: 3000,
        display: "grid",
        placeItems: "center",
        padding: 16,
    };

    const card = {
        width: "min(560px, 100%)",
        background: "#fff",
        borderRadius: 24,
        boxShadow:
            "0 10px 20px rgba(0,0,0,.2), 0 6px 6px rgba(0,0,0,.15)",
        fontFamily:
            '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
        color: "#202124",
    };

    const body = { padding: "28px 28px 0" };
    const title = {
        fontSize: 28,
        lineHeight: "36px",
        fontWeight: 200,
        margin: 0,
        letterSpacing: ".01em",
    };
    const p = {
        margin: "16px 0 0",
        fontSize: 16,
        lineHeight: "24px",
        color: "#3c4043",
    };
    const actions = {
        display: "flex",
        justifyContent: "flex-end",
        gap: 12,
        padding: 20,
    };

    const textBtn = {
        appearance: "none",
        border: "none",
        background: "transparent",
        padding: "10px 16px",
        fontSize: 14,
        fontWeight: 600,
        color: "#1a73e8",
        borderRadius: 9999,
        cursor: "pointer",
    };

    const primaryBtn = {
        ...textBtn,
        background: "#1a73e8",
        color: "#fff",
        padding: "10px 24px",
    };

    function onOverlayClick(e) {
        if (e.target === e.currentTarget) onClose?.();
    }

    return createPortal(
        <div style={overlay} onMouseDown={onOverlayClick}>
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="spam-unsub-title"
                style={card}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div style={body}>
                    <h3 id="spam-unsub-title" style={title}>
                        Report spam or unsubscribe?
                    </h3>

                    <p style={p}>
                        MailG can <strong>unsubscribe</strong> you from the sender.
                    </p>
                    <p style={p}>
                        If you didn't sign up to receive this message, <strong>Report spam</strong> instead to
                        help protect all Gmail users from unwanted email.{" "}
                        <a href="#" style={{ color: "#1a73e8", textDecoration: "none" }}>
                            Learn more
                        </a>
                    </p>
                </div>

                <div style={actions}>
                    <button
                        type="button"
                        style={textBtn}
                        onClick={onReportSpam}
                    >
                        Report spam
                    </button>
                    <button
                        type="button"
                        style={primaryBtn}
                        onClick={onUnsubscribe}
                    >
                        Unsubscribe
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
