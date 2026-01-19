import { Avatar, Box, Button, List, ListItem, ListItemAvatar, ListItemText, Paper, Typography } from "@mui/material";
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { setAuth } from "../store/slices/userSlice";
import { useDispatch } from "react-redux";
import userService from "../services/userService";

const TEST_USERS = [{ email: "John.doe@example.com", name: "Test User", role: "user" }];

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/inbox";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUserSelect = async (user) => {
    try {
      setLoading(true);
      setError(null);

      const tokenData = await userService.createToken(user.email);
      // tokenData shape: { access_token, user, role, run_id, expires_in }
      dispatch(setAuth(tokenData));

      navigate(from, { replace: true });
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.response?.data?.message || e?.message || "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f0f2f5",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          padding: 4,
          width: "100%",
          maxWidth: 400,
          textAlign: "center",
          borderRadius: 2,
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 500, color: "#1a73e8" }}>
          MailG Login
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Select a test user to continue
        </Typography>

        {error && (
          <Typography variant="body2" sx={{ mb: 2, color: "#d32f2f" }}>
            {error}
          </Typography>
        )}

        <List sx={{ width: "100%", bgcolor: "background.paper" }}>
          {TEST_USERS.map((user) => (
            <ListItem
              key={user.email}
              button
              onClick={() => handleUserSelect(user)}
              disabled={loading}
              sx={{
                mb: 1,
                borderRadius: 1,
                border: "1px solid #e0e0e0",
                "&:hover": {
                  backgroundColor: "#f8f9fa",
                  borderColor: "#1a73e8",
                },
              }}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: "#1a73e8" }}>{user.name.charAt(0)}</Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={user.name}
                secondary={user.email}
                primaryTypographyProps={{ variant: "body1", fontWeight: 500 }}
              />
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="textSecondary">
            {loading ? "Logging in..." : "This is a development login screen for testing purposes."}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
