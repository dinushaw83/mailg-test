import React, { useLayoutEffect, useRef, useState, useEffect, useMemo } from "react";
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
import { generateAvatarColor, generateNextIntegerId } from "../../utils/helperFunctions";
import { useGlobalContext } from "../../contexts/GlobalContext";
import ManageLabelsDropdown from "./ManageLabelsDropdown";
import ExportContactsModal from "./ExportContactsModal";
import DeleteContactsModal from "./DeleteContactsModal";
import styles from "./ContactsTable.module.css";

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

const ContactsTable = ({ contacts = [], hidePrintExport = false, currentLabel = null }) => {
  const {
    recipients,
    setRecipients,
    setSnackbar,
    recipientLabels,
    setHiddenRecipients,
    hiddenRecipients,
    deletedRecipients,
    setDeletedRecipients,
  } = useGlobalContext();
  const navigate = useNavigate();
  const timeoutsRef = useRef({});

  const [tableHeaders, setTableHeaders] = useState([
    "Name",
    "Email",
    "Phone number",
    "Job title & company",
    "Labels",
    "Actions",
  ]);
  const tableRef = useRef(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const selectedContactRef = useRef(null);
  const hiddenContactRef = useRef(null);
  const originalContactRef = useRef(null);
  const [checkedContacts, setCheckedContacts] = useState(new Set());
  const [manageLabelsAnchor, setManageLabelsAnchor] = useState(null);
  const [bulkMoreMenuAnchor, setBulkMoreMenuAnchor] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteActionType, setDeleteActionType] = useState(null);
  const [tempLabels, setTempLabels] = useState([]);

  // Create set of all contact IDs from all sections (no duplicates)
  const allContactsSet = new Set(contacts.flatMap((section) => section.data || []).map((contact) => contact.id));

  // Check if all selected contacts are non-saved (should show hide from contacts option)
  const shouldShowHideFromContacts = useMemo(() => {
    if (checkedContacts.size === 0) return false;

    const selectedContacts = contacts
      .flatMap((section) => section.data || [])
      .filter((contact) => checkedContacts.has(contact.id));

    return selectedContacts.length > 0 && selectedContacts.every((contact) => contact.isSaved);
  }, [checkedContacts, contacts]);

  // All possible headers with their priority (lower number = higher priority)
  const allHeaders = [
    { name: "Name", priority: 1, minWidth: 200 }, // Name is always visible
    { name: "Email", priority: 2, minWidth: 250 },
    { name: "Phone number", priority: 3, minWidth: 200 },
    { name: "Job title & company", priority: 4, minWidth: 200 },
    { name: "Labels", priority: 5, minWidth: 250 },
    { name: "Actions", priority: 1, minWidth: 120 }, // Always visible
  ];

  // Clear timeouts on unmount
  useEffect(
    () => () => {
      Object.keys(timeoutsRef.current).forEach((key) => {
        clearTimeout(timeoutsRef.current[key]);
      });
    },
    []
  );

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

    timeoutsRef.current["favorite"] = setTimeout(() => {
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
                updatedAt: new Date().toISOString(),
                savedAt: recipient?.savedAt ?? new Date().toISOString(),
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
        style: snackbarStyle,
      });
    }, 500);
  };

  // Handle edit contact
  const handleEdit = (contact) => {
    navigate(`/contacts/person/${contact.id}?edit=1`);
  };

  // Handle more actions dropdown
  const handleMoreActions = (contact, title, event) => {
    console.log("handleMoreActions", contact, title, event);
    selectedContactRef.current = {
      contact,
      title,
    };
    // Initialize temp labels with current contact labels
    setTempLabels(contact.labels || []);
    setMoreMenuAnchor(event.currentTarget);
  };

  // Close more actions dropdown
  const handleCloseMoreMenu = () => {
    // Check if there are any changes in temp labels
    if (selectedContactRef.current?.contact) {
      const originalLabels = selectedContactRef.current.contact.labels || [];
      const hasChanges = JSON.stringify(originalLabels.sort()) !== JSON.stringify(tempLabels.sort());

      if (hasChanges) {
        // Apply the label changes
        applyLabelChanges(tempLabels);
      }
    }

    setMoreMenuAnchor(null);
    selectedContactRef.current = null;
    setTempLabels([]);
  };

  // Close more actions dropdown without applying label changes
  const handleCloseMoreMenuWithoutChanges = () => {
    setMoreMenuAnchor(null);
    selectedContactRef.current = null;
    setTempLabels([]);
  };

  // Handle print action
  const handlePrint = () => {
    console.log("Print contact:", selectedContactRef.current);
    handleCloseMoreMenuWithoutChanges();
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
    const contactName = contact.name ?? contact.email ?? "Contact";

    // Store contact data for undo functionality
    hiddenContactRef.current = { ...contact };

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    // Use timeout to simulate processing
    timeoutsRef.current["hideContact"] = setTimeout(() => {
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

      // Display success snackbar notification with undo button
      setSnackbar({
        open: true,
        message: `${contactName} has been hidden from your contacts list`,
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

    handleCloseMoreMenuWithoutChanges();
  };

  // Handle undo hide contact
  const handleUndoHideContact = () => {
    if (!hiddenContactRef.current) return;

    const contact = hiddenContactRef.current;

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    // Use timeout to simulate processing
    timeoutsRef.current["undoHideContact"] = setTimeout(() => {
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

      // Clear the hidden contact ref
      hiddenContactRef.current = null;

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

  // Handle undo bulk hide contacts
  const handleUndoBulkHideContacts = () => {
    if (!hiddenContactRef.current || !Array.isArray(hiddenContactRef.current)) return;

    const contacts = hiddenContactRef.current;

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    // Use timeout to simulate processing
    timeoutsRef.current["undoBulkHideContacts"] = setTimeout(() => {
      const contactsToRestore = [];
      const contactsToUpdate = [];

      const dateString = new Date().toISOString();

      // Process each contact
      contacts.forEach((contact) => {
        const hasLabels = contact.labels && contact.labels.length > 0;

        if (hasLabels) {
          // If contact has labels, move it back from hiddenRecipients to recipients
          contactsToRestore.push({
            ...contact,
            updatedAt: dateString,
            isSaved: true,
            savedAt: dateString,
          });
        } else {
          // If contact has no labels, just set isSaved back to true in recipients
          contactsToUpdate.push({
            ...contact,
            isSaved: true,
            updatedAt: dateString,
            savedAt: contact.savedAt || dateString,
          });
        }
      });

      // Restore contacts with labels
      if (contactsToRestore.length > 0) {
        setRecipients((prev) => [...prev, ...contactsToRestore]);
        setHiddenRecipients((prev) =>
          prev.filter((hiddenRecipient) => !contactsToRestore.some((contact) => contact.id === hiddenRecipient.id))
        );
      }

      // Update contacts without labels
      if (contactsToUpdate.length > 0) {
        setRecipients((prev) =>
          prev.map((recipient) => {
            const contactToUpdate = contactsToUpdate.find((contact) => contact.id === recipient.id);
            if (contactToUpdate) {
              return {
                ...recipient,
                isSaved: true,
                updatedAt: dateString,
                savedAt: contactToUpdate.savedAt,
              };
            }
            return recipient;
          })
        );
      }

      // Clear the hidden contacts ref
      hiddenContactRef.current = null;

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

  // Handle delete action
  const handleDelete = () => {
    console.log("Delete contact:", selectedContactRef.current);
    setMoreMenuAnchor(null); // Close menu but keep selectedContactRef
    setDeleteActionType("single");
    setDeleteModalOpen(true);
  };

  // Handle undo label toggle
  const handleUndoLabelToggle = () => {
    if (!originalContactRef.current) return;

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    timeoutsRef.current["undoLabelToggle"] = setTimeout(() => {
      // Replace entire contact with original contact state
      setRecipients((prev) =>
        prev.map((recipient) =>
          recipient.id === originalContactRef.current.id
            ? {
                ...originalContactRef.current,
                updatedAt: new Date().toISOString(),
              }
            : recipient
        )
      );

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

  // Handle label toggle (now just updates temp labels)
  const handleLabelToggle = (labelName) => {
    if (!selectedContactRef.current?.contact) return;

    // Toggle the label in temp labels
    setTempLabels((prev) =>
      prev.includes(labelName) ? prev.filter((label) => label !== labelName) : [...prev, labelName]
    );
  };

  // Apply label changes when menu is closed
  const applyLabelChanges = (newLabels) => {
    if (!selectedContactRef.current?.contact) return;

    const contact = selectedContactRef.current.contact;
    const contactName = contact.name ?? contact.email ?? "Contact";

    // Store original contact state for undo functionality
    originalContactRef.current = { ...contact };

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    timeoutsRef.current["labelToggle"] = setTimeout(() => {
      // Check if contact is not saved
      const isContactNotSaved = !contact.isSaved;

      // Check if contact exists in recipients
      const contactExistsInRecipients = recipients.some((recipient) => recipient.id === contact.id);

      if (isContactNotSaved) {
        // If contact doesn't exist in recipients, add it to recipients
        const dateString = new Date().toISOString();
        if (!contactExistsInRecipients) {
          setRecipients((prev) => [
            ...prev,
            {
              ...contact,
              name: contactName,
              id: generateNextIntegerId([...recipients, ...hiddenRecipients, ...deletedRecipients]),
              isSaved: true,
              savedAt: dateString,
              updatedAt: dateString,
              createdAt: dateString,
              labels: newLabels,
            },
          ]);
        } else {
          // Update existing contact in recipients
          setRecipients((prev) =>
            prev.map((recipient) =>
              recipient.id === contact.id
                ? {
                    ...recipient,
                    isSaved: true,
                    savedAt: dateString,
                    updatedAt: dateString,
                    labels: newLabels,
                  }
                : recipient
            )
          );
        }

        // Show notification that contact has been added to contacts
        setSnackbar({
          open: true,
          message: `Added ${contactName} to contacts`,
          action: null,
          autoHideDuration: 500,
          hideClose: true,
          style: snackbarStyle,
        });
      } else {
        // Contact is already saved, just update labels
        setRecipients((prev) =>
          prev.map((recipient) =>
            recipient.id === contact.id
              ? {
                  ...recipient,
                  labels: newLabels,
                  updatedAt: new Date().toISOString(),
                }
              : recipient
          )
        );
      }

      timeoutsRef.current["showSuccessMessage"] = setTimeout(
        () => {
          // Generate success message based on changes
          const originalLabels = contact.labels || [];
          const addedLabels = newLabels.filter((label) => !originalLabels.includes(label));
          const removedLabels = originalLabels.filter((label) => !newLabels.includes(label));

          let message = "";
          if (addedLabels.length === 1 && removedLabels.length === 0) {
            message = `${contactName} labeled ${addedLabels[0]}`;
          } else if (addedLabels.length === 0 && removedLabels.length === 1) {
            message = `${contactName} has been removed from ${removedLabels[0]}`;
          } else if (addedLabels.length > 0 && removedLabels.length > 0) {
            message = `${contactName} labels updated`;
          } else if (addedLabels.length > 1) {
            message = `${contactName} has been added to ${addedLabels.length} labels`;
          } else if (removedLabels.length > 1) {
            message = `${contactName} has been removed from ${removedLabels.length} labels`;
          } else {
            message = `${contactName} labels updated`;
          }

          // Display success snackbar notification
          setSnackbar({
            open: true,
            message: message,
            // Display undo button
            action: (
              <Button
                variant="text"
                size="medium"
                onClick={handleUndoLabelToggle}
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
        },
        isContactNotSaved ? 500 : 0
      );
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
    // TODO: Implement bulk action functionality based on action type
    switch (action) {
      case "print":
        // TODO: Implement bulk print functionality
        console.log("Printing all contacts...");
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

      // Add the contact to the deleted recipients
      setDeletedRecipients((prev) => [
        ...prev,
        { ...contactToDelete, updatedAt: new Date().toISOString(), savedAt: null, isSaved: false },
      ]);

      // Remove the contact from the recipients
      setRecipients((prev) => prev.filter((recipient) => recipient.id !== contactToDelete.id));

      // Remove the deleted contact from checked contacts if it was selected
      setCheckedContacts((prev) => {
        const newChecked = new Set(prev);
        newChecked.delete(contactToDelete.id);
        return newChecked;
      });

      const undo = () => {
        const dateString = new Date().toISOString();

        // Restore the contact
        setRecipients((prev) => [
          ...prev,
          { ...deletedContact, updatedAt: dateString, savedAt: dateString, isSaved: true },
        ]);

        // Remove the contact from the deleted recipients
        setDeletedRecipients((prev) => prev.filter((recipient) => recipient.id !== contactToDelete.id));

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

      // Add the contacts to the deleted recipients
      setDeletedRecipients((prev) => [
        ...prev,
        ...deletedContacts.map((contact) => ({
          ...contact,
          updatedAt: new Date().toISOString(),
          savedAt: null,
          isSaved: false,
        })),
      ]);

      // Remove the contacts from the recipients
      setRecipients((prev) => prev.filter((recipient) => !contactsToDelete.includes(recipient.id)));

      const undo = () => {
        const dateString = new Date().toISOString();

        // Restore the contacts
        setRecipients((prev) => [
          ...prev,
          ...deletedContacts.map((contact) => ({
            ...contact,
            updatedAt: dateString,
            savedAt: dateString,
            isSaved: true,
          })),
        ]);

        // Remove the contacts from the deleted recipients
        setDeletedRecipients((prev) => prev.filter((recipient) => !contactsToDelete.includes(recipient.id)));

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
    if (checkedContacts.size === 0) return;

    // Get selected contacts
    const selectedContacts = contacts
      .flatMap((section) => section.data || [])
      .filter((contact) => checkedContacts.has(contact.id));

    if (selectedContacts.length === 0) return;

    // Store contacts data for undo functionality
    hiddenContactRef.current = selectedContacts.map((contact) => ({ ...contact }));

    // Display snackbar notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    // Use timeout to simulate processing
    timeoutsRef.current["bulkHideContacts"] = setTimeout(() => {
      const contactsToHide = [];
      const contactsToUpdate = [];

      const dateString = new Date().toISOString();

      // Process each selected contact
      selectedContacts.forEach((contact) => {
        const hasLabels = contact.labels && contact.labels.length > 0;

        if (hasLabels) {
          // If contact has labels, move to hiddenRecipients
          contactsToHide.push({
            ...contact,
            updatedAt: dateString,
            isSaved: false,
            savedAt: null,
          });
        } else {
          // If contact has no labels, just set isSaved to false in recipients
          contactsToUpdate.push({
            ...contact,
            isSaved: false,
            updatedAt: dateString,
            savedAt: null,
          });
        }
      });

      // Update recipients array
      if (contactsToHide.length > 0) {
        // Add contacts with labels to hiddenRecipients
        setHiddenRecipients((prev) => [...prev, ...contactsToHide]);

        // Remove contacts with labels from recipients
        setRecipients((prev) =>
          prev.filter((recipient) => !contactsToHide.some((contact) => contact.id === recipient.id))
        );
      }

      if (contactsToUpdate.length > 0) {
        // Update contacts without labels in recipients
        setRecipients((prev) =>
          prev.map((recipient) => {
            const contactToUpdate = contactsToUpdate.find((contact) => contact.id === recipient.id);
            if (contactToUpdate) {
              return {
                ...recipient,
                isSaved: false,
                updatedAt: dateString,
                savedAt: null,
              };
            }
            return recipient;
          })
        );
      }

      // Clear selection
      setCheckedContacts(new Set());

      // Display success snackbar notification with undo button
      const message =
        selectedContacts.length === 1
          ? `${
              selectedContacts[0].name ?? selectedContacts[0].email ?? "Contact"
            } has been hidden from your contacts list`
          : `${selectedContacts.length} contacts have been hidden from your contacts list`;

      setSnackbar({
        open: true,
        message,
        action: (
          <Button
            variant="text"
            size="medium"
            onClick={handleUndoBulkHideContacts}
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

    handleCloseBulkMoreMenu();
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

  // Handle save contacts
  const handleSaveContacts = () => {
    // Get all contact data from all sections
    const allContacts = contacts.flatMap((section) => section.data || []);
    const selectedContacts = allContacts.filter((contact) => checkedContacts.has(contact.id));
    const unsavedContacts = selectedContacts.filter((contact) => !contact.isSaved);

    if (unsavedContacts.length === 0) return;

    // Display working notification
    setSnackbar({
      open: true,
      message: "Working...",
      action: null,
      autoHideDuration: 500,
      hideClose: true,
      style: snackbarStyle,
    });

    // Get current date string
    const dateString = new Date().toISOString();

    // After 500ms timeout, update contacts
    timeoutsRef.current["saveContacts"] = setTimeout(() => {
      setRecipients((prev) =>
        prev.map((contact) => {
          if (checkedContacts.has(contact.id) && !contact.isSaved) {
            return {
              ...contact,
              isSaved: true,
              savedAt: dateString,
              updatedAt: dateString,
            };
          }
          return contact;
        })
      );

      // Unselect all contacts
      setCheckedContacts(new Set());

      // Display success notification
      setSnackbar({
        open: true,
        message: `${unsavedContacts.length} Contact${unsavedContacts.length > 1 ? "s" : ""} have been added`,
        action: null,
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
      });
    }, 500);
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
                    {contact?.name || contact?.email || "—"}
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

                  {/* Edit button */}
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
                      {/* Display save contact icon if all selected contacts are unsaved */}
                      {(() => {
                        const allContacts = contacts.flatMap((section) => section.data || []);
                        const selectedContacts = allContacts.filter((contact) => checkedContacts.has(contact.id));
                        return (
                          checkedContacts.size > 0 && selectedContacts.every((contact) => contact.isSaved === false)
                        );
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
                          <IconButton size="medium" onClick={handleSaveContacts} sx={{ color: "#0b57d0" }}>
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
            {contacts.map((section, sectionIndex) => (
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
            {contacts.length === 0 && (
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

        {/* Hide from contacts - only show for saved contacts */}
        {selectedContactRef.current?.contact?.isSaved === true && (
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
              const hasLabel = tempLabels.includes(label.label);
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
            minWidth: "200px",
            mt: 1,
            backgroundColor: "#f0f4f9",
            boxShadow:
              "0px 8px 10px 1px rgba(0,0,0,.14),0px 3px 14px 2px rgba(0,0,0,.12),0px 5px 5px -3px rgba(0,0,0,.2)",
            borderRadius: "2px",
          },
          "& .MuiMenuItem-root": {
            px: 1.5,
            py: 1.25,
            "&:hover": {
              backgroundColor: "#d3dbe5",
            },
          },
        }}
      >
        {checkedContacts.size === 0 ? (
          // Options when no contacts are selected
          <Box>
            {/* Display Density option */}
            <MenuItem onClick={handleDisplayDensity}>
              <ListItemIcon>
                <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "#1f1f1f" }}>
                  format_list_bulleted
                </span>
              </ListItemIcon>
              <ListItemText
                primary="Display Density"
                slotProps={{
                  primary: {
                    color: "#1f1f1f",
                    fontSize: "14px",
                    fontWeight: 500,
                  },
                }}
              />
            </MenuItem>

            {/* Change column order option */}
            <MenuItem onClick={handleChangeColumnOrder}>
              <ListItemIcon>
                <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "#1f1f1f" }}>
                  table_chart
                </span>
              </ListItemIcon>
              <ListItemText
                primary="Change column order"
                slotProps={{
                  primary: {
                    color: "#1f1f1f",
                    fontSize: "14px",
                    fontWeight: 500,
                  },
                }}
              />
            </MenuItem>
          </Box>
        ) : (
          // Options when contacts are selected
          <Box>
            {/* Print action */}
            {!hidePrintExport && (
              <MenuItem onClick={handleBulkPrint}>
                <ListItemIcon>
                  <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "#1f1f1f" }}>
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
              </MenuItem>
            )}

            {/* Export action */}
            {!hidePrintExport && (
              <MenuItem onClick={handleBulkExport}>
                <ListItemIcon>
                  <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "#1f1f1f" }}>
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
              </MenuItem>
            )}

            {/* Hide from contacts action - only show if all selected contacts are non-saved */}
            {shouldShowHideFromContacts && (
              <MenuItem onClick={handleBulkHideFromContacts}>
                <ListItemIcon>
                  <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "#1f1f1f" }}>
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
              </MenuItem>
            )}

            {/* Delete action */}
            <MenuItem onClick={handleBulkDelete}>
              <ListItemIcon>
                <span className="material-symbols-outlined" style={{ fontSize: "22px", color: "#1f1f1f" }}>
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
            </MenuItem>
          </Box>
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
