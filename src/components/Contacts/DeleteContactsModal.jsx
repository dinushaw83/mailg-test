import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box } from "@mui/material";

const DeleteContactsModal = ({ open, onClose, onConfirm, selectedContactsCount, isBulkAction = false }) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getTitle = () => {
    if (isBulkAction) {
      return "Delete selected contacts?";
    }
    return "Delete contact?";
  };

  const getDescription = () => {
    if (isBulkAction) {
      return selectedContactsCount > 1
        ? "These contacts will be permanently deleted from this account after 30 days."
        : "This contact will be permanently deleted from this account after 30 days.";
    }
    return "This contact will be permanently deleted from this account after 30 days.";
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: "528.66px",
          borderRadius: "28px",
          boxShadow:
            "0px 8px 10px 1px rgba(0,0,0,.14),0px 3px 14px 2px rgba(0,0,0,.12),0px 5px 5px -3px rgba(0,0,0,.2)",
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          py: 2,
          fontSize: "24px",
          fontWeight: 400,
          color: "#1f1f1f",
        }}
      >
        {getTitle()}
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Typography
          variant="body2"
          sx={{
            color: "#5f6368",
            fontSize: "0.875rem",
            lineHeight: 1.5,
          }}
        >
          {getDescription()}
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          gap: 1,
          justifyContent: "flex-end",
        }}
      >
        <Button
          onClick={onClose}
          sx={{
            textTransform: "none",
            fontSize: "14px",
            fontWeight: 500,
            color: "#1a73e8",
            px: 2,
            py: 1,
            borderRadius: "20px",
            "&:hover": {
              backgroundColor: "rgba(26, 115, 232, 0.12)",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          sx={{
            textTransform: "none",
            fontSize: "14px",
            fontWeight: 500,
            color: "#1a73e8",
            px: 2,
            py: 1,
            borderRadius: "20px",
            "&:hover": {
              backgroundColor: "rgba(26, 115, 232, 0.12)",
            },
          }}
        >
          Move to trash
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeleteContactsModal;
