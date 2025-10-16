import React, { useState, useEffect } from "react";

export default function LabelsTab() {
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes in form inputs
  useEffect(() => {
    const handleInputChange = () => setHasChanges(true);
    const inputs = document.querySelectorAll(
      '#labels-tab input, #labels-tab select'
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
    <div id="labels-tab" className="nH">
      <div
        className="nH r4"
        style={{
          overflow: "auto",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          padding: "0px 24px 24px",
        }}
      >
        <table
          id=":9i"
          className="cf alO"
          style={{
            borderCollapse: "collapse",
            fontSize: "0.875rem",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            margin: "0px",
            lineHeight: "20px",
          }}
        >
          <tbody>
            {/* System labels header */}
            <tr>
              <td
                className="r8 alL"
                style={{
                  margin: "0px",
                  verticalAlign: "top",
                  width: "20%",
                  padding: "10px 15px 4px",
                  paddingLeft: "15px",
                  fontWeight: "bold",
                }}
              >
                System labels
              </td>
              <td
                className="alL"
                style={{
                  margin: "0px",
                  padding: "10px 15px 4px",
                  fontWeight: "bold",
                }}
              >
                Show in label list
              </td>
            </tr>

            {/* Inbox */}
            <tr id=":8t" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Inbox
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alS"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    id=":8u"
                    type="checkbox"
                    defaultChecked
                    disabled
                    style={{
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      margin: "0px",
                      fontSize: "100%",
                      fontWeight: "normal",
                    }}
                  />
                  {" "}
                  <label htmlFor=":8u">Show in IMAP</label>
                </span>
                {" "}
              </td>
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Starred */}
            <tr id=":8v" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Starred
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alS"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    id=":8w"
                    type="checkbox"
                    defaultChecked
                    style={{
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      margin: "0px",
                      fontSize: "100%",
                      fontWeight: "normal",
                    }}
                  />
                  {" "}
                  <label htmlFor=":8w">Show in IMAP</label>
                </span>
                {" "}
              </td>
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Snoozed */}
            <tr id=":8x" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Snoozed
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alS"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    id=":8y"
                    type="checkbox"
                    defaultChecked
                    style={{
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      margin: "0px",
                      fontSize: "100%",
                      fontWeight: "normal",
                    }}
                  />
                  {" "}
                  <label htmlFor=":8y">Show in IMAP</label>
                </span>
                {" "}
              </td>
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Important */}
            <tr id=":8z" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Important
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alS"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    id=":90"
                    type="checkbox"
                    defaultChecked
                    style={{
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      margin: "0px",
                      fontSize: "100%",
                      fontWeight: "normal",
                    }}
                  />
                  {" "}
                  <label htmlFor=":90">Show in IMAP</label>
                </span>
                {" "}
              </td>
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Sent */}
            <tr id=":91" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Sent
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alS"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    id=":92"
                    type="checkbox"
                    defaultChecked
                    style={{
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      margin: "0px",
                      fontSize: "100%",
                      fontWeight: "normal",
                    }}
                  />
                  {" "}
                  <label htmlFor=":92">Show in IMAP</label>
                </span>
                {" "}
              </td>
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Scheduled */}
            <tr id=":93" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Scheduled
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  hide
                </span>{" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  show if unread
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alS"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    id=":94"
                    type="checkbox"
                    defaultChecked
                    style={{
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      margin: "0px",
                      fontSize: "100%",
                      fontWeight: "normal",
                    }}
                  />
                  {" "}
                  <label htmlFor=":94">Show in IMAP</label>
                </span>
                {" "}
              </td>
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Drafts */}
            <tr id=":95" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Drafts
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  hide
                </span>{" "}
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show if unread
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alS"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    id=":96"
                    type="checkbox"
                    defaultChecked
                    style={{
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      margin: "0px",
                      fontSize: "100%",
                      fontWeight: "normal",
                    }}
                  />
                  {" "}
                  <label htmlFor=":96">Show in IMAP</label>
                </span>
                {" "}
              </td>
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* All Mail */}
            <tr id=":97" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  All Mail
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alS"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    id=":98"
                    type="checkbox"
                    defaultChecked
                    style={{
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      margin: "0px",
                      fontSize: "100%",
                      fontWeight: "normal",
                    }}
                  />
                  {" "}
                  <label htmlFor=":98">Show in IMAP</label>
                </span>
                {" "}
              </td>
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Spam */}
            <tr id=":99" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Spam
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  hide
                </span>{" "}
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show if unread
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alS"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    id=":9a"
                    type="checkbox"
                    defaultChecked
                    style={{
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      margin: "0px",
                      fontSize: "100%",
                      fontWeight: "normal",
                    }}
                  />
                  {" "}
                  <label htmlFor=":9a">Show in IMAP</label>
                </span>
                {" "}
              </td>
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Trash */}
            <tr id=":9b" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Trash
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alS"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    id=":9c"
                    type="checkbox"
                    defaultChecked
                    style={{
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      margin: "0px",
                      fontSize: "100%",
                      fontWeight: "normal",
                    }}
                  />
                  {" "}
                  <label htmlFor=":9c">Show in IMAP</label>
                </span>
                {" "}
              </td>
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Divider */}
            <tr>
              <td
                className="rZ"
                colSpan="6"
                style={{
                  margin: "0px",
                  padding: "0px",
                  backgroundColor: "rgb(229, 229, 229)",
                  height: "1px",
                }}
              />
            </tr>

            {/* Categories header */}
            <tr>
              <td
                className="r8 alL"
                style={{
                  margin: "0px",
                  verticalAlign: "top",
                  width: "20%",
                  padding: "10px 15px 4px",
                  paddingLeft: "15px",
                  fontWeight: "bold",
                }}
              >
                Categories
              </td>
              <td
                className="alL"
                style={{
                  margin: "0px",
                  padding: "10px 15px 4px",
                  fontWeight: "bold",
                }}
              >
                Show in label list
              </td>
              <td
                className="alL"
                style={{
                  margin: "0px",
                  padding: "10px 15px 4px",
                  fontWeight: "bold",
                }}
              >
                Show in message list
              </td>
            </tr>

            {/* Purchases */}
            <tr id=":9d" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Purchases
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Social */}
            <tr id=":9e" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Social
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Updates */}
            <tr id=":9f" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Updates
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Forums */}
            <tr id=":9g" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Forums
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Promotions */}
            <tr id=":9h" className="To">
              <td
                className="alT"
                style={{ margin: "0px", padding: "3px 15px" }}
              >
                <div
                  className="al6"
                  style={{
                    padding: "5px 2px",
                    margin: "1px",
                    border: "0px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    width: "15em",
                  }}
                >
                  Promotions
                </div>
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                <span
                  className="alP"
                  role="link"
                  tabIndex="0"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                  }}
                >
                  show
                </span>
                {" "}
                <span
                  className="alR"
                  style={{
                    margin: "0px 0.3em",
                    whiteSpace: "nowrap",
                    fontWeight: "bold",
                  }}
                >
                  hide
                </span>{" "}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              />
              <td className="YQh8id" style={{ margin: "0px" }}>
                {" "}
              </td>
            </tr>

            {/* Divider */}
            <tr>
              <td
                className="rZ"
                colSpan="6"
                style={{
                  margin: "0px",
                  padding: "0px",
                  backgroundColor: "rgb(229, 229, 229)",
                  height: "1px",
                }}
              />
            </tr>

            {/* Labels header */}
            <tr>
              <td
                className="r8 alL"
                style={{
                  margin: "0px",
                  verticalAlign: "top",
                  width: "20%",
                  padding: "10px 15px 4px",
                  paddingLeft: "15px",
                  fontWeight: "bold",
                }}
              >
                Labels
              </td>
              <td
                className="alL"
                style={{
                  margin: "0px",
                  padding: "10px 15px 4px",
                  fontWeight: "bold",
                }}
              >
                Show in label list
              </td>
              <td
                className="alL"
                style={{
                  margin: "0px",
                  padding: "10px 15px 4px",
                  fontWeight: "bold",
                }}
              >
                Show in message list
              </td>
              <td
                className="alL"
                style={{
                  margin: "0px",
                  padding: "10px 15px 4px",
                  fontWeight: "bold",
                }}
              >
                Actions
              </td>
            </tr>

            {/* Create new label button */}
            <tr>
              <td
                className="al0"
                colSpan="6"
                style={{ margin: "0px", padding: "0px 15px" }}
              >
                <div>
                  <button
                    id=":9j"
                    className="alZ"
                    style={{
                      fontFamily:
                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                      marginLeft: "4px",
                    }}
                  >
                    Create new label
                  </button>
                </div>
              </td>
            </tr>

            {/* Note about removing labels */}
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
                className="q9"
                colSpan="6"
                style={{
                  margin: "0px",
                  padding: "8px",
                  textAlign: "center",
                }}
              >
                <b>Note:</b> Removing a label will not remove the messages
                with that label.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
