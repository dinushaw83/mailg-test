import React from "react";
import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  IconButton,
  Button,
  Tooltip,
} from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { generateAvatarColor } from "../../utils/helperFunctions";

const ContactsTab = ({ onClose }) => {
  const { recipients } = useGlobalContext();
  const myContacts = recipients.filter((recipient) => recipient.labels.includes("My contacts"));

  return (
    <Box sx={{ height: "100%", overflow: "auto" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
          ml: 1.5,
        }}
      >
        <Typography variant="p" sx={{ fontWeight: 400, fontSize: "1.375rem" }}>
          Contacts
        </Typography>
        <div style={{ display: "flex", alignItems: "center" }}>
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
                    fontWeight: 200,
                  },
                },
              },
            }}
          >
            <IconButton size="medium" aria-label="search">
              <span className="material-symbols-outlined" style={{ fontSize: 21, color: "#444746" }}>
                search
              </span>
            </IconButton>
          </Tooltip>
          <Tooltip
            title="Open in new tab"
            placement="bottom"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: 200,
                  },
                },
              },
            }}
          >
            <IconButton size="medium" aria-label="open-in-new-tab">
              <span className="material-symbols-outlined" style={{ fontSize: 21, color: "#444746" }}>
                open_in_new
              </span>
            </IconButton>
          </Tooltip>
          <Tooltip
            title="Close"
            placement="bottom"
            slotProps={{
              popper: {
                sx: {
                  "& .MuiTooltip-tooltip": {
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "white",
                    fontSize: "13px",
                    fontWeight: 200,
                  },
                },
              },
            }}
          >
            <IconButton size="medium" aria-label="Close tabs" onClick={onClose}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: "#444746" }}>
                close
              </span>
            </IconButton>
          </Tooltip>
        </div>
      </Box>

      {/* Create contact */}
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
      >
        <span class="material-symbols-outlined" style={{ fontSize: "20px", marginRight: "8px" }}>
          add
        </span>
        Create contact
      </Button>

      {/* Contacts list */}
      <p style={{ fontSize: "0.6875rem", fontWeight: 400, color: "#444746", marginLeft: "6px" }}>
        Contacts ({myContacts.length})
      </p>
      <List sx={{ p: 0, pl: 1 }}>
        {myContacts.map((contact) => {
          const avatarColor = generateAvatarColor(contact.name);
          const initials = contact.name.charAt(0).toUpperCase();

          return (
            <Tooltip
              key={contact.id}
              title={contact.name}
              placement="top"
              slotProps={{
                popper: {
                  sx: {
                    "& .MuiTooltip-tooltip": {
                      backgroundColor: "rgba(0, 0, 0, 0.7)",
                      color: "white",
                      fontSize: "13px",
                      fontWeight: 200,
                    },
                  },
                },
              }}
            >
              <ListItem
                sx={{
                  p: 0,
                  pb: 0.5,
                  "&:hover": {
                    cursor: "pointer",
                  },
                }}
              >
                <ListItemAvatar sx={{ minWidth: 32, mr: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: contact.avatar ? "transparent" : avatarColor,
                      color: contact.avatar ? "inherit" : "white",
                      width: 32,
                      height: 32,
                      fontSize: "18px",
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
                </ListItemAvatar>
                <ListItemText
                  primary={contact.name}
                  secondary={contact.email}
                  slotProps={{
                    primary: {
                      fontSize: "0.875rem",
                      fontWeight: 400,
                      color: "#1f1f1f",
                    },
                    secondary: {
                      fontSize: "0.75rem",
                      color: "#444746",
                      fontWeight: 400,
                    },
                  }}
                />
              </ListItem>
            </Tooltip>
          );
        })}
      </List>
    </Box>
  );
};

export default ContactsTab;
