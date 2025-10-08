import React, { useState, useRef, useEffect, useContext, useMemo, useCallback } from "react";
import { Tooltip, Autocomplete, TextField, Avatar, Box, Typography } from "@mui/material";
import RecipientChip from "./RecipientChip";
import SelectContacts from "./SelectContacts/SelectContacts";
import { GlobalContext } from "../../contexts/GlobalContext";
import { generateAvatarColor, restructureRecipients, isValidEmail } from "../../utils/helperFunctions";
import styles from "./RecipientsInput.module.css";

export default function RecipientsInput({
  to = [],
  cc = [],
  bcc = [],
  onToChange,
  onCcChange,
  onBccChange,
  placeholder = "Recipients",
}) {
  const { recipients: globalRecipients, loggedInUser } = useContext(GlobalContext);

  // Include only the recipients that has an email and restructure them
  const recipients = useMemo(() => {
    // First restructure, then filter out duplicate emails
    const restructured = restructureRecipients(globalRecipients.filter((recipient) => recipient.email));
    const seenEmails = new Set();
    return restructured.filter((recipient) => {
      const emailLower = recipient.email.toLowerCase();
      if (seenEmails.has(emailLower)) return false;
      seenEmails.add(emailLower);
      return true;
    });
  }, [globalRecipients]);

  const [isExpanded, setIsExpanded] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState({
    to: Array.isArray(to) ? to : [],
    cc: Array.isArray(cc) ? cc : [],
    bcc: Array.isArray(bcc) ? bcc : [],
  });
  const [inputValues, setInputValues] = useState({
    to: "",
    cc: "",
    bcc: "",
  });
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const [selectedContactsModal, setSelectedContactsModal] = useState({ field: null, open: false });
  const [invalids, setInvalids] = useState({ to: new Set(), cc: new Set(), bcc: new Set() });
  const [duplicates, setDuplicates] = useState({ to: new Set(), cc: new Set(), bcc: new Set() });

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/i, []);

  const validateRecipients = useCallback(
    (nextSelected, nextInputs) => {
      const nextInvalids = { to: new Set(), cc: new Set(), bcc: new Set() };
      const nextDuplicates = { to: new Set(), cc: new Set(), bcc: new Set() };

      // Build global counts across to/cc/bcc to detect duplicates overall
      const counts = new Map();
      ["to", "cc", "bcc"].forEach((field) => {
        (nextSelected[field] || []).forEach((r) => {
          const e = String(r.email || r.name || "").toLowerCase();
          if (!e) return;
          counts.set(e, (counts.get(e) || 0) + 1);
        });
      });

      const checkField = (field) => {
        const emails = (nextSelected[field] || []).map((r) => (r.email || r.name || "").toLowerCase());
        const input = (nextInputs?.[field] || "").trim().toLowerCase();

        // duplicates across all fields
        emails.forEach((e) => {
          if ((counts.get(e) || 0) > 1) nextDuplicates[field].add(e);
          if (!emailRegex.test(e)) nextInvalids[field].add(e);
        });

        if (input && !emailRegex.test(input)) {
          nextInvalids[field].add(input);
        }
      };

      ["to", "cc", "bcc"].forEach(checkField);
      setInvalids(nextInvalids);
      setDuplicates(nextDuplicates);
    },
    [emailRegex]
  );

  // Sync internal state with props when they change
  useEffect(() => {
    const nextSelected = {
      to: Array.isArray(to) ? to : [],
      cc: Array.isArray(cc) ? cc : [],
      bcc: Array.isArray(bcc) ? bcc : [],
    };
    setSelectedRecipients(nextSelected);

    // Only reset input values if all props are empty (form reset)
    const allPropsEmpty = (!to || to.length === 0) && (!cc || cc.length === 0) && (!bcc || bcc.length === 0);
    if (allPropsEmpty) {
      setInputValues({
        to: "",
        cc: "",
        bcc: "",
      });
    }
    validateRecipients(nextSelected, inputValues);
  }, [to, cc, bcc, validateRecipients]);

  // Highlight matching text in bold
  const highlightMatchingText = (text, searchTerm) => {
    if (!searchTerm.trim()) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, index) => (regex.test(part) ? <strong key={`${part}-${index}`}>{part}</strong> : part));
  };

  // Create custom recipient for valid email
  const createCustomRecipient = (email) => {
    // If the email is the logged in user's email, then return the logged in user object
    if (email === loggedInUser.email || loggedInUser.emails.some((emailObj) => emailObj.value === email)) {
      return {
        ...loggedInUser,
        id: loggedInUser.email,
      };
    }
    return {
      id: `custom-${email}`,
      name: email, // Use email as name since we don't know the actual name
      email: email,
      avatar: null,
      labels: [],
    };
  };

  // Handle outside click to collapse all inputs
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't collapse if clicking on autocomplete dropdown elements or while select contact modal is open
      if (
        event.target.closest(".MuiAutocomplete-popper") ||
        event.target.closest(".MuiPaper-root") ||
        event.target.closest(".MuiAutocomplete-option") ||
        event.target.closest(".MuiAutocomplete-listbox") ||
        event.target.closest(".MuiAutocomplete-root") ||
        event.target.closest("[role='listbox']") ||
        event.target.closest("[role='option']") ||
        selectedContactsModal.open
      ) {
        return;
      }

      if (containerRef.current && !containerRef.current.contains(event.target)) {
        // Include input text as potential recipients for validation
        const toWithInput = [...selectedRecipients.to];
        const ccWithInput = [...selectedRecipients.cc];
        const bccWithInput = [...selectedRecipients.bcc];

        // Add input text as custom recipients only if they are valid emails
        if (inputValues.to.trim() && isValidEmail(inputValues.to.trim())) {
          toWithInput.push(createCustomRecipient(inputValues.to.trim()));
        }
        if (inputValues.cc.trim() && isValidEmail(inputValues.cc.trim())) {
          ccWithInput.push(createCustomRecipient(inputValues.cc.trim()));
        }
        if (inputValues.bcc.trim() && isValidEmail(inputValues.bcc.trim())) {
          bccWithInput.push(createCustomRecipient(inputValues.bcc.trim()));
        }

        // Pass both chips and raw input text for validation
        onToChange(toWithInput, inputValues.to.trim());
        onCcChange(ccWithInput, inputValues.cc.trim());
        onBccChange(bccWithInput, inputValues.bcc.trim());

        validateRecipients({ to: toWithInput, cc: ccWithInput, bcc: bccWithInput }, inputValues);

        // Always collapse on outside click
        setIsExpanded(false);
        setShowCc(false);
        setShowBcc(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedRecipients, inputValues, onToChange, onCcChange, onBccChange]);

  // Handle clicking on recipients display to expand and auto-toggle inputs with values
  const handleRecipientsClick = () => {
    setIsExpanded(true);

    // Auto-toggle inputs that have values (either chips or raw input text)
    if ((cc && cc.length > 0) || inputValues.cc.trim()) {
      setShowCc(true);
    }
    if ((bcc && bcc.length > 0) || inputValues.bcc.trim()) {
      setShowBcc(true);
    }
  };

  // Handle autocomplete selection
  const handleAutocompleteChange = (event, newValue, field) => {
    if (newValue) {
      // Use setTimeout to ensure the selection is processed before any outside click events
      setTimeout(() => {
        const newSelectedRecipients = { ...selectedRecipients };
        newSelectedRecipients[field].push(newValue);
        setSelectedRecipients(newSelectedRecipients);

        // Clear the input value after selection
        setInputValues((prev) => ({ ...prev, [field]: "" }));

        // Update the parent component with email
        if (field === "to") onToChange(newSelectedRecipients[field]);
        if (field === "cc") onCcChange(newSelectedRecipients[field]);
        if (field === "bcc") onBccChange(newSelectedRecipients[field]);
      }, 0);
    }
  };

  // Handle backspace key to remove chips
  const handleKeyDown = (event, field) => {
    if (event.key === "Backspace") {
      const inputValue = inputValues[field];
      const fieldRecipients = selectedRecipients[field];

      // If input is empty and there are chips, remove the last chip
      if (inputValue === "" && fieldRecipients.length > 0) {
        event.preventDefault();
        const newSelectedRecipients = { ...selectedRecipients };
        newSelectedRecipients[field] = fieldRecipients.slice(0, -1);
        setSelectedRecipients(newSelectedRecipients);

        // Update the parent component
        if (field === "to") onToChange(newSelectedRecipients[field]);
        if (field === "cc") onCcChange(newSelectedRecipients[field]);
        if (field === "bcc") onBccChange(newSelectedRecipients[field]);
      }
    }
  };

  // Handle autocomplete key down events with custom highlight management
  const handleAutocompleteKeyDown = (event, field) => {
    const filteredOptions = filterOptions(recipients || [], { inputValue: inputValues[field] });

    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      setHighlightedIndex((prev) => {
        if (filteredOptions.length === 0 || prev + 1 >= filteredOptions.length) return 0;
        else return prev + 1;
      });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      setHighlightedIndex((prev) => {
        if (filteredOptions.length === 0) return 0;
        else if (prev - 1 < 0) return filteredOptions.length - 1;
        else return prev - 1;
      });
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();

      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        const option = filteredOptions[highlightedIndex];
        const isAlreadySelected = selectedRecipients[field].some(
          (selected) => selected.email === option.email && selected.id === option.id
        );

        if (!isAlreadySelected) {
          // Add the selected option
          const newSelectedRecipients = { ...selectedRecipients };
          newSelectedRecipients[field] = [...newSelectedRecipients[field], option];
          setSelectedRecipients(newSelectedRecipients);

          // Update the parent component
          if (field === "to") onToChange(newSelectedRecipients[field]);
          if (field === "cc") onCcChange(newSelectedRecipients[field]);
          if (field === "bcc") onBccChange(newSelectedRecipients[field]);

          // Clear input and reset highlight
          setInputValues((prev) => ({ ...prev, [field]: "" }));
          setHighlightedIndex(0);
        }
      }

      return false;
    }
  };

  // Handle chip deletion
  const handleChipDelete = (recipientToRemove, field) => {
    const newSelectedRecipients = { ...selectedRecipients };
    newSelectedRecipients[field] = newSelectedRecipients[field].filter(
      (recipient) => `${recipient.email}-${recipient.id}` !== `${recipientToRemove.email}-${recipientToRemove.id}`
    );
    setSelectedRecipients(newSelectedRecipients);

    // Update the parent component
    if (field === "to") onToChange(newSelectedRecipients[field]);
    if (field === "cc") onCcChange(newSelectedRecipients[field]);
    if (field === "bcc") onBccChange(newSelectedRecipients[field]);
  };

  // Toggle Cc field visibility
  const toggleCc = () => {
    setShowCc(!showCc);
  };

  // Toggle Bcc field visibility
  const toggleBcc = () => {
    setShowBcc(!showBcc);
  };

  // Get display text for collapsed state with comma separation
  const getDisplayText = () => {
    const recipients = [];

    // Order: to chips → to text → cc chips → cc text → bcc chips → bcc text
    if (selectedRecipients.to.length > 0) {
      recipients.push(...selectedRecipients.to.map((r) => r.name));
    }
    if (inputValues.to.trim()) {
      recipients.push(inputValues.to.trim());
    }

    if (selectedRecipients.cc.length > 0) {
      recipients.push(...selectedRecipients.cc.map((r) => r.name));
    }
    if (inputValues.cc.trim()) {
      recipients.push(inputValues.cc.trim());
    }

    if (selectedRecipients.bcc.length > 0) {
      recipients.push(...selectedRecipients.bcc.map((r) => r.name));
    }
    if (inputValues.bcc.trim()) {
      recipients.push(inputValues.bcc.trim());
    }

    return recipients.join(", ");
  };

  // Determine which toggle buttons to show in To field
  const getToToggleButtons = () => {
    // Only show buttons on To field if it's the last visible input
    if (showCc || showBcc) return null; // Hide if any other field is visible
    return (
      <>
        <CcToggleButton />
        <BccToggleButton />
      </>
    );
  };

  // Determine which toggle buttons to show in Cc field
  const getCcToggleButtons = () => {
    // Only show buttons on Cc field if it's the last visible input
    if (showCc && !showBcc) return <BccToggleButton />; // Show Bcc only if Cc is last
    return null;
  };

  // Determine which toggle buttons to show in Bcc field
  const getBccToggleButtons = () => {
    // Only show buttons on Bcc field if it's the last visible input
    if (showBcc && !showCc) return <CcToggleButton />; // Show Cc only if Bcc is last
    return null;
  };

  // Cc toggle button component
  const CcToggleButton = () => (
    <Tooltip
      title={<span style={{ fontSize: "12px", fontWeight: "400" }}>Add Cc recipients ‪(⌘⇧C)‬</span>}
      placement="bottom"
      slotProps={{
        popper: {
          sx: {
            "& .MuiTooltip-tooltip": {
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              color: "white",
            },
          },
        },
      }}
    >
      <button className={`${styles.toggleButton} ${showCc ? styles.active : ""}`} onClick={toggleCc}>
        Cc
      </button>
    </Tooltip>
  );

  // Bcc toggle button component
  const BccToggleButton = () => (
    <Tooltip
      title={<span style={{ fontSize: "12px", fontWeight: "400" }}>Add Bcc recipients ‪(⌘⇧B)‬</span>}
      placement="bottom"
      slotProps={{
        popper: {
          sx: {
            "& .MuiTooltip-tooltip": {
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              color: "white",
            },
          },
        },
      }}
    >
      <button className={`${styles.toggleButton} ${showBcc ? styles.active : ""}`} onClick={toggleBcc}>
        Bcc
      </button>
    </Tooltip>
  );

  // Filter options for autocomplete
  const filterOptions = (options, { inputValue }) => {
    const filteredOptions = options.filter((option) => {
      const matchesSearch =
        option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
        option.email.toLowerCase().includes(inputValue.toLowerCase());
      return matchesSearch;
    });

    // If input is a valid email and not already in the list, add custom option
    if (isValidEmail(inputValue)) {
      const emailExists = options.some((option) => option.email.toLowerCase() === inputValue.toLowerCase());
      if (!emailExists) {
        filteredOptions.push(createCustomRecipient(inputValue));
      }
    }

    // Limit to maximum 8 items
    return filteredOptions.slice(0, 8);
  };

  // Handle inserting a recipient from select contacts
  const handleInsertSelectedContacts = (contacts) => {
    const fieldName = selectedContactsModal.field;
    if (contacts.length > 0) {
      const newSelectedRecipients = { ...selectedRecipients };

      // Replace the selectedRecipients of respective field with the new contacts
      newSelectedRecipients[fieldName] = [...contacts];

      setSelectedRecipients(newSelectedRecipients);

      // Update the parent component
      if (selectedContactsModal.field === "to") onToChange(newSelectedRecipients[selectedContactsModal.field]);
      if (selectedContactsModal.field === "cc") onCcChange(newSelectedRecipients[selectedContactsModal.field]);
      if (selectedContactsModal.field === "bcc") onBccChange(newSelectedRecipients[selectedContactsModal.field]);
    }

    // Reset modal state
    setSelectedContactsModal({ open: false, field: null });
  };

  // Render option for autocomplete
  const renderOption = (props, option, field) => {
    const { key, ...otherProps } = props;
    const isAlreadySelected = selectedRecipients[field].some(
      (selected) => selected.email === option.email && selected.id === option.id
    );
    const isCustomRecipient = option.id && typeof option.id === "string" && option.id.startsWith("custom-");
    const avatarColor = generateAvatarColor(option.name);
    const initials = option.name.charAt(0).toUpperCase();

    // Get the current filtered options to determine if this option is highlighted
    const filteredOptions = filterOptions(recipients || [], { inputValue: inputValues[field] });
    const currentIndex = filteredOptions.findIndex((opt) => opt.email === option.email && opt.id === option.id);
    const isHighlighted = currentIndex === highlightedIndex;

    return (
      <Box
        key={`${key}-${option.id}`}
        component="li"
        {...otherProps}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          py: 1,
          opacity: isAlreadySelected ? 0.6 : 1,
          pointerEvents: isAlreadySelected ? "none" : "auto",
          position: "relative",
          zIndex: 1,
          "&:hover": {
            backgroundColor: isAlreadySelected || isHighlighted ? "transparent" : "rgba(0, 0, 0, 0.04)",
          },
        }}
      >
        {isHighlighted && <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.1)" }} />}
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
            <span className="material-symbols-filled" style={{ fontSize: "32px", marginTop: "10px" }}>
              person
            </span>
          ) : option.avatar ? (
            <img src={option.avatar} alt={option.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            initials
          )}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 400, fontSize: "14px" }}>
            {highlightMatchingText(option.name, inputValues[field])}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "12px" }}>
            {highlightMatchingText(option.email, inputValues[field])}
          </Typography>
        </Box>
        {isAlreadySelected && (
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              backgroundColor: isHighlighted ? "rgb(250, 250, 250)" : "rgb(235, 235, 235)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              zIndex: 2,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              check
            </span>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <div className={styles.recipientsContainer} ref={containerRef}>
      {!isExpanded ? (
        <div className={styles.recipientsDisplay} onClick={handleRecipientsClick}>
          <span className={getDisplayText() ? styles.recipientsValue : styles.recipientsPlaceholder}>
            {getDisplayText() || placeholder}
          </span>
        </div>
      ) : (
        <div className={styles.recipientsExpanded}>
          {/* To Field */}
          <div className={styles.recipientRow}>
            <Tooltip
              title={<span style={{ fontSize: "12px", fontWeight: "400" }}>Select contacts</span>}
              placement="bottom"
              slotProps={{
                popper: {
                  sx: {
                    "& .MuiTooltip-tooltip": {
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      color: "white",
                    },
                  },
                },
              }}
            >
              <span
                className={styles.recipientLabel}
                onClick={() => setSelectedContactsModal({ field: "to", open: true })}
              >
                To
              </span>
            </Tooltip>
            <div
              className={styles.inputContainer}
              style={{
                minHeight: selectedRecipients.to.length > 0 ? "40px" : "20px",
              }}
            >
              {selectedRecipients.to.map((recipient) => (
                <RecipientChip
                  key={`${recipient.email}-${recipient.id}`}
                  recipient={recipient}
                  onDelete={() => handleChipDelete(recipient, "to")}
                  isDuplicate={duplicates.to.has((recipient.email || recipient.name || "").toLowerCase())}
                />
              ))}
              <Autocomplete
                options={recipients || []}
                getOptionLabel={(option) => option.email}
                value={null}
                inputValue={inputValues.to}
                onChange={(event, newValue) => handleAutocompleteChange(event, newValue, "to")}
                onInputChange={(event, newInputValue) => {
                  setInputValues((prev) => ({ ...prev, to: newInputValue }));
                  validateRecipients(selectedRecipients, { ...inputValues, to: newInputValue });
                }}
                onOpen={() => setHighlightedIndex(0)}
                onClose={() => setHighlightedIndex(0)}
                slotProps={{
                  popper: {
                    style: {
                      width: "400px",
                      minWidth: "400px",
                      maxWidth: "400px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    },
                  },
                  listbox: {
                    sx: {
                      maxHeight: "500px",
                      overflow: "auto",
                    },
                  },
                }}
                filterOptions={filterOptions}
                renderOption={(props, option) => renderOption(props, option, "to")}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    variant="standard"
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        disableUnderline: true,
                        style: {
                          fontSize: "14px",
                          color: "#000",
                          background: "transparent",
                          minWidth: "120px",
                        },
                        onKeyDown: (event) => {
                          handleKeyDown(event, "to");
                          handleAutocompleteKeyDown(event, "to");
                        },
                      },
                    }}
                    placeholder=""
                    autoFocus
                  />
                )}
                sx={{
                  flex: 1,
                  "& .MuiAutocomplete-inputRoot": {
                    padding: 0,
                  },
                }}
                freeSolo
                disableClearable
              />
            </div>
            <div className={styles.toggleButtons}>{getToToggleButtons()}</div>
          </div>

          {/* Cc Field */}
          {showCc && (
            <div className={styles.recipientRow}>
              <Tooltip
                title={<span style={{ fontSize: "12px", fontWeight: "400" }}>Select contacts</span>}
                placement="bottom"
                slotProps={{
                  popper: {
                    sx: {
                      "& .MuiTooltip-tooltip": {
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "white",
                      },
                    },
                  },
                }}
              >
                <span
                  className={styles.recipientLabel}
                  onClick={() => setSelectedContactsModal({ field: "cc", open: true })}
                >
                  Cc
                </span>
              </Tooltip>
              <div
                className={styles.inputContainer}
                style={{
                  minHeight: selectedRecipients.cc.length > 0 ? "40px" : "20px",
                }}
              >
              {selectedRecipients.cc.map((recipient) => (
                <RecipientChip
                  key={`${recipient.email}-${recipient.id}`}
                  recipient={recipient}
                  onDelete={() => handleChipDelete(recipient, "cc")}
                  isDuplicate={duplicates.cc.has((recipient.email || recipient.name || "").toLowerCase())}
                />
              ))}
                <Autocomplete
                  options={recipients || []}
                  getOptionLabel={(option) => option.email}
                  value={null}
                  inputValue={inputValues.cc}
                  onChange={(event, newValue) => handleAutocompleteChange(event, newValue, "cc")}
                  onInputChange={(event, newInputValue) => {
                    setInputValues((prev) => ({ ...prev, cc: newInputValue }));
                    validateRecipients(selectedRecipients, { ...inputValues, cc: newInputValue });
                  }}
                  onOpen={() => setHighlightedIndex(0)}
                  onClose={() => setHighlightedIndex(0)}
                  slotProps={{
                    popper: {
                      style: {
                        width: "400px",
                        minWidth: "400px",
                        maxWidth: "400px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      },
                    },
                    listbox: {
                      sx: {
                        maxHeight: "500px",
                        overflow: "auto",
                      },
                    },
                  }}
                  filterOptions={filterOptions}
                  renderOption={(props, option) => renderOption(props, option, "cc")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="standard"
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          disableUnderline: true,
                          style: {
                            fontSize: "14px",
                            color: "#000",
                            background: "transparent",
                            minWidth: "120px",
                          },
                          onKeyDown: (event) => {
                            handleKeyDown(event, "cc");
                            handleAutocompleteKeyDown(event, "cc");
                          },
                        },
                      }}
                      placeholder=""
                    />
                  )}
                  sx={{
                    flex: 1,
                    "& .MuiAutocomplete-inputRoot": {
                      padding: 0,
                    },
                  }}
                  freeSolo
                  disableClearable
                />
              </div>
              <div className={styles.toggleButtons}>{getCcToggleButtons()}</div>
            </div>
          )}

          {/* Bcc Field */}
          {showBcc && (
            <div className={styles.recipientRow}>
              <Tooltip
                title={<span style={{ fontSize: "12px", fontWeight: "400" }}>Select contacts</span>}
                placement="bottom"
                slotProps={{
                  popper: {
                    sx: {
                      "& .MuiTooltip-tooltip": {
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "white",
                      },
                    },
                  },
                }}
              >
                <span
                  className={styles.recipientLabel}
                  onClick={() => setSelectedContactsModal({ field: "bcc", open: true })}
                >
                  Bcc
                </span>
              </Tooltip>
              <div
                className={styles.inputContainer}
                style={{
                  minHeight: selectedRecipients.bcc.length > 0 ? "40px" : "20px",
                }}
              >
              {selectedRecipients.bcc.map((recipient) => (
                <RecipientChip
                  key={`${recipient.email}-${recipient.id}`}
                  recipient={recipient}
                  onDelete={() => handleChipDelete(recipient, "bcc")}
                  isDuplicate={duplicates.bcc.has((recipient.email || recipient.name || "").toLowerCase())}
                />
              ))}
                <Autocomplete
                  options={recipients || []}
                  getOptionLabel={(option) => option.email}
                  value={null}
                  inputValue={inputValues.bcc}
                  onChange={(event, newValue) => handleAutocompleteChange(event, newValue, "bcc")}
                  onInputChange={(event, newInputValue) => {
                    setInputValues((prev) => ({ ...prev, bcc: newInputValue }));
                    validateRecipients(selectedRecipients, { ...inputValues, bcc: newInputValue });
                  }}
                  onOpen={() => setHighlightedIndex(0)}
                  onClose={() => setHighlightedIndex(0)}
                  slotProps={{
                    popper: {
                      style: {
                        width: "400px",
                        minWidth: "400px",
                        maxWidth: "400px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                      },
                    },
                    listbox: {
                      sx: {
                        maxHeight: "500px",
                        overflow: "auto",
                      },
                    },
                  }}
                  filterOptions={filterOptions}
                  renderOption={(props, option) => renderOption(props, option, "bcc")}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="standard"
                      slotProps={{
                        input: {
                          ...params.InputProps,
                          disableUnderline: true,
                          style: {
                            fontSize: "14px",
                            color: "#000",
                            background: "transparent",
                            minWidth: "120px",
                          },
                          onKeyDown: (event) => {
                            handleKeyDown(event, "bcc");
                            handleAutocompleteKeyDown(event, "bcc");
                          },
                        },
                      }}
                      placeholder=""
                    />
                  )}
                  sx={{
                    flex: 1,
                    "& .MuiAutocomplete-inputRoot": {
                      padding: 0,
                    },
                  }}
                  freeSolo
                  disableClearable
                />
              </div>
              <div className={styles.toggleButtons}>{getBccToggleButtons()}</div>
            </div>
          )}
        </div>
      )}

      {selectedContactsModal.open && (
        <SelectContacts
          handleInsertContacts={handleInsertSelectedContacts}
          open={selectedContactsModal.open}
          onClose={() => setSelectedContactsModal((prev) => ({ ...prev, open: false }))}
          addedRecipients={selectedContactsModal.field ? selectedRecipients[selectedContactsModal.field] : []}
        />
      )}
    </div>
  );
}
