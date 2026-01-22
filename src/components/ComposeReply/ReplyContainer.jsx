import "./ReplyContainer.css";

import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { Button } from "@mui/material";
import EmailRecipients from "../common/EmailRecipients";
import InfoModal from "../ComposeEmail/InfoModal";
import RichTextEditor from "../RichTextEditor/RichTextEditor";
import { deleteEmailThunk } from "../../store/slices/mailSlice";
import dropdownArrow from "../../icons/dropdownarrow.png";
import forwardIcon from "../../icons/forward.png";
import replyAllIcon from "../../icons/replyall.png";
import replyIcon from "../../icons/reply.png";
import { useDispatch } from "react-redux";
import { useDraftManagement } from "../../hooks/useDraftManagement";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useSendEmail } from "../../hooks/useSendEmail";
import { useScheduleEmail } from "../../hooks/useScheduleEmail";

const ReplyContainer = forwardRef(
  ({ email, draft, replyType, currentDraftId, onClose, onUndoDelete, replyToEmail, apiAttachments }, ref) => {
    const { loggedInUser, setSnackbar, emails, signaturesState } = useGlobalContext();
    const dispatch = useDispatch();

    useImperativeHandle(ref, () => ({
      focusEditor: () => {
        // Find the ProseMirror editor element and focus it
        const editorElement = document.querySelector(".ProseMirror");
        if (editorElement) {
          editorElement.focus();
        }
      },
    }));
    const firstLetter = loggedInUser.name.charAt(0);

    // Use clicked email if provided, else fallback to email prop (old flow)
    const targetEmail = replyToEmail || email;

    const {
      handleSchedule: handleScheduleEmail,
      showErrorModal: showScheduleErrorModal,
      errorMessage: scheduleErrorMessage,
      handleErrorModalClose: handleScheduleErrorModalClose,
    } = useScheduleEmail(replyType, targetEmail);

    const calculateRecipients = (type) => {
      const calculatedRecipients = {
        to: type === "forward" ? [] : [targetEmail.from.email],
        cc: [],
        bcc: [],
      };

      if (type === "replyAll") {
        // Combine original cc and to lists
        const allCcRecipients = [...(targetEmail.cc || []), ...(targetEmail.to || [])];
        // Filter out the current user's email
        calculatedRecipients.cc = allCcRecipients.filter((recipient) => recipient !== loggedInUser.email);
      }

      return calculatedRecipients;
    };

    const [selectedReplyOption, setSelectedReplyOption] = useState(draft?.replyType || replyType);
    const [subject, setSubject] = useState(() => {
      if (draft?.subject) {
        return draft.subject === "(no subject)" ? "" : draft.subject;
      }
      return `${replyType === "forward" ? "Fwd: " : "Re: "}${targetEmail.subject}`;
    });
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Initialize recipients from draft or calculate from replyType
    const [recipients, setRecipients] = useState(() => {
      if (draft) {
        // Handle backend format: recipients array with type field OR transformed to/cc/bcc arrays
        if (draft.recipients && Array.isArray(draft.recipients)) {
          // Backend format: recipients array with {id, email, name, type: "to"|"cc"|"bcc"}
          const to = (draft.recipients.filter((r) => r.type === "to") || [])
            .map((r) => r.email || r.name || "")
            .filter(Boolean);
          const cc = (draft.recipients.filter((r) => r.type === "cc") || [])
            .map((r) => r.email || r.name || "")
            .filter(Boolean);
          const bcc = (draft.recipients.filter((r) => r.type === "bcc") || [])
            .map((r) => r.email || r.name || "")
            .filter(Boolean);
          return { to, cc, bcc };
        } else {
          // Transformed format: to/cc/bcc arrays (already converted by emailAPIMapper)
          const toStrings = (draft.to || []).map((addr) =>
            typeof addr === "string" ? addr : addr.email || addr.name || ""
          );
          const ccStrings = (draft.cc || []).map((addr) =>
            typeof addr === "string" ? addr : addr.email || addr.name || ""
          );
          const bccStrings = (draft.bcc || []).map((addr) =>
            typeof addr === "string" ? addr : addr.email || addr.name || ""
          );
          return {
            to: toStrings.filter(Boolean),
            cc: ccStrings.filter(Boolean),
            bcc: bccStrings.filter(Boolean),
          };
        }
      }
      return calculateRecipients(replyType);
    });

    // Build forwarded header HTML when forwarding
    const buildForwardedHeader = () => {
      const recipientsList = targetEmail.to
        .map((recipient) => {
          if (typeof recipient === "string") {
            return recipient;
          }
          return `${recipient.name} <${recipient.email}>`;
        })
        .join(", ");

      const formattedDate = new Date(targetEmail.timestamp).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      return `
<p>
<br /><br />
---------- Forwarded message ---------<br />
From: ${targetEmail.from.name} <${targetEmail.from.email}><br />
Date: ${formattedDate}<br />
Subject: ${targetEmail.subject}<br />
To: ${recipientsList}<br />
Cc: ${(targetEmail.cc || []).join(", ")}<br />
<br /><br />
${targetEmail.body}
</p>`;
    };

    // Initialize content from draft or empty/forward header
    const [content, setContent] = useState(() => {
      if (draft) {
        return { html: draft.html_body || draft.body || "", plainText: draft.body || draft.preview || "" };
      }
      if (replyType === "forward") {
        const forwardedHeader = buildForwardedHeader();
        return { html: forwardedHeader, plainText: forwardedHeader };
      }
      return { html: "", plainText: "" };
    });

    // Convert simple string recipients to object form expected by draft/send hooks
    const recipientsForDraft = useMemo(() => {
      const toObjs = (recipients.to || []).map((addr) => ({ id: `custom-${addr}`, name: addr, email: addr }));
      const ccObjs = (recipients.cc || []).map((addr) => ({ id: `custom-${addr}`, name: addr, email: addr }));
      const bccObjs = (recipients.bcc || []).map((addr) => ({ id: `custom-${addr}`, name: addr, email: addr }));
      return { to: toObjs, cc: ccObjs, bcc: bccObjs };
    }, [recipients]);

    // Draft management hook
    const { deleteDraft, isDraft, draftId, draftSaved, hasDraftContent, saveAttachment, removeAttachment } =
      useDraftManagement({
        to: recipientsForDraft.to,
        cc: recipientsForDraft.cc,
        bcc: recipientsForDraft.bcc,
        subject,
        content,
        currentDraftId,
        parentEmail: targetEmail,
        replyType: selectedReplyOption,
      });

    // Track if draft has been initially loaded to prevent reset on updates
    const hasLoadedDraftRef = useRef(false);
    const lastLoadedDraftIdRef = useRef(null);

    // Load an existing draft (e.g., after undo) into the reply UI
    useEffect(() => {
      // Reset ref if currentDraftId changed (different draft to load)
      if (currentDraftId !== lastLoadedDraftIdRef.current) {
        hasLoadedDraftRef.current = false;
        lastLoadedDraftIdRef.current = currentDraftId;
      }
      // If draft prop is provided (from API thread), use it directly as primary source
      if (draft && currentDraftId === draft.id) {
        // Only load on initial mount, don't overwrite user's typing on updates
        if (!hasLoadedDraftRef.current) {
          // Handle backend format: recipients array with type field OR transformed to/cc/bcc arrays
          let to, cc, bcc;
          if (draft.recipients && Array.isArray(draft.recipients)) {
            // Backend format: recipients array with {id, email, name, type: "to"|"cc"|"bcc"}
            to = (draft.recipients.filter((r) => r.type === "to") || [])
              .map((r) => r.email || r.name || "")
              .filter(Boolean);
            cc = (draft.recipients.filter((r) => r.type === "cc") || [])
              .map((r) => r.email || r.name || "")
              .filter(Boolean);
            bcc = (draft.recipients.filter((r) => r.type === "bcc") || [])
              .map((r) => r.email || r.name || "")
              .filter(Boolean);
          } else {
            // Transformed format: to/cc/bcc arrays (already converted by emailAPIMapper)
            to = (draft.to || [])
              .map((addr) => (typeof addr === "string" ? addr : addr.email || addr.name || ""))
              .filter(Boolean);
            cc = (draft.cc || [])
              .map((addr) => (typeof addr === "string" ? addr : addr.email || addr.name || ""))
              .filter(Boolean);
            bcc = (draft.bcc || [])
              .map((addr) => (typeof addr === "string" ? addr : addr.email || addr.name || ""))
              .filter(Boolean);
          }
          setRecipients({ to, cc, bcc });
          setSubject(draft.subject === "(no subject)" ? "" : draft.subject);
          if (draft.replyType) {
            setSelectedReplyOption(draft.replyType);
          }
          setContent({ html: draft.html_body || draft.body || "", plainText: draft.body || draft.preview || "" });
          hasLoadedDraftRef.current = true;
        }
        return;
      }

      // Fallback: search in emails context (for drafts loaded from Redux/different sources)
      // Only load on initial mount, don't overwrite user's typing on updates
      if (!currentDraftId || hasLoadedDraftRef.current) return;

      const existingDraft = emails.find(
        (e) => e.id?.toString() === currentDraftId?.toString() && e.labels?.includes("Drafts")
      );
      if (existingDraft) {
        const to = (existingDraft.to || []).map((addr) => addr);
        const cc = (existingDraft.cc || []).map((addr) => addr);
        const bcc = (existingDraft.bcc || []).map((addr) => addr);
        setRecipients({ to, cc, bcc });
        setSubject(existingDraft.subject === "(no subject)" ? "" : existingDraft.subject);
        if (existingDraft.replyType) {
          setSelectedReplyOption(existingDraft.replyType);
        }
        setContent({ html: existingDraft.body, plainText: existingDraft.preview });
        hasLoadedDraftRef.current = true;
      }
    }, [currentDraftId, draft, emails]);

    useEffect(() => {
      if (currentDraftId && isInitialLoad) {
        setIsInitialLoad(false);
        return;
      }
      // Update recipients when replyToEmail changes (switching to reply to different email)
      // This ensures recipients reflect the new email being replied to
      setRecipients(calculateRecipients(selectedReplyOption));
    }, [selectedReplyOption, currentDraftId, replyToEmail]);

    useEffect(() => {
      if (currentDraftId && isInitialLoad) return; // do not override restored draft content
      // Only set initial content when the reply type changes
      // Update subject to match selected reply option
      setSubject(`${selectedReplyOption === "forward" ? "Fwd: " : "Re: "}${targetEmail.subject}`);
      // Add forwarded message header when forward is selected
      if (selectedReplyOption === "forward" && content.plainText.trim() === "") {
        const forwardedHeader = buildForwardedHeader();

        setContent({
          html: forwardedHeader,
          plainText: forwardedHeader,
        });
      } else if (
        selectedReplyOption !== "forward" &&
        content.plainText.trim().startsWith("---------- Forwarded message ---------")
      ) {
        setContent({ html: "", plainText: "" });
      }
    }, [selectedReplyOption, targetEmail, loggedInUser.email, content.html, content.plainText, currentDraftId]);

    useEffect(() => {
      if (currentDraftId) return;

      const { list, useForRepliesAndForwards, insertSignatureBeforeQuotedText } = signaturesState || {};
      const signature = list?.[useForRepliesAndForwards];
      if (!signature?.content) return;

      // Sanitize signature to remove wrapping <p> tags
      const sanitizedSignature = signature.content.replace(/^<p[^>]*>/i, "").replace(/<\/p>$/i, "");

      // Prevent duplicate insertion
      if (content.html.includes(sanitizedSignature)) return;

      let updatedHTML;
      let updatedPlainText;
      const signatureText = sanitizedSignature.replace(/<[^>]*>/g, "");

      if (insertSignatureBeforeQuotedText) {
        updatedHTML = `<p data-signature="true">${sanitizedSignature}</p><br><br>${content.html}`;
        updatedPlainText = `${signatureText}\n\n${content.plainText}`;
      } else {
        updatedHTML = `${content.html}<br><br><p>--</p><p data-signature="true">${sanitizedSignature}</p>`;
        updatedPlainText = `${content.plainText}\n\n--\n${signatureText}`;
      }

      setContent({
        html: updatedHTML,
        plainText: updatedPlainText,
      });
    }, [currentDraftId, selectedReplyOption, signaturesState]);

    const options = [
      { value: "reply", label: "Reply", icon: replyIcon },
      { value: "replyAll", label: "Reply All", icon: replyAllIcon },
      { value: "forward", label: "Forward", icon: forwardIcon },
    ];

    const getSelectedIcon = () => {
      return options.find((option) => option.value === selectedReplyOption)?.icon;
    };

    const {
      handleSend: handleSendEmail,
      showErrorModal,
      errorMessage,
      handleErrorModalClose,
      handleSnackbarUndoDelete,
      lastDeletedDraftRef,
    } = useSendEmail(selectedReplyOption, targetEmail);

    /* Removed useScheduleEmail hook */

    const handleSend = ({ attachments = [], embeddedImages = [], processedHtml }) => {
      // Use processed HTML if available, otherwise use the current content
      const finalContent = processedHtml ? { html: processedHtml, plainText: content.plainText } : content;

      handleSendEmail({
        to: recipientsForDraft.to,
        cc: recipientsForDraft.cc,
        bcc: recipientsForDraft.bcc,
        subject,
        content: finalContent,
        currentDraftId: draftId,
        isDraft,
        onClose: () => {
          if (isDraft && draftId) {
            deleteDraft();
          }
          setContent({ html: "", plainText: "" });
          if (onClose) {
            onClose();
          }
        },
        attachments,
        embeddedImages,
      });
    };

    const handleUndoDelete = () => {
      handleSnackbarUndoDelete(onUndoDelete);
    };

    const handleSchedule = (scheduleData) => {
      if (!draftId) {
        setSnackbar({
          open: true,
          message: "Invalid email content",
          autoHideDuration: 4000,
        });
        return;
      }
      handleSendEmail({
        to: recipientsForDraft.to,
        cc: recipientsForDraft.cc,
        bcc: recipientsForDraft.bcc,
        subject,
        content,
        onClose: () => {
          if (isDraft && draftId) {
            deleteDraft();
          }
          setContent({ html: "", plainText: "" });
          if (onClose) {
            onClose();
          }
        },
        currentDraftId: draftId,
        isDraft: isDraft,
        scheduledDate: scheduleData.scheduledDate,
        scheduledTime: scheduleData.scheduledTime,
        scheduleOption: scheduleData.scheduleOption || scheduleData,
      });
    };

    const handleAddAttachment = async (file) => {
      try {
        const attachmentData = {
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          size_bytes: file.size,
        };

        const { error, data } = await saveAttachment(attachmentData);
        if (error) {
          console.error("Failed to get draft ID for attachment");
          setSnackbar({
            open: true,
            message: "Failed to save draft. Cannot attach file.",
            severity: "error",
          });
          return;
        }
        return data?.attachment;
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

    const handleDelete = async () => {
      if (isDraft && draftId) {
        // Check if draftId is a UUID (backend ID)
        const isBackendId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draftId.toString());

        if (isBackendId) {
          // Get thread_id from targetEmail prop
          const thread_id = targetEmail?.thread_id;

          // Store draft data for potential restoration
          lastDeletedDraftRef.current = {
            id: draftId,
            thread_id: thread_id,
            legacyThreadId: targetEmail.legacyThreadId,
            legacyLastMessageId: targetEmail.legacyLastMessageId,
            to: recipientsForDraft.to,
            cc: recipientsForDraft.cc,
            bcc: recipientsForDraft.bcc,
            replyType: selectedReplyOption,
            subject,
            content,
          };

          try {
            // Delete email via API, passing thread_id for refetch
            await dispatch(deleteEmailThunk({ emailId: draftId, thread_id })).unwrap();

            // Close reply container
            setContent({ html: "", plainText: "" });
            if (onClose) {
              onClose();
            }

            // Show "Draft discarded" snackbar
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
          } catch (error) {
            console.error("Failed to delete draft:", error);
            setSnackbar({
              open: true,
              message: "Failed to delete draft.",
              autoHideDuration: 3000,
            });
          }
        } else {
          // Local draft - existing local delete logic
          deleteDraft();
          setContent({ html: "", plainText: "" });
          if (onClose) {
            onClose();
          }
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
        }
      } else {
        // Not a draft - just close
        setContent({ html: "", plainText: "" });
        if (onClose) {
          onClose();
        }
      }
    };

    useEffect(() => {
      const handleClickOutside = (event) => {
        const dropdown = document.getElementById("reply-options");
        const selectedOption = document.querySelector(".selected-option");

        // If the dropdown is open and click is outside both the dropdown and trigger
        if (
          dropdown?.classList.contains("show") &&
          !dropdown.contains(event.target) &&
          !selectedOption.contains(event.target)
        ) {
          dropdown.classList.remove("show");
        }
      };

      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    return (
      <>
        <div
          style={{
            display: "flex",
            gap: 12,
            paddingLeft: 28,
          }}
        >
          <div
            style={{
              minWidth: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "#5f9ea0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "18px",
              fontWeight: "bold",
            }}
          >
            {firstLetter}
          </div>
          <div className="replybox">
            <div className="replybox-header">
              <div className="reply-dropdown-container">
                <div className="reply-dropdown">
                  <div
                    className="selected-option"
                    onClick={() => document.getElementById("reply-options").classList.toggle("show")}
                  >
                    <img src={getSelectedIcon()} alt={selectedReplyOption} className="reply-icon" />
                    <img src={dropdownArrow} alt="dropdown-arrow" className="dropdown-arrow" />
                  </div>
                  <div id="reply-options" className="dropdown-options">
                    {options.map((option) => (
                      <div
                        key={option.value}
                        className="dropdown-option"
                        onClick={() => {
                          const newOption = option.value;
                          // Prepare content first so initial render of new key has correct body
                          if (newOption === "forward") {
                            const forwardedHeader = buildForwardedHeader();
                            setContent({ html: forwardedHeader, plainText: forwardedHeader });
                          } else {
                            setContent({ html: "", plainText: "" });
                          }
                          // Update recipients immediately for the new option
                          setRecipients(calculateRecipients(newOption));
                          // Then switch the option (this also changes the key for the editor)
                          setSelectedReplyOption(newOption);
                          document.getElementById("reply-options").classList.remove("show");
                        }}
                      >
                        <img src={option.icon} alt={option.label} className="reply-icon" />
                        <span>{option.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="reply-input-container">
                <EmailRecipients recipients={recipients} setRecipients={setRecipients} />
              </div>
              {draftSaved && (
                <div
                  style={{
                    color: "#666",
                    fontSize: "14px",
                    marginTop: "18px",
                    marginRight: "24px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Draft saved
                </div>
              )}
            </div>
            <div className="reply-editor-container">
              <RichTextEditor
                key={selectedReplyOption}
                content={content.html}
                onChange={(html, plainText) => setContent({ html, plainText })}
                onSend={handleSend}
                onDelete={handleDelete}
                onSchedule={handleSchedule}
                onAddAttachment={handleAddAttachment}
                onRemoveAttachment={async (attachment) => {
                  try {
                    await removeAttachment({ attachmentId: attachment.id });
                  } catch (error) {
                    console.error("Failed to remove attachment:", error);
                    setSnackbar({
                      open: true,
                      message: "Failed to remove attachment.",
                      severity: "error",
                    });
                  }
                }}
                textEditorMinHeight="90px"
                textEditorMaxHeight="400px"
                messageId={targetEmail?.id}
                apiAttachments={draft?.attachments || apiAttachments}
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
          modalBoxStyle={{
            width: scheduleErrorMessage === "Please specify at least one recipient." ? "250px" : "500px",
          }}
        />
      </>
    );
  }
);

export default React.memo(ReplyContainer);
