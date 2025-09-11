import React, { useCallback, useMemo, useState } from "react";
import Icon from "../ui/Icon";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { SnoozePopover } from "../MailActions/Snooze";
import { ActionMenuItem } from "../MailActions/ActionMenuItem";
import { Labels } from "../MailActions/Labels";
import { useNavigate } from "react-router-dom";

const MoreActions = ({ thread, showAdvancedMenu, toggleShowAdvancedMenu }) => {
  const {
    moveToSpam,
    moveToTrash,
    moveToLabel,
    moveToLabelFrom,
    moveToInbox,
    archive,
    markRead,
    setStar,
    setImportant,
    snooze,
    toggleMute,
  } = useMailActions();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [currentPopover, setCurrentPopover] = React.useState("main"); // 'main' or 'snooze'
  const [labelAnchorEl, setLabelAnchorEl] = React.useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabelKeys, setSelectedLabelKeys] = useState(new Set());
  const { labels, setSnackbar } = useGlobalContext();

  const threadId = thread.threadId.split(":")[1];

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setCurrentPopover("main");
  };

  const handleClose = () => {
    setAnchorEl(null);
    setCurrentPopover("main");
  };

  const handleSnoozeClick = () => {
    setCurrentPopover("snooze");
  };

  const handleSnoozeBack = () => {
    setCurrentPopover("main");
  };

  const handleLabelClick = (event) => {
    event.stopPropagation();
    setLabelAnchorEl(event.currentTarget);
    setSearchQuery("");
    setSelectedLabelKeys(new Set());
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
    toggleMute([threadId], !muted);
    handleClose();
  }, [threadId, toggleMute, muted]);

  const handleMarkUnread = useCallback(() => {
    markRead([threadId], false);
    navigate("/inbox");
  }, []);

  return (
    <Box>
      <Icon name="more_vert" onClick={handleClick} label="" style={{}} disabled={false} />

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

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      paddingX: "16px",
                      height: "32px",
                      overflow: "hidden",
                      cursor: "pointer",
                      "&:hover": {
                        background: "#07070714",
                      },
                    }}
                    onClick={handleLabelClick}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 20,
                        color: "rgb(68, 68, 68)",
                        width: "20px",
                      }}
                    >
                      label
                    </span>

                    <Typography sx={{ flex: 1, paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px" }}>
                      Label as
                    </Typography>

                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 20,
                        color: "rgb(68, 68, 68)",
                      }}
                    >
                      arrow_right
                    </span>
                  </Box>
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
                </>
              )}
              {/* <ActionMenuItem
                icon="star"
                label={allStarred ? "Remove star" : "Add star"}
                disabled={onlyOneItemSelected}
                onClick={handleStar}
              />
              <ActionMenuItem
                icon="label_important"
                label="Mark as important"
                disabled={onlyOneItemSelected || allImportant}
                onClick={handleImportant}
              />
              <ActionMenuItem
                icon="label_important"
                label="Mark as not important"
                filled
                fontSize={18}
                disabled={onlyOneItemSelected || allNotImportant}
                onClick={handleNotImportant}
              />
              <ActionMenuItem
                icon="attach_file"
                label="Forward as attachment"
                horizontal
                disabled={onlyOneItemSelected}
                onClick={() => {}}
              /> */}
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

      <Labels
        {...{
          searchQuery,
          setSearchQuery,
          setLabelAnchorEl,
          setSelectedLabelKeys,
          selectedLabelKeys,
          labelAnchorEl,
          selectedIds: [thread.threadId.split(":")[1]],
          handleClose,
        }}
      />
    </Box>
  );
};

export default MoreActions;
