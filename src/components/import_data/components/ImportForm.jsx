import React, { useRef, useEffect } from "react";
import {
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Button,
  LinearProgress,
  Box,
  Typography,
} from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

const TABLE_OPTIONS = [
  { value: "", label: "(Select table)" },
  { value: "users", label: "Users" },
  { value: "emails", label: "Emails" },
  { value: "email_recipients", label: "Email Recipients" },
  { value: "labels", label: "Labels" },
  { value: "threads", label: "Threads" },
  { value: "thread_user_metadata", label: "Thread User Metadata" },
  { value: "thread_labels", label: "Thread Labels" },
  { value: "attachments", label: "Attachments" },
  { value: "email_templates", label: "Email Templates" },
  { value: "saved_searches", label: "Saved Searches" },
];

const ImportForm = ({
  selectedFile,
  tableName,
  validationError,
  isUploading,
  isSubmitting,
  uploadProgress,
  onFileChange,
  onTableNameChange,
  onSubmit,
  recloneCurrentRun,
  onRecloneChange,
}) => {
  const fileInputRef = useRef(null);

  // Reset file input when selectedFile is cleared (e.g., after successful import)
  useEffect(() => {
    if (!selectedFile && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [selectedFile]);

  const getFileIcon = () => {
    if (!selectedFile) return null;

    const fileName = selectedFile.name.toLowerCase();
    if (fileName.endsWith(".zip")) return "📦";
    if (fileName.endsWith(".json")) return "📄";
    if (fileName.endsWith(".csv")) return "📊";
    return "📎";
  };

  return (
    <form onSubmit={onSubmit}>
      <Box sx={{ maxWidth: "600px" }}>
        {/* File Upload */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel sx={{ fontSize: "14px", fontWeight: 600, mb: 1 }}>Select File</FormLabel>
          <Box className="file-input-wrapper">
            <input ref={fileInputRef} type="file" id="file-input" accept=".json,.csv,.zip" onChange={onFileChange} />
            <label htmlFor="file-input" className={`file-input-label ${selectedFile ? "has-file" : ""}`}>
              <DescriptionOutlinedIcon sx={{ mr: 1 }} />
              {selectedFile ? "Change file" : "Click to select file (JSON, CSV, or ZIP)"}
            </label>
          </Box>
          {selectedFile && (
            <Box className="file-name-display">
              {getFileIcon()} {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </Box>
          )}
          <FormHelperText sx={{ mt: 1, fontSize: "13px" }}>
            Supported formats: JSON (.json), CSV (.csv), or ZIP (.zip)
          </FormHelperText>
        </FormControl>

        {/* Table Name Dropdown */}
        <FormControl fullWidth sx={{ mb: 3 }}>
          <FormLabel sx={{ fontSize: "14px", fontWeight: 600, mb: 1 }}>Table Name</FormLabel>
          <Select
            className="custom-select"
            value={tableName}
            onChange={onTableNameChange}
            disabled={selectedFile?.name.toLowerCase().endsWith(".zip")}
            size="small"
            displayEmpty
          >
            {TABLE_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText sx={{ mt: 1, fontSize: "13px" }}>
            Table name is required if loading data for a single table (JSON/CSV files). Not required for ZIP files
            containing multiple tables.
          </FormHelperText>
        </FormControl>

        {/* Reclone Current Run Checkbox */}
        <FormControl sx={{ mb: 3 }}>
          <FormControlLabel
            control={<Checkbox checked={recloneCurrentRun} onChange={onRecloneChange} />}
            label={<Typography sx={{ fontSize: "14px" }}>Apply to current session</Typography>}
          />
          <FormHelperText sx={{ mt: 0, ml: 4, fontSize: "13px" }}>
            When checked, your current session will be refreshed to use the imported data immediately. Otherwise, only
            new sessions will see the imported data.
          </FormHelperText>
        </FormControl>

        {/* Validation Error */}
        {validationError && <Box className="validation-error">{validationError}</Box>}

        {/* Upload Progress */}
        {isUploading && (
          <Box sx={{ mt: 3 }}>
            <Box
              sx={{
                p: 2,
                backgroundColor: "#f0f7ff",
                border: "1px solid #bddeff",
                borderRadius: "4px",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1,
                }}
              >
                <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#1f73b7" }}>Uploading file...</Typography>
                <Typography sx={{ fontSize: "13px", fontWeight: 600, color: "#1f73b7" }}>{uploadProgress}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: "8px", borderRadius: "4px" }} />
              <Typography
                sx={{
                  fontSize: "12px",
                  color: "#68737D",
                  mt: 1,
                }}
              >
                {selectedFile?.name} ({(selectedFile?.size / 1024).toFixed(2)} KB)
              </Typography>
            </Box>
          </Box>
        )}

        {/* Submit Button */}
        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            type="submit"
            disabled={isSubmitting || isUploading}
            sx={{ padding: "10px 20px", fontSize: "14px", fontWeight: 400 }}
          >
            {isUploading ? "Uploading..." : isSubmitting ? "Processing..." : "Import Data"}
          </Button>
        </Box>
      </Box>
    </form>
  );
};

export default ImportForm;
