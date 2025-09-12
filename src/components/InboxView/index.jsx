import React, { useContext, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { GlobalContext } from "../../contexts/GlobalContext";
import ActionBar, { Icon } from "./ActionBar";
import styled from "@emotion/styled";
import { Content } from "./Content";
import { Subject } from "./Subject";
import { Divider } from "@mui/material";
import { Actions } from "./Actions";
import ComposeReply from "../ComposeReply/ComposeReply";

const InboxViewContainer = styled.div`
  padding: 24px;
  width: 100%;
`;

const InnerContainer = styled.div`
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 10rem);
  padding-right: 10px;
  overflow-y: auto;
`;

const InboxView = () => {
  const { threadId, folder, label } = useParams();
  const { emails, normalizedEmails, loggedInUser } = useContext(GlobalContext);
  const responseViewRef = React.useRef();

  const { threadsById, messagesById } = normalizedEmails;

  const emailThread = useMemo(() => {
    if (!emails) return null;
    // IDs in fixtures are numbers; support string compare just in case
    return threadsById[`#thread-f:${threadId}`];
  }, [emails, threadId]);

  if (!emailThread) {
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

  const { messageIds } = emailThread;
  const messages = messageIds.map((id) => messagesById[id]);
  const lastMessage = messages[messages.length - 1];
  const isLastDraft = lastMessage?.labels?.includes("Drafts");
  const displayedMessages = isLastDraft ? messages.slice(0, -1) : messages;
  const lastProperEmail = isLastDraft ? messages[messages.length - 2] : lastMessage;
  const draft = isLastDraft ? lastMessage : null;

  useEffect(() => {
    document.title = `Inbox(2) - ${loggedInUser.email} - MailG`;
  }, []);

  return (
    <InboxViewContainer>
      <ActionBar />
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
    </InboxViewContainer>
  );
};

export default InboxView;
