import React from "react";
import { Box, Typography } from "@mui/material";

const FiltersTab = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        Filters and Blocked Addresses
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Filters and Blocked Addresses settings content will be displayed here.
      </Typography>
    </Box>
  );
};

export default FiltersTab;
