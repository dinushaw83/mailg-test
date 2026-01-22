import { Box, Button, Divider } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getThread, getThreadRows, normalizeEmails } from "../../utils/emails";

import ActionBar from "./ActionBar";
import ComposeReply from "../ComposeReply/ComposeReply";
import { Content } from "./Content";
import { PanelFooter } from "../EmailList/Footer";
import QuickSettings from "../QuickSettings";
import { Subject } from "./Subject";
import emailService from "../../services/emailService";
import { normalizeLabelName } from "../../hooks/useLabels";
import styled from "@emotion/styled";
import { useGlobalContext } from "../../contexts/GlobalContext";
import useMailActions from "../../hooks/useMailActions";
import { useQuery } from "@tanstack/react-query";

// Mapping of folder keys to display names for document title
const FOLDER_DISPLAY_NAMES = {
  inbox: "Inbox",
  starred: "Starred",
  snoozed: "Snoozed",
  sent: "Sent",
  drafts: "Drafts",
  important: "Important",
  chats: "Chats",
  scheduled: "Scheduled",
  all: "All Mail",
  spam: "Spam",
  trash: "Trash",
};

// Folders that should display unread count in document title
const FOLDERS_WITH_UNREAD_COUNT = new Set(["inbox", "starred", "snoozed", "important", "chats", "all"]);

// Helper function to check if a label exists in labels array (handles both string and object formats)
const hasLabel = (labels, labelName) => {
  if (!Array.isArray(labels)) return false;
  return labels.some((l) => {
    const name = typeof l === "string" ? l : l?.name;
    return name === labelName;
  });
};

const InboxViewContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  width: 100%;
  height: ${(props) => (props.isPreview ? "100%" : "100vh")};
  overflow: hidden;
  background-color: #fff;
  border-radius: 16px;
  min-height: 0;
  min-height: 0;
`;

const ScrollableContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0px 24px 120px 2px;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(95, 99, 104, 0.6) transparent;
  will-change: scroll-position;
  transform: translateZ(0);
  -webkit-overflow-scrolling: touch;
  margin-top: -6px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background-color: rgba(95, 99, 104, 0.6);
    border-radius: 999px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: rgba(95, 99, 104, 0.75);
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

const InnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding-right: 10px;
`;

const SnoozedBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  margin: 0 -24px 0 -2px;
  padding-left: 26px;
`;

const SnoozedText = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #3c4043;
`;

const UnsnoozeButton = styled.button`
  color: #1a73e8;
  font-size: 14px;
  font-weight: 500;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;

  &:hover {
    background-color: rgba(26, 115, 232, 0.04);
  }
`;

const DetailContainer = styled.div`
  overflow: hidden;
  flex: 1;
  display: flex;
  max-width: 100%;
  border-radius: 16px;
  background-color: #fff;
`;

const NotFoundContainer = styled.div`
  flex: 1;
  padding: 24px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow-y: auto;
  border-radius: 0;
  background-color: inherit;
`;

export const EmailContent = ({
  thread_id,
  folder,
  label,
  showActionBar = true,
  isPreview = false,
  markAsReadAfter = 3000,
  emails,
  normalizedEmails,
}) => {
  const responseViewRef = React.useRef();
  const { markRead, snooze, unsnooze } = useMailActions();
  const { setSnackbar, loggedInUser } = useGlobalContext();

  const { messagesById } = normalizedEmails;

  const thread = useMemo(() => {
    if (!emails || emails.length === 0) return null;
    return getThread(emails, { thread_id });
  }, [emails, thread_id]);

  // Check if thread is snoozed - check thread level, then check individual emails
  const snoozeUntil = useMemo(() => {
    // First check thread-level snooze
    if (thread?.snooze_until || thread?.snoozeUntil) {
      return thread.snooze_until || thread.snoozeUntil;
    }
    // Then check individual emails for snooze_until
    if (emails && emails.length > 0) {
      for (const email of emails) {
        if (email.snooze_until || email.snoozeUntil) {
          return email.snooze_until || email.snoozeUntil;
        }
      }
    }
    return null;
  }, [thread, emails]);

  // Only show as snoozed if the snooze time is in the future
  // Note: Not using useMemo so it always checks against current time on each render
  const isSnoozed = (() => {
    if (!snoozeUntil) return false;
    const snoozeDate = new Date(snoozeUntil);
    return !isNaN(snoozeDate.getTime()) && snoozeDate > new Date();
  })();

  // Format snooze time for display
  const formatSnoozeTime = useCallback((snoozeDate) => {
    if (!snoozeDate) {
      return "";
    }

    const date = new Date(snoozeDate);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    if (isToday) {
      return `Today, ${timeStr}`;
    }

    if (isTomorrow) {
      return `Tomorrow, ${timeStr}`;
    }

    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const yearSuffix = date.getFullYear() !== now.getFullYear() ? `, ${date.getFullYear()}` : "";
    return `${dateStr}, ${timeStr}${yearSuffix}`;
  }, []);

  const handleUnsnooze = useCallback(() => {
    if (thread?.thread_id) {
      // Capture the current snooze time for undo
      const prevSnoozeTime = snoozeUntil;

      unsnooze([], {}, [thread.thread_id]);

      const undo = () => {
        if (prevSnoozeTime) {
          const when = new Date(prevSnoozeTime);
          if (!isNaN(when.getTime())) {
            snooze([], when, [thread.thread_id]);
          }
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
        message: "Conversation unsnoozed.",
        autoHideDuration: 8000,
        action: (
          <Button sx={{ textTransform: "none" }} size="small" onClick={undo}>
            Undo
          </Button>
        ),
      });
    }
  }, [thread?.thread_id, snoozeUntil, snooze, unsnooze, setSnackbar]);

  useEffect(() => {
    if (!markAsReadAfter) return undefined;

    const timeoutId = setTimeout(() => {
      markRead([thread_id], true);
    }, markAsReadAfter);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [markAsReadAfter, thread_id, markRead]);

  if (!thread) {
    return (
      <InboxViewContainer isPreview={isPreview}>
        {showActionBar && <ActionBar thread={thread} />}
        <ScrollableContent>
          <Box
            sx={{
              paddingTop: "3em",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "1rem",
            }}
          >
            No conversations selected
          </Box>
          {isPreview && <PanelFooter />}
        </ScrollableContent>
      </InboxViewContainer>
    );
  }

  const { messageIds } = thread;
  const messages = messageIds.map((id) => messagesById[id]);
  
  // Get the last message whose sender_email is not equal to the logged in user's email
  const lastProperEmail = useMemo(() => {
    // If loggedInUser or email is not available, fall back to original behavior
    if (!loggedInUser || !loggedInUser.email) {
      return messages[messages.length - 1];
    }
    
    // Filter messages to exclude those from the logged in user
    const messagesFromOthers = messages.filter((message) => {
      const senderEmail = message?.sender_email;
      return senderEmail && senderEmail.toLowerCase() !== loggedInUser.email.toLowerCase();
    });
    
    // If there are messages from others, return the last one; otherwise fall back to original last message
    return messagesFromOthers.length > 0 
      ? messagesFromOthers[messagesFromOthers.length - 1]
      : messages[messages.length - 1];
  }, [messages, loggedInUser]);
  
  const lastMessage = messages[messages.length - 1];
  const isLastDraft = lastMessage?.folder === "drafts";
  const isLastScheduled = hasLabel(lastMessage?.labels, "Scheduled");
  const displayedMessages = isLastDraft ? messages.slice(0, -1) : messages;
  // const lastProperEmail = isLastDraft ? messages[messages.length - 2] : lastMessage;
  const draft = isLastDraft ? lastMessage : null;

  return (
    <InboxViewContainer isPreview={isPreview}>
      {showActionBar && <ActionBar thread={thread} emails={emails} />}
      <ScrollableContent>
        {isSnoozed && (
          <SnoozedBanner>
            <SnoozedText>
              <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#5f6368" }}>
                schedule
              </span>
              Snoozed until {formatSnoozeTime(snoozeUntil)}
            </SnoozedText>
            <UnsnoozeButton onClick={handleUnsnooze}>Unsnooze</UnsnoozeButton>
          </SnoozedBanner>
        )}
        <InnerContainer>
          <Subject subject={messages[0].subject} message={messages[0]} />
          {displayedMessages.map((message, index) => {
            // Combine to and cc recipients for display
            const recipients = [...(message.to || []), ...(message.cc || [])];
            return (
              <React.Fragment key={message.id}>
                <Content
                  id={JSON.stringify(message.id)}
                  body={message.body}
                  timestamp={message.timestamp}
                  senderName={message.from.name}
                  senderEmail={message.from.email}
                  recipients={recipients}
                  attachments={message.attachments}
                  embeddedImages={message.embeddedImages}
                  isScheduled={hasLabel(message.labels, "Scheduled")}
                  scheduledDate={message.scheduledDate}
                  scheduledTime={message.scheduledTime}
                  emailId={message.id}
                  email={message}
                  responseViewRef={responseViewRef}
                />
                {index < displayedMessages.length - 1 && <Divider sx={{ marginTop: 3, marginBottom: 3 }} />}
              </React.Fragment>
            );
          })}
          {/* <Actions /> */}
          {!isLastScheduled && <ComposeReply ref={responseViewRef} email={lastProperEmail} draft={draft} />}
        </InnerContainer>
        {/* {isPreview && <PanelFooter />} */}
      </ScrollableContent>
    </InboxViewContainer>
  );
};

const InboxView = () => {
  const { thread_id, folder, label } = useParams();
  const { loggedInUser } = useGlobalContext();
  const { markRead } = useMailActions();
  const [shouldMarkUnreadEmailsAsRead, setShouldMarkUnreadEmailsAsRead] = useState(true);

  // Always fetch thread from API when thread_id exists
  const { data: fetchedThreadEmails, isLoading: isEmailLoading } = useQuery({
    queryKey: ["email", thread_id],
    queryFn: () => emailService.getEmail(thread_id),
    enabled: !!thread_id, // Always fetch if thread_id exists
    staleTime: 0, // Always refetch to ensure fresh data after interactions
    refetchOnMount: true, // Refetch when component mounts
  });

  // Use only fetched emails from API
  const allEmails = useMemo(() => {
    if (!fetchedThreadEmails || !Array.isArray(fetchedThreadEmails) || fetchedThreadEmails.length === 0) {
      return [];
    }
    return fetchedThreadEmails;
  }, [fetchedThreadEmails]);

  // Normalize emails from API
  const normalizedEmailsFromAPI = useMemo(() => {
    if (!allEmails || allEmails.length === 0) {
      return { messagesById: {}, threadsById: {}, thread_ids: [] };
    }
    return normalizeEmails(allEmails);
  }, [allEmails]);

  // Get thread from API emails
  const thread = useMemo(() => {
    if (!thread_id || !allEmails || allEmails.length === 0) return null;
    return getThread(allEmails, { thread_id });
  }, [allEmails, thread_id]);

  // Mark unread emails as read
  const markUnreadEmailsAsRead = useCallback(
    (messages) => {
      // Get the unread emails ids
      const unreadEmailsIds = messages.filter((email) => !email.is_read).map((email) => email.id);

      // If there are unread emails, mark them as read
      if (unreadEmailsIds.length > 0) {
        markRead(unreadEmailsIds);
      }
    },
    [markRead]
  );

  // useEffect(() => {
  //   if (!shouldMarkUnreadEmailsAsRead) return;

  //   // Build document title with email subject and folder/label context
  //   if (thread && messageIds.length > 0) {
  //     const messages = messageIds.map((id) => messagesById[id]);
  //     const subject = messages[0]?.subject || "No Subject";

  //     // Get folder or label display name with unread count
  //     let context = "";
  //     if (label) {
  //       // Handle label routes
  //       const threads = getThreadRows(emails, { label });
  //       const unreadCount = threads.filter((thread) => thread.unreadCount > 0).length;
  //       const unreadText = unreadCount > 0 ? ` (${unreadCount})` : "";
  //       context = ` - "${normalizeLabelName(label)}"${unreadText}`;
  //     } else if (folder) {
  //       // Handle folder routes
  //       const folderDisplayName = FOLDER_DISPLAY_NAMES[folder] || folder;

  //       // Add unread count if applicable
  //       if (FOLDERS_WITH_UNREAD_COUNT.has(folder)) {
  //         const threads = getThreadRows(emails, { folder });
  //         const unreadCount = threads.filter((thread) => thread.unreadCount > 0).length;
  //         const unreadText = unreadCount > 0 ? ` (${unreadCount})` : "";
  //         context = ` - ${folderDisplayName}${unreadText}`;
  //       } else {
  //         context = ` - ${folderDisplayName}`;
  //       }
  //     }

  //     document.title = `${subject}${context} - ${loggedInUser.email} - MailG`;

  //     // Mark unread emails in the email thread as read
  //     markUnreadEmailsAsRead(messages);
  //   }

  //   setShouldMarkUnreadEmailsAsRead(false);
  // }, [messageIds.length, messagesById, markUnreadEmailsAsRead, emails, loggedInUser.email, folder, label, thread]);

  // const thread = useMemo(() => {
  //   return getThread(emails, { thread_id: `#thread-f:${thread_id}` });
  // }, [emails, thread_id]);

  // const { messageIds } = thread;
  useEffect(() => {
    if (!shouldMarkUnreadEmailsAsRead) return;
    // Build document title with email subject and folder/label context
    if (thread) {
      const messageIds = thread.messageIds || [];
      if (messageIds.length > 0) {
        const messages = messageIds.map((id) => normalizedEmailsFromAPI.messagesById[id]);
        const subject = messages[0]?.subject || "No Subject";

        // Get folder or label display name
        let context = "";
        if (label) {
          context = ` - "${normalizeLabelName(label)}"`;
        } else if (folder) {
          const folderDisplayName = FOLDER_DISPLAY_NAMES[folder] || folder;
          context = ` - ${folderDisplayName}`;
        }

        document.title = `${subject}${context} - ${loggedInUser.email} - MailG`;

        // Mark unread emails in the email thread as read
        markUnreadEmailsAsRead(messages);
      }
    }

    setShouldMarkUnreadEmailsAsRead(false);
  }, [
    thread,
    normalizedEmailsFromAPI.messagesById,
    loggedInUser.email,
    folder,
    label,
    markUnreadEmailsAsRead,
    shouldMarkUnreadEmailsAsRead,
  ]);

  // Show loading state while fetching email
  if (!thread && isEmailLoading) {
    return (
      <DetailContainer>
        <NotFoundContainer>
          <h2 style={{ margin: 0 }}>Loading email...</h2>
        </NotFoundContainer>
        <QuickSettings />
      </DetailContainer>
    );
  }

  // Show not found if thread still doesn't exist after fetch
  if (!thread) {
    // Determine the back link based on current context
    const backLink = label ? `/label/${encodeURIComponent(label)}` : `/${folder || "inbox"}`;
    const backText = label ? `Label: ${label}` : folder || "Inbox";

    return (
      <DetailContainer>
        <NotFoundContainer>
          <h2 style={{ margin: 0 }}>Email not found</h2>
          <p style={{ marginTop: 8 }}>
            The message you're looking for doesn't exist. Go back to <Link to={backLink}>{backText}</Link>.
          </p>
        </NotFoundContainer>
        <QuickSettings />
      </DetailContainer>
    );
  }

  return (
    <DetailContainer>
      <EmailContent
        id={thread_id}
        thread_id={thread_id}
        folder={folder}
        label={label}
        emails={allEmails}
        normalizedEmails={normalizedEmailsFromAPI}
      />
      <QuickSettings />
    </DetailContainer>
  );
};

export default InboxView;
