import React from "react";
import { Box, Button } from "@mui/material";

const EmptyContacts = ({ title, description, onClickCreateContact, titleStyle }) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "calc(100vh - 300px)",
        px: 1,
      }}
    >
      <p
        style={{
          fontSize: "1.5rem",
          fontWeight: 400,
          color: "rgba(0,0,0,.87)",
          marginBottom: 0,
          textAlign: "center",
          ...titleStyle,
        }}
      >
        {title}
      </p>
      <p style={{ fontSize: "0.875rem", fontWeight: 400, color: "rgba(0,0,0,0.87)", textAlign: "center" }}>
        {description}
      </p>
      <Button
        onClick={onClickCreateContact}
        variant="contained"
        sx={{
          borderRadius: "50px",
          textTransform: "none",
          fontWeight: 400,
          fontSize: "0.875rem",
          backgroundColor: "#0b57d0",
          height: "38px",
          "&:hover": {
            opacity: 0.9,
          },
        }}
      >
        <span class="material-symbols-outlined" style={{ fontSize: "20px", marginRight: "8px" }}>
          add
        </span>
        Create contact
      </Button>
    </Box>
  );
};

export default EmptyContacts;
