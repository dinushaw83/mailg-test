import React, { useCallback, useMemo, useRef, useState } from "react";
import Icon from "../ui/Icon";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { SnoozePopover } from "./Snooze";
import { ActionMenuItem } from "./ActionMenuItem";
import { Labels } from "./Labels";
import CreateLabelDialog from "../Labels/CreateLabelDialog";
import { useHotkeys } from "react-hotkeys-hook";

const useCustomHotKeys = ({ handlePeriodPress }) => {
  const { keyboardShortcuts } = useGlobalContext();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";

  useHotkeys(shortcutsOn ? "Period" : "", () => {
    handlePeriodPress();
  });
};

const MoreActions = ({ hasItemsSelected, threads, showAdvancedMenu, setShowAdvancedMenu }) => {
  const { markRead, setStar, setImportant, snooze, setMuted } = useMailActions();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [currentPopover, setCurrentPopover] = React.useState("main"); // 'main' or 'snooze'
  const [labelAnchorEl, setLabelAnchorEl] = React.useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabelKeys, setSelectedLabelKeys] = useState(new Set());
  const { selection, labels, setSnackbar, emails } = useGlobalContext();
  const { ids } = selection;
  const selectedIds = useMemo(() => [...ids], [ids]);
  const selectedThreads = useMemo(
    () => threads.filter((thread) => selectedIds.includes(thread.threadId.split(":")[1])),
    [threads, selectedIds]
  );
  const moreVertRef = useRef(null);

  const [createOpen, setCreateOpen] = useState(false);

  const handleClose = () => {
    setAnchorEl(null);
    setCurrentPopover("main");
  };

  const handlePeriodPress = useCallback(() => {
    if (moreVertRef.current && !anchorEl) {
      setAnchorEl(moreVertRef.current);
      setCurrentPopover("main");
    } else if (moreVertRef.current && anchorEl) {
      handleClose();
    }
  }, [currentPopover, handleClose, moreVertRef]);

  useCustomHotKeys({ handlePeriodPress });

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setCurrentPopover("main");
  };

  const handleSnoozeClick = () => {
    setCurrentPopover("snooze");
  };

  const handleOnAfterCreate = (childName, parentKey) => {
    const ids = [...selection.ids];
    if (!ids.length) return;

    try {
      // Store original labels before the move
      const originalLabels = {};
      ids.forEach((id) => {
        const email = emails.find((email) => email.threadId.split(":")[1] === String(id));
        if (email) {
          originalLabels[String(id)] = [...(email.labels || [])];
        }
      });

      // Perform the move after creation
      const newKey = makeKey(childName, parentKey); // build composite key
      const curMeta = currentLabel ? labels?.currentLabel : null;
      const inCustomLabel = curMeta && curMeta.system === false;
      if (inCustomLabel) {
        moveToLabel(ids, currentLabel, newKey);
      } else {
        moveToLabel(ids, newKey);
      }

      selection.clear();

      // --- UNDO action ---
      setSnackbar({
        open: true,
        message:
          ids.length > 1
            ? `${ids.length} conversations moved to "${childName}".`
            : `Conversation moved to "${childName}".`,
        autoHideDuration: 10000,
        action: (
          <Button
            sx={{ textTransform: "capitalize" }}
            size="small"
            onClick={() => {
              try {
                setSnackbar({
                  open: true,
                  message: "Action undone.",
                  autoHideDuration: 3000,
                  action: null,
                });
              } catch {
                setSnackbar({
                  open: true,
                  message: "Could not undo.",
                  autoHideDuration: 4000,
                  action: null,
                });
              }
            }}
          >
            Undo
          </Button>
        ),
      });
    } catch (e) {
      setSnackbar({
        open: true,
        message: "Could not move selected conversations.",
        autoHideDuration: 4000,
      });
    }
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

  const handleStar = useCallback(
    (value) => {
      setStar(selectedIds, value);
      selection.clear();
      handleClose();

      const message = value
        ? selectedIds.length > 1
          ? `${selectedIds.length} conversations starred.`
          : "Conversation starred."
        : selectedIds.length > 1
        ? `${selectedIds.length} conversations unstarred.`
        : "Conversation unstarred.";

      setSnackbar({
        open: true,
        message,
        autoHideDuration: 10000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              setStar(selectedIds, !value);
              setSnackbar({
                open: true,
                message: "Action undone.",
                autoHideDuration: 3000,
                action: null,
              });
            }}
          >
            Undo
          </Button>
        ),
      });
    },
    [selectedIds, setStar, selection, setSnackbar]
  );

  const handleImportant = useCallback(
    (value) => {
      setImportant(selectedIds, value);
      selection.clear();
      handleClose();

      const message = value
        ? selectedIds.length > 1
          ? `${selectedIds.length} conversations marked as important.`
          : "Conversation marked as important."
        : selectedIds.length > 1
        ? `${selectedIds.length} conversations marked as not important.`
        : "Conversation marked as not important.";

      setSnackbar({
        open: true,
        message,
        autoHideDuration: 10000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              setImportant(selectedIds, !value);
              setSnackbar({
                open: true,
                message: "Action undone.",
                autoHideDuration: 3000,
                action: null,
              });
            }}
          >
            Undo
          </Button>
        ),
      });
    },
    [selectedIds, setImportant, selection, setSnackbar]
  );

  const handleMute = useCallback(() => {
    setMuted(selectedIds, true);
    selection.clear();
    handleClose();

    const message = selectedIds.length > 1 ? `${selectedIds.length} conversations muted.` : "Conversation muted.";

    setSnackbar({
      open: true,
      message,
      autoHideDuration: 10000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            setMuted(selectedIds, false);
            setSnackbar({
              open: true,
              message: "Action undone.",
              autoHideDuration: 3000,
              action: null,
            });
          }}
        >
          Undo
        </Button>
      ),
    });
  }, [selectedIds, setMuted, selection, setSnackbar]);

  const hasUnreadEmails = useMemo(() => {
    // to reconsider this
    return selectedThreads.some((thread) => !thread.read);
  }, [selectedThreads]);

  const handleReadAction = useCallback(() => {
    markRead(selectedIds, hasUnreadEmails); // Mark as read when there are unread emails
    handleClose();
  }, [hasUnreadEmails, selectedIds, markRead]);

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
                {!showAdvancedMenu && (
                  <>
                    <ActionMenuItem icon="schedule" label="Snooze" onClick={handleSnoozeClick} />
                    <Divider sx={{ marginY: "6px" }} />
                    <ActionMenuItem
                      icon="star"
                      label={allStarred ? "Remove star" : "Add star"}
                      filled={allStarred}
                      onClick={() => handleStar(!allStarred)}
                      disabled={onlyOneItemSelected}
                    />
                    <ActionMenuItem
                      icon={allImportant ? "label_important" : "label_important_outline"}
                      label={allImportant ? "Mark as not important" : "Mark as important"}
                      onClick={() => handleImportant(!allImportant)}
                      filled={allImportant}
                      fontSize={allImportant ? 18 : 20}
                      disabled={onlyOneItemSelected}
                    />

                    <ActionMenuItem icon="attach_file" label="Forward as attachment" horizontal onClick={() => {}} />
                    <ActionMenuItem icon="filter_list" label="Filter messages like these" onClick={() => {}} />
                    <ActionMenuItem icon="volume_off" label="Mute" onClick={handleMute} />
                  </>
                )}
                {showAdvancedMenu && (
                  <>
                    <ActionMenuItem
                      icon={hasUnreadEmails ? "drafts" : "mark_email_unread"}
                      label={hasUnreadEmails ? "Mark as read" : "Mark as unread"}
                      onClick={handleReadAction}
                    />
                    <ActionMenuItem
                      icon={allImportant ? "label_important" : "label_important_outline"}
                      label={allImportant ? "Mark as not important" : "Mark as important"}
                      onClick={() => handleImportant(!allImportant)}
                      filled={allImportant}
                      fontSize={allImportant ? 18 : 20}
                    />
                    <ActionMenuItem
                      icon="star"
                      label={allStarred ? "Remove star" : "Add star"}
                      filled={allStarred}
                      onClick={() => handleStar(!allStarred)}
                    />
                    <ActionMenuItem icon="filter_list" label="Filter messages like these" onClick={() => {}} />
                    <ActionMenuItem icon="volume_off" label="Mute" onClick={handleMute} />
                    <ActionMenuItem icon="attach_file" label="Forward as attachment" horizontal onClick={() => {}} />
                  </>
                )}
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
          onOpenCreateLabelDialog: () => {
            setCreateOpen(true);
          },
        }}
      />

      <CreateLabelDialog open={createOpen} onClose={() => setCreateOpen(false)} onAfterCreate={handleOnAfterCreate} />
    </Box>
  );
};

export default MoreActions;
