import Box from "@mui/material/Box";
import React, { useCallback, useMemo, useState } from "react";
import { Menu, Item, Separator, Submenu } from "react-contexify";
import "react-contexify/ReactContexify.css";
import MoveToSubMenu from "./MoveToSubMenu";
import useLabels, { flattenTreeForSelect, getPathLabelFromKey, makeKey } from "../../hooks/useLabels";
import CreateLabelDialog from "../Labels/CreateLabelDialog";
import useMailActions from "../../hooks/useMailActions";
import Button from "@mui/material/Button";
import SpamOrUnsubModal from "../MailActions/SpamOrUnsubModal";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { LabelsSubMenu } from "./LabelsSubMenu";
import { useComposeModal } from "../../hooks/useComposeModal";
import { restructureRecipients } from "../../utils/helperFunctions";

const ContextMenu = ({
  menuId,
  handleArchive,
  handleDelete,
  handleReadAction,
  handleSnoozeAction,
  contextRow,
  handleMuteAction,
  folder,
  label,
}) => {
  const isRead = contextRow?.read;
  const senderName = contextRow?.from?.name;
  const threadKey = contextRow?.threadId || "";
  const threadId = threadKey.split(":")[1];
  const selectedIds = [threadId];

  const isSpamFolder = folder === "spam";
  const isThreadNotInInbox = contextRow && (!contextRow.labels || !contextRow.labels.includes("Inbox"));
  const muted = contextRow?.labels?.includes("Muted");

  const { moveToTrash, moveToInbox, moveToLabel, moveToLabelFrom, moveToSpam, addLabels, removeLabels, deleteForever } =
    useMailActions();
  const { setSnackbar, recipients, loggedInUser, emails, setEmails } = useGlobalContext();
  const { addNewComposeWindow } = useComposeModal();

  const [isMovingToLabel, setIsMovingToLabel] = useState(true);

  const [{ spamModalOpen, createOpen }, setState] = useState({
    spamModalOpen: false,
    createOpen: false,
  });

  // Track hover states for submenus
  const [hoveredSubmenu, setHoveredSubmenu] = useState(null);

  const toggleCreateOpen = useCallback(() => {
    setState((prev) => ({
      ...prev,
      createOpen: !prev.createOpen,
    }));
  }, []);

  const { labels, labelTree } = useLabels();

  const currentLabel = label ? decodeURIComponent(label) : null;

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

  const threadEmails = useMemo(() => emails.filter((email) => email.threadId === threadKey), [emails, threadKey]);

  const selectedMessageIds = useMemo(() => threadEmails.map((email) => String(email.id ?? "")), [threadEmails]);

  const conversationLabelSnapshot = useCallback(
    () => new Map(threadEmails.map((email) => [String(email.id ?? ""), [...(email.labels || [])]])),
    [threadEmails]
  );

  const handleMenuItemClick = useCallback(
    async (item) => {
      if (item.id === "__create_label__") {
        openCreateLabelDialog();
        return;
      }

      if (!selectedMessageIds.length) return;

      try {
        const snapshot = conversationLabelSnapshot();

        if (item.id === "__inbox__" || item.id === "inbox") {
          moveToLabel(selectedMessageIds, "Inbox");
          showUndoSnackbar(selectedMessageIds, currentLabel, "Inbox", false, true, snapshot, null, 1);
        } else if (item.id === "__spam__" || item.id === "spam") {
          setState((prev) => ({
            ...prev,
            spamModalOpen: true,
          }));
          return;
        } else if (item.id === "__trash__" || item.id === "trash") {
          const undo = moveToTrash(selectedMessageIds);
          setSnackbar({
            open: true,
            message: "Conversation moved to Trash.",
            autoHideDuration: 10000,
            action: (
              <Button
                sx={{ textTransform: "none" }}
                size="small"
                onClick={() => {
                  if (typeof undo === "function") {
                    undo();
                  } else {
                    moveToInbox(selectedMessageIds);
                  }
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
            moveToLabelFrom(selectedMessageIds, currentLabel, targetKey);
          } else {
            moveToLabel(selectedMessageIds, targetKey);
          }
          showUndoSnackbar(selectedMessageIds, currentLabel, targetKey, inCustomLabel, true, snapshot, item.name, 1);
        }
      } catch (e) {
        console.error("Move failed:", e);
      }
    },
    [
      moveToLabel,
      moveToLabelFrom,
      moveToTrash,
      moveToInbox,
      setSnackbar,
      currentLabel,
      labels,
      selectedMessageIds,
      conversationLabelSnapshot,
    ]
  );

  const showUndoSnackbar = useCallback(
    (
      matchKeys,
      fromKey,
      toKey,
      inCustomLabel,
      isMoving = true,
      snapshot = null,
      labelName = null,
      conversationCount = 1
    ) => {
      const action = isMoving ? "moved to" : "added to";
      const resolvedLabel = labelName || getPathLabelFromKey(labels, toKey);
      const message =
        conversationCount > 1
          ? `${conversationCount} conversations ${action} "${resolvedLabel}".`
          : `Conversation ${action} "${resolvedLabel}".`;

      setSnackbar({
        open: true,
        message,
        autoHideDuration: 10000,
        action: (
          <Button
            sx={{ textTransform: "none" }}
            size="small"
            onClick={() => {
              try {
                if (snapshot && snapshot.size) {
                  setEmails((prev) =>
                    prev.map((email) => {
                      const key = String(email.id ?? "");
                      return snapshot.has(key) ? { ...email, labels: snapshot.get(key) } : email;
                    })
                  );
                } else if (isMoving) {
                  if (inCustomLabel) {
                    moveToLabelFrom(matchKeys, toKey, fromKey);
                  } else {
                    moveToLabel(matchKeys, fromKey || "Inbox");
                  }
                } else {
                  removeLabels(matchKeys, [toKey]);
                }
              } catch (error) {
                console.error("Undo failed:", error);
              }
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
    [moveToLabel, moveToLabelFrom, removeLabels, setSnackbar, labels, setEmails]
  );

  const handleOnAfterCreate = (childName, parentKey, isMoving = true) => {
    if (!selectedMessageIds.length) return;

    try {
      // Build the new composite label key
      const newKey = makeKey(childName, parentKey);
      const curMeta = currentLabel ? labels?.[currentLabel] : null;
      const inCustomLabel = curMeta && curMeta.system === false;
      const snapshot = conversationLabelSnapshot();

      if (isMoving) {
        if (inCustomLabel) {
          moveToLabelFrom(selectedMessageIds, currentLabel, newKey);
        } else {
          moveToLabel(selectedMessageIds, newKey);
        }
      } else {
        // Always additive when not moving
        addLabels(selectedMessageIds, [newKey]);
      }

      // Trigger the same undo snackbar as other actions
      showUndoSnackbar(selectedMessageIds, currentLabel, newKey, inCustomLabel, isMoving, snapshot, null, 1);
    } catch (e) {
      setSnackbar({
        open: true,
        message: "Could not move selected conversations.",
        autoHideDuration: 4000,
      });
    }
  };

  const handleMoveToInbox = useCallback(() => {
    const currentLabels = contextRow?.labels || [];
    const isInInbox = currentLabels.includes("Inbox");
    if (isInInbox) return;

    const undo = moveToInbox(selectedMessageIds);
    setSnackbar({
      open: true,
      message: "Conversation moved to inbox.",
      autoHideDuration: 3000,
      action: (
        <Button size="small" onClick={undo}>
          Undo
        </Button>
      ),
    });
  }, [moveToInbox, setSnackbar, contextRow, selectedMessageIds]);

  const handleNotSpam = useCallback(() => {
    const undo = moveToInbox(selectedMessageIds);

    const handleUndo = () => {
      undo();
      setSnackbar({
        open: true,
        message: "Action undone.",
        autoHideDuration: 3000,
        action: null,
      });
    };

    setSnackbar({
      open: true,
      message:
        "Conversation unmarked as spam and moved to the inbox. Future messages from this sender will be sent to the inbox.",
      autoHideDuration: 3000,
      action: (
        <Button size="small" onClick={handleUndo}>
          Undo
        </Button>
      ),
      style: {
        maxWidth: "600px",
      },
    });
  }, [moveToInbox, setSnackbar, selectedMessageIds]);

  const handleDeleteForever = useCallback(() => {
    deleteForever(selectedMessageIds);
  }, [deleteForever, selectedMessageIds]);

  // Helper function to create a custom recipient object
  const createCustomRecipient = useCallback(
    (name, email) => {
      // If the email is the logged in user's email, then return the logged in user object
      if (email === loggedInUser.email || loggedInUser.emails.some((emailObj) => emailObj.value === email)) {
        return {
          ...loggedInUser,
          id: loggedInUser.email,
        };
      }

      // Check if we can find the recipient in the global recipients list
      const restructured = restructureRecipients(recipients.filter((recipient) => recipient.email));
      const foundRecipient = restructured.find((r) => r.email === email);

      if (foundRecipient) {
        return foundRecipient;
      }

      // Create a custom recipient object
      return {
        id: `custom-${email}`,
        name: name || email,
        email: email,
        avatar: null,
        labels: [],
      };
    },
    [loggedInUser, recipients]
  );

  const handleReply = useCallback(
    (threadId) => {
      if (!contextRow) return;

      const sender = contextRow.from;
      const recipientObj = createCustomRecipient(sender.name, sender.email);
      const replySubject = contextRow.subject.startsWith("Re: ") ? contextRow.subject : `Re: ${contextRow.subject}`;

      // Open compose window with reply fields
      addNewComposeWindow(
        null,
        {
          to: [recipientObj],
          subject: replySubject,
          replyingTo: contextRow,
        },
        true
      );
    },
    [contextRow, createCustomRecipient, addNewComposeWindow]
  );

  const handleReplyAll = useCallback(
    (threadId) => {
      if (!contextRow) return;

      const sender = contextRow.from;
      const senderObj = createCustomRecipient(sender.name, sender.email);

      // For reply all, put sender in TO
      const toRecipients = [senderObj];

      // Combine original to and cc lists, filter out the current user and the original sender
      // Note: contextRow.to and contextRow.cc are arrays of email address strings
      const allParticipants = [...(contextRow.to || []), ...(contextRow.cc || [])];

      const ccRecipients = allParticipants
        .filter((email) => {
          // Filter out both the logged-in user and the original sender (already in TO)
          return email !== loggedInUser.email && email !== sender.email;
        })
        .map((email) => createCustomRecipient(email, email));

      const replySubject = contextRow.subject.startsWith("Re: ") ? contextRow.subject : `Re: ${contextRow.subject}`;

      // Open compose window with reply all fields
      addNewComposeWindow(
        null,
        {
          to: toRecipients,
          cc: ccRecipients,
          subject: replySubject,
          replyingTo: contextRow,
        },
        true
      );
    },
    [contextRow, createCustomRecipient, addNewComposeWindow, loggedInUser]
  );

  const buildForwardedHeader = useCallback((email) => {
    const recipientsList = (email.to || [])
      .map((recipient) => {
        if (typeof recipient === "string") {
          return recipient;
        }
        return `${recipient.name || ""} <${recipient.email || ""}>`;
      })
      .join(", ");

    const formattedDate = new Date(email.timestamp).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return `
<p>
<br /><br />
---------- Forwarded message ---------<br />
From: ${email.from.name} <${email.from.email}><br />
Date: ${formattedDate}<br />
Subject: ${email.subject}<br />
To: ${recipientsList}<br />
Cc: ${(email.cc || []).join(", ")}<br />
<br /><br />
${email.body || email.preview || ""}
</p>`;
  }, []);

  const handleForward = useCallback(
    (threadId) => {
      if (!contextRow) return;

      const forwardSubject = contextRow.subject.startsWith("Fwd: ") ? contextRow.subject : `Fwd: ${contextRow.subject}`;

      // Build the forwarded header HTML
      const forwardedHeader = buildForwardedHeader(contextRow);

      // Open compose window with forward fields
      addNewComposeWindow(
        null,
        {
          to: [],
          subject: forwardSubject,
          content: forwardedHeader,
          forwardingTo: contextRow,
        },
        true
      );
    },
    [contextRow, buildForwardedHeader, addNewComposeWindow]
  );

  const handleItemClick = ({ id, event, props }) => {
    const threadId = props.thread.threadId.split(":")[1];
    switch (id) {
      case "archive":
        handleArchive([threadId]);
        break;
      case "delete":
        handleDelete([threadId]);
        break;
      case "mark_as_read":
      case "mark_as_unread":
        handleReadAction(props.thread);
        break;
      case "snooze":
        handleSnoozeAction([threadId]);
        break;
      case "mute":
        handleMuteAction([threadId]);
        break;
      case "move_to_inbox":
        handleMoveToInbox();
        break;
      case "not_spam":
        handleNotSpam();
        break;
      case "delete_forever":
        handleDeleteForever();
        break;
      case "reply":
        handleReply(threadId);
        break;
      case "reply_all":
        handleReplyAll(threadId);
        break;
      case "forward":
        handleForward(threadId);
        break;
      //etc...
    }
  };

  const sectionOneItems =
    folder === "drafts"
      ? []
      : [
          {
            id: "reply",
            label: "Reply",
            icon: "reply",
          },
          {
            id: "reply_all",
            label: "Reply all",
            icon: "reply_all",
          },
          {
            id: "forward",
            label: "Forward",
            icon: "forward",
          },
        ];

  const sectionTwoItems = [
    isSpamFolder
      ? { id: "not_spam", label: "Not Spam", icon: "report_off" }
      : isThreadNotInInbox
      ? { id: "move_to_inbox", label: "Move to inbox", icon: "move_to_inbox" }
      : {
          id: "archive",
          label: "Archive",
          icon: "archive",
        },
    isSpamFolder
      ? { id: "delete_forever", label: "Delete forever", icon: "delete" }
      : {
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
  ];

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
          <Item key={item.id} id={item.id} onClick={handleItemClick} disabled={item.disabled}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px", marginRight: "8px" }}>
              {item.icon}
            </span>
            {item.label}
          </Item>
        ))}

        {sectionOneItems.length > 0 && <Separator />}

        {sectionTwoItems.map((item) => (
          <Item key={item.id} id={item.id} onClick={handleItemClick} disabled={item.disabled}>
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
          onPointerEnter={() => {
            setHoveredSubmenu("moveTo");
          }}
          onPointerLeave={() => {
            setHoveredSubmenu(null);
          }}
        >
          <MoveToSubMenu
            labels={menuItems}
            onSelect={handleMenuItemClick}
            showInbox={isThreadNotInInbox}
            shouldFocus={hoveredSubmenu === "moveTo"}
          />
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
          onPointerEnter={() => setHoveredSubmenu("labelAs")}
          onPointerLeave={() => setHoveredSubmenu(null)}
        >
          <LabelsSubMenu
            selectedIds={selectedIds}
            openCreateLabelDialog={() => {
              setIsMovingToLabel(false);
              openCreateLabelDialog();
            }}
            shouldFocus={hoveredSubmenu === "labelAs"}
          />
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

      <CreateLabelDialog
        open={createOpen}
        onClose={() => {
          toggleCreateOpen();
          setIsMovingToLabel(true); // reset back to default state
        }}
        onAfterCreate={handleOnAfterCreate}
        isMoving={isMovingToLabel}
      />

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
