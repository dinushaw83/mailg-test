import React, { useEffect } from "react";
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
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { useGlobalContext } from "../contexts/GlobalContext";
import useDimensions from "../hooks/useDimensions";
import styles from "./ContactsLeftSidebar.module.css";

// Reusable MenuItem component
const MenuItem = ({ to, selected, icon, text, chip, infoIcon, onInfoClick, onClick, iconType }) => {
  return (
    <ListItem disablePadding>
      <ListItemButton
        component={to ? Link : "div"}
        to={to}
        selected={selected}
        onClick={onClick}
        className={styles.menuItem}
        sx={{
          borderRadius: "22px",
          mx: 1,
          textDecoration: "none",
          color: "#444746",
          fontSize: "0.875rem",
          fontWeight: 500,
          py: 1,
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
        {chip && (
          <Chip
            label={chip}
            size="small"
            sx={{
              fontSize: "12px",
              backgroundColor: "transparent",
              color: "inherit",
              fontWeight: 400,
            }}
          />
        )}
        {infoIcon && (
          <IconButton
            size="small"
            onClick={onInfoClick}
            sx={{
              color: "#444746",
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "23px" }}>
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
  const { contactsLeftSidebarExpanded, setContactsLeftSidebarExpanded, recipients, recipientLabels } =
    useGlobalContext();
  const { width } = useDimensions();
  const activeItem = location.pathname.split("/").pop();
  const myContacts = recipients.filter((recipient) => recipient?.labels?.includes("My contacts"));

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
    return recipients.filter((recipient) => recipient?.labels?.includes(label)).length;
  };

  const handleCreateContact = () => {
    console.log("Create contact clicked");
    // TODO: Implement create contact functionality
  };

  const handleMenuItemClick = (item) => {
    console.log(`${item} clicked`);
    // TODO: Implement navigation functionality
  };

  const handleAddLabel = () => {
    console.log("Add label clicked");
    // TODO: Implement add label functionality
  };

  const handleInfoClick = (e) => {
    e.stopPropagation();
    console.log("Info clicked");
    // TODO: Implement info tooltip or modal
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
      <Box className={`${styles.contactsLeftSidebar} ${contactsLeftSidebarExpanded ? styles.expanded : ""}`}>
        {/* Create Contact Button */}
        <Box sx={{ p: 2, px: 1.5 }}>
          {width < 1024 ? (
            <Box sx={{ display: "flex", alignItems: "center", mb: 0.25, px: 1 }}>
              <img
                src="/assets/images/pr_2_image_11.png"
                alt="Contacts"
                style={{ width: "40px", height: "40px", marginRight: "10px", cursor: "pointer" }}
                onClick={() => navigate("/contacts")}
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
                onClick={() => navigate("/contacts")}
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
              onClick={handleCreateContact}
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

        {/* Main Navigation Section */}
        <Box sx={{ px: 0.5 }}>
          <List disablePadding>
            <MenuItem
              to="/contacts"
              selected={activeItem === "contacts"}
              icon="person"
              text="Contacts"
              chip={myContacts.length === 0 ? "" : myContacts.length}
            />
            <MenuItem to="/contacts/frequent" selected={activeItem === "frequent"} icon="history" text="Frequent" />
            <MenuItem
              to="/contacts/other"
              selected={activeItem === "other"}
              icon="archive"
              text="Other contacts"
              infoIcon={true}
              onInfoClick={handleInfoClick}
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
            />
            <MenuItem
              selected={activeItem === "Import"}
              icon="file_download"
              text="Import"
              onClick={() => handleMenuItemClick("Import")}
            />
            <MenuItem to="/contacts/trash" selected={activeItem === "trash"} icon="delete" text="Trash" />
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
              onClick={handleAddLabel}
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
            {recipientLabels
              .filter((label) => label.label !== "My contacts")
              .map((label) => (
                <MenuItem
                  key={`label-${label.id}`}
                  to={`/contacts/label/${label.id}`}
                  selected={location.pathname === `/contacts/label/${label.id}`}
                  icon="label"
                  text={label.label}
                  iconType="filled"
                  chip={getContactsCountByLabel(label.label) === 0 ? "" : getContactsCountByLabel(label.label)}
                />
              ))}
          </List>
        </Box>
      </Box>
    </>
  );
};

export default ContactsLeftSidebar;
