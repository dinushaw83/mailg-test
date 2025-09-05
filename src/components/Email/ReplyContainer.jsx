import React, { useState, useEffect } from 'react';
import EmailRecipients from '../common/EmailRecipients';
import { useGlobalContext } from '../../contexts/GlobalContext';
import RichTextEditor from '../RichTextEditor/RichTextEditor';
import "./ReplyContainer.css";
import replyIcon from '../../icons/reply.png';
import replyAllIcon from '../../icons/replyall.png';
import forwardIcon from '../../icons/forward.png';
import dropdownArrow from '../../icons/dropdownarrow.png';

// TEMP
import styles from "../ComposeEmail/ComposeEmail.module.css";

const ReplyContainer = ({ email, replyType }) => {
  const { loggedInUser } = useGlobalContext();
  const firstLetter = loggedInUser.name.charAt(0);
  const [selectedReplyOption, setSelectedReplyOption] = useState(replyType);
  
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

  useEffect(() => {
    setRecipients(calculateRecipients(selectedReplyOption));
  }, [selectedReplyOption, email, loggedInUser.email]);
  
  const options = [
    { value: 'reply', label: 'Reply', icon: replyIcon },
    { value: 'replyAll', label: 'Reply All', icon: replyAllIcon },
    { value: 'forward', label: 'Forward', icon: forwardIcon }
  ];

  const getSelectedIcon = () => {
    return options.find(option => option.value === selectedReplyOption)?.icon;
  };

  const handleSend = () => {
    console.log(content)
  }

  const handleDelete = () => {
    console.log('delete')
  }

  return (
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
        </div>
        <div className="reply-editor-container">
          <RichTextEditor
            content={content.html}
            onChange={(html, plainText) => setContent({ html, plainText })}
            className="reply-editor"
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
  )
}

export default ReplyContainer