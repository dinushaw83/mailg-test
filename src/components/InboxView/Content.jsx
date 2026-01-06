import styled from "@emotion/styled";
import React, { useMemo, useState, useEffect, useCallback } from "react";
import Avatar from "@mui/material/Avatar";
import { Icon } from "./ActionBar";
import { Attachments } from "./Attachments";
import ContactPopup from "../Contacts/ContactPopup";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { getEmbeddedImage, processHtmlForDisplay, extractEmbeddedImageIds } from "../../utils/embeddedImages";
import useMailActions from "../../hooks/useMailActions";
import MoreActions from "./MoreActions";

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

const Recipient = ({ recipients = [] }) => {
  const { recipients: contacts, loggedInUser } = useGlobalContext();

  // Helper function to get recipient display name from email
  const getRecipientDisplayName = (email) => {
    // Check if it's the logged-in user - show "me"
    if (email === loggedInUser.email) {
      return "me";
    }

    // Check if email is present in contacts
    const found = contacts.find((contact) => {
      const emailList = Array.isArray(contact.emails)
        ? contact.emails
        : contact.email
          ? [{ value: contact.email }]
          : [];
      return emailList.some((contactEmail) => contactEmail.value === email);
    });
    if (found) {
      // Return only the first name
      return found.name.split(" ")[0];
    }

    // If not found, extract first name from email
    const emailName = email.split("@")[0];
    const namePart = emailName.split(".")[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  // Build recipient display text
  const buildRecipientText = () => {
    if (recipients.length === 0) {
      return "to me"; // fallback for empty recipients
    }

    if (recipients.length === 1) {
      const recipientName = getRecipientDisplayName(recipients[0]);
      return `to ${recipientName}`;
    }

    // Multiple recipients
    const firstRecipientName = getRecipientDisplayName(recipients[0]);
    const remainingCount = recipients.length - 1;

    if (remainingCount === 1) {
      const secondRecipientName = getRecipientDisplayName(recipients[1]);
      return `to ${firstRecipientName}, ${secondRecipientName}`;
    }

    return `to ${firstRecipientName} + ${remainingCount} more`;
  };

  return (
    <RecipientContainer>
      <RecipientName>{buildRecipientText()}</RecipientName>
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

const TopBar = ({ timestamp, senderName, senderEmail, recipients = [], email, onReply, responseViewRef }) => {
  const { recipients: contacts, loggedInUser, setComposeWindows } = useGlobalContext();
  const [moreActionsAnchor, setMoreActionsAnchor] = useState(null);

  const senderContact = useMemo(() => {
    // Check if sender email is of logged in user
    if (senderEmail === loggedInUser.email) {
      return loggedInUser;
    }

    // Check if sender email is present in contacts emails array
    const found = contacts.find((contact) => {
      const emailList = Array.isArray(contact.emails)
        ? contact.emails
        : contact.email
          ? [{ value: contact.email }]
          : [];
      return emailList.some((c) => c.value === senderEmail);
    });
    if (found) {
      return found;
    }

    // If not found, then return a custom contact object
    return { name: senderName, email: senderEmail, id: `custom-${senderEmail}` };
  }, [contacts, senderName, senderEmail]);

  const { toggleStar } = useMailActions();

  const handleStar = useCallback(
    (e) => {
      e?.stopPropagation();
      if (email?.id) {
        toggleStar([email.id]);
      }
    },
    [email, toggleStar]
  );

  const handleReply = useCallback(
    (e) => {
      e?.stopPropagation();
      if (onReply) {
        onReply();
      } else if (responseViewRef?.current?.handleReply) {
        responseViewRef.current.handleReply();
        // Scroll to reply container
        setTimeout(() => {
          const replyContainer = document.querySelector('[data-testid="email-response-view"]');
          if (replyContainer) {
            replyContainer.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
      } else if (email) {
        // Fallback: open compose window
        const replySubject = email.subject?.startsWith("Re: ") ? email.subject : `Re: ${email.subject || ""}`;
        setComposeWindows((prev) => [
          ...prev,
          {
            id: `reply-${Date.now()}`,
            fields: {
              to: [email.from.email],
              subject: replySubject,
              replyingTo: email,
              replyType: "reply",
            },
          },
        ]);
      }
    },
    [email, onReply, responseViewRef, setComposeWindows]
  );

  const handleMoreActions = useCallback((e) => {
    e?.stopPropagation();
    setMoreActionsAnchor(e?.currentTarget || null);
  }, []);

  const handleCloseMoreActions = useCallback(() => {
    setMoreActionsAnchor(null);
  }, []);

  const isStarred = email?.starred || false;

  return (
    <>
      <TopBarContainer>
        <div>
          <ContactPopup contact={{ ...senderContact, email: senderEmail }}>
            <Sender name={senderName} email={senderEmail} />
          </ContactPopup>
          <Recipient recipients={recipients} />
        </div>
        <ActionsContainer>
          <Time timestamp={timestamp} />
          <Icon
            name={isStarred ? "star" : "star_border"}
            label={isStarred ? "Starred" : "Not starred"}
            onClick={handleStar}
            color={isStarred ? "#f4b400" : "rgb(68, 68, 68)"}
          />
          <Icon name="mood" label="Add a reaction" />
          <Icon name="reply" label="Reply" onClick={handleReply} />
          <Icon name="more_vert" label="More" onClick={handleMoreActions} />
        </ActionsContainer>
      </TopBarContainer>
      {email && (
        <MoreActions
          thread={{ threadId: email.threadId, starred: isStarred, important: email.important }}
          showAdvancedMenu={false}
          toggleShowAdvancedMenu={() => {}}
          anchorEl={moreActionsAnchor}
          onClose={handleCloseMoreActions}
        />
      )}
    </>
  );
};

const ScheduledMessage = ({ scheduledDate, scheduledTime, emailId }) => {
  const { setEmails, setSnackbar } = useGlobalContext();

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
  const { db } = useGlobalContext();
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
    recipients = [],
    attachments = [],
    embeddedImages = [],
    isScheduled,
    scheduledDate,
    scheduledTime,
    emailId,
    email,
    responseViewRef,
  }) => {
    return (
      <ContentContainer>
        <ProfileImageContainer>
          <Avatar>{senderName.charAt(0)}</Avatar>
        </ProfileImageContainer>
        <BodyContainer>
          <TopBar
            timestamp={timestamp}
            senderName={senderName}
            senderEmail={senderEmail}
            recipients={recipients}
            email={email}
            responseViewRef={responseViewRef}
          />
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
