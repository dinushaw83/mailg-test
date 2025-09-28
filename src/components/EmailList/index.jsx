import React from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";

import useMailActions from "../../hooks/useMailActions";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useComposeModal } from "../../hooks/useComposeModal";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { EmailContent } from "../InboxView";
import Table from "./Table";
import Footer from "./Footer";

const EmailList = ({ emails = [], showCheckboxes = true, setShowAdvancedMenu }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selection, composeWindows, panelState, previewEmail } = useGlobalContext();
  const { toggleImportant, toggleStar } = useMailActions();
  const { addNewComposeWindow } = useComposeModal();

  const { folder, label } = useParams();

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();

    // Check if it's the same day
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      // Return time in 24-hour format like "09:12", "21:23"
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } else {
      // Return date format like "21 Sept", "12 Aug"
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      });
    }
  };

  const getRowClassName = (email, isActive) => {
    let className = `zA ${isActive ? "active" : ""}`;
    className += email.read ? " yO" : " zE";
    return className;
  };

  const getSenderClassName = (email) => {
    return email.read ? "yP" : "zF";
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
    if (!email.read) status.push("unread");
    if (email.important) status.push("Important");
    status.push(email.from.name);
    status.push(email.subject);
    status.push(formatDate(email.timestamp));
    status.push(email.preview);
    return status.join(", ");
  };

  // Navigate to the email details page
  const navigateToEmailDetails = (email, threadId) => {
    // If labels includes Drafts, then add new compose window with the draft id
    if (email.labels.includes("Drafts")) {
      // Check if already a compose window with the draft id exists
      const composeWindow = composeWindows.find((window) => window?.draftId?.toString() === email.id.toString());
      // If compose window with the draft id doesn't exist, then add new compose window with the draft id
      if (!composeWindow) {
        addNewComposeWindow(email.id);
      }
    } else {
      // If compose param is present in the url, include it while navigating
      const urlParams = new URLSearchParams(location.search);
      const composeParam = urlParams.get("compose");
      if (composeParam) {
        navigate(`${location.pathname}/${threadId}?compose=${composeParam}`);
      } else {
        navigate(`${location.pathname}/${threadId}`);
      }
    }
  };

  // Get the label badges
  const getLabelBadges = (email) => {
    const path = location.pathname.replace("/", "");

    // If Inbox label is present in path other than inbox, return it
    return email.labels.filter((label) => label.toLowerCase() !== path && label.toLowerCase() === "inbox");
  };

  const { direction: internalDirection, showPanel } = panelState;
  const direction = internalDirection === "vertical" ? "horizontal" : "vertical";

  return (
    <div className="Nu tf aZ6" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <div style={{ height: "100%", minWidth: "518px", overflowY: "hidden" }}>
        <PanelGroup direction={direction}>
          <Panel defaultSize={40} minSize={25}>
            <Table
              {...{
                emails,
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
          </Panel>
          {showPanel && (
            <>
              <PanelResizeHandle
                style={{
                  [direction === "horizontal" ? "width" : "height"]: "4px",
                  backgroundColor: "#e0e0e0",
                  cursor: "col-resize",
                }}
              />
              <Panel defaultSize={50}>
                <EmailContent
                  threadId={previewEmail?.threadId.split(":")[1]}
                  folder={folder}
                  label={label}
                  showActionBar={false}
                  isPreview
                />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
      {!showPanel && <Footer />}
    </div>
  );
};

export default EmailList;
