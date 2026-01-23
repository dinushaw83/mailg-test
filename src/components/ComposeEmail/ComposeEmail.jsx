import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { deleteEmailThunk, fetchEmailByIdThunk, setEmailsForCategory } from "../../store/slices/mailSlice";
import { createAttachmentThunk } from "../../store/slices/attachmentSlice";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@mui/material";
import InfoModal from "./InfoModal";
import RecipientsInput from "./RecipientsInput";
import RichTextEditor from "../RichTextEditor/RichTextEditor";
import { beToFeDraft } from "../../utils/draftMapper";
import { restructureRecipients } from "../../utils/helperFunctions";
import { store } from "../../store";
import styles from "./ComposeEmail.module.css";
import { useComposeModal } from "../../hooks/useComposeModal";
import { useDispatch } from "react-redux";
import { useDraftManagement } from "../../hooks/useDraftManagement";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useScheduleEmail } from "../../hooks/useScheduleEmail";
import { useSendEmail } from "../../hooks/useSendEmail";

// Helper to check if a string is a UUID
const isUUID = (str) => {
  if (!str || typeof str !== "string") return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export default function ComposeEmail({ composeWindow }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    emails,
    mailFolders,
    setSnackbar,
    recipients,
    composeWindows,
    setComposeWindows,
    rightSidebarActiveTab,
    loggedInUser,
    signaturesState,
  } = useGlobalContext();

  // Create restructured recipients array for proper lookup
  const restructuredRecipients = useMemo(() => {
    return restructureRecipients(recipients.filter((recipient) => recipient.email));
  }, [recipients]);

  const { removeComposeWindow, toggleMinimize, toggleMaximize, visibleWindowCount, addNewComposeWindow } =
    useComposeModal();
  const dispatch = useDispatch();

  // Calculate if this window should be visible based on visibleWindowCount
  // This prevents unmounting and preserves component state
  const isWindowVisible = useMemo(() => {
    const visibleWindows = composeWindows.slice(-visibleWindowCount);
    return visibleWindows.some((w) => w.id === composeWindow.id);
  }, [JSON.stringify(composeWindows), visibleWindowCount, composeWindow.id]);

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

  // Track if window is already focused to prevent unnecessary navigation
  const isWindowFocusedRef = useRef(false);

  const replyingToEmail = composeWindow?.fields?.replyingTo || null;
  const forwardingEmail = composeWindow?.fields?.forwardingTo || null;
  const presetCcRecipients = composeWindow?.fields?.cc;
  const composeReplyType = forwardingEmail
    ? "forward"
    : replyingToEmail
      ? composeWindow?.fields?.replyType ||
        (Array.isArray(presetCcRecipients) && presetCcRecipients.length > 0 ? "replyAll" : "reply")
      : null;
  const originalEmail = forwardingEmail || replyingToEmail || null;

  /**
   * This is the draft id that is used to save the draft and fetch the draft from the backend
   */
  const currentDraftId = composeWindow?.draftId;

  // Draft management hook
  const {
    saveDraftManually,
    saveToBackendNow,
    deleteDraft,
    isDraft,
    draftId,
    draftSaved,
    hasDraftContent,
    saveAttachment,
    attachments,
  } = useDraftManagement({
    to,
    cc,
    bcc,
    subject,
    content,
    currentDraftId,
    parentEmail: originalEmail,
    replyType: composeReplyType,
    composeWindowId: composeWindow?.id,
    setComposeWindows,
  });

  // Determine which signature to use
  const defaultSignatureId = useMemo(() => {
    const isReply = composeWindow?.fields?.replyingTo;
    return isReply ? signaturesState?.useForRepliesAndForwards : signaturesState?.useForNewEmails;
  }, [composeWindow, signaturesState]);

  // Get the HTML content of that signature
  const defaultSignatureHTML = useMemo(() => {
    if (!signaturesState?.list?.length) return "";
    if (defaultSignatureId === "" || defaultSignatureId === null || defaultSignatureId === undefined) return "";

    const signature = signaturesState.list[Number(defaultSignatureId)];
    return signature?.content || "";
  }, [defaultSignatureId, signaturesState]);

  // Insert signature when composing a NEW email (not draft or reply)
  useLayoutEffect(() => {
    const isNewCompose = !currentDraftId && !composeWindow?.fields?.replyingTo && !content.html?.trim();

    // Sanitize signature so it doesn't bring its own <p> tags
    const sanitizedSignature = (defaultSignatureHTML || "").replace(/^<p[^>]*>/i, "").replace(/<\/p>$/i, "");

    if (isNewCompose && defaultSignatureHTML) {
      if (signaturesState?.insertSignatureBeforeQuotedText) {
        setContent({
          html: `<p><br></p><p data-signature="true">${sanitizedSignature}</p>`,
          plainText: `\n${sanitizedSignature.replace(/<[^>]*>/g, "")}`,
        });
      } else {
        setContent({
          html: `<p><br></p><p>--</p><p data-signature="true">${sanitizedSignature}</p>`,
          plainText: `\n--\n${sanitizedSignature.replace(/<[^>]*>/g, "")}`,
        });
      }
    }
  }, [defaultSignatureHTML, currentDraftId, signaturesState?.insertSignatureBeforeQuotedText]);

  // Handle window focus - DISABLED navigate() calls to prevent focus-stealing re-renders
  const handleWindowFocus = (e) => {
    // Do nothing - navigate() was causing flicker by triggering re-renders
  };

  // Handle window blur - DISABLED to prevent focus issues
  const handleWindowBlur = (e) => {
    // Do nothing
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
      // Load existing draft from mail.drafts array
      const drafts = mailFolders?.drafts || [];
      const existingDraft = drafts.find(
        (email) => email.id.toString() === currentDraftId?.toString() && email.labels.includes("Drafts")
      );

      if (existingDraft) {
        // Draft found in Redux - load it
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
      } else if (isUUID(currentDraftId.toString())) {
        // Draft not in Redux but has UUID - fetch from backend
        // Only fetch if form fields are empty (to avoid overwriting user input)
        const hasContent = to.length > 0 || cc.length > 0 || bcc.length > 0 || subject.trim() || content.html.trim();
        if (!hasContent) {
          dispatch(fetchEmailByIdThunk(currentDraftId))
            .unwrap()
            .then((fetchedDraft) => {
              const feDraft = beToFeDraft(fetchedDraft);
              if (feDraft) {
                // Load form fields from fetched draft
                setTo(
                  (feDraft.to || []).map((email) => {
                    const emailStr = typeof email === "string" ? email : email.email || email.name || email;
                    const recipientObj = restructuredRecipients.find((r) => r.email === emailStr);
                    if (recipientObj) {
                      return recipientObj;
                    }
                    return createCustomRecipient(emailStr);
                  })
                );
                setCc(
                  (feDraft.cc || []).map((email) => {
                    const emailStr = typeof email === "string" ? email : email.email || email.name || email;
                    const recipientObj = restructuredRecipients.find((r) => r.email === emailStr);
                    if (recipientObj) {
                      return recipientObj;
                    }
                    return createCustomRecipient(emailStr);
                  })
                );
                setBcc(
                  (feDraft.bcc || []).map((email) => {
                    const emailStr = typeof email === "string" ? email : email.email || email.name || email;
                    const recipientObj = restructuredRecipients.find((r) => r.email === emailStr);
                    if (recipientObj) {
                      return recipientObj;
                    }
                    return createCustomRecipient(emailStr);
                  })
                );
                setSubject(feDraft.subject === "(no subject)" ? "" : feDraft.subject || "");
                setContent({ html: feDraft.body || "", plainText: feDraft.preview || "" });
                setRawInputText({ to: "", cc: "", bcc: "" });

                // Update Redux with fetched draft
                const state = store.getState();
                const currentDrafts = state.mail.drafts || [];
                const filteredDrafts = currentDrafts.filter(
                  (email) => email.id?.toString() !== currentDraftId?.toString()
                );
                const updatedDrafts = [feDraft, ...filteredDrafts];
                dispatch(setEmailsForCategory({ category: "drafts", emails: updatedDrafts }));
              }
            })
            .catch((error) => {
              console.error("Failed to fetch draft from backend:", error);
            });
        }
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
  }, [
    currentDraftId?.current,
    composeWindow?.isMinimized,
    JSON.stringify(composeWindow?.fields),
    JSON.stringify(restructuredRecipients),
  ]);

  // Focus the body editor if this is a reply (has replyingTo field) and autoFocus is enabled
  // For forwards (forwardingTo), the To input is auto-focused via RecipientsInput
  useEffect(() => {
    if (composeWindow?.fields?.replyingTo && composeWindow?.autoFocus && !composeWindow?.fields?.forwardingTo) {
      // Delay to ensure the editor is rendered
      const timeoutId = setTimeout(() => {
        // Find the compose modal container for this window
        const composeModal = document.querySelector(`[data-compose-id="${composeWindow.id}"]`);
        if (composeModal) {
          const editorElement = composeModal.querySelector(".ProseMirror");
          if (editorElement) {
            // Focus the editor using the focus method
            try {
              editorElement.focus();
            } catch (e) {
              console.error("Failed to focus editor:", e);
            }
          }
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [
    composeWindow?.fields?.replyingTo,
    composeWindow?.fields?.forwardingTo,
    composeWindow?.autoFocus,
    composeWindow?.id,
  ]);

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
  } = useSendEmail(composeReplyType, originalEmail);
  const {
    handleSchedule: handleScheduleEmail,
    showErrorModal: showScheduleErrorModal,
    errorMessage: scheduleErrorMessage,
    handleErrorModalClose: handleScheduleErrorModalClose,
  } = useScheduleEmail(composeReplyType, originalEmail);

  const handleSend = ({ attachments = [], embeddedImages = [], processedHtml } = {}) => {
    // Use processed HTML if available, otherwise use the current content
    const finalContent = processedHtml ? { html: processedHtml, plainText: content.plainText } : content;
    handleSendEmail({
      to,
      cc,
      bcc,
      subject,
      content: finalContent,
      rawInputText,
      onClose: handleClose,
      currentDraftId: draftId,
      isDraft: isDraft,
      attachments,
      embeddedImages,
    });
  };

  const handleUndoDelete = () => {
    handleSnackbarUndoDelete(addNewComposeWindow);
  };

  // Handle adding attachments
  const handleAddAttachment = async (file) => {
    try {
      // Create attachment payload
      const attachmentData = {
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        size_bytes: file.size,
      };

      const { data, error } = await saveAttachment(attachmentData);

      if (error) {
        console.error("Failed to get draft ID for attachment:", error);
        setSnackbar({
          open: true,
          message: "Failed to save draft. Cannot attach file.",
          severity: "error",
        });
        return;
      }

      return data;
    } catch (error) {
      console.error("Error adding attachment:", error);
      setSnackbar({
        open: true,
        message: "Failed to upload attachment.",
        severity: "error",
      });
      throw error;
    }
  };

  const handleSchedule = (scheduleData) => {
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
      scheduledDate: scheduleData.scheduledDate,
      scheduledTime: scheduleData.scheduledTime,
      scheduleOption: scheduleData.scheduleOption || scheduleData,
    });
  };

  // Remove the email from draft
  const handleDelete = async () => {
    if (isDraft && draftId) {
      // Check if draftId is a UUID (backend ID)
      const isBackendId = isUUID(draftId.toString());

      if (isBackendId) {
        // Get thread_id from originalEmail prop
        const thread_id = originalEmail?.thread_id;

        // Store draft data for potential restoration
        lastDeletedDraftRef.current = {
          id: draftId,
          thread_id: thread_id,
          legacyThreadId: originalEmail?.legacyThreadId,
          legacyLastMessageId: originalEmail?.legacyLastMessageId,
          to,
          cc,
          bcc,
          subject,
          content,
          rawInputText,
          composeWindowId: composeWindow.id,
          replyType: composeReplyType,
        };

        try {
          // Delete email via API, passing thread_id for refetch
          await dispatch(deleteEmailThunk({ emailId: draftId, thread_id })).unwrap();

          // Close the compose window
          handleClose(false);
        } catch (error) {
          console.error("Failed to delete draft:", error);
          // Silently handle errors - no snackbar
          handleClose(false);
        }
      } else {
        // Local draft - existing local delete logic
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
          replyType: composeReplyType,
        };

        deleteDraft();

        // Close the compose window
        handleClose(false);
      }
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
          display: isWindowVisible ? "block" : "none", // Hide if outside visible count
        }}
        onFocus={handleWindowFocus}
        onBlur={handleWindowBlur}
        tabIndex={-1}
        data-compose-id={composeWindow.id}
      >
        {/* Title Bar */}
        <div className={styles.composeTitleBar} onClick={handleToggleMinimize}>
          <span className={styles.composeTitle}>
            {draftSaved
              ? "Draft saved"
              : composeWindow?.fields?.replyingTo
                ? `Re: ${composeWindow?.fields?.replyingTo?.subject || subject}`
                : composeWindow?.fields?.forwardingTo
                  ? `Fwd: ${composeWindow?.fields?.forwardingTo?.subject || subject}`
                  : "New Message"}
          </span>
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
            autoFocus={composeWindow?.autoFocus && !composeWindow?.fields?.replyingTo}
          />

          {/* Subject Field - Hide for replies and forwards */}
          {!composeWindow?.fields?.replyingTo && !composeWindow?.fields?.forwardingTo && (
            <div className={styles.composeField}>
              <input
                type="text"
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={styles.composeInput}
              />
            </div>
          )}

          {/* Email Body */}
          <div className={styles.composeBody}>
            <RichTextEditor
              content={content.html}
              onChange={(html, plainText) => setContent({ html, plainText })}
              className={styles.composeEditor}
              onSend={handleSend}
              onDelete={handleDelete}
              onSchedule={handleSchedule}
              onAddAttachment={handleAddAttachment}
              textEditorMinHeight={composeWindow?.isMaximized && !composeWindow?.isMinimized ? "530px" : "420px"}
              textEditorMaxHeight={
                composeWindow?.isMaximized && !composeWindow?.isMinimized ? "530px" : "calc(100vh - 340px)"
              }
              useCompactFormatting={true}
              subject={subject}
              onSubjectChange={setSubject}
              apiAttachments={attachments}
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
