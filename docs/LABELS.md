# Labels System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Data Structures](#data-structures)
3. [Key Files](#key-files)
4. [Label Storage and Format](#label-storage-and-format)
5. [Core Logic Flows](#core-logic-flows)
6. [Label Operations](#label-operations)
7. [Label Display](#label-display)
8. [Email-Label Relationships](#email-label-relationships)

## Overview

The labels system in this application provides Gmail-like functionality for organizing emails using hierarchical labels. Labels can be nested (e.g., "Parent/child/subchild") and support both system labels (built-in) and custom labels created by users.

### Key Features

- **Hierarchical Labels**: Labels can be nested with parent-child relationships
- **Dual Format Support**: Handles both UUID-based labels (from backend) and composite key labels (legacy/frontend)
- **Thread-based Operations**: Labels are applied to email threads (not individual messages)
- **3-state Checkbox UI**: Similar to Gmail, with checked/unchecked/indeterminate states
- **Batch Operations**: Apply labels to multiple selected emails at once
- **Search and Filter**: Search labels by name and filter emails by labels

## Data Structures

### Redux State Structure

Labels are stored in Redux state under `state.mail`:

```javascript
{
  // Labels stored by UUID (backend labels) or composite key (system labels)
  labels: {
    [labelId]: {
      id: "uuid-string",           // UUID for backend labels
      name: "Label Name",          // Display name
      color: "#FF0000",            // Hex color (optional)
      parent_id: "parent-uuid",    // UUID of parent label (for backend labels)
      parentKey: "Parent::Child",  // Composite key of parent (computed/derived)
      system: false,               // true for system labels (Inbox, Sent, etc.)
      email_count: 0               // Number of emails with this label
    },
    // System labels example:
    "Inbox": {
      system: true,
      name: "Inbox",
      color: null
    },
    // Backend label example:
    "abc-123-uuid": {
      id: "abc-123-uuid",
      name: "Work",
      color: "#2272155",
      parent_id: null,
      parentKey: null,
      system: false
    }
  },
  
  // Mapping: UUID -> Composite Key
  // Example: { "abc-123-uuid": "Work", "def-456-uuid": "Work::Clients" }
  labelIdToKeyMap: {
    [uuid]: compositeKey
  },
  
  // Mapping: Composite Key -> UUID
  // Example: { "Work": "abc-123-uuid", "Work::Clients": "def-456-uuid" }
  keyToLabelIdMap: {
    [compositeKey]: uuid
  }
}
```

### Email Label Structure

Emails store labels as an array of strings. The format depends on the label type:

```javascript
{
  id: "email-id",
  thread_id: "thread-id",
  labels: [
    "Inbox",                    // System label (composite key format)
    "abc-123-uuid",             // Backend label (UUID format)
    "Parent::child::subchild"   // Legacy label (composite key format)
  ]
}
```

### Composite Key Format

Composite keys represent hierarchical label paths using `::` as separator:

- **Root label**: `"Work"`
- **Nested label**: `"Work::Clients"`
- **Deeply nested**: `"Work::Clients::Invoices"`

When displayed to users, `::` is replaced with `/`:
- `"Work::Clients::Invoices"` → `"Work/Clients/Invoices"`

## Key Files

### Core Files

#### 1. `src/hooks/useLabels.js`
**Purpose**: Main hook for label management

**Key Functions**:
- `createLabel(name, { parentKey, color })` - Create a new label
- `renameLabel(key, newName, newParentKey)` - Rename/move a label
- `deleteLabel(key)` - Delete a label
- `setLabelColor(key, color, { withSublabels })` - Update label color
- `getSelectionLabels(selectedIds, folder)` - Get label state for selected emails
- `labelTree` - Computed tree structure of labels
- `addLabelToThread(thread_id, labelKey)` - Add label to thread
- `removeLabelFromThread(thread_id, labelKey)` - Remove label from thread

**Key Exports**:
- `makeKey(name, parentKey)` - Build composite key from name and parent
- `splitKey(key)` - Parse composite key into parent and name
- `getPathLabelFromKey(labelsMap, key)` - Get display path from composite key
- `flattenTreeForSelect(roots)` - Convert tree to flat list for dropdowns

#### 2. `src/components/MailActions/Labels.jsx`
**Purpose**: UI component for managing labels on selected emails

**Key Features**:
- Popover with searchable label list
- 3-state checkboxes (checked/unchecked/indeterminate)
- Shows full label path (e.g., "Parent/child/subchild")
- Apply button to commit changes
- Undo support via snackbar

**State Management**:
- `overrides` - Pending checkbox changes (not applied until "Apply" clicked)
- `currentLabels` - Labels currently on all selected emails
- `labelCounts` - Count of how many selected emails have each label

#### 3. `src/utils/labelTransform.js`
**Purpose**: Transform between backend (UUID) and frontend (composite key) formats

**Key Functions**:
- `transformLabelsArray(labelsArray)` - Convert backend labels to frontend format
- `buildIdToKeyMapping(labelsArray)` - Build UUID → composite key mapping
- `buildKeyToIdMapping(idToKeyMap)` - Build composite key → UUID mapping
- `beToFeLabel(beLabel, idToKeyMap)` - Convert single backend label to frontend
- `feToBeLabel(feLabel, keyToIdMap)` - Convert frontend label to backend format

#### 4. `src/utils/labelSync.js`
**Purpose**: Utilities for synchronizing labels when labels are created/renamed/deleted

**Key Functions**:
- `remapEmailLabels(emails, oldKeyMap, newKeyMap)` - Update email label references when labels are renamed
- `syncLabelReferences(emails, deletedLabelIds)` - Remove deleted label references from emails
- `transformEmailLabelsToIds(emails, keyToIdMap)` - Convert composite keys to UUIDs
- `transformEmailLabelsToKeys(emails, idToKeyMap)` - Convert UUIDs to composite keys
- `buildLabelPath(labelKey, labelMeta, labels, labelIdToKeyMap, getPathLabelFromKey)` - Build full label path for display

#### 5. `src/store/slices/mailSlice.js`
**Purpose**: Redux slice for label state management

**Thunks**:
- `fetchLabels()` - Fetch all labels from backend
- `createLabelThunk({ name, color, parent_id })` - Create label via API
- `updateLabelThunk({ id, name, color, parent_id })` - Update label via API
- `deleteLabelThunk(id)` - Delete label via API
- `updateLabelsThunk({ emailIds, labels })` - Update labels on emails via API

**State**:
- Stores labels, labelIdToKeyMap, keyToLabelIdMap
- Handles label CRUD operations
- Manages label transformation and mapping

#### 6. `src/services/labelService.js`
**Purpose**: API service for label operations

**Endpoints**:
- `GET /v1/labels` - Fetch all labels
- `POST /v1/labels` - Create new label
- `PATCH /v1/labels/:id` - Update label
- `DELETE /v1/labels/:id` - Delete label

#### 7. `src/hooks/useMailActions.js`
**Purpose**: Hook for email actions including label operations

**Key Functions**:
- `addLabels(ids, labelKeys)` - Add labels to emails (local state update)
- `removeLabels(ids, labelKeys)` - Remove labels from emails (local state update)
- `modifyLabels(ids, { add, remove })` - Add and remove labels in one operation
- Uses `updateLabelsThunk` to sync with backend API

## Label Storage and Format

### Backend Format (API Response)

Backend returns labels with UUID-based structure:

```javascript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Work",
  color: "#2272155",
  parent_id: null,  // UUID of parent, or null for root labels
  email_count: 42
}
```

### Frontend Format (Redux State)

Frontend transforms backend labels to include composite keys:

```javascript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Work",
  color: "#2272155",
  parent_id: null,
  parentKey: null,  // Computed composite key of parent
  system: false,
  email_count: 42
}
```

### Email Labels Format

Emails store labels as arrays of strings:

```javascript
{
  labels: [
    "Inbox",                              // System label (composite key)
    "550e8400-e29b-41d4-a716-446655440000",  // Backend label (UUID)
    "Work::Clients"                       // Legacy label (composite key)
  ]
}
```

### Key Mappings

The system maintains two bidirectional mappings:

1. **labelIdToKeyMap**: `{ [uuid]: compositeKey }`
   - Example: `{ "abc-123": "Work::Clients" }`
   - Used to convert UUID → composite key for display

2. **keyToLabelIdMap**: `{ [compositeKey]: uuid }`
   - Example: `{ "Work::Clients": "abc-123" }`
   - Used to convert composite key → UUID for API calls

## Core Logic Flows

### Label Fetching Flow

```
1. Component mounts/needs labels
   ↓
2. Dispatch fetchLabels() thunk
   ↓
3. labelService.getLabels() → GET /v1/labels
   ↓
4. Backend returns array of label objects (UUID-based)
   ↓
5. transformLabelsArray() processes labels:
   - Builds idToKeyMap (UUID → composite key)
   - Builds keyToIdMap (composite key → UUID)
   - Transforms each label to include parentKey
   ↓
6. Redux state updated:
   - labels: { [uuid]: transformedLabel }
   - labelIdToKeyMap: { [uuid]: compositeKey }
   - keyToLabelIdMap: { [compositeKey]: uuid }
```

### Label Creation Flow

```
1. User clicks "Create Label" in UI
   ↓
2. useLabels().createLabel(name, { parentKey, color })
   ↓
3. Convert parentKey → parent_id (UUID) using keyToLabelIdMap
   ↓
4. Dispatch createLabelThunk({ name, color, parent_id })
   ↓
5. labelService.createLabel() → POST /v1/labels
   ↓
6. Backend creates label, returns new label object
   ↓
7. React Query cache invalidation triggers refetch
   ↓
8. fetchLabels() runs again, updates Redux state with new label
```

### Label Application Flow (Apply Labels to Emails)

```
1. User selects emails and opens Labels popover
   ↓
2. Labels.jsx displays labels with current state:
   - getSelectionLabels(selectedIds, folder) determines:
     * currentLabels: Set of labels on ALL selected emails
     * labelCounts: Map of label → count (how many emails have it)
     * nSel: Number of selected emails
   ↓
3. User clicks checkboxes (updates local overrides state)
   - Checkboxes show: checked/unchecked/indeterminate based on currentLabels
   - User changes stored in overrides (not applied yet)
   ↓
4. User clicks "Apply" button
   ↓
5. handleApplyLabels() processes overrides:
   - labelsToAdd: Labels marked as "checked" but not on all emails
   - labelsToRemove: Labels marked as "unchecked" but currently on some/all emails
   ↓
6. modifyLabels(ids, { add: labelsToAdd, remove: labelsToRemove })
   ↓
7. useMailActions.modifyLabels():
   - Updates local email state (adds/removes labels)
   - Dispatches updateLabelsThunk({ emailIds, labels }) for API sync
   ↓
8. updateLabelsThunk → POST /v1/emails/labels (or similar endpoint)
   ↓
9. Backend updates email labels
   ↓
10. Snackbar shown with undo support
```

### Label Path Building Flow

```
1. Component needs to display label path (e.g., "Parent/child/subchild")
   ↓
2. buildLabelPath(labelKey, labelMeta, labels, labelIdToKeyMap, getPathLabelFromKey)
   ↓
3. Check if labelIdToKeyMap[labelKey] exists:
   - Yes: Get composite key, use getPathLabelFromKey(labels, compositeKey)
   - No: Continue to step 4
   ↓
4. Check if labelKey is composite key (contains "::"):
   - Yes: Use getPathLabelFromKey(labels, labelKey) directly
   - No: Continue to step 5
   ↓
5. Build path by traversing parent relationships:
   - Start with current label
   - Follow parent_id or parentKey to parent
   - Repeat until root reached
   - Build path array: [root, child, grandchild]
   - Join with "/": "root/child/grandchild"
```

### Folder-Aware Label Selection

When `getSelectionLabels(selectedIds, folder)` is called with a folder parameter:

```
1. Determine emails to search:
   - If folder === "inbox":
     * Check all category arrays (primary, promotions, social, updates)
     * Optimize: Only search categories that contain selected thread_ids
     * Deduplicate by thread_id
   - Otherwise:
     * Map folder name to Redux state key:
       - "sent" → state.sent
       - "trash" → state.trash
       - "spam" → state.spam
       - "starred" → state.is_starred
       - etc.
     * Get emails from that folder
   ↓
2. Search emails by thread_id (not id):
   - Match selectedIds against email.thread_id
   ↓
3. Count labels across matching emails:
   - labelCounts: Map<labelKey, count>
   - Count how many emails have each label
   ↓
4. Determine currentLabels (intersection):
   - Labels that appear on ALL selected emails
   - Only labels with count === nSel
```

## Label Operations

### Creating a Label

**File**: `src/hooks/useLabels.js` → `createLabel`

```javascript
// Usage
const { createLabel } = useLabels();
await createLabel("Work", { 
  parentKey: null,  // null for root, or composite key like "Parent"
  color: "#FF0000"  // Optional hex color
});
```

**Flow**:
1. Validates name (non-empty, unique)
2. Converts `parentKey` (composite) → `parent_id` (UUID) if provided
3. Dispatches `createLabelThunk` to backend
4. Backend creates label and returns it
5. React Query invalidates labels cache
6. Labels refetch, Redux state updates

### Updating a Label (Rename/Move/Color)

**File**: `src/hooks/useLabels.js` → `renameLabel`, `setLabelColor`

```javascript
// Rename/Move
const { renameLabel } = useLabels();
await renameLabel("old-composite-key", "New Name", "new-parent-key");

// Update Color
const { setLabelColor } = useLabels();
await setLabelColor("composite-key", "#FF0000", { withSublabels: true });
```

**Flow**:
1. Find label by key (composite key or UUID)
2. Convert parent keys to UUIDs if needed
3. Dispatch `updateLabelThunk` to backend
4. Update local Redux state
5. Rebuild mappings if name/parent changed

### Deleting a Label

**File**: `src/hooks/useLabels.js` → `deleteLabel`

```javascript
const { deleteLabel } = useLabels();
await deleteLabel("composite-key-or-uuid");
```

**Flow**:
1. Validate label exists and is not system label
2. Dispatch `deleteLabelThunk` to backend
3. Backend handles cascade delete (removes from emails)
4. Remove label from Redux state
5. Remove from mappings (labelIdToKeyMap, keyToLabelIdMap)

### Applying Labels to Emails

**File**: `src/hooks/useMailActions.js` → `modifyLabels`

```javascript
const { modifyLabels } = useMailActions();
modifyLabels(
  ["thread-id-1", "thread-id-2"],  // Email/thread IDs
  {
    add: ["label-uuid-1", "label-uuid-2"],      // Labels to add
    remove: ["label-uuid-3"]                    // Labels to remove
  }
);
```

**Flow**:
1. Update local email state (add/remove labels)
2. Dispatch `updateLabelsThunk` for API sync
3. Backend updates email labels
4. Show success snackbar with undo

**Important**: Labels are applied to threads, not individual messages. All messages in a thread share the same labels.

## Label Display

### Building Full Label Path

**Function**: `src/utils/labelSync.js` → `buildLabelPath`

**Purpose**: Convert label key to full display path (e.g., "Parent/child/subchild")

**Algorithm**:
1. If `labelIdToKeyMap[labelKey]` exists → use composite key → `getPathLabelFromKey`
2. If labelKey contains `"::"` → it's a composite key → `getPathLabelFromKey` directly
3. Otherwise → traverse parent relationships recursively:
   - Start with current label
   - Follow `parent_id` or `parentKey`
   - Build path array from root to leaf
   - Join with `"/"`

**Example**:
```javascript
// Label stored by UUID with parent_id relationships:
labelKey: "child-uuid"
labelMeta: { id: "child-uuid", name: "Subchild", parent_id: "parent-uuid" }
labels: {
  "parent-uuid": { id: "parent-uuid", name: "Parent", parent_id: null },
  "child-uuid": { id: "child-uuid", name: "Subchild", parent_id: "parent-uuid" }
}

// Traversal:
1. Start: "child-uuid" → "Subchild" (add to path)
2. Follow parent_id: "parent-uuid" → "Parent" (add to path start)
3. parent_id is null → stop
4. Result: ["Parent", "Subchild"] → "Parent/Subchild"
```

### Getting Path from Composite Key

**Function**: `src/hooks/useLabels.js` → `getPathLabelFromKey`

**Purpose**: Convert composite key to display path using labels map

**Algorithm**:
1. Split composite key by `"::"`
2. For each cumulative segment (e.g., "Parent", "Parent::Child"):
   - Look up segment in labels map
   - Get name from labels map, or use segment as fallback
3. Join all names with `"/"`

**Example**:
```javascript
compositeKey: "Work::Clients::Invoices"
labels: {
  "Work": { name: "Work" },
  "Work::Clients": { name: "Clients" },
  "Work::Clients::Invoices": { name: "Invoices" }
}

// Process:
1. ["Work"] → lookup "Work" → "Work"
2. ["Work", "Clients"] → lookup "Work::Clients" → "Clients"
3. ["Work", "Clients", "Invoices"] → lookup "Work::Clients::Invoices" → "Invoices"
4. Result: "Work/Clients/Invoices"
```

### 3-State Checkbox Logic

**File**: `src/components/MailActions/Labels.jsx`

**States**:
- **Checked** (✓): Label is on ALL selected emails
  - Condition: `count === nSel` and `nSel > 0`
- **Indeterminate** (⊟): Label is on SOME (but not all) selected emails
  - Condition: `count > 0` and `count < nSel` and `nSel > 1`
- **Unchecked** (☐): Label is on NONE of the selected emails
  - Condition: `count === 0`

**State Cycling**:
- For indeterminate labels: `indeterminate → checked → unchecked → indeterminate...`
- For normal labels: `checked ↔ unchecked`

**Implementation**:
```javascript
const count = labelCounts.get(label.key) || 0;
const baselineChecked = nSel > 0 && count === nSel;
const baselineSome = nSel > 1 && count > 0 && count < nSel;

let baselineState = "unchecked";
if (baselineChecked) baselineState = "checked";
else if (baselineSome) baselineState = "indeterminate";

// User override takes precedence
const effectiveState = overrides[label.key] || baselineState;
```

## Email-Label Relationships

### How Labels are Stored on Emails

Emails store labels as an array of strings:

```javascript
{
  id: "email-123",
  thread_id: "thread-456",
  labels: [
    "Inbox",                    // System label
    "550e8400-e29b-41d4...",   // Backend label (UUID)
    "Work::Clients"             // Legacy label (composite key)
  ]
}
```

### Matching Emails by Labels

**Function**: `src/utils/emails.js` → `getThreadRows`

Labels are used to filter emails/threads. The filtering logic checks if labels array includes the target label key.

### Applying Labels to Threads

Labels are applied at the thread level, not message level. When a label is applied:
- All messages in the thread get the label
- The label appears in `email.labels` array for each message
- Thread operations use `thread_id` to identify which messages to update

**Example**:
```javascript
// Thread with 3 messages
thread_id: "thread-123"
messages: [
  { id: "msg-1", thread_id: "thread-123", labels: ["Inbox"] },
  { id: "msg-2", thread_id: "thread-123", labels: ["Inbox"] },
  { id: "msg-3", thread_id: "thread-123", labels: ["Inbox"] }
]

// Apply "Work" label
addLabels(["thread-123"], ["work-uuid"])

// All messages updated:
messages: [
  { id: "msg-1", thread_id: "thread-123", labels: ["Inbox", "work-uuid"] },
  { id: "msg-2", thread_id: "thread-123", labels: ["Inbox", "work-uuid"] },
  { id: "msg-3", thread_id: "thread-123", labels: ["Inbox", "work-uuid"] }
]
```

### Searching Emails by Folder and Labels

**Function**: `src/hooks/useLabels.js` → `getSelectionLabels`

When determining which labels are on selected emails, the function:

1. **Gets emails from correct folder**:
   - If `folder === "inbox"`: Searches all category arrays (primary, promotions, social, updates)
   - Otherwise: Gets emails from specific folder in Redux state

2. **Matches by thread_id**:
   - Uses `thread_id` (not `id`) to match selected emails
   - Allows selecting by thread, not individual message

3. **Counts labels**:
   - Iterates through all matching emails
   - Counts how many emails have each label
   - Builds `labelCounts` Map

4. **Determines intersection**:
   - Labels on ALL emails: `count === nSel`
   - Labels on SOME emails: `0 < count < nSel`
   - Labels on NONE: `count === 0`

## Key Concepts

### Composite Keys vs UUIDs

- **Composite Keys**: Used for display and legacy system labels
  - Format: `"Parent::child::subchild"`
  - Human-readable, hierarchical
  - Used for system labels (Inbox, Sent, etc.)

- **UUIDs**: Used for backend labels and API calls
  - Format: `"550e8400-e29b-41d4-a716-446655440000"`
  - Unique identifiers from database
  - Used for all backend-created labels

### Label Keys in Different Contexts

The same label can be referenced by different keys:

```javascript
// Label: "Work" (created in backend)
UUID: "abc-123-uuid"
Composite Key: "Work"

// In email.labels array:
labels: ["abc-123-uuid"]  // UUID format

// In Redux state:
labels: {
  "abc-123-uuid": {
    id: "abc-123-uuid",
    name: "Work",
    parentKey: null
  }
}

// In labelIdToKeyMap:
labelIdToKeyMap: {
  "abc-123-uuid": "Work"
}

// In keyToLabelIdMap:
keyToLabelIdMap: {
  "Work": "abc-123-uuid"
}

// In Labels.jsx component:
availableLabels: [
  {
    key: "abc-123-uuid",        // Original key for operations
    fullPath: "Work",            // Display path
    name: "Work",                // Label name
    color: "#2272155"            // Label color
  }
]
```

### Thread-Based Operations

All label operations work at the thread level:

- When applying a label to a thread, all messages in that thread get the label
- When removing a label from a thread, all messages lose the label
- `thread_id` is used to match emails, not `id`
- This ensures consistency: all messages in a conversation share the same labels

### System Labels vs Custom Labels

**System Labels**:
- Built-in labels: Inbox, Sent, Drafts, Spam, Trash, etc.
- Cannot be deleted or renamed (usually)
- Stored as composite keys (e.g., "Inbox", "Sent")
- Have `system: true` flag

**Custom Labels**:
- Created by users
- Stored as UUIDs in backend
- Can be nested under other labels
- Have `system: false` flag

## API Integration

### Endpoints

All label operations go through these endpoints:

- `GET /v1/labels` - Fetch all labels
- `POST /v1/labels` - Create label
  ```json
  {
    "name": "Work",
    "color": "#FF0000",
    "parent_id": null
  }
  ```

- `PATCH /v1/labels/:id` - Update label
  ```json
  {
    "name": "New Name",
    "color": "#00FF00",
    "parent_id": "parent-uuid"
  }
  ```

- `DELETE /v1/labels/:id` - Delete label

- `POST /v1/emails/labels` (or similar) - Update labels on emails
  ```json
  {
    "emailIds": ["email-1", "email-2"],
    "labels": {
      "add": ["label-uuid-1"],
      "remove": ["label-uuid-2"]
    }
  }
  ```

### Response Format

Backend returns labels in this format:

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Work",
      "color": "#2272155",
      "parent_id": null,
      "email_count": 42
    }
  ],
  "message": "Labels fetched successfully",
  "statusCode": 200
}
```

## File Reference Summary

| File | Purpose | Key Exports/Functions |
|------|---------|----------------------|
| `src/hooks/useLabels.js` | Main label management hook | `useLabels()`, `makeKey()`, `splitKey()`, `getPathLabelFromKey()`, `flattenTreeForSelect()` |
| `src/components/MailActions/Labels.jsx` | Labels UI component | `Labels` component with 3-state checkboxes |
| `src/utils/labelTransform.js` | Format conversion utilities | `transformLabelsArray()`, `buildIdToKeyMapping()`, `beToFeLabel()`, `feToBeLabel()` |
| `src/utils/labelSync.js` | Label synchronization utilities | `buildLabelPath()`, `remapEmailLabels()`, `syncLabelReferences()` |
| `src/store/slices/mailSlice.js` | Redux state management | `fetchLabels()`, `createLabelThunk()`, `updateLabelThunk()`, `deleteLabelThunk()`, `updateLabelsThunk()` |
| `src/services/labelService.js` | API service layer | `getLabels()`, `createLabel()`, `updateLabel()`, `deleteLabel()` |
| `src/hooks/useMailActions.js` | Email actions hook | `addLabels()`, `removeLabels()`, `modifyLabels()` |

## Common Patterns

### Creating a Nested Label

```javascript
const { createLabel } = useLabels();

// Create root label
await createLabel("Work", { parentKey: null, color: "#FF0000" });

// Create child label
await createLabel("Clients", { parentKey: "Work", color: "#00FF00" });

// Create grandchild label
await createLabel("Invoices", { parentKey: "Work::Clients" });
```

### Finding Labels on Selected Emails

```javascript
const { getSelectionLabels } = useLabels();
const { folder } = useParams(); // Current folder (e.g., "inbox", "sent")

const { currentLabels, labelCounts, nSel } = getSelectionLabels(
  selectedIds,  // Array of thread IDs
  folder        // Optional: folder to search in
);

// currentLabels: Set of labels on ALL selected emails
// labelCounts: Map of label → count
// nSel: Number of selected emails
```

### Building Label Path for Display

```javascript
import { buildLabelPath } from "../../utils/labelSync";
import { getPathLabelFromKey } from "../../hooks/useLabels";
import { useSelector } from "react-redux";

const labelIdToKeyMap = useSelector((state) => state.mail.labelIdToKeyMap || {});
const labels = useSelector((state) => state.mail.labels || {});

// For a label with UUID
const labelKey = "abc-123-uuid";
const labelMeta = labels[labelKey];
const fullPath = buildLabelPath(labelKey, labelMeta, labels, labelIdToKeyMap, getPathLabelFromKey);
// Result: "Parent/child/subchild"
```

### Converting Between Key Formats

```javascript
import { useSelector } from "react-redux";

const labelIdToKeyMap = useSelector((state) => state.mail.labelIdToKeyMap || {});
const keyToLabelIdMap = useSelector((state) => state.mail.keyToLabelIdMap || {});

// UUID → Composite Key
const uuid = "abc-123-uuid";
const compositeKey = labelIdToKeyMap[uuid]; // "Work::Clients"

// Composite Key → UUID
const compositeKey = "Work::Clients";
const uuid = keyToLabelIdMap[compositeKey]; // "abc-123-uuid"
```

## Future Improvements

### TODO / Known Issues

1. **API Endpoint for Label Updates on Emails**: Currently using `modifyLabels` which updates local state. Need to implement actual API call when endpoint is ready.

2. **Label Count Updates**: Email counts on labels (`email_count`) are fetched from backend but may not update immediately after applying labels.

3. **Optimistic Updates**: Currently labels are updated optimistically (local state first), then synced with backend. Consider error handling if sync fails.

4. **Performance**: When many labels exist, building label tree and paths can be expensive. Consider memoization improvements.

5. **Search Performance**: Searching emails by labels in large inboxes could be optimized with indexing.

## References

- API Contract: See `docs/API_CONTRACT_OPENAPI.md` for label API endpoints
- Email Flows: See `docs/EMAIL_API_FLOWS.md` for email-label interaction flows
