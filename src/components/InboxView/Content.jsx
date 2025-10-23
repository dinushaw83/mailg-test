import styled from "@emotion/styled";
import React, { useContext, useMemo, useState, useEffect } from "react";
import Avatar from "@mui/material/Avatar";
import { Icon } from "./ActionBar";
import { Attachments } from "./Attachments";
import ContactPopup from "../Contacts/ContactPopup";
import { GlobalContext, useGlobalContext } from "../../contexts/GlobalContext";
import { getEmbeddedImage, processHtmlForDisplay, extractEmbeddedImageIds } from "../../utils/embeddedImages";

const ProfileImageContainer = styled.div`
  width: 5rem;
  display: flex;
  justify-content: center;
`;

const ContentContainer = styled.div`
  display: flex;
  contain: layout style paint;
`;

const BodyContainer = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  contain: layout style paint;
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

const Recipient = ({ toList = [], folder }) => {
  const { loggedInUser } = useGlobalContext();
  const isSent = (folder || "").toLowerCase() === "sent";
  let displayTo = "me";
  if (isSent) {
    displayTo = Array.isArray(toList) && toList.length > 0 ? toList.join(", ") : "";
  } else if (Array.isArray(toList) && toList.includes(loggedInUser.email)) {
    displayTo = "me";
  } else if (Array.isArray(toList) && toList.length > 0) {
    displayTo = toList[0];
  }
  return (
    <RecipientContainer>
      <RecipientName>to {displayTo}</RecipientName>
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

const TopBar = ({ timestamp, senderName, senderEmail, toList = [], folder, onReply }) => {
  const { recipients, loggedInUser } = useGlobalContext();

  const senderContact = useMemo(() => {
    // Check if sender email is of logged in user
    if (senderEmail === loggedInUser.email) {
      return loggedInUser;
    }

    // Check if sender email is present in recipients emails array
    const found = recipients.find((recipient) => recipient.emails.some((email) => email.value === senderEmail));
    if (found) {
      return found;
    }

    // If not found, then return a custom contact object
    return { name: senderName, email: senderEmail, id: `custom-${senderEmail}` };
  }, [recipients, senderName, senderEmail]);

  return (
    <TopBarContainer>
      <div>
        <ContactPopup contact={{ ...senderContact, email: senderEmail }}>
          <Sender name={senderName} email={senderEmail} />
        </ContactPopup>
        <Recipient toList={toList} folder={folder} />
      </div>
      <ActionsContainer>
        <Time timestamp={timestamp} />
        <Icon name="star" label="Not starred" />
        <Icon name="mood" label="Add a reaction" />
        <Icon name="reply" label="Reply" onClick={onReply} />
        <Icon name="more_vert" label="More" />
      </ActionsContainer>
    </TopBarContainer>
  );
};

const ScheduledMessage = ({ scheduledDate, scheduledTime, emailId }) => {
  const { emails, setEmails, setSnackbar } = useContext(GlobalContext);

  // Format the scheduled date and time
  const formatScheduledDateTime = (dateStr, timeStr) => {
    const date = new Date(dateStr);

    // Format date as "Mon, Sep 29"
    const dateOptions = {
      weekday: "short",
      month: "short",
      day: "numeric",
    };
    const formattedDate = date.toLocaleDateString("en-US", dateOptions);

    // Simply use the time string as-is
    const formattedTime = timeStr;

    return `${formattedDate}, ${formattedTime}`;
  };

  const scheduledDateTime = formatScheduledDateTime(scheduledDate, scheduledTime);

  // Handle cancel send - convert scheduled email back to draft
  const handleCancelSend = () => {
    setEmails((prevEmails) => {
      return prevEmails.map((email) => {
        if (email.id.toString() === emailId) {
          return {
            ...email,
            labels: ["Drafts"],
            labelColor: "#e1e3e1",
            timestamp: new Date().toISOString(),
            timeDisplay: new Date().toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
            scheduledDate: undefined,
            scheduledTime: undefined,
          };
        }
        return email;
      });
    });

    // Show confirmation message
    setSnackbar({
      open: true,
      message: "Send canceled. Message moved to drafts.",
      action: null,
      autoHideDuration: 3000,
    });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        backgroundColor: "#f5f5f5",
        padding: "8px 12px",
      }}
    >
      {/* Icon with paper airplane and clock overlay */}
      <div
        style={{
          position: "relative",
          marginRight: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Paper airplane icon */}
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: "20px",
            color: "#5f6368",
            position: "relative",
            zIndex: 1,
          }}
        >
          send
        </span>
        {/* Clock overlay */}
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: "12px",
            color: "#5f6368",
            position: "absolute",
            bottom: "-2px",
            right: "-2px",
            backgroundColor: "#f5f5f5",
            borderRadius: "50%",
            padding: "1px",
          }}
        >
          schedule
        </span>
      </div>

      {/* Message text */}
      <span
        style={{
          flex: 1,
          fontSize: "14px",
          color: "#3c4043",
          fontWeight: "400",
        }}
      >
        Send scheduled for {scheduledDateTime}
      </span>

      {/* Cancel send button */}
      <button
        onClick={handleCancelSend}
        style={{
          color: "#1a73e8",
          fontSize: "14px",
          fontWeight: "500",
          textTransform: "none",
          padding: "4px 8px",
          minWidth: "auto",
          border: "none",
          background: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "rgba(26, 115, 232, 0.04)";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "transparent";
        }}
      >
        Cancel send
      </button>
    </div>
  );
};

const EmailHtmlBody = React.memo(({ body, embeddedImages = [] }) => {
  const { db } = useContext(GlobalContext);
  const [processedBody, setProcessedBody] = useState(body);

  useEffect(() => {
    if (!db) {
      setProcessedBody(body);
      return;
    }

    const processBody = async () => {
      try {
        // Extract image IDs from the HTML content
        const imageIds = extractEmbeddedImageIds(body);

        if (imageIds.length === 0) {
          setProcessedBody(body);
          return;
        }

        // Get embedded images from IndexedDB
        const imageData = await Promise.all(
          imageIds.map(async (imageId) => {
            try {
              const image = await getEmbeddedImage(db, imageId);
              return image;
            } catch (error) {
              console.warn(`Failed to load embedded image ${imageId}:`, error);
              return null;
            }
          })
        );

        const validImages = imageData.filter(Boolean);

        // Replace placeholder URLs with actual object URLs
        const processed = processHtmlForDisplay(body, validImages);
        setProcessedBody(processed);
      } catch (error) {
        console.error("Failed to process embedded images:", error);
        setProcessedBody(body);
      }
    };

    processBody();
  }, [body, embeddedImages, db]);

  return <div dangerouslySetInnerHTML={{ __html: processedBody }} />;
});

export const Content = React.memo(
  ({
    body,
    timestamp,
    senderName,
    senderEmail,
    toList = [],
    attachments = [],
    embeddedImages = [],
    isScheduled,
    scheduledDate,
    scheduledTime,
    emailId,
    folder,
  }) => {
    return (
      <ContentContainer>
        <ProfileImageContainer>
          <Avatar>{senderName.charAt(0)}</Avatar>
        </ProfileImageContainer>
        <BodyContainer>
          <TopBar timestamp={timestamp} senderName={senderName} senderEmail={senderEmail} toList={toList} folder={folder} />
          {isScheduled && (
            <ScheduledMessage scheduledDate={scheduledDate} scheduledTime={scheduledTime} emailId={emailId} />
          )}
          <EmailHtmlBody body={body} embeddedImages={embeddedImages} />
          <Attachments attachments={attachments} />
        </BodyContainer>
      </ContentContainer>
    );
  }
);
