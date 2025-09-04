import React, { useState } from 'react';
import EmailRecipients from '../common/EmailRecipients';
import { useGlobalContext } from '../../contexts/GlobalContext';
import "./ReplySection.css";
import replyIcon from '../../icons/reply.png';
import replyAllIcon from '../../icons/replyall.png';
import forwardIcon from '../../icons/forward.png';
import dropdownArrow from '../../icons/dropdownarrow.png';

const ReplySection = () => {
  const { state } = useGlobalContext();
  const firstLetter = state.user.name.charAt(0);
  const [selectedReplyOption, setSelectedReplyOption] = useState('reply');
  const [recipients, setRecipients] = useState({
    to: [],
    cc: [],
    bcc: []
  });
  
  const options = [
    { value: 'reply', label: 'Reply', icon: replyIcon },
    { value: 'replyAll', label: 'Reply All', icon: replyAllIcon },
    { value: 'forward', label: 'Forward', icon: forwardIcon }
  ];

  const getSelectedIcon = () => {
    return options.find(option => option.value === selectedReplyOption)?.icon;
  };

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
      </div>
    </div>
  )
}

export default ReplySection