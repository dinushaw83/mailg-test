import React, { useState, useRef, useEffect, useContext } from "react";
import { Tooltip, Autocomplete, TextField, Avatar, Box, Typography } from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { generateAvatarColor } from "../../utils/helperFunctions";
import "./EmailInput.css";

const EmailInput = React.forwardRef(
  ({ label, emails, onEmailAdded, onEmailRemoved, isParentFocused = false, onFocusChange }, ref) => {
    const { recipients: globalRecipients } = useGlobalContext();
    const [inputValue, setInputValue] = useState("");
    const [addedEmails, setAddedEmails] = useState(emails);
    const [isFocused, setIsFocused] = useState(isParentFocused);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
      if (inputRef.current && (isFocused || isParentFocused)) {
        inputRef.current.focus();
      }
    }, [isFocused, isParentFocused, inputRef.current]);

    useEffect(() => {
      setIsFocused(isParentFocused);
      if (!isParentFocused) {
        inputRef.current?.blur();
      }
    }, [isParentFocused]);

    const isValidEmail = (email) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const filterOptions = (options, { inputValue }) => {
      const filteredOptions = options.filter((option) => {
        const matchesSearch =
          option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.email.toLowerCase().includes(inputValue.toLowerCase());
        const isNotAdded = !addedEmails.includes(option.email);
        return matchesSearch && isNotAdded;
      });

      // If input is a valid email and not already in the list, add it as an option
      if (isValidEmail(inputValue)) {
        const emailExists = options.some((option) => option.email.toLowerCase() === inputValue.toLowerCase());
        const isNotAdded = !addedEmails.includes(inputValue.toLowerCase());
        if (!emailExists && isNotAdded) {
          filteredOptions.push({ email: inputValue, name: inputValue });
        }
      }

      return filteredOptions;
    };

    const handleAutocompleteChange = (event, newValue) => {
      if (newValue) {
        const email = typeof newValue === "string" ? newValue : newValue.email;
        setAddedEmails([...addedEmails, email]);
        setInputValue("");
        onEmailAdded && onEmailAdded(email);
      }
    };

    const removeEmail = (emailToRemove, e) => {
      e.preventDefault(); // Prevent the default action
      e.stopPropagation(); // Stop event bubbling
      setAddedEmails(addedEmails.filter((email) => email !== emailToRemove));
      onEmailRemoved && onEmailRemoved(emailToRemove);
      // Restore focus to the input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    const EmailPill = ({ email }) => {
      const recipientDetails = globalRecipients.find((r) => r.email === email);
      const displayName = recipientDetails?.name || email;

      return (
        <div className="email-pill">
          <div className="email-circle" style={{ backgroundColor: generateAvatarColor(displayName) }}>
            {displayName[0].toUpperCase()}
          </div>
          <span className="email-text">{displayName}</span>
          <button className="remove-email" onClick={(e) => removeEmail(email, e)}>
            ×
          </button>
        </div>
      );
    };

    const CollapsedView = ({ emails }) => {
      if (emails.length === 0) return null;

      const displayEmails = emails.slice(0, 2);
      const remainingCount = emails.length - 2;

      return (
        <div className="collapsed-view">
          <span className="collapsed-emails">
            {displayEmails.map((email, index) => {
              const recipientDetails = globalRecipients.find((r) => r.email === email);
              return (
                <span key={email}>
                  {recipientDetails?.name || email}
                  {index === 0 && displayEmails.length > 1 ? ", " : ""}
                </span>
              );
            })}
          </span>
          {remainingCount > 0 && <span className="more-count">{`${remainingCount} more`}</span>}
        </div>
      );
    };

    return (
      <div className="email-input-wrapper">
        {label && <label className={`email-label ${isFocused ? "visible" : ""}`}>{label}</label>}
        <div className="input-container">
          {isFocused ? (
            <div className="pills-container">
              {addedEmails.map((email, index) => (
                <EmailPill key={index} email={email} />
              ))}
              <Autocomplete
                options={globalRecipients || []}
                getOptionLabel={(option) => option.email}
                value={null}
                inputValue={inputValue}
                onChange={handleAutocompleteChange}
                onInputChange={(event, newInputValue) => {
                  setInputValue(newInputValue);
                }}
                onOpen={() => setHighlightedIndex(0)}
                onClose={() => setHighlightedIndex(0)}
                slotProps={{
                  listbox: {
                    sx: { maxHeight: "280px", overflowY: "auto" },
                  },
                }}
                filterOptions={filterOptions}
                renderOption={(props, option) => {
                  const { key, ...otherProps } = props;
                  const isCustomRecipient =
                    option.id && typeof option.id === "string" && option.id.startsWith("custom-");
                  const avatarColor = generateAvatarColor(option.name);
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
                    variant="standard"
                    InputProps={{
                      ...params.InputProps,
                      disableUnderline: true,
                      style: {
                        fontSize: "14px",
                        color: "#000",
                        background: "transparent",
                      },
                      onFocus: () => {
                        setIsFocused(true);
                        onFocusChange?.(true);
                      },
                      onBlur: (e) => {
                        if (
                          e.relatedTarget &&
                          (e.relatedTarget.classList.contains("email-pill") ||
                            e.relatedTarget.closest(".email-pill") ||
                            e.relatedTarget.classList.contains("email-option") ||
                            e.relatedTarget.closest(".email-option") ||
                            e.relatedTarget.classList.contains("email-input") ||
                            e.relatedTarget.closest(".email-input") ||
                            e.relatedTarget.closest(".MuiAutocomplete-popper") ||
                            e.relatedTarget.classList.contains("MuiAutocomplete-input"))
                        ) {
                          e.relatedTarget.click();
                          return;
                        }
                        setIsFocused(false);
                        onFocusChange?.(false);
                      },
                    }}
                    placeholder={addedEmails.length === 0 ? "Recipients" : ""}
                    inputRef={(el) => {
                      inputRef.current = el;
                      if (typeof ref === "function") ref(el);
                      else if (ref) ref.current = el;
                    }}
                  />
                )}
                sx={{
                  flex: 1,
                  width: "310px",
                  maxWidth: "310px",
                  "& .MuiAutocomplete-inputRoot": {
                    padding: 0,
                  },
                  "& .MuiAutocomplete-popper": {
                    width: "310px !important",
                    maxWidth: "310px !important",
                  },
                }}
                freeSolo
                disableClearable
              />
            </div>
          ) : (
            <div
              className="collapsed-container"
              onClick={() => {
                setIsFocused(true);
                inputRef.current?.focus();
              }}
            >
              {addedEmails.length === 0 ? (
                <input
                  type="text"
                  readOnly
                  placeholder="Recipients"
                  className="email-input"
                  onFocus={() => {
                    setIsFocused(true);
                  }}
                />
              ) : (
                <CollapsedView emails={addedEmails} />
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

export default EmailInput;
