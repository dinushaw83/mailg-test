import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useGlobalContext } from "../../contexts/GlobalContext";
import ContactsTable from "../../components/Contacts/ContactsTable";

const Contacts = () => {
  const { recipients } = useGlobalContext();
  const myContacts = recipients.filter((recipient) => recipient?.isSaved);
  const favoriteContacts = recipients.filter((recipient) => recipient?.isFavorite);

  useEffect(() => {
    // Set document title to MailG Contacts
    document.title = "MailG Contacts";
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
          Contacts
        </Typography>
        {myContacts.length > 0 ? (
          <span style={{ marginLeft: "8px", fontSize: "0.875rem", fontWeight: 500 }}>({myContacts.length})</span>
        ) : (
          ""
        )}
      </Box>

      {/* Contacts list */}
      <ContactsTable
        contacts={[
          {
            heading: (
              <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "#444746" }}>
                <span className="material-symbols-filled" style={{ fontSize: "20px", marginRight: "4px" }}>
                  star
                </span>
                Favorites ({favoriteContacts.length})
              </p>
            ),
            title: "Favorites",
            data: favoriteContacts,
          },
          {
            heading: (
              <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "#444746" }}>Contacts</p>
            ),
            title: "Contacts",
            data: myContacts,
          },
        ].slice(favoriteContacts.length > 0 ? 0 : 1)}
      />
    </Box>
  );
};

export default Contacts;
