import React from "react";
import { 
  Box, 
  Typography
} from "@mui/material";
import VacationResponder from "./VacationResponder";

const GeneralTab = () => {

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        General
      </Typography>
      
      {/* Vacation Responder Section */}
      <VacationResponder />
    </Box>
  );
};

export default GeneralTab;
