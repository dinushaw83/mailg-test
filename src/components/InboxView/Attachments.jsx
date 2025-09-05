import styled from "@emotion/styled";
import { Divider, Typography } from "@mui/material";
import React from "react";
import { Icon } from "./ActionBar";
import Popover from "@mui/material/Popover";
import Link from "@mui/material/Link";

const ImageContainer = styled.div`
  width: 180px;
  height: 120px;
  overflow: hidden;
  color: #222;
  outline: none;
  cursor: pointer;
  font-size: 0.875rem;
  position: relative; /* enable overlay positioning */

  /* Cut-corner overlay (bottom-right) */
  &::after {
    content: "";
    position: absolute;
    width: 24px;
    height: 24px;
    right: -12px; /* offset half size so the rotated square sits on the corner */
    bottom: -12px;
    background: #fff; /* match page background */
    transform: rotate(45deg);
    /* Optional subtle separator along the diagonal to enhance the cut */
    box-shadow: -1px -1px 0 0 rgba(0, 0, 0, 0.06);
    pointer-events: none;
  }

  img {
    width: 100%;
    height: auto;
    object-fit: cover;
    object-position: center;
    display: block;
  }

  &:hover .overlay {
    opacity: 1;
    pointer-events: auto;
  }
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  background: rgba(158, 158, 158, 0.6); /* translucent gray */
  color: #fff;
  opacity: 0;
  transition: opacity 120ms ease-in-out;
  pointer-events: none; /* enabled on parent hover */
`;

const OverlayTop = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const OverlayTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  .material-symbols-outlined {
    font-size: 18px;
  }
`;

const OverlayFilesize = styled.div`
  font-size: 0.75rem;
  opacity: 0.9;
`;

const OverlayActions = styled.div`
  display: flex;
  justify-content: flex-start;
`;

const ActionButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.24);
  color: #fff;
  text-decoration: none;
  border-radius: 6px;
  font-size: 0.75rem;
  pointer-events: auto; /* clickable inside overlay */
  transition: background 120ms ease-in-out, border-color 120ms ease-in-out;

  &:hover {
    background: rgba(255, 255, 255, 0.22);
    border-color: rgba(255, 255, 255, 0.34);
  }

  .material-symbols-outlined {
    font-size: 16px;
  }
`;

const AttachmentsContainer = styled.div`
  display: flex;
  gap: 1rem;
`;

const AttachmentsHeaderContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  white-space: pre-wrap;
  font-size: 0.875rem;
  line-height: 20px;
`;

const AttachmentsScannedContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Dot = styled.div`
  width: 4px;
  height: 4px;
  background-color: #5e5e5e;
  border-radius: 50%;
`;

const AttachmentsCountContainer = styled.div`
  font-weight: bold;
`;

const PopupContainer = styled.div`
  width: 328px;
  padding: 12px;
`;

const ScannedByGmail = () => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handlePopoverOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <AttachmentsScannedContainer>
      <div>Scanned by MailG</div>{" "}
      <span
        aria-haspopup="true"
        aria-expanded={open ? "true" : "false"}
        className="material-symbols-outlined"
        style={{
          fontSize: 20,
          color: "rgb(68, 68, 68)",
          cursor: "default",
        }}
        onMouseEnter={handlePopoverOpen}
        onMouseLeave={handlePopoverClose}
      >
        info
      </span>
      <Popover
        id="mouse-over-popover"
        sx={{ pointerEvents: "none" }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        <PopupContainer>
          <Typography sx={{ p: 1, fontSize: "16px", fontWeight: 500, lineHeight: "24px" }}>
            Attachment scanning in MailG
          </Typography>
          <Typography
            sx={{ p: 1, fontSize: "0.875rem", fontWeight: 400, lineHeight: "20px", color: "rgb(60, 64, 67)" }}
          >
            To help protect your inbox, MailG blocks attachments when malware is detected. You should still only
            download attachments from people you trust. <Link underline="hover">Learn more</Link>
          </Typography>
        </PopupContainer>
      </Popover>
    </AttachmentsScannedContainer>
  );
};

export const Attachments = ({ attachments = [] }) => {
  if (attachments.length === 0) return null;
  const count = attachments.length > 1 ? `${attachments.length} attachments` : "One attachment";

  return (
    <div>
      <Divider sx={{ borderStyle: "dotted", marginTop: "1rem", marginBottom: "1rem" }} />
      <AttachmentsHeaderContainer>
        <AttachmentsCountContainer>{count}</AttachmentsCountContainer>
        <Dot />
        <ScannedByGmail />
      </AttachmentsHeaderContainer>
      <AttachmentsContainer>
        {attachments.map((attachment) => (
          <ImageContainer key={attachment.id}>
            <img loading="lazy" src={attachment.url} alt={attachment.name} />
            <Overlay className="overlay">
              <OverlayTop>
                <OverlayTitleRow title={attachment.name}>
                  <span className="material-symbols-outlined">image</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{attachment.name}</span>
                </OverlayTitleRow>
                <OverlayFilesize>{attachment.size}</OverlayFilesize>
              </OverlayTop>
              <OverlayActions>
                <Icon
                  label="Download"
                  placement="top"
                  name="download"
                  color="white"
                  style={{
                    borderRadius: "6px",
                    width: "24px",
                    height: "24px",
                    background: "rgb(128, 134, 139)",
                    "&:hover": { background: "#898F94" },
                    marginRight: "8px",
                  }}
                />

                <Icon
                  label="Save to Drive"
                  placement="top"
                  name="drive_file_move"
                  color="white"
                  style={{
                    borderRadius: "6px",
                    width: "24px",
                    height: "24px",
                    padding: "5px",
                    background: "rgb(128, 134, 139)",
                    "&:hover": { background: "#898F94" },
                    marginRight: "0px",
                  }}
                />
              </OverlayActions>
            </Overlay>
          </ImageContainer>
        ))}
      </AttachmentsContainer>
    </div>
  );
};
