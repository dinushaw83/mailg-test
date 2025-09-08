import React, { useCallback, useMemo } from "react";
import Icon from "../ui/Icon";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";

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
        <Box sx={{ paddingY: "6px", width: "256px", minHeight: "109px", maxHeight: "262px" }}>
          {!hasItemsSelected && (
            <>
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
                onClick={markAllAsRead}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 20,
                    color: "rgb(68, 68, 68)",
                  }}
                >
                  drafts
                </span>

                <Typography sx={{ paddingY: "16px", fontSize: "0.875rem", lineHeight: "20px" }}>
                  Mark all as read
                </Typography>
              </Box>

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
        </Box>
      </Popover>
    </Box>
  );
};

export default MoreActions;
