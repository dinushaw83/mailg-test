import React, { useCallback, useMemo, useRef, useState } from "react";
import useLabels, { flattenTreeForSelect, getPathLabelFromKey, makeKey } from "../../hooks/useLabels";

import { Box } from "@mui/material";
import Button from "@mui/material/Button";
import CreateLabelDialog from "../Labels/CreateLabelDialog";
import { Icon } from "../InboxView/ActionBar";
import MoveToMenu from "./MoveToMenu";
import SpamOrUnsubModal from "./SpamOrUnsubModal";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { useParams } from "react-router-dom";

const buildMatchKeysForEmail = (email = {}) => {
  const keys = [];
  const add = (value) => {
    const v = String(value ?? "").trim();
    if (v) keys.push(v);
  };

  add(email.id);
  add(email.messageId);
  add(email.thread_id);
  add(email.legacyThreadId);
  add(email.legacyLastMessageId);
  add(email.legacyLastNonDraftMessageId);

  return keys;
};

export default function SpamActions({ threads: _threads = [], folder, visible }) {
  const { moveToSpam, moveToTrash, notSpam, markRead, deleteForever, moveToLabel, moveToLabelFrom, moveToInbox } =
    useMailActions();
  const { selection, setSnackbar, emails, setEmails } = useGlobalContext();
  const { ids } = selection;
  const selectedIds = useMemo(() => [...ids], [ids]);
  const selectedEmails = useMemo(() => {
    if (!selectedIds.length) return [];
    const idSet = new Set(selectedIds.map(String));
    return emails.filter((email) => idSet.has(email.thread_id));
  }, [emails, selectedIds]);
  const selectionMatchKeys = useMemo(() => {
    const keys = new Set();
    selectedIds.forEach((id) => {
      const value = String(id ?? "").trim();
      if (value) keys.add(value);
    });
    selectedEmails.forEach((email) => {
      buildMatchKeysForEmail(email).forEach((key) => keys.add(key));
    });
    return [...keys];
  }, [selectedIds, selectedEmails]);
  const selectedConversationCount = useMemo(() => {
    const thread_ids = new Set(selectedEmails.map((email) => email.thread_id));
    return thread_ids.size || selectedIds.length;
  }, [selectedEmails, selectedIds]);

  const collectLabelSnapshot = useCallback(
    (matchKeys) => {
      if (!matchKeys?.length) return new Map();
      const targets = new Set(matchKeys.map((key) => String(key ?? "").trim()).filter((value) => value.length > 0));
      if (!targets.size) return new Map();

      const snapshot = new Map();
      emails.forEach((email) => {
        const keys = buildMatchKeysForEmail(email);
        if (keys.some((key) => targets.has(key))) {
          snapshot.set(email.id, [...(email.labels || [])]);
        }
      });
      return snapshot;
    },
    [emails]
  );

  const hasEmailsNotInInbox = useMemo(() => {
    if (!selectedEmails.length) return false;
    return selectedEmails.some((email) => !(email.labels || []).includes("Inbox"));
  }, [selectedEmails]);

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

  const showNoConversationsSelectedSnackbar = useCallback(() => {
    setSnackbar({
      open: true,
      message: "No conversations selected.",
      autoHideDuration: 3000,
    });
  }, [setSnackbar]);

  const showUndoSnackbarForLabelMove = useCallback(
    (matchKeys, fromKey, toKey, inCustomLabel, conversationCount, originalLabelsSnapshot) => {
      const count = conversationCount ?? matchKeys.length;
      const message =
        count > 1
          ? `${count} conversations moved to "${getPathLabelFromKey(labels, toKey)}".`
          : `Conversation moved to "${getPathLabelFromKey(labels, toKey)}".`;

      setSnackbar({
        open: true,
        message,
        autoHideDuration: 10000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              try {
                if (originalLabelsSnapshot && originalLabelsSnapshot.size) {
                  setEmails((prev) =>
                    prev.map((email) =>
                      originalLabelsSnapshot.has(email.id)
                        ? { ...email, labels: originalLabelsSnapshot.get(email.id) }
                        : email
                    )
                  );
                } else if (inCustomLabel) {
                  moveToLabelFrom(matchKeys, toKey, fromKey);
                } else {
                  moveToLabel(matchKeys, fromKey || "Inbox");
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
    },
    [labels, moveToLabelFrom, moveToLabel, setEmails, setSnackbar]
  );

  const handleMenuItemClick = useCallback(
    async (item) => {
      if (item.id === "__create_label__") {
        setCreateOpen(true);
        return;
      }

      if (!selectionMatchKeys.length) {
        showNoConversationsSelectedSnackbar();
        return;
      }

      try {
        const labelSnapshot = collectLabelSnapshot(selectionMatchKeys);

        if (item.id === "__inbox__" || item.id === "inbox") {
          moveToLabel(selectionMatchKeys, "Inbox");
          showUndoSnackbarForLabelMove(
            selectionMatchKeys,
            currentLabel,
            "Inbox",
            false,
            selectedConversationCount,
            labelSnapshot
          );
        } else if (item.id === "__spam__" || item.id === "spam") {
          setSpamModalOpen(true);
          return;
        } else if (item.id === "__trash__" || item.id === "trash") {
          const undo = moveToTrash(selectionMatchKeys);
          setSnackbar({
            open: true,
            message:
              selectedConversationCount > 1
                ? `${selectedConversationCount} conversations moved to Trash.`
                : "Conversation moved to Trash.",
            autoHideDuration: 10000,
            action: (
              <Button
                sx={{ textTransform: "none" }}
                size="small"
                onClick={() => {
                  if (typeof undo === "function") {
                    undo();
                  } else {
                    moveToInbox(selectionMatchKeys);
                  }
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
            moveToLabelFrom(selectionMatchKeys, currentLabel, targetKey);
          } else {
            moveToLabel(selectionMatchKeys, targetKey); // pass key
          }

          showUndoSnackbarForLabelMove(
            selectionMatchKeys,
            currentLabel,
            targetKey,
            inCustomLabel,
            selectedConversationCount,
            labelSnapshot
          );
        }
        setOpen(false);
      } catch (e) {
        console.error("Move failed:", e);
      }
    },
    [
      selectionMatchKeys,
      showNoConversationsSelectedSnackbar,
      collectLabelSnapshot,
      moveToLabel,
      currentLabel,
      selectedConversationCount,
      showUndoSnackbarForLabelMove,
      setSnackbar,
      moveToTrash,
      moveToInbox,
      moveToLabelFrom,
      labels,
    ]
  );

  const onDeleteForever = useCallback(() => {
    if (!selectionMatchKeys.length) {
      showNoConversationsSelectedSnackbar();
      return;
    }

    try {
      deleteForever(selectionMatchKeys);
      setSnackbar({
        open: true,
        message:
          selectedConversationCount > 1
            ? `${selectedConversationCount} conversations deleted forever.`
            : "Conversation deleted forever.",
        autoHideDuration: 3000,
        action: null,
      });
    } catch (e) {
      console.error("Delete forever failed:", e);
    }
  }, [selectionMatchKeys, showNoConversationsSelectedSnackbar, deleteForever, selectedConversationCount, setSnackbar]);

  const hasUnreadEmails = useMemo(() => {
    return selectedEmails.some((email) => !email.is_read);
  }, [selectedEmails]);

  const handleReadAction = useCallback(() => {
    if (!selectedEmails.length) {
      showNoConversationsSelectedSnackbar();
      return;
    }

    const previousStates = selectedEmails.map((email) => ({
      id: email.id,
      thread_id: email.thread_id,
      read: !!email.is_read,
    }));

    const unread = previousStates.filter((state) => !state.read);
    const read = previousStates.filter((state) => state.read);
    const isMarkingAsRead = unread.length > 0;
    const targetStates = isMarkingAsRead ? unread : read;
    const idsToUpdate = targetStates.map((state) => state.id);

    if (!idsToUpdate.length) {
      setSnackbar({
        open: true,
        message: isMarkingAsRead ? "Everything is already read." : "Everything is already unread.",
        autoHideDuration: 3000,
        action: null,
      });
      return;
    }

    markRead(idsToUpdate, isMarkingAsRead);

    const affectedConversations =
      new Set(targetStates.map((state) => state.thread_id)).size || selectedConversationCount || 1;

    setSnackbar({
      open: true,
      message: isMarkingAsRead
        ? affectedConversations > 1
          ? `${affectedConversations} conversations marked as read.`
          : "Conversation marked as read."
        : affectedConversations > 1
          ? `${affectedConversations} conversations marked as unread.`
          : "Conversation marked as unread.",
      autoHideDuration: 3000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            const toRead = previousStates.filter((state) => state.read).map((state) => state.id);
            const toUnread = previousStates.filter((state) => !state.read).map((state) => state.id);

            if (toRead.length) {
              markRead(toRead, true);
            }
            if (toUnread.length) {
              markRead(toUnread, false);
            }

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
  }, [
    selectedEmails,
    showNoConversationsSelectedSnackbar,
    markRead,
    selection,
    selectedConversationCount,
    setSnackbar,
  ]);

  const handleOnAfterCreate = (childName, parentKey) => {
    const ids = [...selection.ids];
    if (!ids.length) return;

    try {
      // Store original labels before the move
      const originalLabels = {};
      ids.forEach((id) => {
        const email = emails.find((email) => email.thread_id === id);
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
                    const emailThreadId = email.thread_id;
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
            if (!selectionMatchKeys.length) {
              showNoConversationsSelectedSnackbar();
              return;
            }

            moveToInbox(selectionMatchKeys);
            const conversationCount = selectedConversationCount || selectionMatchKeys.length || 1;
            setSnackbar({
              open: true,
              message: (
                <Box>
                  {conversationCount > 1
                    ? `${conversationCount} conversations unmarked as spam and moved to the inbox. Future messages from these`
                    : "Conversation unmarked as spam and moved to the inbox. Future messages from this"}{" "}
                  <br />
                  {conversationCount > 1 ? "senders" : "sender"} will be sent to the inbox.
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
                      moveToSpam(selectionMatchKeys);
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
          if (!selectionMatchKeys.length) {
            setSpamModalOpen(false);
            return;
          }

          moveToSpam(selectionMatchKeys);
          setSpamModalOpen(false);
          setSnackbar({
            open: true,
            message:
              selectedConversationCount > 1
                ? `${selectedConversationCount} conversations marked as spam.`
                : "Conversation marked as spam.",
            autoHideDuration: 10000,
          });
        }}
        onUnsubscribe={() => {
          if (!selectionMatchKeys.length) {
            setSpamModalOpen(false);
            return;
          }

          moveToSpam(selectionMatchKeys);
          setSpamModalOpen(false);
          setSnackbar({
            open: true,
            message:
              selectedConversationCount > 1
                ? `${selectedConversationCount} conversations marked as spam.`
                : "Conversation marked as spam.",
            autoHideDuration: 10000,
          });
        }}
      />
    </div>
  );
}
