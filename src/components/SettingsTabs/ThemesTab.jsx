import React from "react";
import { Box, Typography } from "@mui/material";

const ThemesTab = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        Themes
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Themes settings content will be displayed here.
      </Typography>
    </Box>
  );
};

export default ThemesTab;
