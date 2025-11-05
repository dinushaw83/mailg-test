import React, { useState, useContext, useRef, useMemo, useEffect } from "react";
import { Box, Chip, Popover, Stack, Typography, Avatar, Autocomplete, TextField } from "@mui/material";
import { generateAvatarColor, restructureRecipients } from "../../utils/helperFunctions";
import { GlobalContext } from "../../contexts/GlobalContext";
import RecipientChip from "../ComposeEmail/RecipientChip";
import { useLocation } from "react-router-dom";

const InputStyle = {
  "& .MuiInput-root": {
    fontSize: "14px",
  },
  "& .MuiInputBase-input": {
    padding: "8px 0 !important",
  },
  "& .MuiInput-underline:before": {
    borderBottom: "none",
  },
  "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
    borderBottom: "none",
  },
  "& .MuiInput-underline:after": {
    borderBottom: "none",
  },
};

export default function ContactFilterChip({ label, isActive, onFilterChange }) {
  const { recipients: globalRecipients, loggedInUser } = useContext(GlobalContext);
  const location = useLocation();

  // Process recipients - restructure and remove duplicates
  const recipients = useMemo(() => {
    const restructured = restructureRecipients([
      ...globalRecipients.filter((recipient) => recipient.email),
      loggedInUser,
    ]);
    const seenEmails = new Set();
    return restructured.filter((recipient) => {
      const emailLower = recipient.email.toLowerCase();
      if (seenEmails.has(emailLower)) return false;
      seenEmails.add(emailLower);
      return true;
    });
  }, [globalRecipients]);

  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [chipsHeight, setChipsHeight] = useState(0);
  const inputRef = useRef(null);
  const chipsContainerRef = useRef(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setInputValue("");
  };

  const open = Boolean(anchorEl);
  const id = open ? `${label.toLowerCase()}-filter-popover` : undefined;

  // Sync selected contacts from URL on mount and when URL changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const paramName = label.toLowerCase(); // "from" or "to"
    const emailsParam = searchParams.get(paramName);

    if (emailsParam) {
      // Parse comma-separated emails from URL
      const emails = emailsParam.split(",").map((email) => email.trim().toLowerCase());

      // Find matching recipients from global recipients
      const matchedContacts = [];

      emails.forEach((email) => {
        // First check if it matches the logged-in user
        if (email === loggedInUser.email.toLowerCase()) {
          matchedContacts.push({
            ...loggedInUser,
            id: loggedInUser.email,
          });
        } else {
          // Find in global recipients
          const recipient = recipients.find((r) => r.email.toLowerCase() === email);
          if (recipient) {
            matchedContacts.push(recipient);
          } else {
            // Create a custom recipient if not found
            matchedContacts.push({
              id: `custom-${email}`,
              name: email,
              email: email,
              avatar: null,
            });
          }
        }
      });

      setSelectedContacts(matchedContacts);
    } else {
      // Clear selected contacts if no parameter in URL
      setSelectedContacts([]);
    }
  }, [location.search, label, recipients, loggedInUser]);

  // Auto-focus input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // Measure chips container height whenever selectedContacts changes
  useEffect(() => {
    if (chipsContainerRef.current) {
      const height = chipsContainerRef.current.offsetHeight;
      setChipsHeight(height);
    } else {
      setChipsHeight(0);
    }
  }, [selectedContacts]);

  // Filter options based on input (keep selected contacts visible)
  const filterOptions = (options, { inputValue }) => {
    // Ensure inputValue is a string
    const searchValue = typeof inputValue === "string" ? inputValue : "";

    if (!searchValue || searchValue.trim() === "") {
      // Show all options when no input, limited to 8
      return options.slice(0, 8);
    }

    const filteredOptions = options.filter((option) => {
      const matchesSearch =
        option.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        option.email.toLowerCase().includes(searchValue.toLowerCase());
      return matchesSearch;
    });

    return filteredOptions.slice(0, 8);
  };

  // Validate email format
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handle selecting a contact from the dropdown
  const handleAutocompleteChange = (event, newValue) => {
    if (newValue) {
      let contactToAdd;

      // Check if newValue is a string (freeSolo input) or an object (selected option)
      if (typeof newValue === "string") {
        const trimmedValue = newValue.trim();

        // Validate email format
        if (!isValidEmail(trimmedValue)) {
          // Invalid email, don't add it
          setInputValue("");
          return;
        }

        // Create a custom contact object from the string
        contactToAdd = {
          id: `custom-${trimmedValue}`,
          name: trimmedValue,
          email: trimmedValue,
          avatar: null,
        };
      } else {
        // newValue is already a contact object
        contactToAdd = newValue;
      }

      // Check if already selected
      const isAlreadySelected = selectedContacts.some(
        (selected) => selected.email === contactToAdd.email && selected.id === contactToAdd.id
      );

      if (!isAlreadySelected) {
        const newSelected = [...selectedContacts, contactToAdd];
        setSelectedContacts(newSelected);

        // Notify parent component
        if (onFilterChange) {
          onFilterChange(label, newSelected);
        }
      }

      setInputValue("");
      // Close the popover after selection
      handleClose();
    }
  };

  // Handle input value changes
  const handleInputChange = (event, newInputValue) => {
    // Ensure newInputValue is a string
    const value = typeof newInputValue === "string" ? newInputValue : "";
    setInputValue(value);
  };

  // Handle keyboard events
  const handleKeyDown = (event) => {
    // Handle Backspace to remove last chip when input is empty
    if (event.key === "Backspace" && !inputValue && selectedContacts.length > 0) {
      event.preventDefault();
      const newSelected = selectedContacts.slice(0, -1);
      setSelectedContacts(newSelected);

      // Notify parent component
      if (onFilterChange) {
        onFilterChange(label, newSelected);
      }
    }
  };

  // Handle chip deletion
  const handleChipDelete = (contactToRemove) => {
    const newSelected = selectedContacts.filter(
      (contact) => !(contact.email === contactToRemove.email && contact.id === contactToRemove.id)
    );
    setSelectedContacts(newSelected);

    handleClose();

    // Notify parent component
    if (onFilterChange) {
      onFilterChange(label, newSelected);
    }
  };

  // Update chip label to show count when contacts are selected
  const getChipLabel = () => {
    if (selectedContacts.length === 0) {
      return label;
    } else if (selectedContacts.length === 1) {
      // Use name if available, otherwise use email
      const displayName = selectedContacts[0].name || selectedContacts[0].email;
      return `${label}: ${displayName}`;
    } else {
      const displayName = selectedContacts[0].name || selectedContacts[0].email;
      return `${label}: ${displayName} +${selectedContacts.length - 1}`;
    }
  };

  const hasSelection = selectedContacts.length > 0;
  const chipIsActive = isActive || hasSelection;

  // Calculate dynamic listbox height based on chips container height
  const calculateListboxMaxHeight = () => {
    const popoverHeight = 540; // Total popover height
    const topPadding = 16; // p: "16px" top
    const bottomPadding = 16; // p: "16px" bottom
    const chipsMarginBottom = selectedContacts.length > 0 ? 16 : 0; // mb: 2 (16px) when chips exist
    const inputFieldHeight = 36; // TextField default height
    const spacingMargin = 8; // mt: 1 (8px)

    const usedSpace = topPadding + chipsHeight + chipsMarginBottom + inputFieldHeight + spacingMargin + bottomPadding;
    const availableHeight = popoverHeight - usedSpace;

    // Ensure a minimum height
    return Math.max(availableHeight, 100);
  };

  const listboxMaxHeight = calculateListboxMaxHeight();

  return (
    <Box>
      <Chip
        key={label}
        sx={{
          bgcolor: chipIsActive ? "#cfdef3" : "white",
          border: chipIsActive ? "none" : "1px solid #444746",
          color: chipIsActive ? "#041E49" : "#5f6368",
          fontSize: "14px",
          height: "30px",
          borderRadius: "8px",
          "&:hover": {
            bgcolor: chipIsActive ? "#bad2f5" : "#9f9e9e2b",
          },
        }}
        onClick={handleClick}
        label={
          <Stack direction="row" alignItems="center">
            {chipIsActive && (
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 20,
                  color: "black",
                  marginRight: "4px",
                }}
              >
                check
              </span>
            )}
            {getChipLabel()}
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 24,
                color: chipIsActive ? "#1a73e8" : "rgb(68, 68, 68)",
                marginLeft: "4px",
              }}
            >
              arrow_drop_down
            </span>
          </Stack>
        }
      />
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              height: "540px",
              width: "400px",
              overflow: "visible",
              boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2), 0px 0px 2px rgba(0, 0, 0, 0.1)",
              borderRadius: "8px",
            },
          },
        }}
      >
        <Box sx={{ p: "16px" }}>
          {/* Selected contacts as chips */}
          {selectedContacts.length > 0 && (
            <Box ref={chipsContainerRef} sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
              {selectedContacts.map((contact) => (
                <RecipientChip
                  key={`${contact.email}-${contact.id}`}
                  recipient={contact}
                  onDelete={() => handleChipDelete(contact)}
                />
              ))}
            </Box>
          )}

          {/* Autocomplete for searching and selecting contacts */}
          <Autocomplete
            options={recipients || []}
            blurOnSelect
            getOptionLabel={(option) => {
              if (typeof option === "string") return option;
              return option.email || "";
            }}
            value={null}
            inputValue={typeof inputValue === "string" ? inputValue : ""}
            onChange={handleAutocompleteChange}
            onInputChange={handleInputChange}
            filterOptions={filterOptions}
            open={open}
            disablePortal
            renderOption={(props, option) => {
              const { key, ...otherProps } = props;
              const isCustomRecipient = option.id && typeof option.id === "string" && option.id.startsWith("custom-");
              const avatarColor = generateAvatarColor(option.name || option.email);
              const initials = option.name ? option.name.charAt(0).toUpperCase() : "";
              const isAlreadySelected = selectedContacts.some(
                (selected) => selected.email === option.email && selected.id === option.id
              );

              return (
                <Box
                  key={key}
                  component="li"
                  {...otherProps}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    py: 1,
                    px: 2,
                  }}
                >
                  {isAlreadySelected ? (
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        backgroundColor: "rgb(26, 115, 232)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "white" }}>
                        check
                      </span>
                    </Box>
                  ) : (
                    <Avatar
                      sx={{
                        bgcolor: isCustomRecipient ? "rgba(11, 87, 208, 0.3)" : avatarColor,
                        color: isCustomRecipient ? "rgb(11, 87, 208)" : "white",
                        fontSize: "14px",
                        width: 32,
                        height: 32,
                      }}
                    >
                      {isCustomRecipient ? (
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                          person
                        </span>
                      ) : option.avatar ? (
                        <img
                          src={option.avatar}
                          alt={option.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        initials
                      )}
                    </Avatar>
                  )}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 400, fontSize: "14px" }}>
                      {option.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: "12px" }}>
                      {option.email}
                    </Typography>
                  </Box>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                fullWidth
                variant="standard"
                placeholder="Name or email"
                slotProps={{
                  input: {
                    ...params.InputProps,
                    onKeyDown: handleKeyDown,
                    style: {
                      fontSize: "14px",
                      color: "#000",
                      background: "transparent",
                      borderBottom: "1px solid #e0e0e0",
                    },
                  },
                }}
                sx={InputStyle}
                inputRef={inputRef}
              />
            )}
            slotProps={{
              paper: {
                sx: {
                  boxShadow: "none",
                  bgcolor: "transparent",
                  mt: 1,
                  mx: -2,
                  width: "calc(100% + 32px)",
                },
              },
              listbox: {
                sx: {
                  overflow: "auto",
                  padding: 0,
                  maxHeight: `${listboxMaxHeight}px`,
                },
              },
              option: {
                sx: {
                  margin: 0,
                },
              },
            }}
            sx={{
              "& .MuiAutocomplete-inputRoot": {
                padding: 0,
              },
            }}
            freeSolo
            disableClearable
          />
        </Box>
      </Popover>
    </Box>
  );
}
