import React, { useState } from "react";
import EditEmailAddressModal from "./EditEmailAddressModal";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { Box } from "@mui/material";

const AccountsTab = () => {
  const [editOpen, setEditOpen] = useState(false);
  const { sendAsSettings, setSnackbar, settingsAccounts, setSettingsAccounts } = useGlobalContext();

  // Handle Mark as Read change
  const handleMarkAsReadChange = (shouldMarkAsRead) => {
    setSettingsAccounts((prev) => ({
      ...prev,
      markAsRead: shouldMarkAsRead,
    }));
    const message = shouldMarkAsRead
      ? "Conversations are now marked as read when other users open them."
      : "Conversations are now left unread when other users open them.";
    setSnackbar({
      open: true,
      message,
      autoHideDuration: 5000,
      severity: "success",
      style: {
        "& .MuiSnackbarContent-root": {
          backgroundColor: "#323232",
          color: "#ffffff",
        },
      },
    });
  };

  // Handle Sender Attribution change
  const handleAttributionChange = (shouldShowAttribution) => {
    setSettingsAccounts((prev) => ({
      ...prev,
      showAttribution: shouldShowAttribution,
    }));
    const message = shouldShowAttribution
      ? "Messages sent from delegates will include attribution from now."
      : "Messages sent from delegates will not include attribution from now.";
    setSnackbar({
      open: true,
      message,
      autoHideDuration: 5000,
      severity: "success",
      style: {
        "& .MuiSnackbarContent-root": {
          backgroundColor: "#323232",
          color: "#ffffff",
        },
      },
    });
  };
  return (
    <Box sx={{ height: "calc(100vh - 200px)", overflowY: "auto" }}>
      <div id=":1" className="aeF" style={{ padding: "0px", verticalAlign: "bottom", minHeight: "513px" }}>
        <div className="nH">
          <div className="nH v9" role="main" style={{ padding: "inherit" }}>
            <div className="nH">
              <div className="nH">
                <div className="nH f2 hCyPr" role="tablist">
                  <div className="nH">
                    <div className="nH" style={{ display: "none" }}>
                      <div
                        className="nH r4"
                        style={{
                          overflow: "auto",
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          padding: "0px 24px 24px",
                        }}
                      />
                    </div>
                    <div className="nH" style={{ display: "none" }}>
                      <div
                        className="nH r4"
                        style={{
                          overflow: "auto",
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          padding: "0px 24px 24px",
                        }}
                      />
                    </div>
                    <div className="nH" style={{ display: "none" }}>
                      <div
                        className="nH r4"
                        style={{
                          overflow: "auto",
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          padding: "0px 24px 24px",
                        }}
                      />
                    </div>
                    <div className="nH">
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
                            <tr
                              className="r7"
                              style={{
                                WebkitFontSmoothing: "antialiased",
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
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
                                  Change account settings:
                                </span>
                              </td>
                              <td
                                className="r9"
                                width="70%"
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
                                <div>
                                  <a
                                    className="e"
                                    href="/settings/accounts"
                                    target="_blank"
                                    style={{
                                      whiteSpace: "nowrap",
                                      cursor: "pointer",
                                      textDecoration: "none",
                                      color: "rgb(17, 85, 204)",
                                    }}
                                  >
                                    Change password
                                  </a>
                                </div>
                                <div>
                                  <a
                                    className="e"
                                    href="/settings/accounts"
                                    target="_blank"
                                    style={{
                                      whiteSpace: "nowrap",
                                      cursor: "pointer",
                                      textDecoration: "none",
                                      color: "rgb(17, 85, 204)",
                                    }}
                                  >
                                    Change password recovery options
                                  </a>
                                </div>
                                <div>
                                  <a
                                    className="e"
                                    href="/settings/accounts"
                                    target="_blank"
                                    style={{
                                      whiteSpace: "nowrap",
                                      cursor: "pointer",
                                      textDecoration: "none",
                                      color: "rgb(17, 85, 204)",
                                    }}
                                  >
                                    Other Google Account settings
                                  </a>
                                </div>
                              </td>
                            </tr>
                            <tr
                              className="r7"
                              style={{
                                WebkitFontSmoothing: "antialiased",
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
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
                                <b>Using MailG for work?</b>
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
                                Businesses get yourname@example.com email, more storage, and admin tools with Google
                                Workspace.{" "}
                                <span>
                                  <a href="/settings/accounts">Try at no cost</a>
                                </span>
                              </td>
                            </tr>
                            <tr
                              className="r7"
                              style={{
                                WebkitFontSmoothing: "antialiased",
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
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
                                  Import mail and contacts:
                                </span>
                                <br />
                                <span>
                                  <a
                                    className="e"
                                    aria-label="Learn more about importing mail and contacts"
                                    href="/settings/accounts"
                                    target="_blank"
                                    style={{
                                      whiteSpace: "nowrap",
                                      cursor: "pointer",
                                      textDecoration: "none",
                                      color: "rgb(17, 85, 204)",
                                    }}
                                  >
                                    Learn more
                                  </a>
                                </span>
                              </td>
                              <td
                                className="r9"
                                width="70%"
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
                                  id=":2q"
                                  className="cf qv aXH"
                                  cellPadding="0"
                                  style={{
                                    width: "100%",
                                    borderSpacing: "0px",
                                    margin: "0px",
                                    borderCollapse: "separate",
                                  }}
                                />
                                <div>Import from Yahoo!, Hotmail, AOL, or other webmail or POP3 accounts.</div>
                                <div className="qx" style={{ padding: "0px", paddingTop: "0px" }}>
                                  <span
                                    id=":2p"
                                    className="sA rc aXE"
                                    role="link"
                                    tabIndex="0"
                                    style={{
                                      whiteSpace: "nowrap",
                                      cursor: "pointer",
                                      textDecoration: "none",
                                      color: "rgb(17, 85, 204)",
                                      fontWeight: "bold",
                                      overflowWrap: "break-word",
                                    }}
                                  >
                                    Import mail and contacts
                                  </span>
                                </div>
                              </td>
                            </tr>
                            <tr
                              className="r7"
                              style={{
                                WebkitFontSmoothing: "antialiased",
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
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
                                  Send mail as:
                                </span>
                                <br />
                                <span
                                  className="ra"
                                  style={{
                                    WebkitFontSmoothing: "auto",
                                    fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                    fontSize: "0.75rem",
                                    letterSpacing: "normal",
                                  }}
                                >
                                  (Use MailG to send from your other email addresses)
                                </span>
                                <br />
                                <span>
                                  <a
                                    className="e"
                                    aria-label="Learn more about sending email from a custom from address"
                                    href="/settings/accounts"
                                    target="_blank"
                                    style={{
                                      whiteSpace: "nowrap",
                                      cursor: "pointer",
                                      textDecoration: "none",
                                      color: "rgb(17, 85, 204)",
                                    }}
                                  >
                                    Learn more
                                  </a>
                                </span>
                              </td>
                              <td
                                className="r9"
                                width="70%"
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
                                  className="cf qv aYf"
                                  cellPadding="0"
                                  style={{
                                    width: "100%",
                                    borderSpacing: "0px",
                                    margin: "0px",
                                    borderCollapse: "separate",
                                  }}
                                >
                                  <tbody>
                                    <tr>
                                      <td
                                        className="CY"
                                        style={{
                                          margin: "0px",
                                          paddingRight: "10px",
                                          paddingBottom: "10px",
                                          verticalAlign: "top",
                                        }}
                                      >
                                        <div
                                          className="rc"
                                          style={{
                                            fontWeight: "bold",
                                            overflowWrap: "break-word",
                                          }}
                                        >
                                          {`${sendAsSettings.displayName} <${sendAsSettings.email}>`}
                                        </div>
                                      </td>
                                      <td
                                        className="qy CY"
                                        style={{
                                          margin: "0px",
                                          paddingRight: "10px",
                                          paddingBottom: "10px",
                                          verticalAlign: "top",
                                          width: "9%",
                                          textAlign: "left",
                                        }}
                                      >
                                        {" "}
                                      </td>
                                      <td
                                        className="qy CY"
                                        style={{
                                          margin: "0px",
                                          paddingRight: "10px",
                                          paddingBottom: "10px",
                                          verticalAlign: "top",
                                          width: "9%",
                                          textAlign: "left",
                                        }}
                                      >
                                        <span
                                          id=":2r0"
                                          className="sA"
                                          role="link"
                                          tabIndex="0"
                                          style={{
                                            whiteSpace: "nowrap",
                                            cursor: "pointer",
                                            textDecoration: "none",
                                            color: "rgb(17, 85, 204)",
                                          }}
                                          onClick={() => setEditOpen(true)}
                                        >
                                          edit info
                                        </span>
                                      </td>
                                      <td
                                        className="qw CY"
                                        style={{
                                          margin: "0px",
                                          paddingBottom: "10px",
                                          verticalAlign: "top",
                                          width: "10%",
                                          textAlign: "left",
                                          paddingRight: "12px",
                                        }}
                                      />
                                    </tr>
                                    <tr>
                                      <td
                                        className="rc CY"
                                        colSpan="4"
                                        style={{
                                          margin: "0px",
                                          fontWeight: "bold",
                                          overflowWrap: "break-word",
                                          paddingRight: "10px",
                                          paddingBottom: "10px",
                                          verticalAlign: "top",
                                        }}
                                      >
                                        <span
                                          id=":2v"
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
                                          Add another email address
                                        </span>
                                      </td>
                                    </tr>
                                    {sendAsSettings.replyTo && (
                                      <tr>
                                        <td
                                          className="CY"
                                          style={{
                                            margin: "0px",
                                            paddingRight: "10px",
                                            paddingBottom: "10px",
                                            verticalAlign: "top",
                                          }}
                                        >
                                          <div
                                            className="rc"
                                            style={{ fontWeight: "normal", overflowWrap: "break-word" }}
                                          >
                                            {`Reply-to address: ${sendAsSettings.replyTo}`}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                            <tr
                              className="r7"
                              style={{
                                WebkitFontSmoothing: "antialiased",
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
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
                                  Check mail from other accounts:
                                </span>
                                <br />
                                <span>
                                  <a
                                    className="e"
                                    aria-label="Learn more about MailG's Mail Fetcher"
                                    href="/settings/accounts"
                                    target="_blank"
                                    style={{
                                      whiteSpace: "nowrap",
                                      cursor: "pointer",
                                      textDecoration: "none",
                                      color: "rgb(17, 85, 204)",
                                    }}
                                  >
                                    Learn more
                                  </a>
                                </span>
                              </td>
                              <td
                                className="r9"
                                width="70%"
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
                                  className="cf qv"
                                  cellPadding="0"
                                  style={{
                                    width: "100%",
                                    borderSpacing: "0px",
                                    margin: "0px",
                                    borderCollapse: "separate",
                                  }}
                                >
                                  <tbody />
                                </table>
                                <div className="qx" style={{ padding: "0px", paddingTop: "0px" }}>
                                  <span
                                    id=":2w"
                                    className="sA rc"
                                    role="link"
                                    tabIndex="0"
                                    style={{
                                      whiteSpace: "nowrap",
                                      cursor: "pointer",
                                      textDecoration: "none",
                                      color: "rgb(17, 85, 204)",
                                      fontWeight: "bold",
                                      overflowWrap: "break-word",
                                    }}
                                  >
                                    Add a mail account
                                  </span>
                                </div>
                              </td>
                            </tr>
                            <tr
                              className="r7"
                              style={{
                                WebkitFontSmoothing: "antialiased",
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
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
                                  Grant access to your account:
                                </span>
                                <br />
                                <span
                                  className="ra"
                                  style={{
                                    WebkitFontSmoothing: "auto",
                                    fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                    fontSize: "0.75rem",
                                    letterSpacing: "normal",
                                  }}
                                >
                                  (Allow others to read and send mail on your behalf)
                                </span>
                                <br />
                                <span>
                                  <a
                                    className="e"
                                    aria-label="Learn more about granting others access to your account"
                                    href="/settings/accounts"
                                    target="_blank"
                                    style={{
                                      whiteSpace: "nowrap",
                                      cursor: "pointer",
                                      textDecoration: "none",
                                      color: "rgb(17, 85, 204)",
                                    }}
                                  >
                                    Learn more
                                  </a>
                                </span>
                              </td>
                              <td
                                className="r9"
                                width="70%"
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
                                  className="cf qv"
                                  cellPadding="0"
                                  style={{
                                    width: "100%",
                                    borderSpacing: "0px",
                                    margin: "0px",
                                    borderCollapse: "separate",
                                  }}
                                >
                                  <tbody />
                                </table>
                                <table
                                  className="cf qv"
                                  cellPadding="0"
                                  style={{
                                    width: "100%",
                                    borderSpacing: "0px",
                                    margin: "0px",
                                    borderCollapse: "separate",
                                  }}
                                >
                                  <tbody>
                                    <tr>
                                      <td
                                        className="rc"
                                        style={{
                                          margin: "0px",
                                          fontWeight: "bold",
                                          overflowWrap: "break-word",
                                        }}
                                      >
                                        <span
                                          id=":33"
                                          className="LJOhwe sA"
                                          role="link"
                                          tabIndex="0"
                                          style={{
                                            whiteSpace: "nowrap",
                                            cursor: "pointer",
                                            textDecoration: "none",
                                            color: "rgb(17, 85, 204)",
                                          }}
                                        >
                                          Add another account
                                        </span>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <br />
                                <span
                                  className="rc"
                                  style={{
                                    fontWeight: "bold",
                                    overflowWrap: "break-word",
                                  }}
                                >
                                  Mark as read
                                </span>
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
                                        style={{
                                          margin: "0px",
                                          padding: "0px",
                                        }}
                                      >
                                        <input
                                          id=":34"
                                          name="bx_amard"
                                          type="radio"
                                          checked={settingsAccounts.markAsRead}
                                          onChange={() => handleMarkAsReadChange(true)}
                                          value="1"
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
                                          <label htmlFor=":34">Mark conversation as read when opened by others</label>
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
                                        style={{
                                          margin: "0px",
                                          padding: "0px",
                                        }}
                                      >
                                        <input
                                          id=":35"
                                          name="bx_amard"
                                          type="radio"
                                          checked={!settingsAccounts.markAsRead}
                                          onChange={() => handleMarkAsReadChange(false)}
                                          value="0"
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
                                          <label htmlFor=":35">Leave conversation unread when opened by others</label>
                                        </span>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                                <br />
                                <span
                                  className="rc"
                                  style={{
                                    fontWeight: "bold",
                                    overflowWrap: "break-word",
                                  }}
                                >
                                  Sender information
                                </span>
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
                                        style={{
                                          margin: "0px",
                                          padding: "0px",
                                        }}
                                      >
                                        <input
                                          id=":36"
                                          name="sender_attribution_setting"
                                          type="radio"
                                          checked={settingsAccounts.showAttribution}
                                          onChange={() => handleAttributionChange(true)}
                                          value="1"
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
                                          <label htmlFor=":36">
                                            Show this address and the person who sent it ("sent by …")
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
                                        style={{
                                          margin: "0px",
                                          padding: "0px",
                                        }}
                                      >
                                        <input
                                          id=":37"
                                          name="sender_attribution_setting"
                                          type="radio"
                                          checked={!settingsAccounts.showAttribution}
                                          onChange={() => handleAttributionChange(false)}
                                          value="0"
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
                                          <label htmlFor=":37">Show this address only (john.doe@example.com)</label>
                                        </span>
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                            <tr
                              className="r7"
                              style={{
                                WebkitFontSmoothing: "antialiased",
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                fontSize: "0.875rem",
                                letterSpacing: "normal",
                              }}
                            >
                              <td
                                className="r8 r6"
                                style={{
                                  margin: "0px",
                                  verticalAlign: "top",
                                  width: "20%",
                                  borderTop: "none",
                                  borderRight: "none",
                                  borderLeft: "none",
                                  borderImage: "initial",
                                  borderBottom: "1px solid rgb(229, 229, 229)",
                                  border: "none",
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
                                  Add additional storage:
                                </span>
                              </td>
                              <td
                                className="r9 r6"
                                width="70%"
                                style={{
                                  margin: "0px",
                                  verticalAlign: "top",
                                  borderTop: "none",
                                  borderRight: "none",
                                  borderLeft: "none",
                                  borderImage: "initial",
                                  borderBottom: "1px solid rgb(229, 229, 229)",
                                  border: "none",
                                  padding: "10px 0px",
                                  paddingRight: "0px",
                                }}
                              >
                                <div className="qx" style={{ padding: "0px", paddingTop: "0px" }}>
                                  <div
                                    className="rc"
                                    style={{
                                      fontWeight: "bold",
                                      overflowWrap: "break-word",
                                    }}
                                  >
                                    You are currently using 15% of your 15 GB.
                                  </div>
                                  <div>
                                    Need more space?{" "}
                                    <a
                                      className="e"
                                      href="/settings/accounts"
                                      target="_blank"
                                      style={{
                                        whiteSpace: "nowrap",
                                        cursor: "pointer",
                                        textDecoration: "none",
                                        color: "rgb(17, 85, 204)",
                                      }}
                                    >
                                      Purchase additional storage
                                    </a>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="nH" style={{ display: "none" }}>
                      <div
                        className="nH r4"
                        style={{
                          overflow: "auto",
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          padding: "0px 24px 24px",
                        }}
                      />
                    </div>
                    <div className="nH Tv1JD" style={{ display: "none" }}>
                      <div
                        className="nH r4"
                        style={{
                          overflow: "auto",
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          padding: "0px 24px 24px",
                        }}
                      />
                    </div>
                    <div className="nH" style={{ display: "none" }}>
                      <div
                        className="nH r4"
                        style={{
                          overflow: "auto",
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          padding: "0px 24px 24px",
                        }}
                      />
                    </div>
                    <div className="nH" style={{ display: "none" }}>
                      <div
                        className="nH r4"
                        style={{
                          overflow: "auto",
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          padding: "0px 24px 24px",
                        }}
                      />
                    </div>
                    <div className="nH" style={{ display: "none" }}>
                      <div
                        className="nH r4"
                        style={{
                          overflow: "auto",
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          padding: "0px 24px 24px",
                        }}
                      />
                    </div>
                    <div className="nH" style={{ display: "none" }}>
                      <div
                        className="nH r4"
                        style={{
                          overflow: "auto",
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          padding: "0px 24px 24px",
                        }}
                      />
                    </div>
                    <div className="nH" style={{ display: "none" }}>
                      <div
                        className="nH r4"
                        style={{
                          overflow: "auto",
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          padding: "0px 24px 24px",
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EditEmailAddressModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fullName="John Doe"
        email="john.doe@example.com"
      />
    </Box>
  );
};

export default AccountsTab;
