import React from "react";
import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import ContactsTable from "../../components/Contacts/ContactsTable";
import { useGlobalContext } from "../../contexts/GlobalContext";

const ContactsByLabel = () => {
  const { recipients, recipientLabels } = useGlobalContext();
  const { labelId } = useParams();
  const label = recipientLabels.find((label) => label.id === parseInt(labelId));
  const contacts = recipients.filter((recipient) => recipient.labels.includes(label.label));

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        margin: "16px 16px 16px 4px",
        borderRadius: "24px",
        width: "calc(100vw - 284px)",
        height: "calc(100vh - 146px)",
        pl: 1.5,
        py: 3,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", px: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 400, fontSize: "1.5rem", color: "#444746" }}>
          {label.label}
        </Typography>
        {contacts.length > 0 ? (
          <span style={{ marginLeft: "8px", fontSize: "0.875rem", fontWeight: 500 }}>({contacts.length})</span>
        ) : (
          ""
        )}
      </Box>

      {/* Contacts list */}
      <ContactsTable contacts={contacts?.length > 0 ? [{ heading: "", data: contacts, title: "Contacts by Label" }] : []} />
    </Box>
  );
};

export default ContactsByLabel;
