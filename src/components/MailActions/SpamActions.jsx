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

const LABELS = [
  { id: "notes", name: "Notes" },
  { id: "receipts", name: "Receipts" },
  { id: "work", name: "Work" },
  { id: "social", name: "Social" },
  { id: "updates", name: "Updates" },
  { id: "forums", name: "Forums" },
  { id: "promotions", name: "Promotions" },
];

export default function SpamActions({ threads = [], folder }) {
  const { moveToSpam, moveToTrash, notSpam, markRead, deleteForever, moveToLabel, moveToLabelFrom, moveToInbox } =
    useMailActions();
  const { selection, setSnackbar } = useGlobalContext();
  const { ids } = selection;
  const selectedIds = useMemo(() => [...ids], [ids]);
  const selectedThreads = useMemo(
    () => threads.filter((thread) => selectedIds.includes(thread.threadId.split(":")[1])),
    [threads, selectedIds]
  );

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
        message: "Conversation deleted forever.",
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
    if (hasUnreadEmails) {
      markRead(selectedIds, true); // Mark as read when there are unread emails
    } else {
      markRead(selectedIds, false); // Mark as unread when all are read
    }
  }, [hasUnreadEmails, selectedIds, markRead]);

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

  const showSpam = folder !== "spam";
  const showTrash = folder !== "trash";

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
            notSpam([...selection.ids]);
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
          showSpam={showSpam}
          showTrash={showTrash}
          showInbox
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
