import React, { useState, useEffect } from "react";

export default function OfflineTab() {
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes in form inputs
  useEffect(() => {
    const handleInputChange = () => setHasChanges(true);
    const inputs = document.querySelectorAll(
      '#offline-tab input, #offline-tab select'
    );
    inputs.forEach((input) =>
      input.addEventListener('change', handleInputChange)
    );

    return () => {
      inputs.forEach((input) =>
        input.removeEventListener('change', handleInputChange)
      );
    };
  }, []);

  const handleSave = () => {
    // Save logic here
    setHasChanges(false);
  };

  const handleCancel = () => {
    // Reset form
    setHasChanges(false);
  };

  return (
    <div id="offline-tab" className="nH">
      <div
        className="nH r4"
        style={{
          overflow: "auto",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          padding: "0px 24px 24px",
          minHeight: "350px",
        }}
      >
        <table
          className="cf"
          width="100%"
          cellPadding="0"
          style={{
            borderCollapse: "collapse",
            margin: "0px",
            lineHeight: "20px",
          }}
        >
          <tbody>
            <tr
              className="r7"
              style={{
                WebkitFontSmoothing: "antialiased",
                fontFamily:
                  '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                fontSize: "0.875rem",
                letterSpacing: "normal",
              }}
            >
              <td
                className="r8"
                style={{
                  margin: "0px",
                  verticalAlign: "top",
                  width: "20%",
                  borderTop: "none",
                  borderRight: "none",
                  borderLeft: "none",
                  borderImage: "initial",
                  borderBottom: "1px solid rgb(229, 229, 229)",
                  padding: "10px 0px",
                  paddingLeft: "0px",
                }}
              >
                <span
                  className="rc"
                  style={{
                    fontWeight: "bold",
                    overflowWrap: "break-word",
                  }}
                >
                  Offline:
                </span>
                <div>
                  <span
                    className="e"
                    aria-label="Learn more about Offline."
                    style={{
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      textDecoration: "none",
                      color: "rgb(17, 85, 204)",
                    }}
                  >
                    Learn more
                  </span>
                </div>
              </td>
              <td
                className="r9"
                style={{
                  margin: "0px",
                  verticalAlign: "top",
                  borderTop: "none",
                  borderRight: "none",
                  borderLeft: "none",
                  borderImage: "initial",
                  borderBottom: "1px solid rgb(229, 229, 229)",
                  padding: "10px 0px",
                  paddingRight: "0px",
                }}
              >
                <input
                  id=":1f"
                  className="So"
                  name="enable-offline"
                  type="checkbox"
                  style={{
                    fontFamily:
                      '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                    margin: "0px",
                    fontSize: "100%",
                    marginRight: "8px",
                    verticalAlign: "middle",
                    fontWeight: "normal",
                  }}
                />
                <label
                  className="rc"
                  htmlFor=":1f"
                  style={{
                    fontWeight: "bold",
                    overflowWrap: "break-word",
                  }}
                >
                  Enable offline mail
                </label>
              </td>
            </tr>
            <tr
              className="r7"
              style={{
                WebkitFontSmoothing: "antialiased",
                fontFamily:
                  '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                fontSize: "0.875rem",
                letterSpacing: "normal",
              }}
            >
              <td colSpan="2" style={{ margin: "0px" }}>
                <div
                  className="rU"
                  role="navigation"
                  style={{
                    padding: "5px 0px 0px",
                    textAlign: "center",
                  }}
                >
                  <button
                    id=":1k"
                    disabled={!hasChanges}
                    onClick={handleSave}
                    style={{
                      WebkitFontSmoothing: "antialiased",
                      fontSize: "0.875rem",
                      letterSpacing: "normal",
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                    }}
                  >
                    Save Changes
                  </button>
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <button
                    id=":1l"
                    className="Gm"
                    onClick={handleCancel}
                    style={{
                      WebkitFontSmoothing: "antialiased",
                      fontSize: "0.875rem",
                      letterSpacing: "normal",
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
