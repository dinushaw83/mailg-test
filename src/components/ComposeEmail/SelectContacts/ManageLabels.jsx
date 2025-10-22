import React, { useMemo, useState } from "react";
import {
  Button,
  Popper,
  ClickAwayListener,
  Paper,
  MenuList,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from "@mui/material";
import { useGlobalContext } from "../../../contexts/GlobalContext";
import { generateNextIntegerId } from "../../../utils/helperFunctions";

export default function ManageLabels({ selectedContacts, recipients, recipientLabels }) {
  const { setRecipientLabels, setRecipients } = useGlobalContext();
  const [anchorEl, setAnchorEl] = useState(null);
  const [open, setOpen] = useState(false);
  const [createLabelDialogOpen, setCreateLabelDialogOpen] = useState(false);
  const [labelName, setLabelName] = useState("");
  const [labelNameError, setLabelNameError] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [localLabelChanges, setLocalLabelChanges] = useState(new Set());
  const [showApplyButton, setShowApplyButton] = useState(false);

  // Get selected contact objects
  const selectedContactObjects = useMemo(() => {
    return recipients.filter((recipient) => selectedContacts.has(`${recipient.email}-${recipient.id}`));
  }, [recipients, selectedContacts]);

  // Check if all selected contacts have a specific label (considering local changes)
  const hasLabelForAllSelected = (labelName) => {
    if (selectedContactObjects.length === 0) return false;

    // Check if this label is being locally toggled
    if (localLabelChanges.has(labelName)) {
      // If it's in local changes, it means we're toggling it
      // Check if all contacts currently have this label
      const allHaveLabel = selectedContactObjects.every((contact) => contact.labels.includes(labelName));
      // If all have it, we're removing it (so show no tick)
      // If not all have it, we're adding it (so show tick)
      return !allHaveLabel;
    }

    return selectedContactObjects.every((contact) => contact.labels.includes(labelName));
  };

  // Handle button click
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setOpen(true);
  };

  // Handle close
  const handleClose = () => {
    setOpen(false);
    setAnchorEl(null);
    // Reset local changes when closing without applying
    setLocalLabelChanges(new Set());
    setShowApplyButton(false);
  };

  // Handle label toggle
  const handleLabelToggle = (labelName) => {
    const newLocalChanges = new Set(localLabelChanges);

    if (newLocalChanges.has(labelName)) {
      // If already in local changes, remove it (revert)
      newLocalChanges.delete(labelName);
    } else {
      // Add to local changes
      newLocalChanges.add(labelName);
    }

    setLocalLabelChanges(newLocalChanges);
    setShowApplyButton(newLocalChanges.size > 0);
  };

  // Handle create label
  const handleCreateLabel = () => {
    setCreateLabelDialogOpen(true);
    handleClose();
  };

  // Handle create label dialog close
  const handleCreateLabelDialogClose = () => {
    setCreateLabelDialogOpen(false);
    setLabelName("");
    setLabelNameError("");
  };

  // Handle label name change
  const handleLabelNameChange = (event) => {
    setLabelName(event.target.value);
    if (labelNameError) {
      setLabelNameError("");
    }
  };

  // Handle create label form submit
  const handleCreateLabelSubmit = (event) => {
    event.preventDefault();

    if (!labelName.trim()) {
      setLabelNameError("No name specified.");
      return;
    }

    const trimmedLabelName = labelName.trim();

    // Check if label already exists
    const labelExists = recipientLabels.some((label) => label.label.toLowerCase() === trimmedLabelName.toLowerCase());

    if (labelExists) {
      // Show error snackbar
      setSnackbarMessage("Trouble creating label.");
      setSnackbarOpen(true);
      handleCreateLabelDialogClose();
      return;
    }

    // Create the new label with next integer ID
    const newLabel = {
      id: generateNextIntegerId(recipientLabels),
      label: trimmedLabelName,
    };

    // Add the new label to recipientLabels in GlobalContext
    setRecipientLabels((prev) => [...prev, newLabel]);

    // Add the new label to all selected contacts
    if (selectedContacts.size > 0) {
      setRecipients((prev) =>
        prev.map((recipient) => {
          if (selectedContacts.has(`${recipient.email}-${recipient.id}`)) {
            return {
              ...recipient,
              updatedAt: new Date().toISOString(),
              labels: [...recipient.labels, trimmedLabelName],
            };
          }
          return recipient;
        })
      );
    }

    // Show success snackbar
    setSnackbarMessage(`Label ${trimmedLabelName} is created.`);
    setSnackbarOpen(true);

    // Close dialog and reset form
    handleCreateLabelDialogClose();
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  // Handle apply label changes
  const handleApplyLabelChanges = () => {
    const contactCount = selectedContacts.size;
    const labelsToAdd = new Set();
    const labelsToRemove = new Set();

    // Determine which labels are being added vs removed
    localLabelChanges.forEach((labelName) => {
      // Check if all selected contacts currently have this label
      const allHaveLabel = selectedContactObjects.every((contact) => contact.labels.includes(labelName));

      if (allHaveLabel) {
        // All contacts have this label, so we're removing it
        labelsToRemove.add(labelName);
      } else {
        // Not all contacts have this label, so we're adding it
        labelsToAdd.add(labelName);
      }
    });

    // Apply changes to recipients
    setRecipients((prev) =>
      prev.map((recipient) => {
        if (selectedContacts.has(`${recipient.email}-${recipient.id}`)) {
          let newLabels = [...recipient.labels];

          // Remove labels
          labelsToRemove.forEach((labelName) => {
            newLabels = newLabels.filter((label) => label !== labelName);
          });

          // Add labels
          labelsToAdd.forEach((labelName) => {
            if (!newLabels.includes(labelName)) {
              newLabels.push(labelName);
            }
          });

          return {
            ...recipient,
            updatedAt: new Date().toISOString(),
            labels: newLabels,
          };
        }
        return recipient;
      })
    );

    // Show appropriate snackbar message
    let message = "";
    const addedCount = labelsToAdd.size;
    const removedCount = labelsToRemove.size;

    if (addedCount > 0 && removedCount > 0) {
      message = `${contactCount} contact${
        contactCount > 1 ? "s have" : " has"
      } been added to ${addedCount} label(s) and removed from ${removedCount} label(s).`;
    } else if (addedCount > 0) {
      message = `${contactCount} contact${contactCount > 1 ? "s have" : " has"} been added to ${addedCount} label(s).`;
    } else if (removedCount > 0) {
      message = `${contactCount} contact${
        contactCount > 1 ? "s have" : " has"
      } been removed from ${removedCount} label(s).`;
    }

    if (message) {
      setSnackbarMessage(message);
      setSnackbarOpen(true);
    }

    // Reset local changes and close dropdown
    setLocalLabelChanges(new Set());
    setShowApplyButton(false);
    handleClose();
  };

  const isDisabled = selectedContacts.size === 0;

  return (
    <>
      <Button
        variant="text"
        size="small"
        onClick={handleClick}
        disabled={isDisabled}
        sx={{
          textDecoration: "none",
          color: isDisabled ? "rgba(68, 68, 68, 0.502)" : "#38393b",
          fontSize: "14px",
          fontWeight: "500",
          textTransform: "none",
          minWidth: "auto",
          px: 1,
          boxShadow: isDisabled
            ? "none"
            : "0px 2px 2px 0px rgba(0,0,0,.14),0px 3px 1px -2px rgba(0,0,0,.12),0px 1px 5px 0px rgba(0,0,0,.2)",
          "&:hover": {
            backgroundColor: "transparent",
          },
          "&:disabled": {
            color: "#9e9e9e",
          },
        }}
      >
        Manage labels
      </Button>

      {/* Manage Labels Dropdown */}
      <Popper
        open={open}
        anchorEl={anchorEl}
        placement="bottom-start"
        sx={{
          zIndex: 1300,
          boxShadow:
            "0px 8px 10px 1px rgba(0,0,0,.14),0px 3px 14px 2px rgba(0,0,0,.12),0px 5px 5px -3px rgba(0,0,0,.2)",
        }}
      >
        <ClickAwayListener onClickAway={handleClose}>
          <Paper sx={{ width: 280, maxWidth: "100%", borderRadius: 0 }}>
            <MenuList>
              {/* Title */}
              <MenuItem disabled sx={{ py: 1.5 }} style={{ color: "#757575", opacity: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 400, fontSize: "12px", color: "#757575" }}>
                  Manage labels
                </Typography>
              </MenuItem>

              {/* Label List */}
              {recipientLabels.map((label) => (
                <MenuItem
                  key={label.id}
                  onClick={() => handleLabelToggle(label.label)}
                  sx={{
                    py: 1,
                    "&:hover": {
                      backgroundColor: "#f5f5f5",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#929292" }}>
                      label
                    </span>
                  </ListItemIcon>
                  <ListItemText
                    primary={label.label}
                    slotProps={{
                      primary: {
                        fontSize: "14px",
                        color: "#222",
                      },
                    }}
                  />
                  {hasLabelForAllSelected(label.label) && (
                    <span className="material-symbols-outlined" style={{ fontSize: "26px", color: "#8a8a8a" }}>
                      check
                    </span>
                  )}
                </MenuItem>
              ))}

              {/* Divider */}
              <Divider />

              {/* Apply Button or Create Label Button */}
              {showApplyButton ? (
                <MenuItem
                  onClick={handleApplyLabelChanges}
                  sx={{
                    py: 1,
                    "&:hover": {
                      backgroundColor: "#f5f5f5",
                    },
                  }}
                >
                  <ListItemText
                    primary="Apply"
                    slotProps={{
                      primary: {
                        fontSize: "14px",
                        color: "#1f1f1f",
                      },
                    }}
                  />
                </MenuItem>
              ) : (
                <MenuItem
                  onClick={handleCreateLabel}
                  sx={{
                    py: 1,
                    "&:hover": {
                      backgroundColor: "#f5f5f5",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#8d8d8d" }}>
                      add
                    </span>
                  </ListItemIcon>
                  <ListItemText
                    primary="Create label"
                    slotProps={{
                      primary: {
                        fontSize: "14px",
                        color: "#1f1f1f",
                      },
                    }}
                  />
                </MenuItem>
              )}
            </MenuList>
          </Paper>
        </ClickAwayListener>
      </Popper>

      {/* Create Label Dialog */}
      <Dialog
        open={createLabelDialogOpen}
        onClose={handleCreateLabelDialogClose}
        sx={{
          "& .MuiPaper-root": {
            borderRadius: 0,
            width: "350px",
          },
          "& .MuiBackdrop-root": {
            width: "650px",
            height: "calc(80vh + 5px)",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
          },
        }}
      >
        <DialogTitle sx={{ fontSize: "20px", fontWeight: 500 }}>Create label</DialogTitle>
        <form onSubmit={handleCreateLabelSubmit}>
          <DialogContent sx={{ pt: 0, pb: "30px" }}>
            <TextField
              autoFocus
              margin="dense"
              id="labelName"
              name="labelName"
              placeholder="New label"
              fullWidth
              variant="standard"
              value={labelName}
              onChange={handleLabelNameChange}
              error={!!labelNameError}
              helperText={labelNameError}
              sx={{
                "& .MuiInput-underline:before": {
                  borderBottomColor: "#e4e4e4",
                },
                "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
                  borderBottomColor: "#e4e4e4",
                  borderBottomWidth: "1px",
                },
                "& .MuiInput-underline:after": {
                  borderBottomColor: "rgb(26,115,232)",
                },
                "& .MuiInput-underline.Mui-error:after": {
                  borderBottomColor: "#d50000",
                },
                "& .MuiInput-underline.Mui-error:before": {
                  borderBottomColor: "#d50000",
                  borderBottomWidth: "2px",
                },
                "& .MuiInput-underline.Mui-error:hover:not(.Mui-disabled):before": {
                  borderBottomColor: "#d50000",
                  borderBottomWidth: "2px",
                },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleCreateLabelDialogClose}
              sx={{
                color: "rgb(26,115,232)",
                textTransform: "none",
                "&:hover": {
                  color: "rgb(17, 70, 141)",
                },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              sx={{
                color: "rgb(26,115,232)",
                textTransform: "none",
                "&:hover": {
                  color: "rgb(17, 70, 141)",
                },
              }}
            >
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={handleSnackbarClose}
        message={snackbarMessage}
        sx={{
          "& .MuiSnackbarContent-root": {
            backgroundColor: "#000",
            color: "#fff",
          },
        }}
      />
    </>
  );
}
