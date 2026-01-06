import React, { useState, useEffect, useRef } from "react";
import { Menu, MenuItem, ListItemIcon, ListItemText, Typography, Box, Divider, Button } from "@mui/material";
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

const ManageLabelsDropdown = ({ anchorEl, open, onClose, selectedContacts, contacts }) => {
  const { recipientLabels, setRecipients, setSnackbar, setCreateLabelModal } = useGlobalContext();
  const [selectedLabels, setSelectedLabels] = useState(new Set());
  const [initialLabels, setInitialLabels] = useState(new Set());
  const timeoutsRef = useRef({});
  const originalRecipientsRef = useRef(null);

  // Clear timeouts on unmount
  useEffect(
    () => () => {
      Object.keys(timeoutsRef.current).forEach((key) => {
        clearTimeout(timeoutsRef.current[key]);
      });
    },
    []
  );

  // Find common labels across all selected contacts
  useEffect(() => {
    if (selectedContacts.size === 0) {
      setSelectedLabels(new Set());
      return;
    }

    // Get all selected contact objects
    const selectedContactObjects = contacts
      .flatMap((section) => section.data || [])
      .filter((contact) => selectedContacts.has(contact.id));

    if (selectedContactObjects.length === 0) {
      setSelectedLabels(new Set());
      return;
    }

    // Find labels that are common to ALL selected contacts
    const allLabels = new Set();
    const labelCounts = new Map();

    selectedContactObjects.forEach((contact) => {
      const contactLabels = contact.labels || [];
      contactLabels.forEach((label) => {
        allLabels.add(label);
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      });
    });

    // Labels that appear in ALL selected contacts are common
    const common = new Set();
    labelCounts.forEach((count, label) => {
      if (count === selectedContactObjects.length) {
        common.add(label);
      }
    });

    setSelectedLabels(common);
    setInitialLabels(common);
  }, [selectedContacts, contacts]);

  // Check if there are any changes from initial state
  const hasChanges = () => {
    if (selectedLabels.size !== initialLabels.size) return true;
    for (const label of selectedLabels) {
      if (!initialLabels.has(label)) return true;
    }
    for (const label of initialLabels) {
      if (!selectedLabels.has(label)) return true;
    }
    return false;
  };

  // Handle label toggle
  const handleLabelToggle = (labelName) => {
    setSelectedLabels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(labelName)) {
        newSet.delete(labelName);
      } else {
        newSet.add(labelName);
      }
      return newSet;
    });
  };

  // Apply changes to all selected contacts
  const handleApplyChanges = () => {
    // Close dropdown immediately
    onClose();

    // Display working snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    timeoutsRef.current["saveChanges"] = setTimeout(() => {
      if (selectedContacts.size === 0) return;

      // Get all selected contact objects
      const selectedContactObjects = contacts
        .flatMap((section) => section.data || [])
        .filter((contact) => selectedContacts.has(contact.id));

      if (selectedContactObjects.length === 0) return;

      // Find labels to add and remove
      const labelsToAdd = new Set();
      const labelsToRemove = new Set();

      // Labels that are in selectedLabels but not in initialLabels (to add)
      selectedLabels.forEach((label) => {
        if (!initialLabels.has(label)) {
          labelsToAdd.add(label);
        }
      });

      // Labels that are in initialLabels but not in selectedLabels (to remove)
      initialLabels.forEach((label) => {
        if (!selectedLabels.has(label)) {
          labelsToRemove.add(label);
        }
      });

      setRecipients((prev) => {
        // Store the current state for undo
        originalRecipientsRef.current = [...prev];

        // Get all contacts that need to be updated (including unsaved ones)
        const contactsToUpdate = selectedContactObjects;
        const currentTime = new Date().toISOString();

        // Create a map of existing recipients for quick lookup
        const existingRecipientsMap = new Map(prev.map((recipient) => [recipient.id, recipient]));

        // Process each selected contact
        const updatedRecipients = [...prev];
        const newContacts = [];

        contactsToUpdate.forEach((contact) => {
          const existingRecipient = existingRecipientsMap.get(contact.id);

          if (existingRecipient) {
            // Update existing recipient
            const currentLabels = new Set(existingRecipient.labels || []);

            // Add new labels
            labelsToAdd.forEach((label) => {
              currentLabels.add(label);
            });

            // Remove labels
            labelsToRemove.forEach((label) => {
              currentLabels.delete(label);
            });

            // Find and update the recipient in the array
            const recipientIndex = updatedRecipients.findIndex((r) => r.id === contact.id);
            if (recipientIndex !== -1) {
              updatedRecipients[recipientIndex] = {
                ...existingRecipient,
                isSaved: true, // Ensure it's saved when labels are applied
                savedAt: existingRecipient.savedAt || currentTime,
                updatedAt: currentTime,
                labels: Array.from(currentLabels),
              };
            }
          } else {
            // Contact doesn't exist in recipients, add it as a new saved contact
            const currentLabels = new Set(contact.labels || []);

            // Add new labels
            labelsToAdd.forEach((label) => {
              currentLabels.add(label);
            });

            // Remove labels
            labelsToRemove.forEach((label) => {
              currentLabels.delete(label);
            });

            newContacts.push({
              ...contact,
              name: contact.name || contact.email || "",
              isSaved: true,
              savedAt: currentTime,
              updatedAt: currentTime,
              createdAt: contact.createdAt || currentTime,
              labels: Array.from(currentLabels),
            });
          }
        });

        return [...updatedRecipients, ...newContacts];
      });

      // Check if any contacts were saved (added to recipients)
      const savedContacts = selectedContactObjects.filter((contact) => !contact.isSaved);
      if (savedContacts.length > 0) {
        // Show notification for saved contacts
        const contactName =
          savedContacts.length === 1 ? savedContacts[0].name || savedContacts[0].email || "Contact" : "";
        setSnackbar({
          open: true,
          message:
            savedContacts.length > 1
              ? `${savedContacts.length} contacts have been added`
              : `Added ${contactName} to contacts`,
          action: null,
          autoHideDuration: 1000,
          hideClose: true,
          style: snackbarStyle,
        });
      }

      timeoutsRef.current["showSuccessMessage"] = setTimeout(
        () => {
          // Generate success message
          const successMessage = generateSuccessMessage(labelsToAdd, labelsToRemove, selectedContacts);

          // Show success message with undo button
          setSnackbar({
            open: true,
            message: successMessage,
            autoHideDuration: 5000,
            hideClose: false,
            style: snackbarStyle,
            closeIconColor: "#fff",
            action: (
              <Button
                variant="text"
                size="medium"
                onClick={handleUndoLabelChanges}
                sx={{ textTransform: "capitalize", color: "#a8c7fa", fontWeight: 400 }}
              >
                Undo
              </Button>
            ),
          });

          // Update initial labels to current selection
          setInitialLabels(new Set(selectedLabels));
        },
        savedContacts.length > 0 ? 1000 : 0
      );
    }, 500);
  };

  // Handle undo label changes
  const handleUndoLabelChanges = () => {
    if (!originalRecipientsRef.current) return;

    // Display working snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    timeoutsRef.current["undoChanges"] = setTimeout(() => {
      // Restore original recipients
      setRecipients([...originalRecipientsRef.current]);

      // Display success snackbar
      setSnackbar({
        open: true,
        message: "Undone",
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
        action: null,
      });

      // Reset original recipients ref
      originalRecipientsRef.current = null;
    }, 500);
  };

  // Generate success message based on changes
  const generateSuccessMessage = (labelsToAdd, labelsToRemove, selectedContacts) => {
    const addCount = labelsToAdd.size;
    const removeCount = labelsToRemove.size;
    const isMultipleContacts = selectedContacts.size > 1;

    let contactName;
    if (isMultipleContacts) {
      contactName = `${selectedContacts.size} people`;
    } else {
      // Get the contact name for single contact
      const selectedContactObjects = contacts
        .flatMap((section) => section.data || [])
        .filter((contact) => selectedContacts.has(contact.id));

      if (selectedContactObjects.length > 0) {
        const contact = selectedContactObjects[0];
        contactName = contact.name || contact.email || "Contact";
      } else {
        contactName = "Contact";
      }
    }

    if (addCount === 0 && removeCount === 0) {
      return `${contactName} labels updated`;
    }

    if (addCount === 1 && removeCount === 0) {
      const labelName = Array.from(labelsToAdd)[0];
      return `${contactName} has been added to ${labelName}`;
    }

    if (addCount === 0 && removeCount === 1) {
      const labelName = Array.from(labelsToRemove)[0];
      return `${contactName} has been removed from ${labelName}`;
    }

    if (addCount === 1 && removeCount === 1) {
      const addedLabel = Array.from(labelsToAdd)[0];
      const removedLabel = Array.from(labelsToRemove)[0];
      return `${contactName} has been added to ${addedLabel} and removed from ${removedLabel}`;
    }

    if (addCount > 1 && removeCount === 0) {
      return `${contactName} has been added to ${addCount} labels`;
    }

    if (addCount === 0 && removeCount > 1) {
      return `${contactName} has been removed from ${removeCount} labels`;
    }

    if (addCount > 1 && removeCount > 1) {
      return `${contactName} has been added to ${addCount} labels and removed from ${removeCount} labels`;
    }

    return `${contactName} labels updated`;
  };

  // Handle create label
  const handleCreateLabel = () => {
    // Display create label modal
    setCreateLabelModal({
      show: true,
      type: "create",
      labelId: null,
    });

    // Close dropdown
    onClose();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "left",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "left",
      }}
      sx={{
        zIndex: 30,
        "& .MuiPaper-root": {
          width: "250px",
          borderRadius: "4px",
          backgroundColor: "#f0f4f9",
          boxShadow:
            "0px 8px 10px 1px rgba(0,0,0,.14),0px 3px 14px 2px rgba(0,0,0,.12),0px 5px 5px -3px rgba(0,0,0,.2)",
        },
        "& .MuiMenuItem-root": {
          px: 2,
          py: 1,
          "&:hover": {
            backgroundColor: "#d3dbe5",
          },
        },
      }}
    >
      {/* Title */}
      {recipientLabels?.length > 0 && (
        <Box>
          <Typography
            variant="subtitle1"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#444746",
              mx: 2,
              my: 1,
            }}
          >
            Manage labels
          </Typography>

          {/* Labels List */}
          {[...recipientLabels]
            .sort((a, b) => a.label.localeCompare(b.label))
            .map((label) => {
              const isSelected = selectedLabels.has(label.label);

              return (
                <MenuItem
                  key={`label-${label.id}`}
                  onClick={() => handleLabelToggle(label.label)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    height: "40px",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", flex: 1, ml: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: "20px", color: "#1f1f1f", fontWeight: 500 }}
                      >
                        label
                      </span>
                    </ListItemIcon>
                    <ListItemText
                      primary={label.label}
                      slotProps={{
                        primary: {
                          color: "#1f1f1f",
                          fontSize: "14px",
                          fontWeight: 400,
                        },
                      }}
                    />
                  </Box>
                  {isSelected && (
                    <span className="material-symbols-outlined" style={{ fontSize: "28px", color: "rgb(26,115,232)" }}>
                      check
                    </span>
                  )}
                </MenuItem>
              );
            })}

          {/* Divider */}
          {recipientLabels.length > 0 && <Divider sx={{ my: 1 }} />}
        </Box>
      )}

      {/* Show Create Label or Apply Changes based on whether there are changes */}
      {hasChanges() ? (
        /* Apply Changes Button */
        <MenuItem onClick={handleApplyChanges}>
          <ListItemText
            primary="Apply"
            sx={{ py: 0.5, pl: 5.5 }}
            slotProps={{
              primary: {
                color: "#1f1f1f",
                fontSize: "14px",
                fontWeight: 400,
              },
            }}
          />
        </MenuItem>
      ) : (
        /* Create Label Button */
        <MenuItem onClick={handleCreateLabel}>
          <Box sx={{ display: "flex", alignItems: "center", py: 0.5, pl: 1.5 }}>
            <ListItemIcon>
              <span className="material-symbols-outlined" style={{ fontSize: "21px", color: "#1f1f1f" }}>
                add
              </span>
            </ListItemIcon>
            <ListItemText
              primary="Create label"
              slotProps={{
                primary: {
                  color: "#1f1f1f",
                  fontSize: "14px",
                  fontWeight: 400,
                },
              }}
            />
          </Box>
        </MenuItem>
      )}
    </Menu>
  );
};

export default ManageLabelsDropdown;
