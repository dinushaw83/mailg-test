import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import React from "react";

const Themes = () => {
  return (
    <Box>
      <Box sx={{ padding: "1rem", paddingBottom: "0" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: "1rem",
            alignItems: "start",
            justifyContent: "space-between",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: "#444746",
              fontWeight: "500",
              letterSpacing: "0.00834rem",
              marginBottom: "1rem",
            }}
          >
            Theme
          </Typography>
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
            onClick={() => {}}
          >
            View all
          </Button>
        </Box>
        <Box sx={{ marginBottom: "0.7rem" }}>
          <Box sx={{ cursor: "pointer" }}>
            <img
              style={{ borderRadius: "6px" }}
              width={60}
              height={40}
              src="/assets/images/previewHD5.png"
              alt="Nav_promo"
            />
          </Box>
        </Box>
      </Box>
      <Divider sx={{ marginLeft: "0.2rem", marginRight: "0.5rem" }} />
    </Box>
  );
};

export default Themes;
