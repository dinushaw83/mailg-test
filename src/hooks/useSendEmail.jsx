import React, { useState, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import { GlobalContext } from "../contexts/GlobalContext";
import {
  generateThreadId,
  generateLegacyThreadId,
  generateNextIntegerId,
  isValidEmail,
  restructureRecipients,
} from "../utils/helperFunctions";

export const useSendEmail = (replyType = null, originalEmail = null) => {
  const navigate = useNavigate();
  const { emails, setEmails, setSnackbar, loggedInUser, recipients, setRecipients } = useContext(GlobalContext);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Please specify at least one recipient.");
  const lastSentEmailRef = useRef(null);
  const lastDeletedDraftRef = useRef(null);
  const sendTimeoutRef = useRef(null);

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSend = ({
    to,
    cc,
    bcc,
    subject,
    content,
    rawInputText,
    onClose,
    currentDraftId,
    isDraft,
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
      const confirmed = confirm("Send this message without a subject or text in the body?");
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

    // If all validations pass, send the email
    sendEmail({ to, cc, bcc, subject, content, onClose, currentDraftId, isDraft, attachments, embeddedImages });
  };

  const sendEmail = ({
    to,
    cc,
    bcc,
    subject,
    content,
    onClose,
    currentDraftId,
    isDraft,
    attachments,
    embeddedImages,
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
      read: true,
      starred: false,
      important: false,
      labels: ["Sent"],
      labelColor: "#e1e3e1",
      attachments,
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
    lastSentEmailRef.current = newEmail;

    // Get all the recipients
    const allRecipients = [...to, ...cc, ...bcc];

    // Create restructured recipients and loggedInUser for proper comparison
    const restructuredRecipients = restructureRecipients(recipients);
    const restructuredLoggedInUser = restructureRecipients([loggedInUser]);

    // If any of the recipients doesnot present in the recipients or loggedInUser context, add them
    const newRecipients = allRecipients.filter(
      (recipient) => ![...restructuredRecipients, ...restructuredLoggedInUser].some((r) => r.email === recipient.email)
    );
    if (newRecipients.length > 0) {
      const updatedRecipients = [...recipients];
      newRecipients.forEach((recipient, index) => {
        updatedRecipients.push({
          ...recipient,
          emails: [
            {
              value: recipient.email,
              label: "",
            },
          ],
          id: generateNextIntegerId(recipients) + index,
          isSaved: false,
          isFavorite: false,
          labels: [],
        });
      });
      setRecipients(updatedRecipients);
    }

    // Close the compose modal
    onClose();

    // Show "Sending..." snackbar with Cancel button
    setSnackbar({
      open: true,
      message: "Sending...",
      action: (
        <Button variant="text" size="medium" onClick={handleSnackbarCancel} sx={{ textTransform: "capitalize" }}>
          Cancel
        </Button>
      ),
      autoHideDuration: null,
    });

    // Simulate sending process
    if (sendTimeoutRef.current) {
      clearTimeout(sendTimeoutRef.current);
    }
    sendTimeoutRef.current = setTimeout(() => {
      // Update emails array - replace draft with sent email if it was a draft, otherwise add new email
      const updatedEmails = isDraft
        ? emails.map((email) => (email.id?.toString() === newEmail.id?.toString() ? newEmail : email))
        : [newEmail, ...emails];

      // Update the global state
      setEmails(updatedEmails);

      // Then show "Message sent" snackbar with Undo and View message buttons
      setSnackbar({
        open: true,
        message: "Message sent",
        action: (
          <React.Fragment>
            <Button variant="text" size="medium" onClick={handleSnackbarUndo} sx={{ textTransform: "capitalize" }}>
              Undo
            </Button>
            <Button
              variant="text"
              size="medium"
              onClick={handleSnackbarViewMessage}
              sx={{ textTransform: "capitalize" }}
            >
              View message
            </Button>
          </React.Fragment>
        ),
        autoHideDuration: 4000,
      });
    }, 500);
  };

  const handleSnackbarCancel = () => {
    // Clear the send timeout
    if (sendTimeoutRef.current) {
      clearTimeout(sendTimeoutRef.current);
      sendTimeoutRef.current = null;
    }

    // Show "Cancelling..." message
    setSnackbar({
      open: true,
      message: "Cancelling...",
      action: null,
      autoHideDuration: 1000,
    });

    // After 1 second, show "Sending canceled"
    setTimeout(() => {
      // Push compose parameter to URL if not a reply/forward
      if (!replyType) {
        navigate(`?compose=${lastSentEmailRef.current?.id}`);
      }

      // Show "Sending canceled" snackbar
      setSnackbar({
        open: true,
        message: "Sending canceled.",
        action: null,
        autoHideDuration: 5000,
      });
    }, 1000);
  };

  const handleSnackbarUndo = () => {
    // Show "Undoing..." message
    setSnackbar({
      open: true,
      message: "Undoing...",
      action: null,
      autoHideDuration: 1000,
    });

    // After 1 second, remove email from state and show "Sending undone"
    setTimeout(() => {
      // Double-check that the email still exists
      if (lastSentEmailRef.current && lastSentEmailRef.current.id) {
        const emailToRestore = lastSentEmailRef.current;

        // Remove the email from the state
        setEmails((prevEmails) => {
          return prevEmails.map((email) =>
            email.id === emailToRestore.id
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
                }
              : email
          );
        });

        // Navigate to the draft
        if (!replyType) {
          navigate(`?compose=${emailToRestore.id}`);
        }

        // Clear the ref after successful state update
        lastSentEmailRef.current = null;
      }

      setSnackbar({
        open: true,
        message: "Sending undone",
        action: null,
        autoHideDuration: 5000,
      });
    }, 1000);
  };

  const handleSnackbarViewMessage = () => {
    // Hide the snackbar
    setSnackbar({ open: false, action: null, autoHideDuration: null, message: "" });

    const threadId = lastSentEmailRef.current?.threadId.split(":")[1];

    // Navigate to the message in the sent items
    navigate(`/sent/${threadId}`);
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage("Please specify at least one recipient."); // Reset to default message
  };

  const handleSnackbarUndoDelete = (onUndoDelete) => {
    if (lastDeletedDraftRef.current) {
      const deletedDraft = lastDeletedDraftRef.current;

      // Create a new draft email with the restored data
      const restoredDraft = {
        id: deletedDraft.id,
        threadId: deletedDraft.threadId || generateThreadId(),
        legacyThreadId: deletedDraft.legacyThreadId || generateLegacyThreadId(),
        legacyLastMessageId: deletedDraft.legacyLastMessageId || generateLegacyThreadId(),
        legacyLastNonDraftMessageId: null,
        from: {
          name: loggedInUser.name,
          email: loggedInUser.email,
        },
        to: deletedDraft.to.map((recipient) => recipient.email),
        cc: deletedDraft.cc.length > 0 ? deletedDraft.cc.map((recipient) => recipient.email) : [],
        bcc: deletedDraft.bcc.length > 0 ? deletedDraft.bcc.map((recipient) => recipient.email) : [],
        subject: deletedDraft.subject.trim() || "(no subject)",
        body: deletedDraft.content.html,
        preview: deletedDraft.content.plainText,
        timestamp: new Date().toISOString(),
        timeDisplay: new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
        read: true,
        replyType: deletedDraft.replyType,
        starred: false,
        important: false,
        labels: ["Drafts"],
        labelColor: "#e1e3e1",
      };

      // Add the restored draft back to emails
      setEmails((prevEmails) => [restoredDraft, ...prevEmails]);

      // Call the callback with the restored draft ID
      if (onUndoDelete) {
        onUndoDelete(deletedDraft.id);
      }

      // Clear the ref
      lastDeletedDraftRef.current = null;

      // Hide the snackbar
      setSnackbar({ open: false, action: null, autoHideDuration: null, message: "" });
    }
  };

  return {
    handleSend,
    showErrorModal,
    errorMessage,
    handleErrorModalClose,
    handleSnackbarUndoDelete,
    lastDeletedDraftRef,
    lastSentEmailRef,
  };
};
