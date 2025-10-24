import React, { useState, useRef, useCallback, useMemo } from "react";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { Icon } from "../InboxView/ActionBar";
import Button from "@mui/material/Button";
import { useParams } from "react-router-dom";
import MoveToMenu from "./MoveToMenu";
import useLabels, { flattenTreeForSelect, getPathLabelFromKey, makeKey } from "../../hooks/useLabels";
import CreateLabelDialog from "../Labels/CreateLabelDialog";
import SpamOrUnsubModal from "./SpamOrUnsubModal";
import { Box } from "@mui/material";

export default function SpamActions({ threads = [], folder, visible }) {
  const { moveToSpam, moveToTrash, notSpam, markRead, deleteForever, moveToLabel, moveToLabelFrom, moveToInbox } =
    useMailActions();
  const { selection, setSnackbar, emails } = useGlobalContext();
  const { ids } = selection;
  const selectedIds = useMemo(() => [...ids], [ids]);
  const selectedThreads = useMemo(
    () => threads.filter((thread) => selectedIds.includes(thread.threadId.split(":")[1])),
    [threads, selectedIds]
  );

  // Check if any selected emails are not in inbox
  const hasEmailsNotInInbox = useMemo(() => {
    if (!selectedIds.length) return false;

    return selectedIds.some((id) => {
      const email = emails.find((email) => email.threadId.split(":")[1] === id);
      return email && (!email.labels || !email.labels.includes("Inbox"));
    });
  }, [selectedIds, emails]);

  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [spamModalOpen, setSpamModalOpen] = useState(false);
  const anchorRef = useRef(null);

  const { labels, labelTree } = useLabels();

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
  }, [labelTree, labels, folder]);

  const { label: labelParam } = useParams();
  const currentLabel = labelParam ? decodeURIComponent(labelParam) : null;

  const handleMenuItemClick = useCallback(
    async (item) => {
      if (item.id === "__create_label__") {
        setCreateOpen(true);
        return;
      }

      if (!selectedIds.length) return;

      try {
        if (item.id === "__inbox__" || item.id === "inbox") {
          moveToLabel(selectedIds, "Inbox");
        } else if (item.id === "__spam__" || item.id === "spam") {
          setSpamModalOpen(true);
          return;
        } else if (item.id === "__trash__" || item.id === "trash") {
          moveToTrash(selectedIds);
          // Show global snackbar with Undo action
          setSnackbar({
            open: true,
            message:
              selectedIds.length > 1
                ? `${selectedIds.length} conversations moved to Trash.`
                : "Conversation moved to Trash.",
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
        } else {
          // item.id is now the TARGET LABEL KEY
          const targetKey = item.id;
          const curMeta = currentLabel ? labels?.[currentLabel] : null;
          const inCustomLabel = curMeta && curMeta.system === false;
          if (inCustomLabel) {
            moveToLabelFrom(selectedIds, currentLabel, targetKey);
          } else {
            moveToLabel(selectedIds, targetKey); // pass key
          }
        }
        setOpen(false);
        selection.clear();
      } catch (e) {
        console.error("Move failed:", e);
      }
    },
    [selectedIds, moveToLabel, moveToLabelFrom, moveToTrash, moveToInbox, setSnackbar, currentLabel, labels]
  );

  const onDeleteForever = () => {
    const ids = [...selection.ids];
    if (!ids.length) return;

    try {
      deleteForever(ids);
      setSnackbar({
        open: true,
        message: ids.length > 1 ? `${ids.length} conversations deleted forever.` : "Conversation deleted forever.",
        autoHideDuration: 3000,
        action: null,
      });
      selection.clear();
    } catch (e) {
      console.error("Delete forever failed:", e);
    }
  };

  const hasUnreadEmails = useMemo(() => {
    return selectedThreads.some((thread) => !thread.read);
  }, [selectedThreads]);

  const handleReadAction = useCallback(() => {
    const isMarkingAsRead = hasUnreadEmails;

    if (isMarkingAsRead) {
      markRead(selectedIds, true); // Mark as read when there are unread emails
    } else {
      markRead(selectedIds, false); // Mark as unread when all are read
    }

    // Show snackbar with undo action
    setSnackbar({
      open: true,
      message: isMarkingAsRead
        ? selectedIds.length > 1
          ? `${selectedIds.length} conversations marked as read.`
          : "Conversation marked as read."
        : selectedIds.length > 1
        ? `${selectedIds.length} conversations marked as unread.`
        : "Conversation marked as unread.",
      autoHideDuration: 3000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            // Undo: toggle back to previous state
            markRead(selectedIds, !isMarkingAsRead);
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
  }, [hasUnreadEmails, selectedIds, markRead, setSnackbar]);

  const handleOnAfterCreate = (childName, parentKey) => {
    const ids = [...selection.ids];
    if (!ids.length) return;

    try {
      // Store original labels before the move
      const originalLabels = {};
      ids.forEach((id) => {
        const email = emails.find((email) => email.threadId.split(":")[1] === id);
        if (email) {
          originalLabels[id] = [...(email.labels || [])];
        }
      });

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
                // Restore original labels for each email
                setEmails((prevEmails) =>
                  prevEmails.map((email) => {
                    const emailThreadId = email.threadId.split(":")[1];
                    if (ids.includes(emailThreadId) && originalLabels[emailThreadId]) {
                      return { ...email, labels: originalLabels[emailThreadId] };
                    }
                    return email;
                  })
                );

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

  const showSpam = folder !== "spam";
  const showTrash = folder !== "trash";

  if (!visible) return null;

  return (
    <div className="G-tF" style={{ display: "flex", alignItems: "center" }}>
      {/* Delete forever button */}
      <Button
        sx={{
          textTransform: "none",
          color: "rgb(95,99,104)",
          "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
          marginLeft: "8px",
        }}
        onClick={onDeleteForever}
      >
        Delete forever
      </Button>

      {/* Not Spam button */}
      {folder === "spam" && (
        <Button
          sx={{
            textTransform: "none",
            color: "rgb(95,99,104)",
            "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
            marginLeft: "8px",
            marginRight: "8px",
          }}
          onClick={() => {
            const ids = [...selection.ids];
            moveToInbox(ids);
            selection.clear();
            setSnackbar({
              open: true,
              message: (
                <Box>
                  {ids.length > 1
                    ? `${ids.length} conversations unmarked as spam and moved to the inbox. Future messages from these`
                    : "Conversation unmarked as spam and moved to the inbox. Future messages from this"}{" "}
                  <br />
                  {ids.length > 1 ? "senders" : "sender"} will be sent to the inbox.
                </Box>
              ),
              autoHideDuration: 10000,
              action: (
                <Box>
                  <Button sx={{ textTransform: "none" }} size="small" onClick={() => {}}>
                    Learn more
                  </Button>
                  <Button
                    sx={{ textTransform: "none" }}
                    size="small"
                    onClick={() => {
                      moveToSpam(ids);
                      setSnackbar({
                        open: true,
                        message: "Action undone.",
                        autoHideDuration: 3000,
                      });
                    }}
                  >
                    Undo
                  </Button>
                </Box>
              ),
            });
          }}
        >
          Not Spam
        </Button>
      )}

      <Icon
        name={hasUnreadEmails ? "drafts" : "mark_email_unread"}
        label={hasUnreadEmails ? "Mark as read" : "Mark as unread"}
        onClick={handleReadAction}
      />

      <Icon name="drive_file_move" label="Move" onClick={() => setOpen((s) => !s)} _ref={anchorRef} />

      {open && (
        <MoveToMenu
          anchorRef={anchorRef}
          labels={menuItems}
          onSelect={handleMenuItemClick}
          onClose={() => setOpen(false)}
          showInbox={hasEmailsNotInInbox}
          showSpam={showSpam}
          showTrash={showTrash}
        />
      )}
      <CreateLabelDialog open={createOpen} onClose={() => setCreateOpen(false)} onAfterCreate={handleOnAfterCreate} />

      <SpamOrUnsubModal
        open={spamModalOpen}
        onClose={() => {
          setSpamModalOpen(false);
        }}
        onReportSpam={() => {
          moveToSpam(selectedIds);
          setSpamModalOpen(false);
        }}
        onUnsubscribe={() => {
          moveToSpam(selectedIds);
          setSpamModalOpen(false);
        }}
      />
    </div>
  );
}
