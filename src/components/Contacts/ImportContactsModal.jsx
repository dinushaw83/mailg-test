import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import { parseCSV, parseVCard } from "../../utils/contactImport.js";

const ImportContactsModal = ({ open, onClose, onImport }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleSelectFile = () => {
    const input = fileInputRef.current;
    if (input) {
      input.click();
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const fileName = selectedFile.name || "";
      const fileExtension = fileName.split(".").pop()?.toLowerCase() || "";
      let contacts = [];

      if (fileExtension === "csv") {
        const text = await selectedFile.text();
        contacts = parseCSV(text);
      } else if (fileExtension === "vcf") {
        const text = await selectedFile.text();
        contacts = parseVCard(text);
      } else {
        throw new Error("Unsupported file format");
      }

      // Call the onImport callback with the parsed contacts
      await onImport(contacts);

      // Reset state and close modal
      setSelectedFile(null);
      onClose();
    } catch (error) {
      console.error("Error importing contacts:", error);
      // TODO: Show error message to user
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: "28px",
          maxWidth: "450px",
          width: "450px",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontSize: "24px",
          fontWeight: 400,
          color: "#1f1f1f",
          px: 3,
          py: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        Import contacts
        <Tooltip title="Learn more" placement="top">
          <IconButton size="small" sx={{ color: "#1a73e8" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              info
            </span>
          </IconButton>
        </Tooltip>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 1 }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: "14px",
              fontWeight: 400,
              color: "#1f1f1f",
              mb: 2,
            }}
          >
            To get started, select a file.
            <br />
            Use a CSV or vCard format or our{" "}
            <a
              href="#"
              rel="noopener noreferrer"
              style={{
                color: "#1a73e8",
                textDecoration: "none",
              }}
            >
              template
            </a>
            .
          </Typography>

          <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 2 }}>
            <Button
              variant="contained"
              onClick={handleSelectFile}
              disabled={isImporting}
              sx={{
                backgroundColor: "#1a73e8",
                color: "white",
                textTransform: "none",
                fontSize: "14px",
                fontWeight: 500,
                px: 3,
                py: 1,
                borderRadius: "20px",
                "&:hover": {
                  backgroundColor: "#1557b0",
                },
                "&:disabled": {
                  backgroundColor: "#e0e0e0",
                  color: "#9aa0a6",
                },
              }}
            >
              Select file
            </Button>
          </Box>

          {selectedFile && (
            <Box
              sx={{
                p: 2,
                backgroundColor: "#f8f9fa",
                borderRadius: "8px",
                border: "1px solid #e0e0e0",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontSize: "14px",
                  color: "#1f1f1f",
                  fontWeight: 500,
                  mb: 0.5,
                }}
              >
                Selected file:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontSize: "14px",
                  color: "#5f6368",
                }}
              >
                {selectedFile.name || "Unknown file"}
              </Typography>
            </Box>
          )}

          <Typography
            variant="body2"
            sx={{
              fontSize: "14px",
              fontWeight: 400,
              color: "#1f1f1f",
              mt: 2,
            }}
          >
            Trying to backup your mobile contacts?{" "}
            <a
              href="#"
              rel="noopener noreferrer"
              style={{
                color: "#1a73e8",
                textDecoration: "none",
              }}
            >
              Here is how to sync them.
            </a>
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          gap: 1,
        }}
      >
        <Button
          onClick={handleCancel}
          disabled={isImporting}
          sx={{
            textTransform: "none",
            fontSize: "14px",
            fontWeight: 500,
            color: "#1a73e8",
            px: 2,
            py: 1,
            borderRadius: "20px",
            "&:hover": {
              backgroundColor: "rgba(26, 115, 232, 0.12)",
            },
            "&:disabled": {
              color: "#9aa0a6",
            },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={!selectedFile || isImporting}
          sx={{
            textTransform: "none",
            fontSize: "14px",
            fontWeight: 500,
            color: selectedFile && !isImporting ? "#1a73e8" : "#9aa0a6",
            px: 2,
            py: 1,
            borderRadius: "20px",
            "&:hover": {
              backgroundColor: selectedFile && !isImporting ? "rgba(26, 115, 232, 0.12)" : "transparent",
            },
            "&:disabled": {
              color: "#9aa0a6",
            },
          }}
        >
          {isImporting ? "Importing..." : "Import"}
        </Button>
      </DialogActions>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.vcf"
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
    </Dialog>
  );
};

export default ImportContactsModal;
