import React, { useState, useEffect } from 'react';
import EmailRecipients from '../common/EmailRecipients';
import { useGlobalContext } from '../../contexts/GlobalContext';
import RichTextEditor from '../RichTextEditor/RichTextEditor';
import { useSendEmail } from '../../hooks/useSendEmail';
import { useDraftManagement } from '../../hooks/useDraftManagement';
import InfoModal from '../ComposeEmail/InfoModal';
import "./ReplyContainer.css";
import replyIcon from '../../icons/reply.png';
import replyAllIcon from '../../icons/replyall.png';
import forwardIcon from '../../icons/forward.png';
import dropdownArrow from '../../icons/dropdownarrow.png';

// TEMP
import styles from "../ComposeEmail/ComposeEmail.module.css";

const ReplyContainer = ({ email, replyType, onClose, onUndoDelete }) => {
  const { loggedInUser } = useGlobalContext();
  const firstLetter = loggedInUser.name.charAt(0);
  const [selectedReplyOption, setSelectedReplyOption] = useState(replyType);
  const [subject, setSubject] = useState(`${replyType === 'forward' ? 'Fwd: ' : 'Re: '}${email.subject}`);
  
  const calculateRecipients = (type) => {
    const calculatedRecipients = {
      to: type === 'forward' ? [] : [email.from.email],
      cc: [],
      bcc: []
    };

    if (type === 'replyAll') {
      // Combine original cc and to lists
      const allCcRecipients = [...(email.cc || []), ...(email.to || [])];
      // Filter out the current user's email
      calculatedRecipients.cc = allCcRecipients.filter(recipient => recipient !== loggedInUser.email);
    }

    return calculatedRecipients;
  };

  const [recipients, setRecipients] = useState(() => calculateRecipients(replyType));
  const [content, setContent] = useState({ html: '', plainText: '' });

  // Draft management hook
  const { deleteDraft, isDraft, draftId, draftSaved, hasDraftContent } = useDraftManagement({
    to: recipients.to,
    cc: recipients.cc,
    bcc: recipients.bcc,
    subject,
    content,
    currentDraftId: undefined // No initial draft for replies
  });

  useEffect(() => {
    setRecipients(calculateRecipients(selectedReplyOption));

    // Only set initial content when the reply type changes
    if (!content.html && !content.plainText) {
      // Add forwarded message header when forward is selected
      if (selectedReplyOption === 'forward') {
        const recipientsList = email.to.map(recipient => {
          if (typeof recipient === 'string') {
            return recipient;
          }
          return `${recipient.name} <${recipient.email}>`;
        }).join(', ');

        const formattedDate = new Date(email.timestamp).toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });

        const forwardedHeader = `
<br /><br />
---------- Forwarded message ---------<br />
From: ${email.from.name} <${email.from.email}><br />
Date: ${formattedDate}<br />
Subject: ${email.subject}<br />
To: ${recipientsList}<br />
Cc: ${(email.cc || []).join(', ')}<br />
<br /><br />
${email.body}`;

        setContent({ 
          html: forwardedHeader, 
          plainText: forwardedHeader 
        });
      }
    }
  }, [selectedReplyOption, email, loggedInUser.email, content.html, content.plainText]);
  
  const options = [
    { value: 'reply', label: 'Reply', icon: replyIcon },
    { value: 'replyAll', label: 'Reply All', icon: replyAllIcon },
    { value: 'forward', label: 'Forward', icon: forwardIcon }
  ];

  const getSelectedIcon = () => {
    return options.find(option => option.value === selectedReplyOption)?.icon;
  };

  const { handleSend: handleSendEmail, showErrorModal, errorMessage, handleErrorModalClose, handleSnackbarUndoDelete, lastDeletedDraftRef } = useSendEmail(
    selectedReplyOption === 'forward' ? undefined : email.id,
    selectedReplyOption === 'forward' ? email.id : undefined,
    email
  );

  const handleSend = () => {
    handleSendEmail({
      to: recipients.to,
      cc: recipients.cc,
      bcc: recipients.bcc,
      subject: `${selectedReplyOption === 'forward' ? 'Fwd: ' : 'Re: '}${email.subject}`,
      content,
      currentDraftId: draftId,
      isDraft,
      onClose: () => {
        if (isDraft && draftId) {
          deleteDraft();
        }
        setContent({ html: '', plainText: '' });
        if (onClose) {
          onClose();
        }
      }
    });
  }

  const handleDelete = () => {
    if (isDraft && draftId) {
      deleteDraft();
    }
    setContent({ html: '', plainText: '' });
    if (onClose) {
      onClose();
    }
  }

  return (
    <>
      <div style={{
        display: "flex",
        gap: 12,
        paddingLeft: 28,
      }}>
        <div
        style={{
          minWidth: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: '#5f9ea0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold'
        }}
      >
        {firstLetter}
      </div>
      <div className="replybox">
        <div className="replybox-header">

          <div className="reply-dropdown-container">
            <div className="reply-dropdown">
              <div className="selected-option" onClick={() => document.getElementById('reply-options').classList.toggle('show')}>
                <img src={getSelectedIcon()} alt={selectedReplyOption} className="reply-icon" />
                <img src={dropdownArrow} alt="dropdown-arrow" className="dropdown-arrow" />
              </div>
              <div id="reply-options" className="dropdown-options">
                {options.map(option => (
                  <div
                    key={option.value}
                    className="dropdown-option"
                    onClick={() => {
                      setSelectedReplyOption(option.value);
                      document.getElementById('reply-options').classList.remove('show');
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
            <EmailRecipients 
              recipients={recipients}
              setRecipients={setRecipients}
            />
          </div>
          {draftSaved && (
              <div style={{ 
                color: '#666',
                fontSize: '14px',
                marginTop: '18px',
                marginRight: '24px',
                display: 'flex',
                alignItems: 'center'
              }}>
                Draft saved
              </div>
            )}
        </div>
        <div className="reply-editor-container">
          <RichTextEditor
            content={content.html}
            onChange={(html, plainText) => setContent({ html, plainText })}
            className="reply-text-editor"
          />
        </div>
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
  )
}

export default ReplyContainer