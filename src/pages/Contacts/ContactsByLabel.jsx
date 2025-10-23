import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import ContactsTable from "../../components/Contacts/ContactsTable";
import { useGlobalContext } from "../../contexts/GlobalContext";

const ContactsByLabel = () => {
  const { recipients, recipientLabels } = useGlobalContext();
  const { labelId } = useParams();
  // Try to find label by ID (support both string and numeric IDs)
  const label = recipientLabels.find((label) => label.id === labelId || label.id === parseInt(labelId));
  // Filter contacts with this label, excluding deleted ones
  const contacts = recipients.filter((recipient) => label?.label && recipient.labels?.includes(label.label) && !recipient.isDeleted);

  useEffect(() => {
    // Update the document title
    if (label?.label) {
      document.title = `Label - ${label.label}`;
    }
  }, [labelId, label]);

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        margin: "16px 16px 16px 20px",
        borderRadius: "24px",
        width: "100%",
        height: "calc(100vh - 146px)",
        pl: 1.5,
        py: 3,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", px: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 400, fontSize: "1.5rem", color: "#444746" }}>
          {label?.label}
        </Typography>
        <span style={{ marginLeft: "8px", fontSize: "0.875rem", fontWeight: 500 }}>({contacts.length})</span>
      </Box>

      {/* Contacts list */}
      {contacts?.length > 0 ? (
        <ContactsTable contacts={[{ heading: "", data: contacts, title: "Contacts by Label" }]} currentLabel={label} />
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            width: "100%",
          }}
        >
          <Box
            sx={{
              backgroundColor: "#e0e0e0",
              borderRadius: "50%",
              width: "150px",
              height: "150px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mb: 3.5,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "120px", color: "#9e9e9e" }}>
              auto_stories
            </span>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 400, fontSize: "1rem", color: "#1f1f1f" }}>
            No contacts with this label
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ContactsByLabel;
