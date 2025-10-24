import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Chip,
  Backdrop,
  Tooltip,
  Menu,
  MenuItem as MuiMenuItem,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CreateLabelModal from "./Contacts/CreateLabelModal";
import DeleteLabelModal from "./Contacts/DeleteLabelModal";
import ImportContactsModal from "./Contacts/ImportContactsModal";
import ImportNotification from "./Contacts/ImportNotification";
import CreateMultipleContactsModal from "./Contacts/CreateMultipleContactsModal";
import { useGlobalContext } from "../contexts/GlobalContext";
import useDimensions from "../hooks/useDimensions";
import styles from "./ContactsLeftSidebar.module.css";

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

// Reusable MenuItem component
const MenuItem = ({
  to,
  selected,
  icon,
  text,
  chip,
  infoIcon,
  onInfoClick,
  onClick,
  iconType,
  showEditDelete,
  onEdit,
  onDelete,
}) => {
  return (
    <ListItem disablePadding>
      <ListItemButton
        component={to ? Link : "div"}
        to={to}
        selected={selected}
        onClick={onClick}
        className={`${styles.menuItem} ${showEditDelete ? styles.hasEditDelete : ""} ${
          selected ? styles.selected : ""
        }`}
        sx={{
          borderRadius: "22px",
          mx: 1,
          textDecoration: "none",
          color: "#444746",
          fontSize: "0.875rem",
          fontWeight: 500,
          py: 0,
          px: 0.5,
          overflow: "hidden",
          "&.Mui-selected": {
            backgroundColor: "#c2e7ff",
            color: "#001d35",
            fontWeight: 700,
            "&:hover": {
              backgroundColor: "#c2e7ff",
            },
          },
          "&:hover": {
            backgroundColor: "rgba(11, 87, 208, 0.08)",
          },
        }}
      >
        {selected && <div className={styles.menuItemOverlay} />}
        <Box sx={{ display: "flex", alignItems: "center", py: 1, px: 1.75, width: "100%" }}>
          <ListItemIcon sx={{ minWidth: 40, color: selected ? "#001d35" : "#444746" }}>
            <span
              className={`material-symbols-${iconType ? iconType : selected ? "filled" : "outlined"}`}
              style={{ fontSize: "24px" }}
            >
              {icon}
            </span>
          </ListItemIcon>
          <ListItemText
            primary={text}
            sx={{
              "& .MuiListItemText-primary": {
                fontSize: "0.875rem",
                fontWeight: selected ? 700 : 500,
              },
            }}
          />
          {/* Chip - hidden on hover/selected when edit/delete buttons are shown */}
          {chip && (
            <Chip
              label={chip}
              size="small"
              className={styles.menuChip}
              sx={{
                fontSize: "12px",
                backgroundColor: "transparent",
                color: "inherit",
                fontWeight: 400,
              }}
            />
          )}
        </Box>

        {/* Edit and Delete buttons - shown on hover/selected */}
        {showEditDelete && (
          <Box className={styles.editDeleteButtons}>
            <Tooltip
              title="Rename label"
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
                size="medium"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onEdit && onEdit();
                }}
                sx={{
                  color: "#444746",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                  edit
                </span>
              </IconButton>
            </Tooltip>
            <Tooltip
              title="Delete label"
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
                size="medium"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete && onDelete();
                }}
                sx={{
                  color: "#444746",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                  delete
                </span>
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {infoIcon && (
          <IconButton
            size="medium"
            onClick={onInfoClick}
            sx={{
              color: "#444746",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
              info
            </span>
          </IconButton>
        )}
      </ListItemButton>
    </ListItem>
  );
};

// Reusable SectionHeader component
const SectionHeader = ({ children }) => (
  <Typography
    variant="caption"
    sx={{
      display: "block",
      px: 2.5,
      py: 1,
      mb: 1,
      color: "#444746",
      fontSize: "0.875rem",
      fontWeight: 700,
      letterSpacing: 0,
    }}
  >
    {children}
  </Typography>
);

const ContactsLeftSidebar = () => {
  const location = useLocation();
  const {
    contactsLeftSidebarExpanded,
    setContactsLeftSidebarExpanded,
    recipients,
    setRecipients,
    recipientLabels,
    setRecipientLabels,
    vacationResponder,
    setSnackbar,
    createLabelModal,
    setCreateLabelModal,
  } = useGlobalContext();
  const { width } = useDimensions();
  const navigate = useNavigate();
  const activeItem = location.pathname.split("/").pop();
  const myContacts = recipients.filter((recipient) => recipient?.isSaved && !recipient?.isDeleted);
  const [deleteLabelModal, setDeleteLabelModal] = useState({
    show: false,
    label: null,
  });
  const [createContactAnchor, setCreateContactAnchor] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPopup, setImportPopup] = useState({ open: false, fileName: "", undo: null });
  const [showCreateMultipleContactsModal, setShowCreateMultipleContactsModal] = useState(false);

  useEffect(() => {
    // When width goes below 1024px, set the contacts left sidebar to collapsed else expanded
    if (width < 1024) {
      setContactsLeftSidebarExpanded(false);
    } else {
      setContactsLeftSidebarExpanded(true);
    }
  }, [width]);

  // Get contacts count by label
  const getContactsCountByLabel = (label) => {
    return recipients.filter((recipient) => recipient?.labels?.includes(label) && !recipient?.isDeleted).length;
  };

  // Handle create contact dropdown menu item selection
  const handleCreateContactAction = (menuType) => {
    if (menuType === "single") {
      // Navigate to the create contact screen
      navigate("/contacts/new");
    } else if (menuType === "multiple") {
      // Show create multiple contacts modal
      setShowCreateMultipleContactsModal(true);
    }
    setCreateContactAnchor(null);
  };

  const handleMenuItemClick = (item) => {
    if (item === "Import") {
      setImportModalOpen(true);
    }
  };

  const handleInfoClick = (e) => {
    e.stopPropagation();
    // TODO: Implement info tooltip or modal
  };

  // Handle create label functionality
  const handleCreateLabel = () => {
    setCreateLabelModal({
      show: true,
      type: "create",
      labelId: null,
    });
  };

  // Handle edit label functionality
  const handleEditLabel = (label) => {
    setCreateLabelModal({
      show: true,
      type: "edit",
      label: label,
    });
  };

  // Handle create/rename label modal close
  const handleCreateLabelModalClose = () => {
    setCreateLabelModal({
      show: false,
      type: "create",
      labelId: null,
    });
  };

  // Handle import contacts
  const handleImportContacts = async (importedContacts, uploadedFileName = "contacts.csv") => {
    try {
      // Create import label with current date in DD/MM format
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const baseImportLabelName = `Imported on ${day}/${month}`;
      
      // Find the next available counter for this date
      let counter = 1;
      let importLabelName = baseImportLabelName;
      
      // Check if any labels with this base name exist and find the highest counter
      const existingLabels = recipientLabels.filter(label => {
        // Match "Imported on 22/10" or "Imported on 22/10 1", "Imported on 22/10 2", etc.
        const regex = new RegExp(`^${baseImportLabelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s+(\\d+))?$`);
        return regex.test(label.label);
      });
      
      if (existingLabels.length > 0) {
        // Find the highest counter
        const counters = existingLabels.map(label => {
          const match = label.label.match(/\s+(\d+)$/);
          return match ? parseInt(match[1]) : 0; // Return 0 for labels without counter
        });
        counter = Math.max(...counters) + 1;
      }
      
      // Always append counter if there are existing labels with this date
      if (existingLabels.length > 0) {
        importLabelName = `${baseImportLabelName} ${counter}`;
      }
      
      // Create the new label
      const importLabel = {
        id: `label_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label: importLabelName,
        color: '#039be5', // Blue color for import labels
      };
      setRecipientLabels((prev) => [...prev, importLabel]);
      
      // Add the import label to all imported contacts
      const contactsWithLabel = importedContacts.map(contact => ({
        ...contact,
        labels: contact.labels ? [...contact.labels, importLabelName] : [importLabelName],
      }));
      
      console.log('Import Debug:', {
        importLabelName,
        importLabel,
        importedContactsCount: importedContacts.length,
        contactsWithLabelCount: contactsWithLabel.length,
        firstContact: contactsWithLabel[0],
      });
      
      // Store the previous recipients for undo functionality
      const previousRecipients = [...recipients];
      const previousLabels = [...recipientLabels];
      
      // Add imported contacts to recipients
      setRecipients((prev) => [...prev, ...contactsWithLabel]);
      
      // Use setTimeout to ensure state updates before navigation
      setTimeout(() => {
        // Navigate to the imported label view
        navigate(`/contacts/label/${importLabel.id}`);
      }, 100);
      
      // Prepare undo action
      const undoAction = () => {
        // Restore previous recipients and labels
        setRecipients(previousRecipients);
        setRecipientLabels(previousLabels);
        
        // Navigate back to contacts list
        navigate('/contacts');
      };

      // Show custom import notification popup (bottom-right)
      setImportPopup({ open: true, fileName: uploadedFileName, undo: undoAction });
    } catch (error) {
      console.error('Error importing contacts:', error);
      setSnackbar({
        open: true,
        message: 'Error importing contacts. Please try again.',
        autoHideDuration: 3000,
        hideClose: true,
        style: snackbarStyle,
        severity: 'error',
      });
    }
  };

  // Handle close import modal
  const handleCloseImportModal = () => {
    setImportModalOpen(false);
  };

  // Handle undo delete label
  const handleUndoDeleteLabel = (label) => {
    // Add the label back to the recipientLabels array
    setRecipientLabels((prev) => [...prev, label]);

    // Display success snackbar
    setSnackbar({
      open: true,
      message: "Undone",
      autoHideDuration: 3000,
      hideClose: true,
      style: snackbarStyle,
      action: null,
    });
  };

  // Handle delete label functionality
  const handleDeleteLabel = (label) => {
    // Check if any recipients have this label
    const recipientsWithLabel = recipients.filter((recipient) => recipient.labels?.includes(label.label));
    if (recipientsWithLabel.length > 0) {
      // Show delete modal with options
      setDeleteLabelModal({
        show: true,
        label: label,
      });
    } else {
      // Navigate to the contacts screen if pathname is `/contacts/label/${label.id}`
      if (location.pathname === `/contacts/label/${label.id}`) {
        navigate("/contacts");
      }

      // Remove the label from the recipientLabels array
      setRecipientLabels((prev) => prev.filter((recipientLabel) => recipientLabel.id !== label.id));

      // Display success snackbar
      setSnackbar({
        open: true,
        message: `Label ${label.label} deleted`,
        autoHideDuration: 5000,
        hideClose: false,
        style: snackbarStyle,
        closeIconColor: "#fff",
        action: (
          <Button
            variant="text"
            size="medium"
            onClick={() => handleUndoDeleteLabel(label)}
            sx={{ textTransform: "capitalize" }}
          >
            Undo
          </Button>
        ),
      });
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <Backdrop
        open={contactsLeftSidebarExpanded && width < 1024}
        sx={{ zIndex: 40, backgroundColor: "transparent" }}
        onClick={() => setContactsLeftSidebarExpanded(false)}
      />

      {/* Contacts left sidebar */}
      <Box
        className={`${styles.contactsLeftSidebar} ${contactsLeftSidebarExpanded ? styles.expanded : ""}`}
        style={{
          height: `calc(100vh - ${vacationResponder.enabled ? "32px" : "66px"})`,
        }}
      >
        {/* Create Contact Button */}
        <Box sx={{ p: 2, px: 1.5 }}>
          {width < 1024 ? (
            <Box sx={{ display: "flex", alignItems: "center", mb: 0.25, px: 1 }}>
              <img
                src="/assets/images/contacts_favicon.png"
                alt="Contacts"
                style={{ width: "40px", height: "40px", marginRight: "10px", marginLeft: "10px", cursor: "pointer" }}
              />

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 400,
                  fontSize: "22px",
                  color: "#5f6368",
                  "&:hover": {
                    cursor: "pointer",
                  },
                  "&:active": {
                    textDecoration: "underline",
                  },
                }}
              >
                Contacts
              </Typography>
            </Box>
          ) : (
            <Button
              variant="contained"
              startIcon={
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "24px", color: "#062239", marginRight: "4px" }}
                >
                  add
                </span>
              }
              onClick={(e) => setCreateContactAnchor(e.currentTarget)}
              sx={{
                backgroundColor: "#c2e7ff",
                color: "#062239",
                borderRadius: "16px",
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.875rem",
                px: 2.5,
                py: 2,
                boxShadow: "none",
                transition:
                  "box-shadow .28s cubic-bezier(.4,0,.2,1),opacity 15ms linear 30ms,grid-template-columns .5s cubic-bezier(.27,1.06,.18,1),transform .27s 0ms cubic-bezier(0,0,.2,1)",
                "&:hover": {
                  boxShadow: "0 2px 5px 2px rgba(0,0,0,0.3)",
                },
                "& .MuiButton-startIcon": {
                  marginRight: 1,
                },
              }}
            >
              Create contact
            </Button>
          )}
        </Box>

        {/* Create Contact Dropdown Menu */}
        <Menu
          anchorEl={createContactAnchor}
          open={Boolean(createContactAnchor)}
          onClose={() => setCreateContactAnchor(null)}
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
              backgroundColor: "#f0f4f9",
              boxShadow:
                "0px 8px 10px 1px rgba(0,0,0,.14),0px 3px 14px 2px rgba(0,0,0,.12),0px 5px 5px -3px rgba(0,0,0,.2)",
              borderRadius: "4px",
            },
            "& .MuiMenuItem-root": {
              p: 1.5,
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.08)",
              },
            },
          }}
        >
          <MuiMenuItem onClick={() => handleCreateContactAction("single")}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <span className="material-symbols-outlined" style={{ fontSize: "24px", color: "#1f1f1f" }}>
                person
              </span>
            </ListItemIcon>
            <ListItemText
              primary="Create a contact"
              slotProps={{
                primary: {
                  color: "#1f1f1f",
                  fontSize: "14px",
                  fontWeight: 500,
                },
              }}
            />
          </MuiMenuItem>
          <MuiMenuItem onClick={() => handleCreateContactAction("multiple")}>
            <ListItemIcon sx={{ minWidth: 32 }}>
              <span className="material-symbols-outlined" style={{ fontSize: "24px", color: "#1f1f1f" }}>
                group
              </span>
            </ListItemIcon>
            <ListItemText
              primary="Create multiple contacts"
              slotProps={{
                primary: {
                  color: "#1f1f1f",
                  fontSize: "14px",
                  fontWeight: 500,
                },
              }}
            />
          </MuiMenuItem>
        </Menu>

        {/* Main Navigation Section */}
        <Box sx={{ px: 0.5 }}>
          <List disablePadding>
            <MenuItem
              to="/contacts"
              selected={activeItem === "contacts"}
              icon="person"
              text="Contacts"
              chip={myContacts.length === 0 ? "" : myContacts.length}
              infoIcon={false}
              onInfoClick={() => {}}
              onClick={() => {}}
              iconType="outlined"
              showEditDelete={false}
              onEdit={() => {}}
              onDelete={() => {}}
            />
            <MenuItem 
              to="/contacts/frequent" 
              selected={activeItem === "frequent"} 
              icon="history" 
              text="Frequent"
              chip=""
              infoIcon={false}
              onInfoClick={() => {}}
              onClick={() => {}}
              iconType="outlined"
              showEditDelete={false}
              onEdit={() => {}}
              onDelete={() => {}}
            />
            <MenuItem
              to="/contacts/other"
              selected={activeItem === "other"}
              icon="archive"
              text="Other contacts"
              chip=""
              infoIcon={true}
              onInfoClick={handleInfoClick}
              onClick={() => {}}
              iconType="outlined"
              showEditDelete={false}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </List>
        </Box>

        {/* Fix & manage Section */}
        <Box sx={{ px: 1, mt: 1 }}>
          <SectionHeader>Fix & manage</SectionHeader>
          <List disablePadding>
            <MenuItem
              to="/contacts/suggestions"
              selected={activeItem === "suggestions"}
              icon="handyman"
              text="Merge & fix"
              chip=""
              infoIcon={false}
              onInfoClick={() => {}}
              onClick={() => {}}
              iconType="outlined"
              showEditDelete={false}
              onEdit={() => {}}
              onDelete={() => {}}
            />
            <MenuItem
              to=""
              selected={activeItem === "Import"}
              icon="file_download"
              text="Import"
              chip=""
              infoIcon={false}
              onInfoClick={() => {}}
              onClick={() => handleMenuItemClick("Import")}
              iconType="outlined"
              showEditDelete={false}
              onEdit={() => {}}
              onDelete={() => {}}
            />
            <MenuItem 
              to="/contacts/trash" 
              selected={activeItem === "trash"} 
              icon="delete" 
              text="Trash"
              chip={(() => {
                const deletedCount = recipients.filter(r => r.isDeleted === true).length;
                return deletedCount === 0 ? "" : deletedCount;
              })()}
              infoIcon={false}
              onInfoClick={() => {}}
              onClick={() => {}}
              iconType="outlined"
              showEditDelete={false}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </List>
        </Box>

        {/* Labels Section */}
        <Box sx={{ px: 1, mt: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              pr: 2,
              py: 1,
            }}
          >
            <SectionHeader>Labels</SectionHeader>
            <IconButton
              size="medium"
              onClick={handleCreateLabel}
              sx={{
                color: "#444746",
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                add
              </span>
            </IconButton>
          </Box>
          <List disablePadding>
            {/* Sort labels on alphabetical order and display them */}
            {recipientLabels
              .sort((a, b) => a.label.localeCompare(b.label))
              .map((label) => (
                <MenuItem
                  key={`label-${label.id}`}
                  to={`/contacts/label/${label.id}`}
                  selected={location.pathname === `/contacts/label/${label.id}`}
                  icon="label"
                  text={label.label}
                  iconType="filled"
                  chip={getContactsCountByLabel(label.label) === 0 ? "" : getContactsCountByLabel(label.label)}
                  infoIcon={false}
                  onInfoClick={() => {}}
                  onClick={() => {}}
                  showEditDelete={true}
                  onEdit={() => handleEditLabel(label)}
                  onDelete={() => handleDeleteLabel(label)}
                />
              ))}
          </List>
        </Box>
      </Box>

      {/* Create/Rename Label Modal */}
      {createLabelModal.show && (
        <CreateLabelModal
          open={createLabelModal.show}
          onClose={handleCreateLabelModalClose}
          backdropStyle={{ top: "-66px" }}
          isEdit={createLabelModal.type === "edit"}
          editLabel={createLabelModal.type === "edit" ? createLabelModal.label : null}
        />
      )}

      {/* Delete Label Modal */}
      {deleteLabelModal.show && (
        <DeleteLabelModal
          open={deleteLabelModal.show}
          onClose={() =>
            setDeleteLabelModal({
              show: false,
              label: null,
            })
          }
          backdropStyle={{ top: "-66px" }}
          label={deleteLabelModal.label}
        />
      )}

      {/* Import Contacts Modal */}
      <ImportContactsModal
        open={importModalOpen}
        onClose={handleCloseImportModal}
        onImport={handleImportContacts}
      />
      {/* Import Notification Popup */}
      {importPopup?.open && (
        <ImportNotification
          open={importPopup.open}
          fileName={importPopup.fileName}
          onUndo={() => importPopup.undo?.()}
          onClose={() => setImportPopup({ open: false, fileName: "", undo: null })}
        />
      )}

      {/* Create Multiple Contacts Modal */}
      {showCreateMultipleContactsModal && (
        <CreateMultipleContactsModal
          open={showCreateMultipleContactsModal}
          onClose={() => setShowCreateMultipleContactsModal(false)}
        />
      )}
    </>
  );
};

export default ContactsLeftSidebar;
