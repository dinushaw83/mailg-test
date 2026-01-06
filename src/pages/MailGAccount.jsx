import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import PrivacyHub from "../components/SettingsTabs/PrivacyHub";

const MailGAccount = () => {
  const { view } = useParams();
  const navigate = useNavigate();

  // Convert hyphenated URL param to camelCase for PrivacyHub
  // e.g., 'data-privacy' -> 'dataAndPrivacy', 'personal-info' -> 'personalInfo'
  const convertViewName = (urlView) => {
    if (!urlView) return "personalInfo";

    const viewMap = {
      "personal-info": "personalInfo",
      "data-privacy": "dataAndPrivacy",
      security: "security",
      storage: "storage",
      preferences: "preferences",
    };

    return viewMap[urlView] || urlView;
  };

  const initialView = convertViewName(view);

  const handleClose = () => {
    // Navigate back to inbox or previous page
    navigate(-1);
  };

  return <PrivacyHub open={true} onClose={handleClose} initialView={initialView} />;
};

export default MailGAccount;
