import React from "react";

export default function AddonsTab() {
  return (
    <div className="nH">
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
                <div
                  className="rc"
                  style={{
                    fontWeight: "bold",
                    overflowWrap: "break-word",
                  }}
                >
                  Installed add-ons:
                </div>
                <button
                  className="e WF"
                  style={{
                    fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                    background: "none",
                    border: "none",
                    padding: "0px",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                  }}
                >
                  Manage
                </button>
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
                <div className="GJ" style={{ padding: "4px 16px" }}>
                  There are no add-ons installed.
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
              />
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
                <div className="GJ" style={{ padding: "4px 16px" }}>
                  You can{" "}
                  <a
                    className="e"
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      textDecoration: "none",
                      color: "rgb(17, 85, 204)",
                    }}
                  >
                    install developer add-ons
                  </a>{" "}
                  from{" "}
                  <a
                    className="e"
                    href="#"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      textDecoration: "none",
                      color: "rgb(17, 85, 204)",
                    }}
                  >
                    Apps Script
                  </a>
                  . Developer add-ons are simply add-ons which haven't been published. If you're a developer, installing
                  your developer add-on allows you to test it prior to publishing. Some add-ons are specific to a
                  particular organization or user and thus aren't intended for wider publication; you can install these
                  add-ons as developer add-ons.
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
                  Installed developer add-ons:
                </span>
              </td>
              <td
                className="r9 r6"
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
                <div className="GJ" style={{ padding: "4px 16px" }}>
                  There are no add-ons installed.
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
