import React, { useState, useRef } from "react";
import { Box, Button } from "@mui/material";
import { ActionIconButton } from "./ContactComponents";
import ScopedInfoModal from "../../common/ScopedInfoModal";
import { useGlobalContext } from "../../../contexts/GlobalContext";

// Style of snackbar in this screen
const snackbarStyle = {
  left: "auto !important",
  right: "60px !important",
  "& .MuiSnackbarContent-root": {
    backgroundColor: "#303030",
    color: "#fff",
    minHeight: "40px",
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
  } = useGlobalContext();
  const contact = recipients.find((recipient) => recipient.id === rightSidebarActiveTab.contact.contactId);
  const isFavorite = contact?.labels?.includes("Favorites");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const deletedContact = useRef(null);
  const [disableHeader, setDisableHeader] = useState(false);

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
    setRecipients((prev) =>
      prev.map((recipient) =>
        recipient.id === contact.id
          ? {
              ...recipient,
              labels: isFavorite
                ? recipient.labels.filter((label) => label !== "Favorites")
                : [...recipient.labels, "Favorites"],
            }
          : recipient
      )
    );

    setTimeout(() => {
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
    setRightSidebarActiveTab((prev) => ({ ...prev, contact: { screen: "EDIT_CONTACT", contactId: contact.id } }));
  };

  // Handle undo delete
  const handleUndoDelete = () => {
    // Remove the contact from the deleted recipients
    setDeletedRecipients((prev) => prev.filter((recipient) => recipient.id !== deletedContact.current.id));

    // Add the contact to the recipients
    setRecipients((prev) => [...prev, deletedContact.current]);

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

    setTimeout(() => {
      // Add the contact to the deleted recipients
      setDeletedRecipients((prev) => [...prev, contact]);

      // Remove the contact from the recipients
      setRecipients((prev) => prev.filter((recipient) => recipient.id !== contact.id));

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
          <ActionIconButton iconName="open_in_new" title="Open in new tab" color="#444746" disabled={disableHeader} />

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
      <Box sx={{ overflowY: "auto", py: 2, px: 1, mt: 7, height: "calc(100vh - 188px)" }}></Box>

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
