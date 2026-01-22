import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
import styles from "./OverwriteTemplateDialog.module.css";

export default function OverwriteTemplateDialog({ open, onClose, onConfirm, templateName = "", isLoading = false }) {
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
      <DialogTitle className={styles.dialogTitle}>Overwrite template?</DialogTitle>

      <DialogContent className={styles.dialogContent}>
        <Typography className={styles.description}>
          This will replace the existing template "{templateName}". Are you sure you want to continue?
        </Typography>
      </DialogContent>

      <DialogActions className={styles.dialogActions}>
        <Button onClick={onClose} disabled={isLoading} className={styles.cancelButton}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isLoading} variant="contained" className={styles.overwriteButton}>
          {isLoading ? "Saving..." : "Overwrite"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
