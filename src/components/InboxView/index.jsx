import React, { useContext, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { GlobalContext } from "../../contexts/GlobalContext";
import ActionBar, { Icon } from "./ActionBar";
import styled from "@emotion/styled";
import { Content } from "./Content";
import { Subject } from "./Subject";

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
  const { inboxId } = useParams();
  const { state } = useContext(GlobalContext);
  const emails = state?.emails || [];

  const email = useMemo(() => {
    if (!state?.emails) return null;
    // IDs in fixtures are numbers; support string compare just in case
    return emails.find((e) => String(e.id) === String(inboxId));
  }, [state?.emails, inboxId]);

  if (!email) {
    return (
      <div className="nH bkK" style={{ padding: 24 }}>
        <h2 style={{ margin: 0 }}>Email not found</h2>
        <p style={{ marginTop: 8 }}>
          The message you’re looking for doesn’t exist. Go back to{" "}
          <Link to="/">Inbox</Link>.
        </p>
      </div>
    );
  }

  console.log({ email });

  return (
    <InboxViewContainer>
      <ActionBar />
      <InnerContainer>
        <Subject email={email} />
        <Content
          body={email.body}
          timestamp={email.timestamp}
          senderName={email.from.name}
          senderEmail={email.from.email}
        />
      </InnerContainer>
    </InboxViewContainer>
  );
};

export default InboxView;
