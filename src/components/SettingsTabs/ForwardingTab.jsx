import React from "react";
import { Box, Typography } from "@mui/material";

const ForwardingTab = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        Forwarding and POP/IMAP
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Forwarding and POP/IMAP settings content will be displayed here.
      </Typography>
    </Box>
  );
};

export default ForwardingTab;
