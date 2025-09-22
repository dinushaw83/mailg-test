import React from "react";
import { ListItem, ListItemText, ListItemAvatar, Avatar, Tooltip } from "@mui/material";
import { generateAvatarColor } from "../../../utils/helperFunctions";

const ContactListItem = ({ contact }) => {
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
};

export default ContactListItem;
