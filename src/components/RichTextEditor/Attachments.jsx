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
          // Simple design for Drive files (>25MB) - light gray background, single line
          return (
            <Box
              key={attachment.name}
              sx={{
                maxWidth: "370px",
                minWidth: "320px",
                height: "auto",
                backgroundColor: "#F5F5F5",
                border: "1px solid #dadce0",
                borderRadius: "0px",
                marginBottom: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 12px",
                color: "#222",
                "&:hover": {
                  border: "1px solid #b0b0b0",
                  "& a": {
                    textDecoration: "underline",
                  },
                },
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
              <Box sx={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                <span
                  className="material-symbols-outlined"
                  style={{ 
                    fontSize: "20px", 
                    color: "#1a73e8",
                    flexShrink: 0,
                  }}
                >
                  insert_drive_file
                </span>
                <Box
                  component="a"
                  href={attachment.driveLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ 
                    color: "#202124",
                    cursor: "pointer",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    minWidth: 0,
                    textDecoration: "none",
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    console.log("Drive link clicked:", attachment.driveLink);
                  }}
                >
                  <Typography
                    sx={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: "#202124",
                    }}
                  >
                    {attachment.name}
                  </Typography>
                </Box>
              </Box>
              <span
                className="material-symbols-outlined"
                style={{ 
                  fontSize: "18px", 
                  color: "rgb(95, 99, 104)", 
                  cursor: "pointer",
                  flexShrink: 0,
                  marginLeft: "8px",
                }}
                onClick={(e) => handleRemoveAttachment(e, attachment)}
              >
                close
              </span>
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
