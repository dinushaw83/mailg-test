import React, { useEffect } from "react";
import { Box } from "@mui/material";

const ContactTrash = () => {
  useEffect(() => {
    // Update the document title
    document.title = "Trash";
  }, []);

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        margin: "16px 16px 16px 20px",
        borderRadius: "24px",
        width: "100%",
        height: "calc(100vh - 146px)",
        pl: 1.5,
        py: 3,
      }}
    >
      <p>Trash</p>
    </Box>
  );
};

export default ContactTrash;
