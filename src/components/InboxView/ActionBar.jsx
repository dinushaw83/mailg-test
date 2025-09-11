import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styled from "@emotion/styled";
import { GlobalContext, useGlobalContext } from "../../contexts/GlobalContext";
import Tooltip from "@mui/material/Tooltip";
import useMailActions from "../../hooks/useMailActions";
import SpamOrUnsubModal from "../MailActions/SpamOrUnsubModal";
import MoveToMenu from "../MailActions/MoveToMenu";
import Button from "@mui/material/Button";
import { SnoozePopover } from "../MailActions/Snooze";
import MoreActions from "./MoreActions";
import { Labels } from "../MailActions/Labels";
import { getThreadRows } from "../../utils/emails";

export const Icon = ({
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
  _ref,
}) => {
  return (
    <Tooltip title={label} placement={placement}>
      <IconButton
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
            fontSize: 20,
            color: disabled ? "#b8b8b8" : "rgb(68, 68, 68)",
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
};

const MailActions = ({ thread }) => {
  const navigate = useNavigate();
  const threadId = thread.threadId.split(":")[1];
  const [state, dispatch] = useReducer(reducer, initialState);
  const { spamModalOpen, moveToMenuOpen, snoozeAnchorEl, showAdvancedMenu, labelAnchorEl, searchQuery } = state;
  const [selectedLabelKeys, setSelectedLabelKeys] = useState(new Set());
  const { labels, setSnackbar } = useGlobalContext();

  const { label: labelParam } = useParams();
  const currentLabel = labelParam ? decodeURIComponent(labelParam) : null;
  const customLabels = useMemo(() => {
    const map = labels || {};
    return Object.entries(map)
      .filter(([, meta]) => !meta.system)
      .map(([name]) => ({ id: "__label__" + name, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [labels]);

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

  const { moveToSpam, moveToTrash, moveToLabel, moveToLabelFrom, moveToInbox, archive, markRead, snooze } =
    useMailActions();

  const handleArchive = useCallback(() => {
    archive([threadId]);
    setSnackbar({
      open: true,
      message: "Conversation archived.",
      autoHideDuration: 3000,
      action: null,
    });
  }, [threadId, archive]);

  const handleDelete = useCallback(() => {
    moveToTrash([threadId]);
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
  }, [threadId, moveToTrash, setSnackbar]);

  useEffect(() => {
    markRead([threadId], true);
  }, [markRead, threadId]);

  const handleMarkUnread = useCallback(() => {
    markRead([threadId], false);
    navigate("/inbox");
  }, []);

  const handleMoveEmails = useCallback(
    async (item) => {
      try {
        if (item.id === "__inbox__" || item.id === "inbox") {
          moveToLabel([threadId], "Inbox");
        } else if (item.id === "__spam__" || item.id === "spam") {
          toggleSpamModal();
        } else if (item.id === "__trash__" || item.id === "trash") {
          moveToTrash([threadId]);
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
        } else if (item.id.startsWith("__label__")) {
          // moving between labels:
          if (currentLabel && labels?.[currentLabel] && labels?.[currentLabel]["system"] === false) {
            moveToLabelFrom([threadId], currentLabel, item.name);
          } else {
            moveToLabel([threadId], item.name);
          }
        }
      } catch (e) {
        console.error("Move failed:", e);
      }
    },
    [moveToLabel, moveToLabelFrom, moveToTrash, moveToInbox, setSnackbar, currentLabel, labels]
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
  const location = useLocation();

  // Get the base path by removing the threadId from the current path
  const getBasePath = () => {
    const pathParts = location.pathname.split("/");
    // Remove the last part (threadId) to get the base path
    return pathParts.slice(0, -1).join("/") || "/inbox";
  };

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
          <Icon name="delete" label="Delete" onClick={handleDelete} />
        </>

        <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />

        <>
          <Icon name="mark_email_unread" label="Mark as unread" onClick={handleMarkUnread} />
          {showAdvancedMenu && (
            <>
              <Icon name="schedule" label="Snooze" onClick={handleSnoozeAction} _ref={snoozeAnchorElRef} />
              <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />
            </>
          )}
          {/* The next icon does not exactly match */}
          <Icon name="drive_file_move" label="Move to" onClick={toggleMoveToMenu} _ref={moveToMenuAnchorRef} />
          {showAdvancedMenu && <Icon name="label" label="Labels" onClick={handleLabelAction} _ref={labelAnchorElRef} />}

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
        onReportSpam={() => {
          moveToSpam([threadId]);
          toggleSpamModal();
        }}
        onUnsubscribe={() => {
          moveToSpam([threadId]);
          toggleSpamModal();
        }}
      />
      {moveToMenuOpen && (
        <MoveToMenu
          anchorRef={moveToMenuAnchorRef}
          labels={customLabels}
          onSelect={handleMoveEmails}
          onClose={() => dispatch({ type: "toggleMoveToMenu" })}
        />
      )}
      <SnoozePopover
        anchorEl={snoozeAnchorEl}
        open={showSnoozePopover}
        onClose={handleSnoozeClose}
        selectedIds={[threadId]}
        snooze={snooze}
      />
      <Labels
        {...{
          searchQuery,
          setSearchQuery,
          setLabelAnchorEl,
          setSelectedLabelKeys,
          selectedLabelKeys,
          labelAnchorEl,
          selectedIds: [threadId],
          handleClose: handleLabelClose,
          // position below the icon
          anchorOrigin: { vertical: "bottom", horizontal: "left" },
          transformOrigin: { vertical: "top", horizontal: "left" },
        }}
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

const NavigationActions = () => {
  const { threadId, folder, label: labelParam } = useParams();
  const { emails } = useContext(GlobalContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Get the base path by removing the threadId from the current path
  const getBasePath = () => {
    const pathParts = location.pathname.split("/");
    // Remove the last part (threadId) to get the base path
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
    return filteredThreads.map((thread) => thread.threadId);
  }, [filteredThreads]);

  // use thread position in filtered threadIds array to determine if there is a previous or next thread
  const threadPosition = useMemo(() => {
    return filteredThreadIds.indexOf(`#thread-f:${threadId}`);
  }, [filteredThreadIds, threadId]);

  const hasPreviousThread = useMemo(() => {
    return threadPosition > 0;
  }, [threadPosition]);

  const hasNextThread = useMemo(() => {
    return threadPosition < filteredThreadIds.length - 1;
  }, [threadPosition, filteredThreadIds]);

  const previousThread = useMemo(() => {
    return (filteredThreadIds[threadPosition - 1] || "").split(":")[1];
  }, [filteredThreadIds, threadPosition]);

  const nextThread = useMemo(() => {
    return (filteredThreadIds[threadPosition + 1] || "").split(":")[1];
  }, [filteredThreadIds, threadPosition]);

  const currentItem = useMemo(() => {
    return threadPosition + 1;
  }, [threadPosition]);

  const totalItems = useMemo(() => {
    return filteredThreadIds.length;
  }, [filteredThreadIds]);

  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
      }}
    >
      <EmailPosition currentItem={currentItem} totalItems={totalItems} />
      <div style={{ display: "flex", marginLeft: 10 }}>
        <Icon
          name="chevron_left"
          label="Newer"
          disabled={!hasPreviousThread}
          onClick={() => navigate(`${getBasePath()}/${previousThread}`)}
        />
        <Icon
          name="chevron_right"
          label="Older"
          disabled={!hasNextThread}
          onClick={() => navigate(`${getBasePath()}/${nextThread}`)}
        />
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
      <Divider />
    </ActionBarContainer>
  );
}
