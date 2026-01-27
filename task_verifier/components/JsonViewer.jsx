/* eslint-disable */

import { useState } from "react";
import "../styles.css";

export const JsonViewer = ({
  data,
  initialExpanded = true,
  highlightPaths = {},
}) => {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (path) =>
    setExpanded((p) => ({ ...p, [path]: !p[path] }));

  const isExpanded = (path) => expanded[path] ?? initialExpanded;

  const renderValue = (val, path = "root", depth = 0) => {
    if (val === null) return <span className="json-null">null</span>;
    if (typeof val === "boolean")
      return <span className="json-boolean">{val.toString()}</span>;
    if (typeof val === "number")
      return <span className="json-number">{val}</span>;
    if (typeof val === "string")
      return <span className="json-string">"{val}"</span>;

    if (Array.isArray(val)) {
      if (val.length === 0) return <span className="json-bracket">[]</span>;
      const exp = isExpanded(path);
      return (
        <span className="json-array">
          <span className="json-toggle" onClick={() => toggleExpand(path)}>
            {exp ? "▼" : "▶"}
          </span>
          <span className="json-bracket">[</span>
          {exp ? (
            <div className="json-children">
              {val.map((item, i) => (
                <div
                  key={i}
                  className={`json-item group relative ${
                    highlightPaths[`${path}[${i}]`] === "error"
                      ? "bg-red-900/50 border-l-2 border-red-500 text-red-200"
                      : highlightPaths[`${path}[${i}]`] === "changed"
                        ? "bg-green-900 border-l-2 border-emerald-500 text-emerald-200"
                        : ""
                  }`}
                  style={{ paddingLeft: `${(depth + 1) * 16}px` }}
                >
                  {renderValue(item, `${path}[${i}]`, depth + 1)}
                  {i < val.length - 1 && <span className="json-comma">,</span>}
                </div>
              ))}
            </div>
          ) : (
            <span className="json-collapsed"> ... {val.length} items </span>
          )}
          <span className="json-bracket">]</span>
        </span>
      );
    }

    if (typeof val === "object") {
      const keys = Object.keys(val);
      if (keys.length === 0)
        return <span className="json-bracket">{"{}"}</span>;
      const exp = isExpanded(path);
      return (
        <span className="json-object">
          <span className="json-toggle" onClick={() => toggleExpand(path)}>
            {exp ? "▼" : "▶"}
          </span>
          <span className="json-bracket">{"{"}</span>
          {exp ? (
            <div className="json-children">
              {keys.map((k, i) => (
                <div
                  key={k}
                  className={`json-item group relative ${
                    highlightPaths[`${path}.${k}`] === "error"
                      ? "bg-red-900/50 border-l-2 border-red-500 text-red-200"
                      : highlightPaths[`${path}.${k}`] === "changed"
                        ? "bg-green-900 border-l-2 border-emerald-500 text-emerald-200"
                        : ""
                  }`}
                  style={{ paddingLeft: `${(depth + 1) * 16}px` }}
                >
                  <span className="json-key">"{k}"</span>
                  <span className="json-colon">: </span>
                  {renderValue(val[k], `${path}.${k}`, depth + 1)}
                  {i < keys.length - 1 && <span className="json-comma">,</span>}
                </div>
              ))}
            </div>
          ) : (
            <span className="json-collapsed"> ... {keys.length} keys </span>
          )}
          <span className="json-bracket">{"}"}</span>
        </span>
      );
    }

    return <span>{String(val)}</span>;
  };

  return (
    <div className="json-viewer text-[0.8125rem] leading-relaxed font-mono">
      {renderValue(data)}
    </div>
  );
};
