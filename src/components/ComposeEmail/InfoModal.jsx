import React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 250,
  bgcolor: "background.paper",
  borderRadius: 8,
  boxShadow: 24,
  p: 3,
  outline: "none",
};

const buttonContainerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 2,
  mt: 3,
};

export default function InfoModal({ isOpen, onClose, title, message, buttons, modalBoxStyle = {} }) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
    >
      <Box sx={{ ...modalStyle, ...modalBoxStyle }}>
        {title && (
          <Typography
            id="modal-modal-title"
            variant="h6"
            component="h2"
            sx={{ mb: 2, fontWeight: 400, fontSize: "1.5rem" }}
          >
            {title}
          </Typography>
        )}
        <Typography id="modal-modal-description" sx={{ mb: 3, color: "#444746", fontSize: "0.875rem" }}>
          {message}
        </Typography>
        <Box sx={buttonContainerStyle}>
          {buttons.map((button, index) => (
            <Button
              key={index}
              variant={button.className === "primary" ? "contained" : "outlined"}
              onClick={button.onClick}
              sx={{
                minWidth: 70,
                padding: "8px 16px",
                borderRadius: 10,
                ...(button.className === "primary" && {
                  backgroundColor: "#2059cf",
                  "&:hover": {
                    backgroundColor: "#1571d9",
                  },
                }),
              }}
            >
              {button.text}
            </Button>
          ))}
        </Box>
      </Box>
    </Modal>
  );
}
