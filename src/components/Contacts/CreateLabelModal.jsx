import React, { useEffect, useRef, useState } from "react";
import { Backdrop, Box, Typography, TextField, Button, FormHelperText } from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { generateNextIntegerId } from "../../utils/helperFunctions";

// Snackbar style for this screen
const snackbarStyle = {
  left: "50% !important",
  transform: "translateX(-50%) !important",
  "& .MuiSnackbarContent-root": {
    backgroundColor: "#303030",
    color: "#fff",
    minHeight: "40px",
  },
};

const CreateLabelModal = ({ open, onClose, backdropStyle = {}, isEdit = false, editLabel = null }) => {
  const { recipientLabels, setRecipientLabels, setRecipients, setSnackbar } = useGlobalContext();
  const [formData, setFormData] = useState({
    labelName: isEdit && editLabel ? editLabel.label : "",
    error: "",
  });
  const inputRef = useRef(null);
  const focusTimeoutRef = useRef(null);

  // Clear timeouts on unmount
  useEffect(
    () => () => {
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
    },
    []
  );

  // Validate label name and check for duplicates
  const validateLabelName = (labelName) => {
    const trimmedName = labelName.trim();

    if (!trimmedName) {
      return "No name specified.";
    }

    // Check for duplicate names (case-insensitive), but exclude current label if editing
    const isDuplicate = recipientLabels.some(
      (label) => label.label.toLowerCase() === trimmedName.toLowerCase() && (!isEdit || label.id !== editLabel?.id)
    );

    if (isDuplicate) {
      return "Label name already exists";
    }

    return "";
  };

  // Handle label name input changes with real-time validation
  const handleLabelNameChange = (e) => {
    const value = e.target.value;
    const error = validateLabelName(value);

    setFormData({
      labelName: value,
      error: error,
    });
  };

  // Validate and save the new label to GlobalContext
  const handleSave = () => {
    const trimmedName = formData.labelName.trim();

    // Do the error check once again before saving
    const error = validateLabelName(trimmedName);
    if (error) {
      setFormData({
        labelName: trimmedName,
        error: error,
      });

      // Focus on the input field
      focusTimeoutRef.current = setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }

    if (isEdit && editLabel) {
      // Update existing label
      const updatedLabel = {
        ...editLabel,
        label: trimmedName,
      };

      // Update the label in recipientLabels array
      setRecipientLabels((prev) => prev.map((label) => (label.id === editLabel.id ? updatedLabel : label)));

      // Update all recipients that have this label
      setRecipients((prev) =>
        prev.map((recipient) => ({
          ...recipient,
          labels: recipient.labels?.map((label) => (label === editLabel.label ? trimmedName : label)),
        }))
      );
    } else {
      // Create new label
      const newLabel = {
        id: generateNextIntegerId(recipientLabels),
        label: trimmedName,
      };

      // Add the new label to the recipientLabels array
      setRecipientLabels((prev) => [...prev, newLabel]);
    }

    // Display success snackbar only for create mode
    if (!isEdit) {
      setSnackbar({
        open: true,
        message: `Label ${trimmedName} created`,
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
        action: null,
      });
    }

    onClose();
  };

  // Handle Enter key press to save the label
  const handleKeyUp = (e) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  return (
    <Backdrop
      open={open}
      sx={{ position: "absolute", zIndex: 70, backgroundColor: "rgba(0, 0, 0, 0.35)", ...backdropStyle }}
      onClick={onClose}
    >
      <Box
        sx={{
          minWidth: "300px",
          backgroundColor: "#e9eef6",
          borderRadius: "28px",
          p: 3,
          mx: 2,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography
          sx={{
            fontSize: "1.5rem",
            fontWeight: 400,
            lineHeight: "2rem",
            color: "#1f1f1f",
            mb: 2.5,
          }}
        >
          {isEdit ? "Rename label" : "Create label"}
        </Typography>

        <TextField
          fullWidth
          inputRef={inputRef}
          value={formData.labelName}
          onChange={handleLabelNameChange}
          onKeyUp={handleKeyUp}
          label="New label"
          variant="outlined"
          error={!!formData.error}
          autoFocus
          sx={{
            "& .MuiOutlinedInput-root": {
              "& fieldset": {
                borderColor: formData.error ? "#b3261f" : "#747775",
              },
              "&:hover fieldset": {
                borderColor: formData.error ? "#b3261f" : "black",
              },
              "&.Mui-focused fieldset": {
                borderColor: formData.error ? "#b3261f" : "#0b57d0",
                borderWidth: "3px",
              },
            },
          }}
        />
        <FormHelperText
          error
          sx={{
            color: "#b3261f",
            mt: 0.25,
            ml: 1.5,
            fontSize: "0.75rem",
            height: "20px",
          }}
        >
          {formData.error ?? ""}
        </FormHelperText>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, mt: 2.5 }}>
          <Button
            variant="text"
            size="medium"
            onClick={onClose}
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "none",
              color: "#0b57d0",
              borderRadius: "50px",
              px: "10px",
              py: 1,
              "&:hover": {
                backgroundColor: "rgba(11, 87, 208, 0.08)",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="text"
            onClick={handleSave}
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "none",
              color: "#0b57d0",
              borderRadius: "50px",
              px: "10px",
              py: 1,
              "&:hover": {
                backgroundColor: "rgba(11, 87, 208, 0.08)",
              },
            }}
          >
            Save
          </Button>
        </Box>
      </Box>
    </Backdrop>
  );
};

export default CreateLabelModal;
