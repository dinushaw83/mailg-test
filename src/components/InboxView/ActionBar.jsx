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
import { buildLabelPath } from "../../utils/labelSync";
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
  filled = false,
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
            fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0",
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

const MailActions = ({ thread, emails: providedEmails }) => {
  const navigate = useNavigate();
  const thread_id = thread.thread_id;
  const [state, dispatch] = useReducer(reducer, initialState);
  const { spamModalOpen, moveToMenuOpen, snoozeAnchorEl, showAdvancedMenu, labelAnchorEl, searchQuery, createOpen } =
    state;
  const [selectedLabelKeys, setSelectedLabelKeys] = useState(new Set());
  const { setSnackbar, emails: globalEmails, setEmails } = useGlobalContext();

  const { label: labelParam, folder } = useParams();
  const currentLabel = labelParam ? decodeURIComponent(labelParam) : null;

  const { labels, labelTree, labelIdToKeyMap } = useLabels();
  const [isMovingToLabel, setIsMovingToLabel] = useState(true);

  const location = useLocation();
  const hasRunOnceRef = useRef(false);

  // Get the base path by removing the thread_id from the current path
  const getBasePath = useCallback(() => {
    const pathParts = location.pathname.split("/");
    return pathParts.slice(0, -1).join("/") || "/inbox";
  }, [location.pathname]);

  const threadEmails = useMemo(() => {
    // Normalize thread_id to string for comparison
    const normalizedThreadId = String(thread?.thread_id ?? "").trim();

    // Collect emails from all available sources
    let fromProvided = [];
    let fromGlobal = [];
    let fromThread = [];

    if (providedEmails && Array.isArray(providedEmails) && providedEmails.length > 0) {
      // Filter by thread_id, using string comparison for consistency
      fromProvided = providedEmails.filter((email) => {
        const emailThreadId = String(email?.thread_id ?? "").trim();
        return emailThreadId === normalizedThreadId;
      });
      // If no matches, use all provided emails (they should all be for this thread)
      if (fromProvided.length === 0) {
        fromProvided = providedEmails;
      }
    }

    // Get emails from global context
    fromGlobal = globalEmails.filter((email) => {
      const emailThreadId = String(email?.thread_id ?? "").trim();
      return emailThreadId === normalizedThreadId;
    });

    // Get emails from thread.emails (from API when opening detail)
    if (thread.emails && Array.isArray(thread.emails)) {
      fromThread = thread.emails;
    }

    // Return the source with the most emails (thread.emails should have all)
    if (fromThread.length >= fromProvided.length && fromThread.length >= fromGlobal.length && fromThread.length > 0) {
      return fromThread;
    }
    if (fromProvided.length >= fromGlobal.length && fromProvided.length > 0) {
      return fromProvided;
    }
    if (fromGlobal.length > 0) {
      return fromGlobal;
    }

    return fromThread;
  }, [providedEmails, globalEmails, thread?.thread_id, thread?.emails]);
  useEffect(() => {
    hasRunOnceRef.current = false;
  }, [thread.thread_id]);

  const threadMessageIds = useMemo(() => threadEmails.map((email) => email.id), [threadEmails]);

  // Extract thread IDs from threadEmails for label operations
  // Include thread.thread_id as a fallback to ensure we always have at least one thread ID
  const threadIdsForLabels = useMemo(() => {
    const ids = [...new Set(threadEmails.map((email) => email.thread_id).filter(Boolean))];
    // If no thread IDs found from emails, use thread.thread_id as fallback
    if (ids.length === 0 && thread?.thread_id) {
      return [thread.thread_id];
    }
    return ids;
  }, [threadEmails, thread?.thread_id]);

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

  // Build menu items for Move to menu (same filter as "Label as")
  // Section 1: Labels that are NOT (is_system AND is_exclusive)
  // Section 2 (in MoveToMenu): Inbox, Spam, Trash
  const menuItems = useMemo(() => {
    const labelsObject = labels && typeof labels === "object" && !Array.isArray(labels) ? labels : {};
    return (
      Object.entries(labelsObject)
        // Same filter as "Label as" - hide labels that are both system AND exclusive
        .filter(([key, meta]) => !(meta.is_system && meta.is_exclusive))
        .map(([key, meta]) => ({
          id: key,
          name: buildLabelPath(key, meta, labelsObject, labelIdToKeyMap, getPathLabelFromKey),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }, [labels, labelIdToKeyMap]);

  const moveToMenuAnchorRef = useRef(null);
  const snoozeAnchorElRef = useRef(null);
  const labelAnchorElRef = useRef(null);
  const spamUndoEmailIdsRef = useRef(null);
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
    modifyLabels,
    setStar,
    setImportant,
    notSpam,
    deleteForever,
  } = useMailActions();

  // Check if viewing spam folder
  const isSpamFolder = folder === "spam";
  // Check if viewing trash folder
  const isTrashFolder = folder === "trash";

  // Check if the email/thread is marked as spam (has Spam label) - for showing spam-specific UI
  const isSpamEmail = useMemo(() => {
    if (!threadEmails || threadEmails.length === 0) return false;
    return threadEmails.some((email) => {
      const labels = email.labels || [];
      return labels.some((label) => {
        const labelName = typeof label === "string" ? label : label?.name;
        return labelName === "Spam";
      });
    });
  }, [threadEmails]);

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
                // Always call the backend API to properly undo the action
                if (isMoving) {
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
    [moveToLabel, moveToLabelFrom, removeLabels, setSnackbar, labels, navigate, getBasePath]
  );

  const handleDelete = useCallback(() => {
    if (!threadEmails.length) return;

    // Use only the first email ID (representative in list)
    // This ensures consistency when moving back from trash
    const mainEmailId = threadEmails[0]?.id;
    if (!mainEmailId) return;

    const emailIds = [mainEmailId];
    const threadIds = [thread?.thread_id].filter(Boolean);
    const undo = moveToTrash(emailIds);

    // Navigate back to the list
    navigate(getBasePath());

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
              moveToInbox(emailIds, { resolvedEmailIds: emailIds, resolvedThreadIds: threadIds });
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
  }, [threadEmails, thread?.thread_id, moveToTrash, moveToInbox, setSnackbar, navigate, getBasePath]);

  // Mark as read is now handled in InboxViewInner component
  // This useEffect was causing duplicate API calls
  // useEffect(() => {
  //   if (hasRunOnceRef.current) return;
  //   const unreadIds = threadEmails.filter((email) => !email.is_read).map((email) => email.id);
  //   if (unreadIds.length) {
  //     markRead(unreadIds, true);
  //   }
  //   hasRunOnceRef.current = true;
  // }, [threadEmails, markRead]);

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

        if (item.id === "__inbox__" || item.id.toLowerCase() === "inbox") {
          // Use ALL email IDs in the thread when moving to inbox
          const emailIds = threadEmails.map((email) => email.id);
          if (!emailIds.length) return;
          moveToInbox(emailIds, { resolvedEmailIds: emailIds });
          // Use folder name (capitalized) when in a folder context, otherwise use currentLabel
          const sourceLocation = folder ? folder.charAt(0).toUpperCase() + folder.slice(1) : currentLabel;
          showUndoSnackbar(conversationMatchKeys, sourceLocation, "Inbox", false, true, snapshot);
          navigate(getBasePath());
        } else if (item.id === "__spam__" || item.id === "spam") {
          toggleSpamModal();
          return;
        } else if (item.id === "__trash__" || item.id === "trash") {
          // Use only the first email ID for consistency
          const mainEmailId = threadEmails[0]?.id;
          if (!mainEmailId) return;
          const emailIds = [mainEmailId];
          const threadIds = [thread?.thread_id].filter(Boolean);
          const undo = moveToTrash(emailIds);
          navigate(getBasePath());
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
                    moveToInbox(emailIds, { resolvedEmailIds: emailIds, resolvedThreadIds: threadIds });
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

  const handleOnAfterCreate = (childName, parentKey, isMoving = true, createdLabelId = null) => {
    if (!conversationMatchKeys.length) return;

    try {
      const snapshot = conversationLabelSnapshot();
      const newKey = makeKey(childName, parentKey); // build composite key
      const curMeta = currentLabel ? labels?.[currentLabel] : null;
      const inCustomLabel = curMeta && curMeta.system === false;

      if (isMoving) {
        // Update local state
        if (inCustomLabel) {
          moveToLabelFrom(conversationMatchKeys, currentLabel, newKey);
        } else {
          moveToLabel(conversationMatchKeys, newKey);
        }
        // Sync with backend using createdLabelId
        if (createdLabelId) {
          const removeLabelsForBackend = inCustomLabel && currentLabel ? [currentLabel] : [];
          modifyLabels(
            conversationMatchKeys,
            { add: [createdLabelId], remove: removeLabelsForBackend },
            conversationMatchKeys
          );
        }
      } else {
        // Always additive when not moving
        // Use modifyLabels with the created label's UUID to sync with backend
        if (createdLabelId) {
          modifyLabels(conversationMatchKeys, { add: [createdLabelId], remove: [] }, conversationMatchKeys);
        } else {
          addLabels(conversationMatchKeys, [newKey]);
        }
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
      thread_id: email.thread_id,
      important: !!email.is_important,
    }));
    const threadIdsToUpdate = [
      ...new Set(
        previousStates
          .filter((state) => !state.important)
          .map((state) => state.thread_id)
          .filter(Boolean)
      ),
    ];

    if (!threadIdsToUpdate.length) {
      setSnackbar({
        open: true,
        message: "Conversation already marked as important.",
        autoHideDuration: 3000,
        action: null,
      });
      return;
    }

    setImportant(threadIdsToUpdate, true);
    setSnackbar({
      open: true,
      message: "Conversation marked as important.",
      autoHideDuration: 3000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            const toImportant = [
              ...new Set(
                previousStates
                  .filter((state) => state.important)
                  .map((state) => state.thread_id)
                  .filter(Boolean)
              ),
            ];
            const toNotImportant = [
              ...new Set(
                previousStates
                  .filter((state) => !state.important)
                  .map((state) => state.thread_id)
                  .filter(Boolean)
              ),
            ];
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
      thread_id: email.thread_id,
      important: !!email.is_important,
    }));
    const threadIdsToUpdate = [
      ...new Set(
        previousStates
          .filter((state) => state.important)
          .map((state) => state.thread_id)
          .filter(Boolean)
      ),
    ];

    if (!threadIdsToUpdate.length) {
      setSnackbar({
        open: true,
        message: "Conversation already marked as not important.",
        autoHideDuration: 3000,
        action: null,
      });
      return;
    }

    setImportant(threadIdsToUpdate, false);
    setSnackbar({
      open: true,
      message: "Conversation marked as not important.",
      autoHideDuration: 3000,
      action: (
        <Button
          sx={{ textTransform: "none" }}
          size="small"
          onClick={() => {
            const toImportant = [
              ...new Set(
                previousStates
                  .filter((state) => state.important)
                  .map((state) => state.thread_id)
                  .filter(Boolean)
              ),
            ];
            const toNotImportant = [
              ...new Set(
                previousStates
                  .filter((state) => !state.important)
                  .map((state) => state.thread_id)
                  .filter(Boolean)
              ),
            ];
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

    // Use only the main thread email ID (first email) for spam action
    const emailIds = [threadEmails[0]?.id].filter(Boolean);
    // Store email IDs in ref for undo action
    spamUndoEmailIdsRef.current = [...emailIds];

    moveToSpam(emailIds);
    toggleSpamModal();

    // Navigate back to the list
    navigate(getBasePath());

    // Create undo handler that captures notSpam
    const handleUndo = () => {
      const idsToUndo = spamUndoEmailIdsRef.current;
      if (idsToUndo && idsToUndo.length > 0) {
        notSpam(idsToUndo);
        setSnackbar({
          open: true,
          message: "Action undone.",
          autoHideDuration: 3000,
          action: null,
        });
      }
    };

    setSnackbar({
      open: true,
      message: "Conversation marked as spam.",
      autoHideDuration: 10000,
      action: (
        <Button sx={{ textTransform: "none" }} size="small" onClick={handleUndo}>
          Undo
        </Button>
      ),
    });
  }, [threadEmails, moveToSpam, notSpam, toggleSpamModal, setSnackbar, navigate, getBasePath]);

  // Handle "Not Spam" action - moves email back to inbox
  const handleNotSpam = useCallback(() => {
    if (!threadEmails.length) return;

    const emailIds = threadEmails.map((email) => email.id);
    notSpam(emailIds);

    // Navigate back to the list
    navigate(getBasePath());

    setSnackbar({
      open: true,
      message: "Conversation moved to Inbox.",
      autoHideDuration: 5000,
      action: null,
    });
  }, [threadEmails, notSpam, navigate, getBasePath, setSnackbar]);

  // Handle "Delete Forever" action - permanently deletes email
  const handleDeleteForever = useCallback(() => {
    if (!threadEmails.length) return;

    const emailIds = threadEmails.map((email) => email.id);
    deleteForever(emailIds);

    // Navigate back to the list
    navigate(getBasePath());

    setSnackbar({
      open: true,
      message: "Conversation deleted forever.",
      autoHideDuration: 5000,
      action: null,
    });
  }, [threadEmails, deleteForever, navigate, getBasePath, setSnackbar]);

  const handleSnooze = useCallback(
    (ids, snoozeUntil) => {
      // Pass thread.thread_id explicitly since we're on the detail page
      const { removedInboxIds = [] } = snooze(ids, snoozeUntil, [thread.thread_id]) || {};
      const undo = () => {
        unsnooze(ids, { removedInboxIds }, [thread.thread_id]);
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
      // Navigate back to the email list after snoozing
      navigate(getBasePath());
    },
    [snooze, unsnooze, setSnackbar, thread.thread_id, navigate, getBasePath]
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
        <Icon
          name="arrow_back"
          onClick={() => {
            // Needed to support going back to filters
            navigate(-1);
          }}
          style={{ marginRight: "20px" }}
          label="Back"
        />

        {isSpamEmail ? (
          <>
            <Button
              variant="text"
              onClick={handleDeleteForever}
              sx={{
                color: "#3c4043",
                textTransform: "none",
                fontSize: "14px",
                fontWeight: 500,
                padding: "6px 12px",
                minWidth: "auto",
                "&:hover": { backgroundColor: "rgba(60, 64, 67, 0.08)" },
              }}
            >
              Delete forever
            </Button>
            <Divider orientation="vertical" style={{ marginLeft: 4, marginRight: 4, height: 24 }} />
            <Button
              variant="text"
              onClick={handleNotSpam}
              sx={{
                color: "#3c4043",
                textTransform: "none",
                fontSize: "14px",
                fontWeight: 500,
                padding: "6px 12px",
                minWidth: "auto",
                "&:hover": { backgroundColor: "rgba(60, 64, 67, 0.08)" },
              }}
            >
              Not spam
            </Button>
            <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />
          </>
        ) : (
          <>
            <Icon name="archive" label="Archive" onClick={handleArchive} />
            <Icon name="report" label="Report spam" onClick={toggleSpamModal} />
            {!isThreadDeleted && !isTrashFolder && <Icon name="delete" label="Delete" onClick={handleDelete} />}
            <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />
          </>
        )}

        <>
          <Icon name="mark_email_unread" label="Mark as unread" onClick={handleMarkUnread} />
          <Icon
            name="schedule"
            label="Snooze"
            onClick={handleSnoozeAction}
            _ref={snoozeAnchorElRef}
            id="snooze-toolbar-icon"
          />
          {showAdvancedMenu && (
            <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />
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
          currentFolder={folder || "inbox"}
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
          threadEmails: threadEmails,
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

export default function ActionBar({ thread, emails }) {
  return (
    <ActionBarContainer>
      <ActionsContainer>
        <MailActions thread={thread} emails={emails} />
        <NavigationActions />
      </ActionsContainer>
      {/* <Divider /> */}
    </ActionBarContainer>
  );
}
