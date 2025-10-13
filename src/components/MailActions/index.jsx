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

import useLabels, { flattenTreeForSelect, getPathLabelFromKey, makeKey, normalizeLabelName } from "../../hooks/useLabels";
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
    addLabels,
    deleteForever,
  } = useMailActions();
  const [{ moveToMenuOpen, spamModalOpen, createOpen, isMovingToLabel }, setState] = useState({
    moveToMenuOpen: false,
    spamModalOpen: false,
    createOpen: false,

    isMovingToLabel: false,
  });

  const snoozeAnchorElRef = useRef(null);
  const [snoozeAnchorEl, setSnoozeAnchorEl] = useState(null);
  const showSnoozePopover = Boolean(snoozeAnchorEl);

  const anchorRef = useRef(null);

  const { emails, selection, setSnackbar, setEmails, setComposeWindows } = useGlobalContext();
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

  const setIsMovingToLabel = useCallback(
    (val) =>
      setState((prev) => ({
        ...prev,
        isMovingToLabel: val,
      })),
    []
  );

  const selectedIds = useMemo(() => [...ids], [ids]);
  const selectedThreads = useMemo(
    () => threads.filter((email) => selectedIds.includes(email.threadId.split(":")[1])),
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

  const labelAnchorElRef = useRef(null);
  const [labelAnchorEl, setLabelAnchorEl] = useState(null);

  const { label: labelParam, folder } = useParams();
  const currentLabel = labelParam ? decodeURIComponent(labelParam) : null;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLabelKeys, setSelectedLabelKeys] = useState(new Set());
  const lastActionIds = useRef([]);

  const inSpam = folder === "spam";
  const inAllMail = folder === "all";
  const inTrash = folder === "trash";
  const inDrafts = folder === "drafts";

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

  const shouldDisableArchiveButton = useMemo(() => {
    // No selection → disable
    if (!selectedIds.length) return true;

    // Normalize selected ids (can be message id, '#thread-f:...' or bare thread key)
    const targets = new Set(selectedIds.map((id) => String(id).trim()));

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
  }, [threads, selectedIds]);

  const showUndoSnackbarForLabelMove = useCallback(
    (selectedIds, fromKey, toKey, inCustomLabel) => {
      setSnackbar({
        open: true,
        message: `Conversation moved to “${getPathLabelFromKey(labels, toKey)}”.`,
        autoHideDuration: 10000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              if (inCustomLabel) {
                moveToLabelFrom(selectedIds, toKey, fromKey);
              } else {
                moveToLabel(selectedIds, fromKey || "Inbox");
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
    },
    [moveToLabel, moveToLabelFrom, setSnackbar, labels]
  );

  const handleArchiveEmails = useCallback(() => {
    if (!selectedIds.length) return;
    try {
      archive(selectedIds);
      setSnackbar({
        open: true,
        message: "Conversation archived.",
        autoHideDuration: 3000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              moveToInbox(selectedIds);
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
  }, [selectedIds, archive, selection, setSnackbar]);

  const toggleSpamModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      spamModalOpen: !prev.spamModalOpen,
    }));
  }, []);

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

  const handleMenuItemClick = useCallback(
    async (item) => {
      if (item.id === "__create_label__") {
        setCreateOpen(true);
        setIsMovingToLabel(true);
        return;
      }

      if (!selectedIds.length) return;

      try {
        if (item.id === "__inbox__" || item.id === "inbox") {
          moveToLabel(selectedIds, "Inbox");
        } else if (item.id === "__spam__" || item.id === "spam") {
          toggleSpamModal();
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
            showUndoSnackbarForLabelMove(selectedIds, currentLabel, targetKey, inCustomLabel);
          } else {
            moveToLabel(selectedIds, targetKey); // pass key
            showUndoSnackbarForLabelMove(selectedIds, currentLabel, targetKey, inCustomLabel);
          }
        }
        setState((prev) => ({
          ...prev,
          moveToMenuOpen: false,
        }));
        selection.clear();
      } catch (e) {
        console.error("Move failed:", e);
      }
    },
    [selectedIds, moveToLabel, moveToLabelFrom, moveToTrash, moveToInbox, setSnackbar, currentLabel, labels]
  );
  
  const handleOnAfterCreate = (childName, parentKey) => {
    const ids = [...selection.ids];
    if (!ids.length) return;

    if (!isMovingToLabel) {
      handleOnAfterLabelCreate(childName, parentKey);
      return;
    }

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
        message: `Conversation moved to "${normalizeLabelName(newKey)}".`,
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

  const handleOnAfterLabelCreate = (childName, parentKey) => {
    const ids = [...selection.ids];
    if (!ids.length) return;

    try {
      const newKey = makeKey(childName, parentKey);

      addLabels(ids, [newKey]);

      selection.clear();

      // --- UNDO action ---
      setSnackbar({
        open: true,
        message: `Conversation added to "${normalizeLabelName(newKey)}".`,
        autoHideDuration: 4000,
        action: (
          <Button
            sx={{ textTransform: "capitalize" }}
            size="small"
            onClick={() => {
              try {
                // Remove the label from the selected emails
                removeLabels(ids, [newKey]);

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

  // Handle discard drafts
  const handleDiscardDrafts = () => {
    if (!selectedIds.length) return;

    // Store the email objects that are being deleted
    const deletedEmails = [];

    // Filter out selected draft emails
    setEmails((prevEmails) =>
      prevEmails.filter((email) => {
        // Only filter out emails that have "Drafts" label and are selected
        if (!email.labels || !["Drafts"].some((label) => email.labels.includes(label))) {
          return true;
        }

        const emailThreadId = email.threadId.split(":")[1];

        if (selectedIds.includes(emailThreadId)) {
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
  const handleUndoMoveDraftsToInbox = () => {
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

  // Handle move drafts to inbox
  const handleMoveDraftsToInbox = () => {
    const selectedIds = [...selection.ids];

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
        <Button sx={{ textTransform: "none" }} size="medium" onClick={handleUndoMoveDraftsToInbox}>
          Undo
        </Button>
      ),
      autoHideDuration: 8000,
    });
  };

  return (
    <Box display="flex" alignItems="center">
      {inDrafts && (
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
      )}

      <Icon
        name="archive"
        label="Archive"
        onClick={handleArchiveEmails}
        disabled={allAreArchived || shouldDisableArchiveButton || folder === "all" || folder === "trash"}
      />
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
          <Icon
            id="snooze-toolbar-icon"
            name="schedule"
            label="Snooze"
            onClick={handleSnoozeAction}
            _ref={snoozeAnchorElRef}
          />
          <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />
        </>
      )}
      {!["all", "drafts"].includes(folder) && (
        <Icon name="drive_file_move" label="Move to" _ref={anchorRef} onClick={toggleMoveToMenu} />
      )}
      {["all", "drafts"].includes(folder) && (
        <Icon
          name="move_to_inbox"
          label="Move to Inbox"
          onClick={folder === "all" ? onMoveArchivedMailToInbox : handleMoveDraftsToInbox}
        />
      )}

      <Icon name="label" label="Label as" onClick={handleLabelAction} _ref={labelAnchorElRef} />

      {moveToMenuOpen && (
        <MoveToMenu
          anchorRef={anchorRef}
          labels={menuItems}
          onSelect={handleMenuItemClick}
          onClose={() =>
            setState((prev) => ({
              ...prev,
              moveToMenuOpen: false,
            }))
          }
          showInbox={hasEmailsNotInInbox}
          showSpam={true}
          showTrash={true}
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
          onOpenCreateLabelDialog: () => {
            setCreateOpen(true);
            setIsMovingToLabel(false);
          },
        }}
      />

      <CreateLabelDialog open={createOpen} onClose={() => { setCreateOpen(false); setIsMovingToLabel(null) }} onAfterCreate={handleOnAfterCreate} />
    </Box>
  );
};

export default MailActions;
