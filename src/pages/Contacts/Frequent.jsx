import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import ContactsTable from "../../components/Contacts/ContactsTable";
import { useGlobalContext } from "../../contexts/GlobalContext";

const Frequent = () => {
  const { recipients, emails } = useGlobalContext();

  // Find frequently contacted contacts based on email frequency
  const frequentContacts = useMemo(() => {
    if (!emails || emails.length === 0) return [];

    // Step 1: Collect all email addresses from from, to, cc, bcc
    const allEmails = emails.flatMap((email) => {
      const emails = [];

      // Add 'from' email
      if (email.from && email.from.email) {
        emails.push(email.from.email);
      }

      // Add 'to' emails
      if (Array.isArray(email.to)) {
        emails.push(...email.to);
      }

      // Add 'cc' emails
      if (Array.isArray(email.cc)) {
        emails.push(...email.cc);
      }

      // Add 'bcc' emails
      if (Array.isArray(email.bcc)) {
        emails.push(...email.bcc);
      }

      return emails;
    });

    // Step 2: Count frequency of each email
    const emailFrequency = {};
    allEmails.forEach((email) => {
      emailFrequency[email] = (emailFrequency[email] || 0) + 1;
    });

    // Step 3: Filter emails based on frequency (3+, 2+, or all)
    let frequentEmails = [];

    // First try: emails used 3 or more times
    frequentEmails = Object.keys(emailFrequency).filter((email) => emailFrequency[email] >= 3);

    // If empty, try emails used 2 or more times
    if (frequentEmails.length === 0) {
      frequentEmails = Object.keys(emailFrequency).filter((email) => emailFrequency[email] >= 2);
    }

    // If still empty, use all emails
    if (frequentEmails.length === 0) {
      frequentEmails = Object.keys(emailFrequency);
    }

    // Step 4: Find contacts that match these frequent emails
    const frequentContactsList = recipients.filter((recipient) => {
      if (!recipient.emails || !Array.isArray(recipient.emails)) return false;

      return recipient.emails.some((emailObj) => frequentEmails.includes(emailObj.value));
    });

    // Sort by frequency (most frequent first)
    frequentContactsList.sort((a, b) => {
      const aMaxFreq = Math.max(...a.emails.map((emailObj) => emailFrequency[emailObj.value] || 0));
      const bMaxFreq = Math.max(...b.emails.map((emailObj) => emailFrequency[emailObj.value] || 0));
      return bMaxFreq - aMaxFreq;
    });

    return frequentContactsList;
  }, [emails, recipients]);

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
          Frequently contacted
        </Typography>
      </Box>

      {/* Contacts list */}
      <ContactsTable contacts={frequentContacts?.length > 0 ? [{ heading: "", data: frequentContacts, title: "Frequent Contacts" }] : []} />
    </Box>
  );
};

export default Frequent;
