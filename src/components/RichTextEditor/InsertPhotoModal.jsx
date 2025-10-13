import React, { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  IconButton,
  Paper,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";

const InsertPhotoModal = ({ open, onClose, onInsertImages }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleClose = () => {
    onClose();
    setIsDragOver(false);
  };

  const handleFileSelect = (files) => {
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter((file) => {
        const mimeType = (file.type || "").toLowerCase();
        return mimeType.startsWith("image/");
      });

      if (imageFiles.length > 0) {
        onInsertImages(imageFiles);
        handleClose();
      }
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event) => {
    handleFileSelect(event.target.files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    handleFileSelect(files);
  };

  const renderUploadTab = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        p: 3,
      }}
    >
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          cursor: "pointer",
          position: "relative",
          "&:hover": {
            opacity: 0.95,
          },
          transition: "opacity 0.2s ease",
        }}
      >
        <img
          src="/assets/images/upload_background.png"
          alt="Upload area"
          style={{
            maxHeight: "180px",
            width: "auto",
            marginBottom: "16px",
          }}
        />
        <Button
          variant="contained"
          sx={{
            textTransform: "none",
            borderRadius: "20px",
            px: 3,
            py: 1,
            fontSize: "14px",
            fontWeight: 500,
            minWidth: "88px",
            height: "40px",
            backgroundColor: "#1976d2",
            "&:hover": {
              backgroundColor: "#1565c0",
            },
            boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)",
            mb: 1,
          }}
        >
          Browse
        </Button>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.875rem" }}>
          or drag files here
        </Typography>
      </Box>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        multiple
        accept="image/*"
        onChange={handleFileInputChange}
      />
    </Box>
  );

  const renderGooglePhotosTab = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        p: 3,
      }}
    >
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          fontWeight: 500,
        }}
      >
        No Items available in Mailg Photos.
      </Typography>
    </Box>
  );

  const renderWebAddressTab = () => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "400px",
        p: 3,
      }}
    >
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          fontWeight: 500,
        }}
      >
        Web address (URL) functionality coming soon
      </Typography>
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          width: "90%",
          maxWidth: "1052px",
          height: "650px",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
        }}
      >
        <Typography variant="h6" component="div" sx={{ fontSize: "16px", fontWeight: 500 }}>
          Insert Photo
        </Typography>
        <IconButton onClick={handleClose} size="small" sx={{ ml: 1 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="photo insertion tabs">
          <Tab label="Mailg Photos" sx={{ textTransform: "none" }} />
          <Tab label="Upload" sx={{ textTransform: "none" }} />
          {/* <Tab label="Web Address (URL)" sx={{ textTransform: "none" }} /> */}
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {activeTab === 0 && renderGooglePhotosTab()}
        {activeTab === 1 && renderUploadTab()}
        {/* {activeTab === 2 && renderWebAddressTab()} */}
      </DialogContent>
    </Dialog>
  );
};

export default InsertPhotoModal;
