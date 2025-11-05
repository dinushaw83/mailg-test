import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import EmailRecipients from "../common/EmailRecipients";
import { useGlobalContext } from "../../contexts/GlobalContext";
import RichTextEditor from "../RichTextEditor/RichTextEditor";
import { useSendEmail } from "../../hooks/useSendEmail";
import { useScheduleEmail } from "../../hooks/useScheduleEmail";
import { useDraftManagement } from "../../hooks/useDraftManagement";
import InfoModal from "../ComposeEmail/InfoModal";
import "./ReplyContainer.css";
import replyIcon from "../../icons/reply.png";
import replyAllIcon from "../../icons/replyall.png";
import forwardIcon from "../../icons/forward.png";
import dropdownArrow from "../../icons/dropdownarrow.png";
import { Button } from "@mui/material";

const ReplyContainer = forwardRef(({ email, replyType, currentDraftId, onClose, onUndoDelete }, ref) => {
  const { loggedInUser, setSnackbar, emails, signaturesState } = useGlobalContext();
  
  useImperativeHandle(ref, () => ({
    focusEditor: () => {
      // Find the ProseMirror editor element and focus it
      const editorElement = document.querySelector('.ProseMirror');
      if (editorElement) {
        editorElement.focus();
      }
    }
  }));
  const firstLetter = loggedInUser.name.charAt(0);
  const [selectedReplyOption, setSelectedReplyOption] = useState(replyType);
  const [subject, setSubject] = useState(`${replyType === "forward" ? "Fwd: " : "Re: "}${email.subject}`);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const calculateRecipients = (type) => {
    const calculatedRecipients = {
      to: type === "forward" ? [] : [email.from.email],
      cc: [],
      bcc: [],
    };

    if (type === "replyAll") {
      // Combine original cc and to lists
      const allCcRecipients = [...(email.cc || []), ...(email.to || [])];
      // Filter out the current user's email
      calculatedRecipients.cc = allCcRecipients.filter((recipient) => recipient !== loggedInUser.email);
    }

    return calculatedRecipients;
  };

  const [recipients, setRecipients] = useState(() => calculateRecipients(replyType));

  // Build forwarded header HTML when forwarding
  const buildForwardedHeader = () => {
    const recipientsList = email.to
      .map((recipient) => {
        if (typeof recipient === "string") {
          return recipient;
        }
        return `${recipient.name} <${recipient.email}>`;
      })
      .join(", ");

    const formattedDate = new Date(email.timestamp).toLocaleString("en-US", {
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
From: ${email.from.name} <${email.from.email}><br />
Date: ${formattedDate}<br />
Subject: ${email.subject}<br />
To: ${recipientsList}<br />
Cc: ${(email.cc || []).join(", ")}<br />
<br /><br />
${email.body}
</p>`;
  };

  const [content, setContent] = useState(() => {
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
  const { deleteDraft, isDraft, draftId, draftSaved, hasDraftContent } = useDraftManagement({
    to: recipientsForDraft.to,
    cc: recipientsForDraft.cc,
    bcc: recipientsForDraft.bcc,
    subject,
    content,
    currentDraftId,
    parentEmail: email,
    replyType: selectedReplyOption,
  });

  // Load an existing draft (e.g., after undo) into the reply UI
  useEffect(() => {
    if (!currentDraftId) return;
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
    }
  }, [currentDraftId, emails]);

  useEffect(() => {
    if (currentDraftId && isInitialLoad) {
      setIsInitialLoad(false);
      return;
    }
    setRecipients(calculateRecipients(selectedReplyOption));
  }, [selectedReplyOption, currentDraftId]);

  useEffect(() => {
    if (currentDraftId && isInitialLoad) return; // do not override restored draft content
    // Only set initial content when the reply type changes
    // Update subject to match selected reply option
    setSubject(`${selectedReplyOption === "forward" ? "Fwd: " : "Re: "}${email.subject}`);
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
  }, [selectedReplyOption, email, loggedInUser.email, content.html, content.plainText, currentDraftId]);

  useEffect(() => {
    if (currentDraftId) return;

    const { list, useForRepliesAndForwards, insertSignatureBeforeQuotedText } = signaturesState || {};
    const signature = list?.[useForRepliesAndForwards];
    if (!signature?.content) return;

    // Sanitize signature to remove wrapping <p> tags
    const sanitizedSignature = signature.content
      .replace(/^<p[^>]*>/i, '')
      .replace(/<\/p>$/i, '');

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
  } = useSendEmail(selectedReplyOption, email);

  const {
    handleSchedule: handleScheduleEmail,
    showErrorModal: showScheduleErrorModal,
    errorMessage: scheduleErrorMessage,
    handleErrorModalClose: handleScheduleErrorModalClose,
  } = useScheduleEmail(selectedReplyOption, email);

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
    handleScheduleEmail({
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
      scheduleOption: scheduleData,
    });
  };

  const handleDelete = () => {
    if (isDraft && draftId) {
      // Store the draft data for potential restoration
      lastDeletedDraftRef.current = {
        id: draftId,
        threadId: email.threadId,
        legacyThreadId: email.legacyThreadId,
        legacyLastMessageId: email.legacyLastMessageId,
        to: recipientsForDraft.to,
        cc: recipientsForDraft.cc,
        bcc: recipientsForDraft.bcc,
        replyType: selectedReplyOption,
        subject,
        content,
      };

      deleteDraft();

      setContent({ html: "", plainText: "" });
      if (onClose) {
        onClose();
      }

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
      // If not a draft, just close
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
              textEditorMinHeight="90px"
              textEditorMaxHeight="400px"
              messageId={email.id}
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
});

export default React.memo(ReplyContainer);
