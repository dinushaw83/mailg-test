import { Box, Button, IconButton, InputAdornment, Paper, TextField, Tooltip, Typography } from "@mui/material";
import React, { useState } from "react";

import { CheckCircle } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

const SessionId = () => {
  const navigate = useNavigate();
  const { loggedInUser, runId } = useSelector((state) => state.user);
  const [copyTooltipOpen, setCopyTooltipOpen] = useState(false);

  const handleCopy = async () => {
    if (runId) {
      try {
        await navigator.clipboard.writeText(runId);
        setCopyTooltipOpen(true);
        setTimeout(() => setCopyTooltipOpen(false), 2000);
      } catch (err) {
        // Error copying to clipboard
      }
    }
  };

  const handleContinue = () => {
    navigate("/inbox", { replace: true });
  };

  const userName = loggedInUser?.name || `${loggedInUser?.firstName || ""} ${loggedInUser?.lastName || ""}`.trim() || "User";
  const userEmail = loggedInUser?.email || "";

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f0f2f5",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          width: "100%",
          maxWidth: 500,
          textAlign: "center",
          borderRadius: 2,
        }}
      >
        {/* Success Icon */}
        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
          <CheckCircle sx={{ fontSize: 64, color: "#4caf50" }} />
        </Box>

        {/* Success Message */}
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
          Congratulations!
        </Typography>
        <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
          You are logged in successfully
        </Typography>

        {/* User Information */}
        <Box sx={{ textAlign: "left", mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
              Name:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 400 }}>
              {userName}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500 }}>
              Email:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 400 }}>
              {userEmail}
            </Typography>
          </Box>

          {/* Session ID */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="textSecondary" sx={{ fontWeight: 500, mb: 1 }}>
              Session ID:
            </Typography>
            <TextField
              fullWidth
              value={runId || ""}
              disabled
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Tooltip
                      title={copyTooltipOpen ? "Copied!" : "Copy"}
                      placement="top"
                      slotProps={{
                        popper: {
                          sx: {
                            "& .MuiTooltip-tooltip": {
                              borderRadius: 0,
                              fontSize: "11px",
                              fontWeight: 300,
                            },
                          },
                        },
                      }}
                    >
                      <IconButton
                        onClick={handleCopy}
                        disabled={!runId}
                        sx={{
                          "&:hover": {
                            backgroundColor: "transparent",
                          },
                        }}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: "20px",
                            color: "#0b57d0",
                          }}
                        >
                          content_copy
                        </span>
                      </IconButton>
                    </Tooltip>
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiInputBase-root.Mui-disabled": {
                  backgroundColor: "#f5f5f5",
                },
              }}
            />
          </Box>
        </Box>

        {/* Continue Button */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleContinue}
          sx={{
            backgroundColor: "#1a73e8",
            "&:hover": {
              backgroundColor: "#1557b0",
            },
          }}
        >
          Continue
        </Button>
      </Paper>
    </Box>
  );
};

export default SessionId;
