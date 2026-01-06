import React from "react";

export default function LabelBanner() {
  return (
    <div
      style={{
        padding: "8px 16px",
        display: "flex",
        textAlign: "center",
        justifyContent: "center",
        color: "rgb(95, 99, 104)",
        borderRadius: "4px",
        margin: "4px 0px",
        borderBottom: "1px solid rgba(100, 121, 143, 0.12)",
      }}
    >
      There are no conversations with this label.
    </div>
  );
}
