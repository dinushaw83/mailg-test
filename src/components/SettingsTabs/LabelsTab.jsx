import React from "react";
import { Box, Typography } from "@mui/material";

const LabelsTab = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        Labels
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Labels settings content will be displayed here.
      </Typography>
    </Box>
  );
};

export default LabelsTab;
