import React, { useContext } from "react";
import Snackbar from "@mui/material/Snackbar";
import IconButton from "@mui/material/IconButton";
import { GlobalContext } from "../contexts/GlobalContext";

export default function GlobalSnackbar() {
  const { snackbar, setSnackbar } = useContext(GlobalContext);

  const handleClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }

    // Reset the snackbar
    setSnackbar({ open: false, action: null, autoHideDuration: null, message: "", hideClose: false });
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
            <IconButton size="medium" aria-label="close" color="inherit" onClick={handleClose}>
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "22px", color: snackbar?.closeIconColor || "rgb(95,99,104)" }}
              >
                close
              </span>
            </IconButton>
          )}
        </React.Fragment>
      }
      sx={{
        "& .MuiSnackbarContent-root": {
          backgroundColor: snackbar?.severity === "error" ? "#fdecea" : "#fff",
          color: snackbar?.severity === "error" ? "#b3261f" : "rgb(95,99,104)",
          boxShadow: "0 1px 3px 0 rgba(60,64,67,.3),0 4px 8px 3px rgba(60,64,67,.15)",
          minWidth: "150px",
          padding: "8px 16px",
          fontSize: "14px",
          borderRadius: "5px",
        },
        ...(snackbar?.severity === "error"
          ? {
              border: "1px solid #f1b8b3",
            }
          : {}),
        ...(snackbar?.style ? { ...snackbar.style } : {}),
      }}
    />
  );
}
