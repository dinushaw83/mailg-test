import React, { useState, useContext, useRef, useLayoutEffect, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "@mui/material/Button";
import RichTextEditor from "../RichTextEditor/RichTextEditor";
import RecipientsInput from "./RecipientsInput";
import InfoModal from "./InfoModal";
import { GlobalContext } from "../../contexts/GlobalContext";
import { generateThreadId, generateLegacyThreadId, generateNextIntegerId } from "../../utils/helperFunctions";
import { useDraftManagement } from "../../hooks/useDraftManagement";
import { useComposeModal } from "../../hooks/useComposeModal";
import styles from "./ComposeEmail.module.css";

export default function ComposeEmail({ composeWindow }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { emails, setEmails, setSnackbar, loggedInUser, recipients, composeWindows, setComposeWindows } =
    useContext(GlobalContext);
  const { removeComposeWindow, toggleMinimize, toggleMaximize, visibleWindowCount, addNewComposeWindow } =
    useComposeModal();

  const [to, setTo] = useState([]);
  const [cc, setCc] = useState([]);
  const [bcc, setBcc] = useState([]);
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState({
    html: "",
    plainText: "",
  });

  // Store raw input text for validation
  const [rawInputText, setRawInputText] = useState({
    to: "",
    cc: "",
    bcc: "",
  });

  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Please specify at least one recipient.");
  const lastSentEmailRef = useRef(null);
  const lastDeletedDraftRef = useRef(null);
  const currentDraftId = composeWindow?.draftId;

  // Draft management hook
  const { saveDraftManually, deleteDraft, isDraft, draftId, draftSaved, hasDraftContent } = useDraftManagement({
    to,
    cc,
    bcc,
    subject,
    content,
    currentDraftId,
  });

  // Handle window focus to update URL
  const handleWindowFocus = () => {
    const urlParams = new URLSearchParams(location.search);
    const currentComposeParam = urlParams.get("compose");

    // Only update if the URL doesn't already match this window
    if (currentDraftId && currentComposeParam !== currentDraftId.toString()) {
      urlParams.set("compose", currentDraftId.toString());
      navigate(`${location.pathname}?${urlParams.toString()}`);
    } else if (!currentDraftId && currentComposeParam !== "new") {
      urlParams.set("compose", "new");
      navigate(`${location.pathname}?${urlParams.toString()}`);
    }
  };

  // Load existing draft if draftId exists in the compose window when the component mounts before painting to ui
  useLayoutEffect(() => {
    if (currentDraftId) {
      // Load existing draft
      const existingDraft = emails.find(
        (email) => email.id.toString() === currentDraftId?.toString() && email.labels.includes("Drafts")
      );
      if (existingDraft) {
        setTo(
          existingDraft.to.map((email) => {
            const recipientObj = recipients.find((r) => r.email === email);
            if (recipientObj) {
              return recipientObj;
            }
            return {
              id: `custom-${email}`,
              name: email,
              email: email,
              avatar: null,
              labels: [],
            };
          })
        );
        setCc(
          existingDraft.cc.map((email) => {
            const recipientObj = recipients.find((r) => r.email === email);
            if (recipientObj) {
              return recipientObj;
            }
            return {
              id: `custom-${email}`,
              name: email,
              email: email,
              avatar: null,
              labels: [],
            };
          })
        );
        setBcc(
          existingDraft.bcc.map((email) => {
            const recipientObj = recipients.find((r) => r.email === email);
            if (recipientObj) {
              return recipientObj;
            }
            return {
              id: `custom-${email}`,
              name: email,
              email: email,
              avatar: null,
              labels: [],
            };
          })
        );
        setSubject(existingDraft.subject === "(no subject)" ? "" : existingDraft.subject);
        setContent({ html: existingDraft.body, plainText: existingDraft.preview });
        setRawInputText({ to: "", cc: "", bcc: "" });
      }
    }
  }, [emails, currentDraftId]);

  // Whenever the draft id is available update it in compose window
  useEffect(() => {
    if (draftId) {
      setComposeWindows((prev) =>
        prev.map((window) => (window.id === composeWindow.id ? { ...window, draftId: draftId } : window))
      );
    }
  }, [draftId]);

  // Calculate compose modal Right position
  const composeModalRightPosition = useMemo(() => {
    const windows = composeWindows.slice(-visibleWindowCount);

    // Find the index of current window from list
    const windowIndex = windows.findIndex((window) => window.id === composeWindow.id);

    let rightPosition = 60; // Base right position

    // If it's the last window, return base position
    if (windowIndex === windows.length - 1) {
      return rightPosition;
    }

    // Calculate position based on windows to the right
    for (let i = windowIndex + 1; i < windows.length; i++) {
      const window = windows[i];
      const isMinimized = window.isMinimized;
      const windowWidth = isMinimized ? 350 : 550;
      const gap = 5; // 5px gap between windows

      rightPosition += gap + windowWidth;
    }

    return rightPosition;
  }, [composeWindows, visibleWindowCount, composeWindow.id]);

  // Toggle minimize/restore modal
  const handleToggleMinimize = () => {
    toggleMinimize(composeWindow.id);
  };

  // Toggle maximize/restore modal
  const handleToggleMaximize = () => {
    toggleMaximize(composeWindow.id);
  };

  // Close the compose email modal
  const handleClose = (saveToDraft = true) => {
    // Save draft if there's content worth saving
    if (hasDraftContent() && saveToDraft) {
      saveDraftManually();
    }

    // Remove the compose window
    removeComposeWindow(composeWindow.id);
  };

  // Validate email format
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSend = () => {
    // 1. Check if all recipient fields are empty
    const hasNoRecipients = (!to || to.length === 0) && (!cc || cc.length === 0) && (!bcc || bcc.length === 0);

    if (hasNoRecipients) {
      setShowErrorModal(true);
      return;
    }

    // 2. Check if subject is missing
    if (!subject.trim()) {
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
    const rawInputs = [rawInputText.to, rawInputText.cc, rawInputText.bcc];
    const fieldNames = ["To", "Cc", "Bcc"];

    for (let i = 0; i < rawInputs.length; i++) {
      const inputText = rawInputs[i].trim();
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
    sendEmail();
  };

  const sendEmail = () => {
    // Use the draftId from the compose window if it exists, otherwise generate a new id
    const newId = currentDraftId ? currentDraftId : generateNextIntegerId(emails);
    const threadId = generateThreadId();
    const legacyThreadId = generateLegacyThreadId();
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
      labels: ["Sent"],
      labelColor: "#e1e3e1",
    };

    // Store the email data for potential cancellation
    lastSentEmailRef.current = newEmail;

    // Close the compose modal
    handleClose(false);

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

  // Handle error modal close
  const handleErrorModalClose = () => {
    setShowErrorModal(false);
    setErrorMessage("Please specify at least one recipient."); // Reset to default message
  };

  // Snackbar handlers
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
      // Push compose parameter to URL
      navigate(`?compose=${lastSentEmailRef.current?.id}`);

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

    // After 1 second, change sent email back to draft
    setTimeout(() => {
      // Double-check that the email still exists
      if (lastSentEmailRef.current && lastSentEmailRef.current.id) {
        const emailToRestore = lastSentEmailRef.current;

        // Change the email from Sent back to Draft
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
        navigate(`?compose=${emailToRestore.id}`);

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

  const handleSnackbarUndoDelete = () => {
    if (lastDeletedDraftRef.current) {
      const deletedDraft = lastDeletedDraftRef.current;

      // Create a new draft email with the restored data
      const restoredDraft = {
        id: deletedDraft.id,
        threadId: generateThreadId(),
        legacyThreadId: generateLegacyThreadId(),
        legacyLastMessageId: generateLegacyThreadId(),
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
        starred: false,
        important: false,
        labels: ["Drafts"],
        labelColor: "#e1e3e1",
      };

      // Add the restored draft back to emails
      setEmails((prevEmails) => [restoredDraft, ...prevEmails]);

      // Open a new compose window with the restored draft
      addNewComposeWindow(deletedDraft.id);

      // Clear the ref
      lastDeletedDraftRef.current = null;

      // Hide the snackbar
      setSnackbar({ open: false, action: null, autoHideDuration: null, message: "" });
    }
  };

  // Remove the email from draft
  const handleDelete = () => {
    if (isDraft) {
      // Store the draft data for potential restoration
      lastDeletedDraftRef.current = {
        id: draftId,
        to,
        cc,
        bcc,
        subject,
        content,
        rawInputText,
        composeWindowId: composeWindow.id,
      };

      deleteDraft();

      // Close the compose window
      handleClose(false);

      // Show "Draft discarded" snackbar with undo button
      setSnackbar({
        open: true,
        message: "Draft discarded.",
        action: (
          <Button variant="text" size="medium" onClick={handleSnackbarUndoDelete} sx={{ textTransform: "capitalize" }}>
            Undo
          </Button>
        ),
        autoHideDuration: 4000,
      });
    } else {
      // If not a draft, just close the window
      handleClose(false);
    }
  };

  return (
    <>
      {/* Modal Overlay - only shown when maximized */}
      {composeWindow?.isMaximized && !composeWindow?.isMinimized && (
        <div className={styles.modalOverlay} onClick={handleToggleMaximize} />
      )}

      <div
        className={`${styles.composeModal} ${composeWindow?.isMinimized ? styles.minimized : ""} ${
          composeWindow?.isMaximized && !composeWindow?.isMinimized ? styles.maximized : ""
        }`}
        style={{
          right: `${composeModalRightPosition}px`,
        }}
        onFocus={handleWindowFocus}
        tabIndex={-1}
      >
        {/* Title Bar */}
        <div className={styles.composeTitleBar} onClick={handleToggleMinimize}>
          <span className={styles.composeTitle}>{draftSaved ? "Draft saved" : "New Message"}</span>
          <div className={styles.composeWindowControls}>
            <button
              className={`${styles.windowControl} ${styles.minimize} ${
                composeWindow?.isMinimized ? styles.restoreMinimize : ""
              }`}
              title="Minimize"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleMinimize();
              }}
            >
              <span className="material-symbols-outlined">minimize</span>
            </button>
            <button
              className={`${styles.windowControl} ${styles.maximize} ${
                composeWindow?.isMaximized ? styles.restoreMaximize : ""
              }`}
              title={composeWindow?.isMaximized ? "Restore" : "Maximize"}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleMaximize();
              }}
            >
              <span className="material-symbols-outlined">
                {composeWindow?.isMaximized ? "close_fullscreen" : "open_in_full"}
              </span>
            </button>
            <button
              className={`${styles.windowControl} ${styles.close}`}
              title="Close"
              onClick={(e) => {
                e.stopPropagation();
                handleClose(true);
              }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content that gets hidden when minimized */}
        <div className={`${styles.composeContent} ${composeWindow?.isMinimized ? styles.hidden : ""}`}>
          {/* Recipients Field */}
          <RecipientsInput
            to={to}
            cc={cc}
            bcc={bcc}
            onToChange={(value, rawText) => {
              setTo(Array.isArray(value) ? [...value] : []);
              setRawInputText((prev) => ({ ...prev, to: rawText || "" }));
            }}
            onCcChange={(value, rawText) => {
              setCc(Array.isArray(value) ? [...value] : []);
              setRawInputText((prev) => ({ ...prev, cc: rawText || "" }));
            }}
            onBccChange={(value, rawText) => {
              setBcc(Array.isArray(value) ? [...value] : []);
              setRawInputText((prev) => ({ ...prev, bcc: rawText || "" }));
            }}
            placeholder="Recipients"
          />

          {/* Subject Field */}
          <div className={styles.composeField}>
            <input
              type="text"
              placeholder="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={styles.composeInput}
            />
          </div>

          {/* Email Body */}
          <div className={styles.composeBody}>
            <RichTextEditor
              content={content.html}
              onChange={(html, plainText) => setContent({ html, plainText })}
              className={styles.composeEditor}
            />
          </div>

          {/* Bottom Toolbar */}
          <div className={styles.composeToolbar}>
            <div className={styles.sendButtonContainer}>
              <div
                aria-label="Send ‪(⌘Enter)‬"
                role="button"
                tabIndex="1"
                style={{
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  verticalAlign: "middle",
                  boxShadow: "none",
                  WebkitUserDrag: "none",
                  lineHeight: "18px",
                  outline: "none",
                  padding: "0px 16px",
                  border: "none",
                  WebkitBoxAlign: "center",
                  alignItems: "center",
                  display: "inline-flex",
                  WebkitBoxPack: "center",
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 0,
                  WebkitFontSmoothing: "antialiased",
                  fontSize: "0.875rem",
                  letterSpacing: "normal",
                  backgroundImage: "none",
                  boxSizing: "border-box",
                  fontWeight: 500,
                  height: "36px",
                  color: "rgb(255, 255, 255)",
                  margin: "0px",
                  marginRight: "0px",
                  maxWidth: "104px",
                  minWidth: "72px",
                  cursor: "pointer",
                  borderRadius: "18px 0px 0px 18px",
                  userSelect: "none",
                }}
                onClick={handleSend}
              >
                Send
              </div>
              <div
                className={styles.sendOptionsArrow}
                aria-expanded="false"
                aria-haspopup="true"
                aria-label="More send options"
                role="button"
                tabIndex="1"
                style={{
                  whiteSpace: "nowrap",
                  textAlign: "center",
                  boxShadow: "none",
                  WebkitUserDrag: "none",
                  lineHeight: "18px",
                  outline: "none",
                  border: "none",
                  WebkitBoxAlign: "center",
                  alignItems: "center",
                  display: "inline-flex",
                  WebkitBoxPack: "center",
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 0,
                  WebkitFontSmoothing: "antialiased",
                  fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                  fontSize: "0.875rem",
                  letterSpacing: "normal",
                  backgroundImage: "none",
                  boxSizing: "border-box",
                  fontWeight: 500,
                  height: "36px",
                  color: "rgb(255, 255, 255)",
                  padding: "0px 8px",
                  minWidth: "24px",
                  borderLeft: "1px solid rgb(6, 46, 111)",
                  cursor: "pointer",
                  borderRadius: "0px 18px 18px 0px",
                  userSelect: "none",
                }}
              >
                <span className="material-symbols-outlined">arrow_drop_down</span>
              </div>
            </div>

            <button className={styles.deleteButton} onClick={handleDelete} title="Delete">
              <span className="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <InfoModal
        isOpen={showErrorModal}
        onClose={handleErrorModalClose}
        title="Error"
        message={errorMessage}
        buttons={[
          {
            text: "OK",
            onClick: handleErrorModalClose,
            className: "primary",
          },
        ]}
        modalBoxStyle={{ width: errorMessage === "Please specify at least one recipient." ? "250px" : "500px" }}
      />
    </>
  );
}
