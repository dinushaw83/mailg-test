"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { getQueryClient } from "@/lib/query-client";
import { BASE_URL } from "@/lib/axios-instance";
import { VerificationResult } from "./components";
import { compareResults } from "./utils";
import type {
  VerifierTask,
  VerifierResult as VerifierResultType,
} from "./types";
import {
  Search,
  RefreshCw,
  Play,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  ListChecks,
  AlertCircle,
  LogOut,
  LogIn,
  ExternalLink,
} from "lucide-react";
import "./styles.css";

export default function VerifyPage() {
  const searchParams = useSearchParams();
  const showRawJson = searchParams.has("task-list");
  const taskId = searchParams.get("id");

  const [searchTerm, setSearchTerm] = useState("");
  const [singleTaskJson, setSingleTaskJson] = useState<any>(null);
  const [singleTaskError, setSingleTaskError] = useState<string | null>(null);
  const [isLoadingSingleTask, setIsLoadingSingleTask] = useState(false);
  const { login, logout, user, isAuthenticated } = useAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated);
  const [rawJsonData, setRawJsonData] = useState<any>(null);

  const [isAutoDetected, setAutoDetected] = useState(false);
  const [verifiers, setVerifiers] = useState<VerifierTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const [expandedVerifierId, setExpandedVerifierId] = useState<string | null>(
    null
  );
  const [verifierResults, setVerifierResults] = useState<
    Record<string, VerifierResultType>
  >({});
  const [runningVerifiers, setRunningVerifiers] = useState<Set<string>>(
    new Set()
  );
  const [expandedPrompts, setExpandedPrompts] = useState<Set<string>>(
    new Set()
  );

  const [run_id, setRunId] = useState(() => {
    if (typeof window === "undefined") return "";
    const params = new URLSearchParams(window.location.search);
    const urlRunId = params.get("run_id");
    const miraRunId = localStorage.getItem("current_run_id");
    return urlRunId || miraRunId || "";
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
      const response = await fetch(`${BASE_URL}/prompt-tasks`);
      const data = await response.json();
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
        const response = await fetch(
          `${BASE_URL}/prompt-tasks/${encodeURIComponent(taskId)}`
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        setSingleTaskJson(data);
      } catch (e: any) {
        console.error("Failed to fetch task:", e);
        setSingleTaskError(e.message || "Failed to fetch task");
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
      const response = await fetch(`${BASE_URL}/db_diff?session_id=${run_id}`);
      const data = await response.json();
      return data;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const runVerifier = async (verifier: VerifierTask) => {
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
        assertionResults = compareResults(
          verifier.db_verification_config,
          diff
        );
      }

      setVerifierResults((prev) => ({
        ...prev,
        [verifierId]: {
          id: verifierId,
          status: assertionResults?.passed ? "success" : "error",
          message: assertionResults?.passed
            ? "Verifier passed"
            : "Verifier failed",
          executionTime: Date.now() - startTime,
          timestamp: new Date().toUTCString(),
          assertionResults,
          diff,
        },
      }));
    } catch (err: any) {
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
        const queryClient = getQueryClient();
        queryClient.clear();
        try {
          await login(currentEmail);
        } catch (error) {
          console.error("Failed to re-login during reset:", error);
          logout();
        }
      } else {
        logout();
      }
      window.location.reload();
    }
  };

  // Local logout handler that doesn't redirect but updates UI via state
  const handleLogout = () => {
    localStorage.clear();
    const queryClient = getQueryClient();
    queryClient.clear();
    setIsLoggedIn(false);
    setRunId("");
    setAutoDetected(false);
  };

  const filteredVerifiers = verifiers
    .filter(
      (verifier) =>
        verifier.id.toString().includes(searchTerm) ||
        verifier.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by ID string (handles IDs like "MIRA-001", "MIRA-002")
      // Extract numeric part for proper ordering
      const extractNum = (id: string) => {
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
  const passedCount = Object.values(verifierResults).filter(
    (r) => r.status === "success"
  ).length;
  const failedCount = Object.values(verifierResults).filter(
    (r) => r.status === "error"
  ).length;
  const pendingCount = verifiers.length - passedCount - failedCount;

  // Raw JSON view - return null while waiting for useEffect to replace document
  if (showRawJson || taskId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Session Configuration */}
        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                  Session ID
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Enter session ID or auto-detect from Mira..."
                    value={run_id}
                    readOnly
                    className="h-11 pl-4 pr-24 font-mono text-sm bg-slate-100 border-slate-200 text-gray-500 cursor-not-allowed focus:border-slate-200 focus:ring-0"
                  />
                  {isAutoDetected && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyan-600 bg-cyan-50 px-2 py-1 rounded font-medium">
                      Auto-detected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Unique identifier for current verification session
                  (auto-synced from Mira)
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center min-w-[100px]">
                  <Button
                    onClick={fetchTasks}
                    disabled={isLoadingTasks}
                    className="h-11 px-5 bg-slate-900 hover:bg-slate-800 text-white w-full"
                  >
                    <RefreshCw
                      className={`w-4 h-4 mr-2 ${isLoadingTasks ? "animate-spin" : ""}`}
                    />
                    {isLoadingTasks ? "Loading..." : "Refresh UI"}
                  </Button>
                  <span className="text-[11px] text-slate-600 mt-1.5 text-center font-medium">
                    Reload task list from API
                  </span>
                </div>
                {isLoggedIn ? (
                  <>
                    <div className="flex flex-col items-center min-w-[100px]">
                      <Button
                        onClick={handleResetState}
                        variant="outline"
                        className="h-11 px-4 border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900 w-full"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset State
                      </Button>
                      <span className="text-[11px] text-slate-600 mt-1.5 text-center font-medium">
                        Clear data & start new session
                      </span>
                    </div>
                    <div className="flex flex-col items-center min-w-[100px]">
                      <Button
                        onClick={handleLogout}
                        variant="outline"
                        className="h-11 px-4 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 w-full"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Log out
                      </Button>
                      <span className="text-[11px] text-slate-600 mt-1.5 text-center font-medium">
                        Sign out of Mira
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center min-w-[100px]">
                    <Button
                      onClick={() => (window.location.href = "/login")}
                      variant="outline"
                      className="h-11 px-4 border-cyan-200 text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700 w-full"
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                    <span className="text-[11px] text-slate-600 mt-1.5 text-center font-medium">
                      Sign in to Mira
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Total Tasks
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">
                    {verifiers.length}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <ListChecks className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Passed
                  </p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {passedCount}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Failed
                  </p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    {failedCount}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-slate-600 mt-1">
                    {pendingCount}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task List */}
        <Card className="border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Verification Tasks
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Run database assertions against your current session state
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() =>
                    window.open("/task_verifier?task-list", "_blank")
                  }
                  variant="outline"
                  size="sm"
                  className="text-slate-600 hover:text-slate-800 border-slate-200"
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Task List JSON
                </Button>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {isLoadingTasks ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-10 h-10 border-2 border-slate-200 border-t-cyan-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sm text-slate-500">Loading tasks...</p>
              </div>
            ) : filteredVerifiers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <AlertCircle className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">
                  No tasks found
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Click Refresh to load tasks from the API
                </p>
              </div>
            ) : (
              filteredVerifiers.map((verifier) => {
                const isExpanded = expandedVerifierId === verifier.id;
                const isRunning = runningVerifiers.has(verifier.id);
                const result = verifierResults[verifier.id];

                return (
                  <div key={verifier.id} className="group">
                    <div
                      className={`p-5 transition-colors ${isExpanded ? "bg-slate-50" : "hover:bg-slate-50/50"}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Status Indicator */}
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            result?.status === "success"
                              ? "bg-emerald-100"
                              : result?.status === "error"
                                ? "bg-red-100"
                                : result?.status === "running"
                                  ? "bg-cyan-100"
                                  : "bg-slate-100"
                          }`}
                        >
                          {result?.status === "success" ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : result?.status === "error" ? (
                            <XCircle className="w-5 h-5 text-red-600" />
                          ) : result?.status === "running" ? (
                            <RefreshCw className="w-5 h-5 text-cyan-600 animate-spin" />
                          ) : (
                            <Play className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1.5">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs px-2 py-0.5 bg-white border-slate-200"
                            >
                              #{verifier.id}
                            </Badge>
                            {result && (
                              <Badge
                                className={`text-xs px-2 py-0.5 ${
                                  result.status === "success"
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                    : result.status === "running"
                                      ? "bg-cyan-100 text-cyan-700 hover:bg-cyan-100"
                                      : "bg-red-100 text-red-700 hover:bg-red-100"
                                }`}
                              >
                                {result.status === "running"
                                  ? "Running"
                                  : result.status === "success"
                                    ? "Passed"
                                    : "Failed"}
                              </Badge>
                            )}
                            {result?.executionTime && (
                              <span className="text-xs text-slate-400">
                                {result.executionTime}ms
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-sm text-slate-700 leading-relaxed ${
                              expandedPrompts.has(verifier.id)
                                ? ""
                                : "line-clamp-2"
                            }`}
                          >
                            {verifier.prompt}
                          </p>
                          <button
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
                            className="text-xs text-cyan-600 hover:text-cyan-700 mt-1 font-medium"
                          >
                            {expandedPrompts.has(verifier.id)
                              ? "Show Less"
                              : "Show Full Prompt"}
                          </button>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isExpanded && (
                            <Button
                              onClick={() => setExpandedVerifierId(null)}
                              variant="ghost"
                              size="sm"
                              className="text-slate-500 hover:text-slate-700"
                            >
                              <ChevronUp className="w-4 h-4 mr-1" />
                              Collapse
                            </Button>
                          )}
                          <Button
                            onClick={() => runVerifier(verifier)}
                            disabled={isRunning}
                            size="sm"
                            className={`${
                              isRunning
                                ? "bg-slate-100 text-slate-400"
                                : "bg-cyan-600 hover:bg-cyan-700 text-white"
                            }`}
                          >
                            {isRunning ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
                                Running
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-1.5" />
                                {isExpanded && result ? "Re-run" : "Run"}
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() =>
                              window.open(
                                `/task_verifier?id=${verifier.id}`,
                                "_blank"
                              )
                            }
                            variant="outline"
                            size="sm"
                            className="text-slate-600 hover:text-slate-800 border-slate-200"
                          >
                            <ExternalLink className="w-4 h-4 mr-1.5" />
                            View Verify JSON
                          </Button>
                          {!isExpanded && result && (
                            <Button
                              onClick={() => setExpandedVerifierId(verifier.id)}
                              variant="ghost"
                              size="sm"
                              className="text-slate-500 hover:text-slate-700"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Results */}
                    {isExpanded && result && (
                      <div className="border-t border-slate-200 bg-white p-5">
                        <VerificationResult result={result} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {filteredVerifiers.length > 0 && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
              <p className="text-xs text-slate-500 text-center">
                {searchTerm
                  ? `Showing ${filteredVerifiers.length} of ${verifiers.length} tasks`
                  : `${verifiers.length} tasks available`}
              </p>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
