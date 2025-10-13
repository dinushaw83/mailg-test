import React, { useState, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import { GlobalContext } from "../contexts/GlobalContext";
import {
  generateThreadId,
  generateLegacyThreadId,
  generateNextIntegerId,
  restructureRecipients,
  isValidEmail,
} from "../utils/helperFunctions";

export const useScheduleEmail = (replyType = null, originalEmail = null) => {
  const navigate = useNavigate();
  const { emails, setEmails, setSnackbar, loggedInUser, recipients, setRecipients } = useContext(GlobalContext);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Please specify at least one recipient.");
  const lastScheduledEmailRef = useRef(null);

  const handleSchedule = ({
    to,
    cc,
    bcc,
    subject,
    content,
    rawInputText,
    onClose,
    currentDraftId,
    isDraft,
    scheduledDate,
    scheduledTime,
    attachments,
    embeddedImages,
  }) => {
    // 1. Check if all recipient fields are empty
    const hasNoRecipients = (!to || to.length === 0) && (!cc || cc.length === 0) && (!bcc || bcc.length === 0);

    if (hasNoRecipients) {
      setShowErrorModal(true);
      return;
    }

    // 2. Check if subject is missing - only for new emails, not for replies/forwards
    if (!subject.trim() && !replyType) {
      const confirmed = confirm("Schedule this message without a subject or text in the body?");
      if (!confirmed) {
        return;
      }
    }

    // 3. Check for invalid emails (both in chips and raw input text)
    const allRecipients = [...to, ...cc, ...bcc];

    // Check chips for invalid emails
    const invalidRecipient = allRecipients.find((recipient) => {
      const email = recipient.email || recipient.name || recipient;
      return !isValidEmail(email);
    });

    // Check raw input text for invalid emails
    const rawInputs = [rawInputText?.to, rawInputText?.cc, rawInputText?.bcc];
    const fieldNames = ["To", "Cc", "Bcc"];

    for (let i = 0; i < rawInputs.length; i++) {
      const inputText = rawInputs[i]?.trim() || "";
      if (inputText && !isValidEmail(inputText)) {
        setShowErrorModal(true);
        setErrorMessage(
          `The address "${inputText}" in the "${fieldNames[i]}" field was not recognized. Please make sure that all addresses are properly formed.`
        );
        return;
      }
    }

    if (invalidRecipient) {
      // Get the actual invalid text (could be email, name, or the recipient itself)
      const invalidText = invalidRecipient.email || invalidRecipient.name || invalidRecipient;

      // Determine which field the invalid email is in
      let fieldName = "To";
      if (cc.some((r) => (r.email || r.name || r) === invalidText)) {
        fieldName = "Cc";
      } else if (bcc.some((r) => (r.email || r.name || r) === invalidText)) {
        fieldName = "Bcc";
      }

      setShowErrorModal(true);
      setErrorMessage(
        `The address "${invalidText}" in the "${fieldName}" field was not recognized. Please make sure that all addresses are properly formed.`
      );
      return;
    }

    // If all validations pass, schedule the email
    scheduleEmail({ to, cc, bcc, subject, content, onClose, currentDraftId, isDraft, scheduledDate, scheduledTime });
  };

  const scheduleEmail = ({
    to,
    cc,
    bcc,
    subject,
    content,
    onClose,
    currentDraftId,
    isDraft,
    scheduledDate,
    scheduledTime,
  }) => {
    // Use the draftId if it exists, otherwise generate a new id
    const newId = currentDraftId ? currentDraftId : generateNextIntegerId(emails);
    // Use original email's thread IDs for replies/forwards, or generate new ones
    const threadId = replyType && originalEmail ? originalEmail.threadId : generateThreadId();
    const legacyThreadId = replyType && originalEmail ? originalEmail.legacyThreadId : generateLegacyThreadId();
    const timestamp = new Date().toISOString();
    const timeDisplay = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Create the new email object
    const newEmail = {
      id: newId,
      threadId: threadId,
      legacyThreadId: legacyThreadId,
      legacyLastMessageId: legacyThreadId,
      legacyLastNonDraftMessageId: legacyThreadId,
      replyType: replyType, // Store the reply type
      from: {
        name: loggedInUser.name,
        email: loggedInUser.email,
      },
      to: to.map((recipient) => recipient.email),
      cc: cc.length > 0 ? cc.map((recipient) => recipient.email) : [],
      bcc: bcc.length > 0 ? bcc.map((recipient) => recipient.email) : [],
      subject: subject.trim() || "(no subject)",
      body: content.html,
      preview: content.plainText,
      timestamp: timestamp,
      timeDisplay: timeDisplay,
      read: false,
      starred: false,
      important: false,
      labels: ["Scheduled"], // Changed from "Sent" to "Scheduled"
      labelColor: "#e1e3e1",
      scheduledDate: scheduledDate, // Store the scheduled date as string
      scheduledTime: scheduledTime, // Store the scheduled time as string
      attachments: attachments || [],
      embeddedImages: embeddedImages || [],
    };

    // Add reply/forward reference if applicable
    if (replyType === "reply" && originalEmail) {
      newEmail.replyToEmailId = originalEmail.id;
    }
    if (replyType === "forward" && originalEmail) {
      newEmail.forwardedEmailId = originalEmail.id;
    }

    // Store the email data for potential cancellation
    lastScheduledEmailRef.current = newEmail;

    // Get all the recipients
    const allRecipients = [...to, ...cc, ...bcc];

    // Create restructured recipients for proper comparison
    const restructuredRecipients = restructureRecipients(recipients);

    // If any of the recipients does not present in the recipients context, add them
    const newRecipients = allRecipients.filter(
      (recipient) => !restructuredRecipients.some((r) => r.email === recipient.email)
    );
    if (newRecipients.length > 0) {
      const updatedRecipients = [...recipients];
      newRecipients.forEach((recipient, index) => {
        updatedRecipients.push({
          ...recipient,
          id: generateNextIntegerId(recipients) + index,
        });
      });
      setRecipients(updatedRecipients);
    }

    // Close the compose modal
    onClose();

    // Show "Scheduling..." snackbar
    setSnackbar({
      open: true,
      message: "Scheduling...",
      action: null,
      autoHideDuration: 2000,
    });

    // Update emails array - replace draft with scheduled email if it was a draft, otherwise add new email
    const updatedEmails = isDraft
      ? emails.map((email) => (email.id?.toString() === newEmail.id?.toString() ? newEmail : email))
      : [newEmail, ...emails];

    // Update the global state
    setEmails(updatedEmails);

    // Show "Message scheduled" snackbar with specific date and time
    setTimeout(() => {
      // Format the scheduled date and time
      const formatScheduledDateTime = (dateStr, timeStr) => {
        const date = new Date(dateStr);

        // Format date as "Mon, Sep 29"
        const dateOptions = {
          weekday: "short",
          month: "short",
          day: "numeric",
        };
        const formattedDate = date.toLocaleDateString("en-US", dateOptions);

        // Simply use the time string as-is
        const formattedTime = timeStr;

        return `${formattedDate}, ${formattedTime}`;
      };

      const scheduledDateTime = formatScheduledDateTime(scheduledDate, scheduledTime);

      setSnackbar({
        open: true,
        message: `Send scheduled for ${scheduledDateTime}`,
        action: (
          <React.Fragment>
            <Button variant="text" size="medium" onClick={handleSnackbarUndo} sx={{ textTransform: "capitalize" }}>
              Undo
            </Button>
          </React.Fragment>
        ),
        autoHideDuration: 4000,
      });
    }, 500);
  };

  const handleSnackbarUndo = () => {
    // Show "Undoing..." message
    setSnackbar({
      open: true,
      message: "Undoing...",
      action: null,
      autoHideDuration: 1000,
    });

    // After 1 second, remove email from state and show "Scheduling undone"
    setTimeout(() => {
      // Double-check that the email still exists
      if (lastScheduledEmailRef.current && lastScheduledEmailRef.current.id) {
        const emailToRestore = lastScheduledEmailRef.current;

        // Remove the email from the state
        setEmails((prevEmails) => {
          return prevEmails.map((email) => {
            return email.id === emailToRestore.id
              ? {
                  ...email,
                  labels: ["Drafts"],
                  labelColor: "#e1e3e1",
                  timestamp: new Date().toISOString(),
                  timeDisplay: new Date().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }),
                  scheduledDate: undefined,
                  scheduledTime: undefined,
                }
              : email;
          });
        });

        // Navigate to the draft
        if (!replyType) {
          navigate(`?compose=${emailToRestore.id}`);
        }

        // Clear the ref after successful state update
        lastScheduledEmailRef.current = null;
      }

      setSnackbar({
        open: true,
        message: "Scheduling undone",
        action: null,
        autoHideDuration: 5000,
      });
    }, 1000);
  };

  const handleSnackbarViewMessage = () => {
    // Hide the snackbar
    setSnackbar({ open: false, action: null, autoHideDuration: null, message: "" });

    const threadId = lastScheduledEmailRef.current?.threadId.split(":")[1];

    // Navigate to the message in the scheduled items
    navigate(`/scheduled/${threadId}`);
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage("Please specify at least one recipient."); // Reset to default message
  };

  return {
    handleSchedule,
    showErrorModal,
    errorMessage,
    handleErrorModalClose,
    lastScheduledEmailRef,
  };
};
