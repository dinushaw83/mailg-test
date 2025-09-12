import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import useMailActions from "../hooks/useMailActions";
import CheckBox from "./ui/CheckBox";
import { useGlobalContext } from "../contexts/GlobalContext";
import { useComposeModal } from "../hooks/useComposeModal";

const EmailList = ({ emails = [], showCheckboxes = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selection } = useGlobalContext();
  const { toggleImportant, toggleStar } = useMailActions();
  const { addNewComposeWindow } = useComposeModal();

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
    return email.labels.filter(label => label.toLowerCase() !== path && label.toLowerCase() === "inbox");
  }

  return (
    <tbody>
      {emails.map((email, index) => {
        const threadId = email.threadId.split(":")[1];
        return (
          <tr
            key={threadId}
            className={getRowClassName(email)}
            id={`:pi${index}`}
            tabIndex={-1}
            role="row"
            aria-labelledby={`:pj${index}`}
            draggable="false"
            onClick={() => navigateToEmailDetails(email, threadId)}
          >
            <td className="PF xY" />
            <td id={`:pk${index}`} className="oZ-x3 xY" data-tooltip="Select">
              <CheckBox
                id={`:pl${threadId}`}
                labelledBy={`:pj${threadId}`}
                checked={selection.isSelected(threadId)}
                onChange={() => selection.toggle(threadId)}
              />
            </td>
            <td className={`apU ${email.starred ? "" : "xY"}`}>
              <button
                type="button"
                aria-label={email.starred ? "Unstar" : "Star"}
                aria-pressed={email.starred}
                className="T-Jo"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleStar([email.id]);
                }}
                style={{
                  background: "transparent",
                  border: 0,
                  padding: 0,
                  cursor: "pointer",
                  color: email.starred ? "#FBBC04" : "rgba(0,0,0,.54)",
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 18,
                    verticalAlign: "middle",
                    fontVariationSettings: `'FILL' ${email.starred ? 1 : 0}`,
                  }}
                >
                  star
                </span>
              </button>
            </td>
            <td className="WA xY">
              <div
                className="pG"
                data-tooltip-contained="true"
                data-tooltip-align="b,l"
                data-tooltip-delay={1500}
                aria-label={getImportantAriaLabel(email)}
                role="switch"
                aria-checked={email.important.toString()}
                id={`:pn${index}`}
                data-is-important={email.important.toString()}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleImportant && toggleImportant([email.id]);
                }}
              >
                <div className="T-ays-a45 sf-hidden">{email.important && "Important according to Google magic."}</div>
                <div className={getImportantClassName(email)} />
                <div className="bnj" />
              </div>
            </td>
            <td className="yX xY" role="gridcell" tabIndex={-1}>
              <div id={`:pj${index}`} className="afn sf-hidden">
                {getAccessibilityText(email)}
              </div>
              <div id={`:po${index}`} className="yW">
                <span className="bA4">
                  <span
                    translate="no"
                    className={getSenderClassName(email)}
                    email={email.from.email}
                    name={email.from.name}
                    data-hovercard-id={email.from.email}
                    style={email.labels.includes("Drafts") ? { color: "#dd4b39", fontWeight: 400 } : {}}
                  >
                    {email.labels.includes("Drafts") ? "Draft" : email.from.name}
                  </span>
                </span>
              </div>
            </td>
            <td id={`:pp${index}`} tabIndex={-1} className="xY a4W" role="gridcell">
              <div className="a4X">
                <Link to={`${location.pathname}/${threadId}`} className="xS" role="link">
                  <div className="xT">
                    <div className="yi" id={`:pq${index}`}>
                      <div className="ar as">
                        <div
                          className="at"
                          title={email.labels[0]}
                          style={{
                            backgroundColor: email.labelColor,
                            borderColor: email.labelColor,
                          }}
                        >
                          <div
                            className="au"
                            style={{
                              borderColor: email.labelColor,
                            }}
                          />
                        </div>
                      </div>
                      <div className="as sf-hidden">&nbsp;</div>
                    </div>
                    <div className="y6">
                      <span id={`:pr${index}`} className="bog">
                        {getLabelBadges(email).map(label => (
                          <div
                            key={`Badge-${label}`}
                            style={{
                              backgroundColor: email?.labelColor ?? "#e1e3e1",
                              color: "#444746",
                              fontSize: "0.75rem",
                              padding: "0 4px",
                              textDecoration: "none",
                              width: "fit-content",
                              borderRadius: "4px",
                              marginRight: "6px",
                              display: "inline-block",
                            }}
                          >
                            {label}
                          </div>
                        ))}
                        <span
                          className={email.read ? "" : "bqe"}
                          data-thread-id={email.threadId}
                          data-legacy-thread-id={email.legacyThreadId}
                          data-legacy-last-message-id={email.legacyLastMessageId}
                          data-legacy-last-non-draft-message-id={email.legacyLastNonDraftMessageId}
                        >
                          {email.subject}
                        </span>
                      </span>
                    </div>
                    <span id={`:ps${index}`} className="y2">
                      <span className="Zt">&nbsp;-&nbsp;</span>
                      {email.preview}
                    </span>
                  </div>
                </Link>
                <span className="aKS sf-hidden" />
              </div>
            </td>
            <td className="byZ xY sf-hidden" role="gridcell" tabIndex={-1} />
            <td className="yf xY">&nbsp;</td>
            <td className="xW xY" role="gridcell" tabIndex={-1}>
              <span
                title={new Date(email.timestamp).toLocaleString()}
                id={`:pu${index}`}
                aria-label={new Date(email.timestamp).toLocaleString()}
              >
                <span className={email.read ? "" : "bq3"}>{formatDate(email.timestamp)}</span>
              </span>
            </td>
            <td className="bq4 xY sf-hidden" />
            <td className="xY" />
          </tr>
        );
      })}
    </tbody>
  );
};

export default EmailList;
