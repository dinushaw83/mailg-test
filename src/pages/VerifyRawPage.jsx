import React from "react";
import { Box } from "@mui/material";
import VerificationRaw from "../components/raw_verifier/VerificationRaw";

const VerifyRawPage = () => {
  return (
    <Box sx={{ height: "100vh", overflow: "auto", bgcolor: "grey.50" }}>
      <VerificationRaw />
    </Box>
  );
};

export default VerifyRawPage;
