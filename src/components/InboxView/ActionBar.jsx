import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styled from "@emotion/styled";
import { useGlobalContext } from "../../contexts/GlobalContext";
import Tooltip from "@mui/material/Tooltip";
import useMailActions from "../../hooks/useMailActions";
import SpamOrUnsubModal from "../MailActions/SpamOrUnsubModal";
import MoveToMenu from "../MailActions/MoveToMenu";
import Button from "@mui/material/Button";
import { SnoozePopover } from "../MailActions/Snooze";
import MoreActions from "./MoreActions";
import { Labels } from "../MailActions/Labels";
import { getThreadRows } from "../../utils/emails";
import CreateLabelDialog from "../Labels/CreateLabelDialog";
import useLabels, { flattenTreeForSelect, getPathLabelFromKey, makeKey } from "../../hooks/useLabels";
import { useHotkeys } from "react-hotkeys-hook";

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

export const Icon = ({
  id,
  name,
  label,
  onClick,
  style,
  disabled,
  placement = "bottom",
  size = "small",
  color = "rgb(68, 68, 68)",
  width = 36,
  height = 36,
  fontSize = 20,
  _ref,
}) => {
  return (
    <Tooltip title={label} placement={placement}>
      <IconButton
        id={id}
        size={size}
        sx={{
          width,
          height,
          borderRadius: "50%",
          marginRight: "10px",
          ...style,
        }}
        onClick={onClick}
        disabled={disabled}
        ref={_ref}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize,
            color: disabled ? "#b8b8b8" : color,
          }}
        >
          {name}
        </span>
      </IconButton>
    </Tooltip>
  );
};

const reducer = (state, action) => {
  switch (action.type) {
    case "toggleSpamModal":
      return { ...state, spamModalOpen: !state.spamModalOpen };
    case "toggleMoveToMenu":
      return { ...state, moveToMenuOpen: !state.moveToMenuOpen };
    case "setSnoozeAnchorEl":
      return { ...state, snoozeAnchorEl: action.snoozeAnchorEl };
    case "clearSnoozeAnchorEl":
      return { ...state, snoozeAnchorEl: null };
    case "toggleShowAdvancedMenu":
      return { ...state, showAdvancedMenu: !state.showAdvancedMenu };
    case "showAdvancedMenu":
      return { ...state, showAdvancedMenu: true };
    case "hideAdvancedMenu":
      return { ...state, showAdvancedMenu: false };
    case "setLabelAnchorEl":
      return { ...state, labelAnchorEl: action.labelAnchorEl };
    case "clearLabelAnchorEl":
      return { ...state, labelAnchorEl: null };
    case "setSearchQuery":
      return { ...state, searchQuery: action.searchQuery };
    case "clearSearchQuery":
      return { ...state, searchQuery: "" };
    case "setSelectedLabelKeys":
      return { ...state, selectedLabelKeys: action.selectedLabelKeys };
    case "clearSelectedLabelKeys":
      return { ...state, selectedLabelKeys: new Set() };
    case "toggleCreateOpen":
      return { ...state, createOpen: !state.createOpen };
    case "closeMoveToMenu":
      return { ...state, moveToMenuOpen: false };
  }
};

const initialState = {
  spamModalOpen: false,
  moveToMenuOpen: false,
  snoozeAnchorEl: null,
  showAdvancedMenu: false,
  labelAnchorEl: null,
  searchQuery: "",
  selectedLabelKeys: new Set(),
  createOpen: false,
};

const useCustomHotKeys = ({
  goToInbox,
  handleStar,
  handleArchive,
  toggleSpamModal,
  toggleMoveToMenu,
  handleDelete,
  handleMarkUnread,
  handleSnoozeAction,
  openAdvancedMenu,
  handleMarkImportant,
  handleMarkUnimportant,
  handleLabelAction,
}) => {
  const { keyboardShortcuts } = useGlobalContext();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";

  useHotkeys(shortcutsOn ? "u" : "", () => {
    goToInbox();
  });

  useHotkeys(shortcutsOn ? "s" : "", () => {
    handleStar();
  });

  useHotkeys(shortcutsOn ? "e" : "", () => {
    handleArchive();
  });

  useHotkeys(shortcutsOn ? "Shift+1" : "", () => {
    toggleSpamModal();
  });

  useHotkeys(shortcutsOn ? "v" : "", () => {
    toggleMoveToMenu();
  });

  useHotkeys(shortcutsOn ? "l" : "", () => {
    handleLabelAction();
  });

  useHotkeys(shortcutsOn ? "Shift+3" : "", () => {
    handleDelete();
  });

  useHotkeys(shortcutsOn ? "Shift+u" : "", () => {
    handleMarkUnread();
  });

  useHotkeys(shortcutsOn ? "b" : "", () => {
    openAdvancedMenu();
    setTimeout(() => {
      handleSnoozeAction();
    }, 100);
  });

  useHotkeys(shortcutsOn ? "Equal, Shift+Equal" : "", () => {
    handleMarkImportant();
  });

  useHotkeys(shortcutsOn ? "Minus" : "", () => {
    handleMarkUnimportant();
  });
};

const MailActions = ({ thread }) => {
  const navigate = useNavigate();
  const thread_id = thread.thread_id;
  const [state, dispatch] = useReducer(reducer, initialState);
  const { spamModalOpen, moveToMenuOpen, snoozeAnchorEl, showAdvancedMenu, labelAnchorEl, searchQuery, createOpen } =
    state;
  const [selectedLabelKeys, setSelectedLabelKeys] = useState(new Set());
  const { setSnackbar, emails, setEmails } = useGlobalContext();

  const { label: labelParam } = useParams();
  const currentLabel = labelParam ? decodeURIComponent(labelParam) : null;

  const { labels, labelTree } = useLabels();
  const [isMovingToLabel, setIsMovingToLabel] = useState(true);

  const location = useLocation();
  const hasRunOnceRef = useRef(false);

  // Get the base path by removing the thread_id from the current path
  const getBasePath = useCallback(() => {
    const pathParts = location.pathname.split("/");
    return pathParts.slice(0, -1).join("/") || "/inbox";
  }, [location.pathname]);

  const threadEmails = useMemo(() => {
    // Try to get emails from the global context first
    const globalEmails = emails.filter((email) => email.thread_id === thread.thread_id);

    // If not found in global context, use the thread's emails array if available
    if (globalEmails.length === 0 && thread.emails && Array.isArray(thread.emails)) {
      return thread.emails;
    }

    return globalEmails;
  }, [emails, thread.thread_id, thread.emails]);
  useEffect(() => {
    hasRunOnceRef.current = false;
  }, [thread.thread_id]);

  const threadMessageIds = useMemo(() => threadEmails.map((email) => email.id), [threadEmails]);

  // Extract thread IDs from threadEmails for label operations
  const threadIdsForLabels = useMemo(() => {
    const ids = [...new Set(threadEmails.map((email) => email.thread_id).filter(Boolean))];
    return ids;
  }, [threadEmails]);

  const conversationMatchKeys = useMemo(() => {
    const keys = new Set();
    const add = (value) => {
      const v = String(value ?? "").trim();
      if (v) keys.add(v);
    };

    add(thread.thread_id);
    add(thread_id);
    add(thread.legacyThreadId);
    add(thread.legacyLastMessageId);
    add(thread.legacyLastNonDraftMessageId);

    threadEmails.forEach((email) => {
      buildMatchKeysForEmail(email).forEach((key) => keys.add(key));
    });

    return [...keys];
  }, [thread, threadEmails, thread_id]);
  const conversationLabelSnapshot = useCallback(
    () => new Map(threadEmails.map((email) => [String(email.id ?? ""), [...(email.labels || [])]])),
    [threadEmails]
  );

  // Check if the current thread is not in inbox
  const isThreadNotInInbox = useMemo(() => {
    return threadEmails.every((email) => !(email.labels || []).includes("Inbox"));
  }, [threadEmails]);

  // Check if the current thread is already deleted (in trash)
  const isThreadDeleted = useMemo(() => {
    return threadEmails.every((email) => (email.labels || []).includes("Trash"));
  }, [threadEmails]);

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

  const moveToMenuAnchorRef = useRef(null);
  const snoozeAnchorElRef = useRef(null);
  const labelAnchorElRef = useRef(null);
  const showSnoozePopover = Boolean(snoozeAnchorEl);

  const toggleSpamModal = useCallback(() => {
    dispatch({ type: "toggleSpamModal" });
  }, [dispatch]);

  const toggleMoveToMenu = useCallback(() => {
    dispatch({ type: "toggleMoveToMenu" });
  }, [dispatch]);

  const toggleCreateOpen = useCallback(() => {
    dispatch({ type: "toggleCreateOpen" });
  }, []);

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
    removeLabels,
    setStar,
    setImportant,
  } = useMailActions();

  const handleArchive = useCallback(() => {
    if (!threadEmails.length) return;

    const hasInboxLabel = threadEmails.some((email) => (email.labels || []).includes("Inbox"));
    if (!hasInboxLabel) {
      setSnackbar({
        open: true,
        message: "Conversation already archived.",
        autoHideDuration: 3000,
        action: null,
      });
      return;
    }

    const snapshot = conversationLabelSnapshot();
    const idsToArchive = threadEmails.map((email) => email.id);

    try {
      archive(idsToArchive);
      setSnackbar({
        open: true,
        message: "Conversation archived.",
        autoHideDuration: 3000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              setEmails((prev) =>
                prev.map((email) => {
                  const key = String(email.id ?? "");
                  return snapshot.has(key) ? { ...email, labels: snapshot.get(key) } : email;
                })
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
  }, [threadEmails, archive, setSnackbar, conversationLabelSnapshot, setEmails]);

  const handleStar = useCallback(() => {
    if (!threadEmails.length) return;

    const nextValue = !thread.is_starred;
    const previousStates = threadEmails.map((email) => ({
      id: email.id,
      starred: !!email.is_starred,
    }));
    const idsToUpdate = previousStates.filter((state) => state.starred !== nextValue).map((state) => state.id);

    if (!idsToUpdate.length) {
      setSnackbar({
        open: true,
        message: nextValue ? "Conversation already starred." : "Conversation already unstarred.",
        autoHideDuration: 3000,
        action: null,
      });
      return;
    }

    // Pass 'detail' context to indicate this is from email detail page
    setStar(idsToUpdate, nextValue, "detail");

    setSnackbar({
      open: true,
      message: nextValue ? "Conversation starred." : "Conversation unstarred.",
      autoHideDuration: 3000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            const toStar = previousStates.filter((state) => state.starred).map((state) => state.id);
            const toUnstar = previousStates.filter((state) => !state.starred).map((state) => state.id);
            if (toStar.length) setStar(toStar, true, "detail");
            if (toUnstar.length) setStar(toUnstar, false, "detail");
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
  }, [threadEmails, thread.is_starred, setStar, setSnackbar]);

  const showUndoSnackbar = useCallback(
    (matchKeys, fromKey, toKey, inCustomLabel, isMoving = true, snapshot = null) => {
      setSnackbar({
        open: true,
        message: `Conversation ${isMoving ? "moved to" : "added to"} “${getPathLabelFromKey(labels, toKey)}”.`,
        autoHideDuration: 10000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              try {
                if (snapshot && snapshot.size) {
                  setEmails((prev) =>
                    prev.map((email) => {
                      const key = String(email.id ?? "");
                      return snapshot.has(key) ? { ...email, labels: snapshot.get(key) } : email;
                    })
                  );
                } else if (isMoving) {
                  if (inCustomLabel) {
                    moveToLabelFrom(matchKeys, toKey, fromKey);
                  } else {
                    moveToLabel(matchKeys, fromKey || "Inbox");
                  }
                } else {
                  removeLabels(matchKeys, [toKey]);
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

      if (isMoving) {
        navigate(getBasePath());
      }
    },
    [moveToLabel, moveToLabelFrom, removeLabels, setSnackbar, labels, setEmails, navigate, getBasePath]
  );

  const handleDelete = useCallback(() => {
    if (!threadEmails.length) return;

    // Use actual email IDs instead of conversationMatchKeys
    const emailIds = threadEmails.map((email) => email.id);
    const undo = moveToTrash(emailIds);

    setSnackbar({
      open: true,
      message: "Conversation moved to Trash.",
      autoHideDuration: 10000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            if (typeof undo === "function") {
              undo();
            } else {
              moveToInbox(emailIds);
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
  }, [threadEmails, moveToTrash, moveToInbox, setSnackbar]);

  useEffect(() => {
    if (hasRunOnceRef.current) return;

    const unreadIds = threadEmails.filter((email) => !email.is_read).map((email) => email.id);
    if (unreadIds.length) {
      markRead(unreadIds, true);
    }
    hasRunOnceRef.current = true;
  }, [threadEmails, markRead]);

  const handleMarkUnread = useCallback(() => {
    if (!threadEmails.length) return;

    const previousStates = threadEmails.map((email) => ({
      id: email.id,
      read: !!email.is_read,
    }));
    const idsToUpdate = previousStates.filter((state) => state.read).map((state) => state.id);

    if (!idsToUpdate.length) {
      setSnackbar({
        open: true,
        message: "Conversation is already unread.",
        autoHideDuration: 3000,
        action: null,
      });
      return;
    }

    markRead(idsToUpdate, false);

    setSnackbar({
      open: true,
      message: "Conversation marked as unread.",
      autoHideDuration: 10000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            const idsToRestore = previousStates.filter((state) => state.read).map((state) => state.id);
            if (idsToRestore.length) {
              markRead(idsToRestore, true);
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
    navigate("/inbox");
  }, [threadEmails, markRead, setSnackbar, navigate]);

  const handleMenuItemClick = useCallback(
    async (item) => {
      if (item.id === "__create_label__") {
        toggleCreateOpen();
        return;
      }

      if (!conversationMatchKeys.length) {
        setSnackbar({
          open: true,
          message: "Conversation not available.",
          autoHideDuration: 3000,
          action: null,
        });
        return;
      }

      try {
        const snapshot = conversationLabelSnapshot();

        if (item.id === "__inbox__" || item.id === "inbox") {
          moveToLabel(conversationMatchKeys, "Inbox");
          showUndoSnackbar(conversationMatchKeys, currentLabel, "Inbox", false, true, snapshot);
        } else if (item.id === "__spam__" || item.id === "spam") {
          toggleSpamModal();
          return;
        } else if (item.id === "__trash__" || item.id === "trash") {
          const undo = moveToTrash(conversationMatchKeys);
          setSnackbar({
            open: true,
            message: "Conversation moved to Trash.",
            autoHideDuration: 10000,
            action: (
              <Button
                sx={{ textTransform: "none" }}
                size="small"
                onClick={() => {
                  if (typeof undo === "function") {
                    undo();
                  } else {
                    moveToInbox(conversationMatchKeys);
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
            moveToLabelFrom(conversationMatchKeys, currentLabel, targetKey);
          } else {
            moveToLabel(conversationMatchKeys, targetKey);
          }

          showUndoSnackbar(conversationMatchKeys, currentLabel, targetKey, inCustomLabel, isMovingToLabel, snapshot);

          if (isMovingToLabel) {
            navigate(getBasePath());
          }
        }
      } catch (e) {
        console.error("Move failed:", e);
      }
    },
    [
      conversationMatchKeys,
      conversationLabelSnapshot,
      moveToLabel,
      currentLabel,
      setSnackbar,
      toggleSpamModal,
      moveToTrash,
      moveToInbox,
      labels,
      moveToLabelFrom,
      isMovingToLabel,
      showUndoSnackbar,
      navigate,
      getBasePath,
      toggleCreateOpen,
      addLabels,
    ]
  );

  const handleSnoozeAction = useCallback(() => {
    dispatch({ type: "setSnoozeAnchorEl", snoozeAnchorEl: snoozeAnchorElRef.current });
  }, []);

  const handleSnoozeClose = useCallback(() => {
    dispatch({ type: "clearSnoozeAnchorEl" });
  }, []);

  const toggleShowAdvancedMenu = useCallback(() => {
    dispatch({ type: "toggleShowAdvancedMenu" });
  }, []);

  const openAdvancedMenu = useCallback(() => {
    dispatch({ type: "showAdvancedMenu" });
  }, []);

  const setSearchQuery = useCallback((searchQuery) => {
    dispatch({ type: "setSearchQuery", searchQuery });
  }, []);

  const setLabelAnchorEl = useCallback((labelAnchorEl) => {
    dispatch({ type: "setLabelAnchorEl", labelAnchorEl });
  }, []);

  const clearSelectedLabelKeys = useCallback(() => {
    dispatch({ type: "clearSelectedLabelKeys" });
  }, []);

  const handleLabelClose = useCallback(() => {
    dispatch({ type: "clearLabelAnchorEl" });
  }, []);

  const handleLabelAction = useCallback(() => {
    dispatch({ type: "setLabelAnchorEl", labelAnchorEl: labelAnchorElRef.current });
  }, []);

  const handleOnAfterCreate = (childName, parentKey, isMoving = true) => {
    if (!conversationMatchKeys.length) return;

    try {
      const snapshot = conversationLabelSnapshot();
      const newKey = makeKey(childName, parentKey); // build composite key
      const curMeta = currentLabel ? labels?.[currentLabel] : null;
      const inCustomLabel = curMeta && curMeta.system === false;

      if (isMoving) {
        if (inCustomLabel) {
          moveToLabelFrom(conversationMatchKeys, currentLabel, newKey);
        } else {
          moveToLabel(conversationMatchKeys, newKey);
        }
      } else {
        // Always additive when not moving
        addLabels(conversationMatchKeys, [newKey]);
      }

      showUndoSnackbar(conversationMatchKeys, currentLabel, newKey, inCustomLabel, isMoving, snapshot);

      if (isMoving) {
        // Navigate back to list view
        navigate(getBasePath());
      }
    } catch (e) {
      setSnackbar({
        open: true,
        message: "Could not move selected conversations.",
        autoHideDuration: 4000,
      });
    }
  };

  const handleMarkImportant = useCallback(() => {
    if (!threadEmails.length) return;

    const previousStates = threadEmails.map((email) => ({
      id: email.id,
      important: !!email.is_important,
    }));
    const idsToUpdate = previousStates.filter((state) => !state.important).map((state) => state.id);

    if (!idsToUpdate.length) {
      setSnackbar({
        open: true,
        message: "Conversation already marked as important.",
        autoHideDuration: 3000,
        action: null,
      });
      return;
    }

    setImportant(idsToUpdate, true);
    setSnackbar({
      open: true,
      message: "Conversation marked as important.",
      autoHideDuration: 3000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            const toImportant = previousStates.filter((state) => state.important).map((state) => state.id);
            const toNotImportant = previousStates.filter((state) => !state.important).map((state) => state.id);
            if (toImportant.length) setImportant(toImportant, true);
            if (toNotImportant.length) setImportant(toNotImportant, false);
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
  }, [threadEmails, setImportant, setSnackbar]);

  const handleMarkUnimportant = useCallback(() => {
    if (!threadEmails.length) return;

    const previousStates = threadEmails.map((email) => ({
      id: email.id,
      important: !!email.important,
    }));
    const idsToUpdate = previousStates.filter((state) => state.important).map((state) => state.id);

    if (!idsToUpdate.length) {
      setSnackbar({
        open: true,
        message: "Conversation already marked as not important.",
        autoHideDuration: 3000,
        action: null,
      });
      return;
    }

    setImportant(idsToUpdate, false);
    setSnackbar({
      open: true,
      message: "Conversation marked as not important.",
      autoHideDuration: 3000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            const toImportant = previousStates.filter((state) => state.important).map((state) => state.id);
            const toNotImportant = previousStates.filter((state) => !state.important).map((state) => state.id);
            if (toImportant.length) setImportant(toImportant, true);
            if (toNotImportant.length) setImportant(toNotImportant, false);
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
  }, [threadEmails, setImportant, setSnackbar]);

  useCustomHotKeys({
    goToInbox: () => navigate(getBasePath()),
    handleStar,
    handleArchive,
    toggleSpamModal,
    toggleMoveToMenu,
    handleDelete,
    handleMarkUnread,
    handleSnoozeAction,
    openAdvancedMenu,
    handleMarkImportant,
    handleMarkUnimportant,
    handleLabelAction,
  });

  const handleReportSpam = useCallback(() => {
    if (!threadEmails.length) {
      return;
    }

    // Use actual email IDs instead of conversationMatchKeys
    const emailIds = threadEmails.map((email) => email.id);
    const undo = moveToSpam(emailIds);
    toggleSpamModal();
    setSnackbar({
      open: true,
      message: "Conversation marked as spam.",
      autoHideDuration: 10000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            undo();
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
  }, [threadEmails, moveToSpam, toggleSpamModal, setSnackbar]);

  const handleSnooze = useCallback(
    (ids, snoozeUntil) => {
      const { removedInboxIds = [] } = snooze(ids, snoozeUntil) || {};
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
        message: "Conversation snoozed.",
        autoHideDuration: 10000,
        action: (
          <Button sx={{ textTransform: "none" }} size="small" onClick={undo}>
            Undo
          </Button>
        ),
      });
    },
    [snooze, unsnooze, setSnackbar]
  );

  return (
    <div
      className="iH bzn"
      style={{
        // cssFloat: "left",
        whiteSpace: "nowrap",
        display: "flex",
        // height: "20px",
        marginRight: "auto",
      }}
    >
      <div
        className="G-tF"
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          // background: "pink",
        }}
      >
        <Icon name="arrow_back" onClick={() => navigate(getBasePath())} style={{ marginRight: "20px" }} label="Back" />

        <>
          <Icon name="archive" label="Archive" onClick={handleArchive} />
          <Icon name="report" label="Report spam" onClick={toggleSpamModal} />
          {!isThreadDeleted && <Icon name="delete" label="Delete" onClick={handleDelete} />}
        </>

        <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />

        <>
          <Icon name="mark_email_unread" label="Mark as unread" onClick={handleMarkUnread} />
          {showAdvancedMenu && (
            <>
              <Icon
                name="schedule"
                label="Snooze"
                onClick={handleSnoozeAction}
                _ref={snoozeAnchorElRef}
                id="snooze-toolbar-icon"
              />
              <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />
            </>
          )}
          {/* The next icon does not exactly match */}
          <Icon name="drive_file_move" label="Move to" onClick={toggleMoveToMenu} _ref={moveToMenuAnchorRef} />
          <Icon name="label" label="Label as" onClick={handleLabelAction} _ref={labelAnchorElRef} />

          <MoreActions
            thread={thread}
            showAdvancedMenu={showAdvancedMenu}
            toggleShowAdvancedMenu={toggleShowAdvancedMenu}
          />
        </>
      </div>
      <SpamOrUnsubModal
        open={spamModalOpen}
        onClose={() => {
          toggleSpamModal();
        }}
        onReportSpam={handleReportSpam}
        onUnsubscribe={handleReportSpam}
      />
      {moveToMenuOpen && (
        <MoveToMenu
          anchorRef={moveToMenuAnchorRef}
          labels={menuItems}
          onSelect={handleMenuItemClick}
          onClose={() => toggleMoveToMenu()}
          showInbox={isThreadNotInInbox}
          showSpam={true}
          showTrash={true}
        />
      )}
      <SnoozePopover
        anchorEl={snoozeAnchorEl}
        open={showSnoozePopover}
        onClose={handleSnoozeClose}
        selectedIds={threadMessageIds}
        snooze={handleSnooze}
      />
      <Labels
        {...{
          searchQuery,
          setSearchQuery,
          setLabelAnchorEl,
          setSelectedLabelKeys,
          selectedLabelKeys,
          labelAnchorEl,
          selectedIds: threadMessageIds,
          threadIds: threadIdsForLabels,
          handleClose: handleLabelClose,
          // position below the icon
          anchorOrigin: { vertical: "bottom", horizontal: "left" },
          transformOrigin: { vertical: "top", horizontal: "left" },
          onOpenCreateLabelDialog: () => {
            setIsMovingToLabel(false);
            toggleCreateOpen();
          },
        }}
      />
      <CreateLabelDialog
        open={createOpen}
        onClose={() => {
          toggleCreateOpen();
          setIsMovingToLabel(true);
        }}
        onAfterCreate={handleOnAfterCreate}
        isMoving={isMovingToLabel}
      />
    </div>
  );
};

const EmailPositionContainer = styled.span`
  font-size: 0.75rem;
  color: #5e5e5e;
  white-space: nowrap;
`;

const EmailPosition = ({ currentItem, totalItems }) => {
  return (
    <EmailPositionContainer>
      <span className="ts" style={{ fontWeight: "inherit" }}>
        {currentItem}
      </span>{" "}
      of{" "}
      <span className="ts" style={{ fontWeight: "inherit" }}>
        {totalItems}
      </span>
    </EmailPositionContainer>
  );
};

const useNavigationHotKeys = ({ goBack, goForward, handleArchive }) => {
  const { keyboardShortcuts } = useGlobalContext();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";

  useHotkeys(shortcutsOn ? "j" : "", () => {
    goBack();
  });

  useHotkeys(shortcutsOn ? "k" : "", () => {
    goForward();
  });

  useHotkeys(shortcutsOn ? "Shift+BracketRight" : "", () => {
    handleArchive();
    goForward();
  });

  useHotkeys(shortcutsOn ? "Shift+BracketLeft" : "", () => {
    handleArchive();
    goBack();
  });
};

const NavigationActions = () => {
  const { thread_id, folder, label: labelParam } = useParams();
  const { emails } = useGlobalContext();
  const navigate = useNavigate();
  const location = useLocation();
  const { archive } = useMailActions();
  const { setSnackbar, setEmails } = useGlobalContext();

  const threadKey = useMemo(() => thread_id, [thread_id]);
  const threadEmails = useMemo(() => emails.filter((email) => email.thread_id === threadKey), [emails, threadKey]);
  const conversationLabelSnapshot = useCallback(
    () => new Map(threadEmails.map((email) => [String(email.id ?? ""), [...(email.labels || [])]])),
    [threadEmails]
  );

  // Get the base path by removing the thread_id from the current path
  const getBasePath = () => {
    const pathParts = location.pathname.split("/");
    // Remove the last part (thread_id) to get the base path
    return pathParts.slice(0, -1).join("/") || "/inbox";
  };

  // Get filtered threads based on current context (folder or label)
  const filteredThreads = useMemo(() => {
    const label = labelParam ? decodeURIComponent(labelParam) : null;
    const activeFolder = folder || "inbox";
    return getThreadRows(emails, { label, folder: activeFolder });
  }, [emails, folder, labelParam]);

  // Get thread IDs from filtered threads
  const filteredThreadIds = useMemo(() => {
    return filteredThreads.map((thread) => thread.thread_id);
  }, [filteredThreads]);

  // use thread position in filtered thread_ids array to determine if there is a previous or next thread
  const threadPosition = useMemo(() => {
    return filteredThreadIds.indexOf(thread_id);
  }, [filteredThreadIds, thread_id]);

  const hasPreviousThread = useMemo(() => {
    return threadPosition > 0;
  }, [threadPosition]);

  const hasNextThread = useMemo(() => {
    return threadPosition < filteredThreadIds.length - 1;
  }, [threadPosition, filteredThreadIds]);

  const previousThread = useMemo(() => {
    return filteredThreadIds[threadPosition - 1] || "";
  }, [filteredThreadIds, threadPosition]);

  const nextThread = useMemo(() => {
    return filteredThreadIds[threadPosition + 1] || "";
  }, [filteredThreadIds, threadPosition]);

  const currentItem = useMemo(() => {
    return threadPosition + 1;
  }, [threadPosition]);

  const totalItems = useMemo(() => {
    return filteredThreadIds.length;
  }, [filteredThreadIds]);

  const goBack = useCallback(() => {
    if (!hasPreviousThread) return;
    navigate(`${getBasePath()}/${previousThread}`);
  }, [navigate, getBasePath, previousThread]);

  const goForward = useCallback(() => {
    if (!hasNextThread) return;
    navigate(`${getBasePath()}/${nextThread}`);
  }, [navigate, getBasePath, nextThread]);

  const handleArchive = useCallback(() => {
    if (!threadEmails.length) return;

    const hasInbox = threadEmails.some((email) => (email.labels || []).includes("Inbox"));
    if (!hasInbox) return;

    const snapshot = conversationLabelSnapshot();
    const idsToArchive = threadEmails.map((email) => email.id);

    try {
      archive(idsToArchive);
      setSnackbar({
        open: true,
        message: "Conversation archived.",
        autoHideDuration: 3000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              setEmails((prev) =>
                prev.map((email) => {
                  const key = String(email.id ?? "");
                  return snapshot.has(key) ? { ...email, labels: snapshot.get(key) } : email;
                })
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
  }, [threadEmails, archive, setSnackbar, conversationLabelSnapshot, setEmails]);

  useNavigationHotKeys({ goBack, goForward, handleArchive });

  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
      }}
    >
      <EmailPosition currentItem={currentItem} totalItems={totalItems} />
      <div style={{ display: "flex", marginLeft: 10 }}>
        <Icon name="chevron_left" label="Newer" disabled={!hasPreviousThread} onClick={goBack} />
        <Icon name="chevron_right" label="Older" disabled={!hasNextThread} onClick={goForward} />
      </div>
    </div>
  );
};

const ActionBarContainer = styled.div`
  margin-bottom: 10px;
`;

const ActionsContainer = styled.div`
  border-bottom: 1px solid rgb(229, 229, 229);
  white-space: nowrap;
  position: relative;
  z-index: 3;
  border: none;
  padding: 0;
  align-items: center;
  display: flex;
  height: 48px;
  justify-content: space-between;
`;

export default function ActionBar({ thread }) {
  return (
    <ActionBarContainer>
      <ActionsContainer>
        <MailActions thread={thread} />
        <NavigationActions />
      </ActionsContainer>
      {/* <Divider /> */}
    </ActionBarContainer>
  );
}
