import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { generateAvatarColor } from "../../utils/helperFunctions";
import styles from "./ContactSearchDropdown.module.css";

const ContactSearchDropdown = ({
  onContactSelect,
  onFocus,
  onBlur,
  handleSubmit,
  placeholder = "Search",
  initialQuery = "",
}) => {
  const { recipients } = useGlobalContext();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [autocompleteText, setAutocompleteText] = useState("");
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  // Update search query when initial query changes
  useEffect(() => {
    setSearchQuery(initialQuery);
  }, [initialQuery]);

  // Cleanup timeout on unmount
  useEffect(() => () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
  }, []);

  // Filter contacts that have both name and email
  const validContacts = recipients.filter(
    (contact) => contact && contact.name && contact.email && contact.name.trim() !== ""
  );

  // Find best autocomplete suggestion
  const findAutocompleteSuggestion = (query) => {
    if (!query.trim()) {
      setAutocompleteText("");
      return;
    }

    const queryLower = query.toLowerCase();

    // Find the best direct match (starts with query)
    const directMatches = validContacts.filter((contact) => {
      const nameLower = contact.name.toLowerCase();
      const emailLower = contact.email.toLowerCase();
      return nameLower.startsWith(queryLower) || emailLower.startsWith(queryLower);
    });

    if (directMatches.length > 0) {
      // Sort by priority: name starts with > email starts with
      const sortedMatches = directMatches.sort((a, b) => {
        const aNameStarts = a.name.toLowerCase().startsWith(queryLower);
        const bNameStarts = b.name.toLowerCase().startsWith(queryLower);

        if (aNameStarts && !bNameStarts) return -1;
        if (!aNameStarts && bNameStarts) return 1;
        return 0;
      });

      const bestMatch = sortedMatches[0];
      const suggestion = bestMatch.name.toLowerCase().startsWith(queryLower) ? bestMatch.name : bestMatch.email;

      setAutocompleteText(suggestion);
    } else {
      setAutocompleteText("");
    }
  };

  // Search function
  const searchContacts = (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setAutocompleteText("");
      return;
    }

    // Find autocomplete suggestion
    findAutocompleteSuggestion(query);

    const queryLower = query.toLowerCase();

    // Filter and score contacts
    const scoredContacts = validContacts
      .map((contact) => {
        const nameLower = contact.name.toLowerCase();
        const emailLower = contact.email.toLowerCase();

        let score = 0;
        let nameMatch = false;
        let emailMatch = false;

        // Check for exact matches (highest priority)
        if (nameLower === queryLower) {
          score = 1000; // Highest score for exact name match
          nameMatch = true;
        } else if (emailLower === queryLower) {
          score = 900; // High score for exact email match
          emailMatch = true;
        }
        // Check for starts with matches (high priority)
        else if (nameLower.startsWith(queryLower)) {
          score = 800; // High score for name starts with
          nameMatch = true;
        } else if (emailLower.startsWith(queryLower)) {
          score = 700; // High score for email starts with
          emailMatch = true;
        }
        // Check for contains matches (lower priority)
        else if (nameLower.includes(queryLower)) {
          score = 600; // Medium score for name contains
          nameMatch = true;
        } else if (emailLower.includes(queryLower)) {
          score = 500; // Medium score for email contains
          emailMatch = true;
        }

        // Only return contacts that have at least one match
        if (nameMatch || emailMatch) {
          return { contact, score };
        }
        return null;
      })
      .filter(Boolean) // Remove null entries
      .sort((a, b) => b.score - a.score) // Sort by score (highest first)
      .slice(0, 8) // Limit to 8 results
      .map((item) => item.contact); // Extract just the contact objects

    setSearchResults(scoredContacts);
  };

  // Handle search input change
  const handleSearchChange = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    searchContacts(query);
    setSelectedIndex(-1);
  };

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
    if (searchQuery.trim()) {
      searchContacts(searchQuery);
    }
    if (onFocus) {
      onFocus();
    }
  };

  // Handle input blur
  const handleBlur = (event) => {
    // Delay closing to allow clicking on dropdown items
    blurTimeoutRef.current = setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setSearchResults([]);
        setSelectedIndex(-1);
        setAutocompleteText("");
        // Don't clear search query on blur
        if (onBlur) {
          onBlur();
        }
      }
    }, 400);
  };

  // Handle contact selection
  const handleContactSelect = (contact) => {
    if (onContactSelect) {
      onContactSelect(contact);
    }
    setSearchQuery("");
    setSearchResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
    setAutocompleteText("");
  };

  // Handle keyboard navigation
  const handleKeyDown = (event) => {
    // Handle Tab key for autocomplete
    if (event.key === "Tab" && autocompleteText && autocompleteText !== searchQuery) {
      event.preventDefault();
      setSearchQuery(autocompleteText);
      searchContacts(autocompleteText);
      return;
    }

    if (!isOpen) return;

    switch (event.key) {
      case "ArrowDown":
        if (searchResults.length === 0) break;
        event.preventDefault();
        const nextIndex = (selectedIndex + 1) % searchResults.length;
        setSelectedIndex(nextIndex);
        // Update search input with selected contact's name or email
        if (searchResults[nextIndex]) {
          const selectedContact = searchResults[nextIndex];
          const displayText = selectedContact.name || selectedContact.email;
          setSearchQuery(displayText);
        }
        break;
      case "ArrowUp":
        if (searchResults.length === 0) break;
        event.preventDefault();
        const prevIndex = (selectedIndex - 1 + searchResults.length) % searchResults.length;
        setSelectedIndex(prevIndex);
        // Update search input with selected contact's name or email
        if (searchResults[prevIndex]) {
          const selectedContact = searchResults[prevIndex];
          const displayText = selectedContact.name || selectedContact.email;
          setSearchQuery(displayText);
        }
        break;
      case "Enter":
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleContactSelect(searchResults[selectedIndex]);
        } else if (searchQuery.trim().length > 0 && handleSubmit) {
          handleSubmit(searchQuery);
        }
        // Clear search results and blur input
        setSearchResults([]);
        setSelectedIndex(-1);
        setIsOpen(false);
        setAutocompleteText("");
        if (inputRef.current) {
          inputRef.current?.querySelector("input")?.blur();
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedIndex(-1);
        setAutocompleteText("");
        inputRef.current?.querySelector("input")?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchResults([]);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Render contact item
  const renderContactItem = (contact, index) => {
    const avatarColor = generateAvatarColor(contact.name);
    const initials = contact.name ? contact.name.charAt(0).toUpperCase() : "";
    const displayName = contact.name || contact.email;

    return (
      <ListItem
        key={`${contact.id}-${contact.email}`}
        onClick={() => handleContactSelect(contact)}
        onMouseEnter={() => setSelectedIndex(index)}
        className={`${styles.contactItem} ${selectedIndex === index ? styles.selectedItem : ""}`}
        sx={{
          py: 0.75,
          px: 2,
          "&:hover": {
            backgroundColor: "#f5f5f5",
          },
        }}
      >
        <ListItemAvatar sx={{ minWidth: 28, mr: 2 }}>
          <Avatar
            sx={{
              bgcolor: contact.avatar ? "transparent" : avatarColor,
              color: contact.avatar ? "inherit" : "white",
              width: 28,
              height: 28,
              fontSize: "14px",
            }}
          >
            {contact.avatar ? (
              <img
                src={contact.avatar}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
            ) : (
              initials
            )}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography
                sx={{
                  fontSize: "15px",
                  fontWeight: 400,
                  color: "#222",
                  noWrap: true,
                }}
              >
                {contact.name}
              </Typography>
              <Typography
                sx={{
                  fontSize: "13px",
                  fontWeight: 400,
                  color: "#757575",
                  noWrap: true,
                }}
              >
                - {contact.email}
              </Typography>
            </Box>
          }
        />
      </ListItem>
    );
  };

  return (
    <Box ref={dropdownRef} className={styles.searchContainer}>
      <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
        {/* Search Icon */}
        <Tooltip
          title="Search contacts"
          placement="bottom"
          slotProps={{
            popper: {
              sx: {
                "& .MuiTooltip-tooltip": {
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: "400",
                },
              },
            },
          }}
        >
          <IconButton size="medium" sx={{ color: "#5f6368", mr: "10px" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
              search
            </span>
          </IconButton>
        </Tooltip>

        {/* Search Input */}
        <Box sx={{ position: "relative", width: "100%" }}>
          <TextField
            ref={inputRef}
            placeholder={placeholder}
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            variant="standard"
            fullWidth
            sx={{
              fontSize: "0.875rem",
              fontWeight: 400,
              "& fieldset": {
                border: "none",
              },
              "& .MuiInputBase-input::placeholder": {
                color: "#929394",
                opacity: 1,
                fontWeight: 400,
              },
              "& .MuiInputBase-input:hover": {
                cursor: "text",
              },
              "& .MuiInputBase-input": {
                letterSpacing: "0.00938em",
              },
            }}
            slotProps={{
              input: {
                disableUnderline: true,
              },
            }}
          />
          {/* Autocomplete overlay */}
          {autocompleteText && autocompleteText !== searchQuery && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                pointerEvents: "none",
                pl: 0,
                pr: 0,
                py: 0,
                zIndex: 1,
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  letterSpacing: "0.07938em",
                  fontSize: "0.875rem",
                  fontWeight: 400,
                }}
              >
                <span style={{ color: "transparent" }}>{searchQuery}</span>
                <span style={{ color: "#929394" }}>{autocompleteText.substring(searchQuery.length)}</span>
              </span>
            </Box>
          )}
        </Box>

        {/* Clear search */}
        {searchQuery && (
          <Tooltip
            title="Clear search"
            placement="bottom"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: "400",
                  },
                },
              },
            }}
          >
            <IconButton
              size="medium"
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setSelectedIndex(-1);
              }}
              sx={{ color: "#5f6368" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                close
              </span>
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Dropdown */}
      {isOpen && searchResults.length > 0 && (
        <Paper
          className={styles.dropdown}
          elevation={1}
          sx={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 20,
            minWidth: "350px",
            maxHeight: "350px",
            overflowY: "auto",
            mt: "2px",
            borderRadius: "0 0 2px 2px",
            border: "1px solid rgba(0, 0, 0, 0.2)",
            borderTop: "none",
            py: 1,
          }}
        >
          <List dense disablePadding>
            {searchResults.map((contact, index) => renderContactItem(contact, index))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ContactSearchDropdown;
