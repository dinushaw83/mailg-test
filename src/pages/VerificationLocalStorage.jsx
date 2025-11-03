import { useState, useEffect, useCallback } from "react";
import Button from "@mui/material/Button";
import { createPatch } from "diff";
import { parseDiff } from "react-diff-view";
import "react-diff-view/style/index.css";

import DiffView from "../components/DiffView/DiffView";
import { sortObjectKeys, processJsonWithHtmlTags, stringifyReplacer } from "../utils/helperFunctions";

// Special keys for storing verification configs (not part of the app's normal localStorage)
const VERIFICATION_INITIAL_CONFIG_KEY = "__verification_initial_config__";
const VERIFICATION_CURRENT_CONFIG_KEY = "__verification_current_config__";

// List of all localStorage keys used in the app (from GlobalContext)
const LOCAL_STORAGE_KEYS = [
  // Core user and data
  "loggedInUser",
  "emails",

  // Contacts
  "recipients",
  "recipientLabels",
  "deletedRecipients",
  "hiddenRecipients",

  //search
  "allSearchQueries",
  "mailg_search_history",

  // UI / view state
  "currentView",
  "selectedEmails",
  "labels",
  "sortOrder",
  "currentPage",
  "itemsPerPage",
  "panelState",
  "isLeftSidebarExpanded",
  "showQuickSettings",
  "density",
  "threading",
  "inboxType",
  "mailg-notification-settings",

  // Right sidebar
  "rightSidebarExpanded",
  "rightSidebarActiveTab",

  // Settings
  "vacationResponder",
  "sendAsSettings",
  "signatures",
  "notificationSettings",
  "privacySettings",
  "settingsGeneral",
  "settingsAdvanced",
  "settingsLabels",
  "settingsInbox",
  "settingsChat",
  "settingsFilters",
  "settingsForwarding",
  "settingsOffline",
  "settingsThemes",
  "settingsAccounts",
  "mailGAccountPersonalInfo",
  "mailGAccountDataPrivacy",
  "thirdPartyApps",
  "signInSettings",
  "keyboardShortcuts",

  // Misc
  "manualSyncCount",
];

/**
 * Gathers all localStorage keys into a single consolidated object
 */
const gatherLocalStorageConfig = () => {
  const config = {};
  LOCAL_STORAGE_KEYS.forEach((key) => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      try {
        config[key] = JSON.parse(value);
      } catch (e) {
        // If it's not JSON, store as string
        config[key] = value;
      }
    } else {
      config[key] = null;
    }
  });
  return config;
};

/**
 * Generates a diff between two configs
 */
const generateConfigDiff = (initialConfig, currentConfig) => {
  const cleanedInitialJson = processJsonWithHtmlTags(initialConfig);
  const cleanedCurrentJson = processJsonWithHtmlTags(currentConfig);

  let patch = createPatch(
    "localStorage_config",
    JSON.stringify(sortObjectKeys(cleanedInitialJson), stringifyReplacer, 2),
    JSON.stringify(sortObjectKeys(cleanedCurrentJson), stringifyReplacer, 2)
  );

  // Remove the first 2 lines from the generated patch, to ensure proper parsing
  const normalizedPatch = patch.split("\n").slice(2).join("\n");
  const diffFile = parseDiff(normalizedPatch);

  if (diffFile && diffFile[0]) {
    diffFile[0].key = "localStorage_config";
    diffFile[0].oldSource = JSON.stringify(sortObjectKeys(cleanedInitialJson), stringifyReplacer, 2);
    diffFile[0].patch = normalizedPatch;
    return diffFile[0];
  }

  return null;
};

const VerificationLocalStorage = () => {
  const [currentConfig, setCurrentConfig] = useState({});
  const [initialConfigState, setInitialConfigState] = useState(null);
  const [diffData, setDiffData] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Initialize both configs on first mount
  useEffect(() => {
    document.title = "Verification Local Storage";

    const loadInitialFromStorage = () => {
      try {
        const raw = localStorage.getItem(VERIFICATION_INITIAL_CONFIG_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed;
      } catch (e) {
        console.error("Failed to parse stored initial config:", e);
        return null;
      }
    };

    // Always capture current snapshot immediately
    const currentSnapshot = gatherLocalStorageConfig();
    window.currentConfig = currentSnapshot;
    setCurrentConfig(currentSnapshot);
    localStorage.setItem(VERIFICATION_CURRENT_CONFIG_KEY, JSON.stringify(currentSnapshot));

    // Try to get the persisted initial baseline
    let initial = loadInitialFromStorage();
    if (initial) {
      window.initialConfig = initial;
      setInitialConfigState(initial);
      const diff = generateConfigDiff(initial, currentSnapshot);
      setDiffData(diff);
      return; // done
    }

    // If not present yet (e.g., right after a reset), poll briefly until GlobalContext writes it
    let attempts = 0;
    const MAX_ATTEMPTS = 80; // ~8s
    const timer = setInterval(() => {
      attempts += 1;
      initial = loadInitialFromStorage();
      if (initial) {
        clearInterval(timer);
        window.initialConfig = initial;
        setInitialConfigState(initial);
        const diff = generateConfigDiff(initial, window.currentConfig || {});
        setDiffData(diff);
      } else if (attempts >= MAX_ATTEMPTS) {
        clearInterval(timer);
        console.warn("⚠️ Initial config not available yet after waiting. Will refresh diff when available.");
      }
    }, 100);

    return () => {
      // cleanup interval if still running
      try {
        clearInterval(timer);
      } catch {}
    };
  }, []);

  useEffect(() => {
    const handleBaselineReady = (e) => {
      if (e.key === "__verification_baseline_ready__") {
        const baseline = JSON.parse(localStorage.getItem("__verification_initial_config__"));
        if (baseline) {
          window.initialConfig = baseline;
          setInitialConfigState(baseline);
          const diff = generateConfigDiff(baseline, gatherLocalStorageConfig());
          setDiffData(diff);
          console.log("✅ Baseline ready signal received — verification dashboard synced.");
        }
      }
    };

    window.addEventListener("storage", handleBaselineReady);
    return () => window.removeEventListener("storage", handleBaselineReady);
  }, []);

  // Refresh current config and recalculate diff
  const refreshConfig = useCallback(() => {
    const currentSnapshot = gatherLocalStorageConfig();
    window.currentConfig = currentSnapshot;
    setCurrentConfig(currentSnapshot);

    // Save current config to localStorage
    localStorage.setItem(VERIFICATION_CURRENT_CONFIG_KEY, JSON.stringify(currentSnapshot));

    // Generate diff between initial and current
    if (window.initialConfig) {
      const diff = generateConfigDiff(window.initialConfig, currentSnapshot);
      // Only update diffData if the actual patch changed to preserve expansion state
      setDiffData((prev) => {
        if (!diff && !prev) return prev;
        if (!diff && prev) return diff; // became empty
        if (diff && !prev) return diff; // first time
        if (diff.patch !== prev.patch) return diff; // content changed
        return prev; // no change → keep reference to preserve expansion
      });
    }
    setLastUpdated(new Date());

    console.log("🔄 Config refreshed");
    if (window.initialConfig) console.log("Initial:", window.initialConfig);
    console.log("Current:", window.currentConfig);
  }, []);

  // Auto-refresh every 2 seconds to detect changes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshConfig();
    }, 2000);

    return () => clearInterval(interval);
  }, [refreshConfig]);

  useEffect(() => {
    const loadInitialFromStorage = () => {
      try {
        const raw = localStorage.getItem(VERIFICATION_INITIAL_CONFIG_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    const currentSnapshot = gatherLocalStorageConfig();
    setCurrentConfig(currentSnapshot);
    localStorage.setItem(VERIFICATION_CURRENT_CONFIG_KEY, JSON.stringify(currentSnapshot));

    const initial = loadInitialFromStorage();
    if (initial) {
      setInitialConfigState(initial);
      const diff = generateConfigDiff(initial, currentSnapshot);
      setDiffData(diff);
      setIsLoading(false); // ✅ Ready to show UI
      return;
    }

    // Poll until baseline is ready
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      const found = loadInitialFromStorage();
      if (found) {
        clearInterval(timer);
        setInitialConfigState(found);
        const diff = generateConfigDiff(found, gatherLocalStorageConfig());
        setDiffData(diff);
        setIsLoading(false); // ✅ Ready
      } else if (attempts >= 80) {
        console.warn("Still waiting for baseline...");
      }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  
  const hasDifferences = diffData?.hunks?.length > 0;

  if (isLoading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#1E40AF"
      }}>
        <h2>⏳ Waiting for baseline configuration...</h2>
        <p style={{ color: "#6B7280" }}>
          Please ensure the MailG web app is running — the verification dashboard will load automatically once the baseline is ready.
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", height: "calc(100vh - 64px)" }}>
      <div style={{ width: "80%", margin: "2rem auto", padding: "20px" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            paddingBottom: "1rem",
            borderBottom: "2px solid #e0e0e0",
          }}
        >
          <div>
            <h1 style={{ margin: "0 0 8px 0", fontSize: "32px", fontWeight: "700", color: "#1F2937" }}>
              Verification Local Storage
            </h1>
            <p style={{ margin: 0, fontSize: "14px", color: "#6B7280" }}>
              Compare initial localStorage state with current state
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <Button
              onClick={refreshConfig}
              style={{
                backgroundColor: "#3B82F6",
                color: "white",
                fontWeight: "600",
                textTransform: "none",
                padding: "10px 20px",
                boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)",
              }}
            >
              🔄 Refresh Now
            </Button>

            <Button
              onClick={() => {
                if (
                  window.confirm(
                    "This will clear all localStorage (including verification configs) and reload the page. Continue?"
                  )
                ) {
                  localStorage.clear();
                  delete window.initialConfig;
                  delete window.currentConfig;
                  window.location.reload();
                }
              }}
              style={{
                backgroundColor: "#EF4444",
                color: "white",
                fontWeight: "600",
                textTransform: "none",
                padding: "10px 20px",
                boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)",
              }}
            >
              🗑️ Reset All
            </Button>
          </div>
        </div>

        {/* Status Summary */}
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              flex: 1,
              backgroundColor: "#F3F4F6",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
            }}
          >
            <div style={{ fontSize: "14px", color: "#6B7280", marginBottom: "4px" }}>Status</div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: hasDifferences ? "#EF4444" : "#10B981",
              }}
            >
              {hasDifferences ? "❌ Differences Detected" : "✅ No Differences"}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              backgroundColor: "#F3F4F6",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
            }}
          >
            <div style={{ fontSize: "14px", color: "#6B7280", marginBottom: "4px" }}>Last Updated</div>
            <div style={{ fontSize: "18px", fontWeight: "600", color: "#374151" }}>
              {lastUpdated.toLocaleTimeString()}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              backgroundColor: "#F3F4F6",
              padding: "20px",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
            }}
          >
            <div style={{ fontSize: "14px", color: "#6B7280", marginBottom: "4px" }}>Tracked Keys</div>
            <div style={{ fontSize: "24px", fontWeight: "700", color: "#374151" }}>{LOCAL_STORAGE_KEYS.length}</div>
          </div>
        </div>

        {/* Info Box */}
        <div
          style={{
            backgroundColor: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "2rem",
          }}
        >
          <div style={{ fontSize: "14px", color: "#1E40AF", lineHeight: "1.6" }}>
            <strong>ℹ️ How it works:</strong>
            <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
              <li>
                <strong>Initial Config</strong> is captured by GlobalContext when the app first loads (before any user
                actions) and persisted in localStorage (key: <code>{VERIFICATION_INITIAL_CONFIG_KEY}</code>)
              </li>
              <li>
                <strong>Current Config</strong> reflects the current state of all localStorage keys and is updated every
                2 seconds (key: <code>{VERIFICATION_CURRENT_CONFIG_KEY}</code>)
              </li>
              <li>The diff view below shows what has changed between initial and current state</li>
              <li>Initial config is captured at app startup, so navigating to this page won't affect the baseline</li>
              <li>Both configs persist across page refreshes - initial config never changes after first capture</li>
              <li>
                You can access both configs via the browser console: <code>window.initialConfig</code> and{" "}
                <code>window.currentConfig</code>
              </li>
              <li>Click "Reset All" to clear everything and start fresh</li>
            </ul>
          </div>
        </div>

        {/* Diff View Section */}
        <div
          style={{
            border: "1px solid #E5E7EB",
            borderRadius: "8px",
            backgroundColor: "white",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          }}
        >
          <div
            style={{
              padding: "20px",
              borderBottom: isCollapsed ? "none" : "1px solid #E5E7EB",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <div>
              <h3 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "600", color: "#1F2937" }}>
                {isCollapsed ? "▶" : "▼"} Configuration Diff
              </h3>
              <p style={{ margin: 0, fontSize: "14px", color: "#6B7280" }}>
                Comparing initial vs current localStorage state
              </p>
            </div>

            <div
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                backgroundColor: hasDifferences ? "#FEE2E2" : "#D1FAE5",
                color: hasDifferences ? "#991B1B" : "#065F46",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              {hasDifferences ? `${diffData?.hunks?.length || 0} changes` : "No changes"}
            </div>
          </div>

          {!isCollapsed && (
            <div style={{ padding: "20px" }}>
              {diffData && diffData.hunks?.length > 0 ? (
                <DiffView hunks={diffData.hunks} oldSource={diffData.oldSource} />
              ) : (
                <div
                  style={{
                    color: "#10B981",
                    backgroundColor: "#F0FDF4",
                    padding: "20px",
                    borderRadius: "6px",
                    border: "1px solid #BBF7D0",
                    textAlign: "center",
                    fontSize: "16px",
                    fontWeight: "500",
                  }}
                >
                  ✅ No differences detected. Initial and current configs are identical.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Raw Data Section (for debugging) */}
        <details style={{ marginTop: "2rem" }}>
          <summary
            style={{
              cursor: "pointer",
              padding: "12px",
              backgroundColor: "#F9FAFB",
              border: "1px solid #E5E7EB",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#374151",
            }}
          >
            🔍 View Raw Data (Debug)
          </summary>
          <div style={{ marginTop: "12px", display: "flex", gap: "20px" }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#6B7280" }}>Initial Config</h4>
              <pre
                style={{
                  backgroundColor: "#F3F4F6",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #E5E7EB",
                  fontSize: "12px",
                  maxHeight: "400px",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(initialConfigState ?? window.initialConfig, null, 2)}
              </pre>
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px", color: "#6B7280" }}>Current Config</h4>
              <pre
                style={{
                  backgroundColor: "#F3F4F6",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #E5E7EB",
                  fontSize: "12px",
                  maxHeight: "400px",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(currentConfig, null, 2)}
              </pre>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default VerificationLocalStorage;
