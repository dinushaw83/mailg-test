import React from "react";
import { Box } from "@mui/material";
import GeneralSettings from "./General";

const GeneralTab = () => {
  return (
    <Box sx={{ p: 3, height: "calc(100vh - 200px)", overflowY: "auto" }}>
      <GeneralSettings />
    </Box>
  );
};

export default GeneralTab;
