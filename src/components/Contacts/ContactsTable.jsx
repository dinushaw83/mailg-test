import React, { useLayoutEffect, useRef, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
  IconButton,
  Avatar,
  Checkbox,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { generateAvatarColor } from "../../utils/helperFunctions";
import { useGlobalContext } from "../../contexts/GlobalContext";
import ManageLabelsDropdown from "./ManageLabelsDropdown";
import ExportContactsModal from "./ExportContactsModal";
import DeleteContactsModal from "./DeleteContactsModal";
import styles from "./ContactsTable.module.css";

// Snackbar style for this screen
const snackbarStyle = {
  "& .MuiSnackbarContent-root": {
    backgroundColor: "#303030",
    color: "#fff",
    minHeight: "40px",
  },
};

const ContactsTable = ({ contacts = [], hidePrintExport = false, currentLabel = null, showDeleted = false }) => {
  const { setRecipients, setSnackbar, recipientLabels, recipients } = useGlobalContext();
  
  // Filter out deleted contacts from each section (unless showDeleted is true, like in trash view)
  const filteredContacts = showDeleted ? contacts : contacts.map(section => ({
    ...section,
    data: section.data ? section.data.filter(contact => !contact.isDeleted) : []
  }));
  const navigate = useNavigate();
  const [tableHeaders, setTableHeaders] = useState([
    "Name",
    "Email",
    "Phone number",
    "Job title & company",
    "Labels",
    "Actions",
  ]);
  const tableRef = useRef(null);
  const timeoutsRef = useRef({
    favorite: null,
    labelToggle: null,
  });
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const selectedContactRef = useRef(null);
  const [checkedContacts, setCheckedContacts] = useState(new Set());
  const [manageLabelsAnchor, setManageLabelsAnchor] = useState(null);
  const [bulkMoreMenuAnchor, setBulkMoreMenuAnchor] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteActionType, setDeleteActionType] = useState(null);

  // Create set of all contact IDs from all sections (no duplicates, excluding deleted)
  const allContactsSet = new Set(filteredContacts.flatMap((section) => section.data || []).map((contact) => contact.id));

  // All possible headers with their priority (lower number = higher priority)
  const allHeaders = [
    { name: "Name", priority: 1, minWidth: 200 }, // Name is always visible
    { name: "Email", priority: 2, minWidth: 250 },
    { name: "Phone number", priority: 3, minWidth: 200 },
    { name: "Job title & company", priority: 4, minWidth: 200 },
    { name: "Labels", priority: 5, minWidth: 250 },
    { name: "Actions", priority: 1, minWidth: 120 }, // Always visible
  ];

  // Update table headers based on width before the ui is rendered
  useLayoutEffect(() => {
    const updateHeaders = () => {
      if (!tableRef.current) return;

      const availableWidth = tableRef.current.offsetWidth;

      // Always include Name and Actions
      const visibleHeaders = ["Name", "Actions"];
      let usedWidth = 200 + 120; // Name + Actions min width

      // Add other headers based on priority and available space
      const otherHeaders = allHeaders
        .filter((header) => header.name !== "Name" && header.name !== "Actions")
        .sort((a, b) => a.priority - b.priority);

      for (const header of otherHeaders) {
        if (usedWidth + header.minWidth <= availableWidth) {
          visibleHeaders.splice(-1, 0, header.name); // Insert before Actions
          usedWidth += header.minWidth;
        }
      }

      setTableHeaders(visibleHeaders);
    };

    // Initial update
    updateHeaders();

    // Update on resize
    const handleResize = () => {
      updateHeaders();
    };

    window.addEventListener("resize", handleResize);

    // Use ResizeObserver for more accurate table width changes
    let resizeObserver;
    if (tableRef.current) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(tableRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      // Clear timeouts
      Object.keys(timeoutsRef.current).forEach((key) => {
        if (timeoutsRef.current[key]) clearTimeout(timeoutsRef.current[key]);
      });
    };
  }, []);

  // Handle favorite toggle
  const handleFavorite = (contact) => {
    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    timeoutsRef.current.favorite = setTimeout(() => {
      const isFavorite = contact?.isFavorite;

      // Update the recipients array
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

      // Display snackbar notification
      setSnackbar({
        open: true,
        message: isFavorite
        ? `Removed ${contact?.name ?? contact?.email ?? "contact"} from favorites`
        : `Added ${contact?.name ?? contact?.email ?? "contact"} to favorites`,
      action: null,
      autoHideDuration: 3000,
      hideClose: true,
      anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
      style: snackbarStyle,
      });
    }, 500);
  };

  // Handle edit contact
  const handleEdit = (contact) => {
    navigate(`/contacts/person/${contact.id}?edit=1`);
  };

  // Handle save contact (restore hidden contact)
  const handleSaveContact = (contact) => {
    // Store the previous state for undo
    const previousContact = { ...contact };
    
    // Mark contact as saved (restore it)
    setRecipients((prev) =>
      prev.map((recipient) =>
        recipient.id === contact.id
          ? { ...recipient, isSaved: true }
          : recipient
      )
    );
    
    // Show snackbar with undo
    setSnackbar({
      open: true,
      message: `Added ${contact.name || contact.email || "contact"} to contacts`,
      anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
      action: (
        <Button
          variant="text"
          size="medium"
          onClick={() => {
            // Undo save
            setRecipients((prev) =>
              prev.map((recipient) =>
                recipient.id === contact.id
                  ? previousContact
                  : recipient
              )
            );
            setSnackbar({
              open: true,
              message: "Undone",
              autoHideDuration: 2000,
              hideClose: true,
              anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
              style: snackbarStyle,
            });
          }}
          sx={{ textTransform: "capitalize" }}
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

  // Handle more actions dropdown
  const handleMoreActions = (contact, title, event) => {
    console.log("handleMoreActions", contact, title, event);
    selectedContactRef.current = {
      contact,
      title,
    };
    setMoreMenuAnchor(event.currentTarget);
  };

  // Close more actions dropdown
  const handleCloseMoreMenu = () => {
    setMoreMenuAnchor(null);
    selectedContactRef.current = null;
  };

  // Handle print action
  const handlePrint = () => {
    console.log("Print contact:", selectedContactRef.current);
    handleCloseMoreMenu();
    // TODO: Implement print functionality
  };

  // Handle export action
  const handleExport = () => {
    // Don't close the menu yet, we need to preserve the selectedContactRef
    setMoreMenuAnchor(null);
    setExportModalOpen(true);
  };

  // Handle hide from contacts action
  const handleHideFromContacts = () => {
    if (!selectedContactRef.current || !selectedContactRef.current.contact) return;
    
    const contact = selectedContactRef.current.contact;
    
    // Store the contact for undo
    const previousContact = { ...contact };
    
    // Mark contact as hidden (not saved)
    setRecipients((prev) =>
      prev.map((recipient) =>
        recipient.id === contact.id
          ? { ...recipient, isSaved: false }
          : recipient
      )
    );
    
    handleCloseMoreMenu();
    
    // Show snackbar with undo
    setSnackbar({
      open: true,
      message: `${contact.name || contact.email || "Contact"} has been hidden from your contacts list`,
      anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
      action: (
        <Button
          variant="text"
          size="medium"
          onClick={() => {
            // Undo hide
            setRecipients((prev) =>
              prev.map((recipient) =>
                recipient.id === contact.id
                  ? previousContact
                  : recipient
              )
            );
            setSnackbar({
              open: true,
              message: "Undone",
              autoHideDuration: 2000,
              hideClose: true,
              anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
              style: snackbarStyle,
            });
          }}
          sx={{ textTransform: "capitalize" }}
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

  // Handle delete action - moves contact to trash
  const handleDelete = () => {
    if (!selectedContactRef.current || !selectedContactRef.current.contact) return;
    
    const contact = selectedContactRef.current.contact;
    
    // Store the contact for undo
    const previousContact = { ...contact };
    
    // Mark contact as deleted (move to trash)
    setRecipients((prev) =>
      prev.map((recipient) =>
        recipient.id === contact.id
          ? { ...recipient, isDeleted: true }
          : recipient
      )
    );
    
    setMoreMenuAnchor(null);
    
    // Show snackbar with undo
    setSnackbar({
      open: true,
      message: `${contact.name || contact.email || "Contact"} moved to trash`,
      anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
      action: (
        <Button
          variant="text"
          size="medium"
          onClick={() => {
            // Undo delete
            setRecipients((prev) =>
              prev.map((recipient) =>
                recipient.id === contact.id
                  ? previousContact
                  : recipient
              )
            );
            setSnackbar({
              open: true,
              message: "Undone",
              autoHideDuration: 2000,
              hideClose: true,
              anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
              style: snackbarStyle,
            });
          }}
          sx={{ textTransform: "capitalize" }}
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
  
  // Handle remove from label action
  const handleRemoveFromLabel = () => {
    if (!selectedContactRef.current || !selectedContactRef.current.contact || !currentLabel) return;
    
    const contact = selectedContactRef.current.contact;
    const labelName = currentLabel.label;
    
    // Store the previous contact for undo
    const previousContact = { ...contact };
    
    // Remove the label from the contact
    setRecipients((prev) =>
      prev.map((recipient) =>
        recipient.id === contact.id
          ? {
              ...recipient,
              labels: recipient.labels?.filter((label) => label !== labelName) || [],
            }
          : recipient
      )
    );
    
    handleCloseMoreMenu();
    
    // Show snackbar with undo
    setSnackbar({
      open: true,
      message: `${contact.name} has been removed from ${labelName}`,
      anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
      action: (
        <Button
          variant="text"
          size="medium"
          onClick={() => {
            // Undo remove from label
            setRecipients((prev) =>
              prev.map((recipient) =>
                recipient.id === contact.id
                  ? previousContact
                  : recipient
              )
            );
            setSnackbar({
              open: true,
              message: "Undone",
              autoHideDuration: 2000,
              hideClose: true,
              style: snackbarStyle,
            });
          }}
          sx={{ textTransform: "capitalize" }}
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

  // Handle undo label toggle
  const handleUndoLabelToggle = (labelName) => {
    if (!selectedContactRef.current || !selectedContactRef.current.contact) return;

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    timeoutsRef.current.labelToggle = setTimeout(() => {
      // Undo the label toggle by updating the recipients array
      setRecipients((prev) =>
        prev.map((recipient) =>
          recipient.id === selectedContactRef.current.contact.id
            ? {
                ...recipient,
                labels: selectedContactRef.current.contact.labels?.includes(labelName)
                  ? selectedContactRef.current.contact.labels.filter((label) => label !== labelName)
                  : [...(selectedContactRef.current.contact.labels || []), labelName],
              }
            : recipient
        )
      );

      // Update the ref to reflect the change
      if (selectedContactRef.current) {
        selectedContactRef.current = {
          ...selectedContactRef.current,
          contact: {
            ...selectedContactRef.current.contact,
            labels: selectedContactRef.current.contact.labels?.includes(labelName)
              ? selectedContactRef.current.contact.labels.filter((label) => label !== labelName)
              : [...(selectedContactRef.current.contact.labels || []), labelName],
          },
        };
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

  // Handle label toggle
  const handleLabelToggle = (labelName) => {
    if (!selectedContactRef.current || !selectedContactRef.current.contact) return;

    // Store original contact data before making changes
    const originalContact = selectedContactRef.current.contact;
    const contactName = originalContact.name ?? originalContact.email ?? "Contact";

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    timeoutsRef.current.labelToggle = setTimeout(() => {
      const contact = selectedContactRef.current.contact;
      const hasLabel = contact.labels?.includes(labelName);

      setRecipients((prev) =>
        prev.map((recipient) =>
          recipient.id === contact.id
            ? {
                ...recipient,
                labels: hasLabel
                  ? recipient.labels.filter((label) => label !== labelName)
                  : [...(recipient.labels || []), labelName],
              }
            : recipient
        )
      );

      // Update the ref to reflect the change
      if (selectedContactRef.current) {
        selectedContactRef.current = {
          ...selectedContactRef.current,
          contact: {
            ...contact,
            labels: hasLabel
              ? contact.labels.filter((label) => label !== labelName)
              : [...(contact.labels || []), labelName],
          },
        };
      }

      // Display success snackbar notification
      setSnackbar({
        open: true,
        message: hasLabel ? `${contactName} has been removed from ${labelName}` : `${contactName} labeled ${labelName}`,
        // Display undo button
        action: (
          <Button
            variant="text"
            size="medium"
            onClick={() => handleUndoLabelToggle(labelName)}
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

  // Handle label click navigation
  const handleLabelClick = (label) => {
    const labelObj = recipientLabels.find((l) => l.label === label);
    if (labelObj) {
      navigate(`/contacts/label/${labelObj.id}`);
    }
  };

  // Handle contact row click navigation
  const handleContactRowClick = (contact) => {
    navigate(`/contacts/person/${contact.id}`);
  };

  // Handle bulk actions for all contacts
  const handleBulkAction = (action) => {
    console.log(`Bulk ${action} action clicked`);
    // TODO: Implement bulk action functionality based on action type
    switch (action) {
      case "print":
        // TODO: Implement bulk print functionality
        console.log("Printing all contacts...");
        break;
      case "export":
        // TODO: Implement bulk export functionality
        console.log("Exporting all contacts...");
        break;
      default:
        console.log(`Unknown bulk action: ${action}`);
    }
  };

  // Handle list settings
  const handleListSettings = (event) => {
    event.stopPropagation();
    setBulkMoreMenuAnchor(event.currentTarget);
  };

  // Handle manage labels dropdown
  const handleManageLabels = (event) => {
    setManageLabelsAnchor(event.currentTarget);
  };

  // Close manage labels dropdown
  const handleCloseManageLabels = () => {
    setManageLabelsAnchor(null);
  };

  // Handle bulk more actions dropdown
  const handleBulkMoreActions = (event) => {
    event.stopPropagation();
    setBulkMoreMenuAnchor(event.currentTarget);
  };

  // Close bulk more actions dropdown
  const handleCloseBulkMoreMenu = () => {
    setBulkMoreMenuAnchor(null);
  };

  // Handle bulk print action
  const handleBulkPrint = () => {
    if (checkedContacts.size > 0) {
      console.log("Bulk print action clicked for selected contacts:", Array.from(checkedContacts));
    } else {
      console.log("Print action clicked for all contacts (list settings)");
    }
    handleCloseBulkMoreMenu();
    // TODO: Implement bulk print functionality
  };

  // Handle bulk export action
  const handleBulkExport = () => {
    handleCloseBulkMoreMenu();
    setExportModalOpen(true);
  };

  // Handle close export modal
  const handleCloseExportModal = () => {
    setExportModalOpen(false);
    // Reset the selected contact reference when closing the modal
    selectedContactRef.current = null;
  };

  // Handle close delete modal
  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteActionType(null);
    selectedContactRef.current = null; // Clear the selected contact reference
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (deleteActionType === "single" && selectedContactRef.current?.contact) {
      // Delete single contact
      const contactToDelete = selectedContactRef.current.contact;

      // Store the deleted contact for undo
      const deletedContact = contactToDelete;

      setRecipients((prev) => prev.filter((recipient) => recipient.id !== contactToDelete.id));

      // Remove the deleted contact from checked contacts if it was selected
      setCheckedContacts((prev) => {
        const newChecked = new Set(prev);
        newChecked.delete(contactToDelete.id);
        return newChecked;
      });

      const undo = () => {
        // Restore the contact
        setRecipients((prev) => [...prev, deletedContact]);

        // Restore the contact to checked contacts if it was originally selected
        setCheckedContacts((prev) => {
          const newChecked = new Set(prev);
          newChecked.add(contactToDelete.id);
          return newChecked;
        });

        setSnackbar({
          open: true,
          message: "Undone",
          action: null,
          autoHideDuration: 3000,
          hideClose: true,
          style: snackbarStyle,
        });
      };

      setSnackbar({
        open: true,
        message: `1 contact deleted`,
        action: (
          <Button variant="text" size="medium" onClick={undo}>
            Undo
          </Button>
        ),
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
      });
    } else if (deleteActionType === "bulk") {
      // Delete selected contacts
      const contactsToDelete = Array.from(checkedContacts);

      // Store the deleted contacts for undo
      const deletedContacts = recipients.filter((recipient) => contactsToDelete.includes(recipient.id));

      setRecipients((prev) => prev.filter((recipient) => !contactsToDelete.includes(recipient.id)));

      const undo = () => {
        // Restore the contacts
        setRecipients((prev) => [...prev, ...deletedContacts]);
        setSnackbar({
          open: true,
          message: "Undone",
          action: null,
          autoHideDuration: 2000,
          hideClose: true,
          style: snackbarStyle,
        });
      };

      // Clear selection
      setCheckedContacts(new Set());

      setSnackbar({
        open: true,
        message: `${contactsToDelete.length} contact${contactsToDelete.length > 1 ? "s" : ""} deleted`,
        action: (
          <Button variant="text" size="medium" onClick={undo}>
            Undo
          </Button>
        ),
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
      });
    }
  };

  // Handle bulk hide from contacts action
  const handleBulkHideFromContacts = () => {
    if (checkedContacts.size > 0) {
      console.log("Bulk hide from contacts action clicked for selected contacts:", Array.from(checkedContacts));
    } else {
      console.log("Hide from contacts action clicked for all contacts (list settings)");
    }
    handleCloseBulkMoreMenu();
    // TODO: Implement bulk hide from contacts functionality
  };

  // Handle bulk delete action
  const handleBulkDelete = () => {
    if (checkedContacts.size > 0) {
      console.log("Bulk delete action clicked for selected contacts:", Array.from(checkedContacts));
    } else {
      console.log("Delete action clicked for all contacts (list settings)");
    }
    handleCloseBulkMoreMenu();
    setDeleteActionType("bulk");
    setDeleteModalOpen(true);
  };

  // Handle merge contacts
  const handleMergeContacts = () => {
    // TODO: Implement merge contacts functionality
  };

  // Handle display density action
  const handleDisplayDensity = () => {
    console.log("Display Density clicked");
    handleCloseBulkMoreMenu();
    // TODO: Implement display density functionality
  };

  // Handle change column order action
  const handleChangeColumnOrder = () => {
    console.log("Change column order clicked");
    handleCloseBulkMoreMenu();
    // TODO: Implement change column order functionality
  };

  // Handle checkbox change
  const handleCheckboxChange = (contactId, isChecked) => {
    setCheckedContacts((prev) => {
      const newChecked = new Set(prev);
      if (isChecked) {
        newChecked.add(contactId);
      } else {
        newChecked.delete(contactId);
      }
      return newChecked;
    });
  };

  // Handle select all checkbox
  const handleSelectAll = () => {
    // If there are already selected contacts, clicking the header checkbox should deselect all
    if (checkedContacts.size > 0) {
      setCheckedContacts(new Set());
    } else {
      // If no contacts are selected, clicking the header checkbox should select all
      setCheckedContacts(new Set(allContactsSet));
    }
  };

  // Get contact data for a specific column
  const getContactColumnData = (contact, header) => {
    switch (header) {
      case "Name":
        return {
          type: "name",
          data: contact,
        };
      case "Email":
        return {
          type: "text",
          data: contact.email || "—",
        };
      case "Phone number":
        return {
          type: "text",
          data:
            contact.phones?.length > 0 && contact.phones[0].value
              ? `${contact.phones[0].dialCode}${contact.phones[0].value}`
              : "—",
        };
      case "Job title & company":
        return {
          type: "text",
          data:
            contact.jobTitle && contact.company
              ? `${contact.jobTitle}, ${contact.company}`
              : contact.jobTitle || contact.company || "—",
        };
      case "Labels":
        return {
          type: "labels",
          data: contact.labels || [],
        };
      case "Actions":
        return {
          type: "actions",
          data: contact,
        };
      default:
        return {
          type: "text",
          data: "—",
        };
    }
  };

  // Render a single contact row
  const renderContactRow = (contact, index, title) => {
    const avatarColor = generateAvatarColor(contact.name);
    const initials = contact.name ? contact.name.charAt(0).toUpperCase() : "";

    return (
      <TableRow
        key={index}
        className={`${styles.contactRow} ${
          Boolean(moreMenuAnchor) &&
          selectedContactRef.current?.title === title &&
          selectedContactRef.current?.contact?.id === contact.id
            ? styles.activeRow
            : ""
        } ${checkedContacts.has(contact.id) ? styles.checkedRow : ""}`}
        onClick={() => handleContactRowClick(contact)}
        sx={{ cursor: "pointer" }}
      >
        {tableHeaders.map((header, headerIndex) => {
          const columnData = getContactColumnData(contact, header);

          return (
            <TableCell
              key={`contact-cell-${headerIndex}`}
              sx={{
                border: 0,
                py: 1,
                borderRadius:
                  headerIndex === 0
                    ? "4px 0px 0px 4px"
                    : headerIndex === tableHeaders.length - 1
                    ? "0px 4px 4px 0px"
                    : 0,
              }}
            >
              {columnData.type === "name" && (
                <Box className={styles.avatarContainer}>
                  <Box className={styles.avatarCheckboxWrapper}>
                    <Avatar
                      className={styles.avatar}
                      sx={{
                        bgcolor: contact.avatar ? "transparent" : avatarColor,
                        color: contact.avatar ? "inherit" : "white",
                        width: 36,
                        height: 36,
                        fontSize: "14px",
                      }}
                    >
                      {contact.avatar ? (
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                        />
                      ) : (
                        initials
                      )}
                    </Avatar>

                    {/* Drag indicator */}
                    <span className={`material-symbols-outlined ${styles.dragIndicator}`}>drag_indicator</span>

                    {/* Checkbox */}
                    <Checkbox
                      className={styles.checkbox}
                      size="medium"
                      checked={checkedContacts.has(contact.id)}
                      onChange={(event) => handleCheckboxChange(contact.id, event.target.checked)}
                      onClick={(event) => event.stopPropagation()}
                      sx={{
                        "&.Mui-checked": {
                          color: "#0b57d0",
                        },
                      }}
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 400,
                      fontSize: "0.875rem",
                      ml: 0.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      width: "100%",
                    }}
                  >
                    {contact.name || "—"}
                  </Typography>
                </Box>
              )}

              {columnData.type === "text" && (
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 400,
                    fontSize: "0.875rem",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    width: "100%",
                  }}
                >
                  {columnData.data}
                </Typography>
              )}

              {columnData.type === "labels" && (
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {columnData.data && columnData.data.length > 0 ? (
                    columnData.data.map((label, labelIndex) => (
                      <Chip
                        key={`label-${labelIndex}`}
                        label={label}
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleLabelClick(label);
                        }}
                        className={styles.labelChip}
                      />
                    ))
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 400, fontSize: "0.875rem", color: "#9aa0a6" }}>
                      —
                    </Typography>
                  )}
                </Box>
              )}

              {columnData.type === "actions" && (
                <Box className={styles.actionsContainer}>
                  {/* Favorite button */}
                  <Tooltip
                    title={contact?.isFavorite ? "Remove from favorites" : "Add to favorites"}
                    placement="top"
                    slotProps={{
                      popper: {
                        sx: {
                          "& .MuiTooltip-tooltip": {
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            color: "white",
                            fontSize: "12px",
                            fontWeight: 200,
                          },
                        },
                      },
                    }}
                  >
                    <IconButton
                      size="medium"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleFavorite(contact);
                      }}
                      sx={{
                        color: contact?.isFavorite ? "#0b57d0" : "#444746",
                        "&:hover": {
                          backgroundColor: contact?.isFavorite ? "rgba(11, 87, 208, 0.08)" : "action.hover",
                        },
                      }}
                    >
                      <span
                        className={`material-symbols-${contact?.isFavorite ? "filled" : "outlined"}`}
                        style={{ fontSize: "21px" }}
                      >
                        star
                      </span>
                    </IconButton>
                  </Tooltip>

                  {/* Save contact button (for hidden contacts) OR Edit button */}
                  {contact.isSaved === false ? (
                    <Tooltip
                      title="Save contact"
                      placement="top"
                      slotProps={{
                        popper: {
                          sx: {
                            "& .MuiTooltip-tooltip": {
                              backgroundColor: "rgba(0, 0, 0, 0.7)",
                              color: "white",
                              fontSize: "12px",
                              fontWeight: 200,
                            },
                          },
                        },
                      }}
                    >
                      <IconButton
                        size="medium"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSaveContact(contact);
                        }}
                        sx={{ color: "#444746" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>
                          person_add
                        </span>
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip
                      title="Edit contact"
                      placement="top"
                      slotProps={{
                        popper: {
                          sx: {
                            "& .MuiTooltip-tooltip": {
                              backgroundColor: "rgba(0, 0, 0, 0.7)",
                              color: "white",
                              fontSize: "12px",
                              fontWeight: 200,
                            },
                          },
                        },
                      }}
                    >
                      <IconButton
                        size="medium"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEdit(contact);
                        }}
                        sx={{ color: "#444746" }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>
                          edit
                        </span>
                      </IconButton>
                    </Tooltip>
                  )}

                  {/* More actions button */}
                  <Tooltip
                    title="More actions"
                    placement="top"
                    slotProps={{
                      popper: {
                        sx: {
                          "& .MuiTooltip-tooltip": {
                            backgroundColor: "rgba(0, 0, 0, 0.7)",
                            color: "white",
                            fontSize: "12px",
                            fontWeight: 200,
                          },
                        },
                      },
                    }}
                  >
                    <IconButton
                      size="medium"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleMoreActions(contact, title, event);
                      }}
                      sx={{ color: "#444746" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "21px" }}>
                        more_vert
                      </span>
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </TableCell>
          );
        })}
      </TableRow>
    );
  };

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      <TableContainer
        sx={{
          backgroundColor: "transparent",
          flex: 1,
          overflowY: "auto",
          maxHeight: "calc(100vh - 160px)",
          width: "100%",
        }}
      >
        <Table sx={{ borderCollapse: "separate", borderSpacing: 0, width: "100%" }} ref={tableRef}>
          {/* Table header - normal header or selection header */}
          <TableHead sx={{ backgroundColor: "#fff", position: "sticky", top: 0, zIndex: 1 }}>
            {checkedContacts.size === 0 ? (
              // Normal table header
              <TableRow>
                {tableHeaders.map((header, index) => (
                  <TableCell
                    key={`table-header-${index}`}
                    sx={{
                      border: 0,
                      borderBottom: "1px solid #c4c7c5",
                      py: 1.5,
                      px: 1,
                      backgroundColor: "transparent",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    {header === "Actions" ? (
                      // Action buttons header
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                        {/* Print button */}
                        {!hidePrintExport && (
                          <Tooltip
                            title="Print"
                            placement="bottom"
                            slotProps={{
                              popper: {
                                sx: {
                                  "& .MuiTooltip-tooltip": {
                                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                                    color: "white",
                                    fontSize: "12px",
                                    fontWeight: 200,
                                  },
                                },
                              },
                            }}
                          >
                            <IconButton
                              size="medium"
                              onClick={() => handleBulkAction("print")}
                              sx={{ color: "#444746" }}
                            >
                              <span className="material-symbols-filled" style={{ fontSize: "20px" }}>
                                print
                              </span>
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* Export button */}
                        {!hidePrintExport && (
                          <Tooltip
                            title="Export"
                            placement="bottom"
                            slotProps={{
                              popper: {
                                sx: {
                                  "& .MuiTooltip-tooltip": {
                                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                                    color: "white",
                                    fontSize: "12px",
                                    fontWeight: 200,
                                  },
                                },
                              },
                            }}
                          >
                            <IconButton size="medium" onClick={handleBulkExport} sx={{ color: "#444746" }}>
                              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                                upload
                              </span>
                            </IconButton>
                          </Tooltip>
                        )}

                        {/* List settings button */}
                        <Tooltip
                          title="List settings"
                          placement="bottom"
                          slotProps={{
                            popper: {
                              sx: {
                                "& .MuiTooltip-tooltip": {
                                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                                  color: "white",
                                  fontSize: "12px",
                                  fontWeight: 200,
                                },
                              },
                            },
                          }}
                        >
                          <IconButton size="medium" onClick={handleListSettings} sx={{ color: "#444746" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                              more_vert
                            </span>
                          </IconButton>
                        </Tooltip>
                      </Box>
                    ) : (
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 500,
                          fontSize: "0.875rem",
                          color: "#444746",
                        }}
                      >
                        {header}
                      </Typography>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ) : (
              // Selection header
              <TableRow>
                <TableCell
                  colSpan={tableHeaders.length}
                  sx={{
                    border: 0,
                    borderBottom: "1px solid #e0e0e0",
                    py: 1.5,
                    px: 2,
                    backgroundColor: "transparent",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {/* Left side - Selection info */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Checkbox
                        size="medium"
                        checked={false}
                        indeterminate={checkedContacts.size > 0}
                        onChange={() => handleSelectAll()}
                        sx={{
                          "&.Mui-checked": {
                            color: "#0b57d0",
                          },
                        }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#0b57d0",
                          fontWeight: 500,
                          fontSize: "0.875rem",
                        }}
                      >
                        {checkedContacts.size} selected
                      </Typography>
                    </Box>

                    {/* Right side - Action buttons */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {/* Show Save contact icon if any selected contacts are hidden */}
                      {(() => {
                        const selectedContacts = recipients.filter(contact => checkedContacts.has(contact.id));
                        const hasHiddenContacts = selectedContacts.some(contact => contact.isSaved === false);
                        return hasHiddenContacts;
                      })() && (
                        <Tooltip
                          title="Save contact"
                          placement="top"
                          slotProps={{
                            popper: {
                              sx: {
                                "& .MuiTooltip-tooltip": {
                                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                                  color: "white",
                                  fontSize: "12px",
                                  fontWeight: 200,
                                },
                              },
                            },
                          }}
                        >
                          <IconButton 
                            size="medium" 
                            onClick={() => {
                              // Save all selected hidden contacts
                              const selectedContacts = recipients.filter(contact => checkedContacts.has(contact.id));
                              const hiddenContacts = selectedContacts.filter(contact => contact.isSaved === false);
                              
                              if (hiddenContacts.length > 0) {
                                setRecipients((prev) =>
                                  prev.map((recipient) =>
                                    hiddenContacts.some(c => c.id === recipient.id)
                                      ? { ...recipient, isSaved: true }
                                      : recipient
                                  )
                                );
                                
                                // Create message with contact names
                                let message;
                                if (hiddenContacts.length === 1) {
                                  const contact = hiddenContacts[0];
                                  message = `Added ${contact.name || contact.email || "contact"} to contacts`;
                                } else {
                                  message = `Added ${hiddenContacts.length} contacts to contacts`;
                                }
                                
                                setSnackbar({
                                  open: true,
                                  message: message,
                                  autoHideDuration: 3000,
                                  hideClose: true,
                                  anchorOrigin: { vertical: 'bottom', horizontal: 'center' },
                                  style: snackbarStyle,
                                });
                              }
                            }}
                            sx={{ color: "#0b57d0" }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                              person_add
                            </span>
                          </IconButton>
                        </Tooltip>
                      )}
                      {/* Display merge icon if more than one contact is selected */}
                      {checkedContacts.size > 1 && (
                        <Tooltip
                          title="Merge"
                          placement="top"
                          slotProps={{
                            popper: {
                              sx: {
                                "& .MuiTooltip-tooltip": {
                                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                                  color: "white",
                                  fontSize: "12px",
                                  fontWeight: 200,
                                },
                              },
                            },
                          }}
                        >
                          <IconButton size="medium" onClick={handleMergeContacts} sx={{ color: "#0b57d0" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                              merge
                            </span>
                          </IconButton>
                        </Tooltip>
                      )}
                      {/* Move to action */}
                      <Tooltip
                        title="Manage labels"
                        placement="top"
                        slotProps={{
                          popper: {
                            sx: {
                              "& .MuiTooltip-tooltip": {
                                backgroundColor: "rgba(0, 0, 0, 0.7)",
                                color: "white",
                                fontSize: "12px",
                                fontWeight: 200,
                              },
                            },
                          },
                        }}
                      >
                        <IconButton size="medium" onClick={handleManageLabels} sx={{ color: "#0b57d0" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                            label
                          </span>
                        </IconButton>
                      </Tooltip>

                      {/* Email action */}
                      <Tooltip
                        title="Send email"
                        placement="top"
                        slotProps={{
                          popper: {
                            sx: {
                              "& .MuiTooltip-tooltip": {
                                backgroundColor: "rgba(0, 0, 0, 0.7)",
                                color: "white",
                                fontSize: "12px",
                                fontWeight: 200,
                              },
                            },
                          },
                        }}
                      >
                        <IconButton
                          size="medium"
                          onClick={() => console.log("Email clicked for selected contacts")}
                          sx={{ color: "#0b57d0" }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                            mail
                          </span>
                        </IconButton>
                      </Tooltip>

                      {/* More actions */}
                      <Tooltip
                        title="More actions"
                        placement="top"
                        slotProps={{
                          popper: {
                            sx: {
                              "& .MuiTooltip-tooltip": {
                                backgroundColor: "rgba(0, 0, 0, 0.7)",
                                color: "white",
                                fontSize: "12px",
                                fontWeight: 200,
                              },
                            },
                          },
                        }}
                      >
                        <IconButton size="small" onClick={handleBulkMoreActions} sx={{ color: "#0b57d0" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                            more_vert
                          </span>
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableHead>

          {/* Table body with sections - scrollable */}
          <TableBody>
            {filteredContacts.map((section, sectionIndex) => (
              <React.Fragment key={`ContactsTable-section-${sectionIndex}`}>
                {/* Section heading row */}
                {section.heading && (
                  <TableRow>
                    <TableCell
                      colSpan={tableHeaders.length}
                      sx={{
                        border: 0,
                        backgroundColor: "transparent",
                        pt: 0.5,
                        pb: 0,
                      }}
                    >
                      {section.heading}
                    </TableCell>
                  </TableRow>
                )}

                {/* Section contacts */}
                {section.data && section.data.length > 0 ? (
                  section.data.map((contact, index) =>
                    renderContactRow(contact, `${section.title}-${sectionIndex}-${index}`, section.title)
                  )
                ) : section.heading ? (
                  <TableRow>
                    <TableCell
                      colSpan={tableHeaders.length}
                      sx={{
                        border: 0,
                        py: 2,
                        backgroundColor: "transparent",
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#1f1f1f",
                          fontSize: "0.875rem",
                          fontWeight: 400,
                        }}
                      >
                        No results in your contacts
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </React.Fragment>
            ))}

            {/* Empty state when no sections have data */}
            {filteredContacts.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={tableHeaders.length}
                  sx={{
                    border: 0,
                    py: 2,
                    backgroundColor: "transparent",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#1f1f1f",
                      fontSize: "0.875rem",
                      fontWeight: 400,
                    }}
                  >
                    No results in your contacts
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* More Actions Dropdown Menu */}
      <Menu
        anchorEl={moreMenuAnchor}
        open={Boolean(moreMenuAnchor)}
        onClose={handleCloseMoreMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          "& .MuiPaper-root": {
            width: "256px",
            mt: 1,
            backgroundColor: "#fff",
            boxShadow:
              "0px 8px 10px 1px rgba(0,0,0,.14),0px 3px 14px 2px rgba(0,0,0,.12),0px 5px 5px -3px rgba(0,0,0,.2)",
            borderRadius: "2px",
          },
          "& .MuiMenuItem-root": {
            px: 3,
            py: 1.25,
            "&:hover": {
              backgroundColor: "#eee",
            },
          },
        }}
      >
        {/* Actions Section */}
        {!hidePrintExport && (
          <MenuItem onClick={handlePrint}>
            <ListItemIcon>
              <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#616161" }}>
                print
              </span>
            </ListItemIcon>
            <ListItemText
              primary="Print"
              slotProps={{
                primary: {
                  color: "rgb(60,64,67)",
                  fontSize: "14px",
                  fontWeight: 400,
                },
              }}
            />
          </MenuItem>
        )}

        {!hidePrintExport && (
          <MenuItem onClick={handleExport}>
            <ListItemIcon>
              <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#616161" }}>
                upload
              </span>
            </ListItemIcon>
            <ListItemText
              primary="Export"
              slotProps={{
                primary: {
                  color: "rgb(60,64,67)",
                  fontSize: "14px",
                  fontWeight: 400,
                },
              }}
            />
          </MenuItem>
        )}

        {/* Show "Remove from label" if viewing a specific label */}
        {currentLabel && (
          <MenuItem onClick={handleRemoveFromLabel}>
            <ListItemIcon>
              <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#616161" }}>
                label_off
              </span>
            </ListItemIcon>
            <ListItemText
              primary={`Remove from ${currentLabel.label}`}
              slotProps={{
                primary: {
                  color: "rgb(60,64,67)",
                  fontSize: "14px",
                  fontWeight: 400,
                },
              }}
            />
          </MenuItem>
        )}

        {/* Show "Hide from contacts" only if contact is not already hidden */}
        {selectedContactRef.current?.contact?.isSaved !== false && (
          <MenuItem onClick={handleHideFromContacts}>
            <ListItemIcon>
              <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#616161" }}>
                archive
              </span>
            </ListItemIcon>
            <ListItemText
              primary="Hide from contacts"
              slotProps={{
                primary: {
                  color: "rgb(60,64,67)",
                  fontSize: "14px",
                  fontWeight: 400,
                },
              }}
            />
          </MenuItem>
        )}

        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#616161" }}>
              delete
            </span>
          </ListItemIcon>
          <ListItemText
            primary="Delete"
            slotProps={{
              primary: {
                color: "rgb(60,64,67)",
                fontSize: "14px",
                fontWeight: 400,
              },
            }}
          />
        </MenuItem>

        {/* Change Labels Section */}
        {recipientLabels.length > 0 && (
          <Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ px: 3, pb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontSize: "0.75rem", color: "#747775", fontWeight: 400 }}>
                Change labels
              </Typography>
            </Box>
            {recipientLabels.map((label) => {
              const hasLabel = selectedContactRef.current?.contact?.labels?.includes(label.label);
              return (
                <MenuItem key={label.id} onClick={() => handleLabelToggle(label.label)} sx={{ py: 0.5, pb: 1 }}>
                  <ListItemIcon>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#616161" }}>
                      label
                    </span>
                  </ListItemIcon>
                  <ListItemText
                    primary={label.label}
                    slotProps={{
                      primary: {
                        color: "rgb(60,64,67)",
                        fontSize: "14px",
                        fontWeight: 400,
                      },
                    }}
                  />
                  {hasLabel && (
                    <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "#0b57d0" }}>
                      check
                    </span>
                  )}
                </MenuItem>
              );
            })}
          </Box>
        )}
      </Menu>

      {/* Bulk More Actions Dropdown Menu */}
      <Menu
        anchorEl={bulkMoreMenuAnchor}
        open={Boolean(bulkMoreMenuAnchor)}
        onClose={handleCloseBulkMoreMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        sx={{
          "& .MuiPaper-root": {
            width: "256px",
            mt: 1,
            backgroundColor: "#fff",
            boxShadow:
              "0px 8px 10px 1px rgba(0,0,0,.14),0px 3px 14px 2px rgba(0,0,0,.12),0px 5px 5px -3px rgba(0,0,0,.2)",
            borderRadius: "2px",
          },
          "& .MuiMenuItem-root": {
            px: 3,
            py: 1.25,
            "&:hover": {
              backgroundColor: "#eee",
            },
          },
        }}
      >
        {checkedContacts.size === 0 ? (
          // Options when no contacts are selected
          <>
            {/* Display Density option */}
            <MenuItem onClick={handleDisplayDensity}>
              <ListItemIcon>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#616161" }}>
                  format_list_bulleted
                </span>
              </ListItemIcon>
              <ListItemText
                primary="Display Density"
                slotProps={{
                  primary: {
                    color: "rgb(60,64,67)",
                    fontSize: "14px",
                    fontWeight: 400,
                  },
                }}
              />
            </MenuItem>

            {/* Change column order option */}
            <MenuItem onClick={handleChangeColumnOrder}>
              <ListItemIcon>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#616161" }}>
                  table_chart
                </span>
              </ListItemIcon>
              <ListItemText
                primary="Change column order"
                slotProps={{
                  primary: {
                    color: "rgb(60,64,67)",
                    fontSize: "14px",
                    fontWeight: 400,
                  },
                }}
              />
            </MenuItem>
          </>
        ) : (
          // Options when contacts are selected
          <>
            {/* Print action */}
            {!hidePrintExport && (
              <MenuItem onClick={handleBulkPrint}>
                <ListItemIcon>
                  <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#616161" }}>
                    print
                  </span>
                </ListItemIcon>
                <ListItemText
                  primary="Print"
                  slotProps={{
                    primary: {
                      color: "rgb(60,64,67)",
                      fontSize: "14px",
                      fontWeight: 400,
                    },
                  }}
                />
              </MenuItem>
            )}

            {/* Export action */}
            {!hidePrintExport && (
              <MenuItem onClick={handleBulkExport}>
                <ListItemIcon>
                  <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#616161" }}>
                    upload
                  </span>
                </ListItemIcon>
                <ListItemText
                  primary="Export"
                  slotProps={{
                    primary: {
                      color: "rgb(60,64,67)",
                      fontSize: "14px",
                      fontWeight: 400,
                    },
                  }}
                />
              </MenuItem>
            )}

            {/* Hide from contacts action - only show if there are visible contacts selected */}
            {(() => {
              const selectedContacts = recipients.filter(contact => checkedContacts.has(contact.id));
              const hasVisibleContacts = selectedContacts.some(contact => contact.isSaved !== false);
              return hasVisibleContacts;
            })() && (
              <MenuItem onClick={handleBulkHideFromContacts}>
                <ListItemIcon>
                  <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#616161" }}>
                    archive
                  </span>
                </ListItemIcon>
                <ListItemText
                  primary="Hide from contacts"
                  slotProps={{
                    primary: {
                      color: "rgb(60,64,67)",
                      fontSize: "14px",
                      fontWeight: 400,
                    },
                  }}
                />
              </MenuItem>
            )}

            {/* Delete action */}
            <MenuItem onClick={handleBulkDelete}>
              <ListItemIcon>
                <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#616161" }}>
                  delete
                </span>
              </ListItemIcon>
              <ListItemText
                primary="Delete"
                slotProps={{
                  primary: {
                    color: "rgb(60,64,67)",
                    fontSize: "14px",
                    fontWeight: 400,
                  },
                }}
              />
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Manage Labels Dropdown */}
      <ManageLabelsDropdown
        anchorEl={manageLabelsAnchor}
        open={Boolean(manageLabelsAnchor)}
        onClose={handleCloseManageLabels}
        selectedContacts={checkedContacts}
        contacts={contacts}
      />

      {/* Export Contacts Modal */}
      <ExportContactsModal
        open={exportModalOpen}
        onClose={handleCloseExportModal}
        selectedContactsCount={checkedContacts.size}
        totalContactsCount={allContactsSet.size}
        availableLabels={recipientLabels}
        allContacts={recipients.filter((recipient) => recipient?.isSaved)}
        selectedContactIds={checkedContacts}
        singleContact={selectedContactRef.current?.contact}
        currentLabel={currentLabel}
      />

      {/* Delete Contacts Modal */}
      <DeleteContactsModal
        open={deleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleDeleteConfirm}
        selectedContactsCount={deleteActionType === "bulk" ? checkedContacts.size : 1}
        isBulkAction={deleteActionType === "bulk"}
      />
    </Box>
  );
};

export default ContactsTable;
