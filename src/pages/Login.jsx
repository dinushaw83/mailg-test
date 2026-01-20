import { Box, Button, Paper, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { isValidEmail } from "../utils/helperFunctions";
import { setAuth } from "../store/slices/userSlice";
import { useDispatch } from "react-redux";
import userService from "../services/userService";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/inbox";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [email, setEmail] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !isValidEmail(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tokenData = await userService.createToken(email.trim());
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

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading && email.trim() && isValidEmail(email.trim())) {
      handleLogin();
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
          Enter your email to continue
        </Typography>

        {error && (
          <Typography variant="body2" sx={{ mb: 2, color: "#d32f2f" }}>
            {error}
          </Typography>
        )}

        <TextField
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyPress={handleKeyPress}
          fullWidth
          disabled={loading}
          error={email.trim() !== "" && !isValidEmail(email.trim())}
          helperText={
            email.trim() !== "" && !isValidEmail(email.trim())
              ? "Please enter a valid email address"
              : ""
          }
          sx={{ mb: 2 }}
          autoFocus
        />

        <Button
          variant="contained"
          fullWidth
          onClick={handleLogin}
          disabled={loading || !email.trim() || !isValidEmail(email.trim())}
          sx={{
            mb: 2,
            backgroundColor: "#1a73e8",
            "&:hover": {
              backgroundColor: "#1557b0",
            },
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </Button>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="textSecondary">
            {loading ? "Logging in..." : "Enter your email address to authenticate"}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Login;
