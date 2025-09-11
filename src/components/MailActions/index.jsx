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

const BulkActions = ({ threads = [], showAdvancedMenu }) => {
  const { moveToSpam, moveToTrash, moveToLabel, moveToLabelFrom, moveToInbox, archive, markRead, snooze } =
    useMailActions();
  const [{ moveToMenuOpen, spamModalOpen }, setState] = useState({
    moveToMenuOpen: false,
    spamModalOpen: false,
  });

  const snoozeAnchorElRef = useRef(null);
  const [snoozeAnchorEl, setSnoozeAnchorEl] = useState(null);
  const showSnoozePopover = Boolean(snoozeAnchorEl);

  const anchorRef = useRef(null);
  const { selection, labels, setSnackbar } = useGlobalContext();
  const { ids } = selection;

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
  const { label: labelParam } = useParams();
  const currentLabel = labelParam ? decodeURIComponent(labelParam) : null;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabelKeys, setSelectedLabelKeys] = useState(new Set());

  const customLabels = useMemo(() => {
    const map = labels || {};
    return Object.entries(map)
      .filter(([, meta]) => !meta.system)
      .map(([name]) => ({ id: "__label__" + name, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [labels]);

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

  const toggleMoveToMenu = () => {
    setState((prev) => ({
      ...prev,
      moveToMenuOpen: !prev.moveToMenuOpen,
    }));
  };

  const toggleSpamModal = () => {
    setState((prev) => ({
      ...prev,
      spamModalOpen: !prev.spamModalOpen,
    }));
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
      <Icon name="move_to_inbox" label="Move to" _ref={anchorRef} onClick={toggleMoveToMenu} />

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
    </Box>
  );
};

export default BulkActions;
