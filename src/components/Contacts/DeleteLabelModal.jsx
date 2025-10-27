import React, { useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Backdrop, Box, Typography, Button, Radio, RadioGroup, FormControlLabel, FormControl } from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";

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

const DeleteLabelModal = ({ open, onClose, label, backdropStyle = {} }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setRecipientLabels, recipients, setRecipients, setSnackbar, setDeletedRecipients } = useGlobalContext();
  const [deleteOption, setDeleteOption] = useState("keep");
  const recipientsWithLabelRef = useRef([]);
  const labelRef = useRef(null);

  // Get contacts count with this label
  const getContactsCount = () => {
    return recipients.filter((recipient) => recipient.labels?.includes(label?.label)).length;
  };

  // Handle delete option change
  const handleDeleteOptionChange = (event) => {
    setDeleteOption(event.target.value);
  };

  // Handle undo delete label
  const handleUndoDeleteLabel = () => {
    // Restore the label to recipientLabels
    setRecipientLabels((prev) => [...prev, labelRef.current]);

    // Restore all recipients that were deleted (for delete option) or restore their labels (for keep option)
    setRecipients((prev) => {
      // Get all current recipients
      const currentRecipients = [...prev];

      // Add back all the recipients that were stored (this handles both cases of label only delete and label with contacts delete)
      recipientsWithLabelRef.current.forEach((originalRecipient) => {
        // Check if recipient already exists (for keep option)
        const existingIndex = currentRecipients.findIndex((r) => r.id === originalRecipient.id);
        if (existingIndex !== -1) {
          // Update existing recipient with original labels (for keep option)
          currentRecipients[existingIndex] = originalRecipient;
        } else {
          // Add back deleted recipient (for delete option)
          currentRecipients.push(originalRecipient);
        }
      });

      return currentRecipients;
    });

    // Display undo snackbar
    setSnackbar({
      open: true,
      message: "Undone",
      autoHideDuration: 3000,
      hideClose: true,
      style: snackbarStyle,
      action: null,
    });
  };

  // Handle delete action
  const handleDelete = () => {
    if (deleteOption === "keep") {
      // Store recipients with this label for undo functionality
      recipientsWithLabelRef.current = recipients.filter((recipient) => recipient.labels?.includes(label.label));

      // Store label to label ref
      labelRef.current = { ...label };

      // Navigate to the contacts screen if pathname is `/contacts/label/${label.id}`
      if (location.pathname === `/contacts/label/${label.id}`) {
        navigate("/contacts");
      }

      // Keep all contacts and delete this label
      // Remove the label from all recipients
      setRecipients((prev) =>
        prev.map((recipient) => ({
          ...recipient,
          updatedAt: new Date().toISOString(),
          labels: recipient.labels?.filter((l) => l !== label.label),
        }))
      );

      // Remove the label from recipientLabels
      setRecipientLabels((prev) => prev.filter((l) => l.id !== label.id));

      // Display success snackbar with undo button
      setSnackbar({
        open: true,
        message: `Label ${label.label} deleted`,
        autoHideDuration: 5000,
        hideClose: false,
        style: snackbarStyle,
        closeIconColor: "#fff",
        action: (
          <Button variant="text" size="medium" onClick={handleUndoDeleteLabel} sx={{ textTransform: "capitalize" }}>
            Undo
          </Button>
        ),
      });
    } else {
      // Store recipients with this label for undo functionality
      recipientsWithLabelRef.current = recipients.filter((recipient) => recipient.labels?.includes(label.label));

      // Store label to label ref
      labelRef.current = { ...label };

      // Navigate to the contacts screen if pathname is `/contacts/label/${label.id}`
      if (location.pathname === `/contacts/label/${label.id}`) {
        navigate("/contacts");
      }

      // Add the contacts to the deleted recipients
      setDeletedRecipients((prev) => [
        ...prev,
        ...recipients
          .filter((recipient) => recipient.labels && recipient.labels.includes(label.label))
          .map((contact) => ({ ...contact, updatedAt: new Date().toISOString() })),
      ]);

      // Delete all recipients with this label
      setRecipients((prev) => prev.filter((recipient) => !recipient.labels?.includes(label.label)));

      // Remove the label from recipientLabels
      setRecipientLabels((prev) => prev.filter((l) => l.id !== label.id));

      // Display success snackbar with undo button
      setSnackbar({
        open: true,
        message: `Label ${label.label} deleted`,
        autoHideDuration: 5000,
        hideClose: false,
        style: snackbarStyle,
        closeIconColor: "#fff",
        action: (
          <Button variant="text" size="medium" onClick={handleUndoDeleteLabel} sx={{ textTransform: "capitalize" }}>
            Undo
          </Button>
        ),
      });
    }

    onClose();
  };

  // Handle cancel action
  const handleCancel = () => {
    onClose();
  };

  return (
    <Backdrop
      open={open}
      sx={{ position: "absolute", zIndex: 70, backgroundColor: "rgba(0, 0, 0, 0.35)", ...backdropStyle }}
      onClick={onClose}
    >
      <Box
        sx={{
          width: "500px",
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
          Delete this label
        </Typography>

        <Typography
          sx={{
            fontSize: "0.875rem",
            fontWeight: 400,
            lineHeight: "1.25rem",
            color: "#444746",
            mb: 2.5,
          }}
        >
          This label has {getContactsCount()} contact{getContactsCount() !== 1 ? "s" : ""}. Choose what to do with{" "}
          {getContactsCount() === 1 ? "it" : "them"}.
        </Typography>

        <FormControl component="fieldset" sx={{ mb: 3, ml: 2 }}>
          <RadioGroup
            value={deleteOption}
            onChange={handleDeleteOptionChange}
            sx={{
              "& .MuiFormControlLabel-root": {
                marginBottom: 1,
              },
              "& .MuiRadio-root": {
                color: "#0b57d0",
                "&.Mui-checked": {
                  color: "#0b57d0",
                },
              },
            }}
          >
            <FormControlLabel
              value="keep"
              control={<Radio />}
              label="Keep all contacts and delete this label"
              sx={{
                "& .MuiFormControlLabel-label": {
                  fontSize: "1rem",
                  fontWeight: 400,
                  color: "#1f1f1f",
                  ml: 1.5,
                },
              }}
            />
            <FormControlLabel
              value="delete"
              control={<Radio />}
              label="Delete all contacts and delete this label"
              sx={{
                "& .MuiFormControlLabel-label": {
                  fontSize: "1rem",
                  fontWeight: 400,
                  color: "#1f1f1f",
                  ml: 1.5,
                },
              }}
            />
          </RadioGroup>
        </FormControl>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
          <Button
            variant="text"
            size="medium"
            onClick={handleCancel}
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
            onClick={handleDelete}
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
            Delete
          </Button>
        </Box>
      </Box>
    </Backdrop>
  );
};

export default DeleteLabelModal;
