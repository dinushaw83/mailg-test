/* eslint-disable @typescript-eslint/no-explicit-any */

export interface VerifierTask {
  id: string;
  prompt: string;
  db_verification_config?: any;
}

export interface VerifierResult {
  id: string;
  status: "running" | "success" | "error";
  message: string;
  timestamp: string;
  executionTime?: number;
  error?: string;
  diff?: any;
  assertionResults?: AssertionResults | null;
}

export interface AssertionResults {
  passed: boolean;
  matches: MatchResult[];
  mismatches: MismatchResult[];
  countErrors: CountError[];
  unexpected: UnexpectedChange[];
}

export interface CountErrorRow {
  id?: string | number;
  summary?: string;
  name?: string;
  title?: string;
  changedFields?: string[];
  rowType: "added" | "modified" | "deleted";
}

export interface CountError {
  table: string;
  type:
    | "unexpected_deletes"
    | "added_count_mismatch"
    | "modified_count_mismatch";
  message: string;
  expected?: number;
  actual: number;
  rows?: CountErrorRow[];
}

export interface UnexpectedChange {
  table: string;
  type:
    | "extra_added"
    | "extra_modified"
    | "unexpected_table_added"
    | "unexpected_table_modified"
    | "unexpected_table_deleted";
  row: any;
  reason: string;
}

export interface MatchResult {
  table: string;
  type: string;
  description: string;
  assertions: AssertionDetail[];
  actual: any;
  before?: any;
  changes?: any;
}

export interface MismatchResult {
  table: string;
  type: string;
  subType?: "added" | "modified";
  description?: string;
  reason: string;
  assertions?: FieldAssertion[];
  extraRows?: ExtraRowData[];
  expectedCount?: number;
  actualCount?: number;
}

export interface ExtraRowData {
  before?: any;
  after?: any;
  row?: any;
  rowType: "added" | "modified" | "deleted";
}

export interface AssertionDetail {
  field: string;
  operator: string;
  expected: any;
  actual: any;
  passed: boolean;
  error?: string;
}

export interface FieldAssertion {
  field: string;
  operator: string;
  expected: any;
  array_key?: string;
}
