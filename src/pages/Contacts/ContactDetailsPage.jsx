import React, { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Avatar,
  Typography,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { format, isThisYear, isToday, isYesterday, isThisWeek, isThisYear as isCurrentYear } from "date-fns";
import {
  ActionIconButton,
  LabelsDropdown,
  ContactDetailRow,
} from "../../components/RightSidebarTabs/ContactsTab/ContactComponents";
import InfoModal from "../../components/ComposeEmail/InfoModal";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { generateAvatarColor, getFormattedWebsiteURL } from "../../utils/helperFunctions";
import styles from "./ContactDetails.module.css";

// Snackbar style for this screen
const snackbarStyle = {
  left: "50% !important",
  transform: "translateX(-50%) !important",
  "& .MuiSnackbarContent-root": {
    backgroundColor: "#303030",
    color: "#fff",
    minHeight: "40px",
  },
};

const ContactDetailsPage = () => {
  console.log("ContactDetailsPage component rendering...");
  
  const navigate = useNavigate();
  const location = useLocation();
  const {
    recipients,
    recipientLabels,
    setRecipients,
    setSnackbar,
    emails,
    hiddenRecipients,
    setHiddenRecipients,
    setDeletedRecipients,
  } = useGlobalContext();
  const { contactId } = useParams();
  
  console.log("ContactDetailsPage - Got context and params");
  const [disableHeader, setDisableHeader] = useState(false);
  const [emailMenuAnchor, setEmailMenuAnchor] = useState(null);
  const [labelsMenuAnchor, setLabelsMenuAnchor] = useState(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const originalContactRef = useRef(null);

  // Timeouts reference for snackbar notifications
  const timeouts = useRef({
    labelToggle: null,
    favorite: null,
    hide: null,
    save: null,
  });

  // Original labels reference for undo functionality
  const originalLabelsRef = useRef(null);

  // Deleted contact reference for undo functionality
  const deletedContactRef = useRef({
    contact: null,
    source: null,
  });

  // Get the contact from the recipients
  const contact = [...recipients, ...hiddenRecipients].find(
    (recipient) => recipient.id?.toString() === contactId?.toString()
  );
  
  // Debug logging
  console.log("ContactDetailsPage - contactId:", contactId);
  console.log("ContactDetailsPage - recipients:", recipients);
  console.log("ContactDetailsPage - hiddenRecipients:", hiddenRecipients);
  console.log("ContactDetailsPage - contact found:", contact);
  
  const isFavorite = contact?.isFavorite;
  const isHiddenContact = contact ? hiddenRecipients.some((recipient) => recipient.id === contact.id) : false;

  const [tempLabels, setTempLabels] = useState(contact?.labels || []);
  const [showAllEmails, setShowAllEmails] = useState(false);

  // Get the label id
  const getLabelId = (label) => recipientLabels.find((l) => l.label === label)?.id;

  useEffect(() => {
    // Update the document title
    const title = contact?.name ?? contact?.email ?? "Contact";
    document.title = `${title} - MailG Contacts`;

    // Clear timeouts on unmount
    return () => {
      Object.keys(timeouts.current).forEach((key) => {
        if (timeouts.current[key]) {
          clearTimeout(timeouts.current[key]);
        }
      });
    };
  }, []);

  // Update tempLabels when contact changes
  useEffect(() => {
    setTempLabels(contact?.labels || []);
  }, [contact]);

  // Format date text (common function for birthday and significant date)
  const formatDateText = (date) => {
    if (!date || Object.keys(date).length === 0) return null;

    const { month, day, year } = date;
    const parts = [];
    if (month) parts.push(month);
    if (day) parts.push(day + (year ? "," : ""));
    if (year) parts.push(year);
    return parts.join(" ");
  };

  // Handle edit
  const handleEdit = () => {
    navigate(`/contacts/person/${contact.id}?edit=1`);
  };

  // Handle favorite toggle
  const handleFavorite = () => {
    if (!contact) return;

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    // Disable header
    setDisableHeader(true);

    timeouts.current.favorite = setTimeout(() => {
      const contactName = contact?.name ?? contact?.email ?? "contact";

      // Update the recipients array
      // If the contact is not saved when adding to favorites, then save it
      setRecipients((prev) =>
        prev.map((recipient) =>
          recipient.id === contact.id
            ? {
                ...recipient,
                isFavorite: !isFavorite,
                isSaved: !isFavorite ? true : recipient?.isSaved,
                updatedAt: new Date().toISOString(),
                savedAt: recipient?.savedAt ?? new Date().toISOString(),
              }
            : recipient
        )
      );

      // Enable header
      setDisableHeader(false);

      // Display snackbar notification
      setSnackbar({
        open: true,
        message: isFavorite ? `Removed ${contactName} from favorites` : `Added ${contactName} to favorites`,
        action: null,
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
      });
    }, 500);
  };

  // Handle back
  const handleBackClick = () => {
    // If back navigation is not available, navigate to contacts list
    if (location.key === "default" || location.state?.from === "create") {
      navigate("/contacts", { replace: true });
    } else {
      navigate(-1);
    }
  };

  // Open compose email with the selected email
  const handleOpenComposeEmail = (email) => {
    // Navigate to the compose url with the email in the to field
    window.open(`/inbox?compose=new&to=${email}`, "_blank");
  };

  // Handle email selection from menu
  const handleEmailSelect = (email) => {
    handleOpenComposeEmail(email);
    setEmailMenuAnchor(null);
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

  // Handle labels menu open
  const handleLabelsMenuOpen = (event) => {
    setLabelsMenuAnchor(event.currentTarget);
    setTempLabels(contact?.labels || []);
  };

  // Handle labels menu close
  const handleLabelsMenuClose = () => {
    setLabelsMenuAnchor(null);
    setTempLabels(contact?.labels || []);
  };

  // Handle more menu open
  const handleMoreMenuOpen = (event) => {
    setMoreMenuAnchor(event.currentTarget);
  };

  // Handle more menu close
  const handleMoreMenuClose = () => {
    setMoreMenuAnchor(null);
  };

  // Handle undo hide contact
  const handleUndoHideContact = () => {
    if (!contact) return;

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    timeouts.current.hide = setTimeout(() => {
      // Check if contact has labels
      const hasLabels = contact.labels && contact.labels.length > 0;

      if (hasLabels) {
        // If contact has labels, move it back from hiddenRecipients to recipients
        setRecipients((prev) => [
          ...prev,
          { ...contact, updatedAt: new Date().toISOString(), isSaved: true, savedAt: new Date().toISOString() },
        ]);

        // Remove the contact from the hidden recipients array
        setHiddenRecipients((prev) => prev.filter((hiddenRecipient) => hiddenRecipient.id !== contact.id));
      } else {
        // If contact has no labels, just set isSaved back to true in recipients
        setRecipients((prev) =>
          prev.map((recipient) =>
            recipient.id === contact.id
              ? {
                  ...recipient,
                  isSaved: true,
                  updatedAt: new Date().toISOString(),
                  savedAt: recipient.savedAt || new Date().toISOString(),
                }
              : recipient
          )
        );
      }

      // Display success snackbar notification
      setSnackbar({
        open: true,
        message: "Undone",
        action: null,
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
      });
    }, 500);
  };

  // Hide contact
  const hideContact = () => {
    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    timeouts.current.hide = setTimeout(() => {
      // Check if contact has labels
      const hasLabels = contact.labels && contact.labels.length > 0;

      if (hasLabels) {
        // If contact has labels, move to hiddenRecipients
        setHiddenRecipients((prev) => [
          ...prev,
          { ...contact, updatedAt: new Date().toISOString(), isSaved: false, savedAt: null },
        ]);

        // Remove the contact from the recipients array
        setRecipients((prev) => prev.filter((recipient) => recipient.id !== contact.id));
      } else {
        // If contact has no labels, just set isSaved to false in recipients
        setRecipients((prev) =>
          prev.map((recipient) =>
            recipient.id === contact.id
              ? {
                  ...recipient,
                  isSaved: false,
                  updatedAt: new Date().toISOString(),
                  savedAt: null,
                }
              : recipient
          )
        );
      }

      // Display success snackbar notification with undo buton
      setSnackbar({
        open: true,
        message: `${contact.name ?? contact.email ?? "Contact"} has been hidden from your contacts list`,
        action: (
          <Button
            variant="text"
            size="medium"
            onClick={handleUndoHideContact}
            sx={{ textTransform: "capitalize", color: "#a8c7fa", fontWeight: 400 }}
          >
            Undo
          </Button>
        ),
        autoHideDuration: 3000,
        hideClose: false,
        style: snackbarStyle,
        closeIconColor: "#fff",
      });
    }, 500);
  };

  // Handle save contact
  const handleSaveContact = () => {
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

    // Check if the contact is in recipients array
    const isContactInRecipients = recipients.some((recipient) => recipient.id === contact.id);

    // Check if the contact is in hidden recipients array
    const isContactInHiddenRecipients = hiddenRecipients.some((recipient) => recipient.id === contact.id);

    timeouts.current.save = setTimeout(() => {
      // Set isSaved to true in the recipients array for the contact if the contact is in recipients array
      if (isContactInRecipients) {
        setRecipients((prev) =>
          prev.map((recipient) =>
            recipient.id === contact.id
              ? { ...recipient, isSaved: true, updatedAt: new Date().toISOString(), savedAt: new Date().toISOString() }
              : recipient
          )
        );
      } else if (isContactInHiddenRecipients) {
        // Add the contact to the recipients array
        setRecipients((prev) => [
          ...prev,
          { ...contact, isSaved: true, updatedAt: new Date().toISOString(), savedAt: new Date().toISOString() },
        ]);

        // Remove the contact from the hidden recipients array
        setHiddenRecipients((prev) => prev.filter((hiddenRecipient) => hiddenRecipient.id !== contact.id));
      }

      // Display snackbar notification indicating contact saved
      setSnackbar({
        open: true,
        message: `Added ${contact.name ?? contact.email ?? "Contact"} to contacts`,
        action: null,
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
      });

      // Enable the header
      setDisableHeader(false);
    }, 500);
  };

  // Handle delete contact
  const handleDelete = () => {
    // Check if the contact is in recipients array
    const isContactInRecipients = recipients.some((recipient) => recipient.id === contact.id);

    // Store the contact for undo functionality
    deletedContactRef.current = {
      contact: { ...contact },
      source: isContactInRecipients ? "recipients" : "hiddenRecipients",
    };

    // Add contact to deleted recipients
    setDeletedRecipients((prev) => [...prev, { ...contact, updatedAt: new Date().toISOString() }]);

    // Remove contact from recipients if it exists there
    if (isContactInRecipients) setRecipients((prev) => prev.filter((recipient) => recipient.id !== contact.id));

    // Remove contact from hidden recipients if it exists there
    if (!isContactInRecipients)
      setHiddenRecipients((prev) => prev.filter((hiddenRecipient) => hiddenRecipient.id !== contact.id));

    // Navigate back
    handleBackClick();

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "1 contact deleted",
      action: (
        <Button
          variant="text"
          size="medium"
          onClick={handleUndoDelete}
          sx={{ textTransform: "capitalize", color: "#a8c7fa", fontWeight: 400, borderRadius: "50px" }}
        >
          Undo
        </Button>
      ),
      autoHideDuration: 5000,
      hideClose: false,
      style: snackbarStyle,
      closeIconColor: "#fff",
    });
  };

  // Handle undo delete
  const handleUndoDelete = () => {
    if (deletedContactRef.current.contact) {
      // Add back to the source array
      if (deletedContactRef.current.source === "recipients") {
        setRecipients((prev) => [
          ...prev,
          { ...deletedContactRef.current.contact, updatedAt: new Date().toISOString() },
        ]);
      } else if (deletedContactRef.current.source === "hiddenRecipients") {
        setHiddenRecipients((prev) => [
          ...prev,
          { ...deletedContactRef.current.contact, updatedAt: new Date().toISOString() },
        ]);
      }

      // Remove from deleted recipients
      setDeletedRecipients((prev) => prev.filter((recipient) => recipient.id !== deletedContactRef.current.contact.id));

      // Display snackbar notification
      setSnackbar({
        open: true,
        message: "Undone",
        action: null,
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
      });
    }
  };

  // Handle more menu actions
  const handleMoreMenuAction = (action) => {
    switch (action) {
      case "print":
        // TODO: Implement print functionality
        console.log("Print contact");
        break;
      case "export":
        // TODO: Implement export functionality
        console.log("Export contact");
        break;
      case "hide":
        hideContact();
        break;
      case "report":
        // TODO: Implement report profile content functionality
        console.log("Report profile content");
        break;
      case "delete":
        setShowDeleteModal(true);
        break;
      default:
        break;
    }
    handleMoreMenuClose();
  };

  // Handle label toggle in dropdown
  const handleLabelToggle = (labelName) => {
    setTempLabels((prev) =>
      prev.includes(labelName) ? prev.filter((label) => label !== labelName) : [...prev, labelName]
    );
  };

  // Handle undo label changes
  const handleUndoLabelChanges = () => {
    if (!originalContactRef.current?.contact) return;

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    timeouts.current.labelToggle = setTimeout(() => {
      const originalContact = originalContactRef.current?.contact;
      const wasHidden = originalContactRef.current?.isHidden;

      if (wasHidden) {
        // If contact was originally hidden, move it back to hiddenRecipients
        setHiddenRecipients((prev) => [...prev, { ...originalContact, updatedAt: new Date().toISOString() }]);

        // Remove the contact from the recipients array
        setRecipients((prev) => prev.filter((recipient) => recipient.id !== originalContact.id));
      } else {
        // If contact was in recipients, restore original state
        setRecipients((prev) =>
          prev.map((recipient) =>
            recipient.id === originalContact.id
              ? {
                  ...originalContact,
                  updatedAt: new Date().toISOString(),
                }
              : recipient
          )
        );
      }

      // Update tempLabels to match original
      setTempLabels(originalContact.labels || []);

      // Clear the original contact ref
      originalContactRef.current = null;

      // Display success snackbar notification
      setSnackbar({
        open: true,
        message: "Undone",
        action: null,
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
      });
    }, 500);
  };

  // Generate success message based on label changes
  const generateSuccessMessage = (originalLabels, newLabels, contactName) => {
    const addedLabels = newLabels.filter((label) => !originalLabels.includes(label));
    const removedLabels = originalLabels.filter((label) => !newLabels.includes(label));

    if (addedLabels.length === 1 && removedLabels.length === 0) {
      return `${contactName} labeled ${addedLabels[0]}`;
    }

    if (addedLabels.length === 0 && removedLabels.length === 1) {
      return `${contactName} has been removed from ${removedLabels[0]}`;
    }

    if (addedLabels.length === 1 && removedLabels.length === 1) {
      return `${contactName} has been added to ${addedLabels[0]} and removed from ${removedLabels[0]}`;
    }

    if (addedLabels.length > 1 && removedLabels.length === 0) {
      return `${contactName} has been added to ${addedLabels.length} labels`;
    }

    if (addedLabels.length === 0 && removedLabels.length > 1) {
      return `${contactName} has been removed from ${removedLabels.length} labels`;
    }

    if (addedLabels.length > 1 && removedLabels.length > 1) {
      return `${contactName} has been added to ${addedLabels.length} labels and removed from ${removedLabels.length} labels`;
    }

    return `${contactName} labels updated`;
  };

  // Handle apply labels
  const handleApplyLabels = () => {
    if (!contact) return;

    // Store original contact state and hidden status for undo functionality
    originalContactRef.current = { contact: { ...contact }, isHidden: isHiddenContact };
    const originalLabels = [...(contact.labels || [])];
    const contactName = contact.name ?? contact.email ?? "Contact";

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    timeouts.current.labelToggle = setTimeout(() => {
      // Generate date string
      const dateString = new Date().toISOString();

      if (isHiddenContact) {
        // Contact is in hiddenRecipients, move to recipients with isSaved: true
        setRecipients((prev) => [
          ...prev,
          { ...contact, isSaved: true, updatedAt: dateString, savedAt: dateString, labels: tempLabels },
        ]);
        setHiddenRecipients((prev) => prev.filter((hiddenRecipient) => hiddenRecipient.id !== contact.id));
      } else {
        // Update the contact in the recipients array
        setRecipients((prev) =>
          prev.map((recipient) =>
            recipient.id === contact.id
              ? {
                  ...recipient,
                  isSaved: true,
                  savedAt: contact.savedAt || dateString,
                  updatedAt: dateString,
                  labels: tempLabels,
                }
              : recipient
          )
        );
      }

      // Generate specific success message
      const successMessage = generateSuccessMessage(originalLabels, tempLabels, contactName);

      // Display success snackbar notification with undo
      setSnackbar({
        open: true,
        message: successMessage,
        action: (
          <Button
            variant="text"
            size="medium"
            onClick={handleUndoLabelChanges}
            sx={{ textTransform: "capitalize", color: "#a8c7fa", fontWeight: 400 }}
          >
            Undo
          </Button>
        ),
        autoHideDuration: 3000,
        hideClose: false,
        style: snackbarStyle,
        closeIconColor: "#fff",
      });

      setLabelsMenuAnchor(null);
    }, 500);
  };

  // Check if labels have changed
  const hasLabelsChanged = () => {
    return JSON.stringify((contact?.labels || []).sort()) !== JSON.stringify(tempLabels.sort());
  };

  // Open website in new tab
  const openWebsite = (website) => {
    // Format website URL
    let formattedWebsiteUrl = getFormattedWebsiteURL(website);

    // Open website in new tab
    window.open(formattedWebsiteUrl, "_blank");
  };

  // Filter emails where contact appears in to, cc, bcc or from field
  const getRecentEmails = () => {
    if (!contact?.emails || !emails) return [];

    const contactEmails = contact.emails.map((email) => email.value);

    return emails
      .filter((email) => {
        // Don't include draft emails or empty label emails
        if (email.labels?.includes("Drafts") || email?.labels?.length === 0) return false;

        // Check if contact email appears in to, cc, or bcc
        const toEmails = Array.isArray(email.to) ? email.to : [email.to].filter(Boolean);
        const ccEmails = Array.isArray(email.cc) ? email.cc : [email.cc].filter(Boolean);
        const bccEmails = Array.isArray(email.bcc) ? email.bcc : [email.bcc].filter(Boolean);

        // Get the from email
        const fromEmail = email.from.email;

        const allRecipients = [...toEmails, ...ccEmails, ...bccEmails, fromEmail];
        return allRecipients.some((recipient) => contactEmails.includes(recipient));
      })
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  // Format date for recent interactions
  const formatRecentDate = (timestamp) => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "";
    }

    // If it's current year, show "Sep 12" format
    if (isThisYear(date)) {
      return format(date, "MMM d");
    }

    // If it's previous year, show "Sep 2024" format
    return format(date, "MMM yyyy");
  };

  // Format date for history section
  const formatHistoryDate = (timestamp) => {
    if (!timestamp) return "";
    
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "";
    }

    // If it's today, show "Today, 12:18 AM" format
    if (isToday(date)) {
      return `Today, ${format(date, "h:mm a")}`;
    }

    // If it's yesterday, show "Yesterday, 12:18 AM" format
    if (isYesterday(date)) {
      return `Yesterday, ${format(date, "h:mm a")}`;
    }

    // If it's this week, show "Mon, 12:18 AM" format
    if (isThisWeek(date)) {
      return format(date, "EEE, h:mm a");
    }

    // If it's this year, show "Sep 26" format
    if (isCurrentYear(date)) {
      return format(date, "MMM d");
    }

    // If it's previous year, show "Sep 26, 2023" format
    return format(date, "MMM d, yyyy");
  };

  // Navigate to email details
  const navigateToEmailDetails = (email) => {
    const threadId = email.threadId.split(":")[1];

    let url = "";
    if (email.labels.includes("Inbox")) {
      url = `/inbox/${threadId}`;
    } else if (email.labels.includes("Sent")) {
      url = `/sent/${threadId}`;
    } else if (email.labels.length > 0) {
      url = `/label/${email.labels[0]}/${threadId}`;
    }

    // Open url in new tab
    window.open(url, "_blank");
  };

  // Get recent emails
  const recentEmails = getRecentEmails();

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        margin: "16px 16px 16px 20px",
        borderRadius: "24px",
        width: "100%",
        height: "calc(100vh - 98px)",
        overflowY: "auto",
        position: "relative",
      }}
    >
      {contact ? (
        <>
          <Box className={styles.contentContainer}>
            {/* Header */}
            <Box className={styles.contactDetailsHeader}>
              {/* Back */}
              <ActionIconButton
                iconName="arrow_back"
                title="Back"
                onClick={handleBackClick}
                disabled={disableHeader}
                tooltipPlacement="top"
              />

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
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
                  tooltipPlacement="top"
                />

                {/* Edit */}
                <Button
                  variant="contained"
                  sx={{
                    textTransform: "none",
                    px: 3,
                    borderRadius: "50px",
                    fontSize: "0.875rem",
                    fontWeight: 400,
                    py: "7px",
                    backgroundColor: "#0b57d0",
                    "&:hover": {
                      opacity: 0.9,
                    },
                  }}
                  onClick={handleEdit}
                >
                  Edit
                </Button>

                {/* Save contact button - only show if contact is not saved */}
                {!contact?.isSaved && (
                  <Button
                    variant="contained"
                    onClick={handleSaveContact}
                    disableElevation={true}
                    sx={{
                      backgroundColor: "#fff",
                      color: "#0b57d0",
                      border: "1px solid #747775",
                      textTransform: "none",
                      fontWeight: 400,
                      fontSize: "0.875rem",
                      borderRadius: "60px",
                      px: 2,
                      py: "7px",
                      ml: 1,
                      boxShadow: "none",
                      "&:hover": {
                        backgroundColor: "rgba(11, 87, 208, 0.08)",
                        boxShadow: "none",
                      },
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", marginRight: "8px" }}>
                      person_add
                    </span>
                    Save contact
                  </Button>
                )}

                {/* Delete button */}
                {contact?.isSaved && (
                  <Tooltip
                    placement="top"
                    title="Delete"
                    slotProps={{
                      popper: {
                        sx: {
                          "& .MuiTooltip-tooltip": {
                            backgroundColor: "rgba(0, 0, 0, 0.8)",
                            color: "white",
                            fontSize: "12px",
                            fontWeight: 300,
                          },
                        },
                      },
                    }}
                  >
                    <IconButton
                      size="medium"
                      onClick={() => setShowDeleteModal(true)}
                      sx={{
                        color: "#444746",
                        width: "40px",
                        height: "40px",
                        ml: 0.5,
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.06)",
                        },
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                        delete
                      </span>
                    </IconButton>
                  </Tooltip>
                )}

                {/* More actions */}
                <Tooltip
                  placement="top"
                  title="More actions"
                  slotProps={{
                    popper: {
                      sx: {
                        "& .MuiTooltip-tooltip": {
                          backgroundColor: "rgba(0, 0, 0, 0.8)",
                          color: "white",
                          fontSize: "12px",
                          fontWeight: 300,
                        },
                      },
                    },
                  }}
                >
                  <IconButton
                    size="medium"
                    onClick={handleMoreMenuOpen}
                    sx={{
                      color: "#444746",
                      width: "40px",
                      height: "40px",
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.06)",
                      },
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                      more_vert
                    </span>
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Scrollable Content */}
            <Box sx={{ py: 2, pl: 6, mt: 9 }}>
              {/* Profile pic and name */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: generateAvatarColor(contact?.name),
                    color: "white",
                    fontSize: "72px",
                    width: "162px",
                    height: "162px",
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
                <Box sx={{ ml: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Typography variant="h6" sx={{ fontWeight: 400, fontSize: "1.75rem", lineHeight: "2.25rem" }}>
                      {contact?.name || contact?.email}
                    </Typography>
                    {contact?.isLoggedInUser && (
                      <Typography variant="h6" sx={{ fontSize: "1.75rem", fontWeight: 400, lineHeight: "2.25rem" }}>
                        (You)
                      </Typography>
                    )}
                  </Box>

                  {/* Job, department, company */}
                  {(contact?.jobTitle || contact?.department || contact?.company) && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                      {contact?.jobTitle && (
                        <>
                          <Typography
                            sx={{
                              fontSize: "1rem",
                              fontWeight: 400,
                              color: "#1f1f1f",
                            }}
                          >
                            {contact.jobTitle}
                          </Typography>
                          {(contact?.department || contact?.company) && (
                            <span
                              style={{
                                width: "4px",
                                height: "4px",
                                borderRadius: "50%",
                                backgroundColor: "#1f1f1f",
                                display: "inline-block",
                              }}
                            />
                          )}
                        </>
                      )}
                      {contact?.department && (
                        <>
                          <Typography
                            sx={{
                              fontSize: "1rem",
                              fontWeight: 400,
                              color: "#1f1f1f",
                            }}
                          >
                            {contact.department}
                          </Typography>
                          {contact?.company && (
                            <span
                              style={{
                                width: "4px",
                                height: "4px",
                                borderRadius: "50%",
                                backgroundColor: "#5f6368",
                                display: "inline-block",
                              }}
                            />
                          )}
                        </>
                      )}
                      {contact?.company && (
                        <Typography
                          sx={{
                            fontSize: "1rem",
                            fontWeight: 400,
                            color: "#1f1f1f",
                          }}
                        >
                          {contact.company}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Action icons with labels */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "left", gap: 3, mt: 3 }}>
                {/* Send email */}
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
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
                    tooltipPopperSx={{
                      "& .MuiTooltip-tooltip": {
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        fontSize: "13px",
                        fontWeight: 200,
                      },
                    }}
                    onClick={(event) => handleActionIconButtonClick("send_email", event)}
                  />
                  <Typography
                    sx={{
                      fontSize: "0.6875rem",
                      lineHeight: "1rem",
                      fontWeight: 500,
                      color: "#1f1f1f",
                    }}
                  >
                    Email
                  </Typography>
                </Box>

                {/* Schedule event */}
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
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
                    tooltipPopperSx={{
                      "& .MuiTooltip-tooltip": {
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        fontSize: "13px",
                        fontWeight: 200,
                      },
                    }}
                    data-available={false}
                  />
                  <Typography
                    sx={{
                      fontSize: "0.6875rem",
                      lineHeight: "1rem",
                      fontWeight: 500,
                      color: "#1f1f1f",
                    }}
                  >
                    Schedule
                  </Typography>
                </Box>

                {/* Send message */}
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
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
                    tooltipPopperSx={{
                      "& .MuiTooltip-tooltip": {
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        fontSize: "13px",
                        fontWeight: 200,
                      },
                    }}
                    data-available={false}
                    disabled={contact?.isLoggedInUser || !contact?.isSaved}
                  />
                  <Typography
                    sx={{
                      fontSize: "0.6875rem",
                      lineHeight: "1rem",
                      fontWeight: 500,
                      color: "#1f1f1f",
                    }}
                  >
                    Chat
                  </Typography>
                </Box>

                {/* Start video call */}
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
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
                    tooltipPopperSx={{
                      "& .MuiTooltip-tooltip": {
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        fontSize: "13px",
                        fontWeight: 200,
                      },
                    }}
                    data-available={false}
                    disabled={contact?.isLoggedInUser}
                  />
                  <Typography
                    sx={{
                      fontSize: "0.6875rem",
                      lineHeight: "1rem",
                      fontWeight: 500,
                      color: "#1f1f1f",
                    }}
                  >
                    Video
                  </Typography>
                </Box>

                {/* Horizontal line */}
                <Box sx={{ width: "100%", height: "1px", backgroundColor: "#c4c7c5", mt: "-15px" }} />
              </Box>

              {/* Labels Section - only show if recipientLabels is not empty */}
              {recipientLabels && recipientLabels.length > 0 && (
                <Box sx={{ display: "flex", alignItems: "flex-start", mt: 3, ml: "-10px" }}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%" }}>
                    {contact?.labels && contact.labels.length > 0 ? (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "flex-start",
                        }}
                      >
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
                            <Link
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
                            </Link>
                          </Tooltip>
                        ))}

                        {/* Edit button */}
                        <Tooltip
                          title="Manage labels"
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
                          <IconButton
                            size="small"
                            onClick={handleLabelsMenuOpen}
                            sx={{
                              backgroundColor: "transparent",
                              color: "#0b57d0",
                              border: "1px solid #c4c6c5",
                              "&:hover": {
                                backgroundColor: "rgba(31, 31, 31, 0.08)",
                                cursor: "pointer",
                              },
                            }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                              edit
                            </span>
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                        <Tooltip
                          title="Manage labels"
                          placement="bottom"
                          slotProps={{
                            popper: {
                              sx: {
                                "& .MuiTooltip-tooltip": {
                                  backgroundColor: "#888888",
                                  color: "white",
                                  fontSize: "10px",
                                  fontWeight: 400,
                                  borderRadius: 0,
                                },
                              },
                            },
                          }}
                        >
                          <Chip
                            label="Label"
                            size="small"
                            onClick={handleLabelsMenuOpen}
                            icon={
                              <span
                                className="material-symbols-outlined"
                                style={{ fontSize: "22px", color: "#0b57d0" }}
                              >
                                add
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
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              <Box className={styles.detailsSectionContainer}>
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
                    flex: 1,
                    minWidth: "300px",
                  }}
                >
                  <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 500, color: "#313233" }}>
                    Contact details
                  </Typography>

                  {/* Email section */}
                  <ContactDetailRow
                    icon="mail"
                    items={contact?.emails || []}
                    emptyText="Add email"
                    onItemClick={(item) => handleOpenComposeEmail(item.value)}
                    onAddClick={handleEdit}
                    itemType="email"
                    itemContainerStyle={{ justifyContent: "flex-start" }}
                    textStyle={{ fontSize: "0.875rem" }}
                    iconStyle={{ marginTop: "6px", fontSize: "21px" }}
                  />

                  {/* Phone section */}
                  <ContactDetailRow
                    icon="phone"
                    items={contact?.phones || []}
                    emptyText="Add phone number"
                    onAddClick={handleEdit}
                    itemType="phone"
                    itemContainerStyle={{ justifyContent: "flex-start" }}
                    textStyle={{ fontSize: "0.875rem" }}
                    iconStyle={{ marginTop: "6px", fontSize: "21px" }}
                  />

                  {/* Address section */}
                  <ContactDetailRow
                    icon="location_on"
                    items={contact?.addresses || []}
                    onAddClick={handleEdit}
                    itemType="address"
                    itemContainerStyle={{ justifyContent: "flex-start" }}
                    textStyle={{ fontSize: "0.875rem" }}
                    addressStringType="multi"
                    iconStyle={{ fontSize: "21px" }}
                  />

                  {/* Birthday section */}
                  <ContactDetailRow
                    icon="cake"
                    items={
                      formatDateText(contact?.birthday) !== null
                        ? [{ value: formatDateText(contact?.birthday), label: "Birthday" }]
                        : []
                    }
                    onAddClick={handleEdit}
                    itemType="birthday"
                    itemContainerStyle={{
                      justifyContent: "flex-start",
                      "&:hover": {
                        cursor: "text",
                        "& .item-text": {
                          color: "#1f1f1f",
                        },
                      },
                    }}
                    disableCopy={true}
                    hideTextTooltip={true}
                    textStyle={{ fontSize: "0.875rem" }}
                    iconStyle={{ marginTop: "4px", fontSize: "21px" }}
                    emptyText="Add birthday"
                    iconTooltip="Birthday"
                  />

                  {/* Significant date section */}
                  {contact?.significantDates?.length > 0 && (
                    <ContactDetailRow
                      icon="event"
                      iconType="filled"
                      items={
                        contact?.significantDates?.map((date) => ({
                          value: formatDateText(date),
                          label: date.label,
                        })) || []
                      }
                      onAddClick={handleEdit}
                      itemType="significantDate"
                      itemContainerStyle={{
                        justifyContent: "flex-start",
                        "&:hover": {
                          cursor: "text",
                          "& .item-text": {
                            color: "#1f1f1f",
                          },
                        },
                      }}
                      disableCopy={true}
                      hideTextTooltip={true}
                      textStyle={{ fontSize: "0.875rem" }}
                      iconStyle={{ marginTop: "4px", fontSize: "21px" }}
                      iconTooltip="Significant date"
                    />
                  )}

                  {/* Links section */}
                  {contact?.websites?.length > 0 && (
                    <ContactDetailRow
                      icon="link"
                      items={contact?.websites || []}
                      itemType="link"
                      textStyle={{ fontSize: "0.875rem" }}
                      iconStyle={{ marginTop: "6px", fontSize: "21px" }}
                      disableCopy={true}
                      hideTextTooltip={true}
                      iconTooltip="Website"
                      onTextClick={(item) => openWebsite(item.value)}
                    />
                  )}

                  {/* Related person section */}
                  {contact?.relatedPersons?.length > 0 && (
                    <ContactDetailRow
                      icon="group_work"
                      items={contact?.relatedPersons || []}
                      itemType="relatedPerson"
                      textStyle={{ fontSize: "0.875rem" }}
                      iconStyle={{ marginTop: "6px", fontSize: "21px" }}
                      disableCopy={true}
                      hideTextTooltip={true}
                      iconTooltip="Related people"
                      itemContainerStyle={{
                        justifyContent: "flex-start",
                        "&:hover": {
                          cursor: "text",
                          "& .item-text": {
                            color: "#1f1f1f",
                          },
                        },
                      }}
                    />
                  )}

                  {/* Custom field section */}
                  {contact?.customFields?.length > 0 && (
                    <ContactDetailRow
                      icon="view_agenda"
                      items={contact?.customFields || []}
                      itemType="customField"
                      textStyle={{ fontSize: "0.875rem" }}
                      iconStyle={{ marginTop: "6px", fontSize: "21px" }}
                      disableCopy={true}
                      hideTextTooltip={true}
                      iconTooltip="Custom field"
                      itemContainerStyle={{
                        justifyContent: "flex-start",
                        "&:hover": {
                          cursor: "text",
                          "& .item-text": {
                            color: "#1f1f1f",
                          },
                        },
                      }}
                    />
                  )}

                  {/* Notes section */}
                  {contact?.notes?.length > 0 && (
                    <ContactDetailRow
                      icon="draft"
                      items={[{ value: contact?.notes }]}
                      itemType="notes"
                      textStyle={{ fontSize: "0.875rem" }}
                      iconStyle={{ marginTop: "6px", transform: "scaleX(-1) rotate(-90deg)", fontSize: "21px" }}
                      disableCopy={true}
                      hideTextTooltip={true}
                      iconTooltip="Notes"
                      itemContainerStyle={{
                        justifyContent: "flex-start",
                        "&:hover": {
                          cursor: "text",
                          "& .item-text": {
                            color: "#1f1f1f",
                          },
                        },
                      }}
                    />
                  )}
                </Box>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: "300px", pt: 2 }}>
                  {/* Recent Interactions */}
                  {recentEmails.length > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        backgroundColor: "#f0f4f9",
                        py: 2,
                        px: 1,
                        borderRadius: "16px",
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{ fontSize: "0.875rem", fontWeight: 500, color: "#313233", mb: "2px", mx: 1 }}
                      >
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

                  {/* History section */}
                  {contact?.isSaved && (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        mt: 1,
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, mx: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontSize: "1rem",
                            fontWeight: 500,
                            color: "#1f1f1f",
                          }}
                        >
                          History
                        </Typography>
                        <IconButton size="small" sx={{ color: "#747775" }}>
                          <span
                            className="material-symbols-outlined"
                            style={{
                              fontSize: "20px",
                            }}
                          >
                            help
                          </span>
                        </IconButton>
                      </Box>

                      {/* Last edited */}
                      {contact?.updatedAt && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, mx: 1 }}>
                          <Typography
                            sx={{
                              fontSize: "0.875rem",
                              fontWeight: 400,
                              color: "#1f1f1f",
                            }}
                          >
                            Last edited
                          </Typography>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "#444746",
                              fontWeight: 400,
                            }}
                          >
                            • {formatHistoryDate(contact.updatedAt)}
                          </span>
                        </Box>
                      )}

                      {/* Added to contacts */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mx: 1 }}>
                        <Typography
                          sx={{
                            fontSize: "0.875rem",
                            fontWeight: 400,
                            color: "#1f1f1f",
                          }}
                        >
                          Added to contacts
                        </Typography>
                        <span
                          style={{
                            fontSize: "0.875rem",
                            color: "#444746",
                            fontWeight: 400,
                          }}
                        >
                          • {formatHistoryDate(contact.savedAt)}
                        </span>
                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>

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

          {/* Labels Dropdown Menu */}
          <LabelsDropdown
            anchorEl={labelsMenuAnchor}
            open={Boolean(labelsMenuAnchor)}
            onClose={handleLabelsMenuClose}
            recipientLabels={recipientLabels}
            tempLabels={tempLabels}
            onLabelToggle={handleLabelToggle}
            onApply={handleApplyLabels}
            hasChanged={hasLabelsChanged()}
          />

          {/* More Options Menu */}
          <Menu
            anchorEl={moreMenuAnchor}
            open={Boolean(moreMenuAnchor)}
            onClose={handleMoreMenuClose}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            sx={{
              zIndex: 30,
              mt: 1,
              ml: 3,
              "& .MuiPaper-root": {
                width: "220px",
                borderRadius: "4px",
                backgroundColor: "#f0f4f9",
                boxShadow:
                  "0px 8px 10px 1px rgba(0,0,0,.14),0px 3px 14px 2px rgba(0,0,0,.12),0px 5px 5px -3px rgba(0,0,0,.2)",
              },
              "& .MuiMenuItem-root": {
                px: 2,
                py: 1.5,
                "&:hover": {
                  backgroundColor: "rgba(0, 0, 0, 0.08)",
                },
              },
            }}
          >
            {/* Print */}
            <MenuItem onClick={() => handleMoreMenuAction("print")}>
              <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <span
                    className="material-symbols-filled"
                    style={{ fontSize: "22px", color: "#1f1f1f", fontWeight: 500 }}
                  >
                    print
                  </span>
                </ListItemIcon>
                <ListItemText
                  primary="Print"
                  slotProps={{
                    primary: {
                      color: "#1f1f1f",
                      fontSize: "14px",
                      fontWeight: 500,
                    },
                  }}
                />
              </Box>
            </MenuItem>

            {/* Export */}
            <MenuItem onClick={() => handleMoreMenuAction("export")}>
              <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "22px", color: "#1f1f1f", fontWeight: 500 }}
                  >
                    upload
                  </span>
                </ListItemIcon>
                <ListItemText
                  primary="Export"
                  slotProps={{
                    primary: {
                      color: "#1f1f1f",
                      fontSize: "14px",
                      fontWeight: 500,
                    },
                  }}
                />
              </Box>
            </MenuItem>

            {/* Delete contact */}
            {!contact?.isSaved && (
              <MenuItem onClick={() => handleMoreMenuAction("delete")}>
                <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "22px", color: "#1f1f1f", fontWeight: 500 }}
                    >
                      delete
                    </span>
                  </ListItemIcon>
                  <ListItemText
                    primary="Delete"
                    slotProps={{
                      primary: {
                        color: "#1f1f1f",
                        fontSize: "14px",
                        fontWeight: 500,
                      },
                    }}
                  />
                </Box>
              </MenuItem>
            )}

            {/* Hide from contacts */}
            {contact?.isSaved && (
              <MenuItem onClick={() => handleMoreMenuAction("hide")}>
                <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "22px", color: "#1f1f1f", fontWeight: 500 }}
                    >
                      archive
                    </span>
                  </ListItemIcon>
                  <ListItemText
                    primary="Hide from contacts"
                    slotProps={{
                      primary: {
                        color: "#1f1f1f",
                        fontSize: "14px",
                        fontWeight: 500,
                      },
                    }}
                  />
                </Box>
              </MenuItem>
            )}

            {/* Report profile content */}
            {!isHiddenContact && (
              <MenuItem onClick={() => handleMoreMenuAction("report")}>
                <Box sx={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: "22px", color: "#1f1f1f", fontWeight: 500 }}
                    >
                      flag
                    </span>
                  </ListItemIcon>
                  <ListItemText
                    primary="Report profile content"
                    slotProps={{
                      primary: {
                        color: "#1f1f1f",
                        fontSize: "14px",
                        fontWeight: 500,
                      },
                    }}
                  />
                </Box>
              </MenuItem>
            )}
          </Menu>

          {/* Delete Confirmation Modal */}
          <InfoModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            title="Delete from contacts?"
            message="This contact will be permanently deleted from this account after 30 days."
            buttons={[
              {
                text: "Cancel",
                className: "tertiary",
                onClick: () => setShowDeleteModal(false),
              },
              {
                text: "Move to trash",
                className: "tertiary",
                onClick: handleDelete,
              },
            ]}
            modalBoxStyle={{
              width: 470,
              backgroundColor: "#e9eef6",
              borderRadius: "28px",
              px: 3.5,
            }}
            titleStyle={{
              fontSize: "1.5rem",
              fontWeight: 400,
              lineHeight: "2rem",
              color: "#1f1f1f",
            }}
            messageStyle={{
              fontSize: "0.875rem",
              fontWeight: 400,
              lineHeight: "1.25rem",
              color: "#4d504e",
              mt: 2,
            }}
            buttonContainerStyle={{
              gap: 0.5,
              mt: 2.5,
            }}
            buttonStyle={{
              fontSize: "0.875rem",
              fontWeight: 400,
              textTransform: "none",
              color: "#0b57d0",
              borderRadius: "50px",
              px: 1.5,
              py: 1,
              "&:hover": {
                backgroundColor: "rgba(11, 87, 208, 0.08)",
              },
            }}
          />
        </>
      ) : (
        <Box sx={{ mt: 2, ml: 2 }}>
          <Typography variant="p" sx={{ fontSize: "1rem", fontWeight: 400, color: "#1f1f1f" }}>
            Contact not found
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ContactDetailsPage;

