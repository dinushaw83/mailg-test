/* eslint-disable */

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { Badge } from "./Badge";
import { JsonViewer } from "./JsonViewer";
import { SyncScrollPane } from "./SyncScrollPane";

export const VerificationResult = ({ result }) => {
  if (result.status === "running") {
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            border: "2px solid",
            borderColor: "primary.main",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            mx: "auto",
            mb: 1,
          }}
        />
        <Typography sx={{ color: "info.main", fontWeight: 500 }}>Running verification...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Badge variant={result.status === "success" ? "default" : "destructive"}>{result.status.toUpperCase()}</Badge>
        {result.executionTime && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Took {result.executionTime}ms
          </Typography>
        )}
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 500, color: "text.primary" }}>
        {result.message}
      </Typography>

      {result.error && (
        <Box
          sx={{
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.1)" : "#fef2f2"),
            border: (theme) =>
              theme.palette.mode === "dark" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid #fee2e2",
            p: 1.5,
            borderRadius: 1,
            fontSize: "0.875rem",
            color: "error.main",
            fontFamily: "monospace",
          }}
        >
          <strong>Error:</strong> {result.error}
        </Box>
      )}

      {result.assertionResults && (
        <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              mb: 1.5,
              display: "flex",
              alignItems: "center",
              gap: 1,
              color: "text.primary",
            }}
          >
            <span>📊</span> Ground Truth Verification
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              mb: 1.5,
              color: result.assertionResults.passed ? "success.main" : "error.main",
            }}
          >
            {result.assertionResults.passed ? "✓ All Database Assertions Passed" : "✗ Database Assertions Failed"}
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {/* Matches Section */}
            {result.assertionResults.matches.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: "success.main",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <span>✓</span> Matched Changes ({result.assertionResults.matches.length})
                </Typography>
                {result.assertionResults.matches.map((m, i) => (
                  <MatchCard key={i} match={m} />
                ))}
              </Box>
            )}

            {/* Mismatches Section */}
            {result.assertionResults.mismatches.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: "error.main",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <span>✗</span> Missing Expected Changes ({result.assertionResults.mismatches.length})
                </Typography>
                {result.assertionResults.mismatches.map((m, i) => (
                  <MismatchCard key={i} mismatch={m} />
                ))}
              </Box>
            )}

            {/* Count Errors Section */}
            {result.assertionResults.countErrors && result.assertionResults.countErrors.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: "warning.main",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <span>⚠</span> Count Validation Errors ({result.assertionResults.countErrors.length})
                </Typography>
                {result.assertionResults.countErrors.map((error, i) => (
                  <CountErrorCard key={i} error={error} />
                ))}
              </Box>
            )}

            {/* Unexpected Changes Section */}
            {result.assertionResults.unexpected && result.assertionResults.unexpected.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: "warning.dark",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <span>!</span> Unexpected Changes ({result.assertionResults.unexpected.length})
                </Typography>
                <Typography variant="caption" sx={{ color: "warning.dark", fontStyle: "italic", mb: 1 }}>
                  These changes were not in the expected result (timestamp-only changes are ignored)
                </Typography>
                {result.assertionResults.unexpected.map((change, i) => (
                  <UnexpectedChangeCard key={i} change={change} />
                ))}
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

const getDiffPaths = (before, actual, path = "root", highlightType = "changed") => {
  const highlights = {};

  if (before === actual) return highlights;

  if (
    before === null ||
    actual === null ||
    before === undefined ||
    actual === undefined ||
    typeof before !== typeof actual
  ) {
    highlights[path] = highlightType;

    if (actual !== null && typeof actual === "object") {
      if (Array.isArray(actual)) {
        actual.forEach((item, i) => {
          Object.assign(highlights, getDiffPaths(undefined, item, `${path}[${i}]`, highlightType));
        });
      } else {
        Object.keys(actual).forEach((k) => {
          Object.assign(highlights, getDiffPaths(undefined, actual[k], `${path}.${k}`, highlightType));
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
        Object.assign(highlights, getDiffPaths(before[i], actual[i], `${path}[${i}]`, highlightType));
      }
    } else {
      const keys = new Set([...Object.keys(before), ...Object.keys(actual)]);
      keys.forEach((k) => {
        Object.assign(highlights, getDiffPaths(before[k], actual[k], `${path}.${k}`, highlightType));
      });
    }
  } else {
    highlights[path] = highlightType;
  }

  return highlights;
};

const MatchCard = ({ match }) => {
  const highlightPaths = getDiffPaths(match.before, match.actual, "root", "error");

  const assertedFields = new Set(match.assertions.map((a) => a.field));

  match.assertions.forEach((a) => {
    const fieldPath = `root.${a.field}`;
    if (a.passed) {
      highlightPaths[fieldPath] = "changed";
    } else {
      highlightPaths[fieldPath] = "error";
    }
  });

  const hasUnexpectedChanges = Object.keys(highlightPaths).some((path) => {
    const fieldName = path.replace("root.", "");
    return highlightPaths[path] === "error" && !assertedFields.has(fieldName);
  });

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
        boxShadow: 1,
      }}
    >
      <Box
        sx={{
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.1)" : "#f0fdf4"),
          px: 1.5,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, color: "success.dark" }}>
          {match.table} ({match.type})
        </Typography>
        <Chip
          label="MATCHED"
          size="small"
          sx={{
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.2)" : "#bbf7d0"),
            color: "success.dark",
            fontSize: "0.75rem",
            fontWeight: 500,
            height: 20,
          }}
        />
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
          {match.description}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 1.5 }}>
          {match.assertions.map((a, j) => (
            <Box
              key={j}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: "0.75rem",
              }}
            >
              <Box component="span" sx={{ color: a.passed ? "success.main" : "error.main" }}>
                {a.passed ? "✓" : "✗"}
              </Box>
              <Box component="span" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                {a.field}
              </Box>
              <Box component="span" sx={{ color: "text.disabled" }}>
                |
              </Box>
              <Box component="span" sx={{ color: "text.secondary" }}>
                Expected: {JSON.stringify(a.expected)}
              </Box>
              <Box component="span" sx={{ color: "text.disabled" }}>
                |
              </Box>
              <Box component="span" sx={{ color: "text.primary", fontWeight: 500 }}>
                Actual: {JSON.stringify(a.actual)}
              </Box>
            </Box>
          ))}
        </Box>
        {hasUnexpectedChanges && (
          <Box
            sx={{
              mb: 1.5,
              px: 1,
              py: 0.75,
              bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.1)" : "#fffbeb"),
              border: (theme) =>
                theme.palette.mode === "dark" ? "1px solid rgba(217, 119, 6, 0.3)" : "1px solid #fde68a",
              borderRadius: 1,
              fontSize: "0.75rem",
              color: "warning.main",
            }}
          >
            ⚠️ Other fields were also modified (shown in red below)
          </Box>
        )}
        {match.type === "modified" && match.before && (
          <SyncScrollPane
            leftTitle="Before (Seed)"
            rightTitle="After (Result)"
            leftContent={<JsonViewer data={match.before} initialExpanded={true} />}
            rightContent={<JsonViewer data={match.actual} initialExpanded={true} highlightPaths={highlightPaths} />}
            compact={true}
          />
        )}
        {match.type === "added" && (
          <SyncScrollPane
            leftTitle="Before (Seed)"
            rightTitle="After (Result)"
            leftContent={<JsonViewer data={{}} initialExpanded={true} />}
            rightContent={<JsonViewer data={match.actual} initialExpanded={true} highlightPaths={highlightPaths} />}
            compact={true}
          />
        )}
      </Box>
    </Box>
  );
};

const getChangedFields = (before, after) => {
  const changes = [];
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

const ChangedFieldsSummary = ({ extraRow, idx }) => {
  const changes =
    extraRow.rowType === "modified" && extraRow.before ? getChangedFields(extraRow.before, extraRow.after) : [];

  const rowId = extraRow.before?.id || extraRow.after?.id || extraRow.row?.id;

  return (
    <Box
      sx={{
        border: "1px solid #fecaca",
        borderRadius: 1,
        bgcolor: "rgba(254, 242, 242, 0.3)",
      }}
    >
      <Box
        sx={{
          px: 1,
          py: 0.75,
          bgcolor: "rgba(254, 226, 226, 0.5)",
          borderBottom: "1px solid #fecaca",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 500, color: "#b91c1c" }}>
          {extraRow.rowType === "modified" ? "Modified" : "Added"} Row #{idx + 1}
          {rowId && (
            <Box component="span" sx={{ color: "#64748b", fontWeight: 400, ml: 0.5 }}>
              (id: {rowId})
            </Box>
          )}
        </Typography>
        <Typography sx={{ fontSize: "0.625rem", color: "#f87171" }}>
          {changes.length} field{changes.length !== 1 ? "s" : ""} changed
        </Typography>
      </Box>
      <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 0.5 }}>
        {changes.map((change, j) => (
          <Box
            key={j}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
              fontSize: "0.75rem",
              fontFamily: "monospace",
              bgcolor: "white",
              borderRadius: 0.5,
              px: 1,
              py: 0.5,
              border: "1px solid #fecaca",
            }}
          >
            <Box component="span" sx={{ fontWeight: 700, color: "#dc2626", minWidth: 100 }}>
              {change.field}
            </Box>
            <Box component="span" sx={{ color: "#94a3b8" }}>
              :
            </Box>
            <Box component="span" sx={{ color: "#64748b", textDecoration: "line-through" }}>
              {JSON.stringify(change.before)}
            </Box>
            <Box component="span" sx={{ color: "#94a3b8" }}>
              →
            </Box>
            <Box component="span" sx={{ color: "#dc2626", fontWeight: 500 }}>
              {JSON.stringify(change.after)}
            </Box>
          </Box>
        ))}
        {changes.length === 0 && extraRow.rowType === "added" && (
          <Typography variant="caption" sx={{ color: "#64748b", fontStyle: "italic" }}>
            New row added
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const MismatchCard = ({ mismatch }) => {
  const getHeaderLabel = (type, subType) => {
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

  const getRowTypeLabel = (rowType) => {
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
      return `${
        mismatch.subType === "modified" ? "Modified" : "Added"
      } Rows Summary (${mismatch.extraRows?.length || 0}):`;
    }
    if (mismatch.type === "unexpected_deletes") {
      return `Deleted Rows (${mismatch.extraRows?.length || 0}):`;
    }
    return `Unexpected Changes (${mismatch.extraRows?.length || 0}):`;
  };

  const showCompactView = mismatch.type === "count_mismatch";

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.3)" : "#fecaca"),
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
        boxShadow: 1,
      }}
    >
      <Box
        sx={{
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.1)" : "#fef2f2"),
          px: 1.5,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, color: "error.dark" }}>
          {mismatch.table} - {getHeaderLabel(mismatch.type, mismatch.subType)}
        </Typography>
        <Chip
          label="FAILED"
          size="small"
          sx={{
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.3)" : "#fecaca"),
            color: "error.dark",
            fontSize: "0.75rem",
            fontWeight: 500,
            height: 20,
          }}
        />
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Typography variant="body2" sx={{ color: "error.main" }}>
          {mismatch.reason}
        </Typography>
        {mismatch.description && (
          <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, mb: 1.5, display: "block" }}>
            {mismatch.description}
          </Typography>
        )}

        {mismatch.type === "count_mismatch" && mismatch.expectedCount !== undefined && (
          <Box
            sx={{
              mt: 1,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              fontSize: "0.75rem",
            }}
          >
            <Box component="span" sx={{ color: "error.main" }}>
              ✗
            </Box>
            <Box component="span" sx={{ color: "text.secondary" }}>
              Expected:{" "}
              <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                {mismatch.expectedCount}
              </Box>
            </Box>
            <Box component="span" sx={{ color: "text.disabled" }}>
              |
            </Box>
            <Box component="span" sx={{ color: "text.secondary" }}>
              Actual:{" "}
              <Box component="span" sx={{ fontWeight: 700, color: "error.main" }}>
                {mismatch.actualCount}
              </Box>
            </Box>
          </Box>
        )}

        {(mismatch.evaluatedAssertions || mismatch.assertions) && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              mt: 1.5,
              pt: 1.5,
              borderTop: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.3)" : "#fecaca"),
            }}
          >
            <Typography
              sx={{
                fontSize: "0.625rem",
                fontWeight: 700,
                color: "error.light",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                mb: 0.5,
              }}
            >
              Expected Conditions:
            </Typography>
            {(mismatch.evaluatedAssertions || mismatch.assertions)?.map((a, j) => {
              const isPassed = "passed" in a ? a.passed : false;
              const hasActual = "actual" in a;
              const actualValue = hasActual ? a.actual : undefined;

              return (
                <Box
                  key={j}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    fontSize: "0.75rem",
                    flexWrap: "wrap",
                  }}
                >
                  <Box component="span" sx={{ color: isPassed ? "success.main" : "error.light" }}>
                    {isPassed ? "✓" : "✗"}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      color: "text.primary",
                    }}
                  >
                    {a.field}
                  </Box>
                  <Box component="span" sx={{ color: "text.disabled" }}>
                    |
                  </Box>
                  <Box component="span" sx={{ color: "text.secondary" }}>
                    {a.operator}
                  </Box>
                  <Box component="span" sx={{ color: "text.disabled" }}>
                    |
                  </Box>
                  <Box component="span" sx={{ color: "text.primary" }}>
                    Expected: {JSON.stringify(a.expected)}
                  </Box>
                  {hasActual && (
                    <>
                      <Box component="span" sx={{ color: "text.disabled" }}>
                        |
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          color: isPassed ? "success.main" : "error.main",
                          fontWeight: 500,
                        }}
                      >
                        Actual: {JSON.stringify(actualValue)}
                      </Box>
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {/* Closest Match Side-by-Side JSON Diff */}
        {mismatch.closestMatch && (
          <Box
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.3)" : "#fecaca"),
            }}
          >
            <Typography
              sx={{
                fontSize: "0.625rem",
                fontWeight: 700,
                color: "warning.main",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                mb: 1,
              }}
            >
              Closest Match Found:
            </Typography>
            <SyncScrollPane
              leftTitle="Expected (from assertions)"
              rightTitle="Actual (closest match)"
              leftContent={
                <JsonViewer
                  data={(mismatch.evaluatedAssertions || mismatch.assertions || []).reduce((acc, a) => {
                    acc[a.field] = a.expected;
                    return acc;
                  }, {})}
                  initialExpanded={true}
                />
              }
              rightContent={
                <JsonViewer
                  data={mismatch.closestMatch}
                  initialExpanded={true}
                  highlightPaths={(mismatch.evaluatedAssertions || []).reduce((acc, a) => {
                    if ("passed" in a && !a.passed) {
                      acc[`root.${a.field}`] = "error";
                    } else if ("passed" in a && a.passed) {
                      acc[`root.${a.field}`] = "changed";
                    }
                    return acc;
                  }, {})}
                />
              }
              compact={true}
            />
          </Box>
        )}

        {mismatch.extraRows && mismatch.extraRows.length > 0 && (
          <Box
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.3)" : "#fecaca"),
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.625rem",
                fontWeight: 700,
                color: "error.light",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {getSectionTitle()}
            </Typography>

            {showCompactView &&
              mismatch.extraRows.map((extraRow, idx) => (
                <ChangedFieldsSummary key={idx} extraRow={extraRow} idx={idx} />
              ))}

            {!showCompactView &&
              mismatch.extraRows.map((extraRow, idx) => {
                const highlightPaths =
                  extraRow.rowType === "modified" && extraRow.before
                    ? getDiffPaths(extraRow.before, extraRow.after, "root", "error")
                    : {};

                return (
                  <Box
                    key={idx}
                    sx={{
                      border: "1px solid",
                      borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.3)" : "#fecaca"),
                      borderRadius: 1,
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.1)" : "rgba(254, 242, 242, 0.3)",
                    }}
                  >
                    <Box
                      sx={{
                        px: 1,
                        py: 0.5,
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.2)" : "rgba(254, 226, 226, 0.5)",
                        borderBottom: "1px solid",
                        borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.3)" : "#fecaca"),
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 500, color: "error.main" }}>
                        {getRowTypeLabel(extraRow.rowType)} #{idx + 1}
                      </Typography>
                    </Box>
                    <Box sx={{ p: 1 }}>
                      {extraRow.rowType === "modified" && extraRow.before ? (
                        <SyncScrollPane
                          leftTitle="Before"
                          rightTitle="After"
                          leftContent={<JsonViewer data={extraRow.before} initialExpanded={true} />}
                          rightContent={
                            <JsonViewer data={extraRow.after} initialExpanded={true} highlightPaths={highlightPaths} />
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
                              highlightPaths={getDiffPaths({}, extraRow.row, "root", "error")}
                            />
                          }
                          rightContent={<JsonViewer data={{}} initialExpanded={true} />}
                          compact={true}
                        />
                      ) : (
                        <SyncScrollPane
                          leftTitle="Before"
                          rightTitle="After (New Row)"
                          leftContent={<JsonViewer data={{}} initialExpanded={true} />}
                          rightContent={
                            <JsonViewer
                              data={extraRow.row || extraRow.after}
                              initialExpanded={true}
                              highlightPaths={getDiffPaths({}, extraRow.row || extraRow.after, "root", "error")}
                            />
                          }
                          compact={true}
                        />
                      )}
                    </Box>
                  </Box>
                );
              })}
          </Box>
        )}
      </Box>
    </Box>
  );
};

const CountErrorCard = ({ error }) => {
  const getTypeLabel = (type) => {
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

  const getRowLabel = (row) => {
    return row.summary || row.name || row.title || `Row #${row.id}`;
  };

  const getRowTypeIcon = (rowType) => {
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

  const getRowTypeColor = (rowType) => {
    switch (rowType) {
      case "added":
        return {
          color: "success.dark",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.2)" : "#f0fdf4"),
        };
      case "modified":
        return {
          color: "warning.dark",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.2)" : "#fffbeb"),
        };
      case "deleted":
        return {
          color: "error.dark",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.2)" : "#fef2f2"),
        };
      default:
        return {
          color: "text.secondary",
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "#f8fafc"),
        };
    }
  };

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.3)" : "#fde68a"),
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
        boxShadow: 1,
      }}
    >
      <Box
        sx={{
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.1)" : "#fffbeb"),
          px: 1.5,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, color: "warning.dark" }}>
          {error.table} - {getTypeLabel(error.type)}
        </Typography>
        <Chip
          label="COUNT ERROR"
          size="small"
          sx={{
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.3)" : "#fde68a"),
            color: "warning.dark",
            fontSize: "0.75rem",
            fontWeight: 500,
            height: 20,
          }}
        />
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Typography variant="body2" sx={{ color: "warning.main" }}>
          {error.message}
        </Typography>
        <Box
          sx={{
            mt: 1,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            fontSize: "0.75rem",
          }}
        >
          <Box component="span" sx={{ color: "warning.main" }}>
            ⚠
          </Box>
          {error.expected !== undefined && (
            <>
              <Box component="span" sx={{ color: "text.secondary" }}>
                Expected:{" "}
                <Box component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
                  {error.expected}
                </Box>
              </Box>
              <Box component="span" sx={{ color: "text.disabled" }}>
                |
              </Box>
            </>
          )}
          <Box component="span" sx={{ color: "text.secondary" }}>
            Actual:{" "}
            <Box component="span" sx={{ fontWeight: 700, color: "warning.main" }}>
              {error.actual}
            </Box>
          </Box>
        </Box>

        {error.rows && error.rows.length > 0 && (
          <Box
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.3)" : "#fde68a"),
            }}
          >
            <Typography
              sx={{
                fontSize: "0.625rem",
                fontWeight: 700,
                color: "warning.main",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                mb: 1,
              }}
            >
              Affected Rows:
            </Typography>
            <Box
              component="ul"
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.75,
                m: 0,
                p: 0,
                listStyle: "none",
              }}
            >
              {error.rows.map((row, idx) => {
                const typeColors = getRowTypeColor(row.rowType);
                return (
                  <Box
                    component="li"
                    key={idx}
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1,
                      fontSize: "0.75rem",
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.1)" : "rgba(255, 251, 235, 0.5)",
                      borderRadius: 0.5,
                      px: 1,
                      py: 0.75,
                      border: "1px solid",
                      borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.3)" : "#fde68a"),
                    }}
                  >
                    <Box
                      sx={{
                        fontFamily: "monospace",
                        fontWeight: 700,
                        width: 20,
                        height: 20,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 0.5,
                        fontSize: "0.75rem",
                        color: typeColors.color,
                        bgcolor: typeColors.bgcolor,
                      }}
                    >
                      {getRowTypeIcon(row.rowType)}
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        {row.id && (
                          <Box
                            component="span"
                            sx={{
                              fontFamily: "monospace",
                              color: "text.disabled",
                            }}
                          >
                            #{row.id}
                          </Box>
                        )}
                        <Box
                          component="span"
                          sx={{
                            fontWeight: 500,
                            color: "text.primary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {getRowLabel(row)}
                        </Box>
                      </Box>
                      {row.changedFields && row.changedFields.length > 0 && (
                        <Box
                          sx={{
                            mt: 0.5,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.5,
                          }}
                        >
                          <Box
                            component="span"
                            sx={{
                              fontSize: "0.625rem",
                              color: "text.disabled",
                            }}
                          >
                            Changed:
                          </Box>
                          {row.changedFields.map((field, fieldIdx) => (
                            <Box
                              key={fieldIdx}
                              component="span"
                              sx={{
                                fontSize: "0.625rem",
                                fontFamily: "monospace",
                                bgcolor: (theme) =>
                                  theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.2)" : "#fef3c7",
                                color: "warning.dark",
                                px: 0.75,
                                py: 0.25,
                                borderRadius: 0.5,
                              }}
                            >
                              {field}
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const UnexpectedChangeCard = ({ change }) => {
  const getTypeLabel = (type) => {
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

  const isModifiedRow = change.type === "extra_modified" || change.type === "unexpected_table_modified";
  const beforeData = isModifiedRow ? change.row?.before : null;
  const afterData = isModifiedRow ? change.row?.after || change.row : null;

  const highlightPaths =
    isModifiedRow && beforeData
      ? getDiffPaths(beforeData, afterData, "root", "error")
      : getDiffPaths({}, change.row, "root", "error");

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.3)" : "#fed7aa"),
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
        boxShadow: 1,
      }}
    >
      <Box
        sx={{
          bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.1)" : "#fff7ed"),
          px: 1.5,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 700, color: "warning.dark" }}>
          {change.table} - {getTypeLabel(change.type)}
        </Typography>
        <Chip
          label="UNEXPECTED"
          size="small"
          sx={{
            bgcolor: (theme) => (theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.3)" : "#fed7aa"),
            color: "warning.dark",
            fontSize: "0.75rem",
            fontWeight: 500,
            height: 20,
          }}
        />
      </Box>
      <Box sx={{ p: 1.5 }}>
        <Typography variant="body2" sx={{ color: "warning.main", mb: 1.5 }}>
          {change.reason}
        </Typography>

        {isModifiedRow && beforeData ? (
          <SyncScrollPane
            leftTitle="Before"
            rightTitle="After"
            leftContent={<JsonViewer data={beforeData} initialExpanded={true} />}
            rightContent={<JsonViewer data={afterData} initialExpanded={true} highlightPaths={highlightPaths} />}
            compact={true}
          />
        ) : (
          <Box
            sx={{
              border: "1px solid",
              borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.3)" : "#fed7aa"),
              borderRadius: 1,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.1)" : "rgba(255, 247, 237, 0.3)",
            }}
          >
            <Box
              sx={{
                px: 1,
                py: 0.5,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.2)" : "rgba(254, 215, 170, 0.5)",
                borderBottom: "1px solid",
                borderColor: (theme) => (theme.palette.mode === "dark" ? "rgba(217, 119, 6, 0.3)" : "#fed7aa"),
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 500, color: "warning.main" }}>
                Row Data
              </Typography>
            </Box>
            <Box
              sx={{
                p: 1,
                bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1e293b" : "#0f172a"),
                maxHeight: 200,
                overflow: "auto",
              }}
            >
              <JsonViewer data={change.row} initialExpanded={true} highlightPaths={highlightPaths} />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};
