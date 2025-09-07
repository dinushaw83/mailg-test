import React, { useState, useMemo, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  TextField,
  IconButton,
  Checkbox,
  FormControl,
  Select,
  MenuItem,
  List,
  ListItem,
  Avatar,
  Divider,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Radio,
  RadioGroup,
  FormControlLabel,
  Snackbar,
} from "@mui/material";
import ManageLabels from "./ManageLabels";
import { useGlobalContext } from "../../../contexts/GlobalContext";
import styles from "./SelectContacts.module.css";

export default function SelectContacts({ open, onClose, handleInsertContacts, addedRecipients = [] }) {
  const { recipients, recipientLabels, setRecipients, setRecipientLabels } = useGlobalContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState("My contacts");
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [deleteLabelDialogOpen, setDeleteLabelDialogOpen] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState(null);
  const [deleteOption, setDeleteOption] = useState("keep");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Initialize selectedContacts with addedRecipients when component opens
  useEffect(() => {
    if (open && addedRecipients.length > 0) {
      const addedRecipientIds = new Set(addedRecipients.map((recipient) => recipient.id).filter(Boolean));
      setSelectedContacts(addedRecipientIds);
    }
  }, [open, addedRecipients]);

  // Filter contacts based on selected label and search query
  const filteredContacts = useMemo(() => {
    if (!recipients) return [];

    if (isSearching && selectedLabel === "Search Results") {
      return searchResults;
    }

    let filtered;
    if (selectedLabel === "All contacts") {
      filtered = recipients;
    } else {
      filtered = recipients.filter(
        (recipient) => recipient && recipient.labels && recipient.labels.includes(selectedLabel)
      );
    }

    return filtered;
  }, [recipients, selectedLabel, searchResults, isSearching]);

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim() || !recipients) {
      return; // Ignore empty search
    }

    const results = recipients.filter(
      (recipient) =>
        recipient &&
        recipient.name &&
        recipient.email &&
        (recipient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipient.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    setSearchResults(results);
    setIsSearching(true);
    setSelectedLabel("Search Results");
    setSelectedContacts(new Set()); // Clear selection when searching
  };

  // Handle search input key press
  const handleSearchKeyPress = (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  };

  // Handle label change
  const handleLabelChange = (event) => {
    const newLabel = event.target.value;
    setSelectedLabel(newLabel);

    // Remove search results when switching to other menu items
    if (newLabel !== "Search Results") {
      setIsSearching(false);
      setSearchResults([]);
      setSearchQuery("");
    }
  };

  // Handle select all contacts
  const handleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map((contact) => contact.id)));
    }
  };

  // Handle contact select
  const handleContactSelect = (contactId) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  // Handle inserting selected contacts
  const handleInsert = () => {
    if (!recipients) return;
    const selectedRecipients = recipients.filter((recipient) => recipient && selectedContacts.has(recipient.id));
    handleInsertContacts(selectedRecipients);
    onClose();
  };

  // Close the modal
  const handleClose = () => {
    setSelectedContacts(new Set());
    onClose();
  };

  // Handle close footer
  const handleCloseFooter = () => {
    setSelectedContacts(new Set());
  };

  const isAllSelected = filteredContacts.length > 0 && selectedContacts.size === filteredContacts.length;

  // Count contacts for a specific label
  const getContactCountForLabel = (labelName) => {
    if (!labelName || !recipients) return 0;

    // Handle search results
    if (labelName === "Search Results") {
      return searchResults.length;
    }

    return recipients.filter((recipient) => recipient.labels && recipient.labels.includes(labelName)).length;
  };

  // Handle delete label
  const handleDeleteLabel = (labelName) => {
    // Handle search results deletion
    if (labelName === "Search Results") {
      if (searchResults.length === 0) {
        // No search results, just clear search and show notification
        setIsSearching(false);
        setSearchResults([]);
        setSearchQuery("");
        setSelectedLabel("My contacts");
        setSnackbarMessage("Label Search Results deleted");
        setSnackbarOpen(true);
      } else {
        // Has search results, show dialog
        setLabelToDelete(labelName);
        setDeleteLabelDialogOpen(true);
      }
      return;
    }

    const contactCount = getContactCountForLabel(labelName);

    if (contactCount === 0) {
      // No contacts have this label, delete directly
      deleteLabel(labelName);
    } else {
      // Contacts have this label, show dialog
      setLabelToDelete(labelName);
      setDeleteLabelDialogOpen(true);
    }
  };

  // Delete label function
  const deleteLabel = (labelName) => {
    if (!labelName) return;

    // Remove label from recipientLabels
    setRecipientLabels((prev) => prev.filter((label) => label.label !== labelName));

    // Remove label from all contacts
    setRecipients((prev) =>
      prev.map((recipient) => ({
        ...recipient,
        labels: recipient.labels ? recipient.labels.filter((label) => label !== labelName) : [],
      }))
    );

    // Switch to "My contacts" if the deleted label was currently selected
    if (selectedLabel === labelName) {
      setSelectedLabel("My contacts");
    }

    // Show success message
    setSnackbarMessage(`Label ${labelName} deleted`);
    setSnackbarOpen(true);
  };

  // Handle delete label dialog close
  const handleDeleteLabelDialogClose = () => {
    setDeleteLabelDialogOpen(false);
    setLabelToDelete(null);
    setDeleteOption("keep");
  };

  // Handle delete option change
  const handleDeleteOptionChange = (event) => {
    setDeleteOption(event.target.value);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (!labelToDelete) return;

    // Handle search results deletion
    if (labelToDelete === "Search Results") {
      if (deleteOption === "keep") {
        // Keep all contacts and clear search results
        setIsSearching(false);
        setSearchResults([]);
        setSearchQuery("");
        setSelectedLabel("My contacts");
        setSnackbarMessage("Label Search Results deleted");
      } else {
        // Delete all contacts and clear search results
        const searchResultIds = searchResults.map((result) => result.id);
        setRecipients((prev) => prev.filter((recipient) => !searchResultIds.includes(recipient.id)));
        setIsSearching(false);
        setSearchResults([]);
        setSearchQuery("");
        setSelectedLabel("My contacts");
        setSnackbarMessage("Label Search Results deleted");
      }
      setSnackbarOpen(true);
      handleDeleteLabelDialogClose();
      return;
    }

    if (deleteOption === "keep") {
      // Keep all contacts and delete this label
      deleteLabel(labelToDelete);
    } else {
      // Delete all contacts and delete this label
      // Remove label from recipientLabels
      setRecipientLabels((prev) => prev.filter((label) => label.label !== labelToDelete));

      // Remove contacts that have this label
      setRecipients((prev) =>
        prev.filter((recipient) => !recipient.labels || !recipient.labels.includes(labelToDelete))
      );

      // Switch to "My contacts" if the deleted label was currently selected
      if (selectedLabel === labelToDelete) {
        setSelectedLabel("My contacts");
      }

      // Show success message
      setSnackbarMessage(`Label ${labelToDelete} deleted`);
      setSnackbarOpen(true);
    }

    handleDeleteLabelDialogClose();
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <>
      <Modal
        open={open}
        aria-labelledby="select-contacts-modal"
        sx={{
          "& .MuiModal-backdrop": {
            backgroundColor: "rgba(255, 255, 255, 0.6)",
          },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 650,
            height: "80vh",
            bgcolor: "background.paper",
            boxShadow: 24,
            display: "flex",
            flexDirection: "column",
            border: "1px solid #ababa9",
            overflow: "hidden",
            paddingBottom: "5px",
          }}
        >
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 2, pl: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <div className={styles.personIcon}>
                <span className="material-symbols-filled" style={{ color: "#fff" }}>
                  person
                </span>
              </div>

              <Typography component="p" sx={{ fontSize: "1rem", fontWeight: "500" }}>
                Select contacts
              </Typography>
            </Box>

            {/* Search */}
            <TextField
              fullWidth
              placeholder="Search for contacts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyUp={handleSearchKeyPress}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start" sx={{ width: "24px", height: "24px" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: "24px" }} onClick={handleSearch}>
                        search
                      </span>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                maxWidth: "400px",
                "& .MuiInputBase-root": {
                  height: "48px",
                  backgroundColor: "#f5f5f5",
                  "&.Mui-focused": {
                    backgroundColor: "#fff",
                    boxShadow: "0 1px 2px rgba(60,64,67,.3),0 2px 6px 2px rgba(60,64,67,.15)",
                    borderBottomLeftRadius: "0px",
                    borderBottomRightRadius: "0px",
                  },
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "transparent !important",
                  borderWidth: "0 !important",
                },
                "& .MuiInputBase-input": {
                  "&::placeholder": {
                    color: "#777778",
                    opacity: 1,
                  },
                },
              }}
            />

            <IconButton onClick={handleClose} size="medium">
              <span className="material-symbols-outlined">close</span>
            </IconButton>
          </Box>

          {/* Toolbar */}
          <Box sx={{ px: 3, pb: 1, pr: 4.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Checkbox
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  size="medium"
                  sx={{
                    color: "#1f1f1f",
                  }}
                />
                <Typography component="p" sx={{ fontSize: "1rem", color: "#1f1f1f", lineHeight: "normal" }}>
                  Select All
                </Typography>
              </Box>

              {/* Manage Labels */}
              <ManageLabels
                selectedContacts={selectedContacts}
                recipients={recipients}
                recipientLabels={recipientLabels}
              />

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={selectedLabel}
                  onChange={handleLabelChange}
                  displayEmpty
                  sx={{
                    color: "#222",
                    fontSize: "14px",
                    fontWeight: "500",
                    height: "32px",
                    width: "150px",
                    boxShadow: "0 2px 2px 0 rgba(0,0,0,.14),0 3px 1px -2px rgba(0,0,0,.12),0 1px 5px 0 rgba(0,0,0,.2)",
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "transparent !important",
                      borderWidth: "0 !important",
                    },
                    "& .MuiSelect-icon": {
                      color: "#bbbbbb",
                      right: 0,
                    },
                  }}
                  MenuProps={{
                    transformOrigin: {
                      vertical: "center",
                      horizontal: "center",
                    },
                    sx: {
                      "& .MuiButtonBase-root": {
                        color: "#222",
                        fontSize: "14px",
                        fontWeight: "500",
                        "&:hover": {
                          backgroundColor: "#eeeeee",
                        },
                      },
                      "& .Mui-selected": {
                        backgroundColor: "transparent",
                        "&:hover": {
                          backgroundColor: "#eeeeee",
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="All contacts">All contacts</MenuItem>
                  {recipientLabels.map((label) => (
                    <MenuItem key={label.id} value={label.label}>
                      {label.label}
                    </MenuItem>
                  ))}
                  {isSearching && <MenuItem value="Search Results">Search Results</MenuItem>}
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Divider />

          {/* Content */}
          <Box sx={{ flex: 1, overflow: "auto", py: 2 }}>
            {/* Added Recipients Section */}
            {addedRecipients.length > 0 && (
              <>
                <Box sx={{ px: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: "12px" }}>
                    Added recipients
                  </Typography>
                </Box>
                <List sx={{ p: 0, pb: 1.5 }}>
                  {addedRecipients.map((contact) => {
                    if (!contact || !contact.id) return null;
                    const isSelected = selectedContacts.has(contact.id);
                    return (
                      <ListItem
                        key={contact.id}
                        sx={{
                          px: 2,
                          py: 1,
                          cursor: "pointer",
                          position: "relative",
                          bgcolor: isSelected ? "#f2f3f4" : "transparent",
                          borderLeft: isSelected ? "5px solid #2974ea" : "5px solid transparent",
                          "&:hover": {
                            bgcolor: isSelected ? "#f2f3f4" : "action.hover",
                            "& .checkbox-container": {
                              display: "flex",
                            },
                            "& .avatar-container": {
                              display: "none",
                            },
                          },
                        }}
                        onClick={() => handleContactSelect(contact.id)}
                      >
                        {/* Checkbox - visible when selected or on hover */}
                        <Box
                          className="checkbox-container"
                          sx={{
                            display: isSelected ? "flex" : "none",
                            mr: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            width: 40,
                            height: 40,
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleContactSelect(contact.id)}
                            size="medium"
                            sx={{
                              color: "rgba(0, 0, 0, 0.6)",
                              "&.Mui-checked": {
                                color: "#1976d2",
                              },
                            }}
                          />
                        </Box>

                        {/* Avatar - hidden when selected, shown on hover when not selected */}
                        <Box
                          className="avatar-container"
                          sx={{
                            display: isSelected ? "none" : "flex",
                            mr: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            width: 40,
                            height: 40,
                          }}
                        >
                          <Avatar
                            src={contact?.avatar}
                            sx={{
                              bgcolor: "#e0e0e0",
                              width: 40,
                              height: 40,
                            }}
                          >
                            {!contact?.avatar && (
                              <span className="material-symbols-filled" style={{ fontSize: "26px", color: "#bdbdbd" }}>
                                person
                              </span>
                            )}
                          </Avatar>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            ml: "4px",
                          }}
                        >
                          <Typography
                            variant="body1"
                            sx={{
                              fontSize: "16px",
                              color: "#565658",
                              fontWeight: "400",
                            }}
                          >
                            {contact?.name || "Unknown"}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: "14px",
                              color: "#9e9e9d",
                              fontWeight: "400",
                              width: "200px",
                              textOverflow: "ellipsis",
                              overflow: "hidden",
                            }}
                          >
                            {contact?.email || "No email"}
                          </Typography>
                        </Box>
                      </ListItem>
                    );
                  })}
                </List>
              </>
            )}

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, pb: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: "12px", marginBottom: 0 }}>
                {addedRecipients.length > 0 ? selectedLabel : selectedLabel.toUpperCase()}{" "}
                {addedRecipients.length > 0 ? "" : `(${filteredContacts.length})`}
              </Typography>

              {/* Delete */}
              {selectedLabel !== "All contacts" && selectedLabel !== "My contacts" && addedRecipients.length === 0 && (
                <IconButton
                  size="small"
                  sx={{ "& .MuiIconButton-sizeSmall": { width: "24px", height: "24px" } }}
                  onClick={() => handleDeleteLabel(selectedLabel)}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                    delete
                  </span>
                </IconButton>
              )}
            </Box>

            {filteredContacts.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "60px",
                    color: "#9e9e9e",
                    display: "block",
                    marginBottom: "16px",
                  }}
                >
                  orders
                </span>
                <Typography variant="h6" sx={{ fontWeight: "500", mb: 1, fontSize: "16px", color: "rgb(60,64,67)" }}>
                  There's nothing here.
                </Typography>
                <Typography variant="body2" sx={{ fontSize: "14px", color: "rgb(95,99,104)", fontWeight: "400" }}>
                  There are no contacts for this user.
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0, pb: selectedContacts.size > 0 ? "50px" : "0" }}>
                {filteredContacts.map((contact) => {
                  if (!contact || !contact.id) return null;
                  const isSelected = selectedContacts.has(contact.id);
                  return (
                    <ListItem
                      key={contact.id}
                      sx={{
                        px: 2,
                        py: 1,
                        cursor: "pointer",
                        position: "relative",
                        bgcolor: isSelected ? "#f2f3f4" : "transparent",
                        borderLeft: isSelected ? "5px solid #2974ea" : "5px solid transparent",
                        "&:hover": {
                          bgcolor: isSelected ? "#f2f3f4" : "action.hover",
                          "& .checkbox-container": {
                            display: "flex",
                          },
                          "& .avatar-container": {
                            display: "none",
                          },
                        },
                      }}
                      onClick={() => handleContactSelect(contact.id)}
                    >
                      {/* Checkbox - visible when selected or on hover */}
                      <Box
                        className="checkbox-container"
                        sx={{
                          display: isSelected ? "flex" : "none",
                          mr: 1,
                          alignItems: "center",
                          justifyContent: "center",
                          width: 40,
                          height: 40,
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleContactSelect(contact.id)}
                          size="medium"
                          sx={{
                            color: "rgba(0, 0, 0, 0.6)",
                            "&.Mui-checked": {
                              color: "#1976d2",
                            },
                          }}
                        />
                      </Box>

                      {/* Avatar - hidden when selected, shown on hover when not selected */}
                      <Box
                        className="avatar-container"
                        sx={{
                          display: isSelected ? "none" : "flex",
                          mr: 1,
                          alignItems: "center",
                          justifyContent: "center",
                          width: 40,
                          height: 40,
                        }}
                      >
                        <Avatar
                          src={contact?.avatar}
                          sx={{
                            bgcolor: "#e0e0e0",
                            width: 40,
                            height: 40,
                          }}
                        >
                          {!contact?.avatar && (
                            <span className="material-symbols-filled" style={{ fontSize: "26px", color: "#bdbdbd" }}>
                              person
                            </span>
                          )}
                        </Avatar>
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          ml: "4px",
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            fontSize: "16px",
                            color: "#565658",
                            fontWeight: "400",
                          }}
                        >
                          {contact?.name || "Unknown"}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "14px",
                            color: "#9e9e9d",
                            fontWeight: "400",
                            width: "200px",
                            textOverflow: "ellipsis",
                            overflow: "hidden",
                          }}
                        >
                          {contact?.email || "No email"}
                        </Typography>
                      </Box>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </Box>

          {/* Footer */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 1,
              py: "6px",
              bgcolor: "#e7f0fd",
              boxShadow: "0 0 6px 0 rgba(0,0,0,.2)",
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              transform: selectedContacts.size > 0 ? "translateY(0)" : "translateY(100%)",
              transition: "transform 0.3s ease-in-out",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <IconButton onClick={handleCloseFooter} size="medium">
                <span className="material-symbols-outlined" style={{ color: "#386bd0" }}>
                  close
                </span>
              </IconButton>
              <Typography variant="body2" sx={{ color: "rgb(60,64,67)", fontSize: "1rem" }}>
                {selectedContacts.size} selected
              </Typography>
            </Box>

            <Button
              onClick={handleInsert}
              variant="contained"
              size="small"
              type="button"
              sx={{
                bgcolor: "#1e50d0",
                color: "white",
                px: 3,
                py: 1,
                borderRadius: "20px",
                textTransform: "capitalize",
                fontSize: "14px",
                fontWeight: "500",
                "&:hover": {
                  opacity: 0.9,
                },
              }}
            >
              Insert
            </Button>
          </Box>

          <Snackbar
            open={snackbarOpen}
            autoHideDuration={2000}
            onClose={handleSnackbarClose}
            message={snackbarMessage}
            sx={{
              bottom: "0px !important",
              left: "50% !important",
              transform: "translateX(-50%) !important",
              "& .MuiSnackbarContent-root": {
                backgroundColor: "#000",
                color: "#fff",
              },
            }}
          />
        </Box>
      </Modal>

      {/* Delete Label Dialog */}
      <Dialog
        open={deleteLabelDialogOpen}
        onClose={handleDeleteLabelDialogClose}
        sx={{
          "& .MuiPaper-root": {
            borderRadius: 0,
            width: "500px",
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
        <DialogTitle sx={{ fontSize: "20px", fontWeight: 500 }}>Delete this label</DialogTitle>
        <DialogContent sx={{ pt: 0, pb: "20px" }}>
          <Typography variant="body2" sx={{ mb: 2, fontSize: "14px", fontWeight: "400", color: "#434343" }}>
            This label has {labelToDelete ? getContactCountForLabel(labelToDelete) : 0} contact
            {labelToDelete && getContactCountForLabel(labelToDelete) !== 1 ? "s" : ""}. Choose what to do with them.
          </Typography>
          <FormControl component="fieldset">
            <RadioGroup value={deleteOption} onChange={handleDeleteOptionChange}>
              <FormControlLabel
                value="keep"
                control={<Radio sx={{ color: "#2c9380 !important" }} />}
                label="Keep all contacts and delete this label"
                sx={{
                  "& .MuiTypography-root": {
                    fontSize: "14px",
                    fontWeight: "400",
                    color: "#434343",
                    marginTop: "2px",
                  },
                }}
              />
              <FormControlLabel
                value="delete"
                control={<Radio sx={{ color: "#2c9380 !important" }} />}
                label="Delete all contacts and delete this label"
                sx={{
                  "& .MuiTypography-root": {
                    fontSize: "14px",
                    fontWeight: "400",
                    color: "#434343",
                    marginTop: "2px",
                  },
                }}
              />
            </RadioGroup>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteLabelDialogClose}
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
            onClick={handleDeleteConfirm}
            sx={{
              color: "rgb(26,115,232)",
              textTransform: "none",
              "&:hover": {
                color: "rgb(17, 70, 141)",
              },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
