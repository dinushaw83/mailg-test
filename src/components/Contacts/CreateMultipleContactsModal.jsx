import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Tooltip,
  IconButton,
  Autocomplete,
} from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { generateNextIntegerId, isValidEmail } from "../../utils/helperFunctions";

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

const CreateMultipleContactsModal = ({ open, onClose }) => {
  const {
    recipientLabels,
    setCreateLabelModal,
    recipients,
    hiddenRecipients,
    deletedRecipients,
    setRecipients,
    setSnackbar,
  } = useGlobalContext();
  const [selectedLabels, setSelectedLabels] = useState(new Set());
  const [tempLabels, setTempLabels] = useState(new Set());
  const [labelMenuAnchor, setLabelMenuAnchor] = useState(null);
  const [contactChips, setContactChips] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const timeoutRef = useRef(null);

  // Clear timeouts on unmount
  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  // Parse contact text into contact objects with validation
  const parseContacts = (text) => {
    if (!text.trim()) return [];

    const contacts = text
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item);
    return contacts.map((contact) => {
      // Check if it's in format "name<email>" or "name<>"
      const emailMatch = contact.match(/^(.+)<(.+)?>$/);
      if (emailMatch) {
        const name = emailMatch[1].trim();
        const email = emailMatch[2] ? emailMatch[2].trim() : "";

        // If email is empty, treat as name only
        if (email === "") {
          return {
            name: name,
            email: "",
            isValid: true,
          };
        }

        // Validate email
        const isEmailValid = isValidEmail(email);
        return {
          name: name,
          email: email,
          isValid: isEmailValid,
        };
      }

      // Check if it's an email (contains @)
      if (contact.includes("@")) {
        const isEmailValid = isValidEmail(contact);
        return {
          name: "",
          email: contact,
          isValid: isEmailValid,
        };
      }

      // Otherwise it's a name
      return {
        name: contact,
        email: "",
        isValid: true,
      };
    });
  };

  // Handle paste event for multiple contacts
  const handlePaste = (event) => {
    // Blur the input to convert the pasted text to chips
    setTimeout(() => {
      event.target.blur();
    }, 0);
  };

  // Handle input change
  const handleInputChange = (event, newInputValue) => {
    setInputValue(newInputValue);
  };

  // Handle blur - convert remaining input to chips
  const handleBlur = () => {
    if (inputValue.trim()) {
      const contacts = parseContacts(inputValue);
      if (contacts.length > 0) {
        setContactChips((prev) => [...prev, ...contacts]);
        setInputValue("");
      }
    }
  };

  // Handle keydown for Enter key
  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      // Prevent default behavior and stop propagation
      event.preventDefault();
      event.stopPropagation();

      // Parse contacts and add to chips if there is a valid input
      if (inputValue.trim()) {
        const contacts = parseContacts(inputValue);
        if (contacts.length > 0) {
          setContactChips((prev) => [...prev, ...contacts]);
          setTimeout(() => setInputValue(""), 0);
        }
      }
    }
  };

  // Open label menu
  const handleLabelMenuOpen = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setLabelMenuAnchor(event.currentTarget);
    // Initialize temp labels with current selected labels
    setTempLabels(new Set(selectedLabels));
  };

  // Close label menu
  const handleLabelMenuClose = () => {
    setLabelMenuAnchor(null);
    // Reset temp labels to current selected labels when closing
    setTempLabels(new Set(selectedLabels));
  };

  // Handle label toggle (updates temp labels)
  const handleLabelToggle = (labelName) => {
    setTempLabels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(labelName)) {
        newSet.delete(labelName);
      } else {
        newSet.add(labelName);
      }
      return newSet;
    });
  };

  // Apply labels
  const handleApplyLabels = () => {
    setSelectedLabels(new Set(tempLabels));
    setLabelMenuAnchor(null);
  };

  // Handle create label
  const handleCreateLabel = () => {
    setCreateLabelModal({
      show: true,
      type: "create",
      labelId: null,
    });
    setLabelMenuAnchor(null);
  };

  // Get label display text
  const getLabelDisplayText = () => {
    if (selectedLabels.size === 0) {
      return "No Label";
    } else if (selectedLabels.size === 1) {
      return Array.from(selectedLabels)[0];
    } else {
      return `${selectedLabels.size} Labels`;
    }
  };

  // Check if there are any changes from current selected labels
  const hasLabelChanges = () => {
    if (tempLabels.size !== selectedLabels.size) return true;
    for (const label of tempLabels) {
      if (!selectedLabels.has(label)) return true;
    }
    for (const label of selectedLabels) {
      if (!tempLabels.has(label)) return true;
    }
    return false;
  };

  // Check if there are any invalid chips
  const hasInvalidChips = () => {
    return contactChips.some((contact) => !contact.isValid);
  };

  // Get invalid chips count
  const getInvalidChipsCount = () => {
    return contactChips.filter((contact) => !contact.isValid).length;
  };

  const handleCancel = () => {
    setInputValue("");
    setSelectedLabels(new Set());
    setTempLabels(new Set());
    setContactChips([]);
    onClose();
  };

  const handleCreate = () => {
    if (contactChips.length === 0 || hasInvalidChips()) return;

    // Display working notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    // Get next integer ID for recipients
    const nextId = generateNextIntegerId([...recipients, ...hiddenRecipients, ...deletedRecipients]);

    // Get current date string in ISO format
    const dateString = new Date().toISOString();

    // Create temp contact array with sequential IDs
    const tempContactArray = contactChips.map((contact, index) => ({
      id: nextId + index,
      name: contact.name ?? "",
      firstName: contact.name?.split(" ")[0] ?? "",
      lastName: contact.name?.split(" ")?.slice(1).join(" ") ?? "",
      email: contact.email ?? "",
      emails: contact.email ? [{ value: contact.email, label: "" }] : [],
      labels: Array.from(selectedLabels),
      isFavorite: false,
      isSaved: true,
      savedAt: dateString,
      updatedAt: dateString,
      createdAt: dateString,
    }));

    // After 500ms timeout, append contacts to recipients
    setTimeout(() => {
      setRecipients((prev) => [...prev, ...tempContactArray]);

      // Close modal
      handleCancel();

      // Display success notification
      setSnackbar({
        open: true,
        message: `${contactChips.length} Contact${contactChips.length > 1 ? "s" : ""} have been added`,
        action: null,
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
      });
    }, 500);
  };

  const handleImportContacts = () => {
    // TODO: Implement import contacts logic
  };

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <Box
        sx={{
          backgroundColor: "#e9eef6",
          borderRadius: "28px",
          width: "500px",
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: 3,
            pt: 3,
            pb: 1,
          }}
        >
          <Typography
            variant="p"
            sx={{
              fontSize: "1rem",
              fontWeight: 500,
              color: "#444746",
            }}
          >
            Create Multiple Contacts
          </Typography>

          {/* Label Selector */}
          <Button
            onClick={handleLabelMenuOpen}
            startIcon={
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", color: selectedLabels.size > 0 ? "#0b57d0" : "#747775" }}
              >
                label
              </span>
            }
            sx={{
              backgroundColor: "transparent",
              color: selectedLabels.size > 0 ? "#0b57d0" : "#1f1f1f",
              border: "1px solid #747775",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: 500,
              px: 1,
              py: 0.25,
              textTransform: "none",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.08)",
              },
            }}
          >
            {getLabelDisplayText()}
          </Button>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3, flex: 1 }}>
          {/* Input Field with Chips */}
          <Autocomplete
            multiple
            freeSolo
            options={[]}
            value={contactChips}
            onChange={(event, newChips) => setContactChips(newChips)}
            inputValue={inputValue}
            onInputChange={handleInputChange}
            renderValue={(value, getTagProps) =>
              value.map((contact, index) => (
                <Chip
                  key={index}
                  variant="outlined"
                  label={contact.name ? `${contact.name}${contact.email ? ` <${contact.email}>` : ""}` : contact.email}
                  size="small"
                  deleteIcon={
                    <Tooltip
                      title="Remove"
                      placement="top"
                      slotProps={{
                        popper: {
                          sx: {
                            "& .MuiTooltip-tooltip": {
                              backgroundColor: "rgba(0, 0, 0, 0.8)",
                              color: "white",
                              fontSize: "12px",
                              fontWeight: 300,
                            },
                          },
                        },
                      }}
                    >
                      <IconButton size="small" sx={{ width: "24px", height: "24px" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                          close
                        </span>
                      </IconButton>
                    </Tooltip>
                  }
                  sx={{
                    backgroundColor: contact.isValid ? "transparent" : "#f9dedc",
                    color: contact.isValid ? "#1f1f1f" : "#b3261e",
                    border: contact.isValid ? "1px solid #747775" : "1px solid #b3261e",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    fontWeight: 400,
                    pl: 1,
                    pr: 0,
                    py: 1.75,
                    "&:hover:not(:has(.MuiChip-deleteIcon:hover))": {
                      backgroundColor: contact.isValid ? "rgba(0, 0, 0, 0.08)" : "#f9dedc",
                    },
                    "& .MuiChip-deleteIcon": {
                      color: contact.isValid ? "#747775" : "#b3261e",
                      fontSize: "18px",
                      "&:hover": {
                        color: contact.isValid ? "#1f1f1f" : "#b3261e",
                        backgroundColor: "rgba(0, 0, 0, 0.08)",
                      },
                    },
                  }}
                  {...getTagProps({ index })}
                />
              ))
            }
            renderInput={(params) => {
              const { InputProps, ...restParams } = params;
              return (
                <TextField
                  {...restParams}
                  placeholder={contactChips.length === 0 ? "Add names, email addresses, or both" : ""}
                  variant="standard"
                  slotProps={{
                    input: {
                      sx: {
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "flex-end",
                        "&:before": {
                          borderBottom: "none",
                        },
                        "&:hover:not(.Mui-disabled):before": {
                          borderBottom: "none",
                        },
                        "&:after": {
                          borderBottom: "none",
                        },
                      },
                      onBlur: handleBlur,
                      onPaste: handlePaste,
                      onKeyDown: handleKeyDown,
                      startAdornment: (
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.5,
                            alignItems: "center",
                          }}
                        >
                          {InputProps.startAdornment}
                        </Box>
                      ),
                    },
                  }}
                  sx={{
                    "& .MuiInputBase-input": {
                      fontSize: "0.875rem",
                      color: "#1f1f1f",
                      fontWeight: 500,
                      "&::placeholder": {
                        color: "rgba(0, 0, 0, 0.65)",
                        fontSize: "14px",
                        fontWeight: 400,
                        opacity: 1,
                      },
                    },
                  }}
                />
              );
            }}
          />

          {/* Horizontal line */}
          <Box sx={{ width: "100%", height: "1px", backgroundColor: "#c4c7c5", mt: 2, mb: 1 }} />

          {/* Error Message */}
          {hasInvalidChips() && (
            <Typography
              variant="body2"
              sx={{
                color: "#b3261e",
                fontSize: "12px",
                fontWeight: 400,
                mt: 1,
                mb: 2,
              }}
            >
              {getInvalidChipsCount()} contact{getInvalidChipsCount() > 1 ? "s" : ""} doesn't match the examples.
              Correct to continue.
            </Typography>
          )}

          {/* Instructions */}
          <Typography variant="p" sx={{ fontSize: "12px", color: "#444746", fontWeight: 300 }}>
            {"Example: Andrea Fisher, weaver.blake98@gmail.com, Elisa Beckett <elisa.beckett@gmail.com>"}
          </Typography>

          {/* Import Option */}
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="body2"
              sx={{
                fontSize: "0.875rem",
                color: "#444746",
                fontWeight: 400,
              }}
            >
              Have a CSV or vCard file?{" "}
              <span onClick={handleImportContacts} style={{ color: "#0b57d0", cursor: "pointer" }}>
                Import Contacts
              </span>{" "}
              instead.
            </Typography>
          </Box>
        </Box>

        {/* Footer */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            p: 3,
          }}
        >
          <Button
            variant="text"
            onClick={handleCancel}
            sx={{
              textTransform: "none",
              fontSize: "0.875rem",
              color: "#0b57d0",
              px: 2,
              py: 1,
              borderRadius: "28px",
              "&:hover": {
                backgroundColor: "rgba(11, 87, 208, 0.08)",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            variant="text"
            onClick={handleCreate}
            disabled={contactChips.length === 0 || hasInvalidChips()}
            sx={{
              textTransform: "none",
              fontSize: "0.875rem",
              color: "#0b57d0",
              px: 2,
              py: 1,
              borderRadius: "28px",
              "&:hover": {
                backgroundColor: "rgba(11, 87, 208, 0.08)",
              },
              "&:disabled": {
                color: "#9e9e9e",
              },
            }}
          >
            Create
          </Button>
        </Box>

        {/* Label Selection Menu */}
        <Menu
          anchorEl={labelMenuAnchor}
          open={Boolean(labelMenuAnchor)}
          onClose={handleLabelMenuClose}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          sx={{
            zIndex: 60,
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
                Add to label
              </Typography>

              {/* Labels List */}
              {[...recipientLabels]
                .sort((a, b) => a.label.localeCompare(b.label))
                .map((label) => {
                  const isSelected = tempLabels.has(label.label);

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
                      <Box sx={{ display: "flex", alignItems: "center", flex: 1, ml: 1 }}>
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
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "28px", color: "rgb(26,115,232)" }}
                        >
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

          {/* Show Apply Changes or Create Label based on whether there are changes */}
          {hasLabelChanges() ? (
            /* Apply Changes Button */
            <MenuItem onClick={handleApplyLabels}>
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
      </Box>
    </Box>
  );
};

export default CreateMultipleContactsModal;
