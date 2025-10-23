import React from "react";
import ReactDOM from "react-dom";

// Brand new, standalone import-done popup. No MUI. No shared styles. Fully self-contained.
// Props: { open: boolean, fileName: string, onUndo: () => void, onClose: () => void, width?: number }
export default function ImportDonePopup({ open, fileName, onUndo, onClose, width = 1000 }) {
  if (!open) return null;

  const container = (
    <div
      aria-live="polite"
      style={{
        position: "fixed",
        zIndex: 99999,
        right: 32,
        bottom: 32,
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          width,
          maxWidth: width,
          backgroundColor: "#ffffff",
          borderRadius: 8,
          boxShadow: "0 10px 24px rgba(0,0,0,.2), 0 3px 8px rgba(0,0,0,.15)",
          overflow: "hidden",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        {/* Top dark section */}
        <div
          style={{
            backgroundColor: "#323232",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Check icon (inline SVG) */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ width: 18, height: 18, color: "#fff" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span style={{ fontWeight: 600, fontSize: 14 }}>All done</span>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close notification"
            style={{
              padding: 6,
              borderRadius: 9999,
              border: "none",
              background: "transparent",
              color: "#e0e0e0",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#424242")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              style={{ width: 18, height: 18, color: "#fff" }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Blue divider */}
        <div style={{ height: 2, backgroundColor: "#1a73e8" }} />

        {/* Bottom light section */}
        <div
          style={{
            backgroundColor: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
          }}
        >
          <p style={{ margin: 0, fontSize: 14, color: "#202124" }}>{fileName}</p>
          <button
            onClick={onUndo}
            style={{
              background: "transparent",
              border: "none",
              color: "#1a73e8",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Undo
          </button>
        </div>
      </div>
    </div>
  );

  // Render to body to avoid parent stacking/overflow issues
  return ReactDOM.createPortal(container, document.body);
}


