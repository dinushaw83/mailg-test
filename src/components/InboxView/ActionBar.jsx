import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import React, { useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "@emotion/styled";
import { GlobalContext, useGlobalContext } from "../../contexts/GlobalContext";
import Tooltip from "@mui/material/Tooltip";
import useMailActions from "../../hooks/useMailActions";
import SpamOrUnsubModal from "../MailActions/SpamOrUnsubModal";
import MoveToMenu from "../MailActions/MoveToMenu";
import Button from "@mui/material/Button";

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
  }
};

const initialState = {
  spamModalOpen: false,
  moveToMenuOpen: false,
};

const MailActions = ({ thread }) => {
  const navigate = useNavigate();
  const threadId = thread.threadId.split(":")[1];
  const [state, dispatch] = useReducer(reducer, initialState);
  const { spamModalOpen, moveToMenuOpen } = state;
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

  const handleReadAction = useCallback(() => {
    markRead([threadId], !thread.read);
  }, [threadId, markRead]);

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
          onClick={() => navigate("/inbox")}
          style={{ marginRight: "20px" }}
          label="Back to Inbox"
        />

        <>
          <Icon name="archive" label="Archive" onClick={handleArchive} />
          <Icon name="report" label="Report spam" onClick={toggleSpamModal} />
          <Icon name="delete" label="Delete" onClick={handleDelete} />
        </>

        <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />

        <>
          <Icon
            name={!thread.read ? "drafts" : "mark_email_unread"}
            label={!thread.read ? "Mark as read" : "Mark as unread"}
            onClick={handleReadAction}
          />
          {/* The next icon does not exactly match */}
          <Icon name="drive_file_move" label="Move to" onClick={toggleMoveToMenu} _ref={moveToMenuAnchorRef} />
          <Icon name="more_vert" label="More" />
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
  const { threadId } = useParams();
  const { normalizedEmails } = useContext(GlobalContext);
  const { threadIds } = normalizedEmails;
  const navigate = useNavigate();

  // use thread position in threadIds array to determine if there is a previous or next thread
  const threadPosition = useMemo(() => {
    return threadIds.indexOf(`#thread-f:${threadId}`);
  }, [threadIds, threadId]);

  const hasPreviousThread = useMemo(() => {
    return threadPosition > 0;
  }, [threadPosition]);

  const hasNextThread = useMemo(() => {
    return threadPosition < threadIds.length - 1;
  }, [threadPosition, threadIds]);

  const previousThread = useMemo(() => {
    return (threadIds[threadPosition - 1] || "").split(":")[1];
  }, [threadIds, threadPosition]);

  const nextThread = useMemo(() => {
    return (threadIds[threadPosition + 1] || "").split(":")[1];
  }, [threadIds, threadPosition]);

  const currentItem = useMemo(() => {
    return threadPosition + 1;
  }, [threadPosition]);

  const totalItems = useMemo(() => {
    return threadIds.length;
  }, [threadIds]);

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
          onClick={() => navigate(`/inbox/${previousThread}`)}
        />
        <Icon
          name="chevron_right"
          label="Older"
          disabled={!hasNextThread}
          onClick={() => navigate(`/inbox/${nextThread}`)}
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
