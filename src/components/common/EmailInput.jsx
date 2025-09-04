import React, { useState, useRef, useEffect } from 'react';
import './EmailInput.css';

const EmailInput = React.forwardRef(({ label, emails, onEmailAdded, onEmailRemoved, isParentFocused = false, onFocusChange }, ref) => {
  console.log("EmailInput", label, emails);
  const [inputValue, setInputValue] = useState('');
  const [addedEmails, setAddedEmails] = useState(emails);
  const [isFocused, setIsFocused] = useState(isParentFocused);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current && (isFocused || isParentFocused)) {
      inputRef.current.focus();
    }
  }, [isFocused, isParentFocused, inputRef.current]);

  useEffect(() => {
    setIsFocused(isParentFocused);
    if (!isParentFocused) {
      inputRef.current?.blur();
    }
  }, [isParentFocused]);

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const generateRandomColor = () => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const trimmedEmail = inputValue.trim();
      if (isValidEmail(trimmedEmail)) {
        const newEmail = { email: trimmedEmail };
        setAddedEmails([...addedEmails, newEmail]);
        setInputValue('');
        onEmailAdded && onEmailAdded(newEmail);
      }
    }
  };

  const removeEmail = (emailToRemove, e) => {
    e.preventDefault(); // Prevent the default action
    e.stopPropagation(); // Stop event bubbling
    setAddedEmails(addedEmails.filter(email => email.email !== emailToRemove.email));
    onEmailRemoved && onEmailRemoved(emailToRemove);
    // Restore focus to the input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const EmailPill = ({ email: recipient }) => {
    const [color] = useState(generateRandomColor);
    const displayName = recipient.name || recipient.email;
    
    return (
      <div className="email-pill">
        <div 
          className="email-circle" 
          style={{ backgroundColor: color }}
        >
          {displayName[0].toUpperCase()}
        </div>
        <span className="email-text">
          {recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email}
        </span>
        <button 
          className="remove-email"
          onClick={(e) => removeEmail(recipient, e)}
        >
          ×
        </button>
      </div>
    );
  };

  const CollapsedView = ({ emails }) => {
    if (emails.length === 0) return null;
    
    const displayEmails = emails.slice(0, 2);
    const remainingCount = emails.length - 2;
    
    return (
      <div className="collapsed-view">
        <span className="collapsed-emails">
          {displayEmails.map((recipient, index) => (
            <span key={recipient.email}>
              {recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email}
              {index === 0 && displayEmails.length > 1 ? ', ' : ''}
            </span>
          ))}
        </span>
        {remainingCount > 0 && (
          <span className="more-count">
            {`${remainingCount} more`}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="email-input-wrapper">
      {label && <label className={`email-label ${isFocused ? 'visible' : ''}`}>{label}</label>}
      <div className="input-container">
        {isFocused ? (
          <div className="pills-container">
            {addedEmails.map((email, index) => (
              <EmailPill 
                key={index}
                email={email}
              />
            ))}
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsFocused(true);
                onFocusChange?.(true);
              }}
              onBlur={(e) => {
                // If the blur event target is inside a pill, ignore the event
                // (i.e., don't set isFocused to false)
                // Pills have className 'email-pill' or their children
                if (
                  e.relatedTarget &&
                  (
                    e.relatedTarget.classList.contains('email-pill') ||
                    e.relatedTarget.closest('.email-pill') ||
                    e.relatedTarget.classList.contains('email-option') ||
                    e.relatedTarget.closest('.email-option') ||
                    e.relatedTarget.classList.contains('email-input') ||
                    e.relatedTarget.closest('.email-input')
                  )
                ) {
                  return;
                }
                setIsFocused(false);
                onFocusChange?.(false);
              }}
              placeholder={addedEmails.length === 0 ? "Recipients" : ""}
              className="email-input"
              ref={(el) => {
                inputRef.current = el;
                if (typeof ref === 'function') ref(el);
                else if (ref) ref.current = el;
              }}
            />
          </div>
        ) : (
          <div 
            className="collapsed-container"
            onClick={() => {
              setIsFocused(true);
              inputRef.current?.focus();
            }}
          >
            {addedEmails.length === 0 ? (
              <input
                type="text"
                readOnly
                placeholder={addedEmails.length === 0 ? "Recipients" : ""}
                className="email-input"
                onFocus={() => {
                  setIsFocused(true);
                }}
              />
            ) : (
              <CollapsedView emails={addedEmails} />
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default EmailInput;