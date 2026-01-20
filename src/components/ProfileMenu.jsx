import { Avatar, Box, Button, Dialog, DialogContent, Divider, IconButton, Popover, Typography } from "@mui/material";
import React, { useState } from "react";

import { Close as CloseIcon } from "@mui/icons-material";
import { generateAvatarColor } from "../utils/helperFunctions";
import { logout } from "../store/slices/userSlice";
import { useDispatch } from "react-redux";
import { useGlobalContext } from "../contexts/GlobalContext";
import { useNavigate } from "react-router-dom";

const ProfileMenu = ({ anchorEl, open, onClose }) => {
  const { loggedInUser } = useGlobalContext();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [profilePictureDialogOpen, setProfilePictureDialogOpen] = useState(false);

  const handleManageAccount = () => {
    navigate("/mailg-account/personal-info");
    onClose();
  };

  const handleAddAccount = () => {
    // TODO: Implement add account logic
  };

  const handleSignOut = () => {
    dispatch(logout());
    onClose();
    navigate("/login", { replace: true });
  };

  const handleProfilePictureClick = () => {
    setProfilePictureDialogOpen(true);
    onClose();
  };

  const handleProfilePictureUpload = () => {
    // Handle profile picture upload
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // TODO: Implement file upload logic
      }
    };
    input.click();
  };

  const avatarColor = generateAvatarColor(loggedInUser.name);
  const initials = loggedInUser.name.charAt(0).toUpperCase();

  return (
    <>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        slotProps={{
          paper: {
            sx: {
              width: "390px",
              borderRadius: "24px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              mt: 1,
              overflow: "visible",
            },
          },
        }}
      >
        <Box sx={{ p: 3, position: "relative" }}>
          {/* Close button */}
          <IconButton
            onClick={onClose}
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              color: "#5f6368",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>

          {/* Email */}
          <Typography
            sx={{
              fontSize: "14px",
              color: "#5f6368",
              mb: 2,
              textAlign: "center",
            }}
          >
            {loggedInUser.email}
          </Typography>

          {/* Profile Picture & Name */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 2 }}>
            <Box sx={{ position: "relative", mb: 1.5 }}>
              <Avatar
                sx={{
                  bgcolor: loggedInUser.avatar ? "transparent" : avatarColor,
                  color: "white",
                  width: 80,
                  height: 80,
                  fontSize: "32px",
                  fontWeight: 400,
                }}
              >
                {loggedInUser.avatar ? (
                  <img
                    src={loggedInUser.avatar}
                    alt={loggedInUser.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  />
                ) : (
                  initials
                )}
              </Avatar>
              {/* Camera icon overlay */}
              <IconButton
                onClick={handleProfilePictureClick}
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 24,
                  height: 24,
                  backgroundColor: "white",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #dadce0",
                  padding: 0,
                  "&:hover": {
                    backgroundColor: "#f8f9fa",
                  },
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: "16px",
                    color: "#5f6368",
                  }}
                >
                  photo_camera
                </span>
              </IconButton>
            </Box>

            <Typography
              sx={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#202124",
                mb: 2,
              }}
            >
              Hi, {loggedInUser.name.split(" ")[0]}!
            </Typography>

            {/* Manage Account Button */}
            <Button
              variant="outlined"
              onClick={handleManageAccount}
              sx={{
                textTransform: "none",
                borderRadius: "24px",
                px: 3,
                py: 1,
                fontSize: "14px",
                fontWeight: 500,
                color: "#1967d2",
                borderColor: "#dadce0",
                "&:hover": {
                  backgroundColor: "#f8f9fa",
                  borderColor: "#dadce0",
                },
              }}
            >
              Manage your MailG Account
            </Button>
          </Box>

          {/* Add account and Sign out buttons */}
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Button
              onClick={handleAddAccount}
              sx={{
                flex: 1,
                textTransform: "none",
                border: "1px solid #dadce0",
                borderRadius: "20px",
                px: 2,
                py: 1.5,
                fontSize: "14px",
                fontWeight: 500,
                color: "#3c4043",
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                gap: 1,
                "&:hover": {
                  backgroundColor: "#f8f9fa",
                  borderColor: "#dadce0",
                },
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                person_add
              </span>
              Add account
            </Button>

            <Button
              onClick={handleSignOut}
              sx={{
                flex: 1,
                textTransform: "none",
                border: "1px solid #dadce0",
                borderRadius: "20px",
                px: 2,
                py: 1.5,
                fontSize: "14px",
                fontWeight: 500,
                color: "#3c4043",
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                gap: 1,
                "&:hover": {
                  backgroundColor: "#f8f9fa",
                  borderColor: "#dadce0",
                },
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                logout
              </span>
              Sign out
            </Button>
          </Box>

          {/* Storage Section */}
          <Box
            sx={{
              border: "1px solid #dadce0",
              borderRadius: "20px",
              px: 2,
              py: 1.5,
              mb: 2,
              backgroundColor: "white",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "#5f6368" }}>
              cloud_queue
            </span>
            <Typography sx={{ fontSize: "14px", fontWeight: 500, color: "#3c4043" }}>15% of 15 GB used</Typography>
          </Box>

          {/* Footer Links */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 1.5,
              mt: 2,
            }}
          >
            <Typography
              component="a"
              href="#"
              sx={{
                fontSize: "12px",
                color: "#5f6368",
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Privacy Policy
            </Typography>
            <Typography sx={{ fontSize: "12px", color: "#5f6368" }}>•</Typography>
            <Typography
              component="a"
              href="#"
              sx={{
                fontSize: "12px",
                color: "#5f6368",
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Terms of Service
            </Typography>
          </Box>
        </Box>
      </Popover>

      {/* Profile Picture Dialog */}
      <Dialog
        open={profilePictureDialogOpen}
        onClose={() => setProfilePictureDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            padding: "24px",
          },
        }}
      >
        <Box sx={{ position: "relative" }}>
          {/* Close button */}
          <IconButton
            onClick={() => setProfilePictureDialogOpen(false)}
            sx={{
              position: "absolute",
              top: -16,
              left: -16,
              color: "#5f6368",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>

          {/* Three dots menu */}
          <IconButton
            sx={{
              position: "absolute",
              top: -16,
              right: -16,
              color: "#5f6368",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
              more_vert
            </span>
          </IconButton>

          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Typography sx={{ fontSize: "22px", fontWeight: 400, color: "#5f6368" }}>MailG Account</Typography>
          </Box>

          {/* Content */}
          <DialogContent sx={{ px: 0, py: 0 }}>
            <Typography
              sx={{
                fontSize: "24px",
                fontWeight: 400,
                color: "#202124",
                mb: 1,
              }}
            >
              Profile picture
            </Typography>
            <Typography
              sx={{
                fontSize: "14px",
                color: "#5f6368",
                mb: 4,
                lineHeight: 1.5,
              }}
            >
              A picture helps people recognize you and lets you know when you're signed in to your account
            </Typography>

            {/* Large Avatar */}
            <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
              <Avatar
                sx={{
                  bgcolor: loggedInUser.avatar ? "transparent" : avatarColor,
                  color: "white",
                  width: 264,
                  height: 264,
                  fontSize: "120px",
                  fontWeight: 400,
                }}
              >
                {loggedInUser.avatar ? (
                  <img
                    src={loggedInUser.avatar}
                    alt={loggedInUser.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                  />
                ) : (
                  initials
                )}
              </Avatar>
            </Box>

            {/* Add profile picture button */}
            <Button
              variant="contained"
              fullWidth
              onClick={handleProfilePictureUpload}
              startIcon={
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  photo_camera
                </span>
              }
              sx={{
                textTransform: "none",
                backgroundColor: "#aecbfa",
                color: "#041e49",
                fontSize: "14px",
                fontWeight: 500,
                py: 1.5,
                borderRadius: "24px",
                boxShadow: "none",
                "&:hover": {
                  backgroundColor: "#c2d7f7",
                  boxShadow: "none",
                },
              }}
            >
              Add profile picture
            </Button>
          </DialogContent>
        </Box>
      </Dialog>
    </>
  );
};

export default ProfileMenu;
