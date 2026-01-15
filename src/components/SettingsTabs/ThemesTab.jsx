import React from "react";

const ThemesTab = () => {
  const handleSetTheme = () => {
    // TODO: Add theme selection logic
  };

  return (
    <div
      style={{
        padding: "0px 24px 24px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        minHeight: "350px",
      }}
    >
      <div
        className="Uu"
        role="button"
        onClick={handleSetTheme}
        style={{
          border: "none",
          background: "none",
          borderRadius: "4px",
          outline: "none",
          padding: "0px 16px",
          textDecoration: "none",
          WebkitBoxAlign: "center",
          alignItems: "center",
          display: "inline-flex",
          WebkitBoxPack: "center",
          justifyContent: "center",
          position: "relative",
          zIndex: 0,
          WebkitFontSmoothing: "antialiased",
          fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
          fontSize: "0.875rem",
          letterSpacing: "normal",
          cursor: "pointer",
          fontWeight: 500,
          height: "36px",
          minWidth: "80px",
          boxShadow: "rgb(218, 220, 224) 0px 0px 0px 1px inset",
          boxSizing: "border-box",
          color: "rgb(26, 115, 232)",
          marginTop: "8px",
        }}
      >
        Set theme
      </div>
    </div>
  );
};

export default ThemesTab;
