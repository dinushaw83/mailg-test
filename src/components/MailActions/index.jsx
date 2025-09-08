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

const BulkActions = ({ isSpam = false }) => {
  const { moveToSpam, moveToTrash, moveToLabel, moveToLabelFrom, moveToInbox } = useMailActions();
  const [{ moveToMenuOpen, spamModalOpen }, setState] = useState({
    moveToMenuOpen: false,
    spamModalOpen: false,
  });

  const anchorRef = useRef(null);
  const { selection, labels, emails, setEmails, setSnackbar, setComposeWindows } = useGlobalContext();
  const { ids } = selection;

  const [spamModal, setSpamModal] = useState({
    open: false,
    ids: [],
  });
  const { label: labelParam, folder } = useParams();
  const currentLabel = labelParam ? decodeURIComponent(labelParam) : null;
  const lastActionIds = useRef([]);

  const customLabels = useMemo(() => {
    const map = labels || {};
    return Object.entries(map)
      .filter(([, meta]) => !meta.system)
      .map(([name]) => ({ id: "__label__" + name, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [labels]);

  const handleMenuItemClick = useCallback(
    async (item) => {
      if (![...ids].length) return;

      try {
        if (item.id === "__inbox__" || item.id === "inbox") {
          moveToLabel([...ids], "Inbox");
        } else if (item.id === "__spam__" || item.id === "spam") {
          setSpamModal({ open: true, ids: [...ids] });
          // moveToSpam(ids);
        } else if (item.id === "__trash__" || item.id === "trash") {
          moveToTrash([...ids]);
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
                  moveToInbox([...ids]);
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
            moveToLabelFrom([...ids], currentLabel, item.name);
          } else {
            moveToLabel([...ids], item.name);
          }
        }
        selection.clear();
      } catch (e) {
        console.error("Move failed:", e);
      }
    },
    [[...ids], moveToLabel, moveToLabelFrom, moveToTrash, moveToInbox, setSnackbar, currentLabel, labels]
  );

  const toggleMoveToMenu = () => {
    setState((prev) => ({
      ...prev,
      moveToMenuOpen: !prev.moveToMenuOpen,
    }));
  };

  if (isSpam) {
    return <SpamActions />;
  }

  const toggleSpamModal = () => {
    setState((prev) => ({
      ...prev,
      spamModalOpen: !prev.spamModalOpen,
    }));
  };

  // Handle discard drafts
  const handleDiscardDrafts = () => {
    if (![...ids].length) return;

    // Store the email objects that are being deleted
    const deletedEmails = [];

    // Filter out selected draft emails
    setEmails((prevEmails) =>
      prevEmails.filter((email) => {
        // Only filter out emails that have "Drafts" label and are selected
        if (!email.labels || !email.labels.includes("Drafts")) {
          return true;
        }

        const emailThreadId = email.threadId.split(":")[1];

        if ([...ids].includes(emailThreadId)) {
          deletedEmails.push(email);
          return false;
        }

        return true;
      })
    );

    // Update compose windows - set draftId to null for deleted drafts
    setComposeWindows((prevWindows) =>
      prevWindows.map((window) => {
        const hasDeletedDraft = deletedEmails.some(
          (deletedEmail) => window.draftId?.toString() === deletedEmail.id?.toString()
        );

        if (hasDeletedDraft) {
          return { ...window, draftId: null };
        }

        return window;
      })
    );

    // Show success snackbar
    setSnackbar({
      open: true,
      message: "Drafts deleted",
      autoHideDuration: 2000,
      action: null,
    });

    // Clear selection
    selection.clear();
  };

  // Handle undo move to inbox
  const handleUndoMoveToInbox = () => {
    const selectedIds = [...lastActionIds.current];

    // Update the selected emails to remove Inbox label if it exists
    setEmails((prevEmails) =>
      prevEmails.map((email) => {
        const emailThreadId = email.threadId.split(":")[1];
        if (selectedIds.includes(emailThreadId) && email.labels.includes("Drafts")) {
          return { ...email, labels: email.labels.filter((label) => label !== "Inbox") };
        }
        return email;
      })
    );

    // Display snackbar with undo action
    setSnackbar({
      open: true,
      message: "Action undone.",
      action: null,
      autoHideDuration: 3000,
    });

    lastActionIds.current = [];
  };

  // Handle move to inbox
  const handleMoveToInbox = () => {
    const selectedIds = [...ids];

    // Check if the selected emails already have the Inbox label
    const emailsAlreadyInInbox = emails.some((email) => {
      const emailThreadId = email.threadId.split(":")[1];
      return selectedIds.includes(emailThreadId) && email.labels.includes("Inbox");
    });

    if (emailsAlreadyInInbox) {
      // Display snackbar conversation moved to inbox and return
      setSnackbar({
        open: true,
        message: "Conversation moved to inbox.",
        action: null,
        autoHideDuration: 3000,
      });
      return;
    }

    // Update emails to include Inbox label
    setEmails((prevEmails) =>
      prevEmails.map((email) => {
        const emailThreadId = email.threadId.split(":")[1];
        if (email.labels.includes("Drafts") && selectedIds.includes(emailThreadId) && !email.labels.includes("Inbox")) {
          return { ...email, labels: [...email.labels, "Inbox"] };
        }
        return email;
      })
    );

    // Store the action ids
    lastActionIds.current = [...selectedIds];

    // Display snackbar with undo action
    setSnackbar({
      open: true,
      message: "Convervation moved to inbox.",
      action: (
        <Button sx={{ textTransform: "none" }} size="medium" onClick={handleUndoMoveToInbox}>
          Undo
        </Button>
      ),
      autoHideDuration: 8000,
    });
  };

  return (
    <Box display="flex" alignItems="center">
      {folder === "drafts" ? (
        <Button
          sx={{
            textTransform: "none",
            color: "rgb(95,99,104)",
            fontWeight: 500,
            fontSize: "0.875rem",
            "&:hover": {
              backgroundColor: "rgba(32, 33, 36, 0.031)",
            },
          }}
          onClick={handleDiscardDrafts}
        >
          Discard drafts
        </Button>
      ) : (
        <>
          <Icon name="archive" label="Archive" />
          <Icon name="report" label="Report" onClick={toggleSpamModal} />
          <Icon name="delete" label="Delete" />
        </>
      )}

      <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />

      <Icon name="mark_email_unread" label="Mark as unread" />
      {/* The next icon does not exactly match */}
      {folder === "drafts" ? (
        <Icon name="move_to_inbox" label="Move to inbox" _ref={anchorRef} onClick={handleMoveToInbox} />
      ) : (
        <Icon name="drive_file_move" label="Move to" _ref={anchorRef} onClick={toggleMoveToMenu} />
      )}

      <Icon name="more_vert" />

      {moveToMenuOpen && (
        <MoveToMenu
          anchorRef={anchorRef}
          labels={customLabels}
          onSelect={handleMenuItemClick}
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
          moveToSpam([...ids]);
          toggleSpamModal();
        }}
        onUnsubscribe={() => {
          moveToSpam([...ids]);
          toggleSpamModal();
        }}
      />
    </Box>
  );
};

export default BulkActions;
