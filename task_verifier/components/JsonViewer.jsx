/* eslint-disable */

import { useState } from "react";
import Box from "@mui/material/Box";

export const JsonViewer = ({ data, initialExpanded = true, highlightPaths = {} }) => {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (path) => setExpanded((p) => ({ ...p, [path]: !p[path] }));

  const isExpanded = (path) => expanded[path] ?? initialExpanded;

  const renderValue = (val, path = "root", depth = 0) => {
    if (val === null)
      return (
        <Box component="span" sx={{ color: "text.disabled" }}>
          null
        </Box>
      );
    if (typeof val === "boolean")
      return (
        <Box component="span" sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#f472b6" : "#d946ef") }}>
          {val.toString()}
        </Box>
      );
    if (typeof val === "number")
      return (
        <Box component="span" sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#fbbf24" : "#eab308") }}>
          {val}
        </Box>
      );
    if (typeof val === "string")
      return (
        <Box component="span" sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#4ade80" : "#22c55e") }}>
          "{val}"
        </Box>
      );

    if (Array.isArray(val)) {
      if (val.length === 0)
        return (
          <Box component="span" sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#64748b") }}>
            []
          </Box>
        );
      const exp = isExpanded(path);
      return (
        <Box component="span">
          <Box
            component="span"
            onClick={() => toggleExpand(path)}
            sx={{
              cursor: "pointer",
              color: "text.disabled",
              mr: 0.5,
              userSelect: "none",
            }}
          >
            {exp ? "▼" : "▶"}
          </Box>
          <Box component="span" sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#64748b") }}>
            [
          </Box>
          {exp ? (
            <Box>
              {val.map((item, i) => {
                const itemPath = `${path}[${i}]`;
                const highlightType = highlightPaths[itemPath];
                return (
                  <Box
                    key={i}
                    sx={{
                      pl: `${(depth + 1) * 16}px`,
                      ...(highlightType === "error"
                        ? {
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.2)" : "rgba(127, 29, 29, 0.5)",
                            borderLeft: "2px solid",
                            borderLeftColor: "error.main",
                          }
                        : highlightType === "changed"
                          ? {
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.2)" : "#14532d",
                              borderLeft: "2px solid",
                              borderLeftColor: "success.main",
                            }
                          : {}),
                    }}
                  >
                    {renderValue(item, itemPath, depth + 1)}
                    {i < val.length - 1 && (
                      <Box component="span" sx={{ color: "text.disabled" }}>
                        ,
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box component="span" sx={{ color: "text.secondary", fontStyle: "italic" }}>
              {" "}
              ... {val.length} items{" "}
            </Box>
          )}
          <Box component="span" sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#64748b") }}>
            ]
          </Box>
        </Box>
      );
    }

    if (typeof val === "object") {
      const keys = Object.keys(val);
      if (keys.length === 0)
        return (
          <Box component="span" sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#64748b") }}>
            {"{}"}
          </Box>
        );
      const exp = isExpanded(path);
      return (
        <Box component="span">
          <Box
            component="span"
            onClick={() => toggleExpand(path)}
            sx={{
              cursor: "pointer",
              color: "text.disabled",
              mr: 0.5,
              userSelect: "none",
            }}
          >
            {exp ? "▼" : "▶"}
          </Box>
          <Box component="span" sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#64748b") }}>
            {"{"}
          </Box>
          {exp ? (
            <Box>
              {keys.map((k, i) => {
                const keyPath = `${path}.${k}`;
                const highlightType = highlightPaths[keyPath];
                return (
                  <Box
                    key={k}
                    sx={{
                      pl: `${(depth + 1) * 16}px`,
                      ...(highlightType === "error"
                        ? {
                            bgcolor: (theme) =>
                              theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.2)" : "rgba(127, 29, 29, 0.5)",
                            borderLeft: "2px solid",
                            borderLeftColor: "error.main",
                          }
                        : highlightType === "changed"
                          ? {
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.2)" : "#14532d",
                              borderLeft: "2px solid",
                              borderLeftColor: "success.main",
                            }
                          : {}),
                    }}
                  >
                    <Box
                      component="span"
                      sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#93c5fd" : "#3b82f6") }}
                    >
                      "{k}"
                    </Box>
                    <Box component="span" sx={{ color: "text.disabled" }}>
                      :{" "}
                    </Box>
                    {renderValue(val[k], keyPath, depth + 1)}
                    {i < keys.length - 1 && (
                      <Box component="span" sx={{ color: "text.disabled" }}>
                        ,
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          ) : (
            <Box component="span" sx={{ color: "text.secondary", fontStyle: "italic" }}>
              {" "}
              ... {keys.length} keys{" "}
            </Box>
          )}
          <Box component="span" sx={{ color: (theme) => (theme.palette.mode === "dark" ? "#cbd5e1" : "#64748b") }}>
            {"}"}
          </Box>
        </Box>
      );
    }

    return <span>{String(val)}</span>;
  };

  return (
    <Box
      sx={{
        fontSize: "0.8125rem",
        lineHeight: 1.6,
        fontFamily: "monospace",
      }}
    >
      {renderValue(data)}
    </Box>
  );
};
