import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Divider
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import GeneralSettings from "./General";
import { useGlobalContext } from "../../contexts/GlobalContext";

const isEmptySignature = (content) => {
  if (!content) return true;

  const cleaned = content
    .replace(/<p><\/p>/gi, "")       // remove <p></p>
    .replace(/<p><br><\/p>/gi, "")   // remove <p><br></p>
    .replace(/<br\s*\/?>/gi, "")     // remove <br> tags
    .replace(/&nbsp;/gi, "")         // remove non-breaking spaces
    .replace(/<[^>]+>/g, "")         // remove all other HTML tags
    .trim();

  return cleaned === "";
};

const GeneralTab = () => {
  const {
    vacationResponder,
    setVacationResponder,
    signaturesState: globalSignatures,
    setSignaturesState: setGlobalSignatures,
    notificationSettings: globalNotificationSettings,
    setNotificationSettings: setGlobalNotificationSettings,
    setShowQuickSettings,
  } = useGlobalContext();

  const [localVacationResponder, setLocalVacationResponder] = useState(vacationResponder);
  const [localSignatures, setLocalSignatures] = useState(globalSignatures);
  const [localNotificationSettings, setLocalNotificationSettings] = useState(globalNotificationSettings);

  const [hasChanges, setHasChanges] = useState(false);
  const navigate = useNavigate();

  // Initialize local settings from global context (which is already persisted)
  useEffect(() => {
    setLocalVacationResponder(vacationResponder);
    setLocalSignatures(globalSignatures);
    setLocalNotificationSettings(globalNotificationSettings);
  }, [vacationResponder, globalSignatures, globalNotificationSettings]);

  useEffect(() => {
    const hasLocalChanges =
      JSON.stringify(localVacationResponder) !== JSON.stringify(vacationResponder) ||
      JSON.stringify(localSignatures) !== JSON.stringify(globalSignatures) ||
      JSON.stringify(localNotificationSettings) !== JSON.stringify(globalNotificationSettings);

    setHasChanges(hasLocalChanges);
  }, [localVacationResponder, vacationResponder, localSignatures, globalSignatures, localNotificationSettings, globalNotificationSettings]);

  const handleSave = useCallback(() => {
    setVacationResponder(localVacationResponder);

    const filteredSignatures = {
      ...localSignatures,
      list: (localSignatures?.list || []).filter(
        (sig) => !isEmptySignature(sig.content)
      ),
    };
    setGlobalSignatures(filteredSignatures);
    setGlobalNotificationSettings(localNotificationSettings);

    setHasChanges(false);
    setShowQuickSettings(false);
    navigate("/inbox");
  }, [localVacationResponder, localSignatures, localNotificationSettings, setVacationResponder, setGlobalSignatures, setGlobalNotificationSettings]);

  const handleCancelChanges = () => {
    // Close the settings sidebar
    setShowQuickSettings(false);
    // Navigate back to inbox
    navigate('/inbox');
  };

  return (
    <Box sx={{ height: "calc(100vh - 200px)", overflowY: "auto" }}>
      <GeneralSettings
        localVacationResponder={localVacationResponder}
        setLocalVacationResponder={setLocalVacationResponder}
        localSignatures={localSignatures}
        setLocalSignatures={setLocalSignatures}
        localNotificationSettings={localNotificationSettings}
        setLocalNotificationSettings={setLocalNotificationSettings}
      />
            
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <button
          onClick={handleSave}
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
