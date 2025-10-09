import { Typography } from "@mui/material";
import Box from "@mui/material/Box";
import React, { useState } from "react";
import { useGlobalContext } from "../../contexts/GlobalContext";

const Attachments = ({ attachments, setAttachments }) => {
  const [activeAttachment, setActiveAttachment] = useState();
  const { db } = useGlobalContext();

  const formatSize = (size) => {
    // return values such as 1024 -> 1K, 1024 * 1024 -> 1M, 1024 * 1024 * 1024 -> 1G
    if (size < 1024) {
      return `${size}B`;
    } else if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)}K`;
    } else if (size < 1024 * 1024 * 1024) {
      return `${(size / 1024 / 1024).toFixed(1)}M`;
    } else {
      return `${(size / 1024 / 1024 / 1024).toFixed(1)}G`;
    }
  };

  const handleRemoveAttachment = async (e, attachment) => {
    e.stopPropagation();
    setAttachments((prevAttachments) => prevAttachments.filter((a) => a.name !== attachment.name));
    setActiveAttachment(null);

    await db.delete("attachments", attachment.id);
  };

  return (
    <Box>
      {attachments.map((attachment) => {
        // Use different designs based on attachment type
        if (attachment.isBlocked) {
          // Special design for blocked files
          return (
            <Box key={attachment.name} sx={{ marginBottom: "8px" }}>
              <Box
                sx={{
                  maxWidth: "462px",
                  minWidth: "320px",
                  backgroundColor: "#F5F5F5",
                  marginBottom: "8px",
                  display: "flex",
                  flexDirection: "column",
                  padding: "8px 12px",
                  color: "#222",
                  ...(activeAttachment?.name === attachment.name
                    ? {
                        backgroundColor: "rgb(32, 33, 36, .12)",
                        boxShadow: "0 0 0 1px rgb(189, 193, 198)",
                      }
                    : {}),
                }}
                onClick={(e) => {
                  setActiveAttachment(attachment);
                }}
              >
                {/* File name and size row */}
                <Box sx={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <Typography
                    sx={{
                      maxWidth: "315px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontWeight: "bold",
                      fontSize: "0.875rem",
                    }}
                  >
                    {attachment.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontWeight: "bold",
                      fontSize: "0.875rem",
                      color: "#444746",
                    }}
                  >
                    ({formatSize(attachment.size)})
                  </Typography>
                </Box>
                
                {/* Error message row with X button beside Help */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: "4px",
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      color: "#d93025",
                      fontWeight: "bold",
                    }}
                  >
                    Blocked for security reasons!
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontSize: "0.875rem",
                      color: "#1a73e8",
                      textDecoration: "underline",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log("Help clicked for blocked file");
                    }}
                  >
                    Help
                  </Typography>
                  <span
                    className="material-symbols-outlined"
                    style={{ 
                      fontSize: "14px", 
                      color: "rgb(95, 99, 104)", 
                      cursor: "pointer",
                      marginLeft: "4px",
                    }}
                    onClick={(e) => handleRemoveAttachment(e, attachment)}
                  >
                    close
                  </span>
                </Box>
              </Box>
            </Box>
          );
        }

        if (attachment.isDriveFile) {
          // Special design for Drive files (>25MB) - larger and more prominent
          return (
            <Box key={attachment.name} sx={{ marginBottom: "12px" }}>
              <Box
                sx={{
                  maxWidth: "500px",
                  minWidth: "350px",
                  backgroundColor: "#e8f0fe",
                  border: "2px solid #1a73e8",
                  borderRadius: "8px",
                  marginBottom: "8px",
                  display: "flex",
                  flexDirection: "column",
                  padding: "12px 16px",
                  color: "#222",
                  position: "relative",
                  boxShadow: "0 2px 4px rgba(26, 115, 232, 0.1)",
                  ...(activeAttachment?.name === attachment.name
                    ? {
                        backgroundColor: "rgb(32, 33, 36, .12)",
                        boxShadow: "0 0 0 1px rgb(189, 193, 198)",
                      }
                    : {}),
                }}
                onClick={(e) => {
                  setActiveAttachment(attachment);
                }}
              >
                {/* Drive icon and file info row */}
                <Box sx={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ 
                      fontSize: "24px", 
                      color: "#1a73e8",
                    }}
                  >
                    cloud_upload
                  </span>
                  <Box sx={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
                    <a
                      href={attachment.driveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ 
                        textDecoration: "none", 
                        color: "#1a73e8",
                        cursor: "pointer"
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        console.log("Drive link clicked:", attachment.driveLink);
                      }}
                    >
                      <Typography
                        sx={{
                          maxWidth: "350px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: "bold",
                          fontSize: "1rem",
                          color: "#1a73e8",
                        }}
                      >
                        {attachment.name}
                      </Typography>
                    </a>
                    <Typography
                      sx={{
                        fontWeight: "bold",
                        fontSize: "1rem",
                        color: "#444746",
                      }}
                    >
                      ({formatSize(attachment.size)})
                    </Typography>
                  </Box>
                </Box>
                
                {/* Drive info row */}
                <Box sx={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "36px" }}>
                  <Typography
                    sx={{
                      fontSize: "0.875rem",
                      color: "#1a73e8",
                      fontWeight: 500,
                    }}
                  >
                    Sent as MailG Drive link
                  </Typography>
                </Box>
                
                {/* Close button positioned at top right */}
                <span
                  className="material-symbols-outlined"
                  style={{ 
                    fontSize: "16px", 
                    color: "rgb(95, 99, 104)", 
                    cursor: "pointer",
                    position: "absolute",
                    top: "12px",
                    right: "16px",
                  }}
                  onClick={(e) => handleRemoveAttachment(e, attachment)}
                >
                  close
                </span>
              </Box>
            </Box>
          );
        }

        // Normal design for regular files
        return (
          <Box
            key={attachment.name}
          sx={{
            maxWidth: "462px",
            minWidth: "320px",
            height: "33.5px",
            backgroundColor: "#F5F5F5",
            marginBottom: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            color: "#222",
            ...(activeAttachment?.name === attachment.name
              ? {
                  backgroundColor: "rgb(32, 33, 36, .12)",
                  boxShadow: "0 0 0 1px rgb(189, 193, 198)",
                }
              : {}),
          }}
          onClick={(e) => {
            setActiveAttachment(attachment);
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none", ...(attachment.url ? { color: "#1155cc" } : {}) }}
            >
              <Typography
                sx={{
                  maxWidth: "315px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  fontSize: "0.875rem",
                }}
              >
                {attachment.name}
              </Typography>
            </a>
            <Typography
              sx={{
                fontWeight: "bold",
                fontSize: "0.875rem",
                color: "#444746",
              }}
            >
              ({formatSize(attachment.size)})
            </Typography>
          </Box>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "14px", color: "rgb(95, 99, 104)", cursor: "pointer" }}
            onClick={(e) => handleRemoveAttachment(e, attachment)}
          >
            close
          </span>
        </Box>
        );
      })}
    </Box>
  );
};

export default Attachments;
