import Box from "@mui/material/Box";
import { Icon } from "../InboxView/ActionBar";
import React, { useCallback, useMemo, useRef, useState } from "react";
import Divider from "@mui/material/Divider";
import MoveToMenu from "./MoveToMenu";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { useParams } from "react-router-dom";
import Button from "@mui/material/Button";
import SpamOrUnsubModal from "./SpamOrUnsubModal";

import { SnoozePopover } from "./Snooze";
import { Labels } from "./Labels";

import useLabels, { flattenTreeForSelect, getPathLabelFromKey } from "../../hooks/useLabels";
import CreateLabelDialog from "../Labels/CreateLabelDialog";

const MailActions = ({ threads = [], showAdvancedMenu }) => {
  const {
    moveToSpam,
    moveToTrash,
    moveToLabel,
    moveToLabelFrom,
    moveToInbox,
    archive,
    markRead,
    snooze,
    deleteForever,
  } = useMailActions();
  const [{ moveToMenuOpen, spamModalOpen, createOpen }, setState] = useState({
    moveToMenuOpen: false,
    spamModalOpen: false,
    createOpen: false,
  });

  const snoozeAnchorElRef = useRef(null);
  const [snoozeAnchorEl, setSnoozeAnchorEl] = useState(null);
  const showSnoozePopover = Boolean(snoozeAnchorEl);

  const anchorRef = useRef(null);
  const { selection, setSnackbar } = useGlobalContext();
  const { ids } = selection;

  const { labels, labelTree } = useLabels();

  const setCreateOpen = useCallback(
    (val) =>
      setState((prev) => ({
        ...prev,
        createOpen: val,
      })),
    []
  );

  const selectedIds = useMemo(() => [...ids], [ids]);
  const selectedThreads = useMemo(
    () => threads.filter((email) => selectedIds.includes(email.threadId.split(":")[1])),
    [threads, selectedIds]
  );

  const labelAnchorElRef = useRef(null);
  const [labelAnchorEl, setLabelAnchorEl] = useState(null);

  const [spamModal, setSpamModal] = useState({
    open: false,
    ids: [],
  });

  const { label: labelParam, folder } = useParams();
  const currentLabel = labelParam ? decodeURIComponent(labelParam) : null;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabelKeys, setSelectedLabelKeys] = useState(new Set());

  // Check if any selected emails are not in the inbox
  const menuItems = useMemo(() => {
    const flat = flattenTreeForSelect(labelTree); // [{ key, name, depth, system }]
    return flat
      .filter((item) => !labels?.[item.key]?.system)
      .map((item) => ({
        id: item.key,
        name: getPathLabelFromKey(labels, item.key), // "Parent / Child / ..."
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [labelTree, labels]);

  const handleArchiveEmails = useCallback(async () => {
    if (!selectedIds.length) return;

    try {
      archive(selectedIds);
      selection.clear();
      setSnackbar({
        open: true,
        message: "Conversations archived.",
        autoHideDuration: 3000,
        action: null,
      });
    } catch (e) {
      console.error("Archive failed:", e);
    }
  }, [selectedIds, archive, selection, setSnackbar]);

  const handleDeleteEmails = useCallback(async () => {
    if (!selectedIds.length) return;
    moveToTrash(selectedIds);
    // Show global snackbar with Undo action
    setSnackbar({
      open: true,
      message: "Conversation moved to Trash.",
      autoHideDuration: 10000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            moveToInbox(selectedIds);
            // Follow-up confirmation snackbar
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
  }, [selectedIds, moveToTrash]);

  const handleMoveEmails = useCallback(
    async (item) => {
      if (!selectedIds.length) return;

      try {
        if (item.id === "__inbox__" || item.id === "inbox") {
          moveToLabel(selectedIds, "Inbox");
        } else if (item.id === "__spam__" || item.id === "spam") {
          setSpamModal({ open: true, ids: selectedIds });
          // moveToSpam(ids);
        } else if (item.id === "__trash__" || item.id === "trash") {
          moveToTrash(selectedIds);
          // Show global snackbar with Undo action
          setSnackbar({
            open: true,
            message: "Conversation moved to Trash.",
            autoHideDuration: 10000,
            action: (
              <Button
                sx={{ textTransform: "none" }}
                size="small"
                onClick={() => {
                  moveToInbox(selectedIds);
                  // Follow-up confirmation snackbar
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
        } else if (item.id.startsWith("__label__")) {
          // moving between labels:
          if (currentLabel && labels?.[currentLabel] && labels?.[currentLabel]["system"] === false) {
            moveToLabelFrom(selectedIds, currentLabel, item.name);
          } else {
            moveToLabel(selectedIds, item.name);
          }
        }
        selection.clear();
      } catch (e) {
        console.error("Move failed:", e);
      }
    },
    [selectedIds, moveToLabel, moveToLabelFrom, moveToTrash, moveToInbox, setSnackbar, currentLabel, labels]
  );

  const shouldDisableArchiveButton = useMemo(() => {
    // No selection → disable
    if (!selection?.ids?.size) return true;

    // Normalise selected ids (can be message id, '#thread-f:...' or bare thread key)
    const targets = new Set([...selection.ids].map((id) => String(id).trim()));

    const matchesSelection = (m) => {
      const keys = [
        String(m.id),
        String(m.threadId),
        m.threadId && String(m.threadId).replace("#thread-f:", ""),
      ].filter(Boolean);
      return keys.some((k) => targets.has(k));
    };

    // Enable Archive if ANY matched message is in Inbox
    const hasAnyInInbox = threads.some((m) => matchesSelection(m) && (m.labels || []).includes("Inbox"));

    // Disable only when none of the selected items are in Inbox
    return !hasAnyInInbox;
  }, [threads, selection?.ids]);

  const onArchive = () => {
    const ids = [...selection.ids];
    if (!ids.length) return;
    try {
      archive(ids);
      setSnackbar({
        open: true,
        message: "Conversation archived.",
        autoHideDuration: 3000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              moveToInbox(ids);
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
      selection.clear();
    } catch (e) {
      console.error("Archive failed:", e);
    }
  };

  const toggleSpamModal = () => {
    setState((prev) => ({
      ...prev,
      spamModalOpen: !prev.spamModalOpen,
    }));
  };

  const onMoveArchivedMailToInbox = () => {
    const ids = [...selection.ids];
    if (!ids.length) return;
    try {
      moveToInbox(ids);
      setSnackbar({
        open: true,
        message: "Conversation moved to Inbox.",
        autoHideDuration: 3000,
        action: null,
      });
      selection.clear();
    } catch (e) {
      console.error("Move to Inbox failed:", e);
    }
  };

  const onDeleteForever = () => {
    const ids = [...selection.ids];
    if (!ids.length) return;

    try {
      deleteForever(ids);
      setSnackbar({
        open: true,
        message: "Conversation deleted forever.",
        autoHideDuration: 3000,
        action: null,
      });
      selection.clear();
    } catch (e) {
      console.error("Delete forever failed:", e);
    }
  };

  const handleMenuItemClick = async (item) => {
    const ids = [...selection.ids]; // Set → Array

    if (item.id === "__create_label__") {
      setCreateOpen(true);
      return;
    }

    if (!ids.length) return;

    try {
      if (item.id === "__inbox__" || item.id === "inbox") {
        moveToLabel(ids, "Inbox");
      } else if (item.id === "__spam__" || item.id === "spam") {
        setSpamModal({ open: true, ids });
        // moveToSpam(ids);
      } else if (item.id === "__trash__" || item.id === "trash") {
        moveToTrash(ids);
        // Show global snackbar with Undo action
        setSnackbar({
          open: true,
          message: "Conversation moved to Trash.",
          autoHideDuration: 10000,
          action: (
            <Button
              sx={{ textTransform: "none" }}
              size="small"
              onClick={() => {
                moveToInbox(ids);
                // Follow-up confirmation snackbar
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
      } else {
        // item.id is now the TARGET LABEL KEY
        const targetKey = item.id;
        const curMeta = currentLabel ? labels?.[currentLabel] : null;
        const inCustomLabel = curMeta && curMeta.system === false;
        if (inCustomLabel) {
          moveToLabelFrom(ids, currentLabel, targetKey);
        } else {
          moveToLabel(ids, targetKey); // pass key
        }
      }
      setOpen(false);
      selection.clear();
    } catch (e) {
      console.error("Move failed:", e);
    }
  };

  const handleOnAfterCreate = (childName, parentKey) => {
    const ids = [...selection.ids];
    if (!ids.length) return;

    try {
      // Perform the move after creation
      const newKey = makeKey(childName, parentKey); // build composite key
      const curMeta = currentLabel ? labels?.[currentLabel] : null;
      const inCustomLabel = curMeta && curMeta.system === false;
      if (inCustomLabel) {
        moveToLabelFrom(ids, currentLabel, newKey);
      } else {
        moveToLabel(ids, newKey);
      }

      selection.clear();

      // --- UNDO action ---
      setSnackbar({
        open: true,
        message: `Conversation moved to “${childName}”.`,
        autoHideDuration: 10000,
        action: (
          <Button
            size="small"
            onClick={() => {
              try {
                if (inCustomLabel) {
                  moveToLabelFrom(ids, newKey, currentLabel);
                } else {
                  if (currentLabel) moveToLabel(ids, currentLabel);
                  else moveToInbox(ids);
                }

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

  const allAreArchived = useMemo(() => {
    return selectedThreads.every((thread) => thread.labels.includes("Archive"));
  }, [selectedThreads]);

  const hasUnreadEmails = useMemo(() => {
    // to reconsider this
    return selectedThreads.some((thread) => !thread.read);
  }, [selectedThreads]);

  const handleReadAction = useCallback(() => {
    if (hasUnreadEmails) {
      markRead(selectedIds, true); // Mark as read when there are unread emails
    } else {
      markRead(selectedIds, false); // Mark as unread when all are read
    }
  }, [hasUnreadEmails, selectedIds, markRead]);

  const handleSnoozeAction = useCallback(() => {
    setSnoozeAnchorEl(snoozeAnchorElRef.current);
  }, []);

  const handleSnoozeClose = useCallback(() => {
    setSnoozeAnchorEl(null);
  }, []);

  const handleLabelAction = useCallback(() => {
    setLabelAnchorEl(labelAnchorElRef.current);
  }, []);

  const handleLabelClose = useCallback(() => {
    setLabelAnchorEl(null);
  }, []);

  const toggleMoveToMenu = useCallback(() => {
    setState((prev) => ({
      ...prev,
      moveToMenuOpen: !prev.moveToMenuOpen,
    }));
  }, []);

  return (
    <Box display="flex" alignItems="center">
      <Icon name="archive" label="Archive" onClick={handleArchiveEmails} disabled={allAreArchived} />
      <Icon name="report" label="Report" onClick={toggleSpamModal} />
      <Icon name="delete" label="Delete" onClick={handleDeleteEmails} />

      <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />

      <Icon
        name={hasUnreadEmails ? "drafts" : "mark_email_unread"}
        label={hasUnreadEmails ? "Mark as read" : "Mark as unread"}
        onClick={handleReadAction}
      />
      {showAdvancedMenu && (
        <>
          <Icon name="schedule" label="Snooze" onClick={handleSnoozeAction} _ref={snoozeAnchorElRef} />
          <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />
        </>
      )}
      <Icon name="drive_file_move" label="Move to" _ref={anchorRef} onClick={toggleMoveToMenu} />

      {showAdvancedMenu && <Icon name="label" label="Labels" onClick={handleLabelAction} _ref={labelAnchorElRef} />}

      {moveToMenuOpen && (
        <MoveToMenu
          anchorRef={anchorRef}
          labels={customLabels}
          onSelect={handleMoveEmails}
          onClose={() =>
            setState((prev) => ({
              ...prev,
              moveToMenuOpen: false,
            }))
          }
        />
      )}

      <SpamOrUnsubModal
        open={spamModalOpen}
        onClose={() => {
          toggleSpamModal();
        }}
        onReportSpam={() => {
          moveToSpam(selectedIds);
          toggleSpamModal();
        }}
        onUnsubscribe={() => {
          moveToSpam(selectedIds);
          toggleSpamModal();
        }}
      />

      {showSnoozePopover && (
        <SnoozePopover
          anchorEl={snoozeAnchorEl}
          open={showSnoozePopover}
          onClose={handleSnoozeClose}
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
          handleClose: handleLabelClose,
          // position below the icon
          anchorOrigin: { vertical: "bottom", horizontal: "left" },
          transformOrigin: { vertical: "top", horizontal: "left" },
        }}
      />

      <CreateLabelDialog open={createOpen} onClose={() => setCreateOpen(false)} onAfterCreate={handleOnAfterCreate} />
    </Box>
  );
};

export default MailActions;
