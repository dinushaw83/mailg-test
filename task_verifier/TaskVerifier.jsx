/* eslint-disable */

import "./styles.css";

import {
  ErrorOutline as AlertCircle,
  CheckCircle as CheckCircle2,
  ExpandMore as ChevronDown,
  ExpandLess as ChevronUp,
  AccessTime as Clock,
  OpenInNew as ExternalLink,
  Checklist as ListChecks,
  Login as LogIn,
  Logout as LogOut,
  PlayArrow as Play,
  Refresh as RefreshCw,
  RotateLeft as RotateCcw,
  Search as SearchIcon,
  Cancel as XCircle,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { VerificationResult } from "./components";
import apiClient from "../src/services/apiClient.js";
import { compareResults } from "./utils";
import { logout } from "../src/store/slices/userSlice.js";
import { queryClient } from "../src/lib/query-client.js";

export default function TaskVerifier() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const showRawJson = searchParams.has("task-list");
  const taskId = searchParams.get("id");

  const { isAuthenticated, user } = useSelector((state) => state.user);

  const [searchTerm, setSearchTerm] = useState("");
  const [singleTaskJson, setSingleTaskJson] = useState(null);
  const [singleTaskError, setSingleTaskError] = useState(null);
  const [isLoadingSingleTask, setIsLoadingSingleTask] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated);
  const [rawJsonData, setRawJsonData] = useState(null);

  const [isAutoDetected, setAutoDetected] = useState(false);
  const [verifiers, setVerifiers] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const [expandedVerifierId, setExpandedVerifierId] = useState(null);
  const [verifierResults, setVerifierResults] = useState({});
  const [runningVerifiers, setRunningVerifiers] = useState(new Set());
  const [expandedPrompts, setExpandedPrompts] = useState(new Set());

  const [run_id, setRunId] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    const urlRunId = params.get("run_id");
    const mailgRunId = localStorage.getItem("current_run_id");
    return urlRunId || mailgRunId || "";
  });

  // Sync isLoggedIn with isAuthenticated changes or existing session
  useEffect(() => {
    if (isAuthenticated || run_id) {
      setIsLoggedIn(true);
      if (run_id) {
        setAutoDetected(true);
      }
    }
  }, [isAuthenticated, run_id]);

  const fetchTasks = async () => {
    setIsLoadingTasks(true);
    try {
      // Add cache-busting headers to prevent 304 responses from cached data
      const response = await apiClient.get("/v1/prompt-tasks", {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      const data = response.data;
      setRawJsonData(data);
      const tasks = Array.isArray(data) ? data : data.prompt_tasks || [];
      setVerifiers(tasks);
    } catch (e) {
      console.error("Failed to fetch tasks:", e);
      setRawJsonData(null);
      setVerifiers([]);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Display raw JSON by replacing entire document when ?task-list is present
  useEffect(() => {
    if (showRawJson && rawJsonData !== null) {
      document.open("text/plain");
      document.write(JSON.stringify(rawJsonData, null, 2));
      document.close();
    }
  }, [showRawJson, rawJsonData]);

  // Fetch single task when ?id= is present
  useEffect(() => {
    if (!taskId) return;

    const fetchSingleTask = async () => {
      setIsLoadingSingleTask(true);
      setSingleTaskError(null);
      try {
        // Add cache-busting headers to prevent 304 responses
        const response = await apiClient.get(`/v1/prompt-tasks/${encodeURIComponent(taskId)}`, {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
          },
        });
        const data = response.data;
        setSingleTaskJson(data);
      } catch (e) {
        console.error("Failed to fetch task:", e);
        setSingleTaskError(e.response?.data?.detail || e.message || "Failed to fetch task");
      } finally {
        setIsLoadingSingleTask(false);
      }
    };

    fetchSingleTask();
  }, [taskId]);

  // Display single task JSON by replacing entire document when ?id= is present
  useEffect(() => {
    if (!taskId) return;
    if (isLoadingSingleTask) return;

    if (singleTaskJson !== null) {
      document.open("text/plain");
      document.write(JSON.stringify(singleTaskJson, null, 2));
      document.close();
    } else if (singleTaskError) {
      document.open("text/plain");
      document.write(JSON.stringify({ error: singleTaskError }, null, 2));
      document.close();
    }
  }, [taskId, isLoadingSingleTask, singleTaskJson, singleTaskError]);

  const fetchDiff = async () => {
    try {
      // Add cache-busting headers to prevent 304 responses
      const response = await apiClient.get(`/v1/db_diff?session_id=${run_id}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });
      return response.data;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const runVerifier = async (verifier) => {
    const verifierId = verifier.id;
    setRunningVerifiers((prev) => new Set(prev).add(verifierId));
    setExpandedVerifierId(verifierId);

    const startTime = Date.now();
    setVerifierResults((prev) => ({
      ...prev,
      [verifierId]: {
        id: verifierId,
        status: "running",
        message: "Executing verifier...",
        timestamp: new Date().toUTCString(),
      },
    }));

    try {
      const diff = await fetchDiff();
      let assertionResults = null;

      if (verifier.db_verification_config) {
        assertionResults = compareResults(verifier.db_verification_config, diff);
      }

      setVerifierResults((prev) => ({
        ...prev,
        [verifierId]: {
          id: verifierId,
          status: assertionResults?.passed ? "success" : "error",
          message: assertionResults?.passed ? "Verifier passed" : "Verifier failed",
          executionTime: Date.now() - startTime,
          timestamp: new Date().toUTCString(),
          assertionResults,
          diff,
        },
      }));
    } catch (err) {
      setVerifierResults((prev) => ({
        ...prev,
        [verifierId]: {
          id: verifierId,
          status: "error",
          message: `Error: ${err.message}`,
          timestamp: new Date().toUTCString(),
          error: err.message,
        },
      }));
    } finally {
      setRunningVerifiers((prev) => {
        const next = new Set(prev);
        next.delete(verifierId);
        return next;
      });
    }
  };

  const handleResetState = async () => {
    if (
      confirm(
        "Are you sure you want to reset the application state? This will clear all current data and generate a new session."
      )
    ) {
      const currentEmail = user?.email;
      localStorage.removeItem("appState");

      if (currentEmail) {
        localStorage.clear();
        queryClient.clear();
        try {
          // Re-login would need to be handled by your auth system
          // For now, just logout and redirect to login
          dispatch(logout());
          navigate("/login");
        } catch (error) {
          console.error("Failed to re-login during reset:", error);
          dispatch(logout());
        }
      } else {
        dispatch(logout());
      }
      window.location.reload();
    }
  };

  // Local logout handler that doesn't redirect but updates UI via state
  const handleLogout = () => {
    localStorage.clear();
    queryClient.clear();
    setIsLoggedIn(false);
    setRunId("");
    setAutoDetected(false);
    dispatch(logout());
  };

  const filteredVerifiers = verifiers
    .filter(
      (verifier) =>
        verifier.id.toString().includes(searchTerm) || verifier.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by ID string (handles IDs like "MAILG-001", "MAILG-002")
      // Extract numeric part for proper ordering
      const extractNum = (id) => {
        const match = id.match(/(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return extractNum(a.id) - extractNum(b.id);
    });

  useEffect(() => {
    const checkToken = () => {
      const currentToken = localStorage.getItem("current_run_id");
      if (currentToken && currentToken !== run_id) {
        setRunId(currentToken);
        setAutoDetected(true);
        setIsLoggedIn(true);
      }
    };
    checkToken();
    const interval = setInterval(checkToken, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [run_id]);

  // Calculate stats
  const passedCount = Object.values(verifierResults).filter((r) => r.status === "success").length;
  const failedCount = Object.values(verifierResults).filter((r) => r.status === "error").length;
  const pendingCount = verifiers.length - passedCount - failedCount;

  // Raw JSON view - return null while waiting for useEffect to replace document
  if (showRawJson || taskId) {
    return null;
  }

  return (
    <Box sx={{ height: "100vh", bgcolor: "grey.50", overflow: "auto" }}>
      <Box sx={{ maxWidth: "1280px", mx: "auto", px: 3, py: 4 }}>
        {/* Session Configuration */}
        <Card sx={{ mb: 3, borderColor: "grey.200" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box flex={1}>
                <Typography
                  variant="caption"
                  sx={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    mb: 1,
                  }}
                >
                  Session ID
                </Typography>
                <Box position="relative">
                  <TextField
                    type="text"
                    placeholder="Enter session ID or auto-detect from Mailg..."
                    value={run_id}
                    InputProps={{
                      readOnly: true,
                      sx: {
                        fontFamily: "monospace",
                        fontSize: "0.875rem",
                        bgcolor: "grey.100",
                        color: "text.secondary",
                        cursor: "not-allowed",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "grey.200",
                        },
                        "&:hover .MuiOutlinedInput-notchedOutline": {
                          borderColor: "grey.200",
                        },
                      },
                    }}
                    fullWidth
                    size="small"
                  />
                  {isAutoDetected && (
                    <Chip
                      label="Auto-detected"
                      size="small"
                      sx={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "0.75rem",
                        bgcolor: "cyan.50",
                        color: "cyan.700",
                        fontWeight: 500,
                      }}
                    />
                  )}
                </Box>
                <Typography
                  variant="caption"
                  sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.75, display: "block" }}
                >
                  Unique identifier for current verification session (auto-synced from Mailg)
                </Typography>
              </Box>
              <Box display="flex" alignItems="flex-start" gap={1.5}>
                <Box display="flex" flexDirection="column" alignItems="center" minWidth={100}>
                  <Button
                    onClick={fetchTasks}
                    disabled={isLoadingTasks}
                    variant="contained"
                    sx={{
                      height: 44,
                      px: 2.5,
                      bgcolor: "grey.900",
                      color: "white",
                      "&:hover": { bgcolor: "grey.800" },
                      width: "100%",
                    }}
                    startIcon={
                      <RefreshCw
                        sx={{
                          animation: isLoadingTasks ? "spin 1s linear infinite" : "none",
                          "@keyframes spin": {
                            "0%": { transform: "rotate(0deg)" },
                            "100%": { transform: "rotate(360deg)" },
                          },
                        }}
                      />
                    }
                  >
                    {isLoadingTasks ? "Loading..." : "Refresh UI"}
                  </Button>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.6875rem",
                      color: "text.secondary",
                      mt: 0.75,
                      textAlign: "center",
                      fontWeight: 500,
                    }}
                  >
                    Reload task list from API
                  </Typography>
                </Box>
                {isLoggedIn ? (
                  <>
                    <Box display="flex" flexDirection="column" alignItems="center" minWidth={100}>
                      <Button
                        onClick={handleResetState}
                        variant="outlined"
                        sx={{
                          height: 44,
                          px: 2,
                          borderColor: "grey.300",
                          color: "text.secondary",
                          "&:hover": { bgcolor: "grey.100", color: "grey.900" },
                          width: "100%",
                        }}
                        startIcon={<RotateCcw />}
                      >
                        Reset State
                      </Button>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.6875rem",
                          color: "text.secondary",
                          mt: 0.75,
                          textAlign: "center",
                          fontWeight: 500,
                        }}
                      >
                        Clear data & start new session
                      </Typography>
                    </Box>
                    <Box display="flex" flexDirection="column" alignItems="center" minWidth={100}>
                      <Button
                        onClick={handleLogout}
                        variant="outlined"
                        sx={{
                          height: 44,
                          px: 2,
                          borderColor: "error.light",
                          color: "error.main",
                          "&:hover": { bgcolor: "error.light", color: "error.dark" },
                          width: "100%",
                        }}
                        startIcon={<LogOut />}
                      >
                        Log out
                      </Button>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.6875rem",
                          color: "text.secondary",
                          mt: 0.75,
                          textAlign: "center",
                          fontWeight: 500,
                        }}
                      >
                        Sign out of Mailg
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box display="flex" flexDirection="column" alignItems="center" minWidth={100}>
                    <Button
                      onClick={() => navigate("/login")}
                      variant="outlined"
                      sx={{
                        height: 44,
                        px: 2,
                        borderColor: "cyan.200",
                        color: "cyan.600",
                        "&:hover": { bgcolor: "cyan.50", color: "cyan.700" },
                        width: "100%",
                      }}
                      startIcon={<LogIn />}
                    >
                      Login
                    </Button>
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.6875rem",
                        color: "text.secondary",
                        mt: 0.75,
                        textAlign: "center",
                        fontWeight: 500,
                      }}
                    >
                      Sign in to Mailg
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2} mb={3}>
          <Card sx={{ borderColor: "grey.200" }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Total Tasks
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {verifiers.length}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: "grey.100",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ListChecks sx={{ color: "text.secondary" }} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderColor: "grey.200" }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Passed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: "success.main", mt: 0.5 }}>
                    {passedCount}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: "success.light",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle2 sx={{ color: "success.main" }} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderColor: "grey.200" }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Failed
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: "error.main", mt: 0.5 }}>
                    {failedCount}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: "error.light",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <XCircle sx={{ color: "error.main" }} />
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderColor: "grey.200" }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.75rem",
                      fontWeight: 500,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Pending
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {pendingCount}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1,
                    bgcolor: "grey.100",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Clock sx={{ color: "text.secondary" }} />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Task List */}
        <Card sx={{ borderColor: "grey.200" }}>
          <Box sx={{ p: 2.5, borderBottom: 1, borderColor: "grey.100" }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Verification Tasks
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  Run database assertions against your current session state
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Button
                  onClick={() => window.open("/task_verifier?task-list", "_blank")}
                  variant="outlined"
                  size="small"
                  startIcon={<ExternalLink />}
                >
                  Task List JSON
                </Button>
                <TextField
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "text.secondary" }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 288, bgcolor: "grey.50" }}
                />
              </Box>
            </Box>
          </Box>

          <Box>
            {isLoadingTasks ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                  Loading tasks...
                </Typography>
              </Box>
            ) : filteredVerifiers.length === 0 ? (
              <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    bgcolor: "grey.100",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                  }}
                >
                  <AlertCircle sx={{ fontSize: 24, color: "text.secondary" }} />
                </Box>
                <Typography variant="body2" fontWeight={500}>
                  No tasks found
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Click Refresh to load tasks from the API
                </Typography>
              </Box>
            ) : (
              filteredVerifiers.map((verifier) => {
                const isExpanded = expandedVerifierId === verifier.id;
                const isRunning = runningVerifiers.has(verifier.id);
                const result = verifierResults[verifier.id];

                return (
                  <Box key={verifier.id}>
                    <Box
                      sx={{
                        p: 2.5,
                        transition: "background-color 0.2s",
                        bgcolor: isExpanded ? "grey.50" : "transparent",
                        "&:hover": { bgcolor: "grey.50" },
                      }}
                    >
                      <Box display="flex" alignItems="flex-start" gap={2}>
                        {/* Status Indicator */}
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            bgcolor:
                              result?.status === "success"
                                ? "success.light"
                                : result?.status === "error"
                                  ? "error.light"
                                  : result?.status === "running"
                                    ? "info.light"
                                    : "grey.100",
                          }}
                        >
                          {result?.status === "success" ? (
                            <CheckCircle2 sx={{ color: "success.main" }} />
                          ) : result?.status === "error" ? (
                            <XCircle sx={{ color: "error.main" }} />
                          ) : result?.status === "running" ? (
                            <CircularProgress size={20} />
                          ) : (
                            <Play sx={{ color: "text.secondary" }} />
                          )}
                        </Box>

                        {/* Content */}
                        <Box flex={1} minWidth={0}>
                          <Box display="flex" alignItems="center" gap={1.5} mb={0.75}>
                            <Chip
                              label={`#${verifier.id}`}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontFamily: "monospace",
                                fontSize: "0.75rem",
                                bgcolor: "white",
                                borderColor: "grey.200",
                              }}
                            />
                            {result && (
                              <Chip
                                label={
                                  result.status === "running"
                                    ? "Running"
                                    : result.status === "success"
                                      ? "Passed"
                                      : "Failed"
                                }
                                size="small"
                                color={
                                  result.status === "success"
                                    ? "success"
                                    : result.status === "running"
                                      ? "info"
                                      : "error"
                                }
                              />
                            )}
                            {result?.executionTime && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                                {result.executionTime}ms
                              </Typography>
                            )}
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.primary",
                              lineHeight: 1.6,
                              display: expandedPrompts.has(verifier.id) ? "block" : "-webkit-box",
                              WebkitLineClamp: expandedPrompts.has(verifier.id) ? "none" : 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {verifier.prompt}
                          </Typography>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedPrompts((prev) => {
                                const next = new Set(prev);
                                if (next.has(verifier.id)) {
                                  next.delete(verifier.id);
                                } else {
                                  next.add(verifier.id);
                                }
                                return next;
                              });
                            }}
                            size="small"
                            sx={{
                              fontSize: "0.75rem",
                              color: "info.main",
                              mt: 0.5,
                              fontWeight: 500,
                              textTransform: "none",
                            }}
                          >
                            {expandedPrompts.has(verifier.id) ? "Show Less" : "Show Full Prompt"}
                          </Button>
                        </Box>

                        {/* Actions */}
                        <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
                          {isExpanded && (
                            <Button
                              onClick={() => setExpandedVerifierId(null)}
                              variant="text"
                              size="small"
                              startIcon={<ChevronUp />}
                            >
                              Collapse
                            </Button>
                          )}
                          <Button
                            onClick={() => runVerifier(verifier)}
                            disabled={isRunning}
                            variant="contained"
                            size="small"
                            color={isRunning ? "default" : "primary"}
                            startIcon={isRunning ? <CircularProgress size={16} /> : <Play />}
                          >
                            {isExpanded && result ? "Re-run" : "Run"}
                          </Button>
                          <Button
                            onClick={() => window.open(`/task_verifier?id=${verifier.id}`, "_blank")}
                            variant="outlined"
                            size="small"
                            startIcon={<ExternalLink />}
                          >
                            View Verify JSON
                          </Button>
                          {!isExpanded && result && (
                            <Button onClick={() => setExpandedVerifierId(verifier.id)} variant="text" size="small">
                              <ChevronDown />
                            </Button>
                          )}
                        </Box>
                      </Box>
                    </Box>

                    {/* Expanded Results */}
                    {isExpanded && result && (
                      <Box sx={{ borderTop: 1, borderColor: "grey.200", bgcolor: "white", p: 2.5 }}>
                        <VerificationResult result={result} />
                      </Box>
                    )}
                  </Box>
                );
              })
            )}
          </Box>

          {/* Footer */}
          {filteredVerifiers.length > 0 && (
            <Box sx={{ px: 2.5, py: 1.5, bgcolor: "grey.50", borderTop: 1, borderColor: "grey.100" }}>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: "center", display: "block" }}>
                {searchTerm
                  ? `Showing ${filteredVerifiers.length} of ${verifiers.length} tasks`
                  : `${verifiers.length} tasks available`}
              </Typography>
            </Box>
          )}
        </Card>
      </Box>
    </Box>
  );
}
