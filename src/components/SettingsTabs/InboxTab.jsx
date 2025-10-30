import React, { useState, useEffect } from "react";

export default function InboxTab() {
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes in form inputs
  useEffect(() => {
    const handleInputChange = () => setHasChanges(true);
    const inputs = document.querySelectorAll("#inbox-tab input, #inbox-tab select");
    inputs.forEach((input) => input.addEventListener("change", handleInputChange));

    return () => {
      inputs.forEach((input) => input.removeEventListener("change", handleInputChange));
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
    <div id="inbox-tab" className="nH">
      <div
        className="nH r4"
        style={{
          overflowY: "auto",
          maxHeight: "calc(100vh - 160px)",
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
                <div
                  className="rc"
                  style={{
                    fontWeight: "bold",
                    overflowWrap: "break-word",
                  }}
                >
                  Inbox type:
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
                <select
                  id="inbox-type-select"
                  className="rtiTxf"
                  name="inbox-type"
                  style={{
                    fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                    margin: "0px",
                    fontSize: "100%",
                  }}
                >
                  <option value="ufa|wfa|vfa">Default</option>
                  <option value="Bfa|Afa">Important first</option>
                  <option value="Cfa|Afa">Unread first</option>
                  <option value="Efa|Afa">Starred first</option>
                  <option value="Dfa|Efa|Afa">Priority Inbox</option>
                  <option value="rxa|is:starred|is:drafts">Multiple Inboxes</option>
                </select>
              </td>
            </tr>
            <tr
              id="categories-section"
              className="r7"
              style={{
                WebkitFontSmoothing: "antialiased",
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                fontSize: "0.875rem",
                letterSpacing: "normal",
              }}
            >
              <td colSpan="2" style={{ margin: "0px" }}>
                <table
                  className="cf aKd"
                  style={{
                    borderCollapse: "collapse",
                    width: "100%",
                  }}
                >
                  <tbody>
                    <tr>
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
                        <div className="aJa" style={{ fontWeight: "bold" }}>
                          Categories:
                        </div>
                        <a
                          className="e"
                          aria-label="Learn more about categories"
                          href="#"
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
                        <div className="PP7Bad">
                          <table
                            className="cf"
                            cellPadding="0"
                            cellSpacing="0"
                            style={{
                              borderCollapse: "collapse",
                            }}
                          >
                            <tbody>
                              <tr>
                                <td style={{ margin: "0px" }}>
                                  <div
                                    className="aJc"
                                    style={{
                                      padding: "2px 0px",
                                    }}
                                  >
                                    <label htmlFor="cat-primary">
                                      <div
                                        className="aI0"
                                        style={{
                                          padding: "0px 5px",
                                          position: "relative",
                                          left: "-5px",
                                        }}
                                      >
                                        <table
                                          className="cf aJc"
                                          cellPadding="0"
                                          cellSpacing="0"
                                          style={{
                                            borderCollapse: "collapse",
                                            padding: "2px 0px",
                                          }}
                                        >
                                          <tbody>
                                            <tr
                                              className="C7"
                                              style={{
                                                verticalAlign: "top",
                                              }}
                                            >
                                              <td
                                                className="aIZ C6 aNV"
                                                style={{
                                                  margin: "0px",
                                                  width: "1%",
                                                  padding: "0px",
                                                  opacity: 1,
                                                }}
                                              >
                                                <input
                                                  id="cat-primary"
                                                  className="aKb aNV eSZzkf"
                                                  type="checkbox"
                                                  defaultChecked
                                                  disabled
                                                  style={{
                                                    fontFamily:
                                                      '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                                    margin: "0px",
                                                    fontSize: "100%",
                                                    bottom: "1px",
                                                    marginLeft: "0px",
                                                    position: "relative",
                                                    fontWeight: "normal",
                                                    height: "15px",
                                                    top: "auto",
                                                    verticalAlign: "middle",
                                                    opacity: 0.7,
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
                                                <label
                                                  className="rc ai4"
                                                  htmlFor="cat-primary"
                                                  style={{
                                                    fontWeight: "bold",
                                                    overflowWrap: "break-word",
                                                  }}
                                                >
                                                  Primary
                                                </label>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </label>
                                    <label htmlFor="cat-promotions">
                                      <div
                                        className="aI0"
                                        style={{
                                          padding: "0px 5px",
                                          position: "relative",
                                          left: "-5px",
                                        }}
                                      >
                                        <table
                                          className="cf aJc"
                                          cellPadding="0"
                                          cellSpacing="0"
                                          style={{
                                            borderCollapse: "collapse",
                                            padding: "2px 0px",
                                          }}
                                        >
                                          <tbody>
                                            <tr
                                              className="C7"
                                              style={{
                                                verticalAlign: "top",
                                              }}
                                            >
                                              <td
                                                className="aIZ C6"
                                                style={{
                                                  margin: "0px",
                                                  width: "1%",
                                                  padding: "0px",
                                                }}
                                              >
                                                <input
                                                  id="cat-promotions"
                                                  className="aKb eSZzkf"
                                                  type="checkbox"
                                                  defaultChecked
                                                  style={{
                                                    fontFamily:
                                                      '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                                    margin: "0px",
                                                    fontSize: "100%",
                                                    bottom: "1px",
                                                    marginLeft: "0px",
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
                                                <label
                                                  className="rc"
                                                  htmlFor="cat-promotions"
                                                  style={{
                                                    fontWeight: "bold",
                                                    overflowWrap: "break-word",
                                                  }}
                                                >
                                                  Promotions
                                                </label>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </label>
                                    <label htmlFor="cat-social">
                                      <div
                                        className="aI0"
                                        style={{
                                          padding: "0px 5px",
                                          position: "relative",
                                          left: "-5px",
                                        }}
                                      >
                                        <table
                                          className="cf aJc"
                                          cellPadding="0"
                                          cellSpacing="0"
                                          style={{
                                            borderCollapse: "collapse",
                                            padding: "2px 0px",
                                          }}
                                        >
                                          <tbody>
                                            <tr
                                              className="C7"
                                              style={{
                                                verticalAlign: "top",
                                              }}
                                            >
                                              <td
                                                className="aIZ C6"
                                                style={{
                                                  margin: "0px",
                                                  width: "1%",
                                                  padding: "0px",
                                                }}
                                              >
                                                <input
                                                  id="cat-social"
                                                  className="aKb eSZzkf"
                                                  type="checkbox"
                                                  defaultChecked
                                                  style={{
                                                    fontFamily:
                                                      '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                                    margin: "0px",
                                                    fontSize: "100%",
                                                    bottom: "1px",
                                                    marginLeft: "0px",
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
                                                <label
                                                  className="rc"
                                                  htmlFor="cat-social"
                                                  style={{
                                                    fontWeight: "bold",
                                                    overflowWrap: "break-word",
                                                  }}
                                                >
                                                  Social
                                                </label>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </label>
                                    <label htmlFor="cat-updates">
                                      <div
                                        className="aI0"
                                        style={{
                                          padding: "0px 5px",
                                          position: "relative",
                                          left: "-5px",
                                        }}
                                      >
                                        <table
                                          className="cf aJc"
                                          cellPadding="0"
                                          cellSpacing="0"
                                          style={{
                                            borderCollapse: "collapse",
                                            padding: "2px 0px",
                                          }}
                                        >
                                          <tbody>
                                            <tr
                                              className="C7"
                                              style={{
                                                verticalAlign: "top",
                                              }}
                                            >
                                              <td
                                                className="aIZ C6"
                                                style={{
                                                  margin: "0px",
                                                  width: "1%",
                                                  padding: "0px",
                                                }}
                                              >
                                                <input
                                                  id="cat-updates"
                                                  className="aKb eSZzkf"
                                                  type="checkbox"
                                                  style={{
                                                    fontFamily:
                                                      '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                                    margin: "0px",
                                                    fontSize: "100%",
                                                    bottom: "1px",
                                                    marginLeft: "0px",
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
                                                <label
                                                  className="rc"
                                                  htmlFor="cat-updates"
                                                  style={{
                                                    fontWeight: "bold",
                                                    overflowWrap: "break-word",
                                                  }}
                                                >
                                                  Updates
                                                </label>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </label>
                                    <label htmlFor="cat-forums">
                                      <div
                                        className="aI0"
                                        style={{
                                          padding: "0px 5px",
                                          position: "relative",
                                          left: "-5px",
                                        }}
                                      >
                                        <table
                                          className="cf aJc"
                                          cellPadding="0"
                                          cellSpacing="0"
                                          style={{
                                            borderCollapse: "collapse",
                                            padding: "2px 0px",
                                          }}
                                        >
                                          <tbody>
                                            <tr
                                              className="C7"
                                              style={{
                                                verticalAlign: "top",
                                              }}
                                            >
                                              <td
                                                className="aIZ C6"
                                                style={{
                                                  margin: "0px",
                                                  width: "1%",
                                                  padding: "0px",
                                                }}
                                              >
                                                <input
                                                  id="cat-forums"
                                                  className="aKb eSZzkf"
                                                  type="checkbox"
                                                  style={{
                                                    fontFamily:
                                                      '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                                    margin: "0px",
                                                    fontSize: "100%",
                                                    bottom: "1px",
                                                    marginLeft: "0px",
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
                                                <label
                                                  className="rc"
                                                  htmlFor="cat-forums"
                                                  style={{
                                                    fontWeight: "bold",
                                                    overflowWrap: "break-word",
                                                  }}
                                                >
                                                  Forums
                                                </label>
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </label>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                          <div style={{ display: "block" }}>
                            <div
                              className="aJa aSY"
                              style={{
                                fontWeight: "bold",
                                marginTop: "18px",
                              }}
                            >
                              Starred messages
                            </div>
                            <table
                              className="cf"
                              cellPadding="0"
                              cellSpacing="0"
                              style={{
                                borderCollapse: "collapse",
                              }}
                            >
                              <tbody>
                                <tr>
                                  <td style={{ margin: "0px" }}>
                                    <div
                                      className="aJc K5MWh"
                                      style={{
                                        padding: "2px 0px",
                                      }}
                                    >
                                      <label htmlFor="starred-in-primary">
                                        <div
                                          className="aI0"
                                          style={{
                                            padding: "0px 5px",
                                            position: "relative",
                                            left: "-5px",
                                          }}
                                        >
                                          <table
                                            className="cf aJc"
                                            cellPadding="0"
                                            cellSpacing="0"
                                            style={{
                                              borderCollapse: "collapse",
                                              padding: "2px 0px",
                                            }}
                                          >
                                            <tbody>
                                              <tr
                                                className="C7"
                                                style={{
                                                  verticalAlign: "top",
                                                }}
                                              >
                                                <td
                                                  className="aIZ C6"
                                                  style={{
                                                    margin: "0px",
                                                    width: "1%",
                                                    padding: "0px",
                                                  }}
                                                >
                                                  <input
                                                    id="starred-in-primary"
                                                    className="aKb eSZzkf"
                                                    name="bx_msis"
                                                    type="checkbox"
                                                    defaultChecked
                                                    style={{
                                                      fontFamily:
                                                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                                      margin: "0px",
                                                      fontSize: "100%",
                                                      bottom: "1px",
                                                      marginLeft: "0px",
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
                                                  <label
                                                    className="rc"
                                                    htmlFor="starred-in-primary"
                                                    style={{
                                                      fontWeight: "bold",
                                                      overflowWrap: "break-word",
                                                    }}
                                                  >
                                                    Include starred in Primary
                                                  </label>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </label>
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div style={{ display: "block" }}>
                            <div
                              className="aJa aSY"
                              style={{
                                fontWeight: "bold",
                                marginTop: "18px",
                              }}
                            >
                              Bundling in Promotions
                            </div>
                            <table
                              className="cf"
                              cellPadding="0"
                              cellSpacing="0"
                              style={{
                                borderCollapse: "collapse",
                              }}
                            >
                              <tbody>
                                <tr>
                                  <td style={{ margin: "0px" }}>
                                    <div
                                      className="aJc U2xgBc"
                                      style={{
                                        padding: "2px 0px",
                                      }}
                                    >
                                      <label htmlFor="bundling-promotions">
                                        <div
                                          className="aI0"
                                          style={{
                                            padding: "0px 5px",
                                            position: "relative",
                                            left: "-5px",
                                          }}
                                        >
                                          <table
                                            className="cf aJc"
                                            cellPadding="0"
                                            cellSpacing="0"
                                            style={{
                                              borderCollapse: "collapse",
                                              padding: "2px 0px",
                                            }}
                                          >
                                            <tbody>
                                              <tr
                                                className="C7"
                                                style={{
                                                  verticalAlign: "top",
                                                }}
                                              >
                                                <td
                                                  className="aIZ C6"
                                                  style={{
                                                    margin: "0px",
                                                    width: "1%",
                                                    padding: "0px",
                                                  }}
                                                >
                                                  <input
                                                    id="bundling-promotions"
                                                    className="aKb eSZzkf"
                                                    name="bx_wpsetpb"
                                                    type="checkbox"
                                                    defaultChecked
                                                    style={{
                                                      fontFamily:
                                                        '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                                      margin: "0px",
                                                      fontSize: "100%",
                                                      bottom: "1px",
                                                      marginLeft: "0px",
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
                                                  <label
                                                    className="rc"
                                                    htmlFor="bundling-promotions"
                                                    style={{
                                                      fontWeight: "bold",
                                                      overflowWrap: "break-word",
                                                    }}
                                                  >
                                                    Enable bundling of top promo emails in Promotions
                                                  </label>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                        </div>
                                      </label>
                                    </div>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                          <div
                            className="aI9"
                            style={{
                              marginTop: "29px",
                              minHeight: "160px",
                            }}
                          >
                            <div
                              className="aI6"
                              style={{
                                cssFloat: "right",
                                position: "relative",
                                marginLeft: "30px",
                              }}
                            >
                              <div
                                className="aJe"
                                style={{
                                  margin: "5px auto",
                                  border: "1px solid rgb(179, 179, 179)",
                                  height: "143px",
                                  width: "343px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: "#f8f9fa",
                                }}
                              >
                                <span
                                  className="material-symbols-outlined"
                                  style={{
                                    fontSize: "72px",
                                    color: "#5f6368",
                                  }}
                                >
                                  inbox
                                </span>
                              </div>
                            </div>
                            <div className="aI7">
                              Choose which message categories to show as inbox tabs. Other messages will appear in the
                              Primary tab.
                              <br />
                              <br />
                              Deselect all categories to go back to your old inbox.{" "}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
            <tr
              className="r7 v8lvYb XY"
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
                  Reading pane:
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
                <div className="Xo">
                  <div className="XZ">
                    <table
                      className="cf aJc"
                      cellPadding="0"
                      cellSpacing="0"
                      style={{
                        borderCollapse: "collapse",
                        padding: "2px 0px",
                      }}
                    >
                      <tbody>
                        <tr className="C7" style={{ verticalAlign: "top" }}>
                          <td
                            className="aIZ C6"
                            style={{
                              margin: "0px",
                              width: "1%",
                              padding: "0px",
                            }}
                          >
                            <input
                              id="enable-reading-pane"
                              className="aKb"
                              name="bx_spe"
                              type="checkbox"
                              style={{
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                margin: "0px",
                                fontSize: "100%",
                                bottom: "1px",
                                marginLeft: "0px",
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
                            <label
                              className="rc"
                              htmlFor="enable-reading-pane"
                              style={{
                                fontWeight: "bold",
                                overflowWrap: "break-word",
                              }}
                            >
                              <div className="Xk" style={{ fontWeight: "normal" }}>
                                <b>Enable reading pane</b> - provides a way to read mail right next to your list of
                                conversations, making mail reading and writing mail faster and adding more context.
                              </div>
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="X0" style={{ opacity: 0.38 }}>
                    <div className="Xm" style={{ marginTop: "16px" }}>
                      <b>Reading pane position</b>
                    </div>
                    <table className="cf" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
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
                              id="reading-pane-no-split"
                              className="aKb"
                              name="spsm"
                              type="radio"
                              defaultChecked
                              value="0"
                              disabled
                              style={{
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                margin: "0px",
                                fontSize: "100%",
                                bottom: "1px",
                                marginLeft: "0px",
                                position: "relative",
                                fontWeight: "normal",
                                height: "15px",
                                top: "auto",
                                verticalAlign: "middle",
                                opacity: 0.7,
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
                            <label htmlFor="reading-pane-no-split">
                              <b>No split</b>
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table className="cf" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
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
                              id="reading-pane-right"
                              className="aKb"
                              name="spsm"
                              type="radio"
                              value="1"
                              disabled
                              style={{
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                margin: "0px",
                                fontSize: "100%",
                                bottom: "1px",
                                marginLeft: "0px",
                                position: "relative",
                                fontWeight: "normal",
                                height: "15px",
                                top: "auto",
                                verticalAlign: "middle",
                                opacity: 0.7,
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
                            <label htmlFor="reading-pane-right">
                              <b>Right of inbox</b>
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table className="cf" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
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
                              id="reading-pane-below"
                              className="aKb"
                              name="spsm"
                              type="radio"
                              value="2"
                              disabled
                              style={{
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                margin: "0px",
                                fontSize: "100%",
                                bottom: "1px",
                                marginLeft: "0px",
                                position: "relative",
                                fontWeight: "normal",
                                height: "15px",
                                top: "auto",
                                verticalAlign: "middle",
                                opacity: 0.7,
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
                            <label htmlFor="reading-pane-below">
                              <b>Below inbox</b>
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
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
                <div
                  className="rc"
                  style={{
                    fontWeight: "bold",
                    overflowWrap: "break-word",
                  }}
                >
                  Importance markers:
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
                <table
                  className="cf"
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
                          id="importance-show"
                          className="aKb"
                          name="bx_ioao"
                          type="radio"
                          value="0"
                          style={{
                            fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                            margin: "0px",
                            fontSize: "100%",
                            bottom: "1px",
                            marginLeft: "0px",
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
                        <label htmlFor="importance-show">
                          <b>Show markers</b> - Show a marker (►) by messages marked as important.
                        </label>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table
                  className="cf"
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
                          id="importance-no-markers"
                          className="aKb"
                          name="bx_ioao"
                          type="radio"
                          defaultChecked
                          value="1"
                          style={{
                            fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                            margin: "0px",
                            fontSize: "100%",
                            bottom: "1px",
                            marginLeft: "0px",
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
                        <label htmlFor="importance-no-markers">
                          <b>No markers</b>
                        </label>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="alG" style={{ marginTop: "15px" }}>
                  MailG analyzes your new incoming messages to predict what's important, considering things like how
                  you've treated similar messages in the past, how directly the message is addressed to you, and many
                  other factors.{" "}
                  <a
                    className="e"
                    aria-label="Learn more about Priority Inbox"
                    href="#"
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
                  <br />
                  <br />
                  <fieldset
                    className="ahH"
                    style={{
                      border: "0px",
                      margin: "0px",
                      padding: "0px",
                    }}
                  >
                    <table className="cf" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
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
                              id="importance-use-past"
                              className="aKb"
                              name="bx_iosip"
                              type="radio"
                              defaultChecked
                              value="0"
                              style={{
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                margin: "0px",
                                fontSize: "100%",
                                bottom: "1px",
                                marginLeft: "0px",
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
                            <label htmlFor="importance-use-past">
                              Use my past actions to predict which messages are important to me.
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <table className="cf" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
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
                              id="importance-dont-use-past"
                              className="aKb"
                              name="bx_iosip"
                              type="radio"
                              value="1"
                              style={{
                                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                                margin: "0px",
                                fontSize: "100%",
                                bottom: "1px",
                                marginLeft: "0px",
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
                            <label htmlFor="importance-dont-use-past">
                              Don't use my past actions to predict which messages are important.
                              <br /> Note: this will erase action history and will likely reduce the accuracy of
                              importance predictions.
                            </label>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </fieldset>
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
                <div
                  className="rc"
                  style={{
                    fontWeight: "bold",
                    overflowWrap: "break-word",
                  }}
                >
                  Filtered mail:
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
                <fieldset
                  className="ahH"
                  style={{
                    border: "0px",
                    margin: "0px",
                    padding: "0px",
                  }}
                >
                  <table className="cf" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
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
                            id="filtered-override"
                            className="aKb"
                            name="bx_ioof"
                            type="radio"
                            value="1"
                            style={{
                              fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                              margin: "0px",
                              fontSize: "100%",
                              bottom: "1px",
                              marginLeft: "0px",
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
                          <label htmlFor="filtered-override">
                            <b>Override filters</b> - Include important messages in the inbox that may have been
                            filtered out.
                          </label>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <table className="cf" cellPadding="0" cellSpacing="0" style={{ borderCollapse: "collapse" }}>
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
                            id="filtered-dont-override"
                            className="aKb"
                            name="bx_ioof"
                            type="radio"
                            defaultChecked
                            value="0"
                            style={{
                              fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                              margin: "0px",
                              fontSize: "100%",
                              bottom: "1px",
                              marginLeft: "0px",
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
                          <label htmlFor="filtered-dont-override">
                            <b>Don't override filters</b>
                          </label>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </fieldset>
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
                    id="inbox-save-btn"
                    disabled={!hasChanges}
                    onClick={handleSave}
                    style={{
                      WebkitFontSmoothing: "antialiased",
                      fontSize: "0.875rem",
                      letterSpacing: "normal",
                      fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                    }}
                  >
                    Save Changes
                  </button>
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <button
                    id="inbox-cancel-btn"
                    className="Gm"
                    onClick={handleCancel}
                    style={{
                      WebkitFontSmoothing: "antialiased",
                      fontSize: "0.875rem",
                      letterSpacing: "normal",
                      fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
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
