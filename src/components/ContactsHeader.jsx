import React, { useEffect, useState } from "react";
import { Box, IconButton, Tooltip, Typography, Avatar } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useGlobalContext } from "../contexts/GlobalContext";
import { generateAvatarColor } from "../utils/helperFunctions";
import ContactSearchDropdown from "./Contacts/ContactSearchDropdown";
import ProfileMenu from "./ProfileMenu";
import styles from "./ContactsHeader.module.css";

const ContactsHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setContactsLeftSidebarExpanded, loggedInUser } = useGlobalContext();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const initials = loggedInUser.name.charAt(0).toUpperCase();
  const initialSearchQuery = location.pathname.startsWith("/contacts/search/")
    ? decodeURIComponent(location.pathname.split("/").pop() ?? "")
    : "";

  // Update favicon to contacts icon
  useEffect(() => {
    document.querySelector("link[rel='icon']").href = "/assets/images/contacts_favicon.png";
  }, []);

  // Handle contact selection from search dropdown
  const handleContactSelect = (contact) => {
    // Navigate to contact details page
    navigate(`/contacts/person/${contact.id}`);
  };

  // Handle search submission by pressing enter
  const handleSearchSubmit = (searchQuery) => {
    // Navigate to search results page or handle search
    navigate(`/contacts/search/${encodeURIComponent(searchQuery)}`);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pl: "10px", py: 1, pr: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        {/* Left sidebar expand/collapse button */}
        <IconButton
          sx={{ color: "#5f6368" }}
          size="large"
          onClick={() => setContactsLeftSidebarExpanded((prev) => !prev)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
            menu
          </span>
        </IconButton>

        <img
          src="/assets/images/contacts_favicon.png"
          alt="Contacts"
          style={{ width: "40px", height: "40px", marginRight: "10px", marginLeft: "10px", cursor: "pointer" }}
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

        {/* Contact Search Dropdown */}
        <Box className={`${styles.searchBox} ${isSearchFocused ? styles.focused : ""}`}>
          <ContactSearchDropdown
            onContactSelect={handleContactSelect}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            handleSubmit={handleSearchSubmit}
            placeholder="Search"
            initialQuery={initialSearchQuery}
          />
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Help */}
          <Tooltip
            title="Help menu"
            placement="bottom"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: "400",
                  },
                },
              },
            }}
          >
            <IconButton size="medium" sx={{ color: "#5f6368" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                help
              </span>
            </IconButton>
          </Tooltip>

          {/* Settings */}
          <Tooltip
            title="Settings menu"
            placement="bottom"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: "400",
                  },
                },
              },
            }}
          >
            <IconButton size="medium" sx={{ color: "#5f6368" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                settings
              </span>
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* MailG apps */}
          <Tooltip
            title="MailG apps"
            placement="bottom"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: "400",
                  },
                },
              },
            }}
          >
            <IconButton size="medium" sx={{ color: "#5f6368" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                apps
              </span>
            </IconButton>
          </Tooltip>

          {/* Avatar */}
          <Avatar
            onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
            sx={{
              bgcolor: loggedInUser.avatar ? "transparent" : generateAvatarColor(loggedInUser.name),
              color: loggedInUser.avatar ? "inherit" : "white",
              width: 36,
              height: 36,
              fontSize: "15px",
              transition: "opacity 0.2s ease",
              "&:hover": {
                cursor: "pointer",
              },
            }}
          >
            {loggedInUser.avatar ? (
              <img
                src={loggedInUser.avatar}
                alt={loggedInUser.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
              />
            ) : (
              initials
            )}
          </Avatar>
        </Box>
      </Box>

      {/* Profile Menu */}
      <ProfileMenu
        anchorEl={profileMenuAnchor}
        open={Boolean(profileMenuAnchor)}
        onClose={() => setProfileMenuAnchor(null)}
      />
    </Box>
  );
};

export default ContactsHeader;
