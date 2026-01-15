import React, { useRef, useState } from "react";
import { beToFeDraft, feToBeDraftUpdatePayload } from "../utils/draftMapper";
import { cancelSendEmailByIdThunk, fetchEmailByIdThunk, sendEmailByIdThunk, setEmailsForCategory, updateDraftThunk } from "../store/slices/mailSlice";
import { extractEmbeddedImageIds, updateEmbeddedImagesEmailId } from "../utils/embeddedImages";
import {
  generateLegacyThreadId,
  generateNextIntegerId,
  generateThreadId,
  isValidEmail,
  restructureRecipients,
} from "../utils/helperFunctions";

import { Button } from "@mui/material";
import { store } from "../store";
import { useDispatch } from "react-redux";
import { useGlobalContext } from "../contexts/GlobalContext";
import { useNavigate } from "react-router-dom";

// Helper to check if a string is a UUID
const isUUID = (str) => {
  if (!str || typeof str !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const useSendEmail = (replyType = null, originalEmail = null) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    emails,
    setEmails,
    setSnackbar,
    loggedInUser,
    recipients,
    setRecipients,
    db,
    hiddenRecipients,
    deletedRecipients,
  } = useGlobalContext();
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

  const handleSend = async ({
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

    // Duplicate detection removed: allows duplicates across To/Cc/Bcc

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

    // 4. If there are blocked attachments (e.g., risky extensions <25MB), ask to send without them
    const hasBlocked = Array.isArray(attachments) && attachments.some((a) => a && a.isBlocked === true);
    let sanitizedAttachments = attachments;
    if (hasBlocked) {
      const confirmed = confirm(
        "Note: there were errors attaching your file(s). Send this message without these attachments?"
      );
      if (!confirmed) return; // user chose Cancel
      sanitizedAttachments = attachments.filter((a) => !a?.isBlocked);
    }

    // If all validations pass, send the email
    await sendEmail({
      to,
      cc,
      bcc,
      subject,
      content,
      onClose,
      currentDraftId,
      isDraft,
      attachments: sanitizedAttachments,
      embeddedImages,
    });
  };

  const sendEmail = async ({
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
    // If we have a draft ID (UUID from backend), use the send by ID API
    if (currentDraftId && isUUID(currentDraftId.toString())) {
      try {
        // Show "Sending..." snackbar
        setSnackbar({
          open: true,
          message: "Sending...",
          action: null,
          autoHideDuration: null,
        });

        // First, update the draft with latest compose window data
        const recipients = [
          ...(to || []).map((r) => ({
            email: r.email || r.name || r,
            name: r.name || r.email || r,
            type: "to",
          })),
          ...(cc || []).map((r) => ({
            email: r.email || r.name || r,
            name: r.name || r.email || r,
            type: "cc",
          })),
          ...(bcc || []).map((r) => ({
            email: r.email || r.name || r,
            name: r.name || r.email || r,
            type: "bcc",
          })),
        ];
        const updatePayload = feToBeDraftUpdatePayload({
          subject,
          content,
          is_read: true,
          is_starred: false,
          is_important: false,
          folder: "drafts",
          category: "primary",
          recipients,
        });

        // Update draft first
        const updateAction = await dispatch(updateDraftThunk({ emailId: currentDraftId, draftData: updatePayload }));
        
        if (!updateDraftThunk.fulfilled.match(updateAction)) {
          // If update fails, still try to send (draft might be up-to-date)
          console.warn("Failed to update draft before sending:", updateAction.payload || updateAction.error);
        }

        // Then send email by ID
        const action = await dispatch(sendEmailByIdThunk(currentDraftId));

        if (sendEmailByIdThunk.fulfilled.match(action)) {
          // Fetch the sent email to get complete data
          const sentEmailData = await dispatch(fetchEmailByIdThunk(action.payload.emailId)).unwrap();
          const feSentEmail = beToFeDraft(sentEmailData);

          if (feSentEmail) {
            // Add to Redux sent emails
            const state = store.getState();
            const currentSent = state.mail.sent || [];
            const filteredSent = currentSent.filter(
              (email) => email.id?.toString() !== feSentEmail.id?.toString()
            );
            const updatedSent = [feSentEmail, ...filteredSent];
            dispatch(setEmailsForCategory({ category: "sent", emails: updatedSent }));

            // Remove from drafts if it was a draft
            if (isDraft) {
              const currentDrafts = state.mail.drafts || [];
              const filteredDrafts = currentDrafts.filter(
                (email) => email.id?.toString() !== currentDraftId?.toString()
              );
              dispatch(setEmailsForCategory({ category: "drafts", emails: filteredDrafts }));
            }
          }

          // Store sent email data in ref for un-send functionality
          lastSentEmailRef.current = {
            ...feSentEmail,
            emailId: action.payload.emailId, // Store backend email ID for un-send API call
          };

          // Close compose window
          onClose();

          // Show success snackbar with Undo button
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
        } else {
          // Handle error
          setSnackbar({
            open: true,
            message: action.payload || "Failed to send email",
            action: null,
            autoHideDuration: 5000,
          });
        }
      } catch (error) {
        console.error("Error sending email:", error);
        setSnackbar({
          open: true,
          message: "Failed to send email",
          action: null,
          autoHideDuration: 5000,
        });
      }
      return;
    }

    // Fallback to existing local send logic for non-draft emails
    // Use the draftId if it exists, otherwise generate a new id
    const newId = currentDraftId ? currentDraftId : generateNextIntegerId(emails);
    // Use original email's thread IDs for replies/forwards, or generate new ones
    const isReplyMode = replyType === "reply" || replyType === "replyAll";
    const shouldReuseThread = originalEmail && (isReplyMode || replyType === "forward");
    const thread_id = shouldReuseThread ? originalEmail.thread_id : generateThreadId();
    const legacyThreadId = shouldReuseThread ? originalEmail.legacyThreadId : generateLegacyThreadId();
    const timestamp = new Date().toISOString();
    const timeDisplay = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Create the new email object
    const newEmail = {
      id: newId,
      thread_id: thread_id,
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
    if (isReplyMode && originalEmail) {
      newEmail.replyToEmailId = originalEmail.id;
    }
    if (replyType === "forward" && originalEmail) {
      newEmail.forwardedEmailId = originalEmail.id;
    }

    // Store the email data for potential cancellation
    lastSentEmailRef.current = newEmail;

    // Update emailId for embedded images if we have any
    if (embeddedImages && embeddedImages.length > 0 && db) {
      try {
        const imageIds = embeddedImages.map((img) => img.id);
        await updateEmbeddedImagesEmailId(db, imageIds, newId.toString());
      } catch (error) {
        console.error("Failed to update embedded images emailId:", error);
      }
    }

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
          id: generateNextIntegerId([...recipients, ...hiddenRecipients, ...deletedRecipients]) + index,
          isSaved: false,
          isFavorite: false,
          labels: [],
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          savedAt: null,
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

  const handleSnackbarUndo = async () => {
    if (!lastSentEmailRef.current) return;

    const sentEmail = lastSentEmailRef.current;
    const emailId = sentEmail.emailId || sentEmail.id;

    // Show "Undoing..." message
    setSnackbar({
      open: true,
      message: "Undoing...",
      action: null,
      autoHideDuration: 1000,
    });

    try {
      // Call un-send API endpoint
      const action = await dispatch(cancelSendEmailByIdThunk(emailId));

      if (cancelSendEmailByIdThunk.fulfilled.match(action)) {
        // Fetch the updated email (now back to draft) to get complete data
        const draftEmailData = await dispatch(fetchEmailByIdThunk(emailId)).unwrap();
        const feDraftEmail = beToFeDraft(draftEmailData);

        if (feDraftEmail) {
          // Remove from sent emails
          const state = store.getState();
          const currentSent = state.mail.sent || [];
          const filteredSent = currentSent.filter(
            (email) => email.id?.toString() !== emailId?.toString()
          );
          dispatch(setEmailsForCategory({ category: "sent", emails: filteredSent }));

          // Add back to drafts
          const currentDrafts = state.mail.drafts || [];
          const filteredDrafts = currentDrafts.filter(
            (email) => email.id?.toString() !== emailId?.toString()
          );
          const updatedDrafts = [feDraftEmail, ...filteredDrafts];
          dispatch(setEmailsForCategory({ category: "drafts", emails: updatedDrafts }));
        }

        // Clear the ref
        lastSentEmailRef.current = null;

        // Show success message
        setSnackbar({
          open: true,
          message: "Sending undone.",
          action: null,
          autoHideDuration: 5000,
        });
      } else {
        // Handle error
        console.error("Failed to undo send:", action.payload || action.error);
        setSnackbar({
          open: true,
          message: action.payload || "Failed to undo send.",
          action: null,
          autoHideDuration: 5000,
        });
      }
    } catch (error) {
      console.error("Failed to undo send:", error);
      setSnackbar({
        open: true,
        message: "Failed to undo send.",
        action: null,
        autoHideDuration: 5000,
      });
    }
  };

  const handleSnackbarViewMessage = () => {
    // Hide the snackbar
    setSnackbar({ open: false, action: null, autoHideDuration: null, message: "" });

    const thread_id = lastSentEmailRef.current?.thread_id;

    // Navigate to the message in the sent items
    navigate(`/sent/${thread_id}`);
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
        thread_id: deletedDraft.thread_id || generateThreadId(),
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
