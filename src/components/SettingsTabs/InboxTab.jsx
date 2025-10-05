import React from "react";
import { Box, Typography } from "@mui/material";

const InboxTab = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        Inbox
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Inbox settings content will be displayed here.
      </Typography>
    </Box>
  );
};

export default InboxTab;
