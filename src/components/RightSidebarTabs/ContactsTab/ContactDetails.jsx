import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Avatar,
  Box,
  Button,
  Typography,
  Menu,
  MenuItem,
  ListItemText,
  Tooltip,
  IconButton,
  Link,
  Chip,
} from "@mui/material";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import { format, isThisYear } from "date-fns";
import { ActionIconButton, ContactDetailRow } from "./ContactComponents";
import ScopedInfoModal from "../../common/ScopedInfoModal";
import { useComposeModal } from "../../../hooks/useComposeModal";
import { useGlobalContext } from "../../../contexts/GlobalContext";
import { generateAvatarColor, isValidEmail, generateNextIntegerId } from "../../../utils/helperFunctions";
import styles from "./ContactDetails.module.css";

// Style of snackbar in this screen
const snackbarStyle = {
  left: "auto !important",
  right: "60px !important",
  "& .MuiSnackbarContent-root": {
    backgroundColor: "#303030",
    color: "#fff",
    minHeight: "40px",
  },
  "& .MuiPaper-root": {
    width: "280px",
    minWidth: "280px",
  },
};

const ContactDetails = () => {
  const {
    rightSidebarActiveTab,
    setRightSidebarActiveTab,
    recipients,
    setRecipients,
    setDeletedRecipients,
    setSnackbar,
    emails,
    loggedInUser,
    recipientLabels,
  } = useGlobalContext();
  // If contact id is an email, then check if it is a logged in user or create a custom contact if it is a valid email
  const contact = useMemo(() => {
    const contactId = rightSidebarActiveTab.contact.contactId;
    let found = recipients.find((recipient) => recipient.id === contactId);

    if (!found) {
      if (isValidEmail(contactId)) {
        if (
          loggedInUser &&
          Array.isArray(loggedInUser.emails) &&
          loggedInUser.emails.some((emailObj) => emailObj.value === contactId)
        ) {
          found = { ...loggedInUser, isLoggedInUser: true };
        } else {
          // Get the email object of from emails from field
          const emailObj = emails.find((email) => email.from.email === contactId);
          found = {
            id: contactId,
            email: contactId,
            name: emailObj?.from?.name ?? contactId,
            firstName: emailObj?.from?.name?.split(" ")[0] ?? contactId,
            lastName: emailObj?.from?.name?.split(" ").slice(1).join(" ") ?? "",
            emails: [{ value: contactId, label: "" }],
            isCustomContact: true,
            labels: [],
          };
        }
      }
    }

    return found;
  }, [recipients, rightSidebarActiveTab.contact.contactId, loggedInUser]);
  const isFavorite = contact?.isFavorite;
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const deletedContact = useRef(null);
  const [disableHeader, setDisableHeader] = useState(false);
  const [emailMenuAnchor, setEmailMenuAnchor] = useState(null);
  const [showAllEmails, setShowAllEmails] = useState(false);
  const [showAllAboutItems, setShowAllAboutItems] = useState(false);
  const { addNewComposeWindow } = useComposeModal();
  const navigate = useNavigate();
  const location = useLocation();
  // Contact reference for undo save
  const contactReference = useRef(null);
  // Timeouts reference
  const timeouts = useRef({
    save: null,
    delete: null,
    favorite: null,
  });

  // Clear timeouts on unmount
  useEffect(
    () => () => {
      timeouts.current.save && clearTimeout(timeouts.current.save);
      timeouts.current.delete && clearTimeout(timeouts.current.delete);
      timeouts.current.favorite && clearTimeout(timeouts.current.favorite);
    },
    []
  );

  // Get the label id
  const getLabelId = (label) => recipientLabels.find((l) => l.label === label)?.id;

  // Filter emails where contact appears in to, cc, or bcc
  const getRecentEmails = () => {
    if (!contact?.emails || !emails) return [];

    const contactEmails = contact.emails.map((email) => email.value);

    return emails
      .filter((email) => {
        // Don't include draft emails
        if (email.labels?.includes("Drafts")) return false;

        // Check if contact email appears in to, cc, or bcc
        const toEmails = Array.isArray(email.to) ? email.to : [email.to].filter(Boolean);
        const ccEmails = Array.isArray(email.cc) ? email.cc : [email.cc].filter(Boolean);
        const bccEmails = Array.isArray(email.bcc) ? email.bcc : [email.bcc].filter(Boolean);

        const allRecipients = [...toEmails, ...ccEmails, ...bccEmails];
        return allRecipients.some((recipient) => contactEmails.includes(recipient));
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5); // Show only the 5 most recent
  };

  // Format date for recent interactions
  const formatRecentDate = (timestamp) => {
    const date = new Date(timestamp);

    // If it's current year, show "Sep 12" format
    if (isThisYear(date)) {
      return format(date, "MMM d");
    }

    // If it's previous year, show "Sep 2024" format
    return format(date, "MMM yyyy");
  };

  // Navigate to email details
  const navigateToEmailDetails = (email) => {
    const threadId = email.threadId.split(":")[1];

    // If labels includes Drafts, then add new compose window with the draft id
    if (!email.labels.includes("Drafts")) {
      // If compose param is present in the url, include it while navigating
      const urlParams = new URLSearchParams(location.search);
      const composeParam = urlParams.get("compose");
      if (composeParam) {
        navigate(`${location.pathname}/${threadId}?compose=${composeParam}`);
      } else {
        navigate(`${location.pathname}/${threadId}`);
      }
    }
  };

  const recentEmails = getRecentEmails();

  // Get all About section items
  const getAboutItems = () => {
    const items = [];

    // Birthday - always include, either with content or "Add birthday"
    const hasBirthday =
      contact?.birthday &&
      Object.keys(contact.birthday).length > 0 &&
      Object.values(contact.birthday).some((value) => value && value.trim() !== "");

    items.push({
      type: "birthday",
      icon: "cake",
      content: hasBirthday
        ? (() => {
            const { month, day, year } = contact.birthday;
            const parts = [];
            if (month) parts.push(month);
            if (day) parts.push(day + (year ? "," : ""));
            if (year) parts.push(year);
            return parts.join(" ");
          })()
        : null,
      hasContent: hasBirthday,
    });

    // Related persons
    if (contact?.relatedPersons && contact.relatedPersons.length > 0) {
      items.push({
        type: "relatedPersons",
        icon: "group_work",
        content: contact.relatedPersons,
      });
    }

    // Custom fields
    if (contact?.customFields && contact.customFields.length > 0) {
      items.push({
        type: "customFields",
        icon: "view_agenda",
        content: contact.customFields,
      });
    }

    // Notes
    if (contact?.notes && contact.notes.trim() !== "") {
      items.push({
        type: "notes",
        icon: "draft",
        content: contact.notes,
      });
    }

    return items;
  };

  const aboutItems = getAboutItems();
  const visibleAboutItems = showAllAboutItems ? aboutItems : aboutItems.slice(0, 3);

  // Handle favorite
  const handleFavorite = () => {
    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    // Disable the header
    setDisableHeader(true);

    // Determine the snackbar message
    const snackbarMessage = isFavorite ? "Contact removed from favorites" : "Contact added to favorites";

    // Update the recipients
    // If the contact is not saved when adding to favorites, then save it
    setRecipients((prev) =>
      prev.map((recipient) =>
        recipient.id === contact.id
          ? {
              ...recipient,
              isFavorite: !isFavorite,
              isSaved: !isFavorite ? true : recipient?.isSaved,
            }
          : recipient
      )
    );

    timeouts.current.favorite = setTimeout(() => {
      // Display snackbar notification
      setSnackbar({
        open: true,
        message: snackbarMessage,
        action: null,
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
      });

      // Enable the header
      setDisableHeader(false);
    }, 500);
  };

  // Go back
  const handleGoBack = () => {
    setRightSidebarActiveTab((prev) => ({ ...prev, contact: { screen: "CONTACTS" } }));
  };

  // Handle tab close
  const handleTabClose = () => {
    setRightSidebarActiveTab((prev) => ({ ...prev, activeTab: null }));
  };

  // Go to edit contact screen
  const handleEdit = () => {
    // TODO: If logged in user, then display a notification coming soon for now
    if (contact?.isLoggedInUser) {
      setSnackbar({
        open: true,
        message: "Coming soon",
        action: null,
        autoHideDuration: 2000,
        hideClose: true,
        style: snackbarStyle,
      });
    } else {
      setRightSidebarActiveTab((prev) => ({ ...prev, contact: { screen: "EDIT_CONTACT", contactId: contact.id } }));
    }
  };

  // Handle undo delete
  const handleUndoDelete = () => {
    // Remove the contact from the deleted recipients
    setDeletedRecipients((prev) => prev.filter((recipient) => recipient.id !== deletedContact.current.id));

    // Save the contact back
    setRecipients((prev) =>
      prev.map((recipient) =>
        recipient.id === deletedContact.current.id ? { ...recipient, isSaved: true } : recipient
      )
    );

    // Display snackbar notification indicating undone delete
    setSnackbar({
      open: true,
      message: "Undone",
      action: null,
      autoHideDuration: 3000,
      hideClose: true,
      style: snackbarStyle,
    });
  };

  // Confirm delete
  const handleConfirmDelete = () => {
    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    // Disable the header
    setDisableHeader(true);

    deletedContact.current = { ...contact };

    timeouts.current.delete = setTimeout(() => {
      // Add the contact to the deleted recipients
      setDeletedRecipients((prev) => [...prev, contact]);

      // Set isSaved to false
      setRecipients((prev) =>
        prev.map((recipient) => (recipient.id === contact.id ? { ...recipient, isSaved: false } : recipient))
      );

      // Hide the delete modal
      setShowDeleteModal(false);

      // Go back to the contacts screen
      setRightSidebarActiveTab((prev) => ({ ...prev, contact: { screen: "CONTACTS" } }));

      // Display snackbar notification indicating contact moved to trash
      setSnackbar({
        open: true,
        message: "Contact moved to trash.",
        action: (
          <Button
            variant="text"
            size="medium"
            onClick={handleUndoDelete}
            sx={{ textTransform: "capitalize", color: "#a8c7fa", fontWeight: 400 }}
          >
            Undo
          </Button>
        ),
        autoHideDuration: 6000,
        hideClose: false,
        style: snackbarStyle,
        closeIconColor: "#fff",
      });

      // Enable the header
      setDisableHeader(false);
    }, 500);
  };

  // Open compose email with the selected email
  const handleOpenComposeEmail = (email) => {
    // Create a contact object with the selected email and without the "emails" field
    const { emails, ...rest } = contact;
    const contactObj = { ...rest, email };
    // Open a new compose window with the email in the to field
    addNewComposeWindow(null, { to: [contactObj] });
  };

  // Handle email selection from menu
  const handleEmailSelect = (email) => {
    handleOpenComposeEmail(email);
    setEmailMenuAnchor(null);
  };

  // Handle navigation to edit page
  const handleEditClick = () => {
    setRightSidebarActiveTab((prev) => ({
      ...prev,
      contact: { screen: "EDIT_CONTACT", contactId: contact.id },
    }));
  };

  // Handle action icon button click
  const handleActionIconButtonClick = (action, event) => {
    switch (action) {
      case "send_email":
        if (contact?.emails?.length > 1) {
          // Open the email selection menu
          setEmailMenuAnchor(event.currentTarget);
        } else if (contact?.email) {
          handleOpenComposeEmail(contact.email);
        }
        break;
      default:
        break;
    }
  };

  // Open website in new tab
  const openWebsite = (website) => {
    // Ensure the website has a protocol prefix
    let url = website;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    window.open(url, "_blank");
  };

  // Handle undo save
  const handleUndoSave = () => {
    // If contact was a custom contact, then remove it from the recipients array
    if (contactReference.current?.isCustomContact) {
      setRecipients((prev) => prev.filter((recipient) => recipient.email !== contactReference.current.email));

      // Replace contact id with the original contact id in the right sidebar active tab
      setRightSidebarActiveTab((prev) => ({
        ...prev,
        contact: { ...prev.contact, contactId: contactReference.current.id },
      }));
    } else {
      // Else set isSaved to false
      setRecipients((prev) =>
        prev.map((recipient) =>
          recipient.id === contactReference.current.id ? { ...recipient, isSaved: false } : recipient
        )
      );
    }

    // Display snackbar notification indicating contact save undone
    setSnackbar({
      open: true,
      message: "Undone",
      action: null,
      autoHideDuration: 3000,
      hideClose: true,
      style: snackbarStyle,
    });
  };

  // Handle save contact
  const handleSaveContact = () => {
    // Set the contact reference
    contactReference.current = { ...contact };

    // Disable the header
    setDisableHeader(true);

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    timeouts.current.save = setTimeout(() => {
      // If contact is a custom contact add it to the recipients array
      if (contact?.isCustomContact) {
        const newContact = {
          id: generateNextIntegerId(recipients),
          email: contact.email,
          emails: contact.emails,
          name: contact.name,
          isSaved: true,
          labels: [],
          isFavorite: false,
          firstName: contact.name.split(" ")[0],
          lastName: contact.name.split(" ")[1] ?? "",
          avatar: null,
        };

        // Save the contact in the recipients array
        setRecipients((prev) => [...prev, newContact]);

        // Add the contact id to the right sidebar active tab
        setRightSidebarActiveTab((prev) => ({ ...prev, contact: { ...prev.contact, contactId: newContact.id } }));
      } else {
        // Set isSaved to true in the recipients array for the contact
        setRecipients((prev) =>
          prev.map((recipient) => (recipient.id === contact.id ? { ...recipient, isSaved: true } : recipient))
        );
      }

      // Display snackbar notification indicating contact saved
      setSnackbar({
        open: true,
        message: "Saved to contacts.mailg.com",
        action: (
          <Button
            variant="text"
            size="medium"
            onClick={handleUndoSave}
            sx={{ textTransform: "capitalize", color: "#a8c7fa", fontWeight: 400 }}
          >
            Undo
          </Button>
        ),
        autoHideDuration: 5000,
        hideClose: false,
        style: snackbarStyle,
        closeIconColor: "#fff",
      });

      // Enable the header
      setDisableHeader(false);
    }, 500);
  };

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
        {/* Back */}
        <ActionIconButton iconName="arrow_back" title="Back" onClick={handleGoBack} disabled={disableHeader} />
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Edit contact */}
          <ActionIconButton
            iconName="edit"
            title="Edit contact"
            onClick={handleEdit}
            color="#444746"
            disabled={disableHeader}
          />

          {/* If logged in user or custom contact, then don't display the favorite, delete and open in new tab buttons */}
          {!contact?.isLoggedInUser && !contact?.isCustomContact && (
            <>
              {/* Favorite */}
              <ActionIconButton
                iconName="star"
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                onClick={handleFavorite}
                color={isFavorite ? "#0b57d0" : "#4f5251"}
                iconType={isFavorite ? "filled" : "outlined"}
                sx={{
                  "&:hover": {
                    backgroundColor: isFavorite ? "rgba(11, 87, 208, 0.08)" : "action.hover",
                  },
                }}
                disabled={disableHeader}
              />

              {/* Delete contact */}
              <ActionIconButton
                iconName="delete"
                title="Delete from contacts"
                onClick={() => setShowDeleteModal(true)}
                color="#444746"
                disabled={disableHeader}
              />

              {/* Open in new tab */}
              <RouterLink to={`/contacts/person/${contact.id}`} target="_blank" style={{ textDecoration: "none" }}>
                <ActionIconButton
                  iconName="open_in_new"
                  title="Open in new tab"
                  color="#444746"
                  disabled={disableHeader}
                />
              </RouterLink>
            </>
          )}

          {/* Close */}
          <ActionIconButton
            iconName="close"
            title="Close"
            onClick={handleTabClose}
            iconSize={22}
            color="#444746"
            disabled={disableHeader}
          />
        </div>
      </Box>

      {/* Scrollable Content */}
      <Box
        sx={{
          overflowY: "auto",
          py: 2,
          px: 1,
          mt: 7,
          height:
            contact?.isCustomContact || !contact?.isSaved || contact?.isLoggedInUser
              ? "calc(100vh - 288px)"
              : "calc(100vh - 218px)",
        }}
      >
        {/* Profile pic and name */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: generateAvatarColor(contact?.name),
              color: "white",
              fontSize: "32px",
              width: 56,
              height: 56,
            }}
          >
            {contact?.avatar ? (
              <img
                src={contact?.avatar}
                alt={contact?.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              contact?.name?.charAt(0).toUpperCase()
            )}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 400, fontSize: "1.375rem", lineHeight: 1.2 }}>
              {contact.name}
            </Typography>
            {contact?.isLoggedInUser && (
              <Typography variant="h6" sx={{ fontSize: "1.375rem", fontWeight: 400, lineHeight: 1.2 }}>
                (You)
              </Typography>
            )}
          </Box>
        </Box>

        {/* Action icons */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2, mt: 3 }}>
          {/* Send email */}
          <ActionIconButton
            iconName="mail"
            title="Send email (opens a new tab)"
            tooltipPlacement="top-start"
            color="#041d35"
            sx={{
              backgroundColor: "#c2e7ff",
              position: "relative",
              overflow: "hidden",
              width: 40,
              height: 40,
              "&:hover": {
                backgroundColor: "#c2e7ff",
              },
            }}
            className={styles.contactActionIconButton}
            children={<div className={styles.contactActionIconButtonOverlay} />}
            tooltipPopperSx={{
              "& .MuiTooltip-tooltip": {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                fontSize: "13px",
              },
            }}
            onClick={(event) => handleActionIconButtonClick("send_email", event)}
          />

          {/* Schedule event */}
          <ActionIconButton
            iconName="calendar_today"
            title="Schedule event (opens a new tab)"
            tooltipPlacement="top"
            color="#041d35"
            iconType="filled"
            sx={{
              backgroundColor: "#c2e7ff",
              position: "relative",
              overflow: "hidden",
              width: 40,
              height: 40,
              "&:hover": {
                backgroundColor: "#c2e7ff",
              },
            }}
            className={styles.contactActionIconButton}
            children={<div className={styles.contactActionIconButtonOverlay} />}
            tooltipPopperSx={{
              "& .MuiTooltip-tooltip": {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                fontSize: "13px",
              },
            }}
            data-available={false}
          />

          {/* Send message */}
          <ActionIconButton
            iconName="chat_bubble"
            title="Send message (opens a new tab)"
            tooltipPlacement="top"
            color="#041d35"
            sx={{
              backgroundColor: "#c2e7ff",
              position: "relative",
              overflow: "hidden",
              width: 40,
              height: 40,
              "&:hover": {
                backgroundColor: "#c2e7ff",
              },
              "&:disabled": {
                backgroundColor: "#e7e7e7",
              },
            }}
            className={styles.contactActionIconButton}
            children={<div className={styles.contactActionIconButtonOverlay} />}
            tooltipPopperSx={{
              "& .MuiTooltip-tooltip": {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                fontSize: "13px",
              },
            }}
            data-available={false}
            disabled={contact?.isLoggedInUser || !contact?.isSaved}
          />

          {/* Start video call */}
          <ActionIconButton
            iconName="videocam"
            title="Start video call (opens a new tab)"
            tooltipPlacement="top-start"
            color="#041d35"
            sx={{
              backgroundColor: "#c2e7ff",
              position: "relative",
              overflow: "hidden",
              width: 40,
              height: 40,
              "&:hover": {
                backgroundColor: "#c2e7ff",
              },
              "&:disabled": {
                backgroundColor: "#e7e7e7",
              },
            }}
            className={styles.contactActionIconButton}
            children={<div className={styles.contactActionIconButtonOverlay} />}
            tooltipPopperSx={{
              "& .MuiTooltip-tooltip": {
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                fontSize: "13px",
              },
            }}
            data-available={false}
            disabled={contact?.isLoggedInUser}
          />
        </Box>

        {/* Labels section */}
        {contact?.labels && contact.labels.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
              {contact.labels.map((label, index) => (
                <Tooltip
                  key={`label-${index}`}
                  title={label}
                  placement="top"
                  slotProps={{
                    popper: {
                      sx: {
                        "& .MuiTooltip-tooltip": {
                          backgroundColor: "rgba(0, 0, 0, 0.9)",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: 200,
                        },
                      },
                    },
                  }}
                >
                  <RouterLink
                    sx={{ textDecoration: "none" }}
                    to={`/contacts/label/${getLabelId(label)}`}
                    target="_blank"
                  >
                    <Chip
                      label={label}
                      size="small"
                      icon={
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                          label
                        </span>
                      }
                      sx={{
                        backgroundColor: "transparent",
                        color: "rgba(0, 0, 0, .87)",
                        border: "1px solid #c4c7c5",
                        height: "28px",
                        px: "4px",
                        "& .MuiChip-label": {
                          maxWidth: "92px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "0.6875rem",
                          fontWeight: 500,
                        },
                        borderRadius: "8px",
                        "& .MuiChip-icon": {
                          color: "#1f1f1f",
                          fontSize: "18px",
                        },
                        "&:hover": {
                          cursor: "pointer",
                          backgroundColor: "rgba(31, 31, 31, 0.08)",
                        },
                      }}
                    />
                  </RouterLink>
                </Tooltip>
              ))}
            </Box>
          </Box>
        )}

        {/* Contact details section */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            mt: 3,
            backgroundColor: "#f0f4f9",
            p: 2,
            borderRadius: "16px",
          }}
        >
          <Typography variant="h6" sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#313233" }}>
            Contact details
          </Typography>

          {/* Email section */}
          <ContactDetailRow
            icon="mail"
            items={contact?.emails || []}
            emptyText="Add email"
            onItemClick={(item) => handleOpenComposeEmail(item.value)}
            onAddClick={handleEditClick}
            itemType="email"
          />

          {/* Phone section */}
          <ContactDetailRow
            icon="phone"
            items={contact?.phones || []}
            emptyText="Add phone number"
            onAddClick={handleEditClick}
            itemType="phone"
          />

          {/* Address section */}
          <ContactDetailRow
            icon="location_on"
            items={contact?.addresses || []}
            onAddClick={handleEditClick}
            itemType="address"
          />
        </Box>

        {/* Links section */}
        {contact?.websites && contact.websites.length > 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              mt: 2,
              backgroundColor: "#f0f4f9",
              py: 2,
              px: 1,
              borderRadius: "16px",
            }}
          >
            <Typography variant="h6" sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#313233", mb: "2px", mx: 1 }}>
              Links
            </Typography>

            {contact.websites.map((website, index) => (
              <Tooltip
                key={`website-${index}`}
                title="From your MailG Contacts"
                placement="top"
                slotProps={{
                  popper: {
                    sx: {
                      "& .MuiTooltip-tooltip": {
                        maxWidth: "200px",
                        fontSize: "12px",
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        fontWeight: 200,
                      },
                    },
                  },
                }}
              >
                <Button
                  variant="text"
                  onClick={() => openWebsite(website.value)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 1,
                    py: 0.5,
                    minHeight: "30px",
                    justifyContent: "flex-start",
                    textTransform: "none",
                    color: "#313233",
                    "&:hover": {
                      backgroundColor: "rgba(0, 0, 0, 0.08)",
                    },
                  }}
                >
                  {/* Link icon */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 20,
                      height: 20,
                      flexShrink: 0,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "20px",
                        color: "#444746",
                      }}
                    >
                      link
                    </span>
                  </Box>

                  {/* Link label or URL */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: "14px",
                        color: "#313233",
                        fontWeight: 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        width: "100%",
                        textAlign: "left",
                      }}
                    >
                      {website.label || website.value}
                    </Typography>
                  </Box>
                </Button>
              </Tooltip>
            ))}
          </Box>
        )}

        {/* About section */}
        {aboutItems.length > 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              mt: 2,
              backgroundColor: "#f0f4f9",
              p: 2,
              borderRadius: "16px",
            }}
          >
            <Typography variant="h6" sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#313233" }}>
              About
            </Typography>

            {visibleAboutItems.map((item, index) => (
              <Box key={`about-${item.type}-${index}`}>
                {item.type === "birthday" && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                    }}
                  >
                    {/* Cake icon */}
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: "20px",
                          color: "#444746",
                        }}
                      >
                        {item.icon}
                      </span>
                    </Box>

                    {/* Birthday content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      {item.hasContent ? (
                        <Tooltip
                          title="From your MailG Contacts"
                          placement="top"
                          slotProps={{
                            popper: {
                              sx: {
                                "& .MuiTooltip-tooltip": {
                                  maxWidth: "200px",
                                  fontSize: "12px",
                                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                                  fontWeight: 200,
                                },
                              },
                            },
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.875rem",
                              color: "rgba(0, 0, 0, .87)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              height: "20px",
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {item.content}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            cursor: "pointer",
                            height: "20px",
                          }}
                          onClick={handleEditClick}
                        >
                          <Typography
                            sx={{
                              fontSize: "0.875rem",
                              color: "#0b57d0",
                              fontWeight: 400,
                            }}
                          >
                            Add birthday
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                )}

                {item.type === "relatedPersons" && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                    }}
                  >
                    {/* Group work icon */}
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: "20px",
                          color: "#444746",
                        }}
                      >
                        {item.icon}
                      </span>
                    </Box>

                    {/* Related persons content */}
                    <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 0.5 }}>
                      {item.content.map((person, personIndex) => (
                        <Typography
                          sx={{
                            fontSize: "0.875rem",
                            color: "rgba(0, 0, 0, .87)",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Tooltip
                            key={`person-${personIndex}`}
                            title="From your MailG Contacts"
                            placement="top"
                            slotProps={{
                              popper: {
                                sx: {
                                  "& .MuiTooltip-tooltip": {
                                    maxWidth: "200px",
                                    fontSize: "12px",
                                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                                    fontWeight: 200,
                                  },
                                },
                              },
                            }}
                          >
                            <span style={{ marginRight: "4px" }}>{person.value}</span>
                          </Tooltip>
                          {person.label && (
                            <span style={{ fontSize: "0.75rem", color: "#444746" }}>• {person.label}</span>
                          )}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}

                {item.type === "customFields" && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                    }}
                  >
                    {/* View agenda icon */}
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: "20px",
                          color: "#444746",
                        }}
                      >
                        {item.icon}
                      </span>
                    </Box>

                    {/* Custom fields content */}
                    <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 1 }}>
                      {item.content.map((field, fieldIndex) => (
                        <Typography
                          sx={{
                            fontSize: "0.875rem",
                            color: "rgba(0, 0, 0, .87)",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Tooltip
                            key={`field-${fieldIndex}`}
                            title="From your MailG Contacts"
                            placement="top"
                            slotProps={{
                              popper: {
                                sx: {
                                  "& .MuiTooltip-tooltip": {
                                    maxWidth: "200px",
                                    fontSize: "12px",
                                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                                    fontWeight: 200,
                                  },
                                },
                              },
                            }}
                          >
                            <span style={{ marginRight: "4px" }}>{field.value}</span>
                          </Tooltip>
                          {field.label && (
                            <span style={{ fontSize: "0.75rem", color: "#444746" }}>• {field.label}</span>
                          )}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}

                {item.type === "notes" && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.5,
                    }}
                  >
                    {/* Draft icon */}
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <span
                        className="material-symbols-outlined"
                        style={{
                          fontSize: "20px",
                          color: "#444746",
                          transform: "scaleX(-1) rotate(-90deg)",
                        }}
                      >
                        {item.icon}
                      </span>
                    </Box>

                    {/* Notes content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Tooltip
                        title="From your MailG Contacts"
                        placement="top"
                        slotProps={{
                          popper: {
                            sx: {
                              "& .MuiTooltip-tooltip": {
                                maxWidth: "200px",
                                fontSize: "12px",
                                backgroundColor: "rgba(0, 0, 0, 0.8)",
                                fontWeight: 200,
                              },
                            },
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: "14px",
                            color: "#313233",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          {item.content}
                        </Typography>
                      </Tooltip>
                    </Box>
                  </Box>
                )}
              </Box>
            ))}

            {/* More/Less button for About section */}
            {aboutItems.length > 3 && (
              <Button
                variant="text"
                onClick={() => setShowAllAboutItems(!showAllAboutItems)}
                sx={{
                  textTransform: "none",
                  color: "#0b57d0",
                  fontSize: "14px",
                  fontWeight: 400,
                  px: 0.5,
                  py: 0,
                  mt: 0.5,
                  borderRadius: "50px",
                  alignSelf: "flex-start",
                  "&:hover": {
                    backgroundColor: "rgba(11, 87, 208, 0.08)",
                  },
                }}
              >
                {showAllAboutItems ? "Less" : "More"}
              </Button>
            )}
          </Box>
        )}

        {/* Recent interactions section */}
        {recentEmails.length > 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              mt: 2,
              backgroundColor: "#f0f4f9",
              py: 2,
              px: 1,
              borderRadius: "16px",
            }}
          >
            <Typography variant="h6" sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#313233", mb: "2px", mx: 1 }}>
              Recent interactions
            </Typography>

            {(showAllEmails ? recentEmails : recentEmails.slice(0, 3)).map((email) => (
              <Tooltip
                key={email.id}
                title={email.subject || "No subject"}
                placement="top"
                slotProps={{
                  popper: {
                    sx: {
                      "& .MuiTooltip-tooltip": {
                        maxWidth: "200px",
                        fontSize: "12px",
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        fontWeight: 200,
                      },
                    },
                  },
                }}
              >
                <Button
                  variant="text"
                  onClick={() => navigateToEmailDetails(email)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    minHeight: "40px",
                    justifyContent: "flex-start",
                    textTransform: "none",
                    color: "#313233",
                    height: "55px",
                    "&:hover": {
                      backgroundColor:
                        email?.subject && email?.subject !== "(no subject)"
                          ? "rgba(0, 0, 0, 0.08)"
                          : "rgba(11, 87, 208, 0.08)",
                    },
                  }}
                >
                  {/* Email icon */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 20,
                      height: 20,
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src="/favicon.svg"
                      alt="Email"
                      style={{
                        width: "16px",
                        height: "16px",
                      }}
                    />
                  </Box>

                  {/* Subject and date */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {email?.subject && email?.subject !== "(no subject)" && (
                      <Typography
                        sx={{
                          fontSize: "14px",
                          color: "#313233",
                          fontWeight: 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          width: "100%",
                          textAlign: "left",
                        }}
                      >
                        {email.subject}
                      </Typography>
                    )}
                    <Typography
                      sx={{
                        fontSize: "12px",
                        color: "#5f6368",
                        fontWeight: 400,
                      }}
                    >
                      {formatRecentDate(email.timestamp)}
                    </Typography>
                  </Box>
                </Button>
              </Tooltip>
            ))}

            {/* More/Less button */}
            {recentEmails.length > 3 && (
              <Button
                variant="text"
                onClick={() => setShowAllEmails(!showAllEmails)}
                sx={{
                  textTransform: "none",
                  color: "#0b57d0",
                  fontSize: "14px",
                  fontWeight: 400,
                  px: 0.5,
                  py: 0,
                  mt: 0.5,
                  borderRadius: "50px",
                  alignSelf: "flex-start",
                  "&:hover": {
                    backgroundColor: "rgba(11, 87, 208, 0.08)",
                  },
                }}
              >
                {showAllEmails ? "Less" : "More"}
              </Button>
            )}
          </Box>
        )}

        <p className={styles.sendFeedbackBtn} data-available={false}>
          Send feedback
        </p>
      </Box>

      {(contact?.isCustomContact || !contact?.isSaved || contact?.isLoggedInUser) && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 0.5,
            position: "absolute",
            bottom: 0,
            backgroundColor: "#fff",
            left: 0,
            right: 0,
            p: 2,
            borderTop: "1px solid #f1f3f4",
          }}
        >
          {/* Save contact button */}
          <Button
            variant="contained"
            onClick={contact?.isLoggedInUser ? handleEdit : handleSaveContact}
            sx={{
              backgroundColor: "#fff",
              color: "#0b57d0",
              border: "1px solid #747775",
              textTransform: "none",
              fontWeight: 500,
              fontSize: "0.875rem",
              borderRadius: "50px",
              width: "100%",
              boxShadow: "none",
              "&:hover": {
                backgroundColor: "rgba(11, 87, 208, 0.08)",
                boxShadow: "none",
              },
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", marginRight: "6px" }}>
              {contact?.isLoggedInUser ? "edit" : "person_add"}
            </span>
            {contact?.isLoggedInUser ? "Edit your info" : "Save contact"}
          </Button>

          {/* Info icon */}
          {!contact?.isLoggedInUser && (
            <Tooltip
              title={
                <Box sx={{ p: 2, maxWidth: 280 }}>
                  <Typography sx={{ fontSize: "14px", color: "rgba(0, 0, 0, 0.67)", mb: 1, fontWeight: 400 }}>
                    Contacts saved to{" "}
                    <Link
                      href="https://mailg.contacts.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: "#0b57d0",
                        textDecoration: "none",
                        "&:hover": {
                          textDecoration: "none",
                        },
                      }}
                    >
                      mailg.contacts.com
                    </Link>{" "}
                    will be available across MailG services anywhere you're signed in.
                  </Typography>
                  <Link
                    href=""
                    sx={{
                      color: "#0b57d0",
                      fontSize: "14px",
                      textDecoration: "none",
                      "&:hover": {
                        textDecoration: "underline",
                      },
                    }}
                  >
                    Learn more
                  </Link>
                </Box>
              }
              placement="top-start"
              slotProps={{
                popper: {
                  sx: {
                    "& .MuiTooltip-tooltip": {
                      backgroundColor: "#f0f4f9",
                      color: "#5f6368",
                      border: "1px solid #dadce0",
                      borderRadius: "12px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                      fontSize: "14px",
                      maxWidth: "280px",
                      padding: 0,
                    },
                  },
                },
              }}
            >
              <IconButton size="small" sx={{ color: "#444746" }}>
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  info
                </span>
              </IconButton>
            </Tooltip>
          )}
        </Box>
      )}

      {/* Email Selection Menu */}
      <Menu
        anchorEl={emailMenuAnchor}
        open={Boolean(emailMenuAnchor)}
        onClose={() => setEmailMenuAnchor(null)}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        sx={{
          "& .MuiPaper-root": {
            minWidth: 200,
            mt: 1,
            backgroundColor: "#f0f4f9",
            boxShadow: "0 4px 8px rgba(0, 0, 0, 0.25)",
          },
        }}
      >
        {contact?.emails?.map((email, index) => (
          <MenuItem
            key={`email-${index}-${email.value}`}
            onClick={() => handleEmailSelect(email.value)}
            sx={{
              padding: "12px 15px",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.08)",
              },
            }}
          >
            <ListItemText
              primary={email.value || email}
              slotProps={{ primary: { fontSize: "14px", fontWeight: "500", color: "#313233" } }}
            />
          </MenuItem>
        ))}
      </Menu>

      {/* Delete Confirmation Modal */}
      <ScopedInfoModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete from contacts?"
        description="This contact will be permanently deleted from this account after 30 days."
        primaryButtonText="Move to trash"
        secondaryButtonText="Cancel"
        onPrimaryAction={handleConfirmDelete}
      />
    </Box>
  );
};

export default ContactDetails;
