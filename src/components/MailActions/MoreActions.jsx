import React, { useCallback, useMemo, useState } from "react";
import Icon from "../ui/Icon";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { SnoozePopover } from "./Snooze";
import { ActionMenuItem } from "./ActionMenuItem";
import { Labels } from "./Labels";

const MoreActions = ({ hasItemsSelected, threads, showAdvancedMenu, setShowAdvancedMenu }) => {
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
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [currentPopover, setCurrentPopover] = React.useState("main"); // 'main' or 'snooze'
  const [labelAnchorEl, setLabelAnchorEl] = React.useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabelKeys, setSelectedLabelKeys] = useState(new Set());
  const { selection, labels, setSnackbar } = useGlobalContext();
  const { ids } = selection;
  const selectedIds = useMemo(() => [...ids], [ids]);
  const selectedThreads = useMemo(
    () => threads.filter((thread) => selectedIds.includes(thread.threadId.split(":")[1])),
    [threads, selectedIds]
  );

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

  const markAllAsRead = useCallback(() => {
    const threadIds = threads.map((thread) => thread.threadId.split(":")[1]);
    markRead(threadIds, true);
    handleClose();
  }, [threads, markRead]);

  const onlyOneItemSelected = selectedIds.length === 1;

  const allStarred = useMemo(() => {
    return selectedThreads.every((thread) => thread.starred);
  }, [selectedThreads]);

  const allImportant = useMemo(() => {
    return selectedThreads.every((thread) => thread.important);
  }, [selectedThreads]);

  const allNotImportant = useMemo(() => {
    return selectedThreads.every((thread) => !thread.important);
  }, [selectedThreads]);

  const allMuted = useMemo(() => {
    return selectedThreads.every((thread) => thread.labels.includes("Muted"));
  }, [selectedThreads]);

  const handleStar = useCallback(() => {
    setStar(selectedIds, !allStarred);
    handleClose();
  }, [selectedIds, setStar, allStarred]);

  const handleImportant = useCallback(() => {
    setImportant(selectedIds, true);
    handleClose();
  }, [selectedIds, setImportant, allImportant]);

  const handleNotImportant = useCallback(() => {
    setImportant(selectedIds, false);
    handleClose();
  }, [selectedIds, setImportant]);

  const handleMute = useCallback(() => {
    toggleMute(selectedIds, !allMuted);
    handleClose();
  }, [selectedIds, toggleMute, allMuted]);

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
            {!hasItemsSelected && (
              <>
                <ActionMenuItem icon="drafts" label="Mark all as read" onClick={markAllAsRead} />

                <Divider sx={{ marginY: "6px" }} />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingY: "16px",
                    paddingX: "32px",
                  }}
                >
                  <Typography sx={{ fontSize: "0.875rem", lineHeight: "20px", color: "#5f6368" }}>
                    Select messages to see more actions
                  </Typography>
                </Box>
              </>
            )}
            {hasItemsSelected && (
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
                <ActionMenuItem
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
                />
                <ActionMenuItem icon="filter_list" label="Filter messages like these" onClick={() => {}} />
                <ActionMenuItem icon="volume_off" label="Mute" onClick={handleMute} />
                <Divider sx={{ marginY: "6px" }} />
                <ActionMenuItem
                  icon="swap_horiz"
                  label={showAdvancedMenu ? "Switch to simple toolbar" : "Switch to advanced toolbar"}
                  onClick={() => {
                    setShowAdvancedMenu((prev) => !prev);
                    handleClose();
                  }}
                />
              </>
            )}
          </Box>
        </Popover>
      )}

      {currentPopover === "snooze" && (
        <SnoozePopover
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          selectedIds={selectedIds}
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
          selectedIds,
          handleClose,
        }}
      />
    </Box>
  );
};

export default MoreActions;
