import React, { useState, useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography } from "@mui/material";
import styles from "./CreateTemplateDialog.module.css";

export default function CreateTemplateDialog({ open, onClose, onConfirm, defaultName = "", isLoading = false }) {
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    if (open) {
      setTemplateName(defaultName);
    }
  }, [open, defaultName]);

  const handleConfirm = () => {
    if (templateName.trim()) {
      onConfirm(templateName.trim());
    }
  };

  const handleClose = () => {
    setTemplateName("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className: styles.dialogPaper,
      }}
    >
      <DialogTitle className={styles.dialogTitle}>Save as template</DialogTitle>

      <DialogContent className={styles.dialogContent}>
        <Typography className={styles.description}>Enter a name for this template</Typography>
        <TextField
          fullWidth
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          placeholder="Template name"
          variant="outlined"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && templateName.trim()) {
              handleConfirm();
            }
          }}
          className={styles.textField}
        />
      </DialogContent>

      <DialogActions className={styles.dialogActions}>
        <Button onClick={handleClose} disabled={isLoading} className={styles.cancelButton}>
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!templateName.trim() || isLoading}
          variant="contained"
          className={styles.saveButton}
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
