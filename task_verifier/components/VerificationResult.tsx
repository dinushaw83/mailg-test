"use client";

import { Badge } from "@/components/ui/badge";
import { JsonViewer } from "./JsonViewer";
import { SyncScrollPane } from "./SyncScrollPane";
import type {
  VerifierResult,
  MatchResult,
  MismatchResult,
  AssertionDetail,
  ExtraRowData,
  CountError,
  CountErrorRow,
  UnexpectedChange,
} from "../types";

interface VerificationResultProps {
  result: VerifierResult;
}

export const VerificationResult = ({ result }: VerificationResultProps) => {
  if (result.status === "running") {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p className="text-blue-700 font-medium">Running verification...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge
          variant={result.status === "success" ? "default" : "destructive"}
        >
          {result.status.toUpperCase()}
        </Badge>
        {result.executionTime && (
          <span className="text-xs text-gray-500">
            Took {result.executionTime}ms
          </span>
        )}
      </div>

      <p className="text-lg font-medium text-gray-800">{result.message}</p>

      {result.error && (
        <div className="bg-red-50 border border-red-100 p-3 rounded text-sm text-red-700 font-mono">
          <strong>Error:</strong> {result.error}
        </div>
      )}

      {result.assertionResults && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-md font-bold mb-3 flex items-center gap-2">
            <span>📊</span> Ground Truth Verification
          </h3>
          <div
            className={`text-sm font-semibold mb-3 ${result.assertionResults.passed ? "text-green-600" : "text-red-600"}`}
          >
            {result.assertionResults.passed
              ? "✓ All Database Assertions Passed"
              : "✗ Database Assertions Failed"}
          </div>

          <div className="space-y-3">
            {/* Matches Section */}
            {result.assertionResults.matches.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-2">
                  <span>✓</span> Matched Changes (
                  {result.assertionResults.matches.length})
                </h4>
                {result.assertionResults.matches.map(
                  (m: MatchResult, i: number) => (
                    <MatchCard key={i} match={m} />
                  )
                )}
              </div>
            )}

            {/* Mismatches Section */}
            {result.assertionResults.mismatches.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
                  <span>✗</span> Missing Expected Changes (
                  {result.assertionResults.mismatches.length})
                </h4>
                {result.assertionResults.mismatches.map(
                  (m: MismatchResult, i: number) => (
                    <MismatchCard key={i} mismatch={m} />
                  )
                )}
              </div>
            )}

            {/* Count Errors Section */}
            {result.assertionResults.countErrors &&
              result.assertionResults.countErrors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2">
                    <span>⚠</span> Count Validation Errors (
                    {result.assertionResults.countErrors.length})
                  </h4>
                  {result.assertionResults.countErrors.map(
                    (error: CountError, i: number) => (
                      <CountErrorCard key={i} error={error} />
                    )
                  )}
                </div>
              )}

            {/* Unexpected Changes Section */}
            {result.assertionResults.unexpected &&
              result.assertionResults.unexpected.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-2">
                    <span>!</span> Unexpected Changes (
                    {result.assertionResults.unexpected.length})
                  </h4>
                  <p className="text-xs text-orange-600 italic mb-2">
                    These changes were not in the expected result
                    (timestamp-only changes are ignored)
                  </p>
                  {result.assertionResults.unexpected.map(
                    (change: UnexpectedChange, i: number) => (
                      <UnexpectedChangeCard key={i} change={change} />
                    )
                  )}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};

interface MatchCardProps {
  match: MatchResult;
}

const getDiffPaths = (
  before: any,
  actual: any,
  path = "root",
  highlightType: "changed" | "error" = "changed"
): Record<string, "changed" | "error"> => {
  const highlights: Record<string, "changed" | "error"> = {};

  if (before === actual) return highlights;

  // Handle null/undefined or type mismatch
  if (
    before === null ||
    actual === null ||
    before === undefined ||
    actual === undefined ||
    typeof before !== typeof actual
  ) {
    highlights[path] = highlightType;

    // If actual is an object/array, recurse to highlight all children as "added"
    if (actual !== null && typeof actual === "object") {
      if (Array.isArray(actual)) {
        actual.forEach((item, i) => {
          Object.assign(
            highlights,
            getDiffPaths(undefined, item, `${path}[${i}]`, highlightType)
          );
        });
      } else {
        Object.keys(actual).forEach((k) => {
          Object.assign(
            highlights,
            getDiffPaths(undefined, actual[k], `${path}.${k}`, highlightType)
          );
        });
      }
    }
    return highlights;
  }

  if (typeof before === "object") {
    const isBeforeArray = Array.isArray(before);
    const isActualArray = Array.isArray(actual);

    if (isBeforeArray !== isActualArray) {
      highlights[path] = highlightType;
      return highlights;
    }

    if (isBeforeArray) {
      const maxLen = Math.max(before.length, actual.length);
      for (let i = 0; i < maxLen; i++) {
        Object.assign(
          highlights,
          getDiffPaths(before[i], actual[i], `${path}[${i}]`, highlightType)
        );
      }
    } else {
      const keys = new Set([...Object.keys(before), ...Object.keys(actual)]);
      keys.forEach((k) => {
        Object.assign(
          highlights,
          getDiffPaths(before[k], actual[k], `${path}.${k}`, highlightType)
        );
      });
    }
  } else {
    // Primitives that were already checked for equality
    highlights[path] = highlightType;
  }

  return highlights;
};

const MatchCard = ({ match }: MatchCardProps) => {
  // Get all changed paths as "error" (red) by default - these are unexpected changes
  const highlightPaths = getDiffPaths(
    match.before,
    match.actual,
    "root",
    "error"
  );

  // Build set of asserted field paths for quick lookup
  const assertedFields = new Set(match.assertions.map((a) => a.field));

  // Override: Mark asserted fields that passed as "changed" (green)
  match.assertions.forEach((a) => {
    const fieldPath = `root.${a.field}`;
    if (a.passed) {
      highlightPaths[fieldPath] = "changed"; // Green for expected changes that passed
    } else {
      highlightPaths[fieldPath] = "error"; // Red for failed assertions
    }
  });

  // Check if there are any unexpected changes (changes not in assertions)
  const hasUnexpectedChanges = Object.keys(highlightPaths).some((path) => {
    const fieldName = path.replace("root.", "");
    return highlightPaths[path] === "error" && !assertedFields.has(fieldName);
  });

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="bg-green-50 px-3 py-2 border-b flex justify-between items-center">
        <span className="font-bold text-green-800 text-sm">
          {match.table} ({match.type})
        </span>
        <span className="text-xs font-medium bg-green-200 text-green-800 px-2 py-0.5 rounded">
          MATCHED
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm text-gray-600 mb-2">{match.description}</p>
        <div className="space-y-1 mb-3">
          {match.assertions.map((a: AssertionDetail, j: number) => (
            <div key={j} className="flex items-center gap-2 text-xs">
              <span className={a.passed ? "text-green-500" : "text-red-500"}>
                {a.passed ? "✓" : "✗"}
              </span>
              <span className="font-mono font-bold">{a.field}</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">
                Expected: {JSON.stringify(a.expected)}
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-700 font-medium">
                Actual: {JSON.stringify(a.actual)}
              </span>
            </div>
          ))}
        </div>
        {hasUnexpectedChanges && (
          <div className="mb-3 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            ⚠️ Other fields were also modified (shown in red below)
          </div>
        )}
        {match.type === "modified" && match.before && (
          <SyncScrollPane
            leftTitle="Before (Seed)"
            rightTitle="After (Result)"
            leftContent={
              <JsonViewer data={match.before} initialExpanded={true} />
            }
            rightContent={
              <JsonViewer
                data={match.actual}
                initialExpanded={true}
                highlightPaths={highlightPaths}
              />
            }
            compact={true}
          />
        )}
        {match.type === "added" && (
          <SyncScrollPane
            leftTitle="Before (Seed)"
            rightTitle="After (Result)"
            leftContent={<JsonViewer data={{}} initialExpanded={true} />}
            rightContent={
              <JsonViewer
                data={match.actual}
                initialExpanded={true}
                highlightPaths={highlightPaths}
              />
            }
            compact={true}
          />
        )}
      </div>
    </div>
  );
};

interface MismatchCardProps {
  mismatch: MismatchResult;
}

// Helper to get changed fields between before and after
/* eslint-disable @typescript-eslint/no-explicit-any */
const getChangedFields = (
  before: any,
  after: any
): { field: string; before: any; after: any }[] => {
  const changes: { field: string; before: any; after: any }[] = [];
  if (!before || !after) return changes;

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  allKeys.forEach((key) => {
    const beforeVal = before[key];
    const afterVal = after[key];
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes.push({ field: key, before: beforeVal, after: afterVal });
    }
  });
  return changes;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// Compact view showing only changed fields
const ChangedFieldsSummary = ({
  extraRow,
  idx,
}: {
  extraRow: ExtraRowData;
  idx: number;
}) => {
  const changes =
    extraRow.rowType === "modified" && extraRow.before
      ? getChangedFields(extraRow.before, extraRow.after)
      : [];

  const rowId = extraRow.before?.id || extraRow.after?.id || extraRow.row?.id;

  return (
    <div className="border border-red-100 rounded bg-red-50/30">
      <div className="px-2 py-1.5 bg-red-100/50 border-b border-red-100 flex items-center justify-between">
        <span className="text-xs font-medium text-red-700">
          {extraRow.rowType === "modified" ? "Modified" : "Added"} Row #
          {idx + 1}
          {rowId && (
            <span className="text-gray-500 font-normal ml-1">
              (id: {rowId})
            </span>
          )}
        </span>
        <span className="text-[10px] text-red-400">
          {changes.length} field{changes.length !== 1 ? "s" : ""} changed
        </span>
      </div>
      <div className="p-2 space-y-1">
        {changes.map((change, j) => (
          <div
            key={j}
            className="flex items-start gap-2 text-xs font-mono bg-white rounded px-2 py-1 border border-red-100"
          >
            <span className="font-bold text-red-600 min-w-[100px]">
              {change.field}
            </span>
            <span className="text-gray-400">:</span>
            <span className="text-gray-500 line-through">
              {JSON.stringify(change.before)}
            </span>
            <span className="text-gray-400">→</span>
            <span className="text-red-600 font-medium">
              {JSON.stringify(change.after)}
            </span>
          </div>
        ))}
        {changes.length === 0 && extraRow.rowType === "added" && (
          <div className="text-xs text-gray-500 italic">New row added</div>
        )}
      </div>
    </div>
  );
};

const MismatchCard = ({ mismatch }: MismatchCardProps) => {
  const getHeaderLabel = (type: string, subType?: string) => {
    switch (type) {
      case "unexpected_deletes":
        return "Unexpected Deletes";
      case "count_mismatch":
        return `Count Mismatch (${subType || "rows"})`;
      case "extra_rows":
        return "Extra Rows Found";
      case "duplicate_content":
        return "Duplicate Content";
      default:
        return "Missing Change";
    }
  };

  const getRowTypeLabel = (rowType: string) => {
    switch (rowType) {
      case "modified":
        return "Modified Row";
      case "added":
        return "Added Row";
      case "deleted":
        return "Deleted Row";
      default:
        return "Row";
    }
  };

  const getSectionTitle = () => {
    if (mismatch.type === "count_mismatch") {
      return `${mismatch.subType === "modified" ? "Modified" : "Added"} Rows Summary (${mismatch.extraRows?.length || 0}):`;
    }
    if (mismatch.type === "unexpected_deletes") {
      return `Deleted Rows (${mismatch.extraRows?.length || 0}):`;
    }
    return `Unexpected Changes (${mismatch.extraRows?.length || 0}):`;
  };

  // For count_mismatch, show compact view; for extra_rows, show full diff
  const showCompactView = mismatch.type === "count_mismatch";

  return (
    <div className="border border-red-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="bg-red-50 px-3 py-2 border-b flex justify-between items-center">
        <span className="font-bold text-red-800 text-sm">
          {mismatch.table} - {getHeaderLabel(mismatch.type, mismatch.subType)}
        </span>
        <span className="text-xs font-medium bg-red-200 text-red-800 px-2 py-0.5 rounded">
          FAILED
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm text-red-700">{mismatch.reason}</p>
        {mismatch.description && (
          <p className="text-xs text-gray-500 mt-1 mb-3">
            {mismatch.description}
          </p>
        )}

        {/* Show count summary for count_mismatch */}
        {mismatch.type === "count_mismatch" &&
          mismatch.expectedCount !== undefined && (
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="text-red-500">✗</span>
              <span className="text-gray-600">
                Expected:{" "}
                <span className="font-bold">{mismatch.expectedCount}</span>
              </span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-600">
                Actual:{" "}
                <span className="font-bold text-red-600">
                  {mismatch.actualCount}
                </span>
              </span>
            </div>
          )}

        {mismatch.assertions && (
          <div className="space-y-1 mt-3 pt-3 border-t border-red-100">
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-tight mb-1">
              Expected Conditions:
            </p>
            {mismatch.assertions.map((a, j) => (
              <div key={j} className="flex items-center gap-2 text-xs">
                <span className="text-red-300">✗</span>
                <span className="font-mono font-bold text-gray-700">
                  {a.field}
                </span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">{a.operator}</span>
                <span className="text-gray-400">|</span>
                <span className="text-gray-700">
                  Expected: {JSON.stringify(a.expected)}
                </span>
              </div>
            ))}
          </div>
        )}

        {mismatch.extraRows && mismatch.extraRows.length > 0 && (
          <div className="mt-3 pt-3 border-t border-red-100 space-y-3">
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-tight">
              {getSectionTitle()}
            </p>

            {/* Compact view for count_mismatch - only show changed fields */}
            {showCompactView &&
              mismatch.extraRows.map((extraRow: ExtraRowData, idx: number) => (
                <ChangedFieldsSummary key={idx} extraRow={extraRow} idx={idx} />
              ))}

            {/* Full diff view for extra_rows and other types */}
            {!showCompactView &&
              mismatch.extraRows.map((extraRow: ExtraRowData, idx: number) => {
                // Use "error" highlight type for unexpected rows (shows in red)
                const highlightPaths =
                  extraRow.rowType === "modified" && extraRow.before
                    ? getDiffPaths(
                        extraRow.before,
                        extraRow.after,
                        "root",
                        "error"
                      )
                    : {};

                return (
                  <div
                    key={idx}
                    className="border border-red-100 rounded bg-red-50/30"
                  >
                    <div className="px-2 py-1 bg-red-100/50 border-b border-red-100">
                      <span className="text-xs font-medium text-red-700">
                        {getRowTypeLabel(extraRow.rowType)} #{idx + 1}
                      </span>
                    </div>
                    <div className="p-2">
                      {extraRow.rowType === "modified" && extraRow.before ? (
                        <SyncScrollPane
                          leftTitle="Before"
                          rightTitle="After"
                          leftContent={
                            <JsonViewer
                              data={extraRow.before}
                              initialExpanded={true}
                            />
                          }
                          rightContent={
                            <JsonViewer
                              data={extraRow.after}
                              initialExpanded={true}
                              highlightPaths={highlightPaths}
                            />
                          }
                          compact={true}
                        />
                      ) : extraRow.rowType === "deleted" ? (
                        <SyncScrollPane
                          leftTitle="Before (Deleted)"
                          rightTitle="After"
                          leftContent={
                            <JsonViewer
                              data={extraRow.row}
                              initialExpanded={true}
                              highlightPaths={getDiffPaths(
                                {},
                                extraRow.row,
                                "root",
                                "error"
                              )}
                            />
                          }
                          rightContent={
                            <JsonViewer data={{}} initialExpanded={true} />
                          }
                          compact={true}
                        />
                      ) : (
                        <SyncScrollPane
                          leftTitle="Before"
                          rightTitle="After (New Row)"
                          leftContent={
                            <JsonViewer data={{}} initialExpanded={true} />
                          }
                          rightContent={
                            <JsonViewer
                              data={extraRow.row || extraRow.after}
                              initialExpanded={true}
                              highlightPaths={getDiffPaths(
                                {},
                                extraRow.row || extraRow.after,
                                "root",
                                "error"
                              )}
                            />
                          }
                          compact={true}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};

// CountErrorCard component for displaying count validation errors
interface CountErrorCardProps {
  error: CountError;
}

const CountErrorCard = ({ error }: CountErrorCardProps) => {
  const getTypeLabel = (type: CountError["type"]) => {
    switch (type) {
      case "unexpected_deletes":
        return "Unexpected Deletions";
      case "added_count_mismatch":
        return "Added Count Mismatch";
      case "modified_count_mismatch":
        return "Modified Count Mismatch";
      default:
        return "Count Error";
    }
  };

  const getRowLabel = (row: CountErrorRow) => {
    return row.summary || row.name || row.title || `Row #${row.id}`;
  };

  const getRowTypeIcon = (rowType: string) => {
    switch (rowType) {
      case "added":
        return "+";
      case "modified":
        return "~";
      case "deleted":
        return "-";
      default:
        return "•";
    }
  };

  const getRowTypeColor = (rowType: string) => {
    switch (rowType) {
      case "added":
        return "text-green-600 bg-green-50";
      case "modified":
        return "text-amber-600 bg-amber-50";
      case "deleted":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  return (
    <div className="border border-amber-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="bg-amber-50 px-3 py-2 border-b flex justify-between items-center">
        <span className="font-bold text-amber-800 text-sm">
          {error.table} - {getTypeLabel(error.type)}
        </span>
        <span className="text-xs font-medium bg-amber-200 text-amber-800 px-2 py-0.5 rounded">
          COUNT ERROR
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm text-amber-700">{error.message}</p>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="text-amber-500">⚠</span>
          {error.expected !== undefined && (
            <>
              <span className="text-gray-600">
                Expected: <span className="font-bold">{error.expected}</span>
              </span>
              <span className="text-gray-400">|</span>
            </>
          )}
          <span className="text-gray-600">
            Actual:{" "}
            <span className="font-bold text-amber-600">{error.actual}</span>
          </span>
        </div>

        {/* Row List */}
        {error.rows && error.rows.length > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-100">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-tight mb-2">
              Affected Rows:
            </p>
            <ul className="space-y-1.5">
              {error.rows.map((row, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs bg-amber-50/50 rounded px-2 py-1.5 border border-amber-100"
                >
                  <span
                    className={`font-mono font-bold w-5 h-5 flex items-center justify-center rounded text-xs ${getRowTypeColor(row.rowType)}`}
                  >
                    {getRowTypeIcon(row.rowType)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {row.id && (
                        <span className="font-mono text-gray-400">
                          #{row.id}
                        </span>
                      )}
                      <span className="font-medium text-gray-700 truncate">
                        {getRowLabel(row)}
                      </span>
                    </div>
                    {row.changedFields && row.changedFields.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="text-[10px] text-gray-400">
                          Changed:
                        </span>
                        {row.changedFields.map((field, fieldIdx) => (
                          <span
                            key={fieldIdx}
                            className="text-[10px] font-mono bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

// UnexpectedChangeCard component for displaying unexpected changes
interface UnexpectedChangeCardProps {
  change: UnexpectedChange;
}

const UnexpectedChangeCard = ({ change }: UnexpectedChangeCardProps) => {
  const getTypeLabel = (type: UnexpectedChange["type"]) => {
    switch (type) {
      case "extra_added":
        return "Extra Added Row";
      case "extra_modified":
        return "Extra Modified Row";
      case "unexpected_table_added":
        return "Unexpected Table Addition";
      case "unexpected_table_modified":
        return "Unexpected Table Modification";
      case "unexpected_table_deleted":
        return "Unexpected Table Deletion";
      default:
        return "Unexpected Change";
    }
  };

  // For modified rows, extract before/after if available
  const isModifiedRow =
    change.type === "extra_modified" ||
    change.type === "unexpected_table_modified";
  const beforeData = isModifiedRow ? change.row?.before : null;
  const afterData = isModifiedRow ? change.row?.after || change.row : null;

  // Calculate highlight paths for diff
  const highlightPaths =
    isModifiedRow && beforeData
      ? getDiffPaths(beforeData, afterData, "root", "error")
      : getDiffPaths({}, change.row, "root", "error");

  return (
    <div className="border border-orange-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="bg-orange-50 px-3 py-2 border-b flex justify-between items-center">
        <span className="font-bold text-orange-800 text-sm">
          {change.table} - {getTypeLabel(change.type)}
        </span>
        <span className="text-xs font-medium bg-orange-200 text-orange-800 px-2 py-0.5 rounded">
          UNEXPECTED
        </span>
      </div>
      <div className="p-3">
        <p className="text-sm text-orange-700 mb-3">{change.reason}</p>

        {isModifiedRow && beforeData ? (
          <SyncScrollPane
            leftTitle="Before"
            rightTitle="After"
            leftContent={
              <JsonViewer data={beforeData} initialExpanded={true} />
            }
            rightContent={
              <JsonViewer
                data={afterData}
                initialExpanded={true}
                highlightPaths={highlightPaths}
              />
            }
            compact={true}
          />
        ) : (
          <div className="border border-orange-100 rounded bg-orange-50/30">
            <div className="px-2 py-1 bg-orange-100/50 border-b border-orange-100">
              <span className="text-xs font-medium text-orange-700">
                Row Data
              </span>
            </div>
            <div className="p-2">
              <div className="json-viewer-container compact">
                <JsonViewer
                  data={change.row}
                  initialExpanded={true}
                  highlightPaths={highlightPaths}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
