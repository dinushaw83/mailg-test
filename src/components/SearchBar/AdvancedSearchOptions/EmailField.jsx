import React, { useState, useRef, useEffect, useContext } from "react";
import { Autocomplete, Stack, TextField, Box, Avatar, Typography } from "@mui/material";
import { GlobalContext } from "../../../contexts/GlobalContext";
import { generateAvatarColor } from "../../../utils/helperFunctions";

const InputStyle = {
  "& .MuiInput-root": {
    fontSize: "14px",
  },
  "& .MuiInputBase-input": {
    height: "20px !important",
    padding: "0 !important",
  },
  // override hover underline
  "& .MuiInput-underline:hover:not(.Mui-disabled):before": {
    borderBottom: "1px solid rgba(0,0,0,0.42)",
  },
  // override the focused/active line color
  "& .MuiInput-underline:after": {
    borderBottom: "1px solid #4285f4",
  },
};

const EmailField = ({ label, value, onChange, placeholder = "Enter email addresses" }) => {
  const { recipients: globalRecipients } = useContext(GlobalContext);
  const [inputValue, setInputValue] = useState("");
  const [confirmedEmails, setConfirmedEmails] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);

  // For backwards compatibility - only used for initial value
  const emailArray = confirmedEmails;

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const filterOptions = (options, { inputValue: fullInputValue }) => {
    // Extract only the current input part (after the last comma)
    let searchValue = fullInputValue;
    if (confirmedEmails.length > 0) {
      const currentDisplayValue = confirmedEmails.join(", ") + ", ";
      if (fullInputValue.startsWith(currentDisplayValue)) {
        searchValue = fullInputValue.substring(currentDisplayValue.length);
      }
    }

    // Don't show options if no input
    if (!searchValue || searchValue.trim() === "") {
      return [];
    }

    const filteredOptions = options.filter((option) => {
      const matchesSearch =
        option.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        option.email.toLowerCase().includes(searchValue.toLowerCase());
      const isNotAdded = !confirmedEmails.includes(option.email);
      return matchesSearch && isNotAdded;
    });

    // If input is a valid email and not already in the list, add it as an option
    if (isValidEmail(searchValue)) {
      const emailExists = options.some((option) => option.email.toLowerCase() === searchValue.toLowerCase());
      const isNotAdded = !confirmedEmails.includes(searchValue.toLowerCase());
      if (!emailExists && isNotAdded) {
        filteredOptions.push({ email: searchValue, name: searchValue });
      }
    }

    return filteredOptions.slice(0, 8);
  };

  const handleAutocompleteChange = (event, newValue) => {
    if (newValue) {
      const email = typeof newValue === "string" ? newValue : newValue.email;
      const newEmailArray = [...confirmedEmails, email];
      setConfirmedEmails(newEmailArray);
      onChange(newEmailArray.join(", "));
      setInputValue("");
    }
  };

  const handleInputChange = (event, newInputValue) => {
    // If there are already confirmed emails, extract only the new input part
    if (confirmedEmails.length > 0) {
      const currentDisplayValue = confirmedEmails.join(", ") + ", ";
      if (newInputValue.startsWith(currentDisplayValue)) {
        const newInput = newInputValue.substring(currentDisplayValue.length);
        setInputValue(newInput);

        // Update parent with combined value (confirmed emails + current input)
        if (newInput.trim()) {
          onChange(confirmedEmails.join(", ") + ", " + newInput);
        } else {
          onChange(confirmedEmails.join(", "));
        }

        // Handle comma-separated input (like Gmail)
        if (newInput.includes(",")) {
          const emails = newInput
            .split(",")
            .map((email) => email.trim())
            .filter((email) => email);
          const validEmails = emails.filter((email) => isValidEmail(email));

          if (validEmails.length > 0) {
            const newEmailArray = [...confirmedEmails, ...validEmails];
            setConfirmedEmails(newEmailArray);
            onChange(newEmailArray.join(", "));
            setInputValue("");
          }
        }
      } else {
        // User is editing the existing emails, update the full value
        const emails = newInputValue
          .split(",")
          .map((email) => email.trim())
          .filter((email) => email);
        const validEmails = emails.filter((email) => isValidEmail(email));
        setConfirmedEmails(validEmails);
        onChange(validEmails.join(", "));
        setInputValue("");
      }
    } else {
      setInputValue(newInputValue);

      // Update parent with current input
      onChange(newInputValue);

      // Handle comma-separated input (like Gmail)
      if (newInputValue.includes(",")) {
        const emails = newInputValue
          .split(",")
          .map((email) => email.trim())
          .filter((email) => email);
        const validEmails = emails.filter((email) => isValidEmail(email));

        if (validEmails.length > 0) {
          setConfirmedEmails(validEmails);
          onChange(validEmails.join(", "));
          setInputValue("");
        }
      }
    }
  };

  const handleKeyDown = (event) => {
    // Handle Enter key to add current input as email
    if (event.key === "Enter" && inputValue.trim()) {
      event.preventDefault();
      if (isValidEmail(inputValue.trim())) {
        const newEmailArray = [...confirmedEmails, inputValue.trim()];
        setConfirmedEmails(newEmailArray);
        onChange(newEmailArray.join(", "));
        setInputValue("");
      }
    }

    // Handle Backspace to remove last email when input is empty
    if (event.key === "Backspace" && !inputValue && confirmedEmails.length > 0) {
      const newEmailArray = confirmedEmails.slice(0, -1);
      setConfirmedEmails(newEmailArray);
      onChange(newEmailArray.join(", "));
    }
  };

  return (
    <Stack direction="row" alignItems="baseline" gap="16px" height="20px" width="100%">
      <label
        style={{
          minWidth: "100px",
          height: "20px !important",
          fontSize: "14px",
          color: "#5f6368",
          fontWeight: "400",
          textAlign: "left",
          flexShrink: 0,
        }}
      >
        {label}
      </label>
      <Autocomplete
        options={globalRecipients || []}
        getOptionLabel={(option) => option.email}
        value={null}
        inputValue={
          confirmedEmails.length > 0 ? confirmedEmails.join(", ") + (inputValue ? ", " + inputValue : ", ") : inputValue
        }
        onChange={handleAutocompleteChange}
        onInputChange={handleInputChange}
        filterOptions={filterOptions}
        open={isFocused && inputValue && inputValue.trim() !== ""}
        renderOption={(props, option) => {
          const { key, ...otherProps } = props;
          const isCustomRecipient = option.id && typeof option.id === "string" && option.id.startsWith("custom-");
          const avatarColor = generateAvatarColor(option.name || option.email);
          const initials = option.name.charAt(0).toUpperCase();

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
              }}
            >
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
                ) : (
                  initials
                )}
              </Avatar>
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
            slotProps={{
              input: {
                ...params.InputProps,
                onKeyDown: handleKeyDown,
                onFocus: () => setIsFocused(true),
                onBlur: () => setIsFocused(false),
                style: {
                  fontSize: "14px",
                  color: "#000",
                  background: "transparent",
                  padding: 0,
                },
              },
            }}
            sx={InputStyle}
            inputRef={inputRef}
          />
        )}
        sx={{
          flex: 1,
          "& .MuiAutocomplete-inputRoot": {
            padding: 0,
          },
          "& .MuiAutocomplete-popper": {
            zIndex: 10001, // Higher than modal
          },
        }}
        freeSolo
        disableClearable
      />
    </Stack>
  );
};

export default EmailField;
