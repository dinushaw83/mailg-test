import React, { useEffect, useState } from "react";
import { Box, IconButton, TextField, Tooltip, Typography, Avatar } from "@mui/material";
import { useGlobalContext } from "../contexts/GlobalContext";
import { generateAvatarColor } from "../utils/helperFunctions";
import styles from "./ContactsHeader.module.css";

const ContactsHeader = () => {
  const { setContactsLeftSidebarExpanded, loggedInUser } = useGlobalContext();
  const [searchValue, setSearchValue] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const initials = loggedInUser.name ? loggedInUser.name.charAt(0).toUpperCase() : "";

  // Update favicon to contacts icon
  useEffect(() => {
    document.querySelector("link[rel='icon']").href = "/assets/images/pr_2_image_11.png";
  }, []);

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
          src="/assets/images/pr_2_image_11.png"
          alt="Contacts"
          style={{ width: "40px", height: "40px", marginRight: "10px" }}
        />

        <Typography variant="h6" sx={{ fontWeight: 400, fontSize: "22px", color: "#5f6368" }}>
          Contacts
        </Typography>

        {/* Searchbar */}
        <Box className={`${styles.searchBox} ${isSearchFocused ? styles.focused : ""}`}>
          <Tooltip
            title="Search"
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
            <IconButton size="medium" sx={{ color: "#5f6368", mr: "10px" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                search
              </span>
            </IconButton>
          </Tooltip>

          {/* Search input */}
          <TextField
            placeholder="Search"
            variant="standard"
            sx={{
              width: "100%",
              fontSize: "0.875rem",
              fontWeight: 400,
              "& fieldset": {
                border: "none",
              },
              "& .MuiInputBase-input::placeholder": {
                color: "#929394",
                opacity: 1,
                fontWeight: 400,
              },
              "& .MuiInputBase-input:hover": {
                cursor: "text",
              },
            }}
            slotProps={{
              input: {
                disableUnderline: true,
              },
            }}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />

          {/* Clear search */}
          <Tooltip
            title="Clear search"
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
            <IconButton size="medium" sx={{ color: "#5f6368" }} onClick={() => setSearchValue("")}>
              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>
                close
              </span>
            </IconButton>
          </Tooltip>
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
          <Tooltip
            title={
              <Box>
                <Typography sx={{ fontSize: "12px", fontWeight: 500 }}>MailG Account</Typography>
                <Typography sx={{ fontSize: "12px", fontWeight: 400, color: "rgba(255, 255, 255, 0.7)" }}>
                  {loggedInUser.name}
                </Typography>
                <Typography sx={{ fontSize: "12px", fontWeight: 400, color: "rgba(255, 255, 255, 0.7)" }}>
                  {loggedInUser.email}
                </Typography>
              </Box>
            }
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
            <Avatar
              sx={{
                bgcolor: loggedInUser.avatar ? "transparent" : generateAvatarColor(loggedInUser.name),
                color: loggedInUser.avatar ? "inherit" : "white",
                width: 36,
                height: 36,
                fontSize: "14px",
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
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export default ContactsHeader;
