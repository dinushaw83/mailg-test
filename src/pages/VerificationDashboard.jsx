import Button from "@mui/material/Button";
import { createPatch } from "diff";
import { parseDiff } from "react-diff-view";
import "react-diff-view/style/index.css";
import { useState, useEffect } from "react";

import { UTCDate } from "@date-fns/utc";

import tasks from "../data/tasks.json";

import DiffView from "../components/DiffView/DiffView";
import { sortObjectKeys, processJsonWithHtmlTags, stringifyReplacer } from "../utils/helperFunctions";

const VerificationDashboard = () => {
  const [runningPrompt, setRunningPrompt] = useState(null);
  const [isRunning, setIsRunning] = useState(() => {
    const initial = {};
    Object.keys(tasks).forEach((promptId) => {
      initial[promptId] = false;
    });
    return initial;
  });
  const [collapsedDescriptions, setCollapsedDescriptions] = useState(() => {
    const initial = {};
    Object.keys(tasks).forEach((promptId) => {
      initial[promptId] = true;
    });
    return initial;
  });
  const [collapsedDiffResults, setCollapsedDiffResults] = useState(() => {
    const initial = {};
    Object.keys(tasks).forEach((promptId) => {
      initial[promptId] = true;
    });
    return initial;
  });
  const [testResults, setTestResults] = useState({});
  const [banner, setBanner] = useState(null);
  const [ranAt, setRanAt] = useState(null);
  const [loading, setLoading] = useState(() => {
    const initial = {};
    Object.keys(tasks).forEach((promptId) => {
      initial[promptId] = false;
    });
    return initial;
  });

  const getTestStatus = (promptId) => {
    if (!testResults[promptId]) return "Not Run";
    return testResults[promptId].passed ? "Passed" : "Failed";
  };

  const getTestStatusIcon = (promptId) => {
    if (!testResults[promptId]) return "⏰";
    return testResults[promptId].passed ? "✅" : "❌";
  };

  const getTestStatusColor = (promptId) => {
    if (!testResults[promptId]) return "#6B7280";
    return testResults[promptId].passed ? "#10B981" : "#EF4444";
  };

  const toggleDiffResults = (promptId) => {
    setCollapsedDiffResults((prev) => ({
      ...prev,
      [promptId]: !prev[promptId],
    }));
  };

  const runVerification = (specificTaskId = null) => {
    const taskToRun = specificTaskId || taskId;
    if (!taskToRun) {
      return setBanner({ type: "error", text: "Please select a task ID." });
    }

    setRunningPrompt(taskToRun);
    setBanner(null);

    const expectedResult = tasks[taskToRun].result;

    let diffFiles = [];
    const startTime = Date.now();
    for (const key of Object.keys(expectedResult)) {
      const actualRaw = localStorage.getItem(key);
      const cleanedExpctedJson = processJsonWithHtmlTags(JSON.parse(expectedResult[key]));
      const cleanedActualJson = processJsonWithHtmlTags(JSON.parse(actualRaw));

      let patch = createPatch(
        key,
        JSON.stringify(sortObjectKeys(cleanedExpctedJson), stringifyReplacer, 2),
        JSON.stringify(sortObjectKeys(cleanedActualJson), stringifyReplacer, 2)
      );
      // Remove the first 2 lines from the generated patch, to ensure proper parsing
      patch = patch.split("\n").slice(2).join("\n");
      const diffFile = parseDiff(patch);
      diffFile[0].key = key;
      diffFile[0].oldSource = JSON.stringify(sortObjectKeys(cleanedExpctedJson), stringifyReplacer, 2);
      diffFiles.push(diffFile[0]);
    }

    setIsRunning((prev) => ({ ...prev, [taskToRun]: true }));
    setTimeout(() => {
      const passed = !diffFiles.some((file) => file.hunks?.length > 0);
      const executionTime = Date.now() - startTime;

      setTestResults((prev) => ({
        ...prev,
        [taskToRun]: {
          passed,
          executionTime,
          diffFiles,
          ranAt: new UTCDate(),
        },
      }));

      if (passed) {
        setBanner({ type: "success", text: `✅ ${taskToRun} — Passed!` });
      } else {
        setBanner({ type: "error", text: `❌ ${taskToRun} — Failed.` });
      }

      setRanAt(new UTCDate());
      setLoading(false);
      setRunningPrompt(null);
      setIsRunning((prev) => ({ ...prev, [taskToRun]: false }));
    }, 100);
  };

  const clearResults = () => {
    setTestResults({});
    setRanAt(null);
    localStorage.clear();
    window.location.reload();
  };

  useEffect(() => {
    document.title = "Task Verifier Dashboard";
  }, []);

  return (
    <div style={{ width: "60%", height: "100%", margin: "2rem auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <div>
          <h1 style={{ marginBottom: "4px" }}>Task Verifier Dashboard</h1>
          {/* {runId && (
            <div
              style={{
                fontSize: "16px",
                color: "#6B7280",
                fontWeight: "500",
              }}
            >
              Run ID:{" "}
              <span style={{ fontWeight: 700, fontSize: "20px", color: "#374151", fontFamily: "monospace" }}>
                {"runId"}
              </span>
            </div>
          )} */}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            <Button
              onClick={clearResults}
              style={{
                backgroundColor: "#F56565",
                borderColor: "#F56565",
                color: "white",
                fontWeight: "600",
                boxShadow: "0 2px 4px rgba(245, 101, 101, 0.3)",
                width: "fit-content",
                padding: "8px 12px",
                textTransform: "none",
              }}
            >
              Clear Results
            </Button>
            <p
              style={{
                fontSize: "12px",
                color: "#6B7280",
                marginTop: "4px",
                textAlign: "right",
                maxWidth: 420,
                fontWeight: "500",
              }}
            >
              *Clear the results before starting a new task. This will also clear local storage and reload this page,
              which will get the verifier ready for the next run.
            </p>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: "calc(100vh - 250px)",
          overflowY: "auto",
          paddingBottom: "20px",
        }}
      >
        {Object.keys(tasks).map((promptId, index) => {
          const status = getTestStatus(promptId);
          const statusIcon = getTestStatusIcon(promptId);
          const statusColor = getTestStatusColor(promptId);
          const isDiffResultsCollapsed = collapsedDiffResults[promptId];
          const result = testResults[promptId];
          return (
            <div
              key={promptId}
              style={{
                border: "1px solid #E5E7EB",
                borderRadius: "8px",
                padding: "20px",
                backgroundColor: "white",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "16px",
                  justifyContent: "space-between",
                }}
              >
                {/* Left side - Status and Info */}
                <div style={{ display: "flex", gap: "16px", flex: 1 }}>
                  {/* Task Number */}
                  <div
                    style={{
                      minWidth: "30px",
                      textAlign: "center",
                      marginTop: "2px",
                      marginRight: "10px",
                    }}
                  >
                    <pre style={{ fontSize: "20px", fontWeight: "bold", color: "#6B7280" }}>#{index + 1}</pre>
                  </div>

                  {/* Status Icon */}
                  <div
                    style={{
                      fontSize: "24px",
                      marginTop: "2px",
                      opacity: isRunning[promptId] ? 0.6 : 1,
                    }}
                  >
                    {isRunning[promptId] ? "⏳" : statusIcon}
                  </div>

                  {/* Test Info */}
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: "0 0 8px 0",
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#1F2937",
                      }}
                    >
                      {/* <span style={{ color: "#6B7280", fontSize: "14px" }}>Run ID:</span> {runId}{" "} */}
                      <span style={{ color: "#6B7280", fontSize: "16px" }}>Prompt ID:</span> {promptId}
                    </h3>

                    {/* Collapsible Description */}
                    {tasks[promptId].prompt && (
                      <div style={{ marginBottom: "12px" }}>
                        <button
                          onClick={() => setCollapsedDescriptions((prev) => ({ ...prev, [promptId]: !prev[promptId] }))}
                          style={{
                            background: "none",
                            border: "none",
                            padding: "0",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "#6B7280",
                            fontSize: "14px",
                          }}
                        >
                          <span style={{ fontSize: "12px" }}>{collapsedDescriptions[promptId] ? "▶" : "▼"}</span>
                          <span style={{ fontWeight: "500" }}>Prompt</span>
                        </button>
                        {!collapsedDescriptions[promptId] && (
                          <div
                            style={{
                              marginTop: "8px",
                              padding: "12px",
                              backgroundColor: "#F3F4F6",
                              borderRadius: "6px",
                              border: "1px solid #E5E7EB",
                              fontFamily: "monospace",
                              fontSize: "13px",
                              lineHeight: "1.5",
                              color: "#374151",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {tasks[promptId].prompt}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status */}
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span
                        style={{
                          color: statusColor,
                          fontSize: "14px",
                          fontWeight: "500",
                        }}
                      >
                        {isRunning[promptId] ? "Running..." : status}
                        {result && <span style={{ marginLeft: "8px" }}>({result.executionTime}ms)</span>}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => runVerification(promptId)}
                  disabled={isRunning[promptId]}
                  style={{
                    backgroundColor: "#38A169",
                    borderColor: "#38A169",
                    color: "white",
                    minWidth: "80px",
                    fontWeight: "600",
                    boxShadow: "0 2px 4px rgba(56, 161, 105, 0.3)",
                  }}
                >
                  {isRunning[promptId] ? "Running..." : status === "Not Run" ? "▶ Run" : "▶ Rerun"}
                </Button>
              </div>
              {result && result.diffFiles && result.diffFiles.length > 0 && (
                <div style={{ marginTop: "20px", borderTop: "1px solid #E5E7EB", paddingTop: "20px" }}>
                  <button
                    onClick={() => toggleDiffResults(promptId)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "0",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      color: "#6B7280",
                      fontSize: "14px",
                      fontWeight: "500",
                    }}
                  >
                    <span style={{ fontSize: "12px" }}>{isDiffResultsCollapsed ? "▶" : "▼"}</span>
                    <span>Diff Results</span>
                    <span
                      style={{
                        color: result.passed ? "#10B981" : "#EF4444",
                        fontSize: "12px",
                      }}
                    >
                      {result.passed ? "✅ Passed" : "❌ Failed"}
                    </span>
                  </button>

                  {!isDiffResultsCollapsed && (
                    <div style={{ marginTop: "16px" }}>
                      {result.diffFiles.map(({ key, type, hunks, oldSource }, idx) => (
                        <div key={key} style={{ marginBottom: "20px" }}>
                          <h4
                            style={{
                              marginBottom: "12px",
                              fontSize: "16px",
                              fontWeight: "600",
                              color: "#374151",
                            }}
                          >
                            Comparison of{" "}
                            <code
                              style={{
                                backgroundColor: "#F3F4F6",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "14px",
                              }}
                            >
                              {key}
                            </code>{" "}
                            {hunks?.length > 0 ? "❌" : "✅"}
                          </h4>
                          {hunks?.length > 0 ? (
                            <DiffView hunks={hunks} onExpandRange={() => {}} oldSource={oldSource} />
                          ) : (
                            <div
                              style={{
                                color: "#10B981",
                                backgroundColor: "#F0FDF4",
                                padding: "12px",
                                borderRadius: "6px",
                                border: "1px solid #BBF7D0",
                              }}
                            >
                              No differences. Everything was correctly added.
                            </div>
                          )}
                          {idx !== result.diffFiles.length - 1 && <hr style={{ margin: "20px 0" }} />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VerificationDashboard;
