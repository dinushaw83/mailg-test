import React from "react";
import { Icon } from "./ActionBar";
import { Box } from "@mui/material";
import Button from "@mui/material/Button";

export const Actions = () => {
  return (
    <Box sx={{ display: "flex", gap: 1, marginTop: 5, fontSize: "0.875rem" }}>
      <Button
        variant="outlined"
        sx={{
          borderRadius: 10,
          color: "#444746",
          border: "1px solid #444746",
          "&:hover": { backgroundColor: "#f6f6f6" },
          textTransform: "none",
        }}
        startIcon={
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
            }}
          >
            reply
          </span>
        }
      >
        Reply
      </Button>
      <Button
        variant="outlined"
        sx={{
          borderRadius: 10,
          color: "#444746",
          border: "1px solid #444746",
          "&:hover": { backgroundColor: "#f6f6f6" },
          textTransform: "none",
        }}
        startIcon={
          <span
            className="material-symbols-outlined"
            style={{
              fontSize: 20,
            }}
          >
            forward
          </span>
        }
      >
        Forward
      </Button>
      <Icon
        name="mood"
        label="Add a reaction"
        placement="top"
        style={{ borderRadius: 10, border: "1px solid #444746" }}
      />
    </Box>
  );
};
