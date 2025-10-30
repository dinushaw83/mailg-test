import React, { useState, useEffect, useCallback } from "react";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

import GeneralSettings from "./General";
import { useGlobalContext } from "../../contexts/GlobalContext";

const isEmptySignature = (content) => {
  if (!content) return true;

  const cleaned = content
    .replace(/<p><\/p>/gi, "") // remove <p></p>
    .replace(/<p><br><\/p>/gi, "") // remove <p><br></p>
    .replace(/<br\s*\/?>/gi, "") // remove <br> tags
    .replace(/&nbsp;/gi, "") // remove non-breaking spaces
    .replace(/<[^>]+>/g, "") // remove all other HTML tags
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
    keyboardShortcuts,
    setKeyboardShortcuts,
  } = useGlobalContext();

  const [localVacationResponder, setLocalVacationResponder] = useState(vacationResponder);
  const [localSignatures, setLocalSignatures] = useState(globalSignatures);
  const [localShortcuts, setLocalShortcuts] = useState(keyboardShortcuts);
  const navigate = useNavigate();
  const [localNotificationSettings, setLocalNotificationSettings] = useState(globalNotificationSettings);

  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local settings from global context (which is already persisted)
  useEffect(() => {
    setLocalVacationResponder(vacationResponder);
    setLocalSignatures(globalSignatures);
    setLocalShortcuts(keyboardShortcuts);
    setLocalNotificationSettings(globalNotificationSettings);
  }, [vacationResponder, globalSignatures, keyboardShortcuts, globalNotificationSettings]);

  useEffect(() => {
    const hasLocalChanges =
      JSON.stringify(localVacationResponder) !== JSON.stringify(vacationResponder) ||
      JSON.stringify(localSignatures) !== JSON.stringify(globalSignatures) ||
      JSON.stringify(localShortcuts) !== JSON.stringify(keyboardShortcuts) ||
      JSON.stringify(localNotificationSettings) !== JSON.stringify(globalNotificationSettings);

    setHasChanges(hasLocalChanges);
  }, [
    localVacationResponder,
    vacationResponder,
    localSignatures,
    globalSignatures,
    localShortcuts,
    keyboardShortcuts,
    localNotificationSettings,
    globalNotificationSettings,
  ]);

  const handleSave = useCallback(() => {
    setVacationResponder(localVacationResponder);

    const filteredSignatures = {
      ...localSignatures,
      list: (localSignatures?.list || []).filter((sig) => !isEmptySignature(sig.content)),
    };
    setGlobalSignatures(filteredSignatures);
    setKeyboardShortcuts(localShortcuts);
    setGlobalNotificationSettings(localNotificationSettings);

    setHasChanges(false);
    setShowQuickSettings(false);
    navigate("/inbox");
  }, [
    localVacationResponder,
    localSignatures,
    localShortcuts,
    setVacationResponder,
    setGlobalSignatures,
    setKeyboardShortcuts,
    setGlobalNotificationSettings,
  ]);

  const handleCancel = useCallback(() => {
    setShowQuickSettings(false);
    navigate("/inbox");
  }, [navigate, setShowQuickSettings]);

  return (
    <Box sx={{ height: "calc(100vh - 200px)", overflowY: "auto" }}>
      <GeneralSettings
        localVacationResponder={localVacationResponder}
        setLocalVacationResponder={setLocalVacationResponder}
        localSignatures={localSignatures}
        setLocalSignatures={setLocalSignatures}
        localShortcuts={localShortcuts}
        setLocalShortcuts={setLocalShortcuts}
        localNotificationSettings={localNotificationSettings}
        setLocalNotificationSettings={setLocalNotificationSettings}
        handleSave={handleSave}
        handleCancel={handleCancel}
        hasChanges={hasChanges}
      />
    </Box>
  );
};

export default GeneralTab;
