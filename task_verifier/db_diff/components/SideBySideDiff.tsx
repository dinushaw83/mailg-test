"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  GitCompare,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Database,
  Copy,
  Check,
  X,
} from "lucide-react";
import { fetchDbDiff, getSessionId } from "../api";
import { DbDiffResponse, TableChanges, RowWithContext } from "../types";

// Cell Detail Modal Component
interface CellDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  rowData: RowWithContext | null;
  columnKey: string;
  allColumns: string[];
  onNavigate: (columnKey: string) => void;
}

function CellDetailModal({
  isOpen,
  onClose,
  rowData,
  columnKey,
  allColumns,
  onNavigate,
}: CellDetailModalProps) {
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col [&>button]:hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-slate-900 font-mono">
              {columnKey}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {/* Navigation Arrows */}
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={!hasPrev}
                  className="h-8 w-8 p-0"
                  title="Previous column"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-slate-500 min-w-[60px] text-center">
                  {currentIndex + 1} / {allColumns.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={!hasNext}
                  className="h-8 w-8 p-0"
                  title="Next column"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              {/* Copy Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto mt-4">
          <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-sm font-mono overflow-x-auto whitespace-pre-wrap">
            {jsonString}
          </pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SideBySideDiff() {
  const [diffData, setDiffData] = useState<DbDiffResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const handleGetDiff = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDbDiff();
      setDiffData(data);
      // Auto-expand tables with changes
      const tablesWithChanges = Object.keys(data.changes_by_table);
      setExpandedTables(new Set(tablesWithChanges));
    } catch (err) {
      if (err instanceof Error) {
        // Handle axios error response
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(
          axiosError.response?.data?.detail ||
            err.message ||
            "Failed to fetch database diff"
        );
      } else {
        setError("Failed to fetch database diff");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleTable = (tableName: string) => {
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
      <div className="flex flex-col items-center text-center py-8">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <GitCompare className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Side-by-Side Diff
        </h2>
        <p className="text-slate-500 max-w-md mb-6">
          Compare seed database state with current session state to see all
          changes made during this session.
        </p>
        {!sessionId && (
          <p className="text-amber-600 text-sm mb-4">
            No session ID found. Please ensure you have an active session.
          </p>
        )}
        <Button
          onClick={handleGetDiff}
          disabled={!sessionId}
          className="bg-orange-600 hover:bg-orange-500"
        >
          <GitCompare className="w-4 h-4 mr-2" />
          Get Diff
        </Button>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-10 h-10 text-orange-600 animate-spin mb-4" />
        <p className="text-slate-600">Fetching database diff...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <p className="text-slate-900 font-medium mb-2">Failed to fetch diff</p>
        <p className="text-slate-500 text-sm mb-6 max-w-md text-center">
          {error}
        </p>
        <Button
          onClick={handleGetDiff}
          variant="outline"
          className="border-slate-300"
        >
          <GitCompare className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  // Diff results
  if (!diffData) return null;

  const { summary, changes_by_table, tables_unchanged, computed_at } = diffData;
  const tablesWithChanges = Object.entries(changes_by_table);
  const hasNoChanges =
    summary.total_rows_added === 0 &&
    summary.total_rows_modified === 0 &&
    summary.total_rows_deleted === 0;

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Computed at:{" "}
            <span className="font-medium text-slate-700">
              {new Date(computed_at).toLocaleString()}
            </span>
          </p>
        </div>
        <Button
          onClick={handleGetDiff}
          variant="outline"
          size="sm"
          className="border-slate-300"
        >
          <GitCompare className="w-4 h-4 mr-2" />
          Refresh Diff
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {summary.tables_with_changes}
                </p>
                <p className="text-xs text-slate-500">Tables Changed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Plus className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {summary.total_rows_added}
                </p>
                <p className="text-xs text-slate-500">Rows Added</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Pencil className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {summary.total_rows_modified}
                </p>
                <p className="text-xs text-slate-500">Rows Modified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {summary.total_rows_deleted}
                </p>
                <p className="text-xs text-slate-500">Rows Deleted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No changes message */}
      {hasNoChanges && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-medium text-green-900">
                  No Changes Detected
                </p>
                <p className="text-sm text-green-700">
                  The current session database matches the seed database
                  exactly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tables with changes */}
      {tablesWithChanges.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Changed Tables
          </h3>
          {tablesWithChanges.map(([tableName, changes]) => (
            <TableChangeCard
              key={tableName}
              tableName={tableName}
              changes={changes}
              isExpanded={expandedTables.has(tableName)}
              onToggle={() => toggleTable(tableName)}
            />
          ))}
        </div>
      )}

      {/* Unchanged tables */}
      {tables_unchanged.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Unchanged Tables ({tables_unchanged.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {tables_unchanged.map((table) => (
              <span
                key={table}
                className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded"
              >
                {table}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TableChangeCardProps {
  tableName: string;
  changes: TableChanges;
  isExpanded: boolean;
  onToggle: () => void;
}

function TableChangeCard({
  tableName,
  changes,
  isExpanded,
  onToggle,
}: TableChangeCardProps) {
  const addedCount = changes.added.length;
  const modifiedCount = changes.modified.length;
  const deletedCount = changes.deleted.length;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                <Database className="w-4 h-4 text-orange-600" />
                <CardTitle className="text-sm font-medium text-slate-900">
                  {tableName}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {addedCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded">
                    <Plus className="w-3 h-3" />
                    {addedCount}
                  </span>
                )}
                {modifiedCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded">
                    <Pencil className="w-3 h-3" />
                    {modifiedCount}
                  </span>
                )}
                {deletedCount > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-red-700 bg-red-100 rounded">
                    <Trash2 className="w-3 h-3" />
                    {deletedCount}
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4 space-y-4">
            {/* Added rows */}
            {addedCount > 0 && (
              <RowsSection
                title="Added Rows"
                rows={changes.added}
                variant="added"
              />
            )}
            {/* Modified rows */}
            {modifiedCount > 0 && (
              <RowsSection
                title="Modified Rows"
                rows={changes.modified}
                variant="modified"
              />
            )}
            {/* Deleted rows */}
            {deletedCount > 0 && (
              <RowsSection
                title="Deleted Rows"
                rows={changes.deleted}
                variant="deleted"
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface RowsSectionProps {
  title: string;
  rows: RowWithContext[];
  variant: "added" | "modified" | "deleted";
}

interface SelectedCell {
  row: RowWithContext;
  columnKey: string;
}

function RowsSection({ title, rows, variant }: RowsSectionProps) {
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const variantStyles = {
    added: "border-green-200 bg-green-50/50",
    modified: "border-amber-200 bg-amber-50/50",
    deleted: "border-red-200 bg-red-50/50",
  };

  const headerStyles = {
    added: "text-green-700",
    modified: "text-amber-700",
    deleted: "text-red-700",
  };

  // Get all unique keys from all rows, excluding _context
  const allKeys = Array.from(
    new Set(
      rows.flatMap((row) =>
        Object.keys(row).filter((key) => key !== "_context")
      )
    )
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

  const handleCellClick = (row: RowWithContext, columnKey: string) => {
    setSelectedCell({ row, columnKey });
  };

  const handleNavigate = (columnKey: string) => {
    if (selectedCell) {
      setSelectedCell({ ...selectedCell, columnKey });
    }
  };

  return (
    <>
      <div className={`rounded-md border ${variantStyles[variant]} p-3`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs font-semibold ${headerStyles[variant]}`}>
            {title} ({rows.length})
          </p>
          <p className="text-[10px] text-slate-400 italic">
            Click any cell to view full content
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200/50">
                {visibleKeys.map((key) => (
                  <TableHead
                    key={key}
                    className="h-8 px-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap"
                  >
                    {key}
                  </TableHead>
                ))}
                {hasMoreKeys && (
                  <TableHead className="h-8 px-2 text-[10px] font-semibold text-slate-400">
                    +{sortedKeys.length - 8} more
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} className="border-b border-slate-200/30">
                  {visibleKeys.map((key) => (
                    <TableCell
                      key={key}
                      className="px-2 py-1.5 text-xs text-slate-700 font-mono max-w-[200px] truncate cursor-pointer hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-slate-200 transition-all rounded"
                      title="Click to view full value"
                      onClick={() => handleCellClick(row, key)}
                    >
                      {formatCellValue(row[key])}
                    </TableCell>
                  ))}
                  {hasMoreKeys && (
                    <TableCell className="px-2 py-1.5 text-xs text-slate-400">
                      ...
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

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

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
