import React, { useCallback, useMemo, useRef } from "react";
import Icon from "../ui/Icon";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Divider from "@mui/material/Divider";
import useMailActions from "../../hooks/useMailActions";
import { ActionMenuItem } from "../MailActions/ActionMenuItem";
import { useNavigate } from "react-router-dom";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { useHotkeys } from "react-hotkeys-hook";
import Button from "@mui/material/Button";

const useCustomHotKeys = ({ handlePeriodPress }) => {
  const { keyboardShortcuts } = useGlobalContext();
  const shortcutsOn = keyboardShortcuts === "shortcuts-on";

  useHotkeys(shortcutsOn ? "Period" : "", () => {
    handlePeriodPress();
  });
};

const MoreActions = ({
  thread,
  showAdvancedMenu,
  toggleShowAdvancedMenu,
  anchorEl: externalAnchorEl,
  onClose: externalOnClose,
}) => {
  const { markRead, setStar, setImportant, setMuted } = useMailActions();
  const navigate = useNavigate();
  const [internalAnchorEl, setInternalAnchorEl] = React.useState(null);

  const moreVertRef = useRef(null);
  const { setSnackbar, emails, setEmails } = useGlobalContext();

  // Use external anchorEl if provided, otherwise use internal state
  const anchorEl = externalAnchorEl !== undefined ? externalAnchorEl : internalAnchorEl;
  const setAnchorEl = externalAnchorEl !== undefined ? () => {} : setInternalAnchorEl;

  const threadEmails = useMemo(
    () => emails.filter((email) => email.thread_id === thread.thread_id),
    [emails, thread.thread_id]
  );
  const conversationLabelSnapshot = useCallback(
    () => new Map(threadEmails.map((email) => [String(email.id ?? ""), [...(email.labels || [])]])),
    [threadEmails]
  );

  const handleClick = () => {
    if (externalAnchorEl === undefined) {
      setAnchorEl(moreVertRef.current);
    }
  };

  useCustomHotKeys({ handlePeriodPress: handleClick });

  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setAnchorEl(null);
    }
  };

  const open = Boolean(anchorEl);
  const id = open ? "more-actions-popover" : undefined;

  // Compute starred status from actual emails, not from thread prop (which may be stale)
  const starred = useMemo(() => {
    if (!threadEmails.length) return false;
    // A thread is starred if ALL emails in it are starred
    return threadEmails.every((email) => email.is_starred);
  }, [threadEmails]);

  // Compute important status from actual emails, not from thread prop (which may be stale)
  const important = useMemo(() => {
    if (!threadEmails.length) return false;
    // A thread is important if ALL emails in it are important
    return threadEmails.every((email) => email.is_important);
  }, [threadEmails]);

  const handleStar = useCallback(() => {
    if (!threadEmails.length) {
      handleClose();
      return;
    }

    const nextValue = !starred;
    const previousStates = threadEmails.map((email) => ({
      id: email.id,
      starred: !!email.is_starred,
    }));
    const idsToUpdate = previousStates.filter((state) => state.starred !== nextValue).map((state) => state.id);

    if (idsToUpdate.length) {
      // Pass 'detail' context since MoreActions is used in detail view
      setStar(idsToUpdate, nextValue, "detail");
    }

    const undo = () => {
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
    };

    setSnackbar({
      open: true,
      message: nextValue ? "Conversation starred." : "Conversation unstarred.",
      autoHideDuration: 3000,
      action: (
        <Button sx={{ textTransform: "none" }} size="small" onClick={undo}>
          Undo
        </Button>
      ),
    });

    handleClose();
  }, [threadEmails, starred, setStar, setSnackbar, handleClose]);

  const toggleImportant = useCallback(
    (value) => {
      if (!threadEmails.length) {
        handleClose();
        return;
      }

      const previousStates = threadEmails.map((email) => ({
        thread_id: email.thread_id,
        important: !!email.is_important,
      }));
      const threadIdsToUpdate = [
        ...new Set(
          previousStates
            .filter((state) => state.important !== value)
            .map((state) => state.thread_id)
            .filter(Boolean)
        ),
      ];

      if (threadIdsToUpdate.length) {
        setImportant(threadIdsToUpdate, value);
      }

      const undo = () => {
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
      };

      setSnackbar({
        open: true,
        message: value ? "Conversation marked as important." : "Conversation marked as not important.",
        autoHideDuration: 3000,
        action: (
          <Button sx={{ textTransform: "none" }} size="small" onClick={undo}>
            Undo
          </Button>
        ),
      });

      handleClose();
    },
    [threadEmails, setImportant, setSnackbar, handleClose]
  );

  const handleMute = useCallback(() => {
    if (!threadEmails.length) {
      handleClose();
      return;
    }

    const snapshot = conversationLabelSnapshot();
    const wasMuted = threadEmails.every((email) => (email.labels || []).includes("Muted"));
    const nextValue = !wasMuted;
    const idsToUpdate = threadEmails
      .filter((email) => {
        const isMuted = (email.labels || []).includes("Muted");
        return isMuted !== nextValue;
      })
      .map((email) => email.id);

    if (idsToUpdate.length) {
      setMuted(idsToUpdate, nextValue);
    }

    const undo = () => {
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
    };

    setSnackbar({
      open: true,
      message: nextValue ? "Conversation muted." : "Conversation unmuted.",
      autoHideDuration: 3000,
      action: (
        <Button sx={{ textTransform: "none" }} size="small" onClick={undo}>
          Undo
        </Button>
      ),
    });

    handleClose();
  }, [threadEmails, setMuted, handleClose, conversationLabelSnapshot, setEmails, setSnackbar]);

  const handleMarkUnread = useCallback(() => {
    if (!threadEmails.length) {
      handleClose();
      return;
    }

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

    const undo = () => {
      const idsToRestore = previousStates.filter((state) => state.read).map((state) => state.id);
      if (idsToRestore.length) {
        markRead(idsToRestore, true);
      }
      setSnackbar({
        open: true,
        message: "Action undone.",
        autoHideDuration: 3000,
        action: null,
      });
    };

    setSnackbar({
      open: true,
      message: "Conversation marked as unread.",
      autoHideDuration: 3000,
      action: (
        <Button sx={{ textTransform: "none" }} size="small" onClick={undo}>
          Undo
        </Button>
      ),
    });

    navigate("/inbox");
    handleClose();
  }, [threadEmails, markRead, setSnackbar, navigate, handleClose]);

  return (
    <Box>
      {/* Only render the icon if no external anchorEl is provided */}
      {externalAnchorEl === undefined && (
        <Icon name="more_vert" onClick={handleClick} label="" style={{}} disabled={false} _ref={moreVertRef} />
      )}

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ paddingY: "6px", width: "256px", minHeight: "109px" }}>
          <>
            {showAdvancedMenu && (
              <>
                <ActionMenuItem icon="mark_email_unread" label="Mark as unread" onClick={handleMarkUnread} />
                <ActionMenuItem
                  icon={important ? "label_important" : "label_important_outline"}
                  label={important ? "Mark as not important" : "Mark as important"}
                  onClick={() => toggleImportant(!important)}
                  filled={important}
                  fontSize={important ? 18 : 20}
                />
                <ActionMenuItem
                  icon="star"
                  label={starred ? "Remove star" : "Add star"}
                  onClick={handleStar}
                  filled={starred}
                />
              </>
            )}
            <ActionMenuItem icon="filter_list" label="Filter messages like these" onClick={() => navigate("/502")} />
            <ActionMenuItem icon="volume_off" label="Mute" onClick={handleMute} />
            <Divider sx={{ marginY: "6px" }} />
            <ActionMenuItem
              icon="swap_horiz"
              label={showAdvancedMenu ? "Switch to simple toolbar" : "Switch to advanced toolbar"}
              onClick={() => {
                toggleShowAdvancedMenu();
                handleClose();
              }}
            />
          </>
        </Box>
      </Popover>
    </Box>
  );
};

export default MoreActions;
