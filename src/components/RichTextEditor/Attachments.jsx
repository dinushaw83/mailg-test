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
      {attachments.map((attachment) => (
        <Box
          sx={{
            maxWidth: "462px",
            minWidth: "320px",
            minHeight: "33.5px",
            backgroundColor: attachment.isDriveFile ? "#e8f0fe" : "#F5F5F5",
            marginBottom: "8px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "6px 10px",
            color: "#222",
            border: attachment.isDriveFile ? "1px solid #1a73e8" : "none",
            position: "relative",
            ...(activeAttachment?.name === attachment.name
              ? {
                  backgroundColor: "rgb(32, 33, 36, .12)",
                  boxShadow: "0 0 0 1px rgb(189, 193, 198)",
                }
              : {}),
          }}
          key={attachment.name}
          onClick={(e) => {
            setActiveAttachment(attachment);
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <a
              href={attachment.isDriveFile ? attachment.driveLink : attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                textDecoration: "none", 
                ...(attachment.url ? { color: "#1155cc" } : {}),
                ...(attachment.isDriveFile ? { 
                  color: "#1a73e8",
                  cursor: "pointer"
                } : {})
              }}
              onClick={(e) => {
                if (attachment.isDriveFile) {
                  e.preventDefault();
                  // Show Drive link info instead of navigating
                  console.log("Drive link clicked:", attachment.driveLink);
                }
              }}
            >
              <Typography
                sx={{
                  maxWidth: "315px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: "bold",
                  fontSize: "0.875rem",
                  color: attachment.isDriveFile ? "#1a73e8" : "inherit",
                }}
              >
                {attachment.name}
                {attachment.isDriveFile && " (Drive)"}
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
          {/* Error row for blocked files - right aligned within the same container */}
          {attachment.isBlocked && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "4px",
                marginTop: "2px",
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
                  // In a real app, this would link to help documentation
                  console.log("Help clicked for blocked file");
                }}
              >
                Help
              </Typography>
            </Box>
          )}

          <span
            className="material-symbols-outlined"
            style={{ 
              fontSize: "14px", 
              color: "rgb(95, 99, 104)", 
              cursor: "pointer",
              position: "absolute",
              top: "6px",
              right: "10px",
            }}
            onClick={(e) => handleRemoveAttachment(e, attachment)}
          >
            close
          </span>
        </Box>
      ))}
    </Box>
  );
};

export default Attachments;
