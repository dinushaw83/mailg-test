# Mailg API Documentation

## Overview

The Mailg verification API provides two endpoints for testing and verifying task execution in the email client RL-Gym environment.

**Base URL:** `http://localhost:3001`

---

## Starting the API Server

### Option 1: Run Both Servers (Recommended)
```bash
npm run dev
```
This starts both the Vite dev server (port 3000) and the API server (port 3001) concurrently.

### Option 2: Run API Server Only
```bash
npm run dev:api
```

### Option 3: Run Vite Dev Server Only
```bash
npm run dev:vite
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# API Server Port
API_PORT=3001

# Run mode: 'localstorage' or 'runid'
VITE_RUN_MODE=localstorage

# OpenRouter API Configuration (for LLM-based assertions)
OPENROUTER_API_KEY=your_api_key_here
OPENROUTER_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Optional: Filter tasks by ID (comma-separated)
# TASK_IDS=MAILG-COMPOSE-EMAIL-001,MAILG-REPLY-EMAIL-001
```

---

## Endpoints

### 1. Health Check

**Endpoint:** `GET /api/health`

**Description:** Check if the API server is running.

**Example:**
```bash
curl http://localhost:3001/api/health
```

**Response:**
```json
{
  "status": "ok",
  "message": "Mailg API server is running"
}
```

---

### 2. Get Expected State

**Endpoint:** `POST /api/v1/get_expected_state`

**Description:** Retrieves the expected state (prompt and assertions) for a task or all tasks.

**Request Body:**
```json
{
  "taskId": "MAILG-COMPOSE-EMAIL-001"  // Optional
}
```

**Response (Single Task):**
```json
{
  "taskId": "MAILG-COMPOSE-EMAIL-001",
  "prompt": "Compose a new email...",
  "assertions": [
    {
      "title": "Email should be sent",
      "operator": "EXISTS",
      "path": "emails[0]",
      "expected": true,
      "options": {}
    }
  ]
}
```

**Response (All Tasks - when taskId is omitted):**
```json
{
  "count": 14,
  "verifiers": {
    "MAILG-COMPOSE-EMAIL-001": {
      "prompt": "Compose a new email...",
      "assertions": [...]
    },
    "MAILG-REPLY-EMAIL-001": {
      "prompt": "Reply to email...",
      "assertions": [...]
    }
  }
}
```

**Examples:**

Get all tasks:
```bash
curl -X POST http://localhost:3001/api/v1/get_expected_state \
  -H "Content-Type: application/json" \
  -d '{}'
```

Get specific task:
```bash
curl -X POST http://localhost:3001/api/v1/get_expected_state \
  -H "Content-Type: application/json" \
  -d '{"taskId":"MAILG-COMPOSE-EMAIL-001"}'
```

---

### 3. Get Actual State

**Endpoint:** `POST /api/v1/get_actual_state`

**Description:** Executes assertions against localStorage data and returns results.

**Content-Type:** `multipart/form-data`

**Form Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | Task ID to verify |
| `localStorageDump` | File | Yes (localstorage mode) | JSON file containing localStorage data |
| `assertion` | string | No | Single assertion JSON for sub-checks |
| `modelResponse` | string | No | Model response for LLM-based assertions |
| `runId` | string | No | Run ID when using runid mode |

**Response:**
```json
{
  "taskId": "MAILG-COMPOSE-EMAIL-001",
  "prompt": "Compose a new email...",
  "assertions": [
    {
      "title": "Email should be sent",
      "operator": "EXISTS",
      "path": "emails[0]",
      "result": "pass",
      "error": null,
      "actual": {...},
      "expected": true,
      "options": {}
    }
  ]
}
```

**Assertion Result Fields:**
- `result`: `"pass"` or `"fail"`
- `actual`: The actual value extracted from localStorage
- `expected`: The expected value from the assertion
- `error`: Error message if the assertion failed (null if passed)
- `executionTime`: Time taken to execute (for LLM assertions)
- `score`: Numeric score (for RDT operators)
- `details`: Additional details (for RDT operators)

**Example:**

Create a localStorage dump file (localStorage.json):
```json
{
  "emails": "[{\"id\":1,\"from\":\"test@example.com\",\"subject\":\"Test\"}]",
  "loggedInUser": "{\"name\":\"John Doe\",\"email\":\"john.doe@example.com\"}",
  "currentView": "inbox"
}
```

Verify the task:
```bash
curl -X POST http://localhost:3001/api/v1/get_actual_state \
  -F "taskId=MAILG-COMPOSE-EMAIL-001" \
  -F "localStorageDump=@localStorage.json"
```

---

## Assertion Operators

The API supports the following assertion operators:

### Standard Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `EXISTS` | Checks if a value exists | `{ "operator": "EXISTS", "path": "emails[0]" }` |
| `NOT_EXISTS` | Checks if a value doesn't exist | `{ "operator": "NOT_EXISTS", "path": "drafts[0]" }` |
| `JSON_MATCH` | Deep equality check | `{ "operator": "JSON_MATCH", "path": "user", "expected": {...} }` |
| `STRING_MATCH` | String exact match | `{ "operator": "STRING_MATCH", "path": "emails[0].subject", "expected": "Test" }` |
| `STRING_CONTAINS` | String contains check | `{ "operator": "STRING_CONTAINS", "path": "emails[0].body", "expected": "Hello" }` |
| `ARRAY_LENGTH` | Array length check | `{ "operator": "ARRAY_LENGTH", "path": "emails", "expected": 5, "options": {"op": "=="} }` |
| `COMPARE` | Numeric/string/datetime comparison | `{ "operator": "COMPARE", "path": "count", "expected": 10, "options": {"op": ">", "type": "number"} }` |

### RDT Operators (LLM-based)

These require `modelResponse` parameter and OpenRouter API credentials:

| Operator | Description | Required Fields |
|----------|-------------|-----------------|
| `FACTUAL_VERIFICATION` | Verifies facts in model response | `description`, `expected_facts[]` |
| `REASONING_QUALITY` | Evaluates reasoning quality | `description`, `aspects[]` |
| `INFORMATION_PRECISION` | Checks information precision | `description`, `expected_facts[]`, `expected_reasonings[]` |

**Example RDT Assertion:**
```json
{
  "operator": "FACTUAL_VERIFICATION",
  "description": "Verify price comparison facts",
  "expected_facts": [
    { "fact": "Safeway price is $5.89", "weight": 1.0 },
    { "fact": "Gus's price is $3.29", "weight": 1.0 }
  ],
  "pass_threshold_percent": 80
}
```

---

## Error Responses

**400 Bad Request:**
```json
{
  "error": "taskId is required"
}
```

**404 Not Found:**
```json
{
  "error": "Task not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "details": "Error message here"
}
```

---

## Testing with Postman

1. **Import Collection:** Create a new collection in Postman
2. **Set Base URL:** `http://localhost:3001`
3. **Test Health Check:**
   - Method: `GET`
   - URL: `/api/health`

4. **Test Get Expected State:**
   - Method: `POST`
   - URL: `/api/v1/get_expected_state`
   - Headers: `Content-Type: application/json`
   - Body (raw JSON): `{"taskId": "MAILG-COMPOSE-EMAIL-001"}`

5. **Test Get Actual State:**
   - Method: `POST`
   - URL: `/api/v1/get_actual_state`
   - Body (form-data):
     - `taskId`: `MAILG-COMPOSE-EMAIL-001`
     - `localStorageDump`: (select file)

---

## File Structure

```
mailg/
├── server.js                           # Express server entry point
├── src/
│   ├── api/
│   │   └── v1/
│   │       ├── get_expected_state.js  # Get expected state endpoint
│   │       └── get_actual_state.js    # Get actual state endpoint
│   ├── lib/
│   │   ├── assertion-engine.ts        # Core assertion engine (TypeScript)
│   │   └── utils/
│   │       ├── assertion-operators.ts # Assertion operators (TypeScript)
│   │       ├── assertion-operators.js # (Will be created if needed)
│   │       └── path-resolver.js       # Path resolution utilities
│   └── data/
│       ├── tasks.json                 # Task definitions with prompts & assertions
│       └── judges.json                # LLM judge prompt templates
├── .env                               # Environment variables
└── package.json                       # Dependencies and scripts
```

---

## Next Steps

1. **Add Assertions:** Update `src/data/tasks.json` with assertion definitions (Saimanish's task)
2. **Implement verify_raw Page:** Copy from Mira to provide UI for testing (Michael's task)
3. **Test with Real Data:** Run tasks against the harness
4. **Debug & Iterate:** Fix any issues found during testing

---

## Notes

- The TypeScript files (`assertion-engine.ts`, `assertion-operators.ts`) are copied from Mira but not compiled. The API uses fallback JavaScript implementations for basic operators.
- For production use, consider compiling TypeScript files or converting them to JavaScript.
- LLM-based assertions require valid OpenRouter API credentials in `.env`.
- The `TASK_IDS` environment variable can filter which tasks are available for verification.

---

## Support

For issues or questions:
- Check the Mira reference implementation at `../mira`
- Review assertion examples in `src/data/tasks.json`
- Consult the team on Slack
