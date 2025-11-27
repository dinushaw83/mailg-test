import { resolvePath } from './utils/path-resolver.js';
import { assertionOperators, RDT_OPERATORS } from './utils/assertion-operators.js';
import { JSONPath } from 'jsonpath-plus';

export class AssertionEngine {
  async execute(assertion, localStorage, modelResponse) {
    try {
      switch (assertion.operator) {
        case 'JSON_MATCH':
          return this.executeJsonMatch(assertion, localStorage);
        case 'EXISTS':
          return this.executeExists(assertion, localStorage);
        case 'NOT_EXISTS':
          return this.executeNotExists(assertion, localStorage);
        case 'STRING_MATCH':
          return this.executeStringMatch(assertion, localStorage);
        case 'STRING_CONTAINS':
          return this.executeStringContains(assertion, localStorage);
        case 'COMPARE':
          return this.executeCompare(assertion, localStorage);
        case 'ARRAY_CONTAINS':
          return this.executeArrayContains(assertion, localStorage);
        case 'ARRAY_LENGTH':
          return this.executeArrayLength(assertion, localStorage);
        case 'DATETIME_IN_RANGE':
          return this.executeDatetimeInRange(assertion, localStorage);
        case 'DATETIME_DIFFERENCE':
          return this.executeDatetimeDifference(assertion, localStorage);
        case 'FACTUAL_VERIFICATION':
          return await this.executeFactualVerification(assertion, localStorage, modelResponse);
        case 'REASONING_QUALITY':
          return await this.executeReasoningQuality(assertion, localStorage, modelResponse);
        case 'INFORMATION_PRECISION':
          return await this.executeInformationPrecision(assertion, localStorage, modelResponse);
        case 'FIELDS_UNCHANGED':
          return this.executeFieldsUnchanged(assertion, localStorage);
        default:
          return {
            actual: null,
            result: 'error',
            error: `Unknown operator: ${assertion.operator}`
          };
      }
    } catch (error) {
      return {
        actual: null,
        result: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getValue(path, data) {
    if (!path) return null;
    
    // If path contains JSONPath filter expressions, use jsonpath-plus directly
    if (path.includes('[?(@.') || path.includes('[?(')) {
      try {
        const result = JSONPath({ path: `$.${path}`, json: data });
        return result && result.length > 0 ? result[0] : null;
      } catch (e) {
        console.error('JSONPath error:', e);
        return null;
      }
    }
    
    // Otherwise use resolvePath from path-resolver which handles simple paths
    return resolvePath(data, path);
  }

  isJsonString(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  }

  resolveDynamicDate(expression) {
    const base = new Date();
    
    // Handle $NOW and $TODAY
    if (expression === '$NOW') {
      return base.toISOString();
    }
    
    if (expression === '$TODAY') {
      const today = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      return today.toISOString();
    }
    
    // Handle expressions like "$NOW + 5 days", "$TODAY - 2 hours", etc.
    let baseDate;
    let cleanExpression;
    
    if (expression.startsWith('$NOW')) {
      baseDate = base;
      cleanExpression = expression.replace(/^\$NOW\s*/, '').trim();
    } else if (expression.startsWith('$TODAY')) {
      baseDate = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      cleanExpression = expression.replace(/^\$TODAY\s*/, '').trim();
    } else {
      return null;
    }
    
    // If no expression after $NOW/$TODAY, return base date
    if (!cleanExpression) {
      return baseDate.toISOString();
    }
    
    // Parse expressions like "+ 5 days", "- 2 hours", "+ 1 week", etc.
    const match = cleanExpression.match(/^([+-])\s*(\d+)\s*(day|days|hour|hours|minute|minutes|second|seconds|week|weeks|month|months|year|years)s?$/i);
    
    if (!match) {
      return null; // Invalid expression format
    }
    
    const [, operator, amountStr, unit] = match;
    const amount = parseInt(amountStr, 10);
    const multiplier = operator === '+' ? 1 : -1;
    const finalAmount = amount * multiplier;
    
    const result = new Date(baseDate);
    
    switch (unit.toLowerCase()) {
      case 'second':
      case 'seconds':
        result.setSeconds(result.getSeconds() + finalAmount);
        break;
      case 'minute':
      case 'minutes':
        result.setMinutes(result.getMinutes() + finalAmount);
        break;
      case 'hour':
      case 'hours':
        result.setHours(result.getHours() + finalAmount);
        break;
      case 'day':
      case 'days':
        result.setDate(result.getDate() + finalAmount);
        break;
      case 'week':
      case 'weeks':
        result.setDate(result.getDate() + (finalAmount * 7));
        break;
      case 'month':
      case 'months':
        result.setMonth(result.getMonth() + finalAmount);
        break;
      case 'year':
      case 'years':
        result.setFullYear(result.getFullYear() + finalAmount);
        break;
      default:
        return null; // Unsupported unit
    }
    
    return result.toISOString();
  }

  executeJsonMatch(assertion, localStorage) {
    const actual = this.getValue(assertion.path, localStorage);
    const expected = assertion.expected || assertion.expectation;
    
    // Deep equality check
    const isMatch = JSON.stringify(actual) === JSON.stringify(expected);
    
    return {
      actual,
      result: isMatch ? 'match' : 'mismatch'
    };
  }

  executeExists(assertion, localStorage) {
    const actual = this.getValue(assertion.path, localStorage);
    const exists = actual !== null && actual !== undefined;
    
    return {
      actual,
      result: exists ? 'match' : 'mismatch'
    };
  }

  executeNotExists(assertion, localStorage) {
    const actual = this.getValue(assertion.path, localStorage);
    const notExists = actual === null || actual === undefined;
    
    return {
      actual,
      result: notExists ? 'match' : 'mismatch'
    };
  }

  executeStringMatch(assertion, localStorage) {
    const actual = this.getValue(assertion.path, localStorage);
    const expected = assertion.expectation || assertion.expected;
    
    if (typeof actual !== 'string') {
      return {
        actual,
        result: 'error',
        error: 'Expected string value'
      };
    }
    
    let actualStr = actual;
    let expectedStr = expected;
    
    const options = assertion.options || {};
    
    if (options.trim) {
      actualStr = actualStr.trim();
      expectedStr = expectedStr.trim();
    }
    
    if (options.caseInsensitive) {
      actualStr = actualStr.toLowerCase();
      expectedStr = expectedStr.toLowerCase();
    }
    
    if (options.normalizeWhitespace) {
      actualStr = actualStr.replace(/\s+/g, ' ');
      expectedStr = expectedStr.replace(/\s+/g, ' ');
    }
    
    const isMatch = actualStr === expectedStr;
    
    return {
      actual,
      result: isMatch ? 'match' : 'mismatch'
    };
  }

  executeStringContains(assertion, localStorage) {
    const actual = this.getValue(assertion.path, localStorage);
    const expected = assertion.expectation || assertion.expected;
    
    if (typeof actual !== 'string') {
      return {
        actual,
        result: 'error',
        error: 'Expected string value'
      };
    }
    
    let actualStr = actual;
    let expectedStr = expected;
    
    const options = assertion.options || {};
    
    if (options.caseInsensitive) {
      actualStr = actualStr.toLowerCase();
      expectedStr = expectedStr.toLowerCase();
    }
    
    const contains = actualStr.includes(expectedStr);
    
    return {
      actual,
      result: contains ? 'match' : 'mismatch'
    };
  }

  executeCompare(assertion, localStorage) {
    const actual = this.getValue(assertion.path, localStorage);
    let expected = assertion.expectation || assertion.expected;
    const options = assertion.options || {};
    
    if (!options.op || !options.type) {
      return {
        actual,
        result: 'error',
        error: 'Missing required options: op and type'
      };
    }
    
    // Handle dynamic date expressions for datetime type
    if (options.type === 'datetime' && typeof expected === 'string' && (expected.startsWith('$NOW') || expected.startsWith('$TODAY'))) {
      expected = this.resolveDynamicDate(expected);
      if (!expected) {
        return {
          actual,
          result: 'error',
          error: 'Invalid dynamic date expression'
        };
      }
    }
    
    let actualValue;
    let expectedValue;
    
    switch (options.type) {
      case 'number':
        actualValue = Number(actual);
        expectedValue = Number(expected);
        if (isNaN(actualValue) || isNaN(expectedValue)) {
          return {
            actual,
            result: 'error',
            error: 'Invalid number values'
          };
        }
        break;
        
      case 'string':
        actualValue = String(actual);
        expectedValue = String(expected);
        break;
        
      case 'boolean':
        actualValue = Boolean(actual);
        expectedValue = Boolean(expected);
        break;
        
      case 'datetime':
        // Parse dates for comparison
        const { input = 'iso', granularity = 'datetime' } = options;
        
        let actualDate, expectedDate;
        
        // Parse actual date
        if (input === 'iso') {
          actualDate = new Date(actual);
        } else if (input === 'epochMs') {
          actualDate = new Date(Number(actual));
        } else if (input === 'epochSec') {
          actualDate = new Date(Number(actual) * 1000);
        }
        
        // Parse expected date
        if (input === 'iso') {
          expectedDate = new Date(expected);
        } else if (input === 'epochMs') {
          expectedDate = new Date(Number(expected));
        } else if (input === 'epochSec') {
          expectedDate = new Date(Number(expected) * 1000);
        }
        
        if (!actualDate || !expectedDate || isNaN(actualDate.getTime()) || isNaN(expectedDate.getTime())) {
          return {
            actual,
            result: 'error',
            error: 'Invalid date values'
          };
        }
        
        // Apply granularity
        if (granularity === 'date') {
          actualDate = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
          expectedDate = new Date(expectedDate.getFullYear(), expectedDate.getMonth(), expectedDate.getDate());
        } else if (granularity === 'time') {
          actualDate = new Date(0, 0, 0, actualDate.getHours(), actualDate.getMinutes(), actualDate.getSeconds(), actualDate.getMilliseconds());
          expectedDate = new Date(0, 0, 0, expectedDate.getHours(), expectedDate.getMinutes(), expectedDate.getSeconds(), expectedDate.getMilliseconds());
        }
        
        actualValue = actualDate.getTime();
        expectedValue = expectedDate.getTime();
        break;
        
      default:
        return {
          actual,
          result: 'error',
          error: `Unsupported type: ${options.type}`
        };
    }
    
    let isMatch = false;
    
    switch (options.op) {
      case '==':
        isMatch = actualValue === expectedValue;
        break;
      case '!=':
        isMatch = actualValue !== expectedValue;
        break;
      case '>':
        isMatch = actualValue > expectedValue;
        break;
      case '>=':
        isMatch = actualValue >= expectedValue;
        break;
      case '<':
        isMatch = actualValue < expectedValue;
        break;
      case '<=':
        isMatch = actualValue <= expectedValue;
        break;
      default:
        return {
          actual,
          result: 'error',
          error: `Unsupported operator: ${options.op}`
        };
    }
    
    return {
      actual,
      result: isMatch ? 'match' : 'mismatch'
    };
  }

  executeArrayContains(assertion, localStorage) {
    const actual = this.getValue(assertion.path, localStorage);
    const expected = assertion.expectation || assertion.expected;
    const options = assertion.options || {};
    
    if (!Array.isArray(actual)) {
      // If actual is null/undefined, treat as empty array for comparison
      if (actual === null || actual === undefined) {
        return {
          actual: [],
          result: 'mismatch'
        };
      }
      return {
        actual,
        result: 'error',
        error: 'Expected array value'
      };
    }
    
    const mode = options.mode || 'some';
    const matchBy = options.matchBy || 'deep';
    const key = options.key;
    
    let isMatch = false;
    
    if (mode === 'some') {
      // At least one expected item is present
      if (Array.isArray(expected)) {
        isMatch = expected.some(expectedItem => 
          actual.some(actualItem => this.compareItems(actualItem, expectedItem, matchBy, key))
        );
      } else {
        isMatch = actual.some(actualItem => this.compareItems(actualItem, expected, matchBy, key));
      }
    } else if (mode === 'all') {
      // All expected items are present
      if (Array.isArray(expected)) {
        isMatch = expected.every(expectedItem => 
          actual.some(actualItem => this.compareItems(actualItem, expectedItem, matchBy, key))
        );
      } else {
        isMatch = actual.some(actualItem => this.compareItems(actualItem, expected, matchBy, key));
      }
    } else if (mode === 'exact') {
      // Array equals expected items
      if (Array.isArray(expected)) {
        if (options.orderSensitive) {
          isMatch = JSON.stringify(actual) === JSON.stringify(expected);
        } else {
          isMatch = actual.length === expected.length && 
                   expected.every(expectedItem => 
                     actual.some(actualItem => this.compareItems(actualItem, expectedItem, matchBy, key))
                   );
        }
      } else {
        isMatch = actual.length === 1 && this.compareItems(actual[0], expected, matchBy, key);
      }
    }
    
    return {
      actual,
      result: isMatch ? 'match' : 'mismatch'
    };
  }

  executeArrayLength(assertion, localStorage) {
    const actual = this.getValue(assertion.path, localStorage);
    const expected = assertion.expectation || assertion.expected;
    const options = assertion.options || {};
    
    if (!Array.isArray(actual)) {
      return {
        actual,
        result: 'error',
        error: 'Expected array value'
      };
    }
    
    const op = options.op || '==';
    const actualLength = actual.length;
    
    let isMatch = false;
    
    switch (op) {
      case '==':
        isMatch = actualLength === expected;
        break;
      case '>':
        isMatch = actualLength > expected;
        break;
      case '>=':
        isMatch = actualLength >= expected;
        break;
      case '<':
        isMatch = actualLength < expected;
        break;
      case '<=':
        isMatch = actualLength <= expected;
        break;
      default:
        return {
          actual,
          result: 'error',
          error: `Unsupported operator: ${op}`
        };
    }
    
    return {
      actual: actualLength,
      result: isMatch ? 'match' : 'mismatch'
    };
  }

  executeDatetimeInRange(assertion, localStorage) {
    // Use matchingOperators implementation
    const actual = this.getValue(assertion.path, localStorage);
    const expected = assertion.expectation || assertion.expected;
    const options = assertion.options || {};
    
    try {
      const isMatch = assertionOperators.DATETIME_IN_RANGE(actual, expected, options);
      return {
        actual,
        result: isMatch ? 'match' : 'mismatch'
      };
    } catch (error) {
      return {
        actual,
        result: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  executeDatetimeDifference(assertion, localStorage) {
    // Use matchingOperators implementation
    const actual = this.getValue(assertion.path, localStorage);
    const expected = assertion.expectation || assertion.expected;
    const options = assertion.options || {};
    
    try {
      const isMatch = assertionOperators.DATETIME_DIFFERENCE(actual, expected, options);
      return {
        actual,
        result: isMatch ? 'match' : 'mismatch'
      };
    } catch (error) {
      return {
        actual,
        result: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async executeFactualVerification(assertion, localStorage, modelResponse) {
    try {
      if (!assertion.description || !assertion.expected_facts) {
        return {
          actual: null,
          result: 'error',
          error: 'Missing required fields: description and expected_facts'
        };
      }

      const hasModelResponse = typeof modelResponse === 'string' && modelResponse.trim().length > 0;
      const fallbackActual = assertion.path ? this.getValue(assertion.path, localStorage) : null;
      const resolvedActual = hasModelResponse ? modelResponse : fallbackActual;

      if (
        resolvedActual === null ||
        resolvedActual === undefined ||
        (typeof resolvedActual === 'string' && resolvedActual.trim() === '')
      ) {
        return {
          actual: null,
          result: 'error',
          error: 'Model response is required for FACTUAL_VERIFICATION assertions'
        };
      }

      const actual = typeof resolvedActual === 'string' ? resolvedActual : JSON.stringify(resolvedActual);

      // Call the FACTUAL_VERIFICATION operator
      const result = await assertionOperators.FACTUAL_VERIFICATION(actual, {
        description: assertion.description,
        expected_facts: assertion.expected_facts
      });
      
      // Calculate weighted average based on fact weights and threshold
      let totalScore = 0;
      let totalWeight = 0;
      const factScores = result.fact_scores || {};
      
      assertion.expected_facts.forEach((expectedFact) => {
        // Find matching fact score by partial string matching
        const factKey = Object.keys(factScores).find(key => 
          key.toLowerCase().includes(expectedFact.fact.toLowerCase().substring(0, 15))
        );
        if (factKey && factScores[factKey]) {
          totalScore += factScores[factKey] * expectedFact.weight;
          totalWeight += expectedFact.weight;
        }
      });
      
      const weightedAverage = totalWeight > 0 ? totalScore / totalWeight : 0;
      const passThreshold = (assertion.pass_threshold_percent || 80) / 100 * 5; // Convert percentage to 1-5 scale
      
      return {
        actual: {
          modelResponse: actual,
          fact_scores: result.fact_scores || {}
        },
        result: weightedAverage >= passThreshold ? 'match' : 'mismatch',
        score: weightedAverage,
        details: {
          criteria: result.fact_scores || {},
          overall: weightedAverage,
          hard_rules_triggered: [],
          rationale: `Factual verification with weighted average score ${weightedAverage.toFixed(2)}/5`
        },
        error: result.error
      };
    } catch (error) {
      return {
        actual: null,
        result: 'error',
        error: error instanceof Error ? error.message : 'Unknown error in FACTUAL_VERIFICATION'
      };
    }
  }

  async executeReasoningQuality(assertion, localStorage, modelResponse) {
    try {
      if (!assertion.description || !assertion.aspects) {
        return {
          actual: null,
          result: 'error',
          error: 'Missing required fields: description and aspects'
        };
      }

      const hasModelResponse = typeof modelResponse === 'string' && modelResponse.trim().length > 0;
      const fallbackActual = assertion.path ? this.getValue(assertion.path, localStorage) : null;
      const resolvedActual = hasModelResponse ? modelResponse : fallbackActual;

      if (
        resolvedActual === null ||
        resolvedActual === undefined ||
        (typeof resolvedActual === 'string' && resolvedActual.trim() === '')
      ) {
        return {
          actual: null,
          result: 'error',
          error: 'Model response is required for REASONING_QUALITY assertions'
        };
      }

      const actual = typeof resolvedActual === 'string' ? resolvedActual : JSON.stringify(resolvedActual);

      // Call the REASONING_QUALITY operator
      const result = await assertionOperators.REASONING_QUALITY(actual, {
        description: assertion.description,
        aspects: assertion.aspects
      });
      
      // Calculate weighted average based on aspect weights
      const aspectScores = result.aspect_scores || {};
      const aspects = assertion.aspects || [];
      let totalScore = 0;
      let totalWeight = 0;
      
      aspects.forEach((aspect) => {
        const aspectKey = Object.keys(aspectScores).find(key => 
          key.toLowerCase().includes(aspect.aspect.toLowerCase().substring(0, 10))
        );
        if (aspectKey && aspectScores[aspectKey]) {
          totalScore += aspectScores[aspectKey] * aspect.weight;
          totalWeight += aspect.weight;
        }
      });
      
      const weightedAverage = totalWeight > 0 ? totalScore / totalWeight : 0;
      const passThreshold = (assertion.pass_threshold_percent || 80) / 100 * 5; // Convert percentage to 1-5 scale
      
      return {
        actual: {
          modelResponse: actual,
          aspect_scores: result.aspect_scores || {}
        },
        result: weightedAverage >= passThreshold ? 'match' : 'mismatch',
        score: weightedAverage,
        details: {
          criteria: result.aspect_scores || {},
          overall: weightedAverage,
          hard_rules_triggered: [],
          rationale: `Reasoning quality with weighted average score ${weightedAverage.toFixed(2)}/5`
        },
        error: result.error
      };
    } catch (error) {
      return {
        actual: null,
        result: 'error',
        error: error instanceof Error ? error.message : 'Unknown error in REASONING_QUALITY'
      };
    }
  }

  async executeInformationPrecision(assertion, localStorage, modelResponse) {
    try {
      if (!assertion.description || !assertion.expected_facts || !assertion.expected_reasonings) {
        return {
          actual: null,
          result: 'error',
          error: 'Missing required fields: description, expected_facts, and expected_reasonings'
        };
      }

      const hasModelResponse = typeof modelResponse === 'string' && modelResponse.trim().length > 0;
      const fallbackActual = assertion.path ? this.getValue(assertion.path, localStorage) : null;
      const resolvedActual = hasModelResponse ? modelResponse : fallbackActual;

      if (
        resolvedActual === null ||
        resolvedActual === undefined ||
        (typeof resolvedActual === 'string' && resolvedActual.trim() === '')
      ) {
        return {
          actual: null,
          result: 'error',
          error: 'Model response is required for INFORMATION_PRECISION assertions'
        };
      }

      const actual = typeof resolvedActual === 'string' ? resolvedActual : JSON.stringify(resolvedActual);

      // Call the INFORMATION_PRECISION operator
      const result = await assertionOperators.INFORMATION_PRECISION(actual, {
        description: assertion.description,
        expected_facts: assertion.expected_facts,
        expected_reasonings: assertion.expected_reasonings
      });
      
      // Calculate overall average from precision scores
      const scores = Object.values(result.precision_scores || {});
      const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const passThreshold = (assertion.pass_threshold_percent || 75) / 100 * 5; // Convert percentage to 1-5 scale
      
      return {
        actual: {
          modelResponse: actual,
          precision_scores: result.precision_scores || {}
        },
        result: averageScore >= passThreshold ? 'match' : 'mismatch',
        score: averageScore,
        details: {
          criteria: result.precision_scores || {},
          overall: averageScore,
          hard_rules_triggered: [],
          rationale: `Information precision with average score ${averageScore.toFixed(2)}/5`
        },
        error: result.error
      };
    } catch (error) {
      return {
        actual: null,
        result: 'error',
        error: error instanceof Error ? error.message : 'Unknown error in INFORMATION_PRECISION'
      };
    }
  }

  executeFieldsUnchanged(assertion, localStorage) {
    const actual = this.getValue(assertion.path, localStorage);
    const expected = assertion.expected || assertion.expectation;
    const options = assertion.options || {};
    
    // If actual is null/undefined but expected has properties, fail
    if (!actual || typeof actual !== 'object') {
      const hasExpectedFields = expected && typeof expected === 'object' && Object.keys(expected).length > 0;
      return {
        actual,
        result: hasExpectedFields ? 'mismatch' : 'match'
      };
    }

    // If expected is null/undefined, consider it as no fields to check (pass)
    if (!expected || typeof expected !== 'object') {
      return {
        actual,
        result: 'match'
      };
    }

    const strictComparison = options.strictComparison !== false; // Default to true
    const mismatchedFields = [];

    // Check each field in expected against actual
    for (const key in expected) {
      if (expected.hasOwnProperty(key)) {
        const actualValue = actual[key];
        const expectedValue = expected[key];

        // Special handling for null/undefined/empty expected values
        // If expected is null/undefined/empty and actual field doesn't exist or is also null/undefined/empty, consider it a match
        if (this.isNullishOrEmpty(expectedValue)) {
          // If actual field doesn't exist or is also null/undefined/empty, it's a match
          if (!actual.hasOwnProperty(key) || this.isNullishOrEmpty(actualValue)) {
            continue; // This field passes
          }
          // If actual field exists and has a non-empty value, it's a mismatch
          mismatchedFields.push(key);
          continue;
        }

        // For non-null expected values, do normal comparison
        let isMatch = false;
        if (strictComparison) {
          // For objects, do partial matching (only compare expected fields)
          if (typeof expectedValue === 'object' && expectedValue !== null && 
              typeof actualValue === 'object' && actualValue !== null &&
              !Array.isArray(expectedValue)) {
            const nestedMismatches = this.getNestedMismatches(actualValue, expectedValue, key);
            if (nestedMismatches.length > 0) {
              mismatchedFields.push(...nestedMismatches);
              isMatch = false;
            } else {
              isMatch = true;
            }
          } else {
            // Use JSON.stringify for deep comparison for non-objects
            isMatch = JSON.stringify(actualValue) === JSON.stringify(expectedValue);
          }
        } else {
          // Use loose equality
          isMatch = actualValue == expectedValue;
        }

        if (!isMatch && typeof expectedValue !== 'object') {
          mismatchedFields.push(key);
        }
      }
    }

    const isMatch = mismatchedFields.length === 0;

    // Create a filtered actual object containing only the fields we're checking
    const filteredActual = {};
    for (const key in expected) {
      if (expected.hasOwnProperty(key)) {
        // Only include the field if it exists in actual, or if it's a mismatch we want to show
        if (actual.hasOwnProperty(key)) {
          const expectedValue = expected[key];
          const actualValue = actual[key];
          
          // For nested objects, filter to show only the expected fields
          if (typeof expectedValue === 'object' && expectedValue !== null && 
              typeof actualValue === 'object' && actualValue !== null &&
              !Array.isArray(expectedValue)) {
            filteredActual[key] = this.filterNestedObject(actualValue, expectedValue);
          } else {
            filteredActual[key] = actualValue;
          }
        } else if (mismatchedFields.includes(key)) {
          // Show undefined for missing fields that are mismatches
          filteredActual[key] = undefined;
        } else {
          // For fields that pass (missing but expected to be null/empty), show the expected value
          filteredActual[key] = expected[key];
        }
      }
    }

    return {
      actual: filteredActual, // Only show the checked fields
      result: isMatch ? 'match' : 'mismatch',
      error: isMatch ? undefined : `Fields that should be unchanged have been modified: ${mismatchedFields.join(', ')}`
    };
  }

  isNullishOrEmpty(value) {
    // Check for null, undefined
    if (value === null || value === undefined) {
      return true;
    }
    
    // Check for empty string
    if (value === '') {
      return true;
    }
    
    // Check for empty array
    if (Array.isArray(value) && value.length === 0) {
      return true;
    }
    
    // Check for empty object (but not Date, etc.)
    if (typeof value === 'object' && value.constructor === Object && Object.keys(value).length === 0) {
      return true;
    }
    
    return false;
  }

  filterNestedObject(actual, expected) {
    // Create a filtered version of actual that only includes fields from expected
    const filtered = {};
    for (const key in expected) {
      if (expected.hasOwnProperty(key)) {
        const expectedValue = expected[key];
        const actualValue = actual[key];
        
        // Recursive filtering for nested objects
        if (typeof expectedValue === 'object' && expectedValue !== null && 
            typeof actualValue === 'object' && actualValue !== null &&
            !Array.isArray(expectedValue)) {
          filtered[key] = this.filterNestedObject(actualValue, expectedValue);
        } else {
          filtered[key] = actualValue;
        }
      }
    }
    return filtered;
  }

  getNestedMismatches(actual, expected, parentKey) {
    const mismatches = [];
    
    for (const key in expected) {
      if (expected.hasOwnProperty(key)) {
        const actualValue = actual[key];
        const expectedValue = expected[key];
        const fullPath = `${parentKey}.${key}`;
        
        // Recursive check for nested objects
        if (typeof expectedValue === 'object' && expectedValue !== null && 
            typeof actualValue === 'object' && actualValue !== null &&
            !Array.isArray(expectedValue)) {
          const nestedMismatches = this.getNestedMismatches(actualValue, expectedValue, fullPath);
          mismatches.push(...nestedMismatches);
        } else {
          // Direct comparison for primitive values and arrays
          if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
            mismatches.push(fullPath);
          }
        }
      }
    }
    
    return mismatches;
  }

  compareItems(actual, expected, matchBy, key) {
    if (matchBy === 'deep') {
      return JSON.stringify(actual) === JSON.stringify(expected);
    } else if (matchBy === 'key' && key) {
      return actual[key] === expected[key];
    }
    return false;
  }
}

