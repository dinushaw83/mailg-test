import React from "react";
import { Box, Typography } from "@mui/material";

const OfflineTab = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        Offline
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Offline settings content will be displayed here.
      </Typography>
    </Box>
  );
};

export default OfflineTab;
