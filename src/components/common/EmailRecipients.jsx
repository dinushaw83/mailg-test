import React, { useState, useContext, useEffect } from 'react';
import EmailInput from './EmailInput';
import './EmailRecipients.css';
import { GlobalContext } from '../../contexts/GlobalContext';

const EmailRecipients = ({ recipients, setRecipients }) => {
  const { recipients: globalRecipients } = useContext(GlobalContext);
  const [isAnyInputFocused, setIsAnyInputFocused] = useState(false);
  
  const [visibleInputs, setVisibleInputs] = useState({
    to: true,    // 'To' is always visible
    cc: recipients.cc?.length > 0,
    bcc: recipients.bcc?.length > 0
  });

  // Update visible inputs when recipients change
  useEffect(() => {
    setVisibleInputs(prev => ({
      ...prev,
      cc: recipients.cc?.length > 0,
      bcc: recipients.bcc?.length > 0
    }));
  }, [recipients]);

  // Handle adding email to a specific list
  const handleEmailAdded = (type) => (email) => {
    setRecipients(prev => ({
      ...prev,
      [type]: [...prev[type], email]
    }));
  };

  // Handle removing email from a specific list
  const handleEmailRemoved = (type) => (email) => {
    setRecipients(prev => ({
      ...prev,
      [type]: prev[type].filter(e => e !== email)
    }));
  };

  // Handle showing a new input type
  const showInput = (type) => {
    setVisibleInputs(prev => ({
      ...prev,
      [type]: true
    }));
  };

  // Handle focus changes from any input
  const handleInputFocus = (isFocused) => {
    setIsAnyInputFocused(isFocused);
    
    // When losing focus, hide empty CC/BCC inputs
    if (!isFocused) {
      setVisibleInputs(prev => ({
        ...prev,
        cc: prev.cc && recipients.cc.length > 0,
        bcc: prev.bcc && recipients.bcc.length > 0
      }));
    }
  };

  // Get all recipients for collapsed view
  const getAllRecipients = () => {
    const allRecipients = [
      ...recipients.to.map(email => ({ email, type: 'to' })),
      ...recipients.cc.map(email => ({ email, type: 'cc' })),
      ...recipients.bcc.map(email => ({ email, type: 'bcc' }))
    ];
    return allRecipients;
  };

  const totalRecipients = getAllRecipients();
  const hasRecipients = totalRecipients.length > 0;

  return (
    <div className="email-recipients-wrapper">
      {isAnyInputFocused ? (
        <>
          {/* To input - always visible */}
          <EmailInput
            label="To"
            emails={recipients.to}
            onEmailAdded={handleEmailAdded('to')}
            onEmailRemoved={handleEmailRemoved('to')}
            isParentFocused={isAnyInputFocused}
            onFocusChange={handleInputFocus}
          />

          {/* CC input */}
          {visibleInputs.cc && (
            <EmailInput
              label="Cc"
              emails={recipients.cc}
              onEmailAdded={handleEmailAdded('cc')}
              onEmailRemoved={handleEmailRemoved('cc')}
              isParentFocused={isAnyInputFocused}
              onFocusChange={handleInputFocus}
            />
          )}

          {/* BCC input */}
          {visibleInputs.bcc && (
            <EmailInput
              label="Bcc"
              emails={recipients.bcc}
              onEmailAdded={handleEmailAdded('bcc')}
              onEmailRemoved={handleEmailRemoved('bcc')}
              isParentFocused={isAnyInputFocused}
              onFocusChange={handleInputFocus}
            />
          )}

          {/* Options for showing CC/BCC */}
          {(!visibleInputs.cc || !visibleInputs.bcc) && isAnyInputFocused && (
            <div className="email-recipients-options">
              {!visibleInputs.cc && (
                <button 
                  className="email-option"
                  onClick={() => {
                    setIsAnyInputFocused(true);
                    showInput('cc');
                  }}
                >
                  Cc
                </button>
              )}
              {!visibleInputs.bcc && (
                <button 
                  className="email-option"
                  onClick={() => showInput('bcc')}
                >
                  Bcc
                </button>
              )}
            </div>
          )}
        </>
      ) : (
        <div 
          className="collapsed-container"
          onClick={() => setIsAnyInputFocused(true)}
        >
          {hasRecipients ? (
            <div className="collapsed-view">
              <span className="collapsed-emails">
                {totalRecipients.slice(0, 2).map((r, i) => {
                  const recipientDetails = globalRecipients.find(gr => gr.email === r.email);
                  return (
                    <span key={i}>
                      {recipientDetails?.name || r.email}
                      {i === 0 && totalRecipients.length > 1 ? ', ' : ''}
                    </span>
                  );
                })}
              </span>
              {totalRecipients.length > 2 && (
                <span className="more-count">
                  {`${totalRecipients.length - 2} more`}
                </span>
              )}
            </div>
          ) : (
            <input
              type="text"
              readOnly
              placeholder="Recipients"
              className="email-input"
              style={{ marginTop: 4 }}
              onFocus={() => setIsAnyInputFocused(true)}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default EmailRecipients;