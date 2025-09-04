import React from 'react';
import { useParams } from 'react-router-dom';
import { useGlobalContext } from '../contexts/GlobalContext';

const EmailView = () => {
  const { uuid } = useParams();
  const { state } = useGlobalContext();
  
  // Find the email with the matching id
  const email = state.emails.find(email => email.uuid === uuid);

  if (!email) {
    return <div>Email not found</div>;
  }

  return (
    <div style={{
      flex: 1,
    }}>
      <h4>{email.subject}</h4>
    </div>
  );
};

export default EmailView;
