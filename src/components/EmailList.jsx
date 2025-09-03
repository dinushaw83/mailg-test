import React from "react";
import useMailActions from "../hooks/useMailActions";

const EmailList = ({ emails = [], showCheckboxes = true }) => {
  const { toggleImportant } = useMailActions()
  
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
    return email.important
      ? "Important according to Google magic."
      : "Not important";
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

  return (
    <tbody>
      {emails.map((email, index) => (
        <tr
          key={email.id}
          className={getRowClassName(email)}
          id={`:pi${index}`}
          tabIndex={-1}
          role="row"
          aria-labelledby={`:pj${index}`}
          draggable="false"
        >
          <td className="PF xY" />
          <td id={`:pk${index}`} className="oZ-x3 xY" data-tooltip="Select">
            <div
              id={`:pl${index}`}
              className="oZ-jc T-Jo J-J5-Ji"
              role="checkbox"
              aria-labelledby={`:pj${index}`}
              dir="ltr"
              aria-checked="false"
              tabIndex={-1}
            >
              <div className="T-Jo-auh sf-hidden" />
            </div>
          </td>
          <td className="apU xY">
            {email.starred && (
              <span
                id={`:pm${index}`}
                className="T-KT T-KT-Jp"
                aria-label="Starred"
                role="button"
                data-tooltip="Starred"
              >
                <img
                  className="T-KT-JX"
                  src="/assets/images/pr_2_image_1.gif"
                  alt="Starred"
                />
              </span>
            )}
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
              <div className="T-ays-a45 sf-hidden">
                {email.important && "Important according to Google magic."}
              </div>
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
                >
                  {email.from.name}
                </span>
              </span>
            </div>
          </td>
          <td
            id={`:pp${index}`}
            tabIndex={-1}
            className="xY a4W"
            role="gridcell"
          >
            <div className="a4X">
              <div className="xS" role="link">
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
                      <span
                        className={email.read ? "" : "bqe"}
                        data-thread-id={email.threadId}
                        data-legacy-thread-id={email.legacyThreadId}
                        data-legacy-last-message-id={email.legacyLastMessageId}
                        data-legacy-last-non-draft-message-id={
                          email.legacyLastNonDraftMessageId
                        }
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
              </div>
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
              <span className={email.read ? "" : "bq3"}>
                {formatDate(email.timestamp)}
              </span>
            </span>
          </td>
          <td className="bq4 xY sf-hidden" />
          <td className="xY" />
        </tr>
      ))}
    </tbody>
  );
};

export default EmailList;
