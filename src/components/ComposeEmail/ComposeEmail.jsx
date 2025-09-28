import React, { useState, useEffect, useMemo, useContext, useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import RichTextEditor from "../RichTextEditor/RichTextEditor";
import RecipientsInput from "./RecipientsInput";
import InfoModal from "./InfoModal";
import { GlobalContext } from "../../contexts/GlobalContext";
import { useDraftManagement } from "../../hooks/useDraftManagement";
import { useComposeModal } from "../../hooks/useComposeModal";
import { useSendEmail } from "../../hooks/useSendEmail";
import { useScheduleEmail } from "../../hooks/useScheduleEmail";
import { restructureRecipients } from "../../utils/helperFunctions";
import styles from "./ComposeEmail.module.css";

export default function ComposeEmail({ composeWindow }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { emails, setSnackbar, recipients, composeWindows, setComposeWindows, rightSidebarActiveTab, loggedInUser } =
    useContext(GlobalContext);

  // Create restructured recipients array for proper lookup
  const restructuredRecipients = useMemo(() => {
    return restructureRecipients(recipients.filter((recipient) => recipient.email));
  }, [recipients]);

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

  // Create custom recipient for valid email
  const createCustomRecipient = (email) => {
    // If the email is the logged in user's email, then return the logged in user object
    if (email === loggedInUser.email || loggedInUser.emails.some((emailObj) => emailObj.value === email)) {
      return {
        ...loggedInUser,
        id: loggedInUser.email,
      };
    }
    return {
      id: `custom-${email}`,
      name: email, // Use email as name since we don't know the actual name
      email: email,
      avatar: null,
      labels: [],
    };
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
            const recipientObj = restructuredRecipients.find((r) => r.email === email);
            if (recipientObj) {
              return recipientObj;
            }
            return createCustomRecipient(email);
          })
        );
        setCc(
          existingDraft.cc.map((email) => {
            const recipientObj = restructuredRecipients.find((r) => r.email === email);
            if (recipientObj) {
              return recipientObj;
            }
            return createCustomRecipient(email);
          })
        );
        setBcc(
          existingDraft.bcc.map((email) => {
            const recipientObj = restructuredRecipients.find((r) => r.email === email);
            if (recipientObj) {
              return recipientObj;
            }
            return createCustomRecipient(email);
          })
        );
        setSubject(existingDraft.subject === "(no subject)" ? "" : existingDraft.subject);
        setContent({ html: existingDraft.body, plainText: existingDraft.preview });
        setRawInputText({ to: "", cc: "", bcc: "" });
      }
    } else if (composeWindow?.fields && Object.keys(composeWindow?.fields).length > 0) {
      // Only add these if the states are empty
      if (to.length === 0 && composeWindow?.fields?.to) {
        setTo(composeWindow?.fields?.to);
      }
      if (cc.length === 0 && composeWindow?.fields?.cc) {
        setCc(composeWindow?.fields?.cc);
      }
      if (bcc.length === 0 && composeWindow?.fields?.bcc) {
        setBcc(composeWindow?.fields?.bcc);
      }
      if (subject === "" && composeWindow?.fields?.subject) {
        setSubject(composeWindow?.fields?.subject);
      }
      if (content.html === "" && composeWindow?.fields?.content) {
        setContent({ html: composeWindow?.fields?.content, plainText: composeWindow?.fields?.content });
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

    let rightPosition = rightSidebarActiveTab.activeTab ? 390 : 70; // Base right position

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
  }, [composeWindows, visibleWindowCount, composeWindow.id, rightSidebarActiveTab.activeTab]);

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

  const {
    handleSend: handleSendEmail,
    showErrorModal,
    errorMessage,
    handleErrorModalClose,
    handleSnackbarUndoDelete,
    lastDeletedDraftRef,
  } = useSendEmail(null);
  const {
    handleSchedule: handleScheduleEmail,
    showErrorModal: showScheduleErrorModal,
    errorMessage: scheduleErrorMessage,
    handleErrorModalClose: handleScheduleErrorModalClose,
  } = useScheduleEmail(null);

  const handleSend = () => {
    handleSendEmail({
      to,
      cc,
      bcc,
      subject,
      content,
      rawInputText,
      onClose: handleClose,
      currentDraftId: draftId,
      isDraft: isDraft,
    });
  };

  const handleUndoDelete = () => {
    handleSnackbarUndoDelete(addNewComposeWindow);
  };

  const handleSchedule = (scheduleData) => {
    handleScheduleEmail({
      to,
      cc,
      bcc,
      subject,
      content,
      rawInputText,
      onClose: handleClose,
      currentDraftId: draftId,
      isDraft: isDraft,
      scheduledDate: scheduleData.scheduledDate,
      scheduledTime: scheduleData.scheduledTime,
    });
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
          <Button variant="text" size="medium" onClick={handleUndoDelete} sx={{ textTransform: "capitalize" }}>
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
              onSend={handleSend}
              onDelete={handleDelete}
              onSchedule={handleSchedule}
              textEditorMinHeight={composeWindow?.isMaximized && !composeWindow?.isMinimized ? "530px" : "420px"}
              textEditorMaxHeight={
                composeWindow?.isMaximized && !composeWindow?.isMinimized ? "530px" : "calc(100vh - 340px)"
              }
              useCompactFormatting={true}
            />
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

      {/* Schedule Error Modal */}
      <InfoModal
        isOpen={showScheduleErrorModal}
        onClose={handleScheduleErrorModalClose}
        title="Error"
        message={scheduleErrorMessage}
        buttons={[
          {
            text: "OK",
            onClick: handleScheduleErrorModalClose,
            className: "primary",
          },
        ]}
        modalBoxStyle={{ width: scheduleErrorMessage === "Please specify at least one recipient." ? "250px" : "500px" }}
      />
    </>
  );
}
