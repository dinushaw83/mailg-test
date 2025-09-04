import React, { useState, useContext, useRef, useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Button from "@mui/material/Button";
import RichTextEditor from "../RichTextEditor/RichTextEditor";
import RecipientsInput from "./RecipientsInput";
import InfoModal from "./InfoModal";
import { GlobalContext } from "../../contexts/GlobalContext";
import { generateThreadId, generateLegacyThreadId, generateNextEmailId } from "../../utils/helperFunctions";
import styles from "./ComposeEmail.module.css";

export default function ComposeEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, setState, setSnackbar } = useContext(GlobalContext);
  const searchParams = new URLSearchParams(location.search);
  // Get compose parameter value
  const composeParam = searchParams.get("compose");
  // TODO: Display compose modal if compose parameter is "new" or an id from the draft emails state
  // For now, display compose modal if compose parameter has a value, since draft is not implemented yet
  const showCompose = composeParam?.length > 0;

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

  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("Please specify at least one recipient.");
  const lastSentEmailRef = useRef(null);

  // Reset form fields whenever the compose modal is opened
  useLayoutEffect(() => {
    if (composeParam === "new") {
      setTo([]);
      setCc([]);
      setBcc([]);
      setSubject("");
      setContent({ html: "", plainText: "" });
      setRawInputText({ to: "", cc: "", bcc: "" });
    }
  }, [composeParam]);

  // Toggle minimize/restore modal
  const handleToggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Toggle maximize/restore modal
  const handleToggleMaximize = () => {
    setIsMaximized(!isMaximized);
    // Clear minimize state when toggling maximize
    setIsMinimized(false);
  };

  // Close the compose email modal
  const handleClose = () => {
    // Remove the compose parameter from URL
    const newSearchParams = new URLSearchParams(location.search);
    newSearchParams.delete("compose");
    const newSearch = newSearchParams.toString();
    navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ""}`);
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
    // Generate new id if compose parameter is "new", otherwise use the id from the compose parameter
    const newId = composeParam === "new" ? generateNextEmailId(state.emails) : composeParam;
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
        name: state.user.name,
        email: state.user.email,
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
    handleClose();

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
      const updatedEmails = [newEmail, ...state.emails];

      // Update the global state
      setState((prevState) => ({
        ...prevState,
        emails: updatedEmails,
      }));

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

    // After 1 second, remove email from state and show "Sending undone"
    setTimeout(() => {
      // Double-check that the email still exists
      if (lastSentEmailRef.current && lastSentEmailRef.current.id) {
        const emailToRemove = lastSentEmailRef.current;

        // Remove the email from the state
        setState((prevState) => {
          const filteredEmails = prevState.emails.filter((email) => email.id !== emailToRemove.id);

          // Push compose parameter to URL
          navigate(`?compose=${emailToRemove?.id}`);

          // Clear the ref after successful state update
          lastSentEmailRef.current = null;

          return {
            ...prevState,
            emails: filteredEmails,
          };
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

  // Remove the email from draft
  const handleDelete = () => {
    // TODO: Implement delete/discard functionality
    console.log("Discarding email");
    handleClose();
  };

  // Hide compose email modal when message is sending
  if (!showCompose) return null;

  return (
    <>
      {/* Modal Overlay - only shown when maximized */}
      {isMaximized && !isMinimized && <div className={styles.modalOverlay} />}

      <div
        className={`${styles.composeModal} ${isMinimized ? styles.minimized : ""} ${
          isMaximized && !isMinimized ? styles.maximized : ""
        }`}
      >
        {/* Title Bar */}
        <div className={styles.composeTitleBar} onClick={handleToggleMinimize}>
          <span className={styles.composeTitle}>New Message</span>
          <div className={styles.composeWindowControls}>
            <button
              className={`${styles.windowControl} ${styles.minimize} ${isMinimized ? styles.restoreMinimize : ""}`}
              title="Minimize"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleMinimize();
              }}
            >
              <span className="material-symbols-outlined">minimize</span>
            </button>
            <button
              className={`${styles.windowControl} ${styles.maximize} ${isMaximized ? styles.restoreMaximize : ""}`}
              title={isMaximized ? "Restore" : "Maximize"}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleMaximize();
              }}
            >
              <span className="material-symbols-outlined">{isMaximized ? "close_fullscreen" : "open_in_full"}</span>
            </button>
            <button
              className={`${styles.windowControl} ${styles.close}`}
              title="Close"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content that gets hidden when minimized */}
        <div className={`${styles.composeContent} ${isMinimized ? styles.hidden : ""}`}>
          {/* Recipients Field */}
          <RecipientsInput
            to={to}
            cc={cc}
            bcc={bcc}
            onToChange={(value, rawText) => {
              setTo(Array.isArray(value) ? value : []);
              setRawInputText((prev) => ({ ...prev, to: rawText || "" }));
            }}
            onCcChange={(value, rawText) => {
              setCc(Array.isArray(value) ? value : []);
              setRawInputText((prev) => ({ ...prev, cc: rawText || "" }));
            }}
            onBccChange={(value, rawText) => {
              setBcc(Array.isArray(value) ? value : []);
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
