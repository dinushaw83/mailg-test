import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Box, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export const SuccessModal = ({ isOpen, onClose, details }) => {
  if (!details) return null;

  const formatDateTime = (isoString) => {
    if (!isoString) return "—";
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return "—";
    const startDate = new Date(start);
    const endDate = new Date(end);
    const durationMs = endDate - startDate;
    const durationSec = (durationMs / 1000).toFixed(2);
    return `${durationSec}s`;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        Import Successful
        <IconButton onClick={onClose} size="small" aria-label="Close modal">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography sx={{ mb: 2.5, fontSize: "14px", color: "#2F3941" }}>
            <strong>{details.filename}</strong> was imported successfully.
          </Typography>

          <Box
            sx={{
              backgroundColor: "#F8F9F9",
              borderRadius: "4px",
              p: 2,
              mb: 2,
            }}
          >
            <Typography sx={{ mb: 1.5, fontSize: "13px", fontWeight: 600 }}>Import Summary</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1, fontSize: "13px" }}>
              <Typography sx={{ color: "#68737D", fontSize: "13px" }}>Total Records:</Typography>
              <Typography sx={{ fontWeight: 600, fontSize: "13px" }}>{details.total_records || 0}</Typography>

              <Typography sx={{ color: "#68737D", fontSize: "13px" }}>File Type:</Typography>
              <Typography sx={{ fontSize: "13px" }}>{details.file_type?.toUpperCase() || "—"}</Typography>

              <Typography sx={{ color: "#68737D", fontSize: "13px" }}>Started At:</Typography>
              <Typography sx={{ fontSize: "13px" }}>{formatDateTime(details.started_at)}</Typography>

              <Typography sx={{ color: "#68737D", fontSize: "13px" }}>Finished At:</Typography>
              <Typography sx={{ fontSize: "13px" }}>{formatDateTime(details.finished_at)}</Typography>

              <Typography sx={{ color: "#68737D", fontSize: "13px" }}>Duration:</Typography>
              <Typography sx={{ fontSize: "13px" }}>
                {calculateDuration(details.started_at, details.finished_at)}
              </Typography>
            </Box>
          </Box>

          {details.table_results && details.table_results.length > 0 && (
            <Box>
              <Typography sx={{ mb: 1.5, fontSize: "13px", fontWeight: 600 }}>Table Import Results</Typography>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid #D8DCDE",
                  fontSize: "13px",
                }}
              >
                <thead style={{ backgroundColor: "#F8F9F9" }}>
                  <tr>
                    <th style={{ padding: "8px", textAlign: "left", borderBottom: "1px solid #D8DCDE" }}>Table</th>
                    <th style={{ padding: "8px", textAlign: "right", borderBottom: "1px solid #D8DCDE" }}>Records</th>
                  </tr>
                </thead>
                <tbody>
                  {details.table_results.map((result, idx) => (
                    <tr key={idx}>
                      <td
                        style={{
                          padding: "8px",
                          borderBottom: idx < details.table_results.length - 1 ? "1px solid #D8DCDE" : "none",
                          fontFamily: "monospace",
                        }}
                      >
                        {result.table_name}
                      </td>
                      <td
                        style={{
                          padding: "8px",
                          textAlign: "right",
                          borderBottom: idx < details.table_results.length - 1 ? "1px solid #D8DCDE" : "none",
                        }}
                      >
                        {result.records_imported || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ErrorModal = ({ isOpen, onClose, details, onCancel, isCancelling }) => {
  if (!details) return null;

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#CC3340" }}>
        Import Failed
        <IconButton onClick={onClose} size="small" aria-label="Close modal">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography sx={{ mb: 2, fontSize: "14px", color: "#2F3941" }}>
            <strong>{details.filename}</strong> failed to import.
          </Typography>

          <Box
            sx={{
              backgroundColor: "#FFF0ED",
              border: "1px solid #F5D5D8",
              borderRadius: "4px",
              p: 1.5,
              mb: 2,
            }}
          >
            <Typography sx={{ fontSize: "13px", color: "#CC3340", fontWeight: 600, mb: 1 }}>Error Message:</Typography>
            <Typography sx={{ fontSize: "13px", color: "#2F3941", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
              {details.message}
            </Typography>
          </Box>

          {details.canCancel && (
            <Typography sx={{ fontSize: "13px", color: "#68737D" }}>
              This import is still running. You can cancel it if needed.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
        {details.canCancel && (
          <Button onClick={onCancel} color="error" variant="contained" disabled={isCancelling}>
            {isCancelling ? "Cancelling..." : "Cancel Import"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
