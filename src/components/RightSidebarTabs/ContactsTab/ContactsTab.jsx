import React, { useEffect, useMemo, useState } from "react";
import { List, Typography, Box, IconButton, Button, TextField } from "@mui/material";
import ContactListItem from "./ContactListItem";
import CreateContact from "./CreateContact";
import ContactDetails from "./ContactDetails";
import { ActionIconButton } from "./ContactComponents";
import { useGlobalContext } from "../../../contexts/GlobalContext";
import EmptyContacts from "./EmptyContacts";

const ContactsTab = () => {
  const { recipients, rightSidebarActiveTab, setRightSidebarActiveTab } = useGlobalContext();
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
  const favoriteContacts = useMemo(
    () => recipients.filter((recipient) => recipient.labels.includes("Favorites")),
    [recipients]
  );
  // Contacts in search results that are not in my contacts
  const otherContacts = useMemo(
    () => searchResults.filter((recipient) => !recipient.labels.includes("My contacts")),
    [searchResults]
  );

  // Update search results when recipients change
  useEffect(() => {
    setSearchResults(recipients.filter((recipient) => recipient.labels.includes("My contacts")));
  }, [recipients]);

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

  // View contact details
  const handleViewContactDetails = (contact) => {
    setRightSidebarActiveTab((prev) => ({ ...prev, contact: { screen: "CONTACT_DETAILS", contactId: contact.id } }));
  };

  // Display create or edit contact
  if (
    rightSidebarActiveTab.contact.screen === "CREATE_CONTACT" ||
    (rightSidebarActiveTab.contact.screen === "EDIT_CONTACT" && rightSidebarActiveTab.contact.contactId)
  ) {
    return (
      <CreateContact
        onClose={() =>
          setRightSidebarActiveTab((prev) => ({
            ...prev,
            contact: {
              screen: rightSidebarActiveTab.contact.screen === "CREATE_CONTACT" ? "CONTACTS" : "CONTACT_DETAILS",
              contactId:
                rightSidebarActiveTab.contact.screen === "CREATE_CONTACT"
                  ? null
                  : rightSidebarActiveTab.contact.contactId,
            },
          }))
        }
        onTabClose={() => setRightSidebarActiveTab((prev) => ({ ...prev, activeTab: null }))}
      />
    );
  }

  // View contact details
  if (rightSidebarActiveTab.contact.screen === "CONTACT_DETAILS" && rightSidebarActiveTab.contact.contactId) {
    return <ContactDetails />;
  }

  return (
    <Box sx={{ height: "calc(100vh - 100px)", overflow: "hidden", position: "relative" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: 1,
          position: "fixed",
          backgroundColor: "white",
          zIndex: 2,
          width: "288px",
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
                <span className="material-symbols-outlined" style={{ color: "white", fontSize: "18px" }}>
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
              {/* Search */}
              <ActionIconButton
                iconName="search"
                title="Search"
                onClick={() => setDisplaySearch(true)}
                color="#444746"
              />

              {/* Open in new tab */}
              <ActionIconButton iconName="open_in_new" title="Open in new tab" color="#444746" />

              {/* Close */}
              <ActionIconButton
                iconName="close"
                title="Close"
                onClick={() =>
                  setRightSidebarActiveTab((prev) => ({ ...prev, activeTab: null, contact: { screen: "CONTACTS" } }))
                }
                iconSize={22}
                color="#444746"
              />
            </div>
          </>
        )}
      </Box>

      {/* Scrollable Content */}
      <Box sx={{ overflowY: "auto", py: 2, px: 1, mt: 7, height: "calc(100vh - 188px)" }}>
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
            onClick={() => setRightSidebarActiveTab((prev) => ({ ...prev, contact: { screen: "CREATE_CONTACT" } }))}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", marginRight: "8px" }}>
              add
            </span>
            Create contact
          </Button>
        )}

        {/* Favorite contacts */}
        {!hasSearched && favoriteContacts.length > 0 && (
          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "0.6875rem", fontWeight: 400, color: "#444746", marginLeft: "6px" }}>
              <span className="material-symbols-filled" style={{ fontSize: "16px", marginRight: "4px" }}>
                star
              </span>
              Favorites ({favoriteContacts.length})
            </p>
            <List sx={{ p: 0, pl: 1 }}>
              {favoriteContacts.map((contact) => (
                <ContactListItem key={contact.id} contact={contact} onClick={() => handleViewContactDetails(contact)} />
              ))}
            </List>
          </div>
        )}

        {/* Contacts list in my contacts*/}
        {myContacts.length > 0 && (
          <>
            <p style={{ fontSize: "0.6875rem", fontWeight: 400, color: "#444746", marginLeft: "6px" }}>
              Contacts {hasSearched ? "" : `(${myContacts.length})`}
            </p>
            <List sx={{ p: 0, pl: 1 }}>
              {myContacts.map((contact) => (
                <ContactListItem key={contact.id} contact={contact} onClick={() => handleViewContactDetails(contact)} />
              ))}
            </List>
          </>
        )}

        {/* Other contacts in search results */}
        {hasSearched && otherContacts.length > 0 && (
          <>
            <p style={{ fontSize: "0.6875rem", fontWeight: 400, color: "#444746", marginLeft: "6px" }}>
              Other Contacts
            </p>
            <List sx={{ p: 0, pl: 1 }}>
              {otherContacts.map((contact) => (
                <ContactListItem key={contact.id} contact={contact} onClick={() => handleViewContactDetails(contact)} />
              ))}
            </List>
          </>
        )}

        {/* Empty contacts */}
        {hasSearched && searchResults.length === 0 ? (
          <EmptyContacts
            title="No results found"
            description="Check spelling and try again"
            onClickCreateContact={() =>
              setRightSidebarActiveTab((prev) => ({ ...prev, contact: { screen: "CREATE_CONTACT" } }))
            }
          />
        ) : (
          !hasSearched &&
          myContacts.length === 0 && (
            <EmptyContacts
              title="No contacts yet"
              description="Google Contacts makes your contacts organized and clutter-free so you never lose touch"
              onClickCreateContact={() =>
                setRightSidebarActiveTab((prev) => ({ ...prev, contact: { screen: "CREATE_CONTACT" } }))
              }
              titleStyle={{ fontSize: "1rem", fontWeight: 500 }}
            />
          )
        )}
      </Box>
    </Box>
  );
};

export default ContactsTab;
