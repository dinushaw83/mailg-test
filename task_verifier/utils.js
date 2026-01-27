/* eslint-disable */

import {
  ASSERTION_OPERATORS,
  IGNORED_DYNAMIC_FIELDS,
  TABLE_NAME_MAP,
  FIELD_NAME_MAP,
  PLAIN_TEXT_FIELD_MAP,
} from "./constants";

export const stripHtmlTags = (html) => {
  if (!html || typeof html !== "string") return html || "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .trim();
};

export const evaluateFieldAssertions = (actualRow, fieldAssertions) => {
  const results = [];
  let allPassed = true;

  for (const assertion of fieldAssertions) {
    const { field, operator, expected, array_key } = assertion;

    // Map field name if needed (handle schema differences)
    const actualFieldName = FIELD_NAME_MAP[field] || field;
    const fieldParts = actualFieldName.split(".");
    let actualValue = actualRow;

    for (let i = 0; i < fieldParts.length; i++) {
      actualValue = actualValue?.[fieldParts[i]];
    }

    // Get actual value, preferring plain text version for content fields
    const plainFieldName = PLAIN_TEXT_FIELD_MAP[actualFieldName];
    if (plainFieldName && actualRow[plainFieldName] != null) {
      actualValue = actualRow[plainFieldName];
    }

    const operatorFn = ASSERTION_OPERATORS[operator];
    if (!operatorFn) {
      results.push({
        field,
        operator,
        expected,
        actual: actualValue,
        passed: false,
        error: `Unknown operator: ${operator}`,
      });
      allPassed = false;
      continue;
    }

    const passed = operatorFn(actualValue, expected, array_key);
    results.push({ field, operator, expected, actual: actualValue, passed });
    if (!passed) allPassed = false;
  }

  return { allPassed, results };
};

export const findMatchingRow = (
  actualRows,
  fieldAssertions,
  matchedIndices = new Set()
) => {
  for (let i = 0; i < actualRows.length; i++) {
    if (matchedIndices.has(i)) continue;
    const { allPassed, results } = evaluateFieldAssertions(
      actualRows[i],
      fieldAssertions
    );
    if (allPassed) return { index: i, row: actualRows[i], results };
  }
  return null;
};

/**
 * Helper to check if a modification only affects dynamic timestamp fields.
 * Used to filter out timestamp-only changes from count validations.
 */
const hasOnlyTimestampChanges = (mod) => {
  const changes = mod.changes || {};
  const changedFields = Object.keys(changes);
  const significantChanges = changedFields.filter(
    (key) => !IGNORED_DYNAMIC_FIELDS.includes(key)
  );
  return significantChanges.length === 0;
};

export const compareResults = (config, actual) => {
  const mismatches = [];
  const matches = [];
  const countErrors = [];
  const unexpected = [];

  // Get config options
  const tablesConfig = config.tables || {};
  const ignoreTables = config.ignore_tables || [];
  const allowUnexpectedChanges = config.allow_unexpected_changes ?? false;

  const actualChanges = actual?.changes_by_table || {};
  const matchedActualRows = {};

  const markMatched = (tableName, type, idx) => {
    const key = `${tableName}:${type}`;
    if (!matchedActualRows[key]) matchedActualRows[key] = new Set();
    matchedActualRows[key].add(idx);
  };

  const isMatched = (tableName, type, idx) => {
    const key = `${tableName}:${type}`;
    return matchedActualRows[key]?.has(idx) || false;
  };

  const shouldIgnoreTable = (tableName) => {
    return ignoreTables.includes(tableName);
  };

  // STEP 1: Check all expected changes are present
  for (const [tableName, tableConfig] of Object.entries(tablesConfig)) {
    if (shouldIgnoreTable(tableName)) continue;

    // Map expected table name to actual table name (handles schema differences)
    const actualTableName = TABLE_NAME_MAP[tableName] || tableName;
    const actualTable = actualChanges[actualTableName] || {
      added: [],
      modified: [],
      deleted: [],
    };

    // Check expect_added
    if (tableConfig.expect_added) {
      for (const expectation of tableConfig.expect_added) {
        const found = findMatchingRow(
          actualTable.added,
          expectation.field_assertions,
          matchedActualRows[`${tableName}:added`]
        );
        if (found) {
          markMatched(tableName, "added", found.index);
          matches.push({
            table: tableName,
            type: "added",
            description: expectation.description,
            assertions: found.results,
            actual: found.row,
          });
        } else {
          mismatches.push({
            table: tableName,
            type: "missing_added",
            description: expectation.description,
            reason: "Expected added row not found",
            assertions: expectation.field_assertions,
          });
        }
      }
    }

    // Check expect_modified
    if (tableConfig.expect_modified) {
      for (const expectation of tableConfig.expect_modified) {
        const actualRows = actualTable.modified.map((m) => m.after || m);
        const found = findMatchingRow(
          actualRows,
          expectation.field_assertions,
          matchedActualRows[`${tableName}:modified`]
        );
        if (found) {
          markMatched(tableName, "modified", found.index);
          const fullMod = actualTable.modified[found.index];
          matches.push({
            table: tableName,
            type: "modified",
            description: expectation.description,
            assertions: found.results,
            actual: found.row,
            before: fullMod?.before,
            changes: fullMod?.changes,
          });
        } else {
          mismatches.push({
            table: tableName,
            type: "missing_modified",
            description: expectation.description,
            reason: "Expected modified row not found",
            assertions: expectation.field_assertions,
          });
        }
      }
    }

    // Check expect_deleted
    if (tableConfig.expect_deleted) {
      for (const expectation of tableConfig.expect_deleted) {
        const found = findMatchingRow(
          actualTable.deleted,
          expectation.field_assertions,
          matchedActualRows[`${tableName}:deleted`]
        );
        if (found) {
          markMatched(tableName, "deleted", found.index);
          matches.push({
            table: tableName,
            type: "deleted",
            description: expectation.description,
            assertions: found.results,
            actual: found.row,
          });
        } else {
          mismatches.push({
            table: tableName,
            type: "missing_deleted",
            description: expectation.description,
            reason: "Expected deleted row not found",
            assertions: expectation.field_assertions,
          });
        }
      }
    }

    // Validate expect_no_deletes
    if (tableConfig.expect_no_deletes === true) {
      const actualDeleted = actualTable.deleted || [];
      if (actualDeleted.length > 0) {
        countErrors.push({
          table: tableName,
          type: "unexpected_deletes",
          message: `Expected no deletions but found ${actualDeleted.length} deleted row(s)`,
          actual: actualDeleted.length,
          rows: actualDeleted.map((row) => ({
            id: row.id || row.primary_key?.id,
            summary: row.summary,
            name: row.name,
            title: row.title,
            rowType: "deleted",
          })),
        });
      }
    }

    // Validate expect_exact_added_count
    if (tableConfig.expect_exact_added_count !== undefined) {
      const actualAdded = actualTable.added || [];
      if (actualAdded.length !== tableConfig.expect_exact_added_count) {
        countErrors.push({
          table: tableName,
          type: "added_count_mismatch",
          message: `Expected exactly ${tableConfig.expect_exact_added_count} added row(s) but found ${actualAdded.length}`,
          expected: tableConfig.expect_exact_added_count,
          actual: actualAdded.length,
          rows: actualAdded.map((row) => ({
            id: row.id || row.primary_key?.id,
            summary: row.summary,
            name: row.name,
            title: row.title,
            rowType: "added",
          })),
        });
      }
    }

    // Validate expect_exact_modified_count
    // Filter out modifications that only affect dynamic timestamp fields
    if (tableConfig.expect_exact_modified_count !== undefined) {
      const actualModified = actualTable.modified || [];
      // Only count modifications with significant (non-timestamp) changes
      const significantModifications = actualModified.filter(
        (mod) => !hasOnlyTimestampChanges(mod)
      );
      if (
        significantModifications.length !==
        tableConfig.expect_exact_modified_count
      ) {
        countErrors.push({
          table: tableName,
          type: "modified_count_mismatch",
          message: `Expected exactly ${tableConfig.expect_exact_modified_count} modified row(s) but found ${significantModifications.length}`,
          expected: tableConfig.expect_exact_modified_count,
          actual: significantModifications.length,
          rows: significantModifications.map((mod) => ({
            id: mod.after?.id || mod.before?.id || mod.primary_key?.id,
            summary: mod.after?.summary || mod.before?.summary,
            name: mod.after?.name || mod.before?.name,
            title: mod.after?.title || mod.before?.title,
            changedFields: Object.keys(mod.changes || {}).filter(
              (key) => !IGNORED_DYNAMIC_FIELDS.includes(key)
            ),
            rowType: "modified",
          })),
        });
      }
    }

    // Check fail_on_extra_rows - flag unmatched rows as failures
    if (tableConfig.fail_on_extra_rows === true) {
      const actualAdded = actualTable.added || [];
      for (let i = 0; i < actualAdded.length; i++) {
        if (!isMatched(tableName, "added", i)) {
          unexpected.push({
            table: tableName,
            type: "extra_added",
            row: actualAdded[i],
            reason:
              "Extra row added beyond expected (fail_on_extra_rows is true)",
          });
        }
      }

      const actualModified = actualTable.modified || [];
      for (let i = 0; i < actualModified.length; i++) {
        if (!isMatched(tableName, "modified", i)) {
          // Skip if modification only affects ignored dynamic fields
          if (hasOnlyTimestampChanges(actualModified[i])) continue;

          unexpected.push({
            table: tableName,
            type: "extra_modified",
            row: actualModified[i],
            reason:
              "Extra row modified beyond expected (fail_on_extra_rows is true)",
          });
        }
      }
    }

    // Check for duplicate content
    if (tableConfig.detect_content_duplicates && actualTable.added.length > 1) {
      const seen = new Set();
      const duplicates = new Set();
      actualTable.added.forEach((row) => {
        const str = JSON.stringify(row);
        if (seen.has(str)) duplicates.add(str);
        seen.add(str);
      });

      if (duplicates.size > 0) {
        mismatches.push({
          table: tableName,
          type: "duplicate_content",
          reason: `Found ${duplicates.size} sets of duplicate added rows`,
        });
      }
    }
  }

  // STEP 2: Detect unexpected changes in tables not in config
  if (!allowUnexpectedChanges) {
    for (const [tableName, actualTable] of Object.entries(actualChanges)) {
      // Skip ignored tables
      if (shouldIgnoreTable(tableName)) continue;

      // Map actual table name back to expected table name for lookup
      const expectedTableName =
        Object.keys(TABLE_NAME_MAP).find(
          (k) => TABLE_NAME_MAP[k] === tableName
        ) || tableName;

      // Check if this table is in the config
      const isInConfig =
        tablesConfig[expectedTableName] || tablesConfig[tableName];
      if (isInConfig) continue; // Already handled above

      // Flag any changes in unexpected tables
      const actualAdded = actualTable.added || [];
      for (const row of actualAdded) {
        unexpected.push({
          table: tableName,
          type: "unexpected_table_added",
          row,
          reason: `Unexpected changes in table '${tableName}' (not in verification config)`,
        });
      }

      const actualModified = actualTable.modified || [];
      for (const mod of actualModified) {
        // Skip timestamp-only changes
        if (hasOnlyTimestampChanges(mod)) continue;

        unexpected.push({
          table: tableName,
          type: "unexpected_table_modified",
          row: mod,
          reason: `Unexpected changes in table '${tableName}' (not in verification config)`,
        });
      }

      const actualDeleted = actualTable.deleted || [];
      for (const row of actualDeleted) {
        unexpected.push({
          table: tableName,
          type: "unexpected_table_deleted",
          row,
          reason: `Unexpected changes in table '${tableName}' (not in verification config)`,
        });
      }
    }
  }

  // Determine overall pass/fail
  const hasMatches = matches.length > 0;
  const hasMismatches = mismatches.length > 0;
  const hasUnexpected = unexpected.length > 0;
  const hasCountErrors = countErrors.length > 0;

  const passed =
    hasMatches && !hasMismatches && !hasUnexpected && !hasCountErrors;

  return {
    passed,
    mismatches,
    matches,
    countErrors,
    unexpected,
  };
};
