import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import React, { useContext, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "@emotion/styled";
import { GlobalContext } from "../../contexts/GlobalContext";
import Tooltip from "@mui/material/Tooltip";

export const Icon = ({
  name,
  label,
  onClick,
  style,
  disabled,
  placement = "bottom",
  size = "small",
  color = "rgb(68, 68, 68)",
  width = 36,
  height = 36,
}) => {
  return (
    <Tooltip title={label} placement={placement}>
      <IconButton
        size={size}
        sx={{
          width,
          height,
          borderRadius: "50%",
          marginRight: "10px",
          ...style,
        }}
        onClick={onClick}
        disabled={disabled}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 20,
            color: disabled ? "#b8b8b8" : "rgb(68, 68, 68)",
          }}
        >
          {name}
        </span>
      </IconButton>
    </Tooltip>
  );
};

const MailActions = () => {
  const navigate = useNavigate();

  return (
    <div
      className="iH bzn"
      style={{
        // cssFloat: "left",
        whiteSpace: "nowrap",
        display: "flex",
        // height: "20px",
        marginRight: "auto",
      }}
    >
      <div
        className="G-tF"
        style={{
          display: "flex",
          height: "100%",
          alignItems: "center",
          // background: "pink",
        }}
      >
        <Icon
          name="arrow_back"
          onClick={() => navigate("/inbox")}
          style={{ marginRight: "20px" }}
          label="Back to Inbox"
        />

        <>
          <Icon name="archive" label="Archive" />
          <Icon name="report" label="Report spam" />
          <Icon name="delete" label="Delete" />
        </>

        <Divider orientation="vertical" style={{ marginLeft: 10, marginRight: 10, height: 24 }} />

        <>
          <Icon name="mark_email_unread" label="Mark as unread" />
          {/* The next icon does not exactly match */}
          <Icon name="drive_file_move" label="Move to" />
          <Icon name="more_vert" label="More" />
        </>
      </div>
    </div>
  );
};

const EmailPositionContainer = styled.span`
  font-size: 0.75rem;
  color: #5e5e5e;
  white-space: nowrap;
`;

const EmailPosition = ({ currentItem, totalItems }) => {
  return (
    <EmailPositionContainer>
      <span className="ts" style={{ fontWeight: "inherit" }}>
        {currentItem}
      </span>{" "}
      of{" "}
      <span className="ts" style={{ fontWeight: "inherit" }}>
        {totalItems}
      </span>
    </EmailPositionContainer>
  );
};

const NavigationActions = () => {
  const { threadId } = useParams();
  const { normalizedEmails } = useContext(GlobalContext);
  const { threadIds } = normalizedEmails;
  const navigate = useNavigate();

  // use thread position in threadIds array to determine if there is a previous or next thread
  const threadPosition = useMemo(() => {
    return threadIds.indexOf(`#thread-f:${threadId}`);
  }, [threadIds, threadId]);

  const hasPreviousThread = useMemo(() => {
    return threadPosition > 0;
  }, [threadPosition]);

  const hasNextThread = useMemo(() => {
    return threadPosition < threadIds.length - 1;
  }, [threadPosition, threadIds]);

  const previousThread = useMemo(() => {
    return (threadIds[threadPosition - 1] || "").split(":")[1];
  }, [threadIds, threadPosition]);

  const nextThread = useMemo(() => {
    return (threadIds[threadPosition + 1] || "").split(":")[1];
  }, [threadIds, threadPosition]);

  const currentItem = useMemo(() => {
    return threadPosition + 1;
  }, [threadPosition]);

  const totalItems = useMemo(() => {
    return threadIds.length;
  }, [threadIds]);

  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
      }}
    >
      <EmailPosition currentItem={currentItem} totalItems={totalItems} />
      <div style={{ display: "flex", marginLeft: 10 }}>
        <Icon
          name="chevron_left"
          label="Newer"
          disabled={!hasPreviousThread}
          onClick={() => navigate(`/inbox/${previousThread}`)}
        />
        <Icon
          name="chevron_right"
          label="Older"
          disabled={!hasNextThread}
          onClick={() => navigate(`/inbox/${nextThread}`)}
        />
      </div>
    </div>
  );
};

const ActionBarContainer = styled.div`
  margin-bottom: 10px;
`;

const ActionsContainer = styled.div`
  border-bottom: 1px solid rgb(229, 229, 229);
  white-space: nowrap;
  position: relative;
  z-index: 3;
  border: none;
  padding: 0;
  align-items: center;
  display: flex;
  height: 48px;
  justify-content: space-between;
`;

export default function ActionBar() {
  const { currentItem, totalItems } = { currentItem: 6, totalItems: 100 };

  return (
    <ActionBarContainer>
      <ActionsContainer>
        <MailActions />
        <NavigationActions />
      </ActionsContainer>
      <Divider />
    </ActionBarContainer>
  );
}
