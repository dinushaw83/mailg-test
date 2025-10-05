import Box from "@mui/material/Box";
import React, { useCallback, useMemo, useState } from "react";
import { Menu, Item, Separator, Submenu, useContextMenu } from "react-contexify";
import "react-contexify/ReactContexify.css";
import MoveToSubMenu from "./MoveToSubMenu";
import useLabels, { flattenTreeForSelect, getPathLabelFromKey, makeKey } from "../../hooks/useLabels";
import CreateLabelDialog from "../Labels/CreateLabelDialog";
import { useParams } from "react-router-dom";
import useMailActions from "../../hooks/useMailActions";
import Button from "@mui/material/Button";
import SpamOrUnsubModal from "../MailActions/SpamOrUnsubModal";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { LabelsSubMenu } from "./LabelsSubMenu";

const ContextMenu = ({
  menuId,
  handleArchive,
  handleDelete,
  handleReadAction,
  handleSnoozeAction,
  contextRow,
  handleMuteAction,
  setEmails,
}) => {
  const isRead = contextRow?.read;
  const senderName = contextRow?.from?.name;
  const threadId = contextRow?.threadId.split(":")[1];
  const selectedIds = [threadId];

  const { moveToTrash, moveToInbox, moveToLabel, moveToLabelFrom, moveToSpam } = useMailActions();
  const { setSnackbar } = useGlobalContext();

  const [{ spamModalOpen, createOpen }, setState] = useState({
    spamModalOpen: false,
    createOpen: false,
  });

  const toggleCreateOpen = useCallback(() => {
    setState((prev) => ({
      ...prev,
      createOpen: !prev.createOpen,
    }));
  }, []);

  const { labels, labelTree } = useLabels();

  const { label: labelParam } = useParams();
  const currentLabel = labelParam ? decodeURIComponent(labelParam) : null;

  // Check if any selected emails are not in the inbox
  const menuItems = useMemo(() => {
    const flat = flattenTreeForSelect(labelTree); // [{ key, name, depth, system }]
    return flat
      .filter((item) => !labels?.[item.key]?.system)
      .map((item) => ({
        id: item.key,
        name: getPathLabelFromKey(labels, item.key), // "Parent / Child / ..."
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [labelTree, labels]);

  const openCreateLabelDialog = useCallback(() => {
    setState((prev) => ({
      ...prev,
      createOpen: true,
    }));
  }, []);

  const handleMenuItemClick = useCallback(
    async (item) => {
      if (item.id === "__create_label__") {
        openCreateLabelDialog();
        return;
      }

      if (!selectedIds.length) return;

      try {
        if (item.id === "__inbox__" || item.id === "inbox") {
          moveToLabel(selectedIds, "Inbox");
        } else if (item.id === "__spam__" || item.id === "spam") {
          setState((prev) => ({
            ...prev,
            spamModalOpen: true,
          }));
          return;
        } else if (item.id === "__trash__" || item.id === "trash") {
          moveToTrash(selectedIds);
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
                  moveToInbox(selectedIds);
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
        } else {
          // item.id is now the TARGET LABEL KEY
          const targetKey = item.id;
          const curMeta = currentLabel ? labels?.[currentLabel] : null;
          const inCustomLabel = curMeta && curMeta.system === false;
          if (inCustomLabel) {
            moveToLabelFrom(selectedIds, currentLabel, targetKey);
          } else {
            moveToLabel(selectedIds, targetKey); // pass key
          }
        }
      } catch (e) {
        console.error("Move failed:", e);
      }
    },
    [moveToLabel, moveToLabelFrom, moveToTrash, moveToInbox, setSnackbar, currentLabel, labels]
  );

  const handleOnAfterCreate = (childName, parentKey) => {
    try {
      // Store original labels before the move
      const originalLabels = {};
      selectedIds.forEach((id) => {
        originalLabels[id] = [...(contextRow.labels || [])];
      });

      // Perform the move after creation
      const newKey = makeKey(childName, parentKey); // build composite key
      const curMeta = currentLabel ? labels?.[currentLabel] : null;
      const inCustomLabel = curMeta && curMeta.system === false;
      if (inCustomLabel) {
        moveToLabelFrom(selectedIds, currentLabel, newKey);
      } else {
        moveToLabel(selectedIds, newKey);
      }

      // --- UNDO action ---
      setSnackbar({
        open: true,
        message: `Conversation moved to "${childName}".`,
        autoHideDuration: 10000,
        action: (
          <Button
            size="small"
            onClick={() => {
              try {
                // Restore original labels for each email
                setEmails((prevEmails) =>
                  prevEmails.map((email) => {
                    const emailThreadId = email.threadId.split(":")[1];
                    if (selectedIds.includes(emailThreadId) && originalLabels[emailThreadId]) {
                      return { ...email, labels: originalLabels[emailThreadId] };
                    }
                    return email;
                  })
                );

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
    } catch (e) {
      setSnackbar({
        open: true,
        message: "Could not move selected conversations.",
        autoHideDuration: 4000,
      });
    }
  };

  const handleItemClick = ({ id, event, props }) => {
    const threadId = props.thread.threadId.split(":")[1];
    switch (id) {
      case "archive":
        handleArchive(threadId);
        break;
      case "delete":
        handleDelete(threadId);
        break;
      case "mark_as_read":
      case "mark_as_unread":
        handleReadAction(props.thread);
        break;
      case "snooze":
        handleSnoozeAction(threadId);
        break;
      case "mute":
        handleMuteAction(threadId);
        break;
      //etc...
    }
  };

  const sectionOneItems = [
    {
      id: "reply",
      label: "Reply",
      icon: "reply",
      disabled: true,
    },
    {
      id: "reply_all",
      label: "Reply all",
      icon: "reply_all",
      disabled: true,
    },
    {
      id: "forward",
      label: "Forward",
      icon: "forward",
      disabled: true,
    },
    {
      id: "forward_as_attachment",
      label: "Forward as attachment",
      icon: "attachment",
      disabled: true,
    },
  ];

  const sectionTwoItems = [
    {
      id: "archive",
      label: "Archive",
      icon: "archive",
    },
    {
      id: "delete",
      label: "Delete",
      icon: "delete",
    },
    ...(isRead
      ? [
          {
            id: "mark_as_unread",
            label: "Mark as unread",
            icon: "mark_email_unread",
          },
        ]
      : [
          {
            id: "mark_as_read",
            label: "Mark as read",
            icon: "drafts",
          },
        ]),
    {
      id: "snooze",
      label: "Snooze",
      icon: "schedule",
    },
    {
      id: "add_to_tasks",
      label: "Add to tasks",
      icon: "task_alt",
      disabled: true,
    },
  ];

  const isThreadNotInInbox = contextRow && (!contextRow.labels || !contextRow.labels.includes("Inbox"));
  const muted = contextRow?.labels?.includes("Muted");
  console.log({ muted, labels: contextRow?.labels });

  return (
    <Box>
      <Menu
        id={menuId}
        style={{
          padding: 0,
          paddingTop: "4px",
          paddingBottom: "4px",
          fontSize: "14px",
        }}
      >
        {sectionOneItems.map((item) => (
          <Item id={item.id} onClick={handleItemClick} disabled={item.disabled}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
              {item.icon}
            </span>
            {item.label}
          </Item>
        ))}

        <Separator />

        {sectionTwoItems.map((item) => (
          <Item id={item.id} onClick={handleItemClick} disabled={item.disabled}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
              {item.icon}
            </span>
            {item.label}
          </Item>
        ))}

        <Separator />

        <Submenu
          label="Move to"
          style={{ padding: 0, paddingTop: "4px", paddingBottom: "4px" }}
          arrow={
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "20px",
                fontVariationSettings: "'FILL' 1", // Makes it solid
              }}
            >
              arrow_right
            </span>
          }
        >
          <MoveToSubMenu labels={menuItems} onSelect={handleMenuItemClick} showInbox={isThreadNotInInbox} />
        </Submenu>

        <Submenu
          label="Label as"
          style={{ padding: 0, paddingTop: "4px", paddingBottom: "4px" }}
          arrow={
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: "20px",
                fontVariationSettings: "'FILL' 1", // Makes it solid
              }}
            >
              arrow_right
            </span>
          }
        >
          <LabelsSubMenu selectedIds={selectedIds} openCreateLabelDialog={openCreateLabelDialog} />
        </Submenu>

        <Item id="mute" onClick={handleItemClick}>
          <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
            {muted ? "volume_up" : "volume_off"}
          </span>
          {muted ? "Unmute" : "Mute"}
        </Item>

        <Separator />

        <Item id="search" onClick={handleItemClick} disabled>
          <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
            search
          </span>
          Find emails from {senderName}
        </Item>

        <Separator />

        <Item id="new_tab" onClick={handleItemClick} disabled>
          <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
            open_in_new
          </span>
          Open in new window
        </Item>
      </Menu>

      <CreateLabelDialog open={createOpen} onClose={() => toggleCreateOpen()} onAfterCreate={handleOnAfterCreate} />

      <SpamOrUnsubModal
        open={spamModalOpen}
        onClose={() => {
          setState((prev) => ({
            ...prev,
            spamModalOpen: false,
          }));
        }}
        onReportSpam={() => {
          moveToSpam(selectedIds);
          setState((prev) => ({
            ...prev,
            spamModalOpen: false,
          }));
        }}
        onUnsubscribe={() => {
          moveToSpam(selectedIds);
          setState((prev) => ({
            ...prev,
            spamModalOpen: false,
          }));
        }}
      />
    </Box>
  );
};

export default ContextMenu;
