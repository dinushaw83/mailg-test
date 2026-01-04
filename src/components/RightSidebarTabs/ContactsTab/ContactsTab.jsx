import { Box, Button, IconButton, List, Tab, Tabs, TextField, Typography } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import React, { useEffect, useMemo, useState } from "react";

import { ActionIconButton } from "./ContactComponents";
import ContactDetails from "./ContactDetails";
import ContactListItem from "./ContactListItem";
import CreateContact from "./CreateContact";
import EmptyContacts from "./EmptyContacts";
import { useGlobalContext } from "../../../contexts/GlobalContext";

const ContactsTab = () => {
  const { recipients, rightSidebarActiveTab, setRightSidebarActiveTab, emails, loggedInUser } = useGlobalContext();
  const location = useLocation();
  const [displaySearch, setDisplaySearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState(1); // 0 for "In this thread", 1 for "Contacts"
  const [searchResults, setSearchResults] = useState(
    recipients.filter((recipient) => recipient?.isSaved && !recipient?.isDeleted)
  );
  const myContacts = useMemo(
    () => searchResults.filter((recipient) => recipient?.isSaved && !recipient?.isDeleted),
    [searchResults]
  );
  const favoriteContacts = useMemo(
    () => recipients.filter((recipient) => recipient?.isFavorite && !recipient?.isDeleted),
    [recipients]
  );
  // Contacts in search results that are not in my contacts
  const otherContacts = useMemo(
    () => searchResults.filter((recipient) => !recipient?.isSaved),
    [searchResults]
  );

  // Update search results when recipients change
  useEffect(() => {
    setSearchResults(recipients.filter((recipient) => recipient?.isSaved && !recipient?.isDeleted));
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
    setSearchResults(recipients.filter((recipient) => recipient?.isSaved));
  };

  // Check if URL matches thread format and validate threadId
  const isThreadView = useMemo(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);

    // Check for patterns: /:folder/:threadId or /label/:label/:threadId
    if (pathSegments.length === 2) {
      // Pattern: /:folder/:threadId
      const [folder, threadId] = pathSegments;
      return emails.some((email) => {
        // Extract numeric part from email threadId (e.g., "#thread-f:1842139573356840007" -> "1842139573356840007")
        const emailThreadId = email.threadId.replace("#thread-f:", "");
        return emailThreadId === threadId;
      });
    } else if (pathSegments.length === 3 && pathSegments[0] === "label") {
      // Pattern: /label/:label/:threadId
      const [labelPrefix, label, threadId] = pathSegments;
      return emails.some((email) => {
        // Extract numeric part from email threadId (e.g., "#thread-f:1842139573356840007" -> "1842139573356840007")
        const emailThreadId = email.threadId.replace("#thread-f:", "");
        return emailThreadId === threadId;
      });
    }

    return false;
  }, [location.pathname, emails]);

  // Set activeTab to 0 when isThreadView becomes true
  useEffect(() => {
    if (isThreadView) {
      setActiveTab(0);
    }
  }, [isThreadView]);

  // Get contacts from current thread
  const threadContacts = useMemo(() => {
    if (!isThreadView) return [];

    const pathSegments = location.pathname.split("/").filter(Boolean);
    let threadId;

    if (pathSegments.length === 2) {
      threadId = pathSegments[1];
    } else if (pathSegments.length === 3 && pathSegments[0] === "label") {
      threadId = pathSegments[2];
    } else {
      return [];
    }

    // Find all emails with this threadId
    const threadEmails = emails.filter((email) => {
      const emailThreadId = email.threadId.replace("#thread-f:", "");
      return emailThreadId === threadId;
    });

    // Collect all unique email addresses from from, to, cc, bcc
    const emailAddresses = new Set();
    const fromAddresses = [];
    threadEmails.forEach((email) => {
      // Add 'from' email
      if (email.from && email.from.email) {
        emailAddresses.add(email.from.email);
        fromAddresses.push(email.from);
      }
      // Add 'to' emails
      if (Array.isArray(email.to)) {
        email.to.forEach((addr) => emailAddresses.add(addr));
      }
      // Add 'cc' emails
      if (Array.isArray(email.cc)) {
        email.cc.forEach((addr) => emailAddresses.add(addr));
      }
      // Add 'bcc' emails
      if (Array.isArray(email.bcc)) {
        email.bcc.forEach((addr) => emailAddresses.add(addr));
      }
    });

    // Find contacts that match these email addresses
    const contacts = recipients.filter((recipient) => {
      // Check if any of the recipient's emails match the thread email addresses
      return recipient.emails && recipient.emails.some((emailObj) => emailAddresses.has(emailObj.value));
    });

    // Check if logged-in user's email is in the thread
    const loggedInUserInThread =
      loggedInUser && loggedInUser.emails && loggedInUser.emails.some((emailObj) => emailAddresses.has(emailObj.value));

    // Add logged-in user to contacts if they're in the thread and not already there
    if (loggedInUserInThread && !contacts.some((c) => c.isLoggedInUser)) {
      contacts.push(loggedInUser);
    }

    // Find email addresses that don't have corresponding contacts
    const existingEmailAddresses = new Set();
    contacts.forEach((contact) => {
      if (contact.emails) {
        contact.emails.forEach((emailObj) => existingEmailAddresses.add(emailObj.value));
      }
    });

    // Create custom contacts for email addresses that don't have corresponding contacts
    const customContacts = [];
    emailAddresses.forEach((emailAddress) => {
      if (!existingEmailAddresses.has(emailAddress)) {
        // Get displayName from fromAddresses
        const displayName = fromAddresses.find((addr) => addr.email === emailAddress)?.name ?? "";
        // Create custom contact object
        const customContact = {
          id: emailAddress,
          name: displayName,
          firstName: displayName.split(" ")[0] ?? "",
          lastName: displayName.split(" ").slice(1).join(" ") ?? "",
          email: emailAddress,
          emails: [
            {
              value: emailAddress,
              label: "",
            },
          ],
          avatar: null,
          labels: [],
        };

        customContacts.push(customContact);
      }
    });

    // Add custom contacts to the contacts array
    contacts.push(...customContacts);

    return contacts;
  }, [isThreadView, location.pathname, emails, recipients, loggedInUser]);

  // View contact details
  const handleViewContactDetails = (contact) => {
    setRightSidebarActiveTab((prev) => ({
      ...prev,
      contact: { screen: "CONTACT_DETAILS", contactId: contact.id ?? contact.email },
    }));
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
    <Box sx={{ height: "calc(100vh - 130px)", overflow: "hidden", position: "relative" }}>
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
              <Link to="/contacts" target="_blank" style={{ textDecoration: "none" }}>
                <ActionIconButton
                  iconName="open_in_new"
                  title="Open in new tab"
                  color="#444746"
                  disabled={isThreadView && activeTab === 0}
                />
              </Link>

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

      {/* Conditionally render tabs only if in thread view */}
      {isThreadView && (
        <>
          {/* Tabs */}
          {!displaySearch && (
            <Box sx={{ borderBottom: 1, borderColor: "divider", mt: 7 }}>
              <Tabs
                value={activeTab}
                onChange={(event, newValue) => setActiveTab(newValue)}
                sx={{
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontSize: "0.875rem",
                    fontWeight: 400,
                    minHeight: "48px",
                    width: "50%",
                    color: "#444746",
                    "&.Mui-selected": {
                      color: "#0b57d0",
                    },
                  },
                  "& .MuiTabs-indicator": {
                    backgroundColor: "#0b57d0",
                    left: activeTab === 0 ? "30px !important" : "195px !important",
                    width: activeTab === 0 ? "90px !important" : "65px !important",
                    height: "3px !important",
                    borderTopLeftRadius: "5px !important",
                    borderTopRightRadius: "5px !important",
                  },
                }}
              >
                <Tab label="In this thread" />
                <Tab label="Contacts" />
              </Tabs>
            </Box>
          )}

          {/* In this thread tab Content */}
          {activeTab === 0 && !hasSearched && (
            <Box sx={{ overflowY: "auto", py: 2, px: 1, height: "calc(100vh - 230px)", mt: displaySearch ? 7 : 0 }}>
              {threadContacts.length > 0 && (
                <List sx={{ p: 0, pl: 1 }}>
                  {threadContacts.map((contact, index) => (
                    <ContactListItem
                      key={contact.id || contact.email || index}
                      contact={contact}
                      onClick={() => handleViewContactDetails(contact)}
                    />
                  ))}
                </List>
              )}
            </Box>
          )}
        </>
      )}

      {(activeTab === 1 || !isThreadView || hasSearched) && (
        <Box
          sx={{
            overflowY: "auto",
            py: 2,
            px: 1,
            height: isThreadView ? "calc(100vh - 260px)" : "calc(100vh - 210px)",
            mt: isThreadView && !displaySearch ? 0 : 7,
          }}
        >
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
                {favoriteContacts.map((contact, index) => (
                  <ContactListItem
                    key={contact.id || contact.email || index}
                    contact={contact}
                    onClick={() => handleViewContactDetails(contact)}
                  />
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
                {myContacts.map((contact, index) => (
                  <ContactListItem
                    key={contact.id || contact.email || index}
                    contact={contact}
                    onClick={() => handleViewContactDetails(contact)}
                  />
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
                {otherContacts.map((contact, index) => (
                  <ContactListItem
                    key={contact.id || contact.email || index}
                    contact={contact}
                    onClick={() => handleViewContactDetails(contact)}
                  />
                ))}
              </List>
            </>
          )}

          {/* Empty contacts view */}
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
                description="MailG Contacts makes your contacts organized and clutter-free so you never lose touch"
                onClickCreateContact={() =>
                  setRightSidebarActiveTab((prev) => ({ ...prev, contact: { screen: "CREATE_CONTACT" } }))
                }
                titleStyle={{ fontSize: "1rem", fontWeight: 500 }}
              />
            )
          )}
        </Box>
      )}
    </Box>
  );
};

export default ContactsTab;
