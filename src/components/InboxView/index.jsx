import React, { useContext, useMemo, useEffect, useCallback, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { GlobalContext } from "../../contexts/GlobalContext";
import ActionBar from "./ActionBar";
import styled from "@emotion/styled";
import { Content } from "./Content";
import { Subject } from "./Subject";
import { Box, Divider } from "@mui/material";
import { getThread, getThreadRows } from "../../utils/emails";

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
import ComposeReply from "../ComposeReply/ComposeReply";
import { PanelFooter } from "../EmailList/Footer";
import useMailActions from "../../hooks/useMailActions";
import QuickSettings from "../QuickSettings";
import { normalizeLabelName } from "../../hooks/useLabels";

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
  threadId,
  folder,
  label,
  showActionBar = true,
  isPreview = false,
  markAsReadAfter = 3000,
}) => {
  const { emails, normalizedEmails } = useContext(GlobalContext);
  const responseViewRef = React.useRef();
  const { markRead } = useMailActions();

  const { messagesById } = normalizedEmails;

  const thread = useMemo(() => {
    return getThread(emails, { threadId: `#thread-f:${threadId}` });
  }, [emails, threadId]);

  useEffect(() => {
    if (!markAsReadAfter) return undefined;

    const timeoutId = setTimeout(() => {
      markRead([threadId], true);
    }, markAsReadAfter);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [markAsReadAfter, threadId, markRead]);

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
  const lastMessage = messages[messages.length - 1];
  const isLastDraft = lastMessage?.labels?.includes("Drafts");
  const isLastScheduled = lastMessage?.labels?.includes("Scheduled");
  const displayedMessages = isLastDraft ? messages.slice(0, -1) : messages;
  const lastProperEmail = isLastDraft ? messages[messages.length - 2] : lastMessage;
  const draft = isLastDraft ? lastMessage : null;

  return (
    <InboxViewContainer isPreview={isPreview}>
      {showActionBar && <ActionBar thread={thread} />}
      <ScrollableContent>
        <InnerContainer>
          <Subject subject={messages[0].subject} message={messages[0]} />
          {displayedMessages.map((message, index) => (
            <React.Fragment key={message.id}>
              <Content
                body={message.body}
                timestamp={message.timestamp}
                senderName={message.from.name}
                senderEmail={message.from.email}
                recipients={message.to}
                attachments={message.attachments}
                embeddedImages={message.embeddedImages}
                isScheduled={message.labels?.includes("Scheduled")}
                scheduledDate={message.scheduledDate}
                scheduledTime={message.scheduledTime}
                emailId={message.id}
              />
              {index < displayedMessages.length - 1 && <Divider sx={{ marginTop: 3, marginBottom: 3 }} />}
            </React.Fragment>
          ))}
          {/* <Actions /> */}
          {!isLastScheduled && <ComposeReply ref={responseViewRef} email={lastProperEmail} draft={draft} />}
        </InnerContainer>
        {/* {isPreview && <PanelFooter />} */}
      </ScrollableContent>
    </InboxViewContainer>
  );
};

const InboxView = () => {
  const { threadId, folder, label } = useParams();
  const { emails, normalizedEmails, loggedInUser } = useContext(GlobalContext);
  const { markRead } = useMailActions();
  const { messagesById } = normalizedEmails;
  const [shouldMarkUnreadEmailsAsRead, setShouldMarkUnreadEmailsAsRead] = useState(true);

  // Mark unread emails as read
  const markUnreadEmailsAsRead = useCallback(
    (messages) => {
      // Get the unread emails ids
      const unreadEmailsIds = messages.filter((email) => !email.read).map((email) => email.id);

      // If there are unread emails, mark them as read
      if (unreadEmailsIds.length > 0) {
        markRead(unreadEmailsIds);
      }
    },
    [markRead]
  );

  const thread = useMemo(() => {
    return getThread(emails, { threadId: `#thread-f:${threadId}` });
  }, [emails, threadId]);

  const { messageIds } = thread;

  useEffect(() => {
    if (!shouldMarkUnreadEmailsAsRead) return;

    // Build document title with email subject and folder/label context
    if (thread && messageIds.length > 0) {
      const messages = messageIds.map((id) => messagesById[id]);
      const subject = messages[0]?.subject || "No Subject";

      // Get folder or label display name with unread count
      let context = "";
      if (label) {
        // Handle label routes
        const threads = getThreadRows(emails, { label });
        const unreadCount = threads.filter((thread) => thread.unreadCount > 0).length;
        const unreadText = unreadCount > 0 ? ` (${unreadCount})` : "";
        context = ` - "${normalizeLabelName(label)}"${unreadText}`;
      } else if (folder) {
        // Handle folder routes
        const folderDisplayName = FOLDER_DISPLAY_NAMES[folder] || folder;

        // Add unread count if applicable
        if (FOLDERS_WITH_UNREAD_COUNT.has(folder)) {
          const threads = getThreadRows(emails, { folder });
          const unreadCount = threads.filter((thread) => thread.unreadCount > 0).length;
          const unreadText = unreadCount > 0 ? ` (${unreadCount})` : "";
          context = ` - ${folderDisplayName}${unreadText}`;
        } else {
          context = ` - ${folderDisplayName}`;
        }
      }

      document.title = `${subject}${context} - ${loggedInUser.email} - MailG`;

      // Mark unread emails in the email thread as read
      markUnreadEmailsAsRead(messages);
    }

    setShouldMarkUnreadEmailsAsRead(false);
  }, [messageIds.length, messagesById, markUnreadEmailsAsRead, emails, loggedInUser.email, folder, label, thread]);

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
      <EmailContent threadId={threadId} folder={folder} label={label} />
      <QuickSettings />
    </DetailContainer>
  );
};

export default InboxView;
