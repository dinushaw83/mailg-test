import React, { useState } from "react";

const ChatTab = () => {
  const [chatSetting, setChatSetting] = useState("off");
  const [meetSetting, setMeetSetting] = useState("hide");
  const [hasChanges, setHasChanges] = useState(false);

  const handleChatChange = (value) => {
    setChatSetting(value);
    setHasChanges(true);
  };

  const handleMeetChange = (value) => {
    setMeetSetting(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Handle save logic here
    setHasChanges(false);
  };

  const handleCancel = () => {
    // Reset to original values
    setChatSetting("off");
    setMeetSetting("hide");
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
        style={{
          borderCollapse: "collapse",
          margin: "0px",
          lineHeight: "20px",
        }}
      >
        <tbody>
          {/* Chat Setting */}
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
                Chat:
              </span>
              <br />
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
              <table
                className="cf bA1"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  borderSpacing: "0px",
                  margin: "0px",
                  borderCollapse: "separate",
                }}
              >
                <tbody>
                  <tr className="C7" style={{ verticalAlign: "top" }}>
                    <td
                      className="C6"
                      style={{ margin: "0px", padding: "0px" }}
                    >
                      <input
                        id="chat-google"
                        className="aVG"
                        name="ix_ct"
                        type="radio"
                        checked={chatSetting === "google-chat"}
                        onChange={() => handleChatChange("google-chat")}
                        value="google-chat"
                        style={{
                          fontFamily:
                            '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                          margin: "0px",
                          fontSize: "100%",
                          position: "relative",
                          fontWeight: "normal",
                          height: "15px",
                          top: "auto",
                          verticalAlign: "middle",
                        }}
                      />
                    </td>
                    <td
                      className="C6"
                      style={{
                        margin: "0px",
                        padding: "0px",
                        paddingLeft: "8px",
                      }}
                    >
                      <span className="rS" style={{ fontWeight: "bold" }}>
                        <label htmlFor="chat-google">Google Chat</label>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <table
                className="cf bA1"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  borderSpacing: "0px",
                  margin: "0px",
                  borderCollapse: "separate",
                }}
              >
                <tbody>
                  <tr className="C7" style={{ verticalAlign: "top" }}>
                    <td
                      className="C6"
                      style={{ margin: "0px", padding: "0px" }}
                    >
                      <input
                        id="chat-off"
                        className="aVF"
                        name="ix_ct"
                        type="radio"
                        checked={chatSetting === "off"}
                        onChange={() => handleChatChange("off")}
                        value="off"
                        style={{
                          fontFamily:
                            '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                          margin: "0px",
                          fontSize: "100%",
                          position: "relative",
                          fontWeight: "normal",
                          height: "15px",
                          top: "auto",
                          verticalAlign: "middle",
                        }}
                      />
                    </td>
                    <td
                      className="C6"
                      style={{
                        margin: "0px",
                        padding: "0px",
                        paddingLeft: "8px",
                      }}
                    >
                      <span className="rS" style={{ fontWeight: "bold" }}>
                        <label htmlFor="chat-off">Off</label>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Meet Setting */}
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
                Meet:
              </span>
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
              <table
                className="cf bA1"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  borderSpacing: "0px",
                  margin: "0px",
                  borderCollapse: "separate",
                }}
              >
                <tbody>
                  <tr className="C7" style={{ verticalAlign: "top" }}>
                    <td
                      className="C6"
                      style={{ margin: "0px", padding: "0px" }}
                    >
                      <input
                        id="meet-show"
                        className="aao"
                        name="bx_mlnepd"
                        type="radio"
                        checked={meetSetting === "show"}
                        onChange={() => handleMeetChange("show")}
                        value="show"
                        style={{
                          fontFamily:
                            '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                          margin: "0px",
                          fontSize: "100%",
                          position: "relative",
                          fontWeight: "normal",
                          height: "15px",
                          top: "auto",
                          verticalAlign: "middle",
                        }}
                      />
                    </td>
                    <td
                      className="C6"
                      style={{
                        margin: "0px",
                        padding: "0px",
                        paddingLeft: "8px",
                      }}
                    >
                      <span className="rS" style={{ fontWeight: "bold" }}>
                        <label htmlFor="meet-show">
                          Show the Meet section in the main menu
                        </label>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <table
                className="cf bA1"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  borderSpacing: "0px",
                  margin: "0px",
                  borderCollapse: "separate",
                }}
              >
                <tbody>
                  <tr className="C7" style={{ verticalAlign: "top" }}>
                    <td
                      className="C6"
                      style={{ margin: "0px", padding: "0px" }}
                    >
                      <input
                        id="meet-hide"
                        className="aan"
                        name="bx_mlnepd"
                        type="radio"
                        checked={meetSetting === "hide"}
                        onChange={() => handleMeetChange("hide")}
                        value="hide"
                        style={{
                          fontFamily:
                            '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                          margin: "0px",
                          fontSize: "100%",
                          position: "relative",
                          fontWeight: "normal",
                          height: "15px",
                          top: "auto",
                          verticalAlign: "middle",
                        }}
                      />
                    </td>
                    <td
                      className="C6"
                      style={{
                        margin: "0px",
                        padding: "0px",
                        paddingLeft: "8px",
                      }}
                    >
                      <span className="rS" style={{ fontWeight: "bold" }}>
                        <label htmlFor="meet-hide">
                          Hide the Meet section in the main menu
                        </label>
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          {/* Save/Cancel Buttons */}
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
                  id="save-chat-meet"
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
                {" "}
                <button
                  id="cancel-chat-meet"
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
  );
};

export default ChatTab;
