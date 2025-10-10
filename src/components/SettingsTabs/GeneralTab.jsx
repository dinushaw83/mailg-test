import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography,
  Divider
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import VacationResponder from "./VacationResponder";
import DesktopNotifications from "./DesktopNotifications";
import { useGlobalContext } from "../../contexts/GlobalContext";

const GeneralTab = () => {
  const { 
    vacationResponder, 
    setVacationResponder, 
    setShowQuickSettings 
  } = useGlobalContext();
  const [localSettings, setLocalSettings] = useState(vacationResponder);
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();

  // Initialize local settings from global context (which is already persisted)
  useEffect(() => {
    setLocalSettings(vacationResponder);
  }, [vacationResponder]);

  // Check for changes whenever localSettings or vacationResponder changes
  useEffect(() => {
    const hasLocalChanges = JSON.stringify(localSettings) !== JSON.stringify(vacationResponder);
    setHasChanges(hasLocalChanges);
  }, [localSettings, vacationResponder]);

  const handleSaveChanges = () => {
    // Update global context (which automatically persists to localStorage via usePersistedState)
    setVacationResponder(localSettings);
    setHasChanges(false);
    // Close the settings sidebar
    setShowQuickSettings(false);
    // Navigate back to inbox
    navigate('/inbox');
  };

  const handleCancelChanges = () => {
    // Close the settings sidebar
    setShowQuickSettings(false);
    // Navigate back to inbox
    navigate('/inbox');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        General
      </Typography>
      
      {/* Desktop Notifications Section */}
      <DesktopNotifications />
      
      {/* Vacation Responder Section */}
      <VacationResponder 
        localSettings={localSettings}
        setLocalSettings={setLocalSettings}
      />
      
      {/* Horizontal Rule */}
      <Divider sx={{ marginTop: 3, marginBottom: 1 }} />
      
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <button
          onClick={handleSaveChanges}
          disabled={!hasChanges}
          style={{ fontSize: "14px" }}
        >
          Save changes
        </button>
        <button
          onClick={handleCancelChanges}
          style={{ fontSize: "14px" }}
        >
          Cancel
        </button>
      </Box>
    </Box>
  );
};

export default GeneralTab;
