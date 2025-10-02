import React from "react";
import { Box, Typography } from "@mui/material";

const GeneralTab = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        General
      </Typography>
      <Typography variant="body2" color="text.secondary">
        General settings content will be displayed here.
      </Typography>
    </Box>
  );
};

export default GeneralTab;
