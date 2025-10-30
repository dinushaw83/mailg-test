import React, { useState, useEffect } from "react";
import { useGlobalContext } from "../../contexts/GlobalContext";

const AdvancedTab = () => {
  const { settingsAdvanced, setSettingsAdvanced } = useGlobalContext();
  const [localSettings, setLocalSettings] = useState(settingsAdvanced);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settingsAdvanced);
  }, [settingsAdvanced]);

  useEffect(() => {
    const changed = JSON.stringify(localSettings) !== JSON.stringify(settingsAdvanced);
    setHasChanges(changed);
  }, [localSettings, settingsAdvanced]);

  const handleRadioChange = (field, value) => {
    setLocalSettings((prev) => ({
      ...prev,
      [field]: value === "1" || value === true,
    }));
  };

  const handleSave = () => {
    setSettingsAdvanced(localSettings);
    setHasChanges(false);
  };

  const handleCancel = () => {
    setLocalSettings(settingsAdvanced);
    setHasChanges(false);
  };

  return (
    <div
      style={{
        padding: "0px 24px 24px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        maxHeight: "calc(100vh - 160px)",
        overflowY: "auto",
      }}
    >
      {/* Auto-advance */}
      <div
        className="J0"
        style={{
          padding: "24px 0px",
          display: "flex",
          borderBottom: "1px solid rgb(229, 229, 229)",
        }}
      >
        <div
          className="Jy"
          style={{
            WebkitFontSmoothing: "antialiased",
            fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
            fontSize: "0.875rem",
            letterSpacing: "normal",
            lineHeight: "20px",
            paddingRight: "80px",
            width: "70%",
          }}
        >
          <span className="JP" style={{ fontWeight: "bold" }}>
            Auto-advance
          </span>
          <br />
          Show the next conversation instead of your inbox after you delete, archive or mute a conversation. You can
          select whether to advance to the next or previous conversation in the "General" Settings page.
        </div>
        <div className="Ju" style={{ alignContent: "center", display: "flex", flexWrap: "wrap" }}>
          <div className="Jj" style={{ whiteSpace: "nowrap", marginRight: "32px" }}>
            <input
              id="auto_advance_enable"
              name="auto_advance"
              type="radio"
              value="1"
              checked={localSettings.autoAdvance === true}
              onChange={() => handleRadioChange("autoAdvance", true)}
              style={{
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                margin: "0px",
                fontSize: "100%",
                fontWeight: "normal",
              }}
            />
            <label
              className="Jx"
              htmlFor="auto_advance_enable"
              style={{
                WebkitFontSmoothing: "antialiased",
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                fontSize: "0.875rem",
                letterSpacing: "normal",
                fontWeight: "bold",
                paddingLeft: "8px",
              }}
            >
              Enable
            </label>
          </div>
          <div className="Jj" style={{ whiteSpace: "nowrap", marginRight: "32px" }}>
            <input
              id="auto_advance_disable"
              name="auto_advance"
              type="radio"
              value="0"
              checked={localSettings.autoAdvance === false}
              onChange={() => handleRadioChange("autoAdvance", false)}
              style={{
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                margin: "0px",
                fontSize: "100%",
                fontWeight: "normal",
              }}
            />
            <label
              className="Jx"
              htmlFor="auto_advance_disable"
              style={{
                WebkitFontSmoothing: "antialiased",
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                fontSize: "0.875rem",
                letterSpacing: "normal",
                fontWeight: "bold",
                paddingLeft: "8px",
              }}
            >
              Disable
            </label>
          </div>
        </div>
      </div>

      {/* Templates */}
      <div
        className="J0"
        style={{
          padding: "24px 0px",
          display: "flex",
          borderBottom: "1px solid rgb(229, 229, 229)",
        }}
      >
        <div
          className="Jy"
          style={{
            WebkitFontSmoothing: "antialiased",
            fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
            fontSize: "0.875rem",
            letterSpacing: "normal",
            lineHeight: "20px",
            paddingRight: "80px",
            width: "70%",
          }}
        >
          <span className="JP" style={{ fontWeight: "bold" }}>
            Templates
          </span>
          <br />
          Turn frequent messages into templates to save time. Templates can be created and inserted through the "More
          options" menu in the compose toolbar. You can also create automatic replies using templates and filters
          together.
        </div>
        <div className="Ju" style={{ alignContent: "center", display: "flex", flexWrap: "wrap" }}>
          <div className="Jj" style={{ whiteSpace: "nowrap", marginRight: "32px" }}>
            <input
              id="templates_enable"
              name="templates"
              type="radio"
              value="1"
              checked={localSettings.templates === true}
              onChange={() => handleRadioChange("templates", true)}
              style={{
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                margin: "0px",
                fontSize: "100%",
                fontWeight: "normal",
              }}
            />
            <label
              className="Jx"
              htmlFor="templates_enable"
              style={{
                WebkitFontSmoothing: "antialiased",
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                fontSize: "0.875rem",
                letterSpacing: "normal",
                fontWeight: "bold",
                paddingLeft: "8px",
              }}
            >
              Enable
            </label>
          </div>
          <div className="Jj" style={{ whiteSpace: "nowrap", marginRight: "32px" }}>
            <input
              id="templates_disable"
              name="templates"
              type="radio"
              value="0"
              checked={localSettings.templates === false}
              onChange={() => handleRadioChange("templates", false)}
              style={{
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                margin: "0px",
                fontSize: "100%",
                fontWeight: "normal",
              }}
            />
            <label
              className="Jx"
              htmlFor="templates_disable"
              style={{
                WebkitFontSmoothing: "antialiased",
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                fontSize: "0.875rem",
                letterSpacing: "normal",
                fontWeight: "bold",
                paddingLeft: "8px",
              }}
            >
              Disable
            </label>
          </div>
        </div>
      </div>

      {/* Custom keyboard shortcuts */}
      <div
        className="J0"
        style={{
          padding: "24px 0px",
          display: "flex",
          borderBottom: "1px solid rgb(229, 229, 229)",
        }}
      >
        <div
          className="Jy"
          style={{
            WebkitFontSmoothing: "antialiased",
            fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
            fontSize: "0.875rem",
            letterSpacing: "normal",
            lineHeight: "20px",
            paddingRight: "80px",
            width: "70%",
          }}
        >
          <span className="JP" style={{ fontWeight: "bold" }}>
            Custom keyboard shortcuts
          </span>
          <br />
          Enable the ability to customize your keyboard shortcuts via a new settings tab from which you can remap keys
          to various actions.
        </div>
        <div className="Ju" style={{ alignContent: "center", display: "flex", flexWrap: "wrap" }}>
          <div className="Jj" style={{ whiteSpace: "nowrap", marginRight: "32px" }}>
            <input
              id="keyboard_shortcuts_enable"
              name="keyboard_shortcuts"
              type="radio"
              value="1"
              checked={localSettings.customKeyboardShortcuts === true}
              onChange={() => handleRadioChange("customKeyboardShortcuts", true)}
              style={{
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                margin: "0px",
                fontSize: "100%",
                fontWeight: "normal",
              }}
            />
            <label
              className="Jx"
              htmlFor="keyboard_shortcuts_enable"
              style={{
                WebkitFontSmoothing: "antialiased",
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                fontSize: "0.875rem",
                letterSpacing: "normal",
                fontWeight: "bold",
                paddingLeft: "8px",
              }}
            >
              Enable
            </label>
          </div>
          <div className="Jj" style={{ whiteSpace: "nowrap", marginRight: "32px" }}>
            <input
              id="keyboard_shortcuts_disable"
              name="keyboard_shortcuts"
              type="radio"
              value="0"
              checked={localSettings.customKeyboardShortcuts === false}
              onChange={() => handleRadioChange("customKeyboardShortcuts", false)}
              style={{
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                margin: "0px",
                fontSize: "100%",
                fontWeight: "normal",
              }}
            />
            <label
              className="Jx"
              htmlFor="keyboard_shortcuts_disable"
              style={{
                WebkitFontSmoothing: "antialiased",
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                fontSize: "0.875rem",
                letterSpacing: "normal",
                fontWeight: "bold",
                paddingLeft: "8px",
              }}
            >
              Disable
            </label>
          </div>
        </div>
      </div>

      {/* Unread message icon */}
      <div className="J0" style={{ padding: "24px 0px", display: "flex" }}>
        <div
          className="Jy"
          style={{
            WebkitFontSmoothing: "antialiased",
            fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
            fontSize: "0.875rem",
            letterSpacing: "normal",
            lineHeight: "20px",
            paddingRight: "80px",
            width: "70%",
          }}
        >
          <span className="JP" style={{ fontWeight: "bold" }}>
            Unread message icon
          </span>
          <br />
          See how many unread messages are in your inbox with a quick glance at the MailG icon on the tab header.
        </div>
        <div className="Ju" style={{ alignContent: "center", display: "flex", flexWrap: "wrap" }}>
          <div className="Jj" style={{ whiteSpace: "nowrap", marginRight: "32px" }}>
            <input
              id="unread_icon_enable"
              name="unread_icon"
              type="radio"
              value="1"
              checked={localSettings.unreadMessageIcon === true}
              onChange={() => handleRadioChange("unreadMessageIcon", true)}
              style={{
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                margin: "0px",
                fontSize: "100%",
                fontWeight: "normal",
              }}
            />
            <label
              className="Jx"
              htmlFor="unread_icon_enable"
              style={{
                WebkitFontSmoothing: "antialiased",
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                fontSize: "0.875rem",
                letterSpacing: "normal",
                fontWeight: "bold",
                paddingLeft: "8px",
              }}
            >
              Enable
            </label>
          </div>
          <div className="Jj" style={{ whiteSpace: "nowrap", marginRight: "32px" }}>
            <input
              id="unread_icon_disable"
              name="unread_icon"
              type="radio"
              value="0"
              checked={localSettings.unreadMessageIcon === false}
              onChange={() => handleRadioChange("unreadMessageIcon", false)}
              style={{
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                margin: "0px",
                fontSize: "100%",
                fontWeight: "normal",
              }}
            />
            <label
              className="Jx"
              htmlFor="unread_icon_disable"
              style={{
                WebkitFontSmoothing: "antialiased",
                fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
                fontSize: "0.875rem",
                letterSpacing: "normal",
                fontWeight: "bold",
                paddingLeft: "8px",
              }}
            >
              Disable
            </label>
          </div>
        </div>
      </div>

      {/* Save/Cancel buttons */}
      <div
        className="rU"
        role="navigation"
        style={{
          padding: "5px 0px 0px",
          textAlign: "center",
        }}
      >
        <button
          id="advanced-save-btn"
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
          id="advanced-cancel-btn"
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
    </div>
  );
};

export default AdvancedTab;
