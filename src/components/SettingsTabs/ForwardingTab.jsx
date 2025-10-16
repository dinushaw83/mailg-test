import React, { useState, useEffect } from "react";

export default function ForwardingTab() {
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes in form inputs
  useEffect(() => {
    const handleInputChange = () => setHasChanges(true);
    const inputs = document.querySelectorAll(
      '#forwarding-tab input, #forwarding-tab select'
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
    <div id="forwarding-tab" className="nH">
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
            {/* Forwarding Section */}
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
                  Forwarding:
                </span>
                <br />
                <a
                  className="e"
                  aria-label="Learn more about forwarding"
                  href="https://support.google.com/mail/answer/10957?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                  }}
                >
                  Learn more
                </a>
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
                <div id="forwarding-content">
                  <div id="forwarding-options" style={{ display: "none" }}>
                    <table
                      className="cf bA1"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{ borderCollapse: "collapse" }}
                    >
                      <tbody>
                        <tr
                          className="C7"
                          style={{ verticalAlign: "top" }}
                        >
                          <td
                            className="C6"
                            style={{
                              margin: "0px",
                              padding: "0px",
                            }}
                          >
                            <input
                              id="forward-disable"
                              name="sx_em"
                              type="radio"
                              defaultChecked
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
                            <label htmlFor="forward-disable">
                              Disable forwarding
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      className="cf bA1"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{ borderCollapse: "collapse" }}
                    >
                      <tbody>
                        <tr
                          className="C7"
                          style={{ verticalAlign: "top" }}
                        >
                          <td
                            className="C6"
                            style={{
                              margin: "0px",
                              padding: "0px",
                            }}
                          >
                            <input
                              id="forward-enable"
                              name="sx_em"
                              type="radio"
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
                            <span>
                              Forward a copy of incoming mail to{" "}
                              <select
                                id="forward-address"
                                style={{
                                  fontFamily:
                                    '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                  margin: "0px",
                                  fontSize: "100%",
                                }}
                              >
                                {/* Options will be populated dynamically */}
                              </select>{" "}
                              and{" "}
                              <select
                                id="forward-action"
                                style={{
                                  fontFamily:
                                    '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                  margin: "0px",
                                  fontSize: "100%",
                                  width: "37ex",
                                }}
                              >
                                <option value="selected">
                                  keep MailG's copy in the Inbox
                                </option>
                                <option value="read">
                                  mark MailG's copy as read
                                </option>
                                <option value="archive">
                                  archive MailG's copy
                                </option>
                                <option value="trash">
                                  delete MailG's copy
                                </option>
                              </select>
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <br />
                  </div>
                  <div id="add-forwarding">
                    <input
                      type="button"
                      defaultValue="Add a forwarding address"
                      style={{
                        fontFamily:
                          '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                        margin: "0px",
                        fontSize: "100%",
                        fontWeight: "normal",
                      }}
                    />
                  </div>
                  <div id="forwarding-tip">
                    <br />
                    Tip: You can also forward only some of your mail by{" "}
                    <span
                      className="e"
                      role="link"
                      tabIndex="0"
                      style={{
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        textDecoration: "none",
                        color: "rgb(17, 85, 204)",
                      }}
                    >
                      creating a filter!
                    </span>
                  </div>
                </div>
              </td>
            </tr>

            {/* POP Download Section */}
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
                  POP download:
                </span>
                <br />
                <a
                  className="e"
                  aria-label="Learn more about using POP download"
                  href="https://support.google.com/mail/answer/10350?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                  }}
                >
                  Learn more
                </a>
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
                <div>
                  <span
                    className="rQ"
                    style={{ fontWeight: "bold" }}
                  >
                    1. Status:{" "}
                  </span>{" "}
                  <span
                    className="rQ"
                    style={{ fontWeight: "bold" }}
                  >
                    POP is disabled
                  </span>
                  <table
                    className="cf bA1"
                    cellPadding="0"
                    cellSpacing="0"
                    style={{ borderCollapse: "collapse" }}
                  >
                    <tbody>
                      <tr
                        className="C7"
                        style={{ verticalAlign: "top" }}
                      >
                        <td
                          className="C6"
                          style={{
                            margin: "0px",
                            padding: "0px",
                          }}
                        >
                          <input
                            id="pop-all"
                            name="bx_pe"
                            type="radio"
                            value="3"
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
                          <label htmlFor="pop-all">
                            Enable POP for{" "}
                            <span
                              className="rQ"
                              style={{ fontWeight: "bold" }}
                            >
                              all mail
                            </span>
                          </label>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <table
                    className="cf bA1"
                    cellPadding="0"
                    cellSpacing="0"
                    style={{ borderCollapse: "collapse" }}
                  >
                    <tbody>
                      <tr
                        className="C7"
                        style={{ verticalAlign: "top" }}
                      >
                        <td
                          className="C6"
                          style={{
                            margin: "0px",
                            padding: "0px",
                          }}
                        >
                          <input
                            id="pop-new"
                            name="bx_pe"
                            type="radio"
                            value="2"
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
                          <label htmlFor="pop-new">
                            Enable POP for{" "}
                            <span
                              className="rQ"
                              style={{ fontWeight: "bold" }}
                            >
                              mail that arrives from now on
                            </span>
                          </label>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div>
                  <br />
                  <span
                    className="rQ"
                    style={{ fontWeight: "bold" }}
                  >
                    2. When messages are accessed with POP{" "}
                  </span>
                  <select
                    id="pop-action"
                    disabled
                    style={{
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      margin: "0px",
                      fontSize: "100%",
                      width: "37ex",
                    }}
                  >
                    <option value="0">
                      keep MailG's copy in the Inbox
                    </option>
                    <option value="3">
                      mark MailG's copy as read
                    </option>
                    <option value="1">
                      archive MailG's copy
                    </option>
                    <option value="2">
                      delete MailG's copy
                    </option>
                  </select>
                </div>
                <div>
                  <br />
                  <span
                    className="rQ"
                    style={{ fontWeight: "bold" }}
                  >
                    3. Configure your email client
                  </span>{" "}
                  (e.g. Outlook, Eudora, Netscape Mail)
                  <br />
                  <a
                    className="e"
                    href="https://support.google.com/mail/answer/12103?hl=en"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      textDecoration: "none",
                      color: "rgb(17, 85, 204)",
                    }}
                  >
                    Configuration instructions
                  </a>
                </div>
              </td>
            </tr>

            {/* IMAP Access Section */}
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
                  IMAP access:
                </span>
                <br />
                <span
                  className="ra"
                  style={{
                    WebkitFontSmoothing: "auto",
                    fontFamily:
                      '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                    fontSize: "0.75rem",
                    letterSpacing: "normal",
                  }}
                >
                  (access MailG from other clients using IMAP)
                </span>
                <br />
                <a
                  className="e"
                  aria-label="Learn more about using IMAP with MailG"
                  href="https://support.google.com/mail/answer/75725?hl=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                  }}
                >
                  Learn more
                </a>
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
                <div id="imap-settings">
                  <div>
                    <span
                      className="q4"
                      style={{ fontWeight: "bold" }}
                    >
                      When I mark a message in IMAP as deleted:
                    </span>
                    <table
                      className="cf bA1"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{ borderCollapse: "collapse" }}
                    >
                      <tbody>
                        <tr
                          className="C7"
                          style={{ verticalAlign: "top" }}
                        >
                          <td
                            className="C6"
                            style={{
                              margin: "0px",
                              padding: "0px",
                            }}
                          >
                            <input
                              id="imap-expunge-on"
                              name="bx_iae"
                              type="radio"
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
                            <label htmlFor="imap-expunge-on">
                              Auto-Expunge on - Immediately update the
                              server. (default)
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      className="cf bA1"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{ borderCollapse: "collapse" }}
                    >
                      <tbody>
                        <tr
                          className="C7"
                          style={{ verticalAlign: "top" }}
                        >
                          <td
                            className="C6"
                            style={{
                              margin: "0px",
                              padding: "0px",
                            }}
                          >
                            <input
                              id="imap-expunge-off"
                              name="bx_iae"
                              type="radio"
                              defaultChecked
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
                            <label htmlFor="imap-expunge-off">
                              Auto-Expunge off - Wait for the client to
                              update the server.
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div
                    className="q5"
                    style={{ height: "4px" }}
                  />
                  <div>
                    <br />
                    <span
                      className="q4"
                      style={{ fontWeight: "bold" }}
                    >
                      When a message is marked as deleted and expunged
                      from the last visible IMAP folder:
                    </span>
                    <table
                      className="cf bA1"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{ borderCollapse: "collapse" }}
                    >
                      <tbody>
                        <tr
                          className="C7"
                          style={{ verticalAlign: "top" }}
                        >
                          <td
                            className="C6"
                            style={{
                              margin: "0px",
                              padding: "0px",
                            }}
                          >
                            <input
                              id="imap-archive"
                              name="ix_ieb"
                              type="radio"
                              defaultChecked
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
                            <label htmlFor="imap-archive">
                              Archive the message (default)
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      className="cf bA1"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{ borderCollapse: "collapse" }}
                    >
                      <tbody>
                        <tr
                          className="C7"
                          style={{ verticalAlign: "top" }}
                        >
                          <td
                            className="C6"
                            style={{
                              margin: "0px",
                              padding: "0px",
                            }}
                          >
                            <input
                              id="imap-trash"
                              name="ix_ieb"
                              type="radio"
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
                            <label htmlFor="imap-trash">
                              Move the message to the Trash
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      className="cf bA1"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{ borderCollapse: "collapse" }}
                    >
                      <tbody>
                        <tr
                          className="C7"
                          style={{ verticalAlign: "top" }}
                        >
                          <td
                            className="C6"
                            style={{
                              margin: "0px",
                              padding: "0px",
                            }}
                          >
                            <input
                              id="imap-delete"
                              name="ix_ieb"
                              type="radio"
                              value="2"
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
                            <label htmlFor="imap-delete">
                              Immediately delete the message forever
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div
                    className="q5"
                    style={{ height: "4px" }}
                  />
                  <div>
                    <br />
                    <span
                      className="q4"
                      style={{ fontWeight: "bold" }}
                    >
                      Folder size limits
                    </span>
                    <table
                      className="cf bA1"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{ borderCollapse: "collapse" }}
                    >
                      <tbody>
                        <tr
                          className="C7"
                          style={{ verticalAlign: "top" }}
                        >
                          <td
                            className="C6"
                            style={{
                              margin: "0px",
                              padding: "0px",
                            }}
                          >
                            <input
                              id="imap-no-limit"
                              name="ix_ifm"
                              type="radio"
                              defaultChecked
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
                            <label htmlFor="imap-no-limit">
                              Do not limit the number of messages in an
                              IMAP folder (default)
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table
                      className="cf bA1"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{ borderCollapse: "collapse" }}
                    >
                      <tbody>
                        <tr
                          className="C7"
                          style={{ verticalAlign: "top" }}
                        >
                          <td
                            className="C6"
                            style={{
                              margin: "0px",
                              padding: "0px",
                            }}
                          >
                            <input
                              id="imap-limit"
                              name="ix_ifm"
                              type="radio"
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
                            <label htmlFor="imap-limit">
                              Limit IMAP folders to contain no more than
                              this many messages
                            </label>{" "}
                            <select
                              id="imap-limit-select"
                              style={{
                                fontFamily:
                                  '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                margin: "0px",
                                fontSize: "100%",
                              }}
                            >
                              <option value="1000">1,000</option>
                              <option value="2000">2,000</option>
                              <option value="5000">5,000</option>
                              <option value="10000">10,000</option>
                            </select>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <br />
                  <span
                    className="rQ"
                    style={{ fontWeight: "bold" }}
                  >
                    Configure your email client
                  </span>{" "}
                  (e.g. Outlook, Thunderbird, iPhone)
                  <br />
                  <a
                    className="e"
                    href="https://support.google.com/mail/answer/75726?hl=en"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      textDecoration: "none",
                      color: "rgb(17, 85, 204)",
                    }}
                  >
                    Configuration instructions
                  </a>
                </div>
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
                    id="save-button"
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
                    
                  <button
                    id="cancel-button"
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
