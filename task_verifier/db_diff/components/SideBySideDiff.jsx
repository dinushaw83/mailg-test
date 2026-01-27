/* eslint-disable */

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  IconButton,
  Box,
  Typography,
} from "@mui/material";
import {
  CompareArrows as GitCompare,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Add as Plus,
  Edit as Pencil,
  Delete as Trash2,
  CheckCircle,
  Storage as Database,
  ContentCopy as Copy,
  Check,
  Close as X,
  ExpandMore,
} from "@mui/icons-material";
import apiClient from "../../../src/services/apiClient";

// Cell Detail Modal Component
function CellDetailModal({
  isOpen,
  onClose,
  rowData,
  columnKey,
  allColumns,
  onNavigate,
}) {
  const [copied, setCopied] = useState(false);

  const cellValue = rowData?.[columnKey];
  const jsonString =
    typeof cellValue === "object" && cellValue !== null
      ? JSON.stringify(cellValue, null, 2)
      : String(cellValue ?? "null");

  const currentIndex = allColumns.indexOf(columnKey);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allColumns.length - 1;

  const handlePrev = () => {
    if (hasPrev) {
      onNavigate(allColumns[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onNavigate(allColumns[currentIndex + 1]);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="code">
            {columnKey}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Box display="flex" alignItems="center" gap={0.5} mr={1}>
              <IconButton
                size="small"
                onClick={handlePrev}
                disabled={!hasPrev}
                title="Previous column"
              >
                <ChevronLeft />
              </IconButton>
              <Typography variant="caption" sx={{ minWidth: "60px", textAlign: "center" }}>
                {currentIndex + 1} / {allColumns.length}
              </Typography>
              <IconButton
                size="small"
                onClick={handleNext}
                disabled={!hasNext}
                title="Next column"
              >
                <ChevronRight />
              </IconButton>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={handleCopy}
              startIcon={copied ? <Check color="success" /> : <Copy />}
            >
              {copied ? "Copied!" : "Copy"}
            </Button>
            <IconButton size="small" onClick={onClose} title="Close">
              <X />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box
          component="pre"
          sx={{
            bgcolor: "#1e293b",
            color: "#f8fafc",
            p: 2,
            borderRadius: 1,
            fontSize: "0.875rem",
            fontFamily: "monospace",
            overflow: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {jsonString}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export function SideBySideDiff() {
  const [diffData, setDiffData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedTables, setExpandedTables] = useState(new Set());

  const getSessionId = () => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const urlRunId = params.get("run_id");
    const miraRunId = localStorage.getItem("current_run_id");
    return urlRunId || miraRunId || null;
  };

  const handleGetDiff = async () => {
    try {
      setLoading(true);
      setError(null);
      const sessionId = getSessionId();
      if (!sessionId) {
        throw new Error("No session ID found");
      }
      const response = await apiClient.get(`/v1/db_diff?session_id=${sessionId}`);
      setDiffData(response.data);
      // Auto-expand tables with changes
      const tablesWithChanges = Object.keys(response.data.changes_by_table || {});
      setExpandedTables(new Set(tablesWithChanges));
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to fetch database diff"
      );
    } finally {
      setLoading(false);
    }
  };

  const toggleTable = (tableName) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  const sessionId = getSessionId();

  // Initial state - show Get Diff button
  if (!diffData && !loading && !error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" textAlign="center" py={4}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            bgcolor: "grey.100",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <GitCompare sx={{ fontSize: 32, color: "grey.400" }} />
        </Box>
        <Typography variant="h6" gutterBottom>
          Side-by-Side Diff
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mb: 3 }}>
          Compare seed database state with current session state to see all changes made during
          this session.
        </Typography>
        {!sessionId && (
          <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
            No session ID found. Please ensure you have an active session.
          </Typography>
        )}
        <Button
          onClick={handleGetDiff}
          disabled={!sessionId}
          variant="contained"
          color="primary"
          startIcon={<GitCompare />}
        >
          Get Diff
        </Button>
      </Box>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8}>
        <CircularProgress sx={{ mb: 2 }} />
        <Typography color="text.secondary">Fetching database diff...</Typography>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={6}>
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            bgcolor: "error.light",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <AlertCircle sx={{ fontSize: 32, color: "error.main" }} />
        </Box>
        <Typography variant="h6" gutterBottom>
          Failed to fetch diff
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400, textAlign: "center" }}>
          {error}
        </Typography>
        <Button
          onClick={handleGetDiff}
          variant="outlined"
          startIcon={<GitCompare />}
        >
          Try Again
        </Button>
      </Box>
    );
  }

  // Diff results
  if (!diffData) return null;

  const { summary, changes_by_table, tables_unchanged, computed_at } = diffData;
  const tablesWithChanges = Object.entries(changes_by_table || {});
  const hasNoChanges =
    summary.total_rows_added === 0 &&
    summary.total_rows_modified === 0 &&
    summary.total_rows_deleted === 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Header with refresh button */}
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Typography variant="body2" color="text.secondary">
          Computed at: <strong>{new Date(computed_at).toLocaleString()}</strong>
        </Typography>
        <Button
          onClick={handleGetDiff}
          variant="outlined"
          size="small"
          startIcon={<GitCompare />}
        >
          Refresh Diff
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={2}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  bgcolor: "primary.light",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Database sx={{ color: "primary.main" }} />
              </Box>
              <Box>
                <Typography variant="h4">{summary.tables_with_changes}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Tables Changed
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
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
                <Plus sx={{ color: "success.main" }} />
              </Box>
              <Box>
                <Typography variant="h4">{summary.total_rows_added}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Rows Added
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  bgcolor: "warning.light",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Pencil sx={{ color: "warning.main" }} />
              </Box>
              <Box>
                <Typography variant="h4">{summary.total_rows_modified}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Rows Modified
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
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
                <Trash2 sx={{ color: "error.main" }} />
              </Box>
              <Box>
                <Typography variant="h4">{summary.total_rows_deleted}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Rows Deleted
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* No changes message */}
      {hasNoChanges && (
        <Card sx={{ borderColor: "success.main", bgcolor: "success.light" }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={2}>
              <CheckCircle sx={{ color: "success.main", fontSize: 32 }} />
              <Box>
                <Typography variant="h6" color="success.dark">
                  No Changes Detected
                </Typography>
                <Typography variant="body2" color="success.dark">
                  The current session database matches the seed database exactly.
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tables with changes */}
      {tablesWithChanges.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, textTransform: "uppercase" }}>
            Changed Tables
          </Typography>
          {tablesWithChanges.map(([tableName, changes]) => (
            <TableChangeCard
              key={tableName}
              tableName={tableName}
              changes={changes}
              isExpanded={expandedTables.has(tableName)}
              onToggle={() => toggleTable(tableName)}
            />
          ))}
        </Box>
      )}

      {/* Unchanged tables */}
      {tables_unchanged && tables_unchanged.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 2, textTransform: "uppercase" }}>
            Unchanged Tables ({tables_unchanged.length})
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {tables_unchanged.map((table) => (
              <Box
                key={table}
                sx={{
                  px: 1,
                  py: 0.5,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "text.secondary",
                  bgcolor: "grey.100",
                  borderRadius: 1,
                }}
              >
                {table}
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function TableChangeCard({ tableName, changes, isExpanded, onToggle }) {
  const addedCount = changes.added?.length || 0;
  const modifiedCount = changes.modified?.length || 0;
  const deletedCount = changes.deleted?.length || 0;

  return (
    <Accordion expanded={isExpanded} onChange={onToggle} sx={{ mb: 1 }}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" mr={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Database sx={{ color: "primary.main", fontSize: 20 }} />
            <Typography variant="subtitle2">{tableName}</Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            {addedCount > 0 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "success.dark",
                  bgcolor: "success.light",
                  borderRadius: 1,
                }}
              >
                <Plus sx={{ fontSize: 12 }} />
                {addedCount}
              </Box>
            )}
            {modifiedCount > 0 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "warning.dark",
                  bgcolor: "warning.light",
                  borderRadius: 1,
                }}
              >
                <Pencil sx={{ fontSize: 12 }} />
                {modifiedCount}
              </Box>
            )}
            {deletedCount > 0 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.25,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "error.dark",
                  bgcolor: "error.light",
                  borderRadius: 1,
                }}
              >
                <Trash2 sx={{ fontSize: 12 }} />
                {deletedCount}
              </Box>
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {addedCount > 0 && (
            <RowsSection title="Added Rows" rows={changes.added} variant="added" />
          )}
          {modifiedCount > 0 && (
            <RowsSection title="Modified Rows" rows={changes.modified} variant="modified" />
          )}
          {deletedCount > 0 && (
            <RowsSection title="Deleted Rows" rows={changes.deleted} variant="deleted" />
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

function RowsSection({ title, rows, variant }) {
  const [selectedCell, setSelectedCell] = useState(null);

  const variantStyles = {
    added: { borderColor: "success.main", bgcolor: "success.light" },
    modified: { borderColor: "warning.main", bgcolor: "warning.light" },
    deleted: { borderColor: "error.main", bgcolor: "error.light" },
  };

  const headerStyles = {
    added: { color: "success.dark" },
    modified: { color: "warning.dark" },
    deleted: { color: "error.dark" },
  };

  // Get all unique keys from all rows, excluding _context
  const allKeys = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row).filter((key) => key !== "_context")))
  ).sort();

  // Prioritize common columns
  const priorityKeys = ["id", "name", "email", "title", "status", "created_at"];
  const sortedKeys = [
    ...priorityKeys.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !priorityKeys.includes(k)),
  ];

  // Limit visible columns for readability
  const visibleKeys = sortedKeys.slice(0, 8);
  const hasMoreKeys = sortedKeys.length > 8;

  const handleCellClick = (row, columnKey) => {
    setSelectedCell({ row, columnKey });
  };

  const handleNavigate = (columnKey) => {
    if (selectedCell) {
      setSelectedCell({ ...selectedCell, columnKey });
    }
  };

  const formatCellValue = (value) => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  return (
    <>
      <Box
        sx={{
          borderRadius: 1,
          border: 1,
          p: 1.5,
          ...variantStyles[variant],
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2" sx={headerStyles[variant]}>
            {title} ({rows.length})
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.625rem", fontStyle: "italic" }}>
            Click any cell to view full content
          </Typography>
        </Box>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {visibleKeys.map((key) => (
                  <TableHead key={key} sx={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase" }}>
                    {key}
                  </TableHead>
                ))}
                {hasMoreKeys && (
                  <TableHead sx={{ fontSize: "0.625rem", color: "text.secondary" }}>
                    +{sortedKeys.length - 8} more
                  </TableHead>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx}>
                  {visibleKeys.map((key) => (
                    <TableCell
                      key={key}
                      sx={{
                        fontSize: "0.75rem",
                        fontFamily: "monospace",
                        maxWidth: 200,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        cursor: "pointer",
                        "&:hover": {
                          bgcolor: "white",
                          boxShadow: 1,
                        },
                      }}
                      title="Click to view full value"
                      onClick={() => handleCellClick(row, key)}
                    >
                      {formatCellValue(row[key])}
                    </TableCell>
                  ))}
                  {hasMoreKeys && (
                    <TableCell sx={{ fontSize: "0.75rem", color: "text.secondary" }}>...</TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Box>

      {/* Cell Detail Modal */}
      <CellDetailModal
        isOpen={selectedCell !== null}
        onClose={() => setSelectedCell(null)}
        rowData={selectedCell?.row ?? null}
        columnKey={selectedCell?.columnKey ?? ""}
        allColumns={sortedKeys}
        onNavigate={handleNavigate}
      />
    </>
  );
}
