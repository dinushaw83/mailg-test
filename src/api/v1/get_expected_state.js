// const fs = require('fs');
import { readFileSync } from "fs";
// const path = require('path');
import path from "path";
import { fileURLToPath } from "url";

// Recreate __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load tasks.json (equivalent to assertions.json in Mira)
const tasksPath = path.join(__dirname, "../../data/assertions.json");
let tasksData = {};

try {
  const rawData = readFileSync(tasksPath, "utf8");
  tasksData = JSON.parse(rawData);
} catch (error) {
  console.error("Error loading tasks.json:", error);
}

// Get filtered tasks based on environment variables
function getFilteredTasks() {
  const allTasks = tasksData;

  // Check if TASK_IDS environment variable is defined
  const taskIdsEnv = process.env.TASK_IDS;
  if (taskIdsEnv) {
    const taskIds = taskIdsEnv.split(",").map((id) => id.trim());
    const filteredTasks = {};

    // Filter tasks to only include specified task IDs
    taskIds.forEach((taskId) => {
      if (allTasks[taskId]) {
        filteredTasks[taskId] = allTasks[taskId];
      }
    });

    return filteredTasks;
  }

  return allTasks;
}

const tasks = getFilteredTasks();

/**
 * POST /api/v1/get_expected_state
 *
 * Request body:
 * {
 *   taskId?: string  // Optional - if not provided, returns all tasks
 * }
 *
 * Response:
 * Single task: { taskId, prompt, assertions }
 * All tasks: { count, verifiers }
 */
async function getExpectedState(req, res) {
  try {
    // Parse JSON request body with fallback to empty object
    const body = req.body || {};
    const { taskId } = body;

    // If no taskId provided, return all available tasks
    if (!taskId) {
      const response = {
        count: Object.keys(tasks).length,
        verifiers: tasks,
      };

      return res.json(response);
    }

    // Check if task exists in tasks.json
    if (!(taskId in tasks)) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = tasks[taskId];

    // Transform assertions - include all fields for RDT operators
    const transformedAssertions = (task.assertions || []).map((_assertion) => ({
      title: _assertion.title,
      operator: _assertion.operator,
      path: _assertion.path,
      expected: _assertion.expected,
      options: _assertion.options || {}, // Always provide options field
      // Include RDT-specific fields
      description: _assertion.description,
      aspects: _assertion.aspects,
      expected_facts: _assertion.expected_facts,
      expected_reasonings: _assertion.expected_reasonings,
      pass_threshold_percent: _assertion.pass_threshold_percent,
    }));

    const response = {
      taskId: taskId,
      prompt: task.prompt,
      assertions: transformedAssertions,
    };

    return res.json(response);
  } catch (error) {
    console.error("Error in get_expected_state:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default getExpectedState;
