import React, { useState, useEffect } from "react";
import { 
  Box, 
  Typography,
  Divider
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import VacationResponder from "./VacationResponder";
import { useGlobalContext } from "../../contexts/GlobalContext";

const GeneralTab = () => {
  const { vacationResponder, setVacationResponder } = useGlobalContext();
  const [localSettings, setLocalSettings] = useState(vacationResponder);
  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('vacationResponderSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setLocalSettings(parsedSettings);
        setVacationResponder(parsedSettings);
      } catch (error) {
        console.error('Error parsing vacation responder settings from localStorage:', error);
      }
    }
  }, [setVacationResponder]);

  // Check for changes whenever localSettings or vacationResponder changes
  useEffect(() => {
    const hasLocalChanges = JSON.stringify(localSettings) !== JSON.stringify(vacationResponder);
    setHasChanges(hasLocalChanges);
  }, [localSettings, vacationResponder]);

  const handleSaveChanges = () => {
    // Save to localStorage
    localStorage.setItem('vacationResponderSettings', JSON.stringify(localSettings));
    // Update global context
    setVacationResponder(localSettings);
    setHasChanges(false);
    // Navigate back to inbox
    navigate('/inbox');
  };

  const handleCancelChanges = () => {
    // Navigate back to inbox
    navigate('/inbox');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        General
      </Typography>
      
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
