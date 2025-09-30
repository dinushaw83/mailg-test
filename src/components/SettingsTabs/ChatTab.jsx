import React from "react";
import { Box, Typography } from "@mui/material";

const ChatTab = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        Chat and Meet
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Chat and Meet settings content will be displayed here.
      </Typography>
    </Box>
  );
};

export default ChatTab;
