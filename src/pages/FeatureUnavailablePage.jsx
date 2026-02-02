import { Box, Button, Typography } from "@mui/material";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const FeatureUnavailablePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "502 - Feature not available | MailG";
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%",
        px: 2,
        py: 4,
        boxSizing: "border-box",
      }}
      role="main"
      aria-label="Feature not available"
    >
      <Typography
        component="h1"
        variant="h4"
        sx={{
          fontWeight: 600,
          color: "#444746",
          mb: 1,
        }}
      >
        502
      </Typography>
      <Typography
        variant="body1"
        sx={{
          color: "#5f6368",
          mb: 3,
          textAlign: "center",
          maxWidth: 400,
        }}
      >
        This feature is not available yet. The action has no functionality attached.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate("/inbox")}
        sx={{
          textTransform: "none",
          fontWeight: 600,
        }}
      >
        Back to Inbox
      </Button>
    </Box>
  );
};

export default FeatureUnavailablePage;
