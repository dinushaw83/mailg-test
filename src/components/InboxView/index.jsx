import React, { useContext, useMemo, useEffect, useCallback, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { GlobalContext } from "../../contexts/GlobalContext";
import ActionBar from "./ActionBar";
import styled from "@emotion/styled";
import { Content } from "./Content";
import { Subject } from "./Subject";
import { Box, Divider } from "@mui/material";
import { getThread } from "../../utils/emails";
import ComposeReply from "../ComposeReply/ComposeReply";
import { PanelFooter } from "../EmailList/Footer";
import useMailActions from "../../hooks/useMailActions";

const InboxViewContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: ${(props) => (props.isPreview ? "100%" : "100vh")};
  overflow: hidden;
  background-color: #fff;
  border-radius: 16px;
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

export const EmailContent = ({
  threadId,
  folder,
  label,
  showActionBar = true,
  isPreview = false,
  markAsReadAfter = 3000,
}) => {
  const { emails, normalizedEmails, loggedInUser, setEmails } = useContext(GlobalContext);
  const responseViewRef = React.useRef();
  const { markRead } = useMailActions();

  const { messagesById } = normalizedEmails;

  const thread = useMemo(() => {
    return getThread(emails, { threadId: `#thread-f:${threadId}` });
  }, [emails, threadId]);

  useEffect(() => {
    let timeoutId = null;
    if (markAsReadAfter) {
      timeoutId = setTimeout(() => {
        markRead([threadId], true);
      }, markAsReadAfter);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [markAsReadAfter, threadId]);

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
        {isPreview && <PanelFooter />}
      </ScrollableContent>
    </InboxViewContainer>
  );
};

const InboxView = () => {
  const { threadId, folder, label } = useParams();
  const { emails, normalizedEmails, loggedInUser } = useContext(GlobalContext);
  const { markRead } = useMailActions();
  const { messagesById } = normalizedEmails;

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

  useEffect(() => {
    // Calculate total unread emails count
    const unreadCount = emails.filter((email) => !email.read).length;
    const unreadText = unreadCount > 0 ? `(${unreadCount})` : "";
    document.title = `Inbox ${unreadText} - ${loggedInUser.email} - MailG`;

    if (!thread) return;

    const { messageIds } = thread;

    // Mark unread emails in the email thread as read
    const messages = messageIds.map((id) => messagesById[id]);
    markUnreadEmailsAsRead(messages);
  }, [thread, messagesById, markUnreadEmailsAsRead, emails, loggedInUser.email]);

  if (!thread) {
    // Determine the back link based on current context
    const backLink = label ? `/label/${encodeURIComponent(label)}` : `/${folder || "inbox"}`;
    const backText = label ? `Label: ${label}` : folder || "Inbox";

    return (
      <div className="nH bkK" style={{ padding: 24 }}>
        <h2 style={{ margin: 0 }}>Email not found</h2>
        <p style={{ marginTop: 8 }}>
          The message you're looking for doesn't exist. Go back to <Link to={backLink}>{backText}</Link>.
        </p>
      </div>
    );
  }

  return <EmailContent threadId={threadId} folder={folder} label={label} />;
};

export default InboxView;
