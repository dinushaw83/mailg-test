import React, { useState } from "react";

const FiltersTab = () => {
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    // Handle save logic
    setHasChanges(false);
  };

  const handleCancel = () => {
    // Reset changes
    setHasChanges(false);
  };

  return (
    <div
      className="nH r4"
      style={{
        overflow: "auto",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        padding: "0px 24px 24px",
      }}
    >
      <table
        className="cf"
        width="100%"
        cellPadding="0"
        role="list"
        style={{
          borderCollapse: "collapse",
          margin: "0px",
          lineHeight: "20px",
        }}
      >
        <tbody>
          {/* Filters Section Header */}
          <tr
            className="r7"
            role="listitem"
            style={{
              WebkitFontSmoothing: "antialiased",
              fontFamily:
                '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
              fontSize: "0.875rem",
              letterSpacing: "normal",
            }}
          >
            <td
              className="CZ"
              colSpan="3"
              style={{
                margin: "0px",
                padding: "0px",
                lineHeight: "40px",
              }}
            >
              <b>
                The following filters are applied to all incoming mail:
              </b>
            </td>
          </tr>

          {/* Override filters info (hidden by default) */}
          <tr
            className="r7"
            role="listitem"
            style={{
              WebkitFontSmoothing: "antialiased",
              fontFamily:
                '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
              fontSize: "0.875rem",
              letterSpacing: "normal",
              display: "none",
            }}
          >
            <td
              className="CZ"
              colSpan="3"
              style={{
                margin: "0px",
                padding: "0px",
                lineHeight: "40px",
              }}
            >
              The{" "}
              <span
                className="e"
                role="link"
                style={{
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  textDecoration: "none",
                  color: "rgb(17, 85, 204)",
                }}
              >
                Inbox setting for important messages
              </span>{" "}
              is set to "Override filters." That means "Skip Inbox" filter
              rules will be ignored for messages that are important.
            </td>
          </tr>

          {/* Divider */}
          <tr>
            <td
              className="rZ"
              colSpan="3"
              style={{
                margin: "0px",
                padding: "0px",
                backgroundColor: "rgb(229, 229, 229)",
                height: "1px",
              }}
            />
          </tr>

          {/* Select All/None */}
          <tr role="listitem">
            <td
              className="yV"
              colSpan="3"
              style={{
                margin: "0px",
                whiteSpace: "nowrap",
                padding: "3px 0px 3px 2px",
                fontSize: "0.875rem",
              }}
            >
              Select:{" "}
              <span className="yU" style={{ cursor: "pointer" }}>
                <span
                  className="rW sA"
                  role="link"
                  tabIndex="0"
                  style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                  }}
                >
                  All
                </span>
                ,{" "}
                <span
                  className="rW sA"
                  role="link"
                  tabIndex="0"
                  style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                  }}
                >
                  None
                </span>
              </span>
            </td>
          </tr>

          {/* Export/Delete Buttons */}
          <tr role="listitem">
            <td colSpan="3" style={{ margin: "0px" }}>
              <button
                className="qR"
                disabled
                style={{
                  fontFamily:
                    '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                  margin: "0px 8px",
                  cursor: "default",
                }}
              >
                Export
              </button>
              <button
                className="qR"
                disabled
                style={{
                  fontFamily:
                    '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                  margin: "0px 8px",
                  cursor: "default",
                }}
              >
                Delete
              </button>
            </td>
          </tr>

          {/* Create/Import Filter Links */}
          <tr role="listitem">
            <td
              className="rG"
              colSpan="3"
              style={{
                margin: "0px",
                padding: "8px",
                textAlign: "center",
                fontSize: "0.875rem",
              }}
            >
              <span
                className="sA"
                role="link"
                tabIndex="0"
                style={{
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  textDecoration: "none",
                  color: "rgb(17, 85, 204)",
                }}
              >
                Create a new filter
              </span>
              {"   "}
              <span
                className="sA"
                role="link"
                tabIndex="0"
                style={{
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  textDecoration: "none",
                  color: "rgb(17, 85, 204)",
                }}
              >
                Import filters
              </span>
            </td>
          </tr>

          <tr>
            <td colSpan="3" style={{ margin: "0px" }} />
          </tr>

          {/* Blocked Addresses Section Header */}
          <tr
            className="r7"
            role="listitem"
            style={{
              WebkitFontSmoothing: "antialiased",
              fontFamily:
                '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
              fontSize: "0.875rem",
              letterSpacing: "normal",
            }}
          >
            <td
              className="CZ"
              colSpan="3"
              style={{
                margin: "0px",
                padding: "0px",
                lineHeight: "40px",
              }}
            >
              <b>
                The following email addresses are blocked. Messages from these
                addresses will appear in Spam:
              </b>
            </td>
          </tr>

          {/* Divider */}
          <tr>
            <td
              className="rZ"
              colSpan="3"
              style={{
                margin: "0px",
                padding: "0px",
                backgroundColor: "rgb(229, 229, 229)",
                height: "1px",
              }}
            />
          </tr>

          {/* No Blocked Addresses Message */}
          <tr
            className="r7"
            role="listitem"
            style={{
              WebkitFontSmoothing: "antialiased",
              fontFamily:
                '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
              fontSize: "0.875rem",
              letterSpacing: "normal",
            }}
          >
            <td
              className="CZ"
              colSpan="3"
              style={{
                margin: "0px",
                padding: "0px",
                lineHeight: "40px",
              }}
            >
              You currently have no blocked addresses.
            </td>
          </tr>

          {/* Select All/None for Blocked Addresses */}
          <tr role="listitem">
            <td
              className="yV"
              colSpan="3"
              style={{
                margin: "0px",
                whiteSpace: "nowrap",
                padding: "3px 0px 3px 2px",
                fontSize: "0.875rem",
              }}
            >
              Select:{" "}
              <span className="yU" style={{ cursor: "pointer" }}>
                <span
                  className="rW sA"
                  role="link"
                  tabIndex="0"
                  style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                  }}
                >
                  All
                </span>
                ,{" "}
                <span
                  className="rW sA"
                  role="link"
                  tabIndex="0"
                  style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                  }}
                >
                  None
                </span>
              </span>
            </td>
          </tr>

          {/* Unblock Button */}
          <tr role="listitem">
            <td colSpan="3" style={{ margin: "0px" }}>
              <button
                className="qR"
                disabled
                style={{
                  fontFamily:
                    '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                  margin: "0px 8px",
                  cursor: "default",
                }}
              >
                Unblock selected addresses
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default FiltersTab;
