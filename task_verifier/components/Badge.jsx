/* eslint-disable */

import * as React from "react";
import { Chip } from "@mui/material";

const variantStyles = {
  default: {
    bgcolor: "primary.main",
    color: "primary.contrastText",
    "&:hover": {
      bgcolor: "primary.dark",
    },
  },
  secondary: {
    bgcolor: "action.hover",
    color: "text.primary",
    "&:hover": {
      bgcolor: "action.selected",
    },
  },
  destructive: {
    bgcolor: "error.main",
    color: "error.contrastText",
    "&:hover": {
      bgcolor: "error.dark",
    },
  },
  outline: {
    bgcolor: "transparent",
    border: "1px solid",
    borderColor: "divider",
    color: "text.primary",
  },
};

export function Badge({ variant = "default", sx, children, className }) {
  const chipSx = {
    height: "auto",
    py: 0.25,
    px: 0.5,
    fontSize: "0.75rem",
    fontWeight: 600,
    borderRadius: "9999px",
    "& .MuiChip-label": {
      px: 1,
      display: "flex",
      alignItems: "center",
      gap: 0.5,
    },
    ...variantStyles[variant],
    ...sx,
  };

  return <Chip label={children} size="small" className={className} sx={chipSx} />;
}
