import React, { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ActionMenuItem } from "./ActionMenuItem";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CreateLabelDialog from "../Labels/CreateLabelDialog";
import Divider from "@mui/material/Divider";
import Icon from "../ui/Icon";
import { Labels } from "./Labels";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useHotkeys } from "react-hotkeys-hook";
import useMailActions from "../../hooks/useMailActions";

const useCustomHotKeys = ({ handlePeriodPress }) => {
  const { keyboardShortcuts } = useGlobalContext();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";

  useHotkeys(shortcutsOn ? "Period" : "", () => {
    handlePeriodPress();
  });
};

const MoreActions = ({ hasItemsSelected, threads, showAdvancedMenu, setShowAdvancedMenu }) => {
  const navigate = useNavigate();
  const { markRead, setStar, setImportant, setMuted } = useMailActions();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [labelAnchorEl, setLabelAnchorEl] = React.useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabelKeys, setSelectedLabelKeys] = useState(new Set());
  const { selection, labels, setSnackbar, emails, setEmails } = useGlobalContext();
  const { ids } = selection;
  const selectedIds = useMemo(() => [...ids], [ids]);
  const selectedThreads = useMemo(
    () => threads.filter((thread) => selectedIds.includes(thread.thread_id)),
    [threads, selectedIds]
  );
  const selectedEmails = selectedThreads;

  const selectedThreadIds = useMemo(
    () => [...new Set(selectedEmails.map((email) => email.thread_id).filter(Boolean))],
    [selectedEmails]
  );

  const moreVertRef = useRef(null);

  const [createOpen, setCreateOpen] = useState(false);

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handlePeriodPress = useCallback(() => {
    if (moreVertRef.current && !anchorEl) {
      setAnchorEl(moreVertRef.current);
    } else if (moreVertRef.current && anchorEl) {
      handleClose();
    }
  }, [handleClose, moreVertRef, anchorEl]);

  useCustomHotKeys({ handlePeriodPress });

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleOnAfterCreate = (childName, parentKey) => {
    const ids = [...selection.ids];
    if (!ids.length) return;

    try {
      // Store original labels before the move
      const originalLabels = {};
      ids.forEach((id) => {
        const email = emails.find((email) => email.thread_id === String(id));
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
    const visibleThreadIds = new Set(threads.map((thread) => thread.thread_id));
    const unreadEmails = emails.filter((email) => visibleThreadIds.has(email.thread_id) && !email.is_read);
    const idsToUpdate = unreadEmails.map((email) => email.id);

    if (!idsToUpdate.length) {
      setSnackbar({
        open: true,
        message: "No unread conversations.",
        autoHideDuration: 3000,
        action: null,
      });
      handleClose();
      return;
    }

    markRead(idsToUpdate, true);

    const undo = () => {
      markRead(idsToUpdate, false);
      setSnackbar({
        open: true,
        message: "Action undone.",
        autoHideDuration: 3000,
        action: null,
      });
    };

    const unreadThreadCount = new Set(unreadEmails.map((email) => email.thread_id)).size;

    setSnackbar({
      open: true,
      message:
        unreadThreadCount > 1 ? `${unreadThreadCount} conversations marked as read.` : "Conversation marked as read.",
      autoHideDuration: 3000,
      action: (
        <Button sx={{ textTransform: "none" }} size="small" onClick={undo}>
          Undo
        </Button>
      ),
    });

    handleClose();
  }, [threads, emails, markRead, setSnackbar]);

  const onlyOneItemSelected = selectedIds.length === 1;

  const anyStarred = useMemo(() => {
    return selectedEmails.some((email) => email.is_starred);
  }, [selectedEmails]);

  const anyUnstarred = useMemo(() => {
    return selectedEmails.some((email) => !email.is_starred);
  }, [selectedEmails]);

  const allImportant = useMemo(() => {
    if (!selectedEmails.length) return false;
    return selectedEmails.every((email) => email.is_important);
  }, [selectedEmails]);

  const anyImportant = useMemo(() => {
    return selectedEmails.some((email) => email.is_important);
  }, [selectedEmails]);

  const anyNotImportant = useMemo(() => {
    return selectedEmails.some((email) => !email.is_important);
  }, [selectedEmails]);

  const allMuted = useMemo(() => {
    if (!selectedEmails.length) return false;
    return selectedEmails.every((email) => (email.labels || []).includes("Muted"));
  }, [selectedEmails]);

  const anyReadEmails = useMemo(() => {
    return selectedEmails.some((email) => email.is_read);
  }, [selectedEmails]);

  const handleStar = useCallback(
    (value) => {
      if (!selectedEmails.length) {
        handleClose();
        return;
      }

      const previousStates = selectedEmails.map((email) => ({
        id: email.id,
        thread_id: email.thread_id,
        starred: !!email.is_starred,
      }));
      const idsToUpdate = previousStates.filter((state) => state.starred !== value).map((state) => state.id);
      const threadIdsToUpdate = [
        ...new Set(
          previousStates
            .filter((state) => state.starred !== value)
            .map((state) => state.thread_id)
            .filter(Boolean)
        ),
      ];

      if (idsToUpdate.length) {
        // Pass 'list' context and thread IDs for proper thread-level unstarring
        setStar(idsToUpdate, value, "list", threadIdsToUpdate);
      }

      handleClose();

      const changedThreadCount =
        (value
          ? selectedThreads.filter((thread) => !thread.is_starred)
          : selectedThreads.filter((thread) => thread.is_starred)
        ).length ||
        selectedThreads.length ||
        1;

      const message = value
        ? changedThreadCount > 1
          ? `${changedThreadCount} conversations starred.`
          : "Conversation starred."
        : changedThreadCount > 1
          ? `${changedThreadCount} conversations unstarred.`
          : "Conversation unstarred.";

      const undo = () => {
        const toStar = previousStates.filter((state) => state.starred).map((state) => state.id);
        const toUnstar = previousStates.filter((state) => !state.starred).map((state) => state.id);
        const toUnstarThreadIds = [
          ...new Set(
            previousStates
              .filter((state) => !state.starred)
              .map((state) => state.thread_id)
              .filter(Boolean)
          ),
        ];

        if (toStar.length) {
          setStar(toStar, true, "list");
        }
        if (toUnstar.length) {
          setStar(toUnstar, false, "list", toUnstarThreadIds);
        }

        setSnackbar({
          open: true,
          message: "Action undone.",
          autoHideDuration: 3000,
          action: null,
        });
      };

      setSnackbar({
        open: true,
        message,
        autoHideDuration: 3000,
        action: (
          <Button sx={{ textTransform: "none" }} size="small" onClick={undo}>
            Undo
          </Button>
        ),
      });
    },
    [selectedEmails, setStar, selection, handleClose, selectedThreads, setSnackbar]
  );

  const handleImportant = useCallback(
    (value) => {
      if (!selectedEmails.length) {
        handleClose();
        return;
      }

      const previousStates = selectedEmails.map((email) => ({
        id: email.id,
        thread_id: email.thread_id,
        important: !!email.is_important,
      }));

      // Get thread IDs for emails that need to change
      const threadIdsToUpdate = [
        ...new Set(
          previousStates
            .filter((state) => state.important !== value)
            .map((state) => state.thread_id)
            .filter(Boolean)
        ),
      ];

      if (threadIdsToUpdate.length) {
        setImportant(threadIdsToUpdate, value);
      }

      handleClose();

      const changedThreadCount =
        (value
          ? selectedThreads.filter((thread) => !thread.is_important)
          : selectedThreads.filter((thread) => thread.is_important)
        ).length ||
        selectedThreads.length ||
        1;

      const message = value
        ? changedThreadCount > 1
          ? `${changedThreadCount} conversations marked as important.`
          : "Conversation marked as important."
        : changedThreadCount > 1
          ? `${changedThreadCount} conversations marked as not important.`
          : "Conversation marked as not important.";

      const undo = () => {
        const toImportant = [
          ...new Set(
            previousStates
              .filter((state) => state.important)
              .map((state) => state.thread_id)
              .filter(Boolean)
          ),
        ];
        const toNotImportant = [
          ...new Set(
            previousStates
              .filter((state) => !state.important)
              .map((state) => state.thread_id)
              .filter(Boolean)
          ),
        ];

        if (toImportant.length) {
          setImportant(toImportant, true);
        }
        if (toNotImportant.length) {
          setImportant(toNotImportant, false);
        }

        setSnackbar({
          open: true,
          message: "Action undone.",
          autoHideDuration: 3000,
          action: null,
        });
      };

      setSnackbar({
        open: true,
        message,
        autoHideDuration: 3000,
        action: (
          <Button sx={{ textTransform: "none" }} size="small" onClick={undo}>
            Undo
          </Button>
        ),
      });
    },
    [selectedEmails, setImportant, selection, handleClose, selectedThreads, setSnackbar]
  );

  const handleNotImportant = useCallback(() => {
    handleImportant(false);
  }, [handleImportant]);

  const handleMute = useCallback(() => {
    if (!selectedEmails.length) {
      handleClose();
      return;
    }

    const labelSnapshot = new Map(selectedEmails.map((email) => [String(email.id ?? ""), [...(email.labels || [])]]));

    const wasMuted = selectedEmails.every((email) => (email.labels || []).includes("Muted"));
    const nextValue = !wasMuted;

    const idsToUpdate = selectedEmails
      .filter((email) => {
        const isMuted = (email.labels || []).includes("Muted");
        return isMuted !== nextValue;
      })
      .map((email) => email.id);

    if (idsToUpdate.length) {
      setMuted(idsToUpdate, nextValue);
    }

    handleClose();

    const undo = () => {
      setEmails((prev) =>
        prev.map((email) => {
          const key = String(email.id ?? "");
          return labelSnapshot.has(key) ? { ...email, labels: labelSnapshot.get(key) } : email;
        })
      );
      setSnackbar({
        open: true,
        message: "Action undone.",
        autoHideDuration: 3000,
        action: null,
      });
    };

    const action = nextValue ? "muted" : "unmuted";
    const conversationCount =
      new Set(selectedEmails.map((email) => email.thread_id)).size || selectedThreads.length || 1;
    const message = conversationCount > 1 ? `${conversationCount} conversations ${action}.` : `Conversation ${action}.`;

    setSnackbar({
      open: true,
      message,
      autoHideDuration: 3000,
      action: (
        <Button sx={{ textTransform: "none" }} size="small" onClick={undo}>
          Undo
        </Button>
      ),
    });
  }, [selectedEmails, setMuted, selection, handleClose, selectedThreads, setSnackbar, setEmails]);

  const markAsUnread = useCallback(() => {
    if (!selectedEmails.length) {
      handleClose();
      return;
    }

    const previousStates = selectedEmails.map((email) => ({
      id: email.id,
      thread_id: email.thread_id,
      read: !!email.is_read,
    }));
    const idsToUpdate = previousStates.filter((state) => state.read).map((state) => state.id);

    if (!idsToUpdate.length) {
      setSnackbar({
        open: true,
        message: "Everything is already unread.",
        autoHideDuration: 3000,
        action: null,
      });
      handleClose();
      return;
    }

    markRead(idsToUpdate, false);

    const undo = () => {
      const idsToRestore = previousStates.filter((state) => state.read).map((state) => state.id);
      if (idsToRestore.length) {
        markRead(idsToRestore, true);
      }
      setSnackbar({
        open: true,
        message: "Action undone.",
        autoHideDuration: 3000,
        action: null,
      });
    };

    const affectedThreadCount = new Set(previousStates.filter((state) => state.read).map((state) => state.thread_id))
      .size;
    const conversations = affectedThreadCount || selectedThreads.length || 1;

    setSnackbar({
      open: true,
      message:
        conversations > 1 ? `${conversations} conversations marked as unread.` : "Conversation marked as unread.",
      autoHideDuration: 3000,
      action: (
        <Button sx={{ textTransform: "none" }} size="small" onClick={undo}>
          Undo
        </Button>
      ),
    });

    handleClose();
  }, [selectedEmails, markRead, selection, setSnackbar, handleClose, selectedThreads]);

  return (
    <Box>
      <Icon name="more_vert" onClick={handleClick} label="" style={{}} disabled={false} _ref={moreVertRef} />

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
                  {anyUnstarred && (
                    <ActionMenuItem
                      icon="star"
                      label="Add star"
                      filled={false}
                      onClick={() => handleStar(true)}
                      disabled={onlyOneItemSelected}
                    />
                  )}
                  {anyStarred && (
                    <ActionMenuItem
                      icon="star"
                      label="Remove star"
                      filled={true}
                      onClick={() => handleStar(false)}
                      disabled={onlyOneItemSelected}
                    />
                  )}
                  {anyNotImportant && (
                    <ActionMenuItem
                      icon={"label_important_outline"}
                      label={"Mark as important"}
                      onClick={() => handleImportant(true)}
                      filled={false}
                      fontSize={20}
                      disabled={onlyOneItemSelected}
                    />
                  )}

                  {anyImportant && (
                    <ActionMenuItem
                      icon="label_important"
                      label={"Mark as not important"}
                      onClick={() => handleImportant(false)}
                      filled={true}
                      fontSize={18}
                      disabled={onlyOneItemSelected}
                    />
                  )}

                  <ActionMenuItem icon="attach_file" label="Forward as attachment" horizontal onClick={() => navigate("/502")} />
                  <ActionMenuItem icon="filter_list" label="Filter messages like these" onClick={() => navigate("/502")} />
                  <ActionMenuItem icon="volume_off" label="Mute" onClick={handleMute} />
                </>
              )}
              {showAdvancedMenu && (
                <>
                  {anyReadEmails && (
                    <ActionMenuItem icon={"mark_email_unread"} label={"Mark as unread"} onClick={markAsUnread} />
                  )}
                  {anyNotImportant && (
                    <ActionMenuItem
                      icon={"label_important_outline"}
                      label={"Mark as important"}
                      onClick={() => handleImportant(true)}
                      filled={false}
                      fontSize={20}
                    />
                  )}

                  {anyImportant && (
                    <ActionMenuItem
                      icon="label_important"
                      label={"Mark as not important"}
                      onClick={() => handleImportant(false)}
                      filled={true}
                      fontSize={18}
                    />
                  )}
                  {anyUnstarred && (
                    <ActionMenuItem icon="star" label="Add star" filled={false} onClick={() => handleStar(true)} />
                  )}
                  {anyStarred && (
                    <ActionMenuItem icon="star" label="Remove star" filled={true} onClick={() => handleStar(false)} />
                  )}
                  <ActionMenuItem icon="filter_list" label="Filter messages like these" onClick={() => navigate("/502")} />
                  <ActionMenuItem icon="volume_off" label="Mute" onClick={handleMute} />
                  <ActionMenuItem icon="attach_file" label="Forward as attachment" horizontal onClick={() => navigate("/502")} />
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

      <Labels
        {...{
          searchQuery,
          setSearchQuery,
          setLabelAnchorEl,
          setSelectedLabelKeys,
          selectedLabelKeys,
          labelAnchorEl,
          selectedIds,
          threadIds: selectedThreadIds,
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
