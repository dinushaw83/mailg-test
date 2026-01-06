import Box from "@mui/material/Box";
import { Icon } from "../InboxView/ActionBar";
import React, { useCallback, useMemo, useRef, useState } from "react";
import Divider from "@mui/material/Divider";
import MoveToMenu from "./MoveToMenu";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { useParams, useLocation } from "react-router-dom";
import Button from "@mui/material/Button";
import SpamOrUnsubModal from "./SpamOrUnsubModal";

import { SnoozePopover } from "./Snooze";
import { Labels } from "./Labels";

import useLabels, {
  flattenTreeForSelect,
  getPathLabelFromKey,
  makeKey,
  normalizeLabelName,
} from "../../hooks/useLabels";
import CreateLabelDialog from "../Labels/CreateLabelDialog";
import { useHotkeys } from "react-hotkeys-hook";

const buildMatchKeysForEmail = (email = {}) => {
  const keys = [];
  const add = (value) => {
    const v = String(value ?? "").trim();
    if (v) keys.push(v);
  };

  add(email.id);
  add(email.messageId);
  add(email.threadId);
  if (email.threadId) {
    add(String(email.threadId).replace("#thread-f:", ""));
  }
  add(email.legacyThreadId);
  add(email.legacyLastMessageId);
  add(email.legacyLastNonDraftMessageId);

  return keys;
};

const useCustomHotKeys = ({ handleLabelAction, openMoveToMenu, handleReportSpam }) => {
  const { keyboardShortcuts } = useGlobalContext();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";
  const lastGAt = useRef(0);

  useHotkeys(shortcutsOn ? "g" : "", () => {
    lastGAt.current = Date.now();
  });

  useHotkeys(shortcutsOn ? "v" : "", () => {
    openMoveToMenu();
  });

  useHotkeys(shortcutsOn ? "l" : "", () => {
    if (Date.now() - lastGAt.current > 1000) {
      handleLabelAction();
    }
  });

  useHotkeys(shortcutsOn ? "Shift+1" : "", () => {
    handleReportSpam();
  });
};

const MailActions = ({ threads = [], showAdvancedMenu, visible }) => {
  const {
    moveToSpam,
    moveToTrash,
    moveToLabel,
    moveToLabelFrom,
    moveToInbox,
    archive,
    markRead,
    snooze,
    unsnooze,
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

  const location = useLocation();

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
  const selectedEmails = useMemo(() => {
    if (!selectedIds.length) return [];
    const idSet = new Set(selectedIds.map(String));
    return emails.filter((email) => idSet.has(email.threadId.split(":")[1]));
  }, [emails, selectedIds]);
  const selectedThreadIdSet = useMemo(() => new Set(selectedEmails.map((email) => email.threadId)), [selectedEmails]);
  const selectedConversationCount = useMemo(() => {
    const count = selectedThreadIdSet.size;
    return count || selectedIds.length;
  }, [selectedThreadIdSet, selectedIds]);
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

  // Get the base path by removing the threadId from the current path
  const getBasePath = () => {
    const pathParts = location.pathname.split("/");
    // Remove the last part (threadId) to get the base path
    return pathParts.slice(0, -1).join("/") || "/inbox";
  };

  // Check if any selected emails are not in inbox
  const hasEmailsNotInInbox = useMemo(() => {
    if (!selectedEmails.length) return false;
    return selectedEmails.some((email) => !(email.labels || []).includes("Inbox"));
  }, [selectedEmails]);

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

  const showNoConversationsSelectedSnackbar = useCallback(() => {
    setSnackbar({
      open: true,
      message: "No conversations selected.",
      autoHideDuration: 3000,
    });
  }, [setSnackbar]);

  const handleDeleteEmails = useCallback(() => {
    if (!selectedEmails.length) {
      showNoConversationsSelectedSnackbar();
      return;
    }

    const idsToUpdate = selectedEmails.map((email) => email.id);
    if (!idsToUpdate.length) {
      showNoConversationsSelectedSnackbar();
      return;
    }

    const undo = moveToTrash(idsToUpdate);
    const conversations = selectedConversationCount || 1;

    selection.clear();

    setSnackbar({
      open: true,
      message: conversations > 1 ? `${conversations} conversations moved to Trash.` : "Conversation moved to Trash.",
      autoHideDuration: 10000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            if (typeof undo === "function") {
              undo();
            } else {
              moveToInbox(idsToUpdate);
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
    moveToTrash,
    selectedConversationCount,
    selection,
    setSnackbar,
    showNoConversationsSelectedSnackbar,
    moveToInbox,
  ]);

  const shouldDisableArchiveButton = useMemo(() => {
    if (!selectedEmails.length) return true;
    return !selectedEmails.some((email) => (email.labels || []).includes("Inbox"));
  }, [selectedEmails]);

  const showUndoSnackbarForLabelMove = useCallback(
    (matchKeys, fromKey, toKey, inCustomLabel, conversationCount, originalLabelsSnapshot) => {
      const count = conversationCount ?? matchKeys.length;
      const action = isMovingToLabel ? "moved to" : "added to";
      const message =
        count > 1
          ? `${count} conversations ${action} "${getPathLabelFromKey(labels, toKey)}".`
          : `Conversation ${action} "${getPathLabelFromKey(labels, toKey)}".`;

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
              } catch (error) {
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
    [moveToLabel, moveToLabelFrom, setSnackbar, labels, isMovingToLabel, setEmails]
  );

  const handleArchiveEmails = useCallback(() => {
    if (!selectedEmails.length) {
      showNoConversationsSelectedSnackbar();
      return;
    }

    const emailsWithInbox = selectedEmails.filter((email) => (email.labels || []).includes("Inbox"));
    if (!emailsWithInbox.length) {
      setSnackbar({
        open: true,
        message: "Everything is already archived.",
        autoHideDuration: 3000,
        action: null,
      });
      return;
    }

    const originalLabels = new Map(emailsWithInbox.map((email) => [email.id, [...(email.labels || [])]]));
    const idsToArchive = [...originalLabels.keys()];

    const conversations = new Set(emailsWithInbox.map((email) => email.threadId)).size || 1;

    try {
      archive(idsToArchive);
      selection.clear();
      setSnackbar({
        open: true,
        message: conversations > 1 ? `${conversations} conversations archived.` : "Conversation archived.",
        autoHideDuration: 3000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              setEmails((prev) =>
                prev.map((email) =>
                  originalLabels.has(email.id) ? { ...email, labels: originalLabels.get(email.id) } : email
                )
              );
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
    } catch (e) {
      console.error("Archive failed:", e);
    }
  }, [selectedEmails, archive, selection, setSnackbar, setEmails, showNoConversationsSelectedSnackbar]);

  const toggleSpamModal = useCallback(() => {
    setState((prev) => ({
      ...prev,
      spamModalOpen: !prev.spamModalOpen,
    }));
  }, []);

  const handleReportSpam = useCallback(() => {
    if (!selectedIds.length) {
      showNoConversationsSelectedSnackbar();
      return;
    }
    toggleSpamModal();
  }, [selectedIds, showNoConversationsSelectedSnackbar, toggleSpamModal]);

  const onMoveArchivedMailToInbox = () => {
    const ids = [...selection.ids];
    if (!ids.length) return;
    try {
      moveToInbox(ids);
      setSnackbar({
        open: true,
        message: ids.length > 1 ? `${ids.length} conversations moved to Inbox.` : "Conversation moved to Inbox.",
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
          toggleSpamModal();
          return;
        } else if (item.id === "__trash__" || item.id === "trash") {
          const undo = moveToTrash(selectionMatchKeys);
          // Show global snackbar with Undo action
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
            moveToLabelFrom(selectionMatchKeys, currentLabel, targetKey);
            showUndoSnackbarForLabelMove(
              selectionMatchKeys,
              currentLabel,
              targetKey,
              inCustomLabel,
              selectedConversationCount,
              labelSnapshot
            );
          } else {
            moveToLabel(selectionMatchKeys, targetKey); // pass key
            showUndoSnackbarForLabelMove(
              selectionMatchKeys,
              currentLabel,
              targetKey,
              inCustomLabel,
              selectedConversationCount,
              labelSnapshot
            );
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
    [
      selectionMatchKeys,
      moveToLabel,
      moveToLabelFrom,
      moveToTrash,
      moveToInbox,
      setSnackbar,
      currentLabel,
      labels,
      selectedConversationCount,
      showUndoSnackbarForLabelMove,
      toggleSpamModal,
      selection,
      showNoConversationsSelectedSnackbar,
      collectLabelSnapshot,
    ]
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
        message:
          ids.length > 1
            ? `${ids.length} conversations moved to "${normalizeLabelName(newKey)}".`
            : `Conversation moved to "${normalizeLabelName(newKey)}".`,
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
        message:
          ids.length > 1
            ? `${ids.length} conversations added to "${normalizeLabelName(newKey)}".`
            : `Conversation added to "${normalizeLabelName(newKey)}".`,
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
    if (!selectedEmails.length) return false;
    return selectedEmails.every((email) => !(email.labels || []).includes("Inbox"));
  }, [selectedEmails]);

  const hasUnreadEmails = useMemo(() => {
    return selectedEmails.some((email) => !email.read);
  }, [selectedEmails]);

  const handleReadAction = useCallback(() => {
    if (!selectedEmails.length) {
      showNoConversationsSelectedSnackbar();
      return;
    }

    const previousStates = selectedEmails.map((email) => ({
      id: email.id,
      threadId: email.threadId,
      read: !!email.read,
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
    selection.clear();

    const affectedConversations =
      new Set(targetStates.map((state) => state.threadId)).size || selectedConversationCount || 1;

    setSnackbar({
      open: true,
      message: isMarkingAsRead
        ? affectedConversations > 1
          ? `${affectedConversations} conversations marked as read.`
          : "Conversation marked as read."
        : affectedConversations > 1
          ? `${affectedConversations} conversations marked as unread.`
          : "Conversation marked as unread.",
      autoHideDuration: 10000,
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
              autoHideDuration: 6000,
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
    setSnackbar,
    markRead,
    selection,
    selectedConversationCount,
    showNoConversationsSelectedSnackbar,
  ]);

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

  const openMoveToMenu = useCallback(() => {
    setState((prev) => ({
      ...prev,
      moveToMenuOpen: true,
    }));
  }, []);

  useCustomHotKeys({
    handleLabelAction,
    openMoveToMenu,
    handleReportSpam,
  });

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
      message: deletedEmails.length > 1 ? `${deletedEmails.length} drafts deleted` : "Draft deleted",
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
        message:
          selectedIds.length > 1
            ? `${selectedIds.length} conversations moved to inbox.`
            : "Conversation moved to inbox.",
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
    selection.clear();

    // Display snackbar with undo action
    setSnackbar({
      open: true,
      message:
        selectedIds.length > 1 ? `${selectedIds.length} conversations moved to inbox.` : "Conversation moved to inbox.",
      action: (
        <Button sx={{ textTransform: "none" }} size="medium" onClick={handleUndoMoveDraftsToInbox}>
          Undo
        </Button>
      ),
      autoHideDuration: 8000,
    });
  };

  const showUndoSnackbar = useCallback(
    (message, undoFn) => {
      setSnackbar({
        open: true,
        message,
        autoHideDuration: 10000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              undoFn();
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
    [setSnackbar]
  );

  const handleSnooze = useCallback(
    (ids, snoozeUntil) => {
      const { removedInboxIds = [] } = snooze(ids, snoozeUntil) || {};
      handleSnoozeClose();
      selection.clear();

      const message = ids.length > 1 ? `${ids.length} conversations snoozed` : "Conversation snoozed.";

      const undo = () => {
        unsnooze(ids, { removedInboxIds });
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
    [snooze, unsnooze, handleSnoozeClose, selection, setSnackbar]
  );

  if (!visible) return null;

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
        onClose={toggleSpamModal}
        onReportSpam={() => {
          const undo = moveToSpam(selectedIds);
          toggleSpamModal();
          selection.clear();
          showUndoSnackbar(
            selectedIds.length > 1
              ? `${selectedIds.length} conversations marked as spam.`
              : "Conversation marked as spam.",
            undo
          );
        }}
        onUnsubscribe={() => {
          moveToSpam(selectedIds);
          toggleSpamModal();
          selection.clear();
          showUndoSnackbar("We'll try to unsubscribe you from these emails.", () => {});
        }}
      />

      {showSnoozePopover && (
        <SnoozePopover
          anchorEl={snoozeAnchorEl}
          open={showSnoozePopover}
          onClose={handleSnoozeClose}
          selectedIds={selectedIds}
          snooze={handleSnooze}
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

      <CreateLabelDialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setIsMovingToLabel(null);
        }}
        onAfterCreate={handleOnAfterCreate}
        isMoving={isMovingToLabel}
      />
    </Box>
  );
};

export default MailActions;
