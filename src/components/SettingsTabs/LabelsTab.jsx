import React from "react";
import { useGlobalContext } from "../../contexts/GlobalContext";

export default function LabelsTab() {
  const { settingsLabels, setSettingsLabels } = useGlobalContext();

  const handleToggleSystemLabel = (labelKey, field = 'show') => {
    setSettingsLabels({
      ...settingsLabels,
      systemLabels: {
        ...settingsLabels.systemLabels,
        [labelKey]: {
          ...settingsLabels.systemLabels[labelKey],
          [field]: !settingsLabels.systemLabels[labelKey][field],
        },
      },
    });
  };

  const handleToggleCategory = (categoryKey) => {
    setSettingsLabels({
      ...settingsLabels,
      categories: {
        ...settingsLabels.categories,
        [categoryKey]: !settingsLabels.categories[categoryKey],
      },
    });
  };

  const handleCreateLabel = () => {
    const labelName = prompt("Enter new label name:");
    if (labelName && labelName.trim()) {
      const newLabel = {
        name: labelName.trim(),
        show: true,
        showInMessageList: true,
      };
      setSettingsLabels({
        ...settingsLabels,
        customLabels: [...(settingsLabels.customLabels || []), newLabel],
      });
    }
  };

  const handleToggleCustomLabel = (index, field) => {
    const updatedLabels = [...settingsLabels.customLabels];
    updatedLabels[index] = {
      ...updatedLabels[index],
      [field]: !updatedLabels[index][field],
    };
    setSettingsLabels({
      ...settingsLabels,
      customLabels: updatedLabels,
    });
  };

  const handleRemoveCustomLabel = (index) => {
    if (confirm(`Remove label "${settingsLabels.customLabels[index].name}"?`)) {
      const updatedLabels = settingsLabels.customLabels.filter((_, i) => i !== index);
      setSettingsLabels({
        ...settingsLabels,
        customLabels: updatedLabels,
      });
    }
  };

  const renderShowHide = (isShown, onToggle) => (
    <>
      {isShown ? (
        <>
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
            onClick={() => onToggle()}
            style={{
              margin: "0px 0.3em",
              whiteSpace: "nowrap",
              textDecoration: "none",
              color: "rgb(17, 85, 204)",
              cursor: "pointer",
            }}
          >
            hide
          </span>
        </>
      ) : (
        <>
          <span
            className="alP"
            role="link"
            tabIndex="0"
            onClick={() => onToggle()}
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
          </span>
        </>
      )}
    </>
  );

  const renderShowIfUnread = (isShown, onToggle) => (
    <>
      {isShown ? (
        <>
          <span
            className="alR"
            style={{
              margin: "0px 0.3em",
              whiteSpace: "nowrap",
              fontWeight: "bold",
            }}
          >
            show if unread
          </span>
          {" "}
          <span
            className="alP"
            role="link"
            tabIndex="0"
            onClick={() => onToggle()}
            style={{
              margin: "0px 0.3em",
              whiteSpace: "nowrap",
              textDecoration: "none",
              color: "rgb(17, 85, 204)",
              cursor: "pointer",
            }}
          >
            hide
          </span>
        </>
      ) : (
        <>
          <span
            className="alP"
            role="link"
            tabIndex="0"
            onClick={() => onToggle()}
            style={{
              margin: "0px 0.3em",
              whiteSpace: "nowrap",
              textDecoration: "none",
              color: "rgb(17, 85, 204)",
              cursor: "pointer",
            }}
          >
            show if unread
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
          </span>
        </>
      )}
    </>
  );

  return (
    <div id="labels-tab" className="nH">
      <div
        className="nH r4"
        style={{
          overflow: "auto",
          overflowY: "auto",
          maxHeight: "calc(100vh - 160px)",
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
                {renderShowHide(settingsLabels.systemLabels.starred.show, () => handleToggleSystemLabel('starred', 'show'))}
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
                {renderShowHide(settingsLabels.systemLabels.snoozed.show, () => handleToggleSystemLabel('snoozed', 'show'))}
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

            {/* Sent */}
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
                {renderShowHide(settingsLabels.systemLabels.sent.show, () => handleToggleSystemLabel('sent', 'show'))}
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

            {/* Drafts */}
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
                {renderShowHide(settingsLabels.systemLabels.drafts.show, () => handleToggleSystemLabel('drafts', 'show'))}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                {renderShowIfUnread(settingsLabels.systemLabels.drafts.showUnread, () => handleToggleSystemLabel('drafts', 'showUnread'))}
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

            {/* Spam */}
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
                {renderShowHide(settingsLabels.systemLabels.spam.show, () => handleToggleSystemLabel('spam', 'show'))}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                {renderShowIfUnread(settingsLabels.systemLabels.spam.showUnread, () => handleToggleSystemLabel('spam', 'showUnread'))}
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

            {/* Trash */}
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
                {renderShowHide(settingsLabels.systemLabels.trash.show, () => handleToggleSystemLabel('trash', 'show'))}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                {renderShowIfUnread(settingsLabels.systemLabels.trash.showUnread, () => handleToggleSystemLabel('trash', 'showUnread'))}
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

            {/* Important */}
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
                {renderShowHide(settingsLabels.systemLabels.important.show, () => handleToggleSystemLabel('important', 'show'))}
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

            {/* Categories header */}
            <tr>
              <td
                className="r8 alL"
                colSpan="6"
                style={{
                  margin: "0px",
                  verticalAlign: "top",
                  padding: "10px 15px 4px",
                  paddingLeft: "15px",
                  paddingTop: "24px",
                  fontWeight: "bold",
                }}
              >
                Categories
              </td>
            </tr>
            <tr>
              <td
                className="r8 alL"
                style={{
                  margin: "0px",
                  verticalAlign: "top",
                  width: "20%",
                  padding: "10px 15px 4px",
                  paddingLeft: "15px",
                }}
              />
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

            {/* Social */}
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
                {renderShowHide(settingsLabels.categories.social, () => handleToggleCategory('social'))}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                {renderShowHide(settingsLabels.categories.social, () => handleToggleCategory('social'))}
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

            {/* Promotions */}
            <tr id=":9a" className="To">
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
                {renderShowHide(settingsLabels.categories.promotions, () => handleToggleCategory('promotions'))}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                {renderShowHide(settingsLabels.categories.promotions, () => handleToggleCategory('promotions'))}
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

            {/* Updates */}
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
                {renderShowHide(settingsLabels.categories.updates, () => handleToggleCategory('updates'))}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                {renderShowHide(settingsLabels.categories.updates, () => handleToggleCategory('updates'))}
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

            {/* Forums */}
            <tr id=":9c" className="To">
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
                {renderShowHide(settingsLabels.categories.forums, () => handleToggleCategory('forums'))}
              </td>
              <td
                className="alQ"
                style={{
                  margin: "0px",
                  padding: "9px 15px",
                  verticalAlign: "top",
                }}
              >
                {renderShowHide(settingsLabels.categories.forums, () => handleToggleCategory('forums'))}
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

            {/* Labels header */}
            <tr>
              <td
                className="r8 alL"
                colSpan="6"
                style={{
                  margin: "0px",
                  verticalAlign: "top",
                  padding: "10px 15px 4px",
                  paddingLeft: "15px",
                  paddingTop: "24px",
                  fontWeight: "bold",
                }}
              >
        Labels
              </td>
            </tr>
            <tr>
              <td
                className="r8 alL"
                style={{
                  margin: "0px",
                  verticalAlign: "top",
                  width: "20%",
                  padding: "10px 15px 4px",
                  paddingLeft: "15px",
                }}
              />
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

            {/* Create new label button */}
            <tr>
              <td
                colSpan="6"
                style={{
                  margin: "0px",
                  padding: "10px 15px",
                }}
              >
                <span
                  role="link"
                  tabIndex="0"
                  onClick={handleCreateLabel}
                  style={{
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    color: "rgb(17, 85, 204)",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Create new label
                </span>
              </td>
            </tr>

            {/* Custom labels */}
            {settingsLabels.customLabels && settingsLabels.customLabels.length > 0 && (
              settingsLabels.customLabels.map((label, index) => (
                <tr key={index} className="To">
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
                      {label.name}
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
                    {renderShowHide(label.show, () => handleToggleCustomLabel(index, 'show'))}
                  </td>
                  <td
                    className="alQ"
                    style={{
                      margin: "0px",
                      padding: "9px 15px",
                      verticalAlign: "top",
                    }}
                  >
                    {renderShowHide(label.showInMessageList, () => handleToggleCustomLabel(index, 'showInMessageList'))}
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
                      role="link"
                      tabIndex="0"
                      onClick={() => handleRemoveCustomLabel(index)}
                      style={{
                        whiteSpace: "nowrap",
                        textDecoration: "none",
                        color: "rgb(17, 85, 204)",
                        cursor: "pointer",
                      }}
                    >
                      remove
                    </span>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
