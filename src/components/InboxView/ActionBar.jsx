import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import React, { useContext, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "@emotion/styled";
import { GlobalContext } from "../../contexts/GlobalContext";
import Tooltip from "@mui/material/Tooltip";

const Icon = ({ name, label, onClick, style, disabled }) => {
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        sx={{
          width: 36,
          height: 36,
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
            color: "rgb(68, 68, 68)",
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

        <Divider
          orientation="vertical"
          style={{ marginLeft: 10, marginRight: 10, height: 24 }}
        />

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

const NavigationActions = () => {
  const { inboxId } = useParams();
  const { state } = useContext(GlobalContext);
  const emails = state?.emails || [];
  const navigate = useNavigate();

  const hasNextEmail = useMemo(() => {
    return (
      emails.find((e) => String(e.id) === String(Number(inboxId) + 1)) !==
      undefined
    );
  }, [emails, inboxId]);

  const hasPreviousEmail = useMemo(() => {
    return (
      emails.find((e) => String(e.id) === String(Number(inboxId) - 1)) !==
      undefined
    );
  }, [emails, inboxId]);

  const currentItem = useMemo(() => {
    return emails.findIndex((e) => String(e.id) === String(inboxId)) + 1;
  }, [emails, inboxId]);

  const totalItems = useMemo(() => {
    return emails.length;
  }, [emails]);

  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
      }}
    >
      <span>
        <span className="ts" style={{ fontWeight: "inherit" }}>
          {currentItem}
        </span>{" "}
        of{" "}
        <span className="ts" style={{ fontWeight: "inherit" }}>
          {totalItems}
        </span>
      </span>
      <div style={{ display: "flex", marginLeft: 10 }}>
        <Icon
          name="chevron_left"
          label="Newer"
          disabled={!hasPreviousEmail}
          onClick={() => navigate(`/inbox/${Number(inboxId) - 1}`)}
        />
        <Icon
          name="chevron_right"
          label="Older"
          disabled={!hasNextEmail}
          onClick={() => navigate(`/inbox/${Number(inboxId) + 1}`)}
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
  margin: 0 150px 0 0;
`;

export default function ActionBar() {
  const { currentItem, totalItems } = { currentItem: 6, totalItems: 100 };

  return (
    <ActionBarContainer>
      <ActionsContainer>
        <MailActions />
        <NavigationActions currentItem={currentItem} totalItems={totalItems} />
      </ActionsContainer>
      <Divider />
    </ActionBarContainer>
  );
}
