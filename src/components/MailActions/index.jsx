import Box from "@mui/material/Box";
import { Icon } from "../InboxView/ActionBar";
import React, { useCallback, useMemo, useRef, useState } from "react";
import Divider from "@mui/material/Divider";
import SpamActions from "./SpamActions";
import MoveToMenu from "./MoveToMenu";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { useParams } from "react-router-dom";
import Button from "@mui/material/Button";
import SpamOrUnsubModal from "./SpamOrUnsubModal";

const BulkActions = ({ emails = [] }) => {
  const { moveToSpam, moveToTrash, moveToLabel, moveToLabelFrom, moveToInbox, archive, markRead } = useMailActions();
  const [{ moveToMenuOpen, spamModalOpen }, setState] = useState({
    moveToMenuOpen: false,
    spamModalOpen: false,
  });

  const anchorRef = useRef(null);
  const { selection, labels, setSnackbar } = useGlobalContext();
  const { ids } = selection;
  const selectedIds = useMemo(() => [...ids], [ids]);
  const selectedEmails = useMemo(
    () => emails.filter((email) => selectedIds.includes(email.threadId.split(":")[1])),
    [emails, selectedIds]
  );

  const [spamModal, setSpamModal] = useState({
    open: false,
    ids: [],
  });
  const { label: labelParam } = useParams();
  const currentLabel = labelParam ? decodeURIComponent(labelParam) : null;

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
    return selectedEmails.every((email) => email.labels.includes("Archive"));
  }, [selectedEmails]);

  const hasUnreadEmails = useMemo(() => {
    return selectedEmails.some((email) => !email.read);
  }, [selectedEmails]);

  const handleReadAction = useCallback(() => {
    if (hasUnreadEmails) {
      markRead(selectedIds, true); // Mark as read when there are unread emails
    } else {
      markRead(selectedIds, false); // Mark as unread when all are read
    }
  }, [hasUnreadEmails, selectedIds, markRead]);

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
      {/* The next icon does not exactly match */}
      <Icon name="drive_file_move" label="Move to" _ref={anchorRef} onClick={toggleMoveToMenu} />

      <Icon name="more_vert" />

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
    </Box>
  );
};

export default BulkActions;
