import React, { useCallback, useMemo, useState } from "react";
import Icon from "../ui/Icon";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";

const SnoozePopover = ({ anchorEl, open, onClose, onBack, selectedIds, snooze }) => {
  const today = new Date();

  // Later today - set to 6 PM today
  const laterToday = new Date(today);
  laterToday.setHours(18, 0, 0, 0);

  // Tomorrow - set to 8 AM tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  // Later this week - next Friday at 8 AM
  const laterThisWeek = new Date(today);
  const daysUntilFriday = (5 - today.getDay() + 7) % 7;
  laterThisWeek.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  laterThisWeek.setHours(8, 0, 0, 0);

  // This weekend - next Sunday at 8 AM
  const thisWeekend = new Date(today);
  const daysUntilSunday = (0 - today.getDay() + 7) % 7;
  thisWeekend.setDate(today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  thisWeekend.setHours(8, 0, 0, 0);

  // Next week - next Monday at 8 AM
  const nextWeek = new Date(today);
  const daysUntilMonday = (1 - today.getDay() + 7) % 7;
  nextWeek.setDate(today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
  nextWeek.setHours(8, 0, 0, 0);

  // Format dates for display - "Wed, 18:00", "Thu, 08:00", etc.
  const formatTime = (date) => {
    const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
    const time = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${weekday}, ${time}`;
  };

  return (
    <Popover
      id="snooze-popover"
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
    >
      <Box sx={{ paddingY: "6px", width: "256px", minHeight: "109px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            paddingX: "16px",
            height: "32px",
          }}
        >
          <Typography sx={{ flex: 1, paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px" }}>
            Snooze until...
          </Typography>
        </Box>

        {/* <Divider sx={{ marginY: "6px" }} /> */}

        <MenuItem
          label="Later today"
          rightText={formatTime(laterToday)}
          onClick={() => {
            snooze(selectedIds, laterToday);
            onClose();
          }}
        />
        <MenuItem
          label="Tomorrow"
          rightText={formatTime(tomorrow)}
          onClick={() => {
            snooze(selectedIds, tomorrow);
            onClose();
          }}
        />
        <MenuItem
          label="Later this week"
          rightText={formatTime(laterThisWeek)}
          onClick={() => {
            snooze(selectedIds, laterThisWeek);
            onClose();
          }}
        />
        <MenuItem
          label="This weekend"
          rightText={formatTime(thisWeekend)}
          onClick={() => {
            snooze(selectedIds, thisWeekend);
            onClose();
          }}
        />
        <MenuItem
          label="Next week"
          rightText={formatTime(nextWeek)}
          onClick={() => {
            snooze(selectedIds, nextWeek);
            onClose();
          }}
        />
        <Divider sx={{ marginY: "6px" }} />
        <MenuItem icon="calendar_month" label="Select date & time" onClick={() => {}} />
      </Box>
    </Popover>
  );
};

const MenuItem = ({
  icon = "",
  label,
  onClick,
  horizontal = false,
  rightIcon = "",
  filled = false,
  fontSize = 20,
  disabled = false,
  rightText = null,
}) => {
  if (disabled) return null;
  return (
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
      onClick={onClick}
    >
      {icon && (
        <span
          className={filled ? "material-symbols-filled" : "material-symbols-outlined"}
          style={{
            fontSize,
            color: "rgb(68, 68, 68)",
            ...(horizontal && {
              // rotate 90 degrees
              transform: "rotate(90deg)",
            }),
            width: "20px",
          }}
        >
          {icon}
        </span>
      )}

      <Typography sx={{ flex: 1, paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px" }}>{label}</Typography>

      {rightText && (
        <Typography sx={{ paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px", color: "#5f6368" }}>
          {rightText}
        </Typography>
      )}

      {rightIcon && (
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 20,
            color: "rgb(68, 68, 68)",
          }}
        >
          {rightIcon}
        </span>
      )}
    </Box>
  );
};

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
                <MenuItem icon="drafts" label="Mark all as read" onClick={markAllAsRead} />

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
                <MenuItem icon="schedule" label="Snooze" onClick={handleSnoozeClick} />
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
                <MenuItem
                  icon="star"
                  label={allStarred ? "Remove star" : "Add star"}
                  disabled={onlyOneItemSelected}
                  onClick={handleStar}
                />
                <MenuItem
                  icon="label_important"
                  label="Mark as important"
                  disabled={onlyOneItemSelected || allImportant}
                  onClick={handleImportant}
                />
                <MenuItem
                  icon="label_important"
                  label="Mark as not important"
                  filled
                  fontSize={18}
                  disabled={onlyOneItemSelected || allNotImportant}
                  onClick={handleNotImportant}
                />
                <MenuItem
                  icon="attach_file"
                  label="Forward as attachment"
                  horizontal
                  disabled={onlyOneItemSelected}
                  onClick={() => {}}
                />
                <MenuItem icon="filter_list" label="Filter messages like these" onClick={() => {}} />
                <MenuItem icon="volume_off" label="Mute" onClick={() => {}} />
                <Divider sx={{ marginY: "6px" }} />
                <MenuItem icon="swap_horiz" label="Switch to advanced toolbar" onClick={() => {}} />
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
