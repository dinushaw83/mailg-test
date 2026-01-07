import React, { useEffect, useRef } from "react";
import useLabels, { getPathLabelFromKey } from "../../hooks/useLabels";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { CATEGORIES } from "../../utils/categories";
import Footer from "./Footer";
import Table from "./Table";
import { useComposeModal } from "../../hooks/useComposeModal";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useHotkeys } from "react-hotkeys-hook";
import useMailActions from "../../hooks/useMailActions";

const useCustomHotKeys = ({ emails }) => {
  const { selection, keyboardShortcuts } = useGlobalContext();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";
  const lastStarAt = useRef(0);

  useHotkeys(shortcutsOn ? "shift+8" : "", () => {
    lastStarAt.current = Date.now();
  });

  useHotkeys(shortcutsOn ? "a" : "", () => {
    if (Date.now() - lastStarAt.current < 1000) {
      // treat as "*" then "a"
      const ids = emails.map((email) => email.threadId);
      selection.setMany(ids);
    }
  });

  useHotkeys(shortcutsOn ? "n" : "", () => {
    // deselect all
    if (Date.now() - lastStarAt.current < 1000) {
      // *>n
      selection.clear();
    }
  });

  useHotkeys(shortcutsOn ? "r" : "", () => {
    if (Date.now() - lastStarAt.current < 1000) {
      // *>r
      const readEmails = emails.filter((email) => email.isEmailRead);
      const ids = readEmails.map((email) => email.threadId);
      selection.setMany(ids);
    }
  });

  useHotkeys(shortcutsOn ? "u" : "", () => {
    if (Date.now() - lastStarAt.current < 1000) {
      // *>u
      const unreadEmails = emails.filter((email) => !email.isEmailRead);
      const ids = unreadEmails.map((email) => email.threadId);
      selection.setMany(ids);
    }
  });

  useHotkeys(shortcutsOn ? "s" : "", () => {
    if (Date.now() - lastStarAt.current < 1000) {
      // *>u
      const starredEmails = emails.filter((email) => email.starred);
      const ids = starredEmails.map((email) => email.threadId);
      selection.setMany(ids);
    }
  });

  useHotkeys(shortcutsOn ? "t" : "", () => {
    if (Date.now() - lastStarAt.current < 1000) {
      // *>u
      const unstarredEmails = emails.filter((email) => !email.starred);
      const ids = unstarredEmails.map((email) => email.threadId);
      selection.setMany(ids);
    }
  });
};

const EmailList = ({ emails = [], showCheckboxes = true, setShowAdvancedMenu, showFooter = true }) => {
  // Add isEmailRead property based on unreadCount
  // A thread is considered read only if unreadCount is 0
  const emailsWithReadStatus = emails.map((email) => ({
    ...email,
    isEmailRead: email.unreadCount === 0,
  }));

  const navigate = useNavigate();
  const location = useLocation();
  const { selection, composeWindows, softRemovedLabels, setSoftRemovedLabels } = useGlobalContext();

  const { toggleImportant, toggleStar } = useMailActions();
  const { addNewComposeWindow } = useComposeModal();

  const { folder, label } = useParams();
  const { labels } = useLabels();

  const categoryLabels = Object.values(CATEGORIES).map((c) => c.toLowerCase());

  useCustomHotKeys({ emails: emailsWithReadStatus });

  /**
   * - If the timestamp is in the future, clamp it to the current time
   * - Show time in 24-hour format (HH:mm) if it's today
   * - Show "Mon DD" if it's earlier in the same year
   * - Show "DD/MM/YYYY" if it's from a previous year
   */
  function formatDate(inputTimestamp) {
    // Convert to Date object
    let date = new Date(inputTimestamp);
    const now = new Date();

    // Clamp future timestamps to "now"
    if (date.getTime() > now.getTime()) {
      date = now;
    }

    // Check if it's the same day
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const isSameYear = date.getFullYear() === now.getFullYear();

    if (isToday) {
      // Return time in 24-hour format like "09:12", "21:23"
      return date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } else if (isSameYear) {
      // Return date format like "Feb 27" for dates earlier in the same year
      const day = date.toLocaleString("en-GB", { day: "2-digit" });
      const month = date.toLocaleString("en-GB", { month: "short" });
      return `${month} ${day}`;
    } else {
      // Return date format like "13/05/2023" for previous years
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    }
  }

  const getRowClassName = (email, isActive) => {
    let className = `zA ${isActive ? "active" : ""}`;
    className += email.isEmailRead ? " yO" : " zE";
    return className;
  };

  const getSenderClassName = (email) => {
    return email.isEmailRead ? "yP" : "zF";
  };

  const getImportantAriaLabel = (email) => {
    return email.important ? "Important according to Google magic." : "Not important";
  };

  const getImportantClassName = (email) => {
    return email.important ? "pH a9q" : "pH-A7 a9q";
  };

  const getAccessibilityText = (email) => {
    const status = [];
    if (email.starred) status.push("starred");
    if (!email.isEmailRead) status.push("unread");
    if (email.important) status.push("Important");
    status.push(email.from.name);
    status.push(email.subject);
    status.push(formatDate(email.timestamp));
    status.push(email.preview);
    return status.join(", ");
  };

  // Navigate to the email details page
  const navigateToEmailDetails = (email, threadId) => {
    // If compose param is present in the url, include it while navigating
    const urlParams = new URLSearchParams(location.search);
    const composeParam = urlParams.get("compose");
    const pathname = location.pathname;

    const isComposeDraft = email.labels.includes("Drafts") && email.messageCount === 1;

    // If labels includes Drafts, then add new compose window with the draft id
    if (isComposeDraft) {
      // Check if already a compose window with the draft id exists
      const composeWindow = composeWindows.find((window) => window?.draftId?.toString() === email.id.toString());
      // If compose window with the draft id doesn't exist, then add new compose window with the draft id
      if (!composeWindow) {
        addNewComposeWindow(email.id);
      }
      return;
    }

    if (pathname.startsWith("/search")) {
      const composeQuery = composeParam ? `?compose=${composeParam}` : "";
      navigate(`/inbox/${threadId}${composeQuery}`);
      return;
    }

    if (composeParam) {
      navigate(`${location.pathname}/${threadId}?compose=${composeParam}`);
    } else {
      navigate(`${location.pathname}/${threadId}`);
    }
  };

  const getLabelBadges = (email) => {
    // Simply return the label objects with their id, name, and color
    // Labels are already in object format: { id, name, color }
    return (email.labels || []).map((labelObj) => ({
      key: labelObj.id || labelObj.name,
      displayName: labelObj.name,
      color: labelObj.color,
    }));
  };

  useEffect(() => {
    setSoftRemovedLabels({});
  }, [location.pathname]);

  return (
    <div className="Nu tf aZ6" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div
        style={{
          height: "100%",
          minWidth: "518px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <Table
          {...{
            emails: emailsWithReadStatus,
            getRowClassName,
            navigateToEmailDetails,
            selection,
            toggleStar,
            toggleImportant,
            getImportantAriaLabel,
            getImportantClassName,
            getAccessibilityText,
            getSenderClassName,
            getLabelBadges,
            formatDate,
            setShowAdvancedMenu,
          }}
        />
      </div>
      {showFooter && <Footer />}
    </div>
  );
};

export default EmailList;
