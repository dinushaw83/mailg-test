import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "@emotion/styled";

const Icon = ({ name, onClick, style }) => {
  return (
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
        />

        <>
          <Icon name="archive" />
          <Icon name="report" />
          <Icon name="delete" />
        </>

        <Divider
          orientation="vertical"
          style={{ marginLeft: 10, marginRight: 10, height: 24 }}
        />

        <>
          <Icon name="mark_email_unread" />
          {/* The next icon does not exactly match */}
          <Icon name="drive_file_move" />
          <Icon name="more_vert" />
        </>
      </div>
    </div>
  );
};

const NavigationActions = ({ currentItem, totalItems }) => {
  return (
    <div
      className="adF"
      style={{
        textAlign: "right",
        display: "flex",
        height: "100%",
        alignItems: "center",
      }}
    >
      <div
        className="iG J-J5-Ji"
        style={{
          position: "relative",
          marginLeft: "10px",
          padding: "0px",
          WebkitBoxAlign: "center",
          alignItems: "center",
          display: "flex",
          height: "100%",
        }}
      >
        <div
          className="h0"
          style={{
            whiteSpace: "nowrap",
            color: "rgb(94, 94, 94)",
            textAlign: "right",
            padding: "0px",
            WebkitBoxAlign: "center",
            alignItems: "center",
            display: "flex",
            height: "100%",
            paddingRight: "0px",
          }}
        >
          <span
            id=":lp"
            className="adl"
            style={{
              textShadow: "none",
              margin: "0px",
              textDecoration: "none",
              WebkitFontSmoothing: "auto",
              fontSize: "0.75rem",
              letterSpacing: "normal",
              fontFamily:
                '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
            }}
          >
            <span className="ts" style={{ fontWeight: "inherit" }}>
              {currentItem}
            </span>{" "}
            of{" "}
            <span className="ts" style={{ fontWeight: "inherit" }}>
              {totalItems}
            </span>
          </span>
          <div style={{ display: "flex", marginLeft: 10 }}>
            <Icon name="chevron_left" />
            <Icon name="chevron_right" />
          </div>
        </div>
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
