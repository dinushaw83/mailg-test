import { Avatar, ListItem, ListItemAvatar, ListItemText, Tooltip } from "@mui/material";

import React from "react";
import { generateAvatarColor } from "../../../utils/helperFunctions";

const ContactListItem = ({ contact, onClick }) => {
  const avatarColor = generateAvatarColor(contact.name);
  const initials = contact.name.charAt(0).toUpperCase();

  return (
    <Tooltip
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
        onClick={onClick}
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
};

export default ContactListItem;
