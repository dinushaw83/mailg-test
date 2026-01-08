import { Link, useParams } from "react-router-dom";
import React, { useCallback, useId, useRef, useState } from "react";
import { isDocument, isPresentation, isSpreadsheet } from "../InboxView/Attachments";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CheckBox from "../ui/CheckBox";
import ContextMenu from "./ContextMenu";
import Icon from "../ui/Icon";
import IconButton from "@mui/material/IconButton";
import { SnoozePopover } from "../MailActions/Snooze";
import Typography from "@mui/material/Typography";
import { getEmbeddedImage } from "../../utils/embeddedImages";
import styled from "@emotion/styled";
import { useContextMenu } from "react-contexify";
import { useElementDimensions } from "../../hooks/useElementDimensions";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useHotkeys } from "react-hotkeys-hook";
import useMailActions from "../../hooks/useMailActions";

// Show by default, hide when .zA is hovered
const TimestampBox = styled(Box)`
  display: block;

  /* hide on hover or when row is active */
  .zA:hover &,
  .zA.active & {
    display: none;
  }
`;

const HoverDiv = styled.div`
  display: none;
  align-items: center;
  gap: 8px;

  .zA:hover &,
  .zA.active & {
    display: flex; /* use flex consistently */
  }
`;

export const getAttachmentIcon = (attachment, size = 16) => {
  const style = { width: size, height: size };
  const isYouTubeVideo = attachment.name.includes("youtube");
  const isVideo = (attachment.type && attachment.type.startsWith("video/")) || isYouTubeVideo;
  if (isVideo) {
    return <img src="/assets/images/icon_2_youtube_x16.png" alt="YouTube Video" style={style} />;
  }

  if (isDocument(attachment)) {
    return <img src="/assets/images/icon_1_document_x16.png" alt="DOC" style={style} />;
  }

  if (isSpreadsheet(attachment)) {
    return <img src="/assets/images/spreadsheet_icon.png" alt="DOC" style={style} />;
  }

  if (isPresentation(attachment)) {
    return <img src="/assets/images/icon_1_document_x16.png" alt="DOC" style={style} />;
  }

  const extension = attachment.name.split(".").pop();

  if (extension === "pdf") {
    return <img src="/assets/images/icon_3_pdf_x16.png" alt="PDF" style={style} />;
  }

  if (["jpg", "jpeg", "png", "gif", "bmp", "tiff", "ico", "webp"].includes(extension)) {
    return <img src="/assets/images/icon_1_image_x32.png" alt="Document" style={style} />;
  }

  return <img src="/assets/images/default-file-placeholder.png" alt="Document" style={style} />;
};

export const getEmbeddedImageIcon = (embeddedImage, size = 16) => {
  const style = { width: size, height: size };
  return <img src="/assets/images/icon_1_image_x32.png" alt="Image" style={style} />;
};

const OneColumnData = ({
  email,
  getAccessibilityText,
  getSenderClassName,
  index,
  formatDate,
  toggleStar,
  toggleImportant,
  density,
  height = "60px",
}) => {
  return (
    <td className="xY" style={{ width: "90%", height }}>
      <Box sx={{ width: "100%", overflow: "hidden" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <Box>
            <div id={`:pj${index}`} className="afn sf-hidden">
              {getAccessibilityText(email)}
            </div>
            <div id={`:po${index}`} className="yW">
              <span className="bA4">
                <span
                  translate="no"
                  className={getSenderClassName(email)}
                  data-email={email.from.email}
                  data-name={email.from.name}
                  data-hovercard-id={email.from.email}
                  style={email.labels.includes("Drafts") ? { color: "#dd4b39", fontWeight: 400 } : {}}
                >
                  {email.labels.includes("Drafts") ? "Draft" : email.from.name}
                </span>
              </span>
            </div>
          </Box>
          <Box>
            {(email.attachments.length > 0 || (email.embeddedImages && email.embeddedImages.length > 0)) && (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "18px", color: "rgb(95,99,104)", marginRight: "8px" }}
              >
                attachment
              </span>
            )}

            <span
              title={new Date(email.timestamp).toLocaleString()}
              id={`:pu${index}`}
              aria-label={new Date(email.timestamp).toLocaleString()}
              style={{
                fontSize: "0.75rem",
              }}
            >
              <span className={email.isEmailRead ? "" : "bq3"}>{formatDate(email.timestamp)}</span>
            </span>
          </Box>
        </Box>
        <Box>
          <div className="a4X">
            <div className="xT">
              <div className="y6">
                <span id={`:pr${index}`} className="bog">
                  <span
                    className={email.isEmailRead ? "" : "bqe"}
                    data-thread-id={email.threadId}
                    data-legacy-thread-id={email.legacyThreadId}
                    data-legacy-last-message-id={email.legacyLastMessageId}
                    data-legacy-last-non-draft-message-id={email.legacyLastNonDraftMessageId}
                  >
                    {email.subject}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box className="y2">
            <span id={`:ps${index}`}>{email.preview}</span>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <IconButton
              aria-label={email.is_important ? "Mark as not important" : "Mark as important"}
              aria-pressed={email.is_important}
              onClick={(e) => {
                e.stopPropagation();
                toggleImportant();
              }}
              sx={{
                color: email.is_important ? "#FBBC04" : "rgba(0,0,0,.54)",
                ...(density === "compact" ? { padding: "1px" } : {}),
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 18,
                  verticalAlign: "middle",
                  fontVariationSettings: `'FILL' ${email.is_important ? 1 : 0}`,
                }}
              >
                label_important
              </span>
            </IconButton>
            <IconButton
              aria-label={email.is_starred ? "Unstar" : "Star"}
              aria-pressed={email.is_starred}
              onClick={(e) => {
                e.stopPropagation();
                toggleStar();
              }}
              sx={{
                color: email.is_starred ? "#FBBC04" : "rgba(0,0,0,.54)",
                ...(density === "compact" ? { padding: "1px" } : {}),
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 18,
                  verticalAlign: "middle",
                  fontVariationSettings: `'FILL' ${email.is_starred ? 1 : 0}`,
                }}
              >
                star
              </span>
            </IconButton>
          </Box>
        </Box>
      </Box>
    </td>
  );
};

const useCustomHotKeys = ({
  focusedRowIndex,
  shortcutsOn,
  setFocusedRowIndex,
  emails,
  handleClickRow,
  selection,
  handleStar,
  handleArchive,
  handleMuteAction,
  handleDelete,
  bulkMarkRead,
  handleSnoozeAction,
  bulkMarkImportant,
}) => {
  const lastStarAt = useRef(0);
  const lastGAt = useRef(0);

  useHotkeys(shortcutsOn ? "shift+8" : "", () => {
    lastStarAt.current = Date.now();
  });

  useHotkeys(shortcutsOn ? "g" : "", () => {
    lastGAt.current = Date.now();
  });

  useHotkeys(shortcutsOn ? "ArrowDown" : "", () => {
    setFocusedRowIndex((prev) => {
      const nextIndex = prev === -1 ? 0 : Math.min(prev + +1, emails.length - 1);
      return nextIndex;
    });
  });

  useHotkeys(shortcutsOn ? "ArrowUp" : "", () => {
    setFocusedRowIndex((prev) => {
      const nextIndex = prev === -1 ? 0 : Math.max(prev - 1, 0);
      return nextIndex;
    });
  });

  useHotkeys(shortcutsOn ? "Enter" : "", () => {
    if (focusedRowIndex >= 0) {
      const threadId = emails[focusedRowIndex].threadId;
      handleClickRow(emails[focusedRowIndex], threadId);
    }
  });

  useHotkeys(shortcutsOn ? "x" : "", () => {
    if (focusedRowIndex >= 0) {
      const threadId = emails[focusedRowIndex].threadId;
      selection.toggle(threadId);
    }
  });

  useHotkeys(shortcutsOn ? "s" : "", () => {
    if (focusedRowIndex >= 0 && Date.now() - lastStarAt.current > 1000 && Date.now() - lastGAt.current > 1000) {
      const threadId = emails[focusedRowIndex].threadId;
      handleStar([threadId], emails[focusedRowIndex].is_starred);
    }
  });

  useHotkeys(shortcutsOn ? "e" : "", () => {
    const selectedIds = [...selection.ids];
    handleArchive(selectedIds);
    selection.clear();
  });

  useHotkeys(shortcutsOn ? "m" : "", () => {
    const selectedIds = selection.ids;
    handleMuteAction([...selectedIds]);
    selection.clear();
  });

  useHotkeys(shortcutsOn ? "Shift+3" : "", () => {
    const selectedIds = selection.ids;
    handleDelete([...selectedIds]);
    selection.clear();
  });

  useHotkeys(shortcutsOn ? "Shift+i" : "", () => {
    const selectedIds = [...selection.ids];
    bulkMarkRead(selectedIds, true);
    selection.clear();
  });

  useHotkeys(shortcutsOn ? "Equal, Shift+Equal" : "", () => {
    const selectedIds = selection.ids;
    bulkMarkImportant([...selectedIds], true);
    selection.clear();
  });

  useHotkeys(shortcutsOn ? "Minus" : "", () => {
    const selectedIds = [...selection.ids];
    bulkMarkImportant([...selectedIds], false);
    selection.clear();
  });

  useHotkeys(shortcutsOn ? "Shift+u" : "", () => {
    const selectedIds = [...selection.ids];
    bulkMarkRead(selectedIds, false);
    selection.clear();
  });

  useHotkeys(shortcutsOn ? "b" : "", () => {
    if (Date.now() - lastGAt.current > 1000) {
      const selectedIds = [...selection.ids];
      handleSnoozeAction(selectedIds);
    }
  });
};

const Table = ({
  emails,
  getRowClassName,
  navigateToEmailDetails,
  selection,
  toggleStar,
  toggleImportant,
  getImportantAriaLabel,
  getImportantClassName,
  getAccessibilityText,
  getSenderClassName,
  getLabelBadges,
  formatDate,
  setShowAdvancedMenu,
}) => {
  const uniqueMenuId = useId();
  const MENU_ID = `row-item-menu-${uniqueMenuId}`;

  const { setPreviewEmailId, panelState, density, setSnackbar, db, keyboardShortcuts } = useGlobalContext();
  const [ref, dimensions] = useElementDimensions();
  const { archive, moveToInbox, moveToTrash, markRead, snooze, toggleMuted, unsnooze, setImportant } = useMailActions();
  const snoozeAnchorElRef = useRef(null);
  const [contextRow, setContextRow] = useState(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState(() => {
    if (keyboardShortcuts === "shortcuts-on") {
      return 0;
    }
    return -1;
  });

  const [{ snoozeId, snoozeAnchorEl }, setState] = useState({
    snoozeId: null,
    snoozeAnchorEl: null,
  });

  const showSnoozePopover = Boolean(snoozeAnchorEl);

  const setSnoozeAnchorEl = useCallback((element) => {
    setState((prev) => ({
      ...prev,
      snoozeAnchorEl: element,
    }));
  }, []);

  const renderOneColumn =
    dimensions && typeof dimensions === "object" && "width" in dimensions && dimensions.width < 525;

  const showSplit = panelState.direction !== "no-split";

  const handleClickRow = (email, threadId) => {
    if (showSplit) {
      setPreviewEmailId(threadId);
    } else {
      navigateToEmailDetails(email, threadId);
    }
  };

  const showNoConversationsSelectedSnackbar = useCallback(() => {
    setSnackbar({
      open: true,
      message: "No conversations selected.",
      autoHideDuration: 3000,
    });
  }, []);

  const handleArchive = useCallback(
    (threadIds) => {
      if (!threadIds.length) {
        showNoConversationsSelectedSnackbar();
        return;
      }
      try {
        archive(threadIds);
        const message = threadIds.length > 1 ? `${threadIds.length} Conversations archived` : "Conversation archived.";
        setSnackbar({
          open: true,
          message,
          autoHideDuration: 3000,
          action: (
            <Button
              sx={{ textTransform: "none" }}
              size="small"
              onClick={() => {
                moveToInbox(threadIds);
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
    },
    [archive, setSnackbar]
  );

  const handleDelete = useCallback(
    (threadIds) => {
      if (!threadIds.length) {
        showNoConversationsSelectedSnackbar();
        return;
      }

      const undo = moveToTrash(threadIds);
      setSnackbar({
        open: true,
        message:
          threadIds.length > 1 ? `${threadIds.length} Conversations moved to Trash` : "Conversation moved to Trash.",
        autoHideDuration: 10000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              if (typeof undo === "function") {
                undo();
              } else {
                moveToInbox(threadIds);
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
    },
    [moveToTrash, setSnackbar, moveToInbox, showNoConversationsSelectedSnackbar]
  );

  const bulkMarkRead = useCallback(
    (threadIds, read = true) => {
      if (!threadIds.length) {
        showNoConversationsSelectedSnackbar();
        return;
      }
      markRead(threadIds, read);

      const markedAs = read ? "read" : "unread";

      const message =
        threadIds.size > 1
          ? `${threadIds.length} Conversations marked as ${markedAs}`
          : `Conversation marked as ${markedAs}.`;

      setSnackbar({
        open: true,
        message,
        autoHideDuration: 3000,
        action: (
          <Button
            size="small"
            onClick={() => {
              markRead(threadIds, !read);
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
    [markRead]
  );

  const handleImportant = useCallback(
    (ids, currentlyImportant) => {
      toggleImportant(ids, currentlyImportant);

      const message = currentlyImportant
        ? "Conversation marked as not important."
        : "Conversation marked as important.";

      setSnackbar({
        open: true,
        message,
        autoHideDuration: 10000,
        action: (
          <Button
            size="small"
            onClick={() => {
              toggleImportant(ids, !currentlyImportant); // Pass opposite state for undo
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
    [toggleImportant, setSnackbar]
  );

  const bulkMarkImportant = useCallback(
    (threadIds, important = true) => {
      if (!threadIds.length) {
        showNoConversationsSelectedSnackbar();
        return;
      }

      setImportant(threadIds, important);

      const markedAs = important ? "important" : "not important";

      const message =
        threadIds.length > 1
          ? `${threadIds.length} Conversations marked as ${markedAs}`
          : `Conversation marked as ${markedAs}.`;

      setSnackbar({
        open: true,
        message,
        autoHideDuration: 10000,
        action: (
          <Button
            size="small"
            onClick={() => {
              setImportant(threadIds, !important);
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
    [markRead]
  );

  const handleReadAction = useCallback(
    (email) => {
      const { isEmailRead } = email;
      const isMarkingAsRead = !isEmailRead;

      markRead([email.id], isMarkingAsRead);

      setSnackbar({
        open: true,
        message: isMarkingAsRead ? "Conversation marked as read." : "Conversation marked as unread.",
        autoHideDuration: 10000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              markRead([email.id], isEmailRead);
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
    },
    [markRead, setSnackbar]
  );

  const { show } = useContextMenu({
    id: MENU_ID,
  });

  function handleContextMenu(event, thread) {
    const threadId = thread.threadId;
    selection.setMany([threadId]);
    setContextRow(thread);
    show({
      event,
      props: {
        thread,
      },
    });
  }

  const handleSnoozeAction = useCallback((threadIds) => {
    if (!threadIds.length) {
      showNoConversationsSelectedSnackbar();
      return;
    }

    setShowAdvancedMenu(true);

    setTimeout(() => {
      const element = document.getElementById("snooze-toolbar-icon");

      if (element) {
        setSnoozeAnchorEl(element);
      }
    }, 200);
  }, []);

  const handleMuteAction = useCallback(
    (threadIds) => {
      if (!threadIds.length) {
        showNoConversationsSelectedSnackbar();
        return;
      }

      const undo = toggleMuted(threadIds);

      const message = threadIds.length > 1 ? `${threadIds.length} Conversations muted` : "Conversation muted.";

      setSnackbar({
        open: true,
        message,
        autoHideDuration: 3000,
        action: (
          <Button
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
    },
    [toggleMuted]
  );

  const handleSnooze = useCallback(
    (ids, snoozeUntil) => {
      const { removedInboxIds = [] } = snooze(ids, snoozeUntil) || {};
      selection.clear();
      const message = ids.size > 1 ? `${ids.size} Conversations snoozed` : "Conversation snoozed.";
      setSnackbar({
        open: true,
        message,
        autoHideDuration: 3000,
        // undo action
        action: (
          <Button
            size="small"
            onClick={() => {
              unsnooze(ids, { removedInboxIds });
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
    [snooze, selection, unsnooze, setSnackbar]
  );

  const handleStar = useCallback(
    (ids, isStarred) => {
      toggleStar(ids, isStarred);

      const message = !isStarred ? "Conversation starred." : "Conversation unstarred.";
      setSnackbar({
        open: true,
        message,
        autoHideDuration: 10000,
        action: (
          <Button
            size="small"
            onClick={() => {
              toggleStar(ids, !isStarred); // Pass opposite state for undo
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
    [toggleStar, setSnackbar]
  );

  const openInNewTab = async (e, attachment, db) => {
    e.stopPropagation();
    if (attachment.url.startsWith("/")) {
      window.open(attachment.url, "_blank");
    }
    const { file } = await db.get("attachments", attachment.id);
    window.open(URL.createObjectURL(file), "_blank");
  };

  const openEmbeddedImageInNewTab = async (e, embeddedImage, db) => {
    e.stopPropagation();
    try {
      const { url } = await getEmbeddedImage(db, embeddedImage.id);
      window.open(url, "_blank");
    } catch (error) {
      console.error("Failed to open embedded image:", error);
    }
  };

  const { folder, label } = useParams();

  const shortcutsOn = keyboardShortcuts === "shortcuts-on";
  useCustomHotKeys({
    focusedRowIndex,
    shortcutsOn,
    setFocusedRowIndex,
    emails,
    handleClickRow,
    selection,
    handleStar,
    handleArchive,
    handleMuteAction,
    handleDelete,
    bulkMarkRead,
    handleSnoozeAction,
    bulkMarkImportant,
  });

  console.log({ emails });
  return (
    <div style={{ flex: 1, height: "100%", overflowY: "auto" }}>
      <table
        cellPadding={0}
        id=":2x"
        className="F cf zt"
        role="grid"
        aria-readonly="true"
        style={{ width: "100%", height: "100%" }}
        ref={(element) => {
          if (ref) {
            if (typeof ref === "function") {
              ref(element);
            } else if (ref && typeof ref === "object" && "current" in ref) {
              ref.current = element;
            }
          }
        }}
        tabIndex={0}
      >
        <tbody>
          {emails.map((email, index) => {
            const threadId = email.threadId;
            const isActive = showSnoozePopover && snoozeId === email.id;
            const selected = selection.isSelected(threadId);

            const isFocused = focusedRowIndex === index;

            return (
              <tr
                key={threadId}
                className={getRowClassName(email, isActive)}
                id={`:pi${index}`}
                tabIndex={isFocused ? 0 : -1}
                role="row"
                aria-labelledby={`:pj${index}`}
                draggable="false"
                onClick={(e) => handleClickRow(email, threadId)}
                data-read={email.isEmailRead}
                style={{
                  ...(density === "compact"
                    ? {
                        padding: 2,
                      }
                    : {}),
                  ...(selected ? { backgroundColor: "#c2dbff" } : {}),
                  ...(isFocused
                    ? {
                        boxShadow:
                          "inset 1px 0 0 rgb(218, 220, 224), inset -1px 0 0 rgb(218, 220, 224), 0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)",
                        zIndex: 2,
                      }
                    : {}),
                }}
                onContextMenu={(e) => handleContextMenu(e, email)}
              >
                <td className="PF xY" />
                <td id={`:pk${index}`} className="oZ-x3 xY" data-tooltip="Select">
                  <CheckBox
                    id={`:pl${threadId}`}
                    labelledBy={`:pj${threadId}`}
                    checked={selection.isSelected(threadId)}
                    onChange={() => selection.toggle(threadId)}
                  />
                </td>
                {renderOneColumn ? (
                  <OneColumnData
                    email={email}
                    getAccessibilityText={getAccessibilityText}
                    getSenderClassName={getSenderClassName}
                    index={index}
                    formatDate={formatDate}
                    toggleStar={() => handleStar([email.id], email.is_starred)}
                    toggleImportant={() => toggleImportant([email.id], email.is_important)}
                    density={density}
                  />
                ) : (
                  <>
                    {/* Star */}
                    <td className={`apU ${email.is_starred ? "" : "xY"}`}>
                      <button
                        type="button"
                        aria-label={email.is_starred ? "Unstar" : "Star"}
                        aria-pressed={email.is_starred}
                        className="T-Jo"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStar([email.id], email.is_starred);
                        }}
                        style={{
                          background: "transparent",
                          border: 0,
                          padding: 0,
                          cursor: "pointer",
                          color: email.is_starred ? "#FBBC04" : "rgba(0,0,0,.54)",
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: 18,
                            verticalAlign: "middle",
                            fontVariationSettings: `'FILL' ${email.is_starred ? 1 : 0}`,
                          }}
                        >
                          star
                        </span>
                      </button>
                    </td>
                    {/* Important */}
                    <td className="WA xY">
                      <div
                        className="pG"
                        data-tooltip-contained="true"
                        data-tooltip-align="b,l"
                        data-tooltip-delay={1500}
                        aria-label={getImportantAriaLabel(email)}
                        role="switch"
                        aria-checked={email.is_important.toString()}
                        id={`:pn${index}`}
                        data-is-important={email.is_important.toString()}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImportant && handleImportant([email.id], email.is_important);
                        }}
                      >
                        <div className="T-ays-a45 sf-hidden">
                          {email.is_important && "Important according to Google magic."}
                        </div>
                        <div className={getImportantClassName(email)} />
                        <div className="bnj" />
                      </div>
                    </td>
                    {/* Sender */}
                    <td className="yX xY" role="gridcell" tabIndex={-1}>
                      <div id={`:pj${index}`} className="afn sf-hidden">
                        {getAccessibilityText(email)}
                      </div>
                      <div id={`:po${index}`} className="yW">
                        <span className="bA4">
                          <span
                            translate="no"
                            className={getSenderClassName(email)}
                            data-email={email.from.email}
                            data-name={email.from.name}
                            data-hovercard-id={email.from.email}
                          >
                            {folder === "sent" && !email.labels.includes("Drafts") ? `To: ${email.label}` : email.label}
                            {email.label && email.labels.includes("Drafts") && <span>, </span>}
                            <>
                              {email.labels.includes("Drafts") && (
                                <span style={{ color: "#dd4b39", fontWeight: 400 }}> Draft</span>
                              )}
                            </>
                            {email.messageCount > 1 && (
                              <span style={{ color: "rgb(95, 99, 104)", fontSize: "0.75rem", marginLeft: "4px" }}>
                                {" "}
                                {email.messageCount}
                              </span>
                            )}
                          </span>
                        </span>
                      </div>
                    </td>
                    {/* Subject */}
                    <td id={`:pp${index}`} tabIndex={-1} className="xY a4W" role="gridcell">
                      <div className="a4X">
                        <Link
                          to={`${location.pathname}/${threadId}`}
                          onClick={(e) => {
                            if (showSplit) {
                              e.preventDefault();
                              e.stopPropagation();
                              handleClickRow(email, threadId);
                            }
                          }}
                          className="xS"
                          role="link"
                          style={{ textDecoration: "none" }}
                        >
                          <div className="xT">
                            <div className="yi" id={`:pq${index}`}>
                              <div className="ar as">
                                <div
                                  className="at"
                                  title={email.labels[0]}
                                  style={{
                                    backgroundColor: email.labelColor,
                                    borderColor: email.labelColor,
                                  }}
                                >
                                  <div
                                    className="au"
                                    style={{
                                      borderColor: email.labelColor,
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="as sf-hidden">&nbsp;</div>
                            </div>
                            <div className="y6">
                              <span id={`:pr${index}`} className="bog">
                                {getLabelBadges(email).map((badge) => {
                                  // Handle color format: could be string, null, or object with rgb/text
                                  const bgColor = badge?.color?.rgb || badge?.color || "#e1e3e1";
                                  const textColor = badge?.color?.text || "#444746";

                                  return (
                                  <div
                                    key={`Badge-${badge.key}`}
                                    style={{
                                        backgroundColor: bgColor,
                                        color: textColor,
                                      fontSize: "0.75rem",
                                      padding: "0 4px",
                                      textDecoration: "none",
                                      width: "fit-content",
                                      borderRadius: "4px",
                                      marginRight: "6px",
                                      display: "inline-block",
                                    }}
                                  >
                                    {badge.displayName}
                                  </div>
                                  );
                                })}
                                <span
                                  className={email.isEmailRead ? "" : "bqe"}
                                  data-thread-id={email.threadId}
                                  data-legacy-thread-id={email.legacyThreadId}
                                  data-legacy-last-message-id={email.legacyLastMessageId}
                                  data-legacy-last-non-draft-message-id={email.legacyLastNonDraftMessageId}
                                  style={{ color: "#3f4042" }}
                                >
                                  {email.subject}
                                </span>
                              </span>
                            </div>
                            <span id={`:ps${index}`} className="y2">
                              <span className="Zt">&nbsp;-&nbsp;</span>
                              {email.preview}
                            </span>
                          </div>
                        </Link>
                      </div>
                      {density === "default" &&
                        (email.attachments.length > 0 || (email.embeddedImages && email.embeddedImages.length > 0)) && (
                          <div style={{ display: "flex", gap: "5px", marginTop: "5px", flexWrap: "wrap" }}>
                            {email.attachments.map((attachment) => (
                              <Button
                                key={`attachment-${attachment.id}`}
                                variant="outlined"
                                sx={{
                                  borderRadius: 10,
                                  color: "rgb(95, 99, 104)",
                                  textTransform: "none",
                                  maxWidth: "160px",
                                  border: "none",
                                  boxShadow: "inset 0 0 0 1px rgba(100,121,143,0.12)",
                                }}
                                size="small"
                                startIcon={getAttachmentIcon(attachment)}
                                onClick={(e) => openInNewTab(e, attachment, db)}
                              >
                                <Typography
                                  sx={{
                                    textOverflow: "ellipsis",
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {attachment.name}
                                </Typography>
                              </Button>
                            ))}
                            {email.embeddedImages &&
                              email.embeddedImages.map((embeddedImage) => (
                                <Button
                                  key={`embedded-${embeddedImage.id}`}
                                  variant="outlined"
                                  sx={{
                                    borderRadius: 10,
                                    color: "rgb(95, 99, 104)",
                                    textTransform: "none",
                                    maxWidth: "160px",
                                    border: "none",
                                    boxShadow: "inset 0 0 0 1px rgba(100,121,143,0.12)",
                                  }}
                                  size="small"
                                  startIcon={getEmbeddedImageIcon(embeddedImage)}
                                  onClick={(e) => openEmbeddedImageInNewTab(e, embeddedImage, db)}
                                >
                                  <Typography
                                    sx={{
                                      textOverflow: "ellipsis",
                                      overflow: "hidden",
                                      whiteSpace: "nowrap",
                                      fontSize: "0.875rem",
                                    }}
                                  >
                                    {embeddedImage.name}
                                  </Typography>
                                </Button>
                              ))}
                          </div>
                        )}
                    </td>
                    <td className="byZ xY sf-hidden" role="gridcell" tabIndex={-1} />
                    <td className="yf xY">&nbsp;</td>
                    <td className="xW xY" role="gridcell" tabIndex={-1}>
                      <TimestampBox>
                        <span
                          title={new Date(email.timestamp).toLocaleString()}
                          id={`:pu${index}`}
                          aria-label={new Date(email.timestamp).toLocaleString()}
                        >
                          <span className={email.isEmailRead ? "" : "bq3"}>{formatDate(email.timestamp)}</span>
                        </span>
                      </TimestampBox>
                      <HoverDiv>
                        <Icon
                          name="archive"
                          label="Archive"
                          marginRight="3px"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive([email.threadId]);
                          }}
                          style={{}}
                          disabled={false}
                          _ref={null}
                        />
                        <Icon
                          name="delete"
                          label="Delete"
                          marginRight="3px"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete([email.threadId]);
                          }}
                          style={{}}
                          disabled={false}
                          _ref={null}
                        />
                        <Icon
                          name="mark_email_unread"
                          label={email.isEmailRead ? `Mark as unread` : `Mark as read`}
                          marginRight="3px"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReadAction(email);
                          }}
                          style={{}}
                          disabled={false}
                          _ref={null}
                        />
                        <Icon
                          name="schedule"
                          label="Snooze"
                          marginRight="0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setState((prev) => ({
                              ...prev,
                              snoozeId: email.id,
                              snoozeAnchorEl: e.currentTarget,
                            }));
                          }}
                          style={{}}
                          disabled={false}
                          _ref={snoozeAnchorElRef}
                        />
                      </HoverDiv>
                    </td>
                    <td className="bq4 xY sf-hidden" />
                    <td className="xY" />
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {showSnoozePopover && (
        <SnoozePopover
          anchorEl={snoozeAnchorEl}
          open={showSnoozePopover}
          onClose={() => {
            setState((prev) => ({
              ...prev,
              snoozeAnchorEl: null,
              snoozeId: null,
            }));
          }}
          selectedIds={selection.ids}
          snooze={handleSnooze}
        />
      )}
      <ContextMenu
        menuId={MENU_ID}
        handleArchive={handleArchive}
        handleDelete={handleDelete}
        handleReadAction={handleReadAction}
        handleSnoozeAction={handleSnoozeAction}
        contextRow={contextRow}
        handleMuteAction={handleMuteAction}
        folder={folder}
        label={label}
      />
    </div>
  );
};

export default Table;
