import "./index.css";

import App from "./App.jsx";
// Initialize telemetry first (before other imports)
import "./telemetry.js";

import React from "react";
import ReactDOM from "react-dom/client";
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
    <App />
  </React.StrictMode>
);
