import React from "react";
import { Box, Typography } from "@mui/material";

const AccountsTab = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ marginBottom: 2, color: "#202124" }}>
        Accounts and Import
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Accounts and Import settings content will be displayed here.
      </Typography>
    </Box>
  );
};

export default AccountsTab;
