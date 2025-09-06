import React, { useState, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import { GlobalContext } from "../contexts/GlobalContext";
import { generateThreadId, generateLegacyThreadId, generateNextEmailId } from "../utils/helperFunctions";

export const useSendEmail = (replyTo, forward, originalEmail) => {
  const navigate = useNavigate();
  const { emails, setEmails, setSnackbar, loggedInUser } = useContext(GlobalContext);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Please specify at least one recipient.");
  const lastSentEmailRef = useRef(null);

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSend = ({ to, cc, bcc, subject, content, rawInputText, onClose }) => {
    // 1. Check if all recipient fields are empty
    const hasNoRecipients = (!to || to.length === 0) && (!cc || cc.length === 0) && (!bcc || bcc.length === 0);

    if (hasNoRecipients) {
      setShowErrorModal(true);
      return;
    }

    // 2. Check if subject is missing - only for new emails, not for replies/forwards
    if (!subject.trim() && !replyTo && !forward) {
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
    sendEmail({ to, cc, bcc, subject, content, onClose });
  };

  const sendEmail = ({ to, cc, bcc, subject, content, onClose }) => {
    const newId = generateNextEmailId(emails);
    // Use original email's thread IDs for replies/forwards, or generate new ones
    const threadId = (replyTo || forward) && originalEmail ? originalEmail.threadId : generateThreadId();
    const legacyThreadId = (replyTo || forward) && originalEmail ? originalEmail.legacyThreadId : generateLegacyThreadId();
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
      from: {
        name: loggedInUser.name,
        email: loggedInUser.email,
      },
      to: to.map((recipient) => recipient.email || recipient),
      cc: cc.length > 0 ? cc.map((recipient) => recipient.email || recipient) : [],
      bcc: bcc.length > 0 ? bcc.map((recipient) => recipient.email || recipient) : [],
      subject: subject.trim() || "(no subject)",
      body: content.html,
      preview: content.plainText,
      timestamp: timestamp,
      timeDisplay: timeDisplay,
      read: false,
      starred: false,
      important: false,
      labels: ["Sent"],
      labelColor: "#e1e3e1",
    };

    // Add reply/forward reference if applicable
    if (replyTo) {
      newEmail.replyToEmailId = replyTo;
    }
    if (forward) {
      newEmail.forwardedEmailId = forward;
    }

    // Store the email data for potential cancellation
    lastSentEmailRef.current = newEmail;

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
    setTimeout(() => {
      // Add the new email to the beginning of the emails array
      const updatedEmails = [newEmail, ...emails];

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
      if (!replyTo && !forward) {
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
        const emailToRemove = lastSentEmailRef.current;

        // Remove the email from the state
        setEmails((prevEmails) => {
          const filteredEmails = prevEmails.filter((email) => email.id !== emailToRemove.id);

          // Push compose parameter to URL if not a reply/forward
          if (!replyTo && !forward) {
            navigate(`?compose=${emailToRemove?.id}`);
          }

          // Clear the ref after successful state update
          lastSentEmailRef.current = null;

          return filteredEmails;
        });
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
    // TODO: Open the message from sent items
    console.log("View message clicked");
  };

  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage("Please specify at least one recipient."); // Reset to default message
  };

  return {
    handleSend,
    showErrorModal,
    errorMessage,
    handleErrorModalClose
  };
};
