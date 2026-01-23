import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import styles from "./DeleteTemplateDialog.module.css";

export default function DeleteTemplateDialog({ open, onClose, onConfirm, templateName = "", isLoading = false }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: styles.dialogPaper,
      }}
    >
      <DialogTitle className={styles.dialogTitle}>Delete template?</DialogTitle>

      <DialogContent className={styles.dialogContent}>
        <Typography className={styles.description}>
          This will permanently delete the template "{templateName}". This action cannot be undone.
        </Typography>
      </DialogContent>

      <DialogActions className={styles.dialogActions}>
        <Button onClick={onClose} disabled={isLoading} className={styles.cancelButton}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isLoading} variant="contained" className={styles.deleteButton}>
          {isLoading ? "Deleting..." : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
