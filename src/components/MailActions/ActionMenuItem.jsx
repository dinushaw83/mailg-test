import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export const ActionMenuItem = ({
  icon = "",
  label,
  onClick,
  horizontal = false,
  rightIcon = "",
  filled = false,
  fontSize = 20,
  disabled = false,
  rightText = null,
}) => {
  if (disabled) return null;
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        paddingX: "16px",
        height: "32px",
        overflow: "hidden",
        cursor: "pointer",
        "&:hover": {
          background: "#07070714",
        },
      }}
      onClick={onClick}
    >
      {icon && (
        <span
          className="material-symbols-outlined"
          style={{
            fontSize,
            color: "rgb(68, 68, 68)",
            fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
            ...(horizontal && {
              // rotate 90 degrees
              transform: "rotate(90deg)",
            }),
            width: "20px",
          }}
        >
          {icon}
        </span>
      )}

      <Typography sx={{ flex: 1, paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px" }}>{label}</Typography>

      {rightText && (
        <Typography sx={{ paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px", color: "#5f6368" }}>
          {rightText}
        </Typography>
      )}

      {rightIcon && (
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 20,
            color: "rgb(68, 68, 68)",
          }}
        >
          {rightIcon}
        </span>
      )}
    </Box>
  );
};
