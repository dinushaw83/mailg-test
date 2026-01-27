/* eslint-disable */

/**
 * @typedef {Object} VerifierTask
 * @property {string} id
 * @property {string} prompt
 * @property {any} [db_verification_config]
 */

/**
 * @typedef {Object} VerifierResult
 * @property {string} id
 * @property {"running" | "success" | "error"} status
 * @property {string} message
 * @property {string} timestamp
 * @property {number} [executionTime]
 * @property {string} [error]
 * @property {any} [diff]
 * @property {AssertionResults} [assertionResults]
 */

/**
 * @typedef {Object} AssertionResults
 * @property {boolean} passed
 * @property {MatchResult[]} matches
 * @property {MismatchResult[]} mismatches
 * @property {CountError[]} countErrors
 * @property {UnexpectedChange[]} unexpected
 */

/**
 * @typedef {Object} CountErrorRow
 * @property {string|number} [id]
 * @property {string} [summary]
 * @property {string} [name]
 * @property {string} [title]
 * @property {string[]} [changedFields]
 * @property {"added" | "modified" | "deleted"} rowType
 */

/**
 * @typedef {Object} CountError
 * @property {string} table
 * @property {"unexpected_deletes" | "added_count_mismatch" | "modified_count_mismatch"} type
 * @property {string} message
 * @property {number} [expected]
 * @property {number} actual
 * @property {CountErrorRow[]} [rows]
 */

/**
 * @typedef {Object} UnexpectedChange
 * @property {string} table
 * @property {"extra_added" | "extra_modified" | "unexpected_table_added" | "unexpected_table_modified" | "unexpected_table_deleted"} type
 * @property {any} row
 * @property {string} reason
 */

/**
 * @typedef {Object} MatchResult
 * @property {string} table
 * @property {string} type
 * @property {string} description
 * @property {AssertionDetail[]} assertions
 * @property {any} actual
 * @property {any} [before]
 * @property {any} [changes]
 */

/**
 * @typedef {Object} MismatchResult
 * @property {string} table
 * @property {string} type
 * @property {"added" | "modified"} [subType]
 * @property {string} [description]
 * @property {string} reason
 * @property {FieldAssertion[]} [assertions]
 * @property {ExtraRowData[]} [extraRows]
 * @property {number} [expectedCount]
 * @property {number} [actualCount]
 */

/**
 * @typedef {Object} ExtraRowData
 * @property {any} [before]
 * @property {any} [after]
 * @property {any} [row]
 * @property {"added" | "modified" | "deleted"} rowType
 */

/**
 * @typedef {Object} AssertionDetail
 * @property {string} field
 * @property {string} operator
 * @property {any} expected
 * @property {any} actual
 * @property {boolean} passed
 * @property {string} [error]
 */

/**
 * @typedef {Object} FieldAssertion
 * @property {string} field
 * @property {string} operator
 * @property {any} expected
 * @property {string} [array_key]
 */

export {};
