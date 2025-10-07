import React from "react";
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "../contexts/GlobalContext";

const VacationResponderBar = () => {
  const { vacationResponder, setVacationResponder, setSnackbar } = useGlobalContext();
  const navigate = useNavigate();

  // Don't show the bar if vacation responder is not enabled
  if (!vacationResponder.enabled) {
    return null;
  }

  const handleEndNow = () => {
    setVacationResponder(prev => ({
      ...prev,
      enabled: false
    }));
    
    // Show snackbar notification
    setSnackbar({
      open: true,
      message: "Your preferences have been saved.",
      action: null,
      autoHideDuration: null,
      hideClose: false,
    });
  };

  const handleVacationSettings = () => {
    navigate('/settings/general');
  };

  return (
    <div style={{
      backgroundColor: '#fff1a8', // Pale yellow background
      padding: '8px 16px',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      borderBottom: '1px solid #e0e0e0',
      fontSize: '14px',
      gap: "8px"
    }}>
      <span style={{ color: '#1a73e8', cursor: 'pointer' }} onClick={handleEndNow}>
        End now
      </span>
      <span style={{ color: '#1a73e8', cursor: 'pointer' }} onClick={handleVacationSettings}>
        Vacation Settings
      </span>
    </div>
  );
};

export default VacationResponderBar;
