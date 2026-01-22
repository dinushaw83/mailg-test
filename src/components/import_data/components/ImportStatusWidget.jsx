import React from "react";
import { CircularProgress, Box, Typography } from "@mui/material";

const ImportStatusWidget = ({ activeImports }) => {
  if (activeImports.length === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        backgroundColor: "#EDF5FD",
        border: "1px solid #BDD7EF",
        borderRadius: "8px",
        p: 2,
        mb: 3,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <CircularProgress size={24} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 600, mb: 1, fontSize: "14px" }}>Import in Progress</Typography>
          <Typography sx={{ fontSize: "12px", color: "#68737D", mb: 1.5 }}>
            You can navigate away from this page. You'll be notified when the import is complete.
          </Typography>
          {activeImports.map((importInfo) => (
            <Typography
              key={importInfo.import_id}
              sx={{
                fontSize: "13px",
                color: "#2F3941",
                mb: 0.5,
              }}
            >
              <span style={{ fontFamily: "monospace" }}>{importInfo.filename}</span>
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default ImportStatusWidget;
