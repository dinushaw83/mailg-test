import { deepParseJson, resolvePath } from "../lib/utils/path-resolver.js";
import { matchingOperators, existenceOperators, RDT_OPERATORS } from "../lib/utils/assertion-operators.js";
import { AssertionEngine } from "../lib/assertion-engine.js";
import assertionsData from "../data/assertions.json";

/**
 * Processes a single assertion and returns the result
 * @param {Object} assertion - The assertion object containing title, operator, path/paths, expected, options
 * @param {Object} data - The data object to evaluate the assertion against
 * @param {string} modelResponse - Optional model response for LLM assertions
 * @returns {Promise<Object>} Promise that resolves to the assertion result
 */
async function processAssertion(assertion, data, modelResponse) {
  const { title, operator, path, expected, options = {} } = assertion;

  let result = {
    title: title,
    operator,
    path: path,
    result: "fail",
    error: null,
    actual: null,
    expected: expected,
    options: options,
  };

  // Handle LLM-based assertions (RDT operators)
  if (RDT_OPERATORS.includes(operator)) {
    const startTime = performance.now();
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`LLM assertion attempt ${attempt}/${maxRetries}`);

        // Use assertion engine for RDT operators
        const engine = new AssertionEngine();
        const engineResult = await engine.execute(assertion, data, modelResponse);

        if (engineResult) {
          const executionTime = performance.now() - startTime;
          return {
            title: title,
            operator: operator,
            actual: engineResult.actual,
            expected: assertion.expected_facts || assertion.aspects || assertion.expected_reasonings || {},
            result: engineResult.result === "match" ? "pass" : "fail",
            score: engineResult.score,
            details: engineResult.details,
            error: engineResult.error || null,
            executionTime: Math.round(executionTime * 100) / 100,
          };
        }
      } catch (error) {
        console.error(`Error processing RDT assertion on attempt ${attempt}:`, error);
        lastError = error;

        if (attempt < maxRetries) {
          console.log(`Retrying RDT assertion (attempt ${attempt + 1}/${maxRetries})...`);
          // Add a small delay before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // If all retries failed
    const executionTime = performance.now() - startTime;
    console.error(`RDT assertion failed after ${maxRetries} attempts`);
    result.error = `Failed to process RDT assertion after ${maxRetries} attempts: ${lastError instanceof Error ? lastError.message : "Unknown error"}`;
    result.result = "fail";
    result.executionTime = Math.round(executionTime * 100) / 100;
    return result;
  }

  // Handle standard operators
  try {
    if (!operator || (!(operator in existenceOperators) && !(operator in matchingOperators))) {
      throw new Error(`Unknown operator: ${operator}`);
    }

    let actualValue;

    if (typeof path === "string") {
      actualValue = resolvePath(data, path);
    } else if (typeof path === "object") {
      actualValue = {};
      for (const [key, pathValue] of Object.entries(path)) {
        actualValue[key] = resolvePath(data, pathValue);
      }
    } else {
      throw new Error("path must be a string or an object");
    }

    result.actual = actualValue;
    if (operator in matchingOperators) {
      result.result = matchingOperators[operator](actualValue, expected, options) ? "pass" : "fail";
    } else if (operator in existenceOperators) {
      result.result = existenceOperators[operator](actualValue) ? "pass" : "fail";
    } else {
      throw new Error(`Unknown operator: ${operator}`);
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : "Unknown error";
    result.result = "fail";
  }

  return result;
}

/**
 * Processes a single assertion from a JSON string
 * @param {string} assertionString - JSON string containing the assertion
 * @param {Object} data - The data object to evaluate the assertion against
 * @param {string} modelResponse - Optional model response for LLM assertions
 * @returns {Promise<Object>} Promise that resolves to the assertion result
 */
async function processAssertionFromString(assertionString, data, modelResponse) {
  const parsedAssertion = JSON.parse(assertionString);
  return processAssertion(parsedAssertion, data, modelResponse);
}

/**
 * Processes multiple assertions
 * @param {Array} assertions - Array of assertion objects
 * @param {Object} data - The data object to evaluate assertions against
 * @param {string} modelResponse - Optional model response for LLM assertions
 * @returns {Promise<Array>} Promise that resolves to array of assertion results
 */
async function processAssertions(assertions, data, modelResponse) {
  const processedAssertions = [];

  // Process assertions sequentially to maintain order and handle LLM calls properly
  for (let i = 0; i < assertions.length; i++) {
    const assertion = assertions[i];
    const result = await processAssertion(assertion, data, modelResponse);
    processedAssertions.push(result);
  }

  return processedAssertions;
}

/**
 * Get expected state - returns task definitions and assertions
 * @param {string} taskId - Optional task ID. If not provided, returns all tasks
 * @returns {Promise<Object>} Task definition(s) with assertions
 */
export async function getExpectedState(taskId = null) {
  try {
    let assertions = assertionsData;

    // Filter by TASK_IDS environment variable if set (only when returning all tasks)
    const taskIdsEnv = import.meta.env.VITE_TASK_IDS;
    if (taskIdsEnv && !taskId) {
      const taskIdsFilter = taskIdsEnv.split(",").map((id) => id.trim());
      assertions = Object.fromEntries(Object.entries(assertions).filter(([key]) => taskIdsFilter.includes(key)));
    }

    // If no taskId provided, return all available tasks (potentially filtered)
    if (!taskId) {
      return {
        count: Object.keys(assertions).length,
        verifiers: assertions,
      };
    }

    // Check if task exists
    if (!(taskId in assertions)) {
      throw new Error("Task not found");
    }

    const assertion = assertions[taskId];

    // Transform assertions - include all fields for RDT operators
    const transformedAssertions = assertion.assertions.map((_assertion) => ({
      title: _assertion.title,
      operator: _assertion.operator,
      path: _assertion.path,
      expected: _assertion.expected,
      options: _assertion.options || {},
      // Include RDT-specific fields
      description: _assertion.description,
      aspects: _assertion.aspects,
      expected_facts: _assertion.expected_facts,
      expected_reasonings: _assertion.expected_reasonings,
      pass_threshold_percent: _assertion.pass_threshold_percent,
    }));

    return {
      taskId: taskId,
      prompt: assertion.prompt,
      assertions: transformedAssertions,
    };
  } catch (error) {
    console.error("Error in getExpectedState:", error);
    throw error;
  }
}

/**
 * Get actual state - evaluates assertions against localStorage data
 * @param {string} taskId - Task ID
 * @param {Object} localStorageData - Parsed localStorage data object
 * @param {string} assertion - Optional JSON string of single assertion to evaluate
 * @param {string} modelResponse - Optional model response for RDT operators
 * @returns {Promise<Object>} Assertion result(s)
 */
export async function getActualState(taskId, localStorageData, assertion = null, modelResponse = null) {
  try {
    if (!taskId) {
      throw new Error("taskId is required");
    }

    // Check if task exists in assertions.json
    if (!assertionsData[taskId]) {
      throw new Error("Task not found");
    }

    // Parse localStorage data if it's a string
    let data = localStorageData;
    if (typeof localStorageData === "string") {
      try {
        data = deepParseJson(localStorageData);
      } catch (error) {
        throw new Error("Invalid localStorageData JSON format");
      }
    }

    // Get actual state for a single assertion only - used for sub-checks
    if (assertion) {
      const result = await processAssertionFromString(assertion, data, modelResponse);
      return result;
    }

    // Process all assertions for the task
    const task = assertionsData[taskId];
    const processedAssertions = await processAssertions(task.assertions, data, modelResponse);

    return {
      taskId: taskId,
      prompt: task.prompt,
      assertions: processedAssertions,
    };
  } catch (error) {
    console.error("Error in getActualState:", error);
    throw error;
  }
}
