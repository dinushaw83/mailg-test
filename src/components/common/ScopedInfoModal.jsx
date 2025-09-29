import React from "react";
import { Backdrop, Box, Typography, Button } from "@mui/material";

const ScopedInfoModal = ({
  open,
  onClose,
  title,
  description,
  primaryButtonText,
  secondaryButtonText = "Cancel",
  onPrimaryAction,
  onSecondaryAction,
  primaryButtonColor = "#0b57d0",
  secondaryButtonColor = "#0b57d0",
}) => {
  const handlePrimaryAction = () => {
    onPrimaryAction();
    onClose();
  };

  const handleSecondaryAction = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
    }
    onClose();
  };

  return (
    <Backdrop
      open={open}
      sx={{ position: "absolute", zIndex: 100, backgroundColor: "rgba(0, 0, 0, 0.35)" }}
      onClick={onClose}
    >
      <Box sx={{ width: "300px", backgroundColor: "#e9eef6", borderRadius: "28px", px: 2, py: 3, mx: 2 }}>
        <Typography sx={{ fontSize: "1.5rem", fontWeight: 400, lineHeight: "2rem", color: "#1f1f1f" }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: "0.875rem", fontWeight: 400, lineHeight: "1.25rem", color: "#4d504e", mt: 2 }}>
          {description}
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, mt: 2.5 }}>
          <Button
            variant="text"
            size="medium"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 400,
              textTransform: "none",
              color: secondaryButtonColor,
              borderRadius: "50px",
              px: 2,
              py: 1,
              "&:hover": {
                backgroundColor: "rgba(11, 87, 208, 0.08)",
              },
            }}
            onClick={handleSecondaryAction}
          >
            {secondaryButtonText}
          </Button>
          <Button
            variant="text"
            sx={{
              fontSize: "0.875rem",
              fontWeight: 400,
              textTransform: "none",
              color: primaryButtonColor,
              borderRadius: "50px",
              px: 2,
              py: 1,
              "&:hover": {
                backgroundColor: "rgba(11, 87, 208, 0.08)",
              },
            }}
            onClick={handlePrimaryAction}
          >
            {primaryButtonText}
          </Button>
        </Box>
      </Box>
    </Backdrop>
  );
};

export default ScopedInfoModal;
