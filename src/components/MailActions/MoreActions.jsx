import React, { useCallback, useMemo } from "react";
import Icon from "../ui/Icon";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";

const MenuItem = ({ icon, label, onClick, horizontal = false, rightIcon = null, filled = false, fontSize = 20 }) => {
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

      <Typography sx={{ flex: 1, paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px" }}>{label}</Typography>

      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 20,
          color: "rgb(68, 68, 68)",
        }}
      >
        {rightIcon}
      </span>
    </Box>
  );
};

const MoreActions = ({ hasItemsSelected, emails }) => {
  const { moveToSpam, moveToTrash, moveToLabel, moveToLabelFrom, moveToInbox, archive, markRead } = useMailActions();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { selection, labels, setSnackbar } = useGlobalContext();
  const { ids } = selection;
  const selectedIds = useMemo(() => [...ids], [ids]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "more-actions-popover" : undefined;

  const markAllAsRead = useCallback(() => {
    const threadIds = emails.map((email) => email.threadId.split(":")[1]);
    markRead(threadIds, true);
  }, [emails, markRead]);

  return (
    <Box>
      <Icon name="more_vert" onClick={handleClick} />
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
              <MenuItem icon="schedule" label="Snooze" />
              <Divider sx={{ marginY: "6px" }} />
              <MenuItem icon="label" label="Label as" rightIcon="arrow_right" />
              <MenuItem icon="star" label="Add star" />
              <MenuItem icon="label_important" label="Mark as important" />
              <MenuItem icon="label_important" label="Mark as not important" filled fontSize={18} />
              <MenuItem icon="attach_file" label="Forward as attachment" horizontal />
              <MenuItem icon="filter_list" label="Filter messages like these" />
              <MenuItem icon="volume_off" label="Mute" />
              <Divider sx={{ marginY: "6px" }} />
              <MenuItem icon="swap_horiz" label="Switch to advanced toolbar" />
            </>
          )}
        </Box>
      </Popover>
    </Box>
  );
};

export default MoreActions;
