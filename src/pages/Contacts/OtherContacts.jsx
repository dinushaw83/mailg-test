import React from "react";
import { Box, Typography } from "@mui/material";
import ContactsTable from "../../components/Contacts/ContactsTable";
import { useGlobalContext } from "../../contexts/GlobalContext";

const OtherContacts = () => {
  const { recipients } = useGlobalContext();
  const otherContacts = recipients.filter((recipient) => !recipient.labels.includes("My contacts"));

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
          Other contacts
        </Typography>
      </Box>

      {/* Contacts list */}
      <ContactsTable contacts={otherContacts?.length > 0 ? [{ heading: "", data: otherContacts }] : []} />
    </Box>
  );
};

export default OtherContacts;
