// components/ConfirmDeleteSpamModal.jsx
import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";

export default function ConfirmDeleteSpamModal({ open, onClose, onConfirm, selectedCount = 1, isDeleteAll = false }) {
  const conversationText = selectedCount === 1 ? "conversation" : "conversations";
  const isAllSpam = isDeleteAll || selectedCount === 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="delete-spam-title"
      aria-describedby="delete-spam-description"
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "28px",
          fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
        },
      }}
    >
      <DialogTitle
        id="delete-spam-title"
        sx={{
          fontSize: "28px",
          lineHeight: "36px",
          fontWeight: 200,
          letterSpacing: ".01em",
          padding: "28px 28px 0",
        }}
      >
        Confirm deleting messages
      </DialogTitle>

      <DialogContent sx={{ padding: "16px 28px 0" }}>
        <Typography
          id="delete-spam-description"
          sx={{
            fontSize: "16px",
            lineHeight: "24px",
            color: "#3c4043",
          }}
        >
          {isAllSpam
            ? "This action will delete all messages in Spam. Are you sure you want to continue?"
            : `This action will affect the ${selectedCount} ${conversationText} in Spam. Are you sure you want to continue?`}
        </Typography>
      </DialogContent>

      <DialogActions sx={{ padding: "20px", justifyContent: "flex-end", gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            color: "#1a73e8",
            borderRadius: "9999px",
            padding: "10px 16px",
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            textTransform: "none",
            fontWeight: 600,
            backgroundColor: "#1a73e8",
            borderRadius: "9999px",
            padding: "10px 24px",
            "&:hover": {
              backgroundColor: "#1557b0",
            },
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
