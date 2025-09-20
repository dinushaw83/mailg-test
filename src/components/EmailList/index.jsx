import React from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";

import useMailActions from "../../hooks/useMailActions";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useComposeModal } from "../../hooks/useComposeModal";

import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { EmailContent } from "../InboxView";
import Table from "./Table";
import Footer, { PanelFooter } from "./Footer";

const EmailList = ({ emails = [], showCheckboxes = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selection, panelState, previewEmail } = useGlobalContext();
  const { toggleImportant, toggleStar } = useMailActions();
  const { addNewComposeWindow } = useComposeModal();
  const { folder, label } = useParams();

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const getRowClassName = (email) => {
    let className = "zA";
    if (email.read) {
      className += " yO";
    } else {
      className += " zE";
    }
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
      addNewComposeWindow(email.id);
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

  const { direction, showPanel } = panelState;

  return (
    <div className="Nu tf aZ6" style={{ flex: 1, display: "flex" }}>
      <div style={{ flex: 1, minWidth: "518px" }}>
        <PanelGroup direction={direction}>
          <Panel defaultSize={50}>
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
