const fs = require('fs');
const path = require('path');
const { deepParseJson, resolvePath } = require('../../lib/utils/path-resolver');

// Load tasks.json
const tasksPath = path.join(__dirname, '../../data/tasks.json');
let tasksData = {};

try {
  const rawData = fs.readFileSync(tasksPath, 'utf8');
  tasksData = JSON.parse(rawData);
} catch (error) {
  console.error('Error loading tasks.json:', error);
}

// Load judges.json for LLM-based assertions
const judgesPath = path.join(__dirname, '../../data/judges.json');
let judgesData = {};

try {
  const rawData = fs.readFileSync(judgesPath, 'utf8');
  judgesData = JSON.parse(rawData);
} catch (error) {
  console.error('Error loading judges.json:', error);
}

// Import assertion operators
// We'll use require with a try-catch since these might be TypeScript files
let assertionOperators;
try {
  // Try to load the JavaScript operators if they exist
  assertionOperators = require('../../lib/utils/assertion-operators');
} catch (error) {
  // Expected: TypeScript files can't be loaded directly by Node.js
  // Falling back to JavaScript implementations of basic operators
  console.log('ℹ️  Using JavaScript fallback operators (TypeScript files not compiled)');
  assertionOperators = createBasicOperators();
}

// RDT operators that require model response
const RDT_OPERATORS = ['FACTUAL_VERIFICATION', 'REASONING_QUALITY', 'INFORMATION_PRECISION'];

/**
 * Create basic assertion operators as fallback
 */
function createBasicOperators() {
  return {
    existenceOperators: {
      EXISTS: (actual) => actual !== undefined && actual !== null,
      NOT_EXISTS: (actual) => actual === undefined || actual === null,
    },
    matchingOperators: {
      JSON_MATCH: (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected),
      STRING_MATCH: (actual, expected, options = {}) => {
        if (typeof actual !== 'string' || typeof expected !== 'string') return false;
        let actualStr = actual;
        let expectedStr = expected;
        if (options.trim) {
          actualStr = actualStr.trim();
          expectedStr = expectedStr.trim();
        }
        if (options.caseInsensitive) {
          actualStr = actualStr.toLowerCase();
          expectedStr = expectedStr.toLowerCase();
        }
        return actualStr === expectedStr;
      },
      STRING_CONTAINS: (actual, expected, options = {}) => {
        if (typeof actual !== 'string' || typeof expected !== 'string') return false;
        let actualStr = actual;
        let expectedStr = expected;
        if (options.caseInsensitive) {
          actualStr = actualStr.toLowerCase();
          expectedStr = expectedStr.toLowerCase();
        }
        return actualStr.includes(expectedStr);
      },
      ARRAY_LENGTH: (actual, expected, options = {}) => {
        if (!Array.isArray(actual)) return false;
        const op = options.op || '==';
        const actualLength = actual.length;
        switch (op) {
          case '==': return actualLength === expected;
          case '>': return actualLength > expected;
          case '>=': return actualLength >= expected;
          case '<': return actualLength < expected;
          case '<=': return actualLength <= expected;
          default: return false;
        }
      },
    },
  };
}

/**
 * Handle LLM-based assertions
 */
async function handleLLMAssertion(assertion, modelResponse) {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const OPENROUTER_URL = process.env.OPENROUTER_URL;
  const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL;

  if (!OPENROUTER_URL || !OPENROUTER_API_KEY || !OPENROUTER_MODEL) {
    throw new Error('Missing required environment variables: OPENROUTER_URL, OPENROUTER_API_KEY, or OPENROUTER_MODEL');
  }

  // Determine which judge template to use based on operator
  let judgeTemplate;
  if (assertion.operator === 'FACTUAL_VERIFICATION') {
    judgeTemplate = 'factual_verification_judge_v1';
  } else if (assertion.operator === 'REASONING_QUALITY') {
    judgeTemplate = 'reasoning_quality_judge_v1';
  } else if (assertion.operator === 'INFORMATION_PRECISION') {
    judgeTemplate = 'information_precision_judge_v1';
  }

  const judgePrompt = judgesData[judgeTemplate];
  if (!judgePrompt) {
    throw new Error(`Judge template '${judgeTemplate}' not found in judges.json`);
  }

  // Create the combined prompt by replacing template variables
  let prompt = judgePrompt
    .replace(/{{description}}/g, assertion.description || '')
    .replace(/{{modelResponse}}/g, modelResponse);

  // Handle Handlebars-style each loops for expected_facts
  if (assertion.expected_facts) {
    const factsSection = assertion.expected_facts
      .map((fact, index) => {
        if (typeof fact === 'object' && fact.fact) {
          return `${index + 1}. ${fact.fact} (Weight: ${fact.weight})`;
        }
        return `${index + 1}. ${fact}`;
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
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No content returned from LLM');
  }

  try {
    return JSON.parse(content);
  } catch (parseError) {
    return {
      operator: assertion.operator,
      fact_scores: {},
      aspect_scores: {},
      precision_scores: {},
      error: `LLM response parsing failed: ${parseError.message}`,
    };
  }
}

/**
 * Process a single assertion
 */
async function processAssertion(assertion, data, modelResponse) {
  const { title, operator, path, expected, options = {} } = assertion;

  let result = {
    title: title,
    operator,
    path: path,
    result: 'fail',
    error: null,
    actual: null,
    expected: expected,
    options: options,
  };

  // Handle LLM-based assertions
  if (RDT_OPERATORS.includes(operator)) {
    const startTime = Date.now();
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`LLM assertion attempt ${attempt}/${maxRetries}`);

        const response = await handleLLMAssertion(assertion, modelResponse || '');
        console.log(`LLM assertion successful on attempt ${attempt}`);

        return {
          operator: operator,
          actual: response.fact_scores || response.aspect_scores || response.precision_scores,
          expected: assertion.expected_facts || assertion.aspects || assertion.expected_reasonings || {},
          result: response.error ? 'fail' : 'pass',
          score: response.score,
          details: response.details,
          error: response.error || null,
          executionTime: Date.now() - startTime
        };
      } catch (error) {
        console.error(`Error parsing LLM response on attempt ${attempt}:`, error);
        lastError = error;

        if (attempt < maxRetries) {
          console.log(`Retrying LLM assertion (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // If all retries failed
    const executionTime = Date.now() - startTime;
    console.error(`LLM assertion failed after ${maxRetries} attempts`);
    result.error = `Failed to parse judge model's response after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`;
    result.result = 'fail';
    result.executionTime = executionTime;
    return result;
  }

  // Handle standard assertions
  try {
    const ops = assertionOperators.matchingOperators || assertionOperators;
    const existOps = assertionOperators.existenceOperators || {};

    if (!operator || (!(operator in existOps) && !(operator in ops))) {
      throw new Error(`Unknown operator: ${operator}`);
    }

    let actualValue;

    if (typeof path === 'string') {
      actualValue = resolvePath(data, path);
    } else if (typeof path === 'object') {
      actualValue = {};
      for (const [key, pathValue] of Object.entries(path)) {
        actualValue[key] = resolvePath(data, pathValue);
      }
    } else {
      throw new Error('path must be a string or an object');
    }

    result.actual = actualValue;

    if (operator in ops) {
      result.result = ops[operator](actualValue, expected, options) ? 'pass' : 'fail';
    } else if (operator in existOps) {
      result.result = existOps[operator](actualValue) ? 'pass' : 'fail';
    } else {
      throw new Error(`Unknown operator: ${operator}`);
    }
  } catch (error) {
    result.error = error.message;
    result.result = 'fail';
  }

  return result;
}

/**
 * Process multiple assertions
 */
async function processAssertions(assertions, data, modelResponse) {
  const processedAssertions = [];

  // Process assertions sequentially
  for (let i = 0; i < assertions.length; i++) {
    const assertion = assertions[i];
    const result = await processAssertion(assertion, data, modelResponse);
    processedAssertions.push(result);
  }

  return processedAssertions;
}

/**
 * POST /api/v1/get_actual_state
 *
 * FormData params:
 * - taskId: string (required)
 * - localStorageDump: File (required in localstorage mode)
 * - assertion: string (optional - for single assertion check)
 * - modelResponse: string (optional - for LLM assertions)
 * - runId: string (optional - for runid mode)
 */
async function getActualState(req, res) {
  try {
    const taskId = req.body.taskId;
    const assertion = req.body.assertion;
    const modelResponse = req.body.modelResponse;
    const runId = req.body.runId;
    const localStorageDumpFile = req.file;

    // Get run mode from environment variables
    const RUN_MODE = process.env.VITE_RUN_MODE || 'localstorage';

    if (!taskId) {
      return res.status(400).json({ error: 'taskId is required' });
    }

    // Validate required parameters based on run mode
    if (RUN_MODE === 'localstorage' && !localStorageDumpFile) {
      return res.status(400).json({ error: 'localStorageDump is required when running in localstorage mode' });
    }

    if (RUN_MODE === 'runid' && !runId) {
      return res.status(400).json({ error: 'runId is required when running in runid mode' });
    }

    // Check if task exists in tasks.json
    if (!tasksData[taskId]) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get data based on run mode
    let data;
    if (RUN_MODE === 'localstorage') {
      // Read the localStorage dump file
      const localStorageDumpReq = localStorageDumpFile.buffer.toString('utf8');
      try {
        data = deepParseJson(localStorageDumpReq);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid localStorageDump JSON format' });
      }
    } else if (RUN_MODE === 'runid') {
      // TODO: Get data from database when implementing runid mode
      return res.status(501).json({ error: 'runid mode not yet implemented' });
    }

    try {
      // Get actual state for a single assertion only - used for sub-checks
      if (assertion) {
        const parsedAssertion = JSON.parse(assertion);
        const result = await processAssertion(parsedAssertion, data, modelResponse);
        return res.json(result);
      }

      const task = tasksData[taskId];
      const processedAssertions = await processAssertions(task.assertions || [], data, modelResponse);

      return res.json({
        taskId: taskId,
        prompt: task.prompt,
        assertions: processedAssertions,
      });
    } catch (error) {
      console.error('Error processing assertions:', error);
      return res.status(500).json({
        error: 'Failed to process assertions',
        taskId: taskId,
        details: error.message
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

module.exports = getActualState;
