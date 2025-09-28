import Box from "@mui/material/Box";
import Checkbox from "@mui/material/Checkbox";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import React, { useState } from "react";

const Threading = () => {
  const [threading, setThreading] = useState(true);

  return (
    <Box>
      <Box sx={{ padding: "1rem", paddingBottom: "0" }}>
        <Typography
          sx={{
            fontSize: "0.75rem",
            color: "#444746",
            fontWeight: "500",
            letterSpacing: "0.00834rem",
            marginBottom: "1rem",
          }}
        >
          Threading
        </Typography>

        <Box sx={{ marginBottom: "0.7rem", display: "flex", flexDirection: "row", alignItems: "center" }}>
          <Checkbox checked={threading} onChange={() => setThreading(!threading)} />
          <Typography sx={{ fontSize: "0.875rem", color: "rgb(32, 33, 36)" }}>Conversation view</Typography>
          <Tooltip title="Group emails of the same topic together" placement="top">
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
              help
            </span>
          </Tooltip>
        </Box>
      </Box>
      <Divider sx={{ marginLeft: "0.2rem", marginRight: "0.5rem" }} />
    </Box>
  );
};

export default Threading;
