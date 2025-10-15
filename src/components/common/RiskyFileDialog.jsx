import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

const RiskyFileDialog = ({ 
  open, 
  onClose, 
  riskyFiles = [], 
  onSendWithoutFiles, 
  onCancel 
}) => {
  const handleSendWithout = () => {
    onSendWithoutFiles?.();
    onClose();
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          minWidth: 400,
          maxWidth: 500,
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" sx={{ fontSize: "16px", fontWeight: 500 }}>
          Attachment security issue
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" sx={{ mb: 2, color: "#5f6368" }}>
          Note: there were errors attaching your file(s). 
          Send this message without these attachments?
        </Typography>
        
        {riskyFiles.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: "#d93025" }}>
              Blocked files:
            </Typography>
            <List dense sx={{ bgcolor: "#fce8e6", borderRadius: 1, py: 0.5, px: 1 }}>
              {riskyFiles.map((file, index) => (
                <ListItem key={index} sx={{ py: 0.25, px: 0 }}>
                  <ListItemText
                    primary={file.name}
                    primaryTypographyProps={{
                      fontSize: "13px",
                      color: "#d93025"
                    }}
                  />
                </ListItem>
              ))}
            </List>
            <Typography variant="body2" sx={{ mt: 1, fontSize: "12px", color: "#5f6368" }}>
              These file types are blocked for security reasons.
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleCancel}
          variant="text"
          sx={{
            color: "#1a73e8",
            textTransform: "none",
            fontWeight: 500,
            fontSize: "14px",
            px: 2,
            py: 1,
            borderRadius: 1,
            "&:hover": {
              backgroundColor: "#e8f0fe"
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSendWithout}
          variant="contained"
          sx={{
            backgroundColor: "#1a73e8",
            color: "white",
            textTransform: "none",
            fontWeight: 500,
            fontSize: "14px",
            px: 2,
            py: 1,
            borderRadius: 1,
            boxShadow: "none",
            "&:hover": {
              backgroundColor: "#1557b0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RiskyFileDialog;
