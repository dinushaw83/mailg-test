import React, { useContext } from "react";
import { Snackbar, Tooltip, IconButton } from "@mui/material";
import { GlobalContext } from "../contexts/GlobalContext";

export default function GlobalSnackbar() {
  const { snackbar, setSnackbar } = useContext(GlobalContext);

  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    // Reset the snackbar
    setSnackbar((prev) => ({
      ...prev,
      open: false,
      action: null,
      autoHideDuration: null,
      message: "",
      hideClose: false,
    }));
  };

  return (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={snackbar.autoHideDuration}
      onClose={handleClose}
      message={snackbar.message}
      action={
        <React.Fragment>
          {snackbar.action}
          {snackbar?.hideClose ? null : (
            <Tooltip
              title="Close"
              placement="top"
              slotProps={{
                popper: {
                  sx: {
                    "& .MuiTooltip-tooltip": {
                      backgroundColor: "rgba(0, 0, 0, 0.9)",
                      color: "white",
                      fontSize: "12px",
                      fontWeight: 300,
                    },
                  },
                },
              }}
            >
              <IconButton size="medium" aria-label="close" color="inherit" onClick={handleClose}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "22px", color: snackbar?.closeIconColor || "rgb(95,99,104)" }}
                >
                  close
                </span>
              </IconButton>
            </Tooltip>
          )}
        </React.Fragment>
      }
      sx={{
        "& .MuiSnackbarContent-root": {
          backgroundColor: "#fff",
          color: "rgb(95,99,104)",
          boxShadow: "0 1px 3px 0 rgba(60,64,67,.3),0 4px 8px 3px rgba(60,64,67,.15)",
          minWidth: "150px",
          padding: "8px 16px",
          fontSize: "14px",
          borderRadius: "5px",
        },
        ...(snackbar?.style ? { ...snackbar.style } : {}),
      }}
    />
  );
}
