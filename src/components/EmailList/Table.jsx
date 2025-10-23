import React, { useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { useContextMenu } from "react-contexify";

import CheckBox from "../ui/CheckBox";
import { useGlobalContext } from "../../contexts/GlobalContext";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { useElementDimensions } from "../../hooks/useElementDimensions";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import styled from "@emotion/styled";
import Icon from "../ui/Icon";
import useMailActions from "../../hooks/useMailActions";
import { SnoozePopover } from "../MailActions/Snooze";
import ContextMenu from "./ContextMenu";
import { isDocument, isSpreadsheet, isPresentation } from "../InboxView/Attachments";
import { getEmbeddedImage } from "../../utils/embeddedImages";

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
  density,
  height = "60px",
  getDisplayAddress,
}) => {
  const display = getDisplayAddress ? getDisplayAddress(email) : { name: email.from.name, email: email.from.email };
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
                  email={display.email}
                  name={display.name}
                  data-hovercard-id={display.email}
                  style={email.labels.includes("Drafts") ? { color: "#dd4b39", fontWeight: 400 } : {}}
                >
                  {email.labels.includes("Drafts") ? "Draft" : display.name}
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
              <span className={email.read ? "" : "bq3"}>{formatDate(email.timestamp)}</span>
            </span>
          </Box>
        </Box>
        <Box>
          <div className="a4X">
            <div className="xT">
              <div className="y6">
                <span id={`:pr${index}`} className="bog">
                  <span
                    className={email.read ? "" : "bqe"}
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
          <IconButton
            aria-label={email.starred ? "Unstar" : "Star"}
            aria-pressed={email.starred}
            onClick={(e) => {
              e.stopPropagation();
              toggleStar([email.id]);
            }}
            sx={{
              color: email.starred ? "#FBBC04" : "rgba(0,0,0,.54)",
              ...(density === "compact" ? { padding: "1px" } : {}),
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 18,
                verticalAlign: "middle",
                fontVariationSettings: `'FILL' ${email.starred ? 1 : 0}`,
              }}
            >
              star
            </span>
          </IconButton>
        </Box>
      </Box>
    </td>
  );
};

const MENU_ID = "row-item-menu";

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
  const { setPreviewEmailId, panelState, density, setSnackbar, setEmails, db } = useGlobalContext();
  const [ref, dimensions] = useElementDimensions();
  const { archive, moveToInbox, moveToTrash, markRead, snooze, toggleMuted, unsnooze } = useMailActions();
  const snoozeAnchorElRef = useRef(null);
  const [contextRow, setContextRow] = useState(null);

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

  const renderOneColumn = dimensions.width < 525;

  const handleClickRow = (email, threadId) => {
    if (panelState.showPanel) {
      setPreviewEmailId(threadId);
    } else {
      navigateToEmailDetails(email, threadId);
    }
  };

  const handleArchive = useCallback(
    (threadId) => {
      try {
        archive([threadId]);
        setSnackbar({
          open: true,
          message: "Conversation archived.",
          autoHideDuration: 3000,
          action: (
            <Button
              sx={{ textTransform: "none" }}
              size="small"
              onClick={() => {
                moveToInbox([threadId]);
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
    (threadId) => {
      moveToTrash([threadId]);
      setSnackbar({
        open: true,
        message: "Conversation moved to Trash.",
        autoHideDuration: 10000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              moveToInbox([threadId]);
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
    [moveToTrash, setSnackbar]
  );

  const handleReadAction = useCallback(
    (email) => {
      const { read } = email;

      markRead([email.id], !read);

      setSnackbar({
        open: true,
        message: "Conversation marked as read.",
        autoHideDuration: 3000,
        action: (
          <Button
            size="small"
            onClick={() => {
              markRead([email.id], read);
            }}
          >
            Undo
          </Button>
        ),
      });
    },
    [markRead]
  );

  const { show } = useContextMenu({
    id: MENU_ID,
  });

  function handleContextMenu(event, thread) {
    const threadId = thread.threadId.split(":")[1];
    selection.setMany([threadId]);
    setContextRow(thread);
    show({
      event,
      props: {
        thread,
      },
    });
  }

  const handleSnoozeAction = useCallback((threadId) => {
    setShowAdvancedMenu(true);

    setTimeout(() => {
      const element = document.getElementById("snooze-toolbar-icon");

      if (element) {
        setSnoozeAnchorEl(element);
      }
    }, 200);
  }, []);

  const handleMuteAction = useCallback(
    (threadId, muted) => {
      toggleMuted(threadId);

      setSnackbar({
        open: true,
        message: `Conversation ${muted ? "unmuted" : "muted"}.`,
        autoHideDuration: 3000,
        action: (
          <Button
            size="small"
            onClick={() => {
              toggleMuted(threadId);
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
      snooze(ids, snoozeUntil);
      setSnackbar({
        open: true,
        message: "Conversation snoozed.",
        autoHideDuration: 3000,
        // undo action
        action: (
          <Button
            size="small"
            onClick={() => {
              unsnooze(ids);
            }}
          >
            Undo
          </Button>
        ),
      });
    },
    [snooze]
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

  const getDisplayAddress = (email) => {
    const isSentView = (folder || "").toLowerCase() === "sent" || (email.labels || []).includes("Sent");
    if (isSentView && Array.isArray(email.to) && email.to.length > 0) {
      return { name: email.to[0], email: email.to[0] };
    }
    return { name: email.from.name, email: email.from.email };
  };

  return (
    <div style={{ flex: 1, height: "100%", overflowY: "auto" }}>
      <table
        cellPadding={0}
        id=":2x"
        className="F cf zt"
        role="grid"
        aria-readonly="true"
        style={{ width: "100%", height: "100%" }}
        ref={ref}
      >
        <tbody>
          {emails.map((email, index) => {
            const threadId = email.threadId.split(":")[1];
            const isActive = showSnoozePopover && snoozeId === email.id;
            const selected = selection.isSelected(threadId);

            return (
              <tr
                key={threadId}
                className={getRowClassName(email, isActive)}
                id={`:pi${index}`}
                tabIndex={-1}
                role="row"
                aria-labelledby={`:pj${index}`}
                draggable="false"
                onClick={(e) => handleClickRow(email, threadId)}
                read={email.read}
                style={{
                  ...(density === "compact"
                    ? {
                        padding: 2,
                      }
                    : {}),
                  ...(selected ? { backgroundColor: "#c2dbff" } : {}),
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
                    toggleStar={toggleStar}
                    density={density}
                    getDisplayAddress={getDisplayAddress}
                  />
                ) : (
                  <>
                    {/* Star */}
                    <td className={`apU ${email.starred ? "" : "xY"}`}>
                      <button
                        type="button"
                        aria-label={email.starred ? "Unstar" : "Star"}
                        aria-pressed={email.starred}
                        className="T-Jo"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStar([email.id]);
                        }}
                        style={{
                          background: "transparent",
                          border: 0,
                          padding: 0,
                          cursor: "pointer",
                          color: email.starred ? "#FBBC04" : "rgba(0,0,0,.54)",
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: 18,
                            verticalAlign: "middle",
                            fontVariationSettings: `'FILL' ${email.starred ? 1 : 0}`,
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
                        aria-checked={email.important.toString()}
                        id={`:pn${index}`}
                        data-is-important={email.important.toString()}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleImportant && toggleImportant([email.id]);
                        }}
                      >
                        <div className="T-ays-a45 sf-hidden">
                          {email.important && "Important according to Google magic."}
                        </div>
                        <div className={getImportantClassName(email)} />
                        <div className="bnj" />
                      </div>
                    </td>
                    {/* Sender / Recipient (Sent) */}
                    <td className="yX xY" role="gridcell" tabIndex={-1}>
                      <div id={`:pj${index}`} className="afn sf-hidden">
                        {getAccessibilityText(email)}
                      </div>
                      <div id={`:po${index}`} className="yW">
                        <span className="bA4">
                          <span
                            translate="no"
                            className={getSenderClassName(email)}
                            email={getDisplayAddress(email).email}
                            name={getDisplayAddress(email).name}
                            data-hovercard-id={getDisplayAddress(email).email}
                            style={email.labels.includes("Drafts") ? { color: "#dd4b39", fontWeight: 400 } : {}}
                          >
                            {email.labels.includes("Drafts") ? "Draft" : getDisplayAddress(email).name}
                          </span>
                        </span>
                      </div>
                    </td>
                    {/* Subject */}
                    <td id={`:pp${index}`} tabIndex={-1} className="xY a4W" role="gridcell">
                      <div className="a4X">
                        <Link
                          to={`${location.pathname}/${threadId}`}
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
                                {getLabelBadges(email).map((badge) => (
                                  <div
                                    key={`Badge-${badge.key}`}
                                    style={{
                                      backgroundColor: badge?.color?.rgb ?? "#e1e3e1",
                                      color: badge?.color?.text ?? "#444746",
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
                                ))}
                                <span
                                  className={email.read ? "" : "bqe"}
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
                          <span className={email.read ? "" : "bq3"}>{formatDate(email.timestamp)}</span>
                        </span>
                      </TimestampBox>
                      <HoverDiv>
                        <Icon
                          name="archive"
                          label="Archive"
                          marginRight="3px"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(email.threadId);
                          }}
                        />
                        <Icon
                          name="delete"
                          label="Delete"
                          marginRight="3px"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(email.threadId);
                          }}
                        />
                        <Icon
                          name="mark_email_unread"
                          label={email.read ? `Mark as unread` : `Mark as read`}
                          marginRight="3px"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReadAction(email);
                          }}
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
        </tbody>
      </table>
    </div>
  );
};

export default Table;
