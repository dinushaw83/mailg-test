import styled from "@emotion/styled";
import React from "react";
import Avatar from "@mui/material/Avatar";
import { Icon } from "./ActionBar";
import { Divider } from "@mui/material";
import { Attachments } from "./Attachments";

const ProfileImageContainer = styled.div`
  width: 5rem;
  display: flex;
  justify-content: center;
`;

const ContentContainer = styled.div`
  display: flex;
`;

const BodyContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
`;

const SenderContainer = styled.div`
  display: flex;
  align-items: center;
`;

const SenderName = styled.div`
  font-size: 0.875rem;
  color: #1f1f1f;
  line-height: 20px;
  font-weight: bold;
  white-space: nowrap;
  margin-right: 0.5rem;
`;

const SenderEmail = styled.div`
  color: #5e5e5e;
  font-size: 0.75rem;
  letter-spacing: normal;
  line-height: 20px;
`;

const Sender = ({ name, email }) => {
  return (
    <SenderContainer>
      <SenderName>{name}</SenderName>
      <SenderEmail>&lt;{email}&gt;</SenderEmail>
    </SenderContainer>
  );
};

const RecipientContainer = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  color: #5e5e5e;
`;

const RecipientName = styled.div`
  margin-right: 5px;
`;

const Recipient = () => {
  return (
    <RecipientContainer>
      <RecipientName>to me</RecipientName>
      <Icon
        name="arrow_drop_down"
        style={{
          borderRadius: "5px",
          width: "18px",
          height: "18px",
          padding: "0px",
        }}
      />
    </RecipientContainer>
  );
};

const TopBarContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 1.25rem;
`;

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
`;

const TimeContainer = styled.div`
  margin-right: 0.5rem;
  line-height: 20px;
  font-size: 0.75rem;
  letter-spacing: normal;
  color: #5e5e5e;
`;

const Time = ({ timestamp }) => {
  if (!timestamp) {
    return null;
  }
  const date = new Date(timestamp);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
  const diffMinutes = Math.ceil(diffTime / (1000 * 60));
  const diffSeconds = Math.ceil(diffTime / 1000);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return <div>Invalid Date</div>;
  }

  // Format time as HH:MM
  const timeString = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // Format relative time
  let relativeTime;
  if (diffDays > 0) {
    relativeTime = `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    relativeTime = `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMinutes > 0) {
    relativeTime = `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  } else {
    relativeTime = `${diffSeconds} second${diffSeconds > 1 ? "s" : ""} ago`;
  }

  return (
    <TimeContainer>
      {timeString} ({relativeTime})
    </TimeContainer>
  );
};

const TopBar = ({ timestamp, senderName, senderEmail }) => {
  return (
    <TopBarContainer>
      <div>
        <Sender name={senderName} email={senderEmail} />
        <Recipient />
      </div>
      <ActionsContainer>
        <Time timestamp={timestamp} />
        <Icon name="star" label="Not starred" />
        <Icon name="mood" label="Add a reaction" />
        <Icon name="reply" label="Reply" />
        <Icon name="more_vert" label="More" />
      </ActionsContainer>
    </TopBarContainer>
  );
};

const EmailHtmlBody = ({ body }) => {
  return <div dangerouslySetInnerHTML={{ __html: body }} />;
};

export const Content = ({ body, timestamp, senderName, senderEmail, attachments }) => {
  return (
    <ContentContainer>
      <ProfileImageContainer>
        <Avatar>{senderName.charAt(0)}</Avatar>
      </ProfileImageContainer>
      <BodyContainer>
        <TopBar timestamp={timestamp} senderName={senderName} senderEmail={senderEmail} />
        <EmailHtmlBody body={body} />
        <Attachments attachments={attachments} />
      </BodyContainer>
    </ContentContainer>
  );
};
