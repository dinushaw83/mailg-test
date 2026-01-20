import React, { useState, useEffect, useMemo } from "react";
import { Button, CircularProgress, Box, IconButton } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import apiClient from "../../../services/apiClient";

const ImportHistory = () => {
  const [imports, setImports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [sortConfig, setSortConfig] = useState({ key: "started_at", direction: "desc" });

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get("/v1/import-data/history");
      // Backend wraps response in { success, data: { ... } } format
      const responseData = response.data.data || response.data;
      setImports(responseData.imports || []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch import history:", err);
      setError("Failed to load import history");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "—";
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDuration = (seconds) => {
    if (seconds === null || seconds === undefined) return "—";
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(2)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = (seconds % 60).toFixed(0);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusBadge = (status) => {
    const styles = {
      success: { bg: "#E9F5EA", color: "#038153", border: "#D4E8D7" },
      failure: { bg: "#FFF0ED", color: "#CC3340", border: "#F5D5D8" },
      cancelled: { bg: "#F8F9F9", color: "#68737D", border: "#D8DCDE" },
      pending: { bg: "#EDF5FD", color: "#1F73B7", border: "#BDD7EF" },
      processing: { bg: "#FFF7ED", color: "#AD5E18", border: "#F5E6D3" },
    };

    const style = styles[status] || styles.pending;

    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          fontWeight: 600,
          backgroundColor: style.bg,
          color: style.color,
          border: `1px solid ${style.border}`,
        }}
      >
        {status}
      </span>
    );
  };

  const toggleExpand = (importId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(importId)) {
      newExpanded.delete(importId);
    } else {
      newExpanded.add(importId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedImports = useMemo(() => {
    const sorted = [...imports];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle null/undefined
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // String comparison
      if (typeof aVal === "string" && typeof bVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [imports, sortConfig]);

  const SortableHeader = ({ label, sortKey }) => (
    <th
      onClick={() => handleSort(sortKey)}
      style={{
        padding: "12px",
        textAlign: "left",
        fontWeight: 600,
        fontSize: "13px",
        color: "#2F3941",
        cursor: "pointer",
        userSelect: "none",
        position: "relative",
      }}
    >
      {label}
      {sortConfig.key === sortKey && (
        <span style={{ marginLeft: "4px", fontSize: "10px" }}>{sortConfig.direction === "asc" ? "▲" : "▼"}</span>
      )}
    </th>
  );

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2.5, textAlign: "center", color: "#CC3340" }}>
        {error}
        <Box sx={{ mt: 1.5 }}>
          <Button size="small" onClick={fetchHistory}>
            Retry
          </Button>
        </Box>
      </Box>
    );
  }

  if (imports.length === 0) {
    return (
      <Box sx={{ p: 5, textAlign: "center", color: "#68737D" }}>
        <Box sx={{ fontSize: "16px", mb: 1 }}>No import history found</Box>
        <Box sx={{ fontSize: "14px" }}>Your import history will appear here after your first import.</Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            backgroundColor: "#fff",
            border: "1px solid #D8DCDE",
            borderRadius: "4px",
          }}
        >
          <thead style={{ backgroundColor: "#F8F9F9", borderBottom: "1px solid #D8DCDE" }}>
            <tr>
              <th style={{ width: "40px", padding: "12px" }}></th>
              <SortableHeader label="Date" sortKey="started_at" />
              <SortableHeader label="Filename" sortKey="filename" />
              <SortableHeader label="Table(s)" sortKey="table_name" />
              <SortableHeader label="Records" sortKey="total_records" />
              <SortableHeader label="Status" sortKey="status" />
              <SortableHeader label="Duration" sortKey="duration_seconds" />
            </tr>
          </thead>
          <tbody>
            {sortedImports.map((importRecord) => {
              const isExpanded = expandedRows.has(importRecord.import_id);
              const hasMultipleTables = importRecord.table_results && importRecord.table_results.length > 0;

              return (
                <React.Fragment key={importRecord.import_id}>
                  <tr
                    style={{
                      borderBottom: "1px solid #D8DCDE",
                      backgroundColor: isExpanded ? "#F8F9F9" : "#fff",
                    }}
                  >
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      {hasMultipleTables && (
                        <IconButton
                          size="small"
                          onClick={() => toggleExpand(importRecord.import_id)}
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                        </IconButton>
                      )}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#2F3941" }}>
                      {formatDateTime(importRecord.started_at)}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#2F3941", fontFamily: "monospace" }}>
                      {importRecord.filename}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#2F3941" }}>
                      {importRecord.table_name ||
                        (hasMultipleTables ? `${importRecord.table_results.length} tables` : "—")}
                    </td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#2F3941", textAlign: "right" }}>
                      {importRecord.total_records?.toLocaleString() || 0}
                    </td>
                    <td style={{ padding: "12px" }}>{getStatusBadge(importRecord.status)}</td>
                    <td style={{ padding: "12px", fontSize: "13px", color: "#2F3941", textAlign: "right" }}>
                      {formatDuration(importRecord.duration_seconds)}
                    </td>
                  </tr>
                  {isExpanded && hasMultipleTables && (
                    <tr>
                      <td colSpan="7" style={{ padding: "0", backgroundColor: "#F8F9F9" }}>
                        <div style={{ padding: "12px 12px 12px 52px" }}>
                          <table
                            style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              backgroundColor: "#fff",
                              border: "1px solid #D8DCDE",
                              borderRadius: "4px",
                              fontSize: "12px",
                            }}
                          >
                            <thead style={{ backgroundColor: "#F8F9F9" }}>
                              <tr>
                                <th style={{ padding: "8px", textAlign: "left", fontWeight: 600 }}>Table Name</th>
                                <th style={{ padding: "8px", textAlign: "right", fontWeight: 600 }}>Records</th>
                                <th style={{ padding: "8px", textAlign: "left", fontWeight: 600 }}>Status</th>
                                <th style={{ padding: "8px", textAlign: "left", fontWeight: 600 }}>Error</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importRecord.table_results.map((tableResult, idx) => (
                                <tr
                                  key={idx}
                                  style={{
                                    borderBottom:
                                      idx < importRecord.table_results.length - 1 ? "1px solid #D8DCDE" : "none",
                                  }}
                                >
                                  <td style={{ padding: "8px", fontFamily: "monospace" }}>{tableResult.table_name}</td>
                                  <td style={{ padding: "8px", textAlign: "right" }}>
                                    {tableResult.records_imported?.toLocaleString() || 0}
                                  </td>
                                  <td style={{ padding: "8px" }}>{getStatusBadge(tableResult.status)}</td>
                                  <td style={{ padding: "8px", color: "#CC3340", fontSize: "11px" }}>
                                    {tableResult.error_message || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </Box>
      <Box sx={{ mt: 1.5, fontSize: "13px", color: "#68737D", textAlign: "right" }}>
        Total imports: {imports.length}
      </Box>
    </Box>
  );
};

export default ImportHistory;
