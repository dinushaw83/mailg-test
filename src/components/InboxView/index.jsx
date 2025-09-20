import React, { useContext, useMemo, useEffect } from "react";
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
  padding: 24px;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(95, 99, 104, 0.6) transparent;

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
  const { emails, normalizedEmails } = useContext(GlobalContext);
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

  if (!threadId && isPreview) {
    return (
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
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
        <PanelFooter />
      </Box>
    );
  }

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

  const { messageIds } = thread;
  const messages = messageIds.map((id) => messagesById[id]);
  const lastMessage = messages[messages.length - 1];
  const isLastDraft = lastMessage?.labels?.includes("Drafts");
  const displayedMessages = isLastDraft ? messages.slice(0, -1) : messages;
  const lastProperEmail = isLastDraft ? messages[messages.length - 2] : lastMessage;
  const draft = isLastDraft ? lastMessage : null;

  return (
    <InboxViewContainer>
      {showActionBar && <ActionBar thread={thread} />}
      <InnerContainer>
        <Subject subject={messages[0].subject} />
        {displayedMessages.map((message, index) => (
          <React.Fragment key={message.id}>
            <Content
              body={message.body}
              timestamp={message.timestamp}
              senderName={message.from.name}
              senderEmail={message.from.email}
              attachments={message.attachments}
            />
            {index < displayedMessages.length - 1 && <Divider sx={{ marginTop: 3, marginBottom: 3 }} />}
          </React.Fragment>
        ))}
        {/* <Actions /> */}
        <ComposeReply ref={responseViewRef} email={lastProperEmail} draft={draft} />
      </InnerContainer>
      {isPreview && <PanelFooter />}
    </InboxViewContainer>
  );
};

const InboxView = () => {
  const { threadId, folder, label } = useParams();
  const { loggedInUser } = useContext(GlobalContext);

  useEffect(() => {
    document.title = `Inbox(2) - ${loggedInUser.email} - MailG`;
  }, []);

  return <EmailContent threadId={threadId} folder={folder} label={label} />;
};

export default InboxView;
