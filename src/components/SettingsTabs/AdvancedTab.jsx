import React from "react";
import { Box, Typography } from "@mui/material";

const AdvancedTab = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        Advanced
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Advanced settings content will be displayed here.
      </Typography>
    </Box>
  );
};

export default AdvancedTab;
