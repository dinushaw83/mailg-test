import React, { useCallback, useMemo } from "react";
import Icon from "../ui/Icon";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { SnoozePopover } from "./Snooze";
import { ActionMenuItem } from "./ActionMenuItem";

const MoreActions = ({ hasItemsSelected, emails }) => {
  const {
    moveToSpam,
    moveToTrash,
    moveToLabel,
    moveToLabelFrom,
    moveToInbox,
    archive,
    markRead,
    setStar,
    setImportant,
    snooze,
  } = useMailActions();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [currentPopover, setCurrentPopover] = React.useState("main"); // 'main' or 'snooze'
  const { selection, labels, setSnackbar } = useGlobalContext();
  const { ids } = selection;
  const selectedIds = useMemo(() => [...ids], [ids]);
  const selectedEmails = useMemo(
    () => emails.filter((email) => selectedIds.includes(email.threadId.split(":")[1])),
    [emails, selectedIds]
  );

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    setCurrentPopover("main");
  };

  const handleClose = () => {
    setAnchorEl(null);
    setCurrentPopover("main");
  };

  const handleSnoozeClick = () => {
    setCurrentPopover("snooze");
  };

  const handleSnoozeBack = () => {
    setCurrentPopover("main");
  };

  const open = Boolean(anchorEl);
  const id = open ? "more-actions-popover" : undefined;

  const markAllAsRead = useCallback(() => {
    const threadIds = emails.map((email) => email.threadId.split(":")[1]);
    markRead(threadIds, true);
    handleClose();
  }, [emails, markRead]);

  const onlyOneItemSelected = selectedIds.length === 1;

  const allStarred = useMemo(() => {
    return selectedEmails.every((email) => email.starred);
  }, [selectedEmails]);

  const allImportant = useMemo(() => {
    return selectedEmails.every((email) => email.important);
  }, [selectedEmails]);

  const allNotImportant = useMemo(() => {
    return selectedEmails.every((email) => !email.important);
  }, [selectedEmails]);

  const handleStar = useCallback(() => {
    setStar(selectedIds, !allStarred);
    handleClose();
  }, [selectedIds, setStar, allStarred]);

  const handleImportant = useCallback(() => {
    setImportant(selectedIds, true);
    handleClose();
  }, [selectedIds, setImportant, allImportant]);

  const handleNotImportant = useCallback(() => {
    setImportant(selectedIds, false);
    handleClose();
  }, [selectedIds, setImportant]);

  return (
    <Box>
      <Icon name="more_vert" onClick={handleClick} label="" style={{}} disabled={false} />

      {currentPopover === "main" && (
        <Popover
          id={id}
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Box sx={{ paddingY: "6px", width: "256px", minHeight: "109px" }}>
            {!hasItemsSelected && (
              <>
                <ActionMenuItem icon="drafts" label="Mark all as read" onClick={markAllAsRead} />

                <Divider sx={{ marginY: "6px" }} />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingY: "16px",
                    paddingX: "32px",
                  }}
                >
                  <Typography sx={{ fontSize: "0.875rem", lineHeight: "20px", color: "#5f6368" }}>
                    Select messages to see more actions
                  </Typography>
                </Box>
              </>
            )}
            {hasItemsSelected && (
              <>
                <ActionMenuItem icon="schedule" label="Snooze" onClick={handleSnoozeClick} />
                <Divider sx={{ marginY: "6px" }} />
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    paddingX: "16px",
                    height: "32px",
                    overflow: "hidden",
                    cursor: "pointer",
                    "&:hover": {
                      background: "#07070714",
                    },
                  }}
                  onClick={() => {}}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 20,
                      color: "rgb(68, 68, 68)",
                      width: "20px",
                    }}
                  >
                    label
                  </span>

                  <Typography sx={{ flex: 1, paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px" }}>
                    Label as
                  </Typography>

                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 20,
                      color: "rgb(68, 68, 68)",
                    }}
                  >
                    arrow_right
                  </span>
                </Box>
                <ActionMenuItem
                  icon="star"
                  label={allStarred ? "Remove star" : "Add star"}
                  disabled={onlyOneItemSelected}
                  onClick={handleStar}
                />
                <ActionMenuItem
                  icon="label_important"
                  label="Mark as important"
                  disabled={onlyOneItemSelected || allImportant}
                  onClick={handleImportant}
                />
                <ActionMenuItem
                  icon="label_important"
                  label="Mark as not important"
                  filled
                  fontSize={18}
                  disabled={onlyOneItemSelected || allNotImportant}
                  onClick={handleNotImportant}
                />
                <ActionMenuItem
                  icon="attach_file"
                  label="Forward as attachment"
                  horizontal
                  disabled={onlyOneItemSelected}
                  onClick={() => {}}
                />
                <ActionMenuItem icon="filter_list" label="Filter messages like these" onClick={() => {}} />
                <ActionMenuItem icon="volume_off" label="Mute" onClick={() => {}} />
                <Divider sx={{ marginY: "6px" }} />
                <ActionMenuItem icon="swap_horiz" label="Switch to advanced toolbar" onClick={() => {}} />
              </>
            )}
          </Box>
        </Popover>
      )}

      {currentPopover === "snooze" && (
        <SnoozePopover
          anchorEl={anchorEl}
          open={open}
          onClose={handleClose}
          onBack={handleSnoozeBack}
          selectedIds={selectedIds}
          snooze={snooze}
        />
      )}
    </Box>
  );
};

export default MoreActions;
