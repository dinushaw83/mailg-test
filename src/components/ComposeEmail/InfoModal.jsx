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

export default function InfoModal({
  isOpen,
  onClose,
  title,
  message,
  buttons,
  modalBoxStyle = {},
  titleStyle = {},
  messageStyle = {},
  buttonContainerStyle: customButtonContainerStyle = {},
  buttonStyle = {},
}) {
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
            sx={{
              fontSize: "1.5rem",
              fontWeight: 400,
              lineHeight: "2rem",
              color: "#1f1f1f",
              ...titleStyle,
            }}
          >
            {title}
          </Typography>
        )}
        <Typography
          id="modal-modal-description"
          sx={{
            fontSize: "0.875rem",
            fontWeight: 400,
            lineHeight: "1.25rem",
            color: "#4d504e",
            mt: 2,
            ...messageStyle,
          }}
        >
          {message}
        </Typography>
        <Box sx={{ ...buttonContainerStyle, ...customButtonContainerStyle }}>
          {buttons.map((button, index) => (
            <Button
              key={index}
              variant={
                button.className === "primary" ? "contained" : button.className === "tertiary" ? "text" : "outlined"
              }
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
                ...(button.className === "tertiary" && {
                  border: "none",
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                }),
                ...buttonStyle,
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
