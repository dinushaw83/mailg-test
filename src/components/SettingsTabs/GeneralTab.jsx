import React, { useState, useEffect } from "react";
import {
  Box,
  Divider
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import GeneralSettings from "./General";
import { useGlobalContext } from "../../contexts/GlobalContext";

const GeneralTab = () => {
  const { 
    vacationResponder, 
    setVacationResponder, 
    setShowQuickSettings 
  } = useGlobalContext();

  const [localVocationResponderSettings, setLocalVocationResponderSettings] = useState(vacationResponder);
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();

  // Initialize local settings from global context (which is already persisted)
  useEffect(() => {
    setLocalVocationResponderSettings(vacationResponder);
  }, [vacationResponder]);

  // Check for changes whenever localVocationResponderSettings or vacationResponder changes
  useEffect(() => {
    const hasLocalChanges = JSON.stringify(localVocationResponderSettings) !== JSON.stringify(vacationResponder);
    setHasChanges(hasLocalChanges);
  }, [localVocationResponderSettings, vacationResponder]);

  const handleSaveChanges = () => {
    // Update global context (which automatically persists to localStorage via usePersistedState)
    setVacationResponder(localVocationResponderSettings);
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
    <Box sx={{ height: "calc(100vh - 200px)", overflowY: "auto" }}>
      <GeneralSettings
        localSettings={localVocationResponderSettings}
        setLocalSettings={setLocalVocationResponderSettings}
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
