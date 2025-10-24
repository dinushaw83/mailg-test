import React, { useCallback, useMemo, useRef } from "react";
import Icon from "../ui/Icon";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Divider from "@mui/material/Divider";
import useMailActions from "../../hooks/useMailActions";
import { SnoozePopover } from "../MailActions/Snooze";
import { ActionMenuItem } from "../MailActions/ActionMenuItem";
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useHotkeys } from "react-hotkeys-hook";

const useCustomHotKeys = ({ handlePeriodPress }) => {
  const { keyboardShortcuts } = useGlobalContext();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";

  useHotkeys(shortcutsOn ? "Period" : "", () => {
    handlePeriodPress();
  });
};

const MoreActions = ({ thread, showAdvancedMenu, toggleShowAdvancedMenu }) => {
  const { markRead, setStar, setImportant, snooze, setMuted } = useMailActions();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [currentPopover, setCurrentPopover] = React.useState("main");

  const threadId = thread.threadId.split(":")[1];

  const moreVertRef = useRef(null);

  const handleClick = () => {
    setAnchorEl(moreVertRef.current);
    setCurrentPopover("main");
  };

  useCustomHotKeys({ handlePeriodPress: handleClick });

  const handleClose = () => {
    setAnchorEl(null);
    setCurrentPopover("main");
  };

  const handleSnoozeClick = () => {
    setCurrentPopover("snooze");
  };

  const open = Boolean(anchorEl);
  const id = open ? "more-actions-popover" : undefined;

  const starred = useMemo(() => {
    return thread.starred;
  }, [thread]);

  const important = useMemo(() => {
    return thread.important;
  }, [thread]);

  const muted = useMemo(() => {
    return thread.labels.includes("Muted");
  }, [thread]);

  const handleStar = useCallback(() => {
    setStar([threadId], !starred);
    handleClose();
  }, [threadId, setStar, starred]);

  const toggleImportant = useCallback(
    (value) => {
      setImportant([threadId], value);
      handleClose();
    },
    [threadId, setImportant, important]
  );

  const handleMute = useCallback(() => {
    setMuted([threadId], !muted);
    handleClose();
  }, [threadId, setMuted, muted]);

  const handleMarkUnread = useCallback(() => {
    markRead([threadId], false);
    navigate("/inbox");
  }, []);

  return (
    <Box>
      <Icon name="more_vert" onClick={handleClick} label="" style={{}} disabled={false} _ref={moreVertRef} />

      {currentPopover === "main" && (
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Box sx={{ paddingY: "6px", width: "256px", minHeight: "109px" }}>
            <>
              {!showAdvancedMenu && (
                <>
                  <ActionMenuItem icon="schedule" label="Snooze" onClick={handleSnoozeClick} />
                  <Divider sx={{ marginY: "6px" }} />
                </>
              )}
              {showAdvancedMenu && (
                <>
                  <ActionMenuItem icon="mark_email_unread" label="Mark as unread" onClick={handleMarkUnread} />
                  <ActionMenuItem
                    icon={important ? "label_important" : "label_important_outline"}
                    label={important ? "Mark as not important" : "Mark as important"}
                    onClick={() => toggleImportant(!important)}
                    filled={important}
                    fontSize={important ? 18 : 20}
                  />
                  <ActionMenuItem
                    icon="star"
                    label={starred ? "Remove star" : "Add star"}
                    onClick={handleStar}
                    filled={starred}
                  />
                </>
              )}
              <ActionMenuItem icon="filter_list" label="Filter messages like these" onClick={() => {}} />
              <ActionMenuItem icon="volume_off" label="Mute" onClick={handleMute} />
              <Divider sx={{ marginY: "6px" }} />
              <ActionMenuItem
                icon="swap_horiz"
                label={showAdvancedMenu ? "Switch to simple toolbar" : "Switch to advanced toolbar"}
                onClick={() => {
                  toggleShowAdvancedMenu();
                  handleClose();
                }}
              />
            </>
          </Box>
        </Popover>
      )}

      {currentPopover === "snooze" && (
        <SnoozePopover
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          selectedIds={[thread.threadId.split(":")[1]]}
          snooze={snooze}
        />
      )}
    </Box>
  );
};

export default MoreActions;
