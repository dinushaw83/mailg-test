# Search Suggestions API

The Search Suggestions API provides autocomplete functionality for the search bar, returning contextual suggestions based on user input.

## Endpoint

```
GET /api/v1/search/suggestions
```

## Authentication

Requires a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `q` | string | Yes | - | The partial query string for suggestions |
| `limit` | integer | No | 10 | Maximum number of suggestions per category (1-20) |

## Response Format

```json
{
  "data": {
    "contacts": [],
    "labels": [],
    "folders": [],
    "categories": [],
    "recent_searches": [],
    "operators": []
  }
}
```

Each suggestion item (except `recent_searches`) has the following structure:

```json
{
  "value": "string",
  "type": "string",
  "description": "string or null"
}
```

## Suggestion Types

The API returns different suggestions based on the query prefix:

### 1. Operator Suggestions (General Query)

When the query doesn't start with a known operator prefix, the API returns available search operators filtered by the query.

**Trigger:** Any query that doesn't match other prefixes (e.g., `""`, `"fr"`, `"is"`)

**Example:**
```bash
curl -X GET 'http://localhost:8766/api/v1/search/suggestions?q=fr' \
  -H 'Authorization: Bearer <token>'
```

**Response:**
```json
{
  "data": {
    "operators": [
      {"value": "from:", "type": "operator", "description": "Search by sender"}
    ],
    "recent_searches": ["from:boss@company.com"],
    "contacts": [],
    "labels": [],
    "folders": [],
    "categories": []
  }
}
```

**Available Operators:**

| Operator | Description |
|----------|-------------|
| `from:` | Search by sender |
| `to:` | Search by recipient |
| `cc:` | Search by CC recipient |
| `bcc:` | Search by BCC recipient |
| `subject:` | Search in subject |
| `has:attachment` | Has attachments |
| `has:userlabels` | Has user labels |
| `is:unread` | Unread emails |
| `is:starred` | Starred emails |
| `is:important` | Important emails |
| `in:` | Filter by folder |
| `label:` | Filter by label |
| `category:` | Filter by category |
| `filename:` | Filter by attachment name |
| `size:` | Filter by size (e.g., `size:10M`) |
| `larger:` | Larger than size |
| `smaller:` | Smaller than size |
| `deliveredto:` | Delivered to address |

### 2. Contact Suggestions (`from:` or `to:`)

When the query starts with `from:` or `to:`, the API returns matching contacts.

**Trigger:** `from:<partial>` or `to:<partial>`

**Example:**
```bash
curl -X GET 'http://localhost:8766/api/v1/search/suggestions?q=from:john' \
  -H 'Authorization: Bearer <token>'
```

**Response:**
```json
{
  "data": {
    "contacts": [
      {"value": "john.doe@example.com", "type": "contact", "description": "John Doe"},
      {"value": "johnny@company.com", "type": "contact", "description": "Johnny Smith"}
    ],
    "operators": [],
    "labels": [],
    "folders": [],
    "categories": [],
    "recent_searches": []
  }
}
```

**Matching Criteria:**
- Email address contains the partial
- First name contains the partial
- Last name contains the partial

### 3. Label Suggestions (`label:`)

When the query starts with `label:`, the API returns the user's labels matching the partial.

**Trigger:** `label:<partial>`

**Example:**
```bash
curl -X GET 'http://localhost:8766/api/v1/search/suggestions?q=label:work' \
  -H 'Authorization: Bearer <token>'
```

**Response:**
```json
{
  "data": {
    "labels": [
      {"value": "Work", "type": "label", "description": null},
      {"value": "Work/Projects", "type": "label", "description": null}
    ],
    "contacts": [],
    "operators": [],
    "folders": [],
    "categories": [],
    "recent_searches": []
  }
}
```

**Notes:**
- Only returns labels owned by the current user
- Includes nested labels with hierarchy (e.g., `Parent/Child`)
- Matches by label name (case-insensitive)

### 4. Folder Suggestions (`in:`)

When the query starts with `in:`, the API returns available folders matching the partial.

**Trigger:** `in:<partial>`

**Example:**
```bash
curl -X GET 'http://localhost:8766/api/v1/search/suggestions?q=in:s' \
  -H 'Authorization: Bearer <token>'
```

**Response:**
```json
{
  "data": {
    "folders": [
      {"value": "sent", "type": "folder", "description": "Sent folder"},
      {"value": "spam", "type": "folder", "description": "Spam folder"},
      {"value": "starred", "type": "folder", "description": "Starred items"},
      {"value": "snoozed", "type": "folder", "description": "Snoozed messages"}
    ],
    "contacts": [],
    "labels": [],
    "operators": [],
    "categories": [],
    "recent_searches": []
  }
}
```

**Available Folders:**

| Folder | Description |
|--------|-------------|
| `inbox` | Inbox folder |
| `sent` | Sent folder |
| `drafts` | Drafts folder |
| `trash` | Trash folder |
| `spam` | Spam folder |
| `starred` | Starred items |
| `anywhere` | Search all folders |
| `archive` | Archived messages |
| `snoozed` | Snoozed messages |

### 5. Category Suggestions (`category:`)

When the query starts with `category:`, the API returns available categories matching the partial.

**Trigger:** `category:<partial>`

**Example:**
```bash
curl -X GET 'http://localhost:8766/api/v1/search/suggestions?q=category:p' \
  -H 'Authorization: Bearer <token>'
```

**Response:**
```json
{
  "data": {
    "categories": [
      {"value": "primary", "type": "category", "description": "Primary category"},
      {"value": "promotions", "type": "category", "description": "Promotions category"}
    ],
    "contacts": [],
    "labels": [],
    "folders": [],
    "operators": [],
    "recent_searches": []
  }
}
```

**Available Categories:**

| Category | Description |
|----------|-------------|
| `primary` | Primary category |
| `social` | Social category |
| `promotions` | Promotions category |
| `updates` | Updates category |
| `forums` | Forums category |

## Recent Searches

Recent searches are returned when the query doesn't match a specific operator prefix. They are filtered to include only saved searches that contain the query string.

**Example:**
```bash
curl -X GET 'http://localhost:8766/api/v1/search/suggestions?q=unread' \
  -H 'Authorization: Bearer <token>'
```

**Response:**
```json
{
  "data": {
    "recent_searches": ["is:unread from:team@company.com", "is:unread has:attachment"],
    "operators": [],
    "contacts": [],
    "labels": [],
    "folders": [],
    "categories": []
  }
}
```

## Using the Limit Parameter

The `limit` parameter controls the maximum number of suggestions returned per category.

**Example:**
```bash
curl -X GET 'http://localhost:8766/api/v1/search/suggestions?q=in:&limit=3' \
  -H 'Authorization: Bearer <token>'
```

This returns at most 3 folder suggestions.

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 401 | Unauthorized - Missing or invalid token |
| 422 | Validation Error - Invalid parameters |

## Integration Example

Here's how to integrate suggestions in a search input:

```javascript
async function fetchSuggestions(query) {
  const response = await fetch(
    `/api/v1/search/suggestions?q=${encodeURIComponent(query)}&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const { data } = await response.json();
  
  // Combine all suggestion types for display
  const suggestions = [
    ...data.operators,
    ...data.contacts,
    ...data.labels,
    ...data.folders,
    ...data.categories,
    ...data.recent_searches.map(q => ({ value: q, type: 'recent' }))
  ];
  
  return suggestions;
}

// Usage with debounce
const debouncedFetch = debounce(fetchSuggestions, 300);

searchInput.addEventListener('input', async (e) => {
  const suggestions = await debouncedFetch(e.target.value);
  renderSuggestions(suggestions);
});
```

## Summary Table

| Query Pattern | Returns | Filtered By |
|---------------|---------|-------------|
| `""` or general text | Operators + Recent searches | Query prefix match |
| `from:<partial>` | Contacts | Email, first name, last name |
| `to:<partial>` | Contacts | Email, first name, last name |
| `label:<partial>` | User's labels | Label name |
| `in:<partial>` | Folders | Folder name prefix |
| `category:<partial>` | Categories | Category name prefix |
