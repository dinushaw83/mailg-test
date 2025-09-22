import React, { useMemo, useState } from "react";
import { List, Typography, Box, IconButton, Button, Tooltip, TextField } from "@mui/material";
import ContactListItem from "./ContactListItem";
import CreateContact from "./CreateContact";
import { useGlobalContext } from "../../../contexts/GlobalContext";
import EmptyContacts from "./EmptyContacts";

const ContactsTab = ({ onClose }) => {
  const { recipients } = useGlobalContext();
  const [displaySearch, setDisplaySearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState(
    recipients.filter((recipient) => recipient.labels.includes("My contacts"))
  );
  const myContacts = useMemo(
    () => searchResults.filter((recipient) => recipient.labels.includes("My contacts")),
    [searchResults]
  );
  // Contacts in search results that are not in my contacts
  const otherContacts = useMemo(
    () => searchResults.filter((recipient) => !recipient.labels.includes("My contacts")),
    [searchResults]
  );
  const [displayCreateContact, setDisplayCreateContact] = useState(false);

  // Handle search
  const handleSearch = (value) => {
    setSearchQuery(value);
    if (value.trim()) {
      // Set state to indicate that a search has been performed
      setHasSearched(true);

      // Set search results
      setSearchResults(
        recipients.filter(
          (recipient) =>
            recipient.name.toLowerCase().includes(value.toLowerCase()) ||
            recipient.email.toLowerCase().includes(value.toLowerCase())
        )
      );
    }
  };

  // Close search
  const handleCloseSearch = () => {
    setDisplaySearch(false);
    setSearchQuery("");
    setHasSearched(false);
    setSearchResults(recipients.filter((recipient) => recipient.labels.includes("My contacts")));
  };

  // Display create contact
  if (displayCreateContact) {
    return <CreateContact onClose={() => setDisplayCreateContact(false)} />;
  }

  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          ml: 1.5,
        }}
      >
        {displaySearch ? (
          <>
            <span className="material-symbols-outlined" style={{ fontSize: 23, color: "rgb(128,134,139)" }}>
              search
            </span>

            {/* Search input */}
            <TextField
              fullWidth
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              variant="standard"
              sx={{
                pl: 1,
                "& .MuiInput-root": {
                  border: "3px solid transparent",
                  borderRadius: "4px",
                  px: 1.5,
                  "&.Mui-focused": {
                    border: "3px solid #0b57d0",
                  },
                },
                "& .MuiInputBase-input::placeholder": {
                  color: "#444746",
                  opacity: 0.8,
                },
              }}
              slotProps={{
                input: {
                  disableUnderline: true,
                  color: "#1f1f1f",
                },
              }}
            />

            {/* Close search */}
            <IconButton size="medium" aria-label="close-search" onClick={handleCloseSearch}>
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  backgroundColor: "#444746",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span class="material-symbols-outlined" style={{ color: "white", fontSize: "18px" }}>
                  close_small
                </span>
              </div>
            </IconButton>
          </>
        ) : (
          <>
            <Typography variant="p" sx={{ fontWeight: 400, fontSize: "1.375rem" }}>
              Contacts
            </Typography>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Tooltip
                title="Search"
                placement="bottom"
                slotProps={{
                  popper: {
                    sx: {
                      "& .MuiTooltip-tooltip": {
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "white",
                        fontSize: "13px",
                        fontWeight: 200,
                      },
                    },
                  },
                }}
              >
                <IconButton size="medium" aria-label="search" onClick={() => setDisplaySearch(true)}>
                  <span className="material-symbols-outlined" style={{ fontSize: 21, color: "#444746" }}>
                    search
                  </span>
                </IconButton>
              </Tooltip>
              <Tooltip
                title="Open in new tab"
                placement="bottom"
                slotProps={{
                  popper: {
                    sx: {
                      "& .MuiTooltip-tooltip": {
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "white",
                        fontSize: "13px",
                        fontWeight: 200,
                      },
                    },
                  },
                }}
              >
                <IconButton size="medium" aria-label="open-in-new-tab">
                  <span className="material-symbols-outlined" style={{ fontSize: 21, color: "#444746" }}>
                    open_in_new
                  </span>
                </IconButton>
              </Tooltip>
              <Tooltip
                title="Close"
                placement="bottom"
                slotProps={{
                  popper: {
                    sx: {
                      "& .MuiTooltip-tooltip": {
                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                        color: "white",
                        fontSize: "13px",
                        fontWeight: 200,
                      },
                    },
                  },
                }}
              >
                <IconButton size="medium" aria-label="Close tabs" onClick={onClose}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#444746" }}>
                    close
                  </span>
                </IconButton>
              </Tooltip>
            </div>
          </>
        )}
      </Box>

      {/* Create contact */}
      {(hasSearched ? searchResults.length > 0 : myContacts.length > 0) && (
        <Button
          size="medium"
          sx={{
            textTransform: "none",
            width: "100%",
            borderRadius: "50px",
            justifyContent: "flex-start",
            fontWeight: 400,
            fontSize: "0.875rem",
            color: "#0b57d0",
            mb: 1,
            "&:hover": {
              backgroundColor: "rgba(11, 87, 208, 0.08)",
            },
          }}
          onClick={() => setDisplayCreateContact(true)}
        >
          <span class="material-symbols-outlined" style={{ fontSize: "20px", marginRight: "8px" }}>
            add
          </span>
          Create contact
        </Button>
      )}

      {/* Contacts list in my contacts*/}
      {myContacts.length > 0 && (
        <>
          <p style={{ fontSize: "0.6875rem", fontWeight: 400, color: "#444746", marginLeft: "6px" }}>
            Contacts {hasSearched ? "" : `(${myContacts.length})`}
          </p>
          <List sx={{ p: 0, pl: 1 }}>
            {myContacts.map((contact) => (
              <ContactListItem key={contact.id} contact={contact} />
            ))}
          </List>
        </>
      )}

      {/* Other contacts in search results */}
      {hasSearched && otherContacts.length > 0 && (
        <>
          <p style={{ fontSize: "0.6875rem", fontWeight: 400, color: "#444746", marginLeft: "6px" }}>Other Contacts</p>
          <List sx={{ p: 0, pl: 1 }}>
            {otherContacts.map((contact) => (
              <ContactListItem key={contact.id} contact={contact} />
            ))}
          </List>
        </>
      )}

      {/* Empty contacts */}
      {hasSearched && searchResults.length === 0 ? (
        <EmptyContacts
          title="No results found"
          description="Check spelling and try again"
          onClickCreateContact={() => setDisplayCreateContact(true)}
        />
      ) : (
        !hasSearched &&
        myContacts.length === 0 && (
          <EmptyContacts
            title="No contacts yet"
            description="Google Contacts makes your contacts organized and clutter-free so you never lose touch"
            onClickCreateContact={() => setDisplayCreateContact(true)}
            titleStyle={{ fontSize: "1rem", fontWeight: 500 }}
          />
        )
      )}
    </Box>
  );
};

export default ContactsTab;
