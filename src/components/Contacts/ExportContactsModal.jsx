import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import {
  generateGoogleCSV,
  generateOutlookCSV,
  generateVCard,
  downloadFile,
  filterContactsByGroup,
} from "../../utils/contactExport";

const ExportContactsModal = ({
  open,
  onClose,
  selectedContactsCount,
  totalContactsCount,
  availableLabels = [],
  allContacts = [],
  selectedContactIds = new Set(),
  singleContact = null,
  currentLabel = null,
}) => {
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [exportFormat, setExportFormat] = useState("google-csv");

  // Reset to appropriate default when modal opens
  useEffect(() => {
    if (open) {
      if (singleContact) {
        setSelectedGroup("single");
      } else if (selectedContactsCount > 0) {
        setSelectedGroup("selected");
      } else if (currentLabel?.id) {
        setSelectedGroup(`label-${currentLabel.id}`);
      } else {
        setSelectedGroup("all");
      }
    }
  }, [open, selectedContactsCount, singleContact, currentLabel]); // Only run when modal opens or selection changes

  const handleExport = () => {
    try {
      // Handle single contact export
      let contactsToExport;
      if (singleContact && selectedGroup === "single") {
        contactsToExport = [singleContact];
      } else {
        // Filter contacts based on selected group
        contactsToExport = filterContactsByGroup(allContacts, selectedGroup, selectedContactIds, availableLabels);
      }

      if (contactsToExport.length === 0) {
        console.warn("No contacts to export");
        onClose();
        return;
      }

      // Generate content based on format
      let content, filename, mimeType;

      switch (exportFormat) {
        case "google-csv":
          content = generateGoogleCSV(contactsToExport);
          filename = "contacts.csv";
          mimeType = "text/csv";
          break;
        case "outlook-csv":
          content = generateOutlookCSV(contactsToExport);
          filename = "contacts.csv";
          mimeType = "text/csv";
          break;
        case "vcard":
          content = generateVCard(contactsToExport);
          filename = "contacts.vcf";
          mimeType = "text/vcard";
          break;
        default:
          console.error("Unknown export format:", exportFormat);
          return;
      }

      // Download the file
      downloadFile(content, filename, mimeType);

      onClose();
    } catch (error) {
      console.error("Error exporting contacts:", error);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const getGroupOptions = () => {
    const options = [];

    // If we have a single contact, don't show any dropdown options
    if (singleContact) {
      return [];
    }

    // Always show selected contacts option, but disable if count is 0
    options.push({
      value: "selected",
      label: `Selected contacts (${selectedContactsCount})`,
      disabled: selectedContactsCount === 0,
    });

    // Calculate total count of all saved contacts
    const totalSavedContactsCount = allContacts.length;

    options.push({
      value: "all",
      label: `Contacts (${totalSavedContactsCount})`,
    });

    // For now, we'll use 0 for frequently contacted since we can't determine this
    options.push({
      value: "frequent",
      label: `Frequently contacted (0)`,
      disabled: true,
    });

    // Extract all unique labels from contacts
    const allContactLabels = new Set();
    allContacts.forEach((contact) => {
      if (contact.labels && Array.isArray(contact.labels)) {
        contact.labels.forEach((label) => allContactLabels.add(label));
      }
    });

    // Add Labels section if there are any labels
    if (allContactLabels.size > 0) {
      // Add divider before labels section
      options.push({
        value: "divider-before-labels",
        label: "",
        isDivider: true,
      });

      options.push({
        value: "divider",
        label: "Labels",
        isDivider: true,
      });

      // Convert Set to Array and sort alphabetically
      const sortedLabels = Array.from(allContactLabels).sort();

      // Calculate counts for each label and create options
      sortedLabels.forEach((labelName, index) => {
        const count = allContacts.filter((contact) => contact.labels && contact.labels.includes(labelName)).length;

        options.push({
          value: `label-${labelName}`, // Use label name as ID for dynamic labels
          label: `${labelName} (${count})`,
          disabled: count === 0,
        });
      });
    }

    return options;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: "28px",
          maxWidth: "348px",
          width: "348px",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: "24px",
          fontWeight: 400,
          color: "#1f1f1f",
          px: 3,
          py: 2,
        }}
      >
        {singleContact ? "Export contact" : "Export contacts"}
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 1 }}>
        {/* Only hide contact selection dropdown when exporting a single contact from row */}
        {!singleContact && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="body2"
              sx={{
                fontSize: "14px",
                fontWeight: 400,
                color: "#1f1f1f",
                mb: 1,
              }}
            >
              Select contacts
            </Typography>
            <FormControl fullWidth>
              <Select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                displayEmpty
                sx={{
                  backgroundColor: "rgb(225, 227, 225)",
                  borderRadius: "4px 4px 0 0",
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                    borderBottom: "2px solid #1a73e8",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                    borderBottom: "2px solid #1a73e8",
                  },
                  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                    borderBottom: "2px solid #1a73e8",
                  },
                  "& .MuiSelect-select": {
                    backgroundColor: "transparent",
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      "& .MuiMenuItem-root.Mui-selected": {
                        backgroundColor: "rgb(225, 227, 225)",
                        "&:hover": {
                          backgroundColor: "rgb(225, 227, 225)",
                        },
                      },
                    },
                  },
                }}
              >
                {getGroupOptions().map((option) => (
                  <MenuItem
                    key={option.value}
                    value={option.value}
                    disabled={option.isDivider || option.disabled}
                    sx={
                      option.isDivider
                        ? option.label === ""
                          ? {
                              // Empty divider - just a line
                              borderTop: "1px solid #e0e0e0",
                              margin: "8px 0",
                              minHeight: "1px",
                              padding: 0,
                              "&.Mui-disabled": {
                                opacity: 1,
                              },
                            }
                          : {
                              // Labels header
                              fontWeight: 600,
                              fontSize: "16px",
                              color: "#1f1f1f",
                              textTransform: "none",
                              "&.Mui-disabled": {
                                opacity: 1,
                              },
                            }
                        : option.disabled
                        ? {
                            color: "#9aa0a6",
                            "&.Mui-disabled": {
                              opacity: 0.6,
                            },
                          }
                        : {}
                    }
                  >
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        <Box>
          <Typography
            variant="body2"
            sx={{
              fontSize: "14px",
              fontWeight: 400,
              color: "#1f1f1f",
              mb: 2,
            }}
          >
            Export as
          </Typography>
          <RadioGroup
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            sx={{
              "& .MuiFormControlLabel-root": {
                alignItems: "center",
                mb: 1,
              },
              "& .MuiRadio-root": {
                color: "#1a73e8",
                "&.Mui-checked": {
                  color: "#1a73e8",
                },
              },
              "& .MuiFormControlLabel-label": {
                fontSize: "14px",
                color: "#1f1f1f",
                fontWeight: 400,
                marginLeft: "8px",
              },
            }}
          >
            <FormControlLabel value="google-csv" control={<Radio />} label="Google CSV" />
            <FormControlLabel value="outlook-csv" control={<Radio />} label="CSV for Outlook only" />
            <FormControlLabel value="vcard" control={<Radio />} label="vCard for Android or iOS" />
          </RadioGroup>

          {/* Show info section when vCard is selected */}
          {exportFormat === "vcard" && (
            <Box
              sx={{
                mt: 2,
                py: "20px",
                px: "16px",
                backgroundColor: "rgb(194, 231, 255)",
                borderRadius: "4px",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontSize: "14px",
                  color: "#1f1f1f",
                  fontWeight: 400,
                }}
              >
                Trying to back up your mobile contacts?{" "}
                <a
                  href="#"
                  rel="noopener noreferrer"
                  style={{
                    color: "#1a73e8",
                    textDecoration: "none",
                  }}
                >
                  Here's how to sync them
                </a>
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          gap: 1,
        }}
      >
        <Button
          onClick={handleCancel}
          sx={{
            textTransform: "none",
            fontSize: "14px",
            fontWeight: 500,
            color: "#1a73e8",
            px: 2,
            py: 1,
            borderRadius: "20px",
            "&:hover": {
              backgroundColor: "rgba(26, 115, 232, 0.12)",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          sx={{
            textTransform: "none",
            fontSize: "14px",
            fontWeight: 500,
            color: "#1a73e8",
            px: 2,
            py: 1,
            borderRadius: "20px",
            "&:hover": {
              backgroundColor: "rgba(26, 115, 232, 0.12)",
            },
          }}
        >
          Export
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportContactsModal;
