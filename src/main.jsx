import "./index.css";
// Initialize telemetry first (before other imports)
import "./telemetry.js";

import App from "./App.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";
import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { queryClient } from "./lib/query-client";
import { ToastProvider } from "./hooks/useToast";
import setupLocator from "@locator/runtime";

if (import.meta.env.MODE === "development") {
  setupLocator({
    targets: {
      cursor: {
        url: "cursor://file/${projectPath}${filePath}:${line}:${column}",
        label: "Cursor",
      },
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
