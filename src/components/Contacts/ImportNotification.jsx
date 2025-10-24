import React from "react";

const ImportNotification = ({ open, fileName = "contacts.csv", onUndo, onClose }) => {
  if (!open) return null;

  const containerStyle = {
    position: "fixed",
    right: 24,
    bottom: 24,
    zIndex: 1400,
    width: 300,
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    backgroundColor: "transparent",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    height: 56,
    backgroundColor: "#323232",
    color: "#fff",
  };

  const dividerStyle = {
    height: 3,
    backgroundColor: "#1a73e8",
  };

  const bodyStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 12px",
    minHeight: 58,
    backgroundColor: "#eef3fd",
    color: "#1f1f1f",
  };

  const iconStyle = { fontSize: 20, marginRight: 8, color: "#fff" };

  const buttonBase = {
    background: "transparent",
    border: "none",
    padding: 6,
    cursor: "pointer",
  };

  return (
    <div style={containerStyle} role="alert" aria-live="assertive">
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", fontSize: 14, fontWeight: 500 }}>
          <span className="material-symbols-outlined" style={iconStyle}>check_circle</span>
          <span>All done</span>
        </div>
        <button onClick={onClose} aria-label="Close" style={{ ...buttonBase, color: "#fff" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#fff" }}>close</span>
        </button>
      </div>
      <div style={dividerStyle} />
      <div style={bodyStyle}>
        <span style={{ fontSize: 14, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={fileName}>
          {fileName}
        </span>
        <button onClick={onUndo} style={{ ...buttonBase, color: "#1a73e8", fontWeight: 500, padding: "6px 8px" }}>Undo</button>
      </div>
    </div>
  );
};

export default ImportNotification;


