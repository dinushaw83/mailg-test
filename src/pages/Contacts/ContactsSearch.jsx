import React, { useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useParams } from "react-router-dom";
import ContactsTable from "../../components/Contacts/ContactsTable";
import { useGlobalContext } from "../../contexts/GlobalContext";

const ContactsSearch = () => {
  const { query } = useParams();
  const { recipients } = useGlobalContext();

  useEffect(() => {
    // Update the document title
    document.title = "Search results";
  }, []);

  // Filter contacts that have both name and email
  const validContacts = useMemo(
    () => recipients.filter((contact) => contact && contact.name && contact.email && contact.name.trim() !== ""),
    [recipients]
  );

  // Search results computed with useMemo
  const searchResults = useMemo(() => {
    if (!query?.trim()) {
      return [];
    }

    const queryLower = query.toLowerCase();

    return validContacts
      .map((contact) => {
        const nameLower = contact.name.toLowerCase();
        const emailLower = contact.email.toLowerCase();

        let score = 0;
        let nameMatch = false;
        let emailMatch = false;

        // Check for exact matches (highest priority)
        if (nameLower === queryLower) {
          score = 1000; // Highest score for exact name match
          nameMatch = true;
        } else if (emailLower === queryLower) {
          score = 900; // High score for exact email match
          emailMatch = true;
        }
        // Check for starts with matches (high priority)
        else if (nameLower.startsWith(queryLower)) {
          score = 800; // High score for name starts with
          nameMatch = true;
        } else if (emailLower.startsWith(queryLower)) {
          score = 700; // High score for email starts with
          emailMatch = true;
        }
        // Check for contains matches (lower priority)
        else if (nameLower.includes(queryLower)) {
          score = 600; // Medium score for name contains
          nameMatch = true;
        } else if (emailLower.includes(queryLower)) {
          score = 500; // Medium score for email contains
          emailMatch = true;
        }

        // Only return contacts that have at least one match
        if (nameMatch || emailMatch) {
          return { contact, score };
        }
        return null;
      })
      .filter(Boolean) // Remove null entries
      .sort((a, b) => b.score - a.score) // Sort by score (highest first)
      .map((item) => item.contact); // Extract just the contact objects
  }, [query, validContacts]);

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
      <Typography variant="h6" sx={{ fontWeight: 400, fontSize: "1.5rem", color: "#444746", mx: 1.5 }}>
        Search results
      </Typography>

      {/* No results message */}
      {searchResults.length === 0 && query && (
        <Box sx={{ mx: 1.5, mt: 1.5 }}>
          <Typography sx={{ color: "#444746", fontSize: "0.75rem", fontWeight: 500, mb: 3 }}>Contacts</Typography>
          <Typography sx={{ color: "#1f1f1f", fontSize: "0.875rem", fontWeight: 400 }}>
            No results in your contacts
          </Typography>
        </Box>
      )}

      {/* Contacts list */}
      {searchResults.length > 0 && (
        <ContactsTable
          contacts={[
            {
              heading: <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "#444746" }}>Contacts</p>,
              title: "Contacts",
              data: searchResults?.filter((recipient) => recipient?.isSaved),
            },
            {
              heading: <p style={{ fontSize: "0.75rem", fontWeight: 500, color: "#444746" }}>Other contacts</p>,
              title: "Other contacts",
              data: searchResults?.filter((recipient) => !recipient?.isSaved),
            },
          ].slice(
            0,
            searchResults?.filter((recipient) => !recipient?.isSaved).length === 0 ? 1 : 2
          )}
          hidePrintExport={true}
        />
      )}
    </Box>
  );
};

export default ContactsSearch;
