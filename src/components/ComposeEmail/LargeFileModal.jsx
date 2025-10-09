import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  LinearProgress,
} from "@mui/material";

const LargeFileModal = ({ open, onClose, onAccept, fileName, fileSize }) => {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const hasCalledAcceptRef = useRef(false);

  const formatSize = (size) => {
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

  const truncateFileName = (fileName, maxLength = 50) => {
    if (!fileName) return '';
    
    // Get file extension
    const lastDotIndex = fileName.lastIndexOf('.');
    const extension = lastDotIndex > -1 ? fileName.substring(lastDotIndex) : '';
    const nameWithoutExt = lastDotIndex > -1 ? fileName.substring(0, lastDotIndex) : fileName;
    
    // If the name is short enough, return as is
    if (fileName.length <= maxLength) {
      return fileName;
    }
    
    // Truncate the name part and add extension
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension.length - 3) + '...';
    return truncatedName + extension;
  };

  // Calculate upload time based on file size (larger files take longer)
  const calculateUploadTime = (size) => {
    const sizeInMB = size / (1024 * 1024);
    // Base time of 2 seconds, plus 0.5 seconds per MB
    return Math.max(2000, 2000 + (sizeInMB * 500));
  };

  const handleAccept = () => {
    setShowProgress(true);
    setIsUploading(true);
    setProgress(0);
    hasCalledAcceptRef.current = false; // Reset the flag
    
    const uploadTime = calculateUploadTime(fileSize);
    const interval = 50; // Update every 50ms
    const increment = 100 / (uploadTime / interval);
    
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = Math.min(prev + increment, 100);
        
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          setIsUploading(false);
          // Auto-accept after upload completes - but only once
          if (!hasCalledAcceptRef.current) {
            hasCalledAcceptRef.current = true;
            setTimeout(() => {
              onAccept();
            }, 500);
          }
          return 100;
        }
        return newProgress;
      });
    }, interval);
  };

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setShowProgress(false);
      setIsUploading(false);
      setProgress(0);
      hasCalledAcceptRef.current = false; // Reset the flag when modal opens
    }
  }, [open]);

  const handleCancel = () => {
    setProgress(0);
    setIsUploading(false);
    setShowProgress(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={isUploading ? undefined : handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          backgroundColor: "#ffffff",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 500, color: "#202124" }}>
          {showProgress ? "Attaching file" : "Large files must be shared with MailG Drive"}
        </Typography>
        {!isUploading && (
          <IconButton
            onClick={handleCancel}
            size="small"
            sx={{
              color: "#5f6368",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              close
            </span>
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent sx={{ padding: "24px" }}>
        {!showProgress ? (
          // Initial popup content
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body1" sx={{ color: "#202124", marginBottom: 1 }}>
                Attachments larger than 25MB will be automatically uploaded to MailG Drive. A download link will be included in your email.
              </Typography>
              {fileName && (
                <Typography variant="body2" sx={{ color: "#5f6368", marginTop: 1 }}>
                  File: {truncateFileName(fileName)} ({formatSize(fileSize)})
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "8px",
                background: "linear-gradient(135deg, #4285f4 0%, #34a853 25%, #fbbc04 50%, #ea4335 75%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: "24px", color: "white" }}
              >
                cloud_upload
              </span>
            </Box>
          </Box>
        ) : (
          // Progress content
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="body1" sx={{ color: "#202124" }}>
              Your file is larger than 25MB. It will be sent as a{" "}
              <Typography
                component="span"
                sx={{
                  color: "#1a73e8",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                MailG Drive link
              </Typography>
              .
            </Typography>

            {fileName && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "20px", color: "#5f6368" }}
                  >
                    description
                  </span>
                </Box>
                
                <Box sx={{ flex: 1, display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      color: "#202124",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      flex: 1,
                    }}
                  >
                    {truncateFileName(fileName, 40)}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ color: "#5f6368", minWidth: "fit-content" }}>
                    {formatSize(fileSize)}
                  </Typography>
                  
                  <Box sx={{ width: "100px", minWidth: "100px" }}>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: "#e0e0e0",
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: "#1a73e8",
                          borderRadius: 2,
                        },
                      }}
                    />
                  </Box>
                  
                  {isUploading && (
                    <IconButton
                      size="small"
                      onClick={handleCancel}
                      sx={{
                        color: "#5f6368",
                        "&:hover": {
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                        },
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                        close
                      </span>
                    </IconButton>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      {!showProgress && (
        <DialogActions sx={{ padding: "16px 24px", gap: 1 }}>
          <Button
            onClick={handleCancel}
            variant="outlined"
            sx={{
              textTransform: "none",
              color: "#5f6368",
              borderColor: "#dadce0",
              borderRadius: "4px",
              "&:hover": {
                borderColor: "#5f6368",
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            variant="contained"
            sx={{
              textTransform: "none",
              backgroundColor: "#1a73e8",
              borderRadius: "20px",
              "&:hover": {
                backgroundColor: "#1557b0",
              },
            }}
          >
            OK, got it
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default LargeFileModal;
