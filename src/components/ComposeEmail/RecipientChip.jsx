import React from "react";
import { Avatar, Chip } from "@mui/material";
import ContactPopup from "../Contacts/ContactPopup";
import { generateAvatarColor } from "../../utils/helperFunctions";

export default function RecipientChip({ recipient, onDelete, isDuplicate = false }) {
  const isCustomRecipient = recipient.id && typeof recipient.id === "string" && recipient.id.startsWith("custom-");
  const name = recipient.name || recipient.email || "";
  const avatarColor = generateAvatarColor(name);
  const initials = name.charAt(0).toUpperCase();

  return (
    <ContactPopup contact={recipient}>
      <Chip
        avatar={
          <Avatar
            sx={{
              bgcolor: isDuplicate ? "#fdecea" : isCustomRecipient ? "#a0c3ff" : avatarColor,
              color: isDuplicate ? "#b3261f" : isCustomRecipient ? "#1976d2" : "white",
              fontSize: "12px",
              width: 24,
              height: 24,
            }}
          >
            {isCustomRecipient ? (
              <span className="material-symbols-filled" style={{ fontSize: "28px", marginTop: "8px" }}>
                person
              </span>
            ) : recipient.avatar ? (
              <img
                src={recipient.avatar}
                alt={recipient.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </Avatar>
        }
        label={recipient.email}
        onDelete={onDelete}
        deleteIcon={<span className="material-symbols-outlined">close</span>}
        size="small"
        sx={{
          height: 28,
          backgroundColor: isDuplicate ? "#fdecea" : "white",
          boxShadow: isDuplicate
            ? "0 0 0 1px #f1b8b3 inset"
            : "0 0 0 1px var(--pkw-outline,rgb(218,220,224)) inset",
          "& .MuiChip-label": {
            fontSize: "14px",
            fontWeight: 500,
            color: isDuplicate ? "#b3261f" : "rgb(95,99,104)",
          },
          "& .MuiChip-deleteIcon": {
            fontSize: "20px",
            color: isDuplicate ? "#b3261f" : "rgba(0, 0, 0, 0.6)",
          },
          "&:hover": {
            backgroundColor: isDuplicate ? "#fbe4e1" : "rgba(0, 0, 0, 0.06)",
            cursor: "pointer",
          },
          "&:hover .MuiChip-label": {
            color: isDuplicate ? "#8b1f16" : "rgba(0, 0, 0, 0.8)",
          },
          "&:hover .MuiChip-deleteIcon": {
            color: isDuplicate ? "#8b1f16" : "rgba(0, 0, 0, 0.8)",
          },
          ".MuiChip-avatar": {
            color: isDuplicate ? "#b3261f" : isCustomRecipient ? "#1976d2" : "white",
          },
          ".MuiChip-avatarSmall": {
            marginLeft: "2px",
            width: "24px",
            height: "24px",
          },
        }}
        title={isDuplicate ? "Duplicate recipient" : undefined}
      />
    </ContactPopup>
  );
}
