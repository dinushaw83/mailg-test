import styled from "@emotion/styled";
import { Box, Divider, Typography } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { Icon } from "./ActionBar";
import Popover from "@mui/material/Popover";
import Link from "@mui/material/Link";
import { getAttachmentIcon } from "../EmailList/Table";
import { useGlobalContext } from "../../contexts/GlobalContext";
import { imageFileToThumbnailFile } from "./thumb";

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
  gap: 5px;
  padding: 8px;
  background: rgba(158, 158, 158, 0.6); /* translucent gray */
  color: #fff;
  opacity: 0;
  transition: opacity 120ms ease-in-out;
  pointer-events: none; /* enabled on parent hover */
`;

const OverlayContent = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
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

const AttachmentsContainer = styled.div`
  display: flex;
  gap: 1rem;
`;

const AttachmentsHeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
`;

const AttachmentsScannedOuterContainer = styled.div`
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

const isSpreadsheet = (attachment) => {
  return (
    attachment.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    attachment.type === "application/vnd.ms-excel" ||
    attachment.type === "application/vnd.oasis.opendocument.spreadsheet"
  );
};

const isPresentation = (attachment) => {
  return (
    attachment.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    attachment.type === "application/vnd.ms-powerpoint" ||
    attachment.type === "application/vnd.oasis.opendocument.presentation"
  );
};

const isDocument = (attachment) => {
  return (
    attachment.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    attachment.type === "application/vnd.ms-word" ||
    attachment.type === "application/vnd.oasis.opendocument.text"
  );
};

const isCompressed = (attachment) => {
  return (
    attachment.type === "application/zip" ||
    attachment.type === "application/x-compressed-tar" ||
    attachment.type === "application/x-rar-compressed"
  );
};

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

const AttachmentsHeaderActions = () => {
  return (
    <Box>
      <Icon name="download_2" label="Download all attachments" />
      <Icon name="add_to_drive" label="Add all to Drive" />
    </Box>
  );
};

export const Attachments = ({ attachments = [] }) => {
  const { db } = useGlobalContext();
  const [attachmentsWithPreviewURLs, setAttachmentsWithPreviewURLs] = useState([]);

  // console.log({ db });

  const count = attachments.length > 1 ? `${attachments.length} attachments` : "One attachment";

  const handleDownload = async (attachment) => {
    const a = document.createElement("a");
    a.href = attachment.url;
    a.download = attachment.name;
    a.click();
  };

  const handleSaveToDrive = async (attachment) => {
    console.log("save to drive", attachment);
  };

  const openInNewTab = async (attachment) => {
    window.open(attachment.url, "_blank");
  };

  const getDefaultDocumentPreviewURL = useCallback(
    (attachment) => {
      if (attachment.type === "application/pdf") {
        return "/assets/images/PDF_file_icon.svg";
      }
      if (isSpreadsheet(attachment)) {
        return "/assets/images/Spreadsheet_file_icon.jpeg";
      }
      if (isPresentation(attachment)) {
        return "/assets/images/Presentation_file_icon.png";
      }
      if (isDocument(attachment)) {
        return "/assets/images/Document_file_icon.webp";
      }
      if (isCompressed(attachment)) {
        return "/assets/images/Compressed_file_icon.jpg";
      }
      return null;
    },
    [db]
  );

  const getAttachmentWithPreviewURL = useCallback(
    async (attachment) => {
      const isRelativeURL = attachment.url.startsWith("/");
      if (isRelativeURL) {
        return { ...attachment, previewURL: attachment.url };
      }
      const { file } = await db.get("attachments", attachment.id);
      if (file.type.startsWith("image/")) {
        const thumb = await imageFileToThumbnailFile(file);
        const url = URL.createObjectURL(thumb);
        const previewURL = getDefaultDocumentPreviewURL(attachment) || url;
        return { ...attachment, url, previewURL };
      } else {
        const url = URL.createObjectURL(file);
        const previewURL = getDefaultDocumentPreviewURL(attachment) || url;
        return { ...attachment, url, previewURL };
      }
    },
    [db]
  );

  useEffect(() => {
    if (!db) return;
    Promise.all(attachments.map(async (attachment) => await getAttachmentWithPreviewURL(attachment))).then(
      (attachments) => {
        setAttachmentsWithPreviewURLs(attachments);
      }
    );
  }, [db, attachments, getAttachmentWithPreviewURL]);

  if (attachments.length === 0) return null;

  return (
    <div>
      <Divider sx={{ borderStyle: "dotted", marginTop: "1rem", marginBottom: "1rem" }} />
      <AttachmentsHeaderContainer>
        <AttachmentsScannedOuterContainer>
          <AttachmentsCountContainer>{count}</AttachmentsCountContainer>
          <Dot />
          <ScannedByGmail />
        </AttachmentsScannedOuterContainer>
        <AttachmentsHeaderActions />
      </AttachmentsHeaderContainer>
      <AttachmentsContainer>
        {attachmentsWithPreviewURLs.map((attachment) => {
          return (
            <ImageContainer key={attachment.id} onClick={() => openInNewTab(attachment)}>
              <img loading="lazy" src={attachment.previewURL} alt={attachment.name} width={20} />
              <Overlay className="overlay">
                {getAttachmentIcon(attachment)}
                <OverlayContent>
                  <OverlayTop>
                    <OverlayTitleRow title={attachment.name}>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(attachment);
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveToDrive(attachment);
                      }}
                    />
                  </OverlayActions>
                </OverlayContent>
              </Overlay>
            </ImageContainer>
          );
        })}
      </AttachmentsContainer>
    </div>
  );
};
