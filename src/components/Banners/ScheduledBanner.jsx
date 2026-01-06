import React from "react";
import ScheduleSendIcon from "@mui/icons-material/ScheduleSend";

export default function ScheduledBanner() {
  return (
    <>
      <div style={{ borderBottom: "1px solid rgba(100, 121, 143, 0.12)" }}>
        <div
          className="ya A6"
          style={{
            textAlign: "center",
            border: "none",
            borderRadius: "4px",
            margin: "4px 0px",
            padding: "6px 4px",
            WebkitFontSmoothing: "antialiased",
            fontFamily: '"Google Sans", Roboto, RobotoDraft, Helvetica, Arial, sans-serif',
            fontSize: "0.875rem",
            letterSpacing: "normal",
            WebkitBoxAlign: "center",
            alignItems: "center",
            backgroundColor: "rgba(241, 243, 244, 0.87)",
            boxSizing: "border-box",
            color: "rgb(95, 99, 104)",
            display: "flex",
            flexWrap: "wrap",
            minHeight: "48px",
            paddingTop: "6px",
            paddingBottom: "6px",
            WebkitBoxPack: "start",
            justifyContent: "flex-start",
            marginBottom: "35px",
          }}
        >
          <span
            className="BM Ba"
            style={{
              height: "20px",
              marginRight: "10px",
              width: "20px",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
              backgroundSize: "20px",
            }}
          />
          <ScheduleSendIcon style={{ fontSize: 20, marginRight: 10 }} />
          Messages in Scheduled will be sent at their scheduled time.
        </div>
      </div>
    </>
  );
}
