import React, { createContext, useContext, useState, useCallback } from "react";
import { Snackbar, Alert, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((renderFn, options = {}) => {
    const id = Date.now() + Math.random();
    const { placement = "top-end", autoDismiss = 5000 } = options;

    const close = () => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const content = renderFn({ close });

    setToasts((prev) => [...prev, { id, content, placement, autoDismiss, close }]);

    return close;
  }, []);

  const handleClose = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Map placement to MUI anchor origin
  const getAnchorOrigin = (placement) => {
    switch (placement) {
      case "top-end":
        return { vertical: "top", horizontal: "right" };
      case "top-start":
        return { vertical: "top", horizontal: "left" };
      case "bottom-end":
        return { vertical: "bottom", horizontal: "right" };
      case "bottom-start":
        return { vertical: "bottom", horizontal: "left" };
      default:
        return { vertical: "top", horizontal: "right" };
    }
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.autoDismiss === false ? null : toast.autoDismiss}
          onClose={() => handleClose(toast.id)}
          anchorOrigin={getAnchorOrigin(toast.placement)}
          sx={{ mt: index * 8 }}
        >
          <div>{toast.content}</div>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

// Notification component that mimics Zendesk Garden's Notification
export function Notification({ type, children }) {
  const severityMap = {
    success: "success",
    error: "error",
    info: "info",
    warning: "warning",
  };

  return (
    <Alert severity={severityMap[type] || "info"} sx={{ minWidth: 300, alignItems: "center" }}>
      {children}
    </Alert>
  );
}

// Close button for notifications
Notification.Close = function NotificationClose({ onClick, ...props }) {
  return (
    <IconButton size="small" onClick={onClick} sx={{ ml: 1 }} {...props}>
      <CloseIcon fontSize="small" />
    </IconButton>
  );
};
