import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import React from "react";

const Apps = () => {
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
          Apps in MailG
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: "1rem",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
            cursor: "pointer",
            padding: "0.25rem",
            borderRadius: "4px",
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "row", gap: "1rem", alignItems: "center" }}>
            <Box
              sx={{
                fontSize: "0.875rem",
                color: "rgb(32, 33, 36)",
                gap: "0.5rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                justifyContent: "flex-start",
              }}
            >
              <Box>Chat and Meet</Box>

              <Button
                size="small"
                sx={{
                  borderRadius: "20px",
                  padding: "0px 12px",
                  textTransform: "none",
                  justifyContent: "flex-start",
                  minWidth: "auto",
                  width: "fit-content",
                  marginLeft: "-12px",
                  paddingLeft: "12px",
                }}
                onClick={() => {
                  console.log("customize");
                }}
              >
                Customize
              </Button>
            </Box>
          </Box>
          <Box>
            <img src="/assets/images/Nav_promo.png" alt="Nav_promo" />
          </Box>
        </Box>
      </Box>
      <Divider sx={{ marginLeft: "0.2rem", marginRight: "0.5rem" }} />
    </Box>
  );
};

export default Apps;
