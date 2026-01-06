// RDT operators that require model response input
export const RDT_OPERATORS = ['FACTUAL_VERIFICATION', 'REASONING_QUALITY', 'INFORMATION_PRECISION'];

// Import judges.json
// Vite handles this automatically. For Node.js contexts that require 'with', 
// we handle it via other means or use a fallback.
import judgesDataRaw from '../../data/judges.json' assert { type: 'json' };

// Handle both default export and named export formats
const judgesData = judgesDataRaw.default || judgesDataRaw;

// Handle new RDT framework assertions
const handleRDTAssertion = async (judgeTemplate, assertion, modelResponse) => {
  // Load judges.json if not already loaded
  if (!judgesData) {
    try {
      const judgesDataRaw = await import('../../data/judges.json');
      judgesData = judgesDataRaw.default || judgesDataRaw;
    } catch (e) {
      // Fallback for environments where dynamic import of JSON is not supported without attributes
      // (like Node.js v22+ if this were ever called from the server side)
      console.error('Failed to load judges.json via import:', e);
      throw e;
    }
  }
  const judges = judgesData;

  // Use import.meta.env for client-side (Vite), fallback to process.env for server-side
  const OPENROUTER_API_KEY = import.meta.env?.VITE_OPENROUTER_API_KEY || process.env?.OPENROUTER_API_KEY;
  const OPENROUTER_URL = import.meta.env?.VITE_OPENROUTER_URL || process.env?.OPENROUTER_URL;
  const OPENROUTER_MODEL = import.meta.env?.VITE_OPENROUTER_MODEL || process.env?.OPENROUTER_MODEL;

  if (!OPENROUTER_URL || !OPENROUTER_API_KEY || !OPENROUTER_MODEL) {
    throw new Error(
      'Missing required environment variables: OPENROUTER_URL, OPENROUTER_API_KEY, or OPENROUTER_MODEL'
    );
  }

  // Get the judge prompt template from judges.json
  const judgePrompt = judges[judgeTemplate];
  if (!judgePrompt) {
    throw new Error(`Judge template '${judgeTemplate}' not found in judges.json`);
  }

  // Create the combined prompt by replacing template variables
  let prompt = judgePrompt
    .replace(/{{description}}/g, assertion.description)
    .replace(/{{modelResponse}}/g, modelResponse);

  // Handle Handlebars-style each loops for expected_facts
  if (assertion.expected_facts) {
    const factsSection = assertion.expected_facts
      .map((fact, index) => {
        if (typeof fact === 'string') {
          return `${index + 1}. ${fact}`;
        }
        return `${index + 1}. ${fact.fact} (Weight: ${fact.weight})`;
      })
      .join('\n');
    prompt = prompt.replace(/{{#each expected_facts}}[\s\S]*?{{\/each}}/g, factsSection);
  }

  // Handle Handlebars-style each loops for aspects  
  if (assertion.aspects) {
    const aspectsSection = assertion.aspects
      .map((aspect, index) => `${index + 1}. ${aspect.aspect} (Weight: ${aspect.weight})`)
      .join('\n');
    prompt = prompt.replace(/{{#each aspects}}[\s\S]*?{{\/each}}/g, aspectsSection);
  }

  // Handle expected_reasonings array
  if (assertion.expected_reasonings) {
    const reasoningsSection = assertion.expected_reasonings
      .map((reasoning, index) => `${index + 1}. ${reasoning}`)
      .join('\n');
    prompt = prompt.replace(/{{#each expected_reasonings}}[\s\S]*?{{\/each}}/g, reasoningsSection);
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
    }),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENROUTER_API_KEY}` },
  });

  if (!response.ok) {
    throw new Error(`LLM API call failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Extract the content from the LLM response
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content returned from LLM');
  }

  try {
    // Clean the content - remove markdown code blocks if present
    let cleanedContent = content.trim();
    
    // Remove markdown code blocks (```json or ```)
    if (cleanedContent.startsWith('```')) {
      // Find the first newline after ```
      const firstNewline = cleanedContent.indexOf('\n');
      if (firstNewline !== -1) {
        cleanedContent = cleanedContent.substring(firstNewline + 1);
      }
      // Remove trailing ```
      cleanedContent = cleanedContent.replace(/```\s*$/, '').trim();
    }
    
    // Parse the JSON response from the LLM
    const parsedResponse = JSON.parse(cleanedContent);

    // Validate the response structure
    if (!parsedResponse.operator) {
      throw new Error('Invalid LLM response structure - missing operator');
    }

    return parsedResponse;
  } catch (parseError) {
    // If parsing fails, return a structured error response
    return {
      operator: judgeTemplate.replace('_judge_v1', '').toUpperCase(),
      fact_scores: {},
      aspect_scores: {},
      precision_scores: {},
      error: `LLM response parsing failed: ${
        parseError instanceof Error ? parseError.message : 'Unknown error'
      }`,
    };
  }
};

export const existenceOperators = {
  EXISTS: (actual) => {
    return actual !== undefined && actual !== null;
  },

  NOT_EXISTS: (actual) => {
    return actual === undefined || actual === null;
  },
};

export const matchingOperators = {
  JSON_MATCH: (actual, expected, options = {}) => {
    const { unorderedArrays = false, allowExtraKeys = false } = options;

    if (unorderedArrays && Array.isArray(actual) && Array.isArray(expected)) {
      const actualSorted = [...actual].sort();
      const expectedSorted = [...expected].sort();
      return JSON.stringify(actualSorted) === JSON.stringify(expectedSorted);
    }

    if (allowExtraKeys && typeof actual === 'object' && typeof expected === 'object') {
      for (const key in expected) {
        if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
          return false;
        }
      }
      return true;
    }

    return JSON.stringify(actual) === JSON.stringify(expected);
  },

  ARRAY_CONTAINS: (actual, expected, options = {}) => {
    if (!Array.isArray(actual)) {
      return false;
    }

    const { mode = 'some', orderSensitive = false, matchBy = 'deep', key } = options;

    if (matchBy === 'key' && !key) {
      throw new Error("key is required when matchBy is 'key'");
    }

    if (!['some', 'all', 'exact'].includes(mode)) {
      throw new Error("mode must be 'some', 'all', or 'exact'");
    }

    if (!['deep', 'key'].includes(matchBy)) {
      throw new Error("matchBy must be 'deep' or 'key'");
    }

    // Helper function to compare items based on matchBy
    const compareItems = (actualItem, expectedItem) => {
      if (matchBy === 'key' && key) {
        if (typeof actualItem === 'object' && actualItem !== null) {
          // Use JSON.stringify for proper comparison of arrays/objects
          return JSON.stringify(actualItem[key]) === JSON.stringify(expectedItem[key]);
        }
        return false;
      } else {
        return JSON.stringify(actualItem) === JSON.stringify(expectedItem);
      }
    };

    if (mode === 'some') {
      return expected.some(expectedItem =>
        actual.some(actualItem => compareItems(actualItem, expectedItem))
      );
    }

    if (mode === 'all') {
      return expected.every(expectedItem =>
        actual.some(actualItem => compareItems(actualItem, expectedItem))
      );
    }

    if (mode === 'exact') {
      if (actual.length !== expected.length) {
        return false;
      }

      if (orderSensitive) {
        return actual.every((actualItem, index) => compareItems(actualItem, expected[index]));
      } else {
        return expected.every(expectedItem =>
          actual.some(actualItem => compareItems(actualItem, expectedItem))
        );
      }
    }

    return false;
  },

  NOT_ARRAY_CONTAINS: (actual, expected, options = {}) => {
    // If actual is not an array, it definitely doesn't contain the expected items
    if (!Array.isArray(actual)) {
      return true;
    }

    const { mode = 'some', matchBy = 'deep', key } = options;

    // Helper function to compare items based on matchBy
    const compareItems = (actualItem, expectedItem) => {
      if (matchBy === 'key' && key) {
        if (typeof actualItem === 'object' && actualItem !== null) {
          return JSON.stringify(actualItem[key]) === JSON.stringify(expectedItem[key]);
        }
        return false;
      } else {
        return JSON.stringify(actualItem) === JSON.stringify(expectedItem);
      }
    };

    // Check if any of the expected items are in the actual array
    const containsAny = expected.some(expectedItem =>
      actual.some(actualItem => compareItems(actualItem, expectedItem))
    );

    // NOT_ARRAY_CONTAINS passes if NONE of the expected items are found
    return !containsAny;
  },

  STRING_MATCH: (actual, expected, options = {}) => {
    if (typeof actual !== 'string' || typeof expected !== 'string') {
      return false;
    }

    const { caseInsensitive = false, trim = false, normalizeWhitespace = false } = options;

    let actualStr = actual;
    let expectedStr = expected;

    if (trim) {
      actualStr = actualStr.trim();
      expectedStr = expectedStr.trim();
    }

    if (normalizeWhitespace) {
      actualStr = actualStr.replace(/\s+/g, ' ');
      expectedStr = expectedStr.replace(/\s+/g, ' ');
    }

    if (caseInsensitive) {
      actualStr = actualStr.toLowerCase();
      expectedStr = expectedStr.toLowerCase();
    }

    return actualStr === expectedStr;
  },

  STRING_CONTAINS: (actual, expected, options = {}) => {
    if (typeof actual !== 'string' || typeof expected !== 'string') {
      return false;
    }

    const { caseInsensitive = false } = options;

    let actualStr = actual;
    let expectedStr = expected;

    if (caseInsensitive) {
      actualStr = actualStr.toLowerCase();
      expectedStr = expectedStr.toLowerCase();
    }

    return actualStr.includes(expectedStr);
  },

  COMPARE: (actual, expected, options) => {
    const { op, type } = options;

    if (!op || !type) {
      throw new Error('op and type are required for COMPARE operator');
    }

    if (!['==', '!=', '>', '>=', '<', '<='].includes(op)) {
      throw new Error('op must be one of: ==, !=, >, >=, <, <=');
    }

    if (!['number', 'string', 'datetime', 'boolean'].includes(type)) {
      throw new Error('type must be one of: number, string, datetime, boolean');
    }

    if (type === 'number') {
      const actualNum = Number(actual);
      const expectedNum = Number(expected);
      const { tolerance = 0 } = options;

      if (isNaN(actualNum) || isNaN(expectedNum)) {
        return false;
      }

      const diff = Math.abs(actualNum - expectedNum);
      if (tolerance > 0) {
        return diff <= tolerance;
      }

      switch (op) {
        case '==':
          return actualNum === expectedNum;
        case '!=':
          return actualNum !== expectedNum;
        case '>':
          return actualNum > expectedNum;
        case '>=':
          return actualNum >= expectedNum;
        case '<':
          return actualNum < expectedNum;
        case '<=':
          return actualNum <= expectedNum;
        default:
          return false;
      }
    }

    if (type === 'string') {
      const actualStr = String(actual);
      const expectedStr = String(expected);

      switch (op) {
        case '==':
          return actualStr === expectedStr;
        case '!=':
          return actualStr !== expectedStr;
        case '>':
          return actualStr > expectedStr;
        case '>=':
          return actualStr >= expectedStr;
        case '<':
          return actualStr < expectedStr;
        case '<=':
          return actualStr <= expectedStr;
        default:
          return false;
      }
    }

    if (type === 'datetime') {
      const { tz = 'UTC', granularity = 'datetime', input = 'iso' } = options;

      let actualDate, expectedDate;

      // Parse actual date
      if (input === 'iso') {
        actualDate = new Date(actual);
      } else if (input === 'epochMs') {
        actualDate = new Date(Number(actual));
      } else if (input === 'epochSec') {
        actualDate = new Date(Number(actual) * 1000);
      }

      // Parse expected date (handle special values and expressions)
      if (expected === '$NOW') {
        expectedDate = new Date();
      } else if (expected === '$TODAY') {
        const now = new Date();
        expectedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (typeof expected === 'string' && expected.startsWith('$NOW')) {
        // Handle expressions like "$NOW + 5 days", "$NOW - 2 hours", etc.
        expectedDate = parseDynamicDateExpression(expected);
      } else if (typeof expected === 'string' && expected.startsWith('$TODAY')) {
        // Handle expressions like "$TODAY + 3 days", "$TODAY - 1 week", etc.
        const baseDate = new Date();
        const todayDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
        expectedDate = parseDynamicDateExpression(expected.replace('$TODAY', '$NOW'), todayDate);
      } else {
        if (input === 'iso') {
          expectedDate = new Date(expected);
        } else if (input === 'epochMs') {
          expectedDate = new Date(Number(expected));
        } else if (input === 'epochSec') {
          expectedDate = new Date(Number(expected) * 1000);
        }
      }

      if (
        !actualDate ||
        !expectedDate ||
        isNaN(actualDate.getTime()) ||
        isNaN(expectedDate.getTime())
      ) {
        return false;
      }

      // Apply granularity
      if (granularity === 'date') {
        actualDate = new Date(
          actualDate.getFullYear(),
          actualDate.getMonth(),
          actualDate.getDate()
        );
        expectedDate = new Date(
          expectedDate.getFullYear(),
          expectedDate.getMonth(),
          expectedDate.getDate()
        );
      } else if (granularity === 'time') {
        actualDate = new Date(
          0,
          0,
          0,
          actualDate.getHours(),
          actualDate.getMinutes(),
          actualDate.getSeconds(),
          actualDate.getMilliseconds()
        );
        expectedDate = new Date(
          0,
          0,
          0,
          expectedDate.getHours(),
          expectedDate.getMinutes(),
          expectedDate.getSeconds(),
          expectedDate.getMilliseconds()
        );
      }

      switch (op) {
        case '==':
          return actualDate.getTime() === expectedDate.getTime();
        case '!=':
          return actualDate.getTime() !== expectedDate.getTime();
        case '>':
          return actualDate.getTime() > expectedDate.getTime();
        case '>=':
          return actualDate.getTime() >= expectedDate.getTime();
        case '<':
          return actualDate.getTime() < expectedDate.getTime();
        case '<=':
          return actualDate.getTime() <= expectedDate.getTime();
        default:
          return false;
      }
    }

    if (type === 'boolean') {
      const actualBool = Boolean(actual);
      const expectedBool = Boolean(expected);

      switch (op) {
        case '==':
          return actualBool === expectedBool;
        case '!=':
          return actualBool !== expectedBool;
        default:
          return false;
      }
    }

    return false;
  },

  BETWEEN: (actual, expected, options = {}) => {
    const { type = 'number', inclusive = true, tolerance = 0 } = options;

    if (!type) {
      throw new Error('type is required for BETWEEN operator');
    }

    if (!['number', 'string', 'datetime'].includes(type)) {
      throw new Error('type must be one of: number, string, datetime');
    }

    if (
      !expected ||
      typeof expected !== 'object' ||
      expected.min === undefined ||
      expected.max === undefined
    ) {
      throw new Error('expected must be an object with min and max properties');
    }

    if (type === 'number') {
      let actualNum = Number(actual);
      const minNum = Number(expected.min);
      const maxNum = Number(expected.max);

      // Handle price strings like "$59.00" by removing currency symbols
      if (isNaN(actualNum) && typeof actual === 'string') {
        const cleanedActual = actual.replace(/[$,]/g, '');
        actualNum = Number(cleanedActual);
      }

      if (isNaN(actualNum) || isNaN(minNum) || isNaN(maxNum)) {
        return false;
      }

      if (inclusive) {
        return actualNum >= minNum && actualNum <= maxNum;
      } else {
        return actualNum > minNum && actualNum < maxNum;
      }
    }

    if (type === 'string') {
      const actualStr = String(actual);
      const minStr = String(expected.min);
      const maxStr = String(expected.max);

      if (inclusive) {
        return actualStr >= minStr && actualStr <= maxStr;
      } else {
        return actualStr > minStr && actualStr < maxStr;
      }
    }

    if (type === 'datetime') {
      const { tz = 'UTC', granularity = 'datetime', input = 'iso' } = options;

      let actualDate, minDate, maxDate;

      // Parse dates based on input format
      try {
        if (input === 'iso') {
          actualDate = new Date(actual);
          minDate = new Date(expected.min);
          maxDate = new Date(expected.max);
        } else if (input === 'epochMs') {
          actualDate = new Date(Number(actual));
          minDate = new Date(Number(expected.min));
          maxDate = new Date(Number(expected.max));
        } else if (input === 'epochSec') {
          actualDate = new Date(Number(actual) * 1000);
          minDate = new Date(Number(expected.min) * 1000);
          maxDate = new Date(Number(expected.max) * 1000);
        }
      } catch (e) {
        return false;
      }

      if (
        !actualDate ||
        !minDate ||
        !maxDate ||
        isNaN(actualDate.getTime()) ||
        isNaN(minDate.getTime()) ||
        isNaN(maxDate.getTime())
      ) {
        return false;
      }

      // Apply granularity
      if (granularity === 'date') {
        actualDate.setHours(0, 0, 0, 0);
        minDate.setHours(0, 0, 0, 0);
        maxDate.setHours(0, 0, 0, 0);
      } else if (granularity === 'time') {
        const actualTime =
          actualDate.getHours() * 3600 + actualDate.getMinutes() * 60 + actualDate.getSeconds();
        const minTime =
          minDate.getHours() * 3600 + minDate.getMinutes() * 60 + minDate.getSeconds();
        const maxTime =
          maxDate.getHours() * 3600 + maxDate.getMinutes() * 60 + maxDate.getSeconds();

        if (inclusive) {
          return actualTime >= minTime && actualTime <= maxTime;
        } else {
          return actualTime > minTime && actualTime < maxTime;
        }
      }

      const actualTime = actualDate.getTime();
      const minTime = minDate.getTime();
      const maxTime = maxDate.getTime();

      if (inclusive) {
        return actualTime >= minTime && actualTime <= maxTime;
      } else {
        return actualTime > minTime && actualTime < maxTime;
      }
    }

    return false;
  },

  ARRAY_LENGTH: (actual, expected, options = {}) => {
    if (!Array.isArray(actual)) {
      return false;
    }

    const { op = '==' } = options;
    const actualLength = actual.length;
    const expectedLength = Number(expected);

    if (isNaN(expectedLength)) {
      return false;
    }

    switch (op) {
      case '==':
        return actualLength === expectedLength;
      case '>':
        return actualLength > expectedLength;
      case '>=':
        return actualLength >= expectedLength;
      case '<':
        return actualLength < expectedLength;
      case '<=':
        return actualLength <= expectedLength;
      default:
        return false;
    }
  },

  DATETIME_IN_RANGE: (
    actual,
    expected,
    options = {}
  ) => {
    const { tz = 'UTC', granularity = 'datetime', input = 'iso' } = options;
    const { start, end, inclusive = true } = expected;

    if (!start || !end) {
      throw new Error('start and end are required for DATETIME_IN_RANGE');
    }

    let actualDate, startDate, endDate;

    // Parse actual date
    if (input === 'iso') {
      actualDate = new Date(actual);
    } else if (input === 'epochMs') {
      actualDate = new Date(Number(actual));
    } else if (input === 'epochSec') {
      actualDate = new Date(Number(actual) * 1000);
    }

    // Parse start date
    if (start === '$NOW') {
      startDate = new Date();
    } else if (start === '$TODAY') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      if (input === 'iso') {
        startDate = new Date(start);
      } else if (input === 'epochMs') {
        startDate = new Date(Number(start));
      } else if (input === 'epochSec') {
        startDate = new Date(Number(start) * 1000);
      }
    }

    // Parse end date
    if (end === '$NOW') {
      endDate = new Date();
    } else if (end === '$TODAY') {
      const now = new Date();
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else {
      if (input === 'iso') {
        endDate = new Date(end);
      } else if (input === 'epochMs') {
        endDate = new Date(Number(end));
      } else if (input === 'epochSec') {
        endDate = new Date(Number(end) * 1000);
      }
    }

    if (
      !actualDate ||
      !startDate ||
      !endDate ||
      isNaN(actualDate.getTime()) ||
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime())
    ) {
      return false;
    }

    // Apply granularity
    if (granularity === 'date') {
      actualDate = new Date(actualDate.getFullYear(), actualDate.getMonth(), actualDate.getDate());
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      endDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    } else if (granularity === 'time') {
      actualDate = new Date(
        0,
        0,
        0,
        actualDate.getHours(),
        actualDate.getMinutes(),
        actualDate.getSeconds(),
        actualDate.getMilliseconds()
      );
      startDate = new Date(
        0,
        0,
        0,
        startDate.getHours(),
        startDate.getMinutes(),
        startDate.getSeconds(),
        startDate.getMilliseconds()
      );
      endDate = new Date(
        0,
        0,
        0,
        endDate.getHours(),
        endDate.getMinutes(),
        endDate.getSeconds(),
        endDate.getMilliseconds()
      );
    }

    const actualTime = actualDate.getTime();
    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    if (inclusive) {
      return actualTime >= startTime && actualTime <= endTime;
    } else {
      return actualTime > startTime && actualTime < endTime;
    }
  },

  DATETIME_DIFFERENCE: (
    actual,
    expected,
    options = {}
  ) => {
    const { tz = 'UTC', input = 'iso', toleranceMs = 0 } = options;
    const { start, end } = actual;

    if (!start || !end) {
      throw new Error('start and end paths are required for DATETIME_DIFFERENCE');
    }

    let startDate, endDate;

    // Parse start date
    if (input === 'iso') {
      startDate = new Date(start);
    } else if (input === 'epochMs') {
      startDate = new Date(Number(start));
    } else if (input === 'epochSec') {
      startDate = new Date(Number(start) * 1000);
    }

    // Parse end date
    if (input === 'iso') {
      endDate = new Date(end);
    } else if (input === 'epochMs') {
      endDate = new Date(Number(end));
    } else if (input === 'epochSec') {
      endDate = new Date(Number(end) * 1000);
    }

    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return false;
    }

    const actualDurationMs = endDate.getTime() - startDate.getTime();
    let expectedDurationMs;

    // Parse expected duration
    if (typeof expected === 'string') {
      // ISO-8601 duration parsing (simplified)
      const match = expected.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/);
      if (match) {
        const hours = parseInt(match[1] || '0', 10);
        const minutes = parseInt(match[2] || '0', 10);
        const seconds = parseFloat(match[3] || '0');
        expectedDurationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
      } else {
        return false;
      }
    } else if (typeof expected === 'number') {
      expectedDurationMs = expected;
    } else {
      return false;
    }

    const diff = Math.abs(actualDurationMs - expectedDurationMs);
    return diff <= toleranceMs;
  },

  FIELDS_UNCHANGED: (actual, expected, options = {}) => {
    const { allowExtraKeys = true, strictComparison = true } = options;

    // If actual is null/undefined but expected has properties, fail
    if (!actual || typeof actual !== 'object') {
      return Object.keys(expected || {}).length === 0;
    }

    // If expected is null/undefined, consider it as no fields to check (pass)
    if (!expected || typeof expected !== 'object') {
      return true;
    }

    // Check each field in expected against actual
    for (const key in expected) {
      if (expected.hasOwnProperty(key)) {
        const actualValue = actual[key];
        const expectedValue = expected[key];

        if (strictComparison) {
          // Use JSON.stringify for deep comparison
          if (JSON.stringify(actualValue) !== JSON.stringify(expectedValue)) {
            return false;
          }
        } else {
          // Use loose equality
          if (actualValue != expectedValue) {
            return false;
          }
        }
      }
    }

    return true;
  },

  FACTUAL_VERIFICATION: async (
    actual,
    assertion
  ) => {
    return await handleRDTAssertion('factual_verification_judge_v1', assertion, actual);
  },

  REASONING_QUALITY: async (
    actual,
    assertion
  ) => {
    return await handleRDTAssertion('reasoning_quality_judge_v1', assertion, actual);
  },

  INFORMATION_PRECISION: async (
    actual,
    assertion
  ) => {
    return await handleRDTAssertion('information_precision_judge_v1', assertion, actual);
  },
};

// Helper function to parse dynamic date expressions like "$NOW + 5 days"
function parseDynamicDateExpression(expression, baseDate) {
  const base = baseDate || new Date();
  
  // Remove $NOW or $TODAY prefix and trim
  const cleanExpression = expression.replace(/^\$(NOW|TODAY)\s*/, '').trim();
  
  // If no expression after $NOW/$TODAY, return base date
  if (!cleanExpression) {
    return base;
  }
  
  // Parse expressions like "+ 5 days", "- 2 hours", "+ 1 week", etc.
  const match = cleanExpression.match(/^([+-])\s*(\d+)\s*(day|days|hour|hours|minute|minutes|second|seconds|week|weeks|month|months|year|years)s?$/i);
  
  if (!match) {
    return undefined; // Invalid expression format
  }
  
  const [, operator, amountStr, unit] = match;
  const amount = parseInt(amountStr, 10);
  const multiplier = operator === '+' ? 1 : -1;
  const finalAmount = amount * multiplier;
  
  const result = new Date(base);
  
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
      return undefined; // Unsupported unit
  }
  
  return result;
}

// Combined export for all assertion operators
export const assertionOperators = {
  ...existenceOperators,
  ...matchingOperators,
};

