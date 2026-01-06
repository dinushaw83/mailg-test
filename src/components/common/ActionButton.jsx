import React from "react";

const ActionButton = ({ text, onClick, icon }) => {
  return (
    <span
      role="link"
      tabIndex="0"
      onClick={onClick}
      style={{
        background: "none",
        outline: "none",
        padding: "0px 16px 0px 12px",
        textDecoration: "none",
        WebkitBoxAlign: "center",
        alignItems: "center",
        display: "inline-flex",
        WebkitBoxPack: "center",
        justifyContent: "center",
        position: "relative",
        zIndex: 0,
        WebkitFontSmoothing: "antialiased",
        fontFamily: "Roboto, RobotoDraft, Helvetica, Arial, sans-serif",
        fontSize: "0.875rem",
        letterSpacing: "normal",
        boxSizing: "border-box",
        color: "rgb(68, 71, 70)",
        cursor: "pointer",
        fontWeight: 500,
        height: "36px",
        minWidth: "104px",
        WebkitUserDrag: "none",
        userSelect: "none",
        border: "1px solid rgb(116, 119, 117)",
        borderRadius: "18px",
        boxShadow: "none",
        marginRight: "8px",
      }}
    >
      {icon && <span style={{ marginRight: "8px", display: "flex", alignItems: "center" }}>{icon}</span>}
      {text}
    </span>
  );
};

export default ActionButton;
