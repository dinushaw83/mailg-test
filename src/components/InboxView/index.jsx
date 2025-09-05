import React, { useContext, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { GlobalContext } from "../../contexts/GlobalContext";
import ActionBar, { Icon } from "./ActionBar";
import styled from "@emotion/styled";
import { Content } from "./Content";
import { Subject } from "./Subject";
import { Divider } from "@mui/material";
import { Actions } from "./Actions";

const InboxViewContainer = styled.div`
  padding: 24px;
  width: 100%;
`;

const InnerContainer = styled.div`
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 10rem);
`;

const InboxView = () => {
  const { threadId } = useParams();
  const { emails, normalizedEmails } = useContext(GlobalContext);

  const { threadsById, messagesById } = normalizedEmails;

  const emailThread = useMemo(() => {
    if (!emails) return null;
    // IDs in fixtures are numbers; support string compare just in case
    return threadsById[`#thread-f:${threadId}`];
  }, [emails, threadId]);

  if (!emailThread) {
    return (
      <div className="nH bkK" style={{ padding: 24 }}>
        <h2 style={{ margin: 0 }}>Email not found</h2>
        <p style={{ marginTop: 8 }}>
          The message you’re looking for doesn’t exist. Go back to <Link to="/">Inbox</Link>.
        </p>
      </div>
    );
  }

  const { messageIds } = emailThread;
  const messages = messageIds.map((id) => messagesById[id]);

  return (
    <InboxViewContainer>
      <ActionBar />
      <InnerContainer>
        <Subject subject={messages[0].subject} />
        {messages.map((message, index) => (
          <>
            <Content
              body={message.body}
              timestamp={message.timestamp}
              senderName={message.from.name}
              senderEmail={message.from.email}
              attachments={message.attachments}
            />
            {index < messages.length - 1 && <Divider sx={{ marginTop: 3, marginBottom: 3 }} />}
          </>
        ))}
        <Actions />
      </InnerContainer>
    </InboxViewContainer>
  );
};

export default InboxView;
