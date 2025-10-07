import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import { useGlobalContext } from '../../contexts/GlobalContext';

const ContactDetails = () => {
  const { recipients } = useGlobalContext();
  const { contactId } = useParams();

  // Get the contact from the recipients
  const contact = recipients.find((recipient) => recipient.id?.toString() === contactId?.toString());

  useEffect(() => {
    // Update the document title
    const title = contact?.name ?? contact?.email ?? "Contact";
    document.title = `${title} - MailG Contacts`;
  }, []);

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
          Contact Details
        </Typography>
      </Box>
      <h2 style={{ textAlign: "center" }}>Coming soon</h2>
    </Box>
  );
};

export default ContactDetails;
