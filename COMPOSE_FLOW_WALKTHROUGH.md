# Compose Button Click Flow - Complete Walkthrough

## Overview
This document traces the complete flow from clicking the compose button to opening a compose window, including all state changes, API calls, and Redux updates.

---

## Step-by-Step Flow

### 1. **User Clicks Compose Button**

**Location**: `src/components/LeftSidebar/index.jsx` (line 268)

**Action**:
```javascript
onClick={openComposeWindow}
```

**Function Called**: `openComposeWindow` (line 201-206)
```javascript
const openComposeWindow = (e) => {
  const autoFocus = typeof e === "boolean" ? e : true;
  addNewComposeWindow(null, {}, autoFocus);
};
```

---

### 2. **addNewComposeWindow Called**

**Location**: `src/hooks/useComposeModal.js` (line 103-180)

**Parameters**:
- `draftId = null` (no existing draft)
- `fields = {}` (empty fields)
- `autoFocusInput = true` (focus input on open)

**What Happens**:

#### 2.1 Window Creation Logic
```javascript
const newWindow = {
  id: Date.now(),                    // Unique timestamp ID
  draftId: null,                     // No draft ID initially
  isMinimized: false,                // Window starts normal size
  isMaximized: false,                // Not maximized
  fields: {},                        // Empty fields
  autoFocus: true,                   // Auto-focus enabled
};
```

#### 2.2 Window Management
- Checks available screen space
- Calculates max normal windows (max 2)
- If 2+ normal windows exist, minimizes the first one
- Adds new window to the end of the array

#### 2.3 Redux State Update

**Redux Slice**: `src/store/slices/composeSlice.js`

**Action**: `setComposeWindows`

**Redux State Before**:
```javascript
{
  compose: {
    composeWindows: [
      // existing windows...
    ]
  }
}
```

**Redux State After**:
```javascript
{
  compose: {
    composeWindows: [
      // existing windows...,
      {
        id: 1234567890,              // timestamp
        draftId: null,
        isMinimized: false,
        isMaximized: false,
        fields: {},
        autoFocus: true
      }
    ]
  }
}
```

#### 2.4 URL Update
- Updates browser URL: `?compose=new`
- Uses React Router `navigate()` to update URL without page reload

---

### 3. **ComposeEmail Component Renders**

**Location**: `src/components/ComposeEmail/ComposeEmail.jsx`

**Component Receives**: `composeWindow` prop with the new window object

#### 3.1 Initial State Setup

**Local Component State** (lines 50-64):
```javascript
const [to, setTo] = useState([]);
const [cc, setCc] = useState([]);
const [bcc, setBcc] = useState([]);
const [subject, setSubject] = useState("");
const [content, setContent] = useState({
  html: "",
  plainText: "",
});
const [rawInputText, setRawInputText] = useState({
  to: "",
  cc: "",
  bcc: "",
});
```

**Derived Values**:
- `currentDraftId = composeWindow?.draftId` → `null` (new compose)
- `replyingToEmail = null`
- `forwardingEmail = null`
- `composeReplyType = null`

#### 3.2 useDraftManagement Hook Initialization

**Location**: `src/hooks/useDraftManagement.js` (line 23)

**Parameters Passed**:
```javascript
{
  to: [],
  cc: [],
  bcc: [],
  subject: "",
  content: { html: "", plainText: "" },
  currentDraftId: null,              // No draft ID
  parentEmail: null,
  replyType: null,
  composeWindowId: composeWindow.id,
  setComposeWindows: setComposeWindows
}
```

**Hook Internal State** (lines 26-37):
```javascript
const [draftSaved, setDraftSaved] = useState(false);
const [isDraft, setIsDraft] = useState(false);      // No draft initially
const [draftId, setDraftId] = useState(null);
const backendDraftIdRef = useRef(null);             // No backend ID
const isFirstSaveRef = useRef(true);                // Will be first save
```

**Initialization Effect** (lines 40-48):
- Checks if `currentDraftId` is UUID → `false` (it's null)
- Sets `backendDraftIdRef.current = null`
- Sets `isFirstSaveRef.current = true` (first save will be POST)

#### 3.3 Signature Insertion

**Location**: `src/components/ComposeEmail/ComposeEmail.jsx` (lines 112-131)

**useLayoutEffect** runs:
- Checks: `!currentDraftId && !replyingToEmail && !content.html`
- Condition: `true` (new compose, no draft, no reply)
- If signature exists:
  - Inserts signature into `content.html`
  - Updates `content` state via `setContent()`

**State After Signature**:
```javascript
content: {
  html: "<p><br></p><p data-signature=\"true\">Signature HTML</p>",
  plainText: "\nSignature Text"
}
```

#### 3.4 Draft Loading Check

**Location**: `src/components/ComposeEmail/ComposeEmail.jsx` (lines 196-230)

**useLayoutEffect** runs:
- Checks `currentDraftId` → `null`
- Skips draft loading (no draft to load)

**No API Call** at this point (new compose, no draft ID)

---

### 4. **User Starts Typing**

#### 4.1 State Updates
- User types in recipients → `setTo()`, `setCc()`, `setBcc()` called
- User types subject → `setSubject()` called
- User types body → `setContent()` called

#### 4.2 Auto-Save Triggered

**Location**: `src/hooks/useDraftManagement.js` (lines 326-357)

**useEffect** watches: `[to, cc, bcc, subject, content]`

**When Content Changes**:
1. Checks if content is worth saving (`hasDraftContent()`)
2. Clears existing `autoSaveTimeoutRef`
3. Sets new timeout: **1 second**

**After 1 Second**:
- Calls `saveDraft(true)` (isAutoSave = true)

#### 4.3 Local Draft Save

**Location**: `src/hooks/useDraftManagement.js` (lines 247-324)

**saveDraft Function**:

**Step 1**: Validation
- Checks `hasDraftContent()` → must have recipients, subject, or body
- Checks `hasContentChanged()` → compares with previous content

**Step 2**: Create Draft Email Object
```javascript
const draftEmail = {
  id: generateNextIntegerId(emails),  // Local integer ID (e.g., 1001)
  thread_id: generateThreadId(),
  from: { name: loggedInUser.name, email: loggedInUser.email },
  to: [...],
  cc: [...],
  bcc: [...],
  subject: "...",
  body: content.html,
  preview: content.plainText,
  timestamp: new Date().toISOString(),
  labels: ["Drafts"],
  // ... other fields
};
```

**Step 3**: Update Local State

**GlobalContext State Update**:
```javascript
setEmails((prevEmails) => {
  const filteredEmails = prevEmails.filter(
    (email) => email.id?.toString() !== draftId?.toString()
  );
  return [draftEmail, ...filteredEmails];  // Add at beginning
});
```

**Redux State After Local Save**:
```javascript
{
  mail: {
    inbox: [
      {
        id: 1001,                    // Local integer ID
        labels: ["Drafts"],
        // ... draft data
      },
      // ... other emails
    ],
    drafts: []                       // Not updated yet (only on backend fetch)
  }
}
```

**Step 4**: Update Draft ID
```javascript
setDraftId(1001);                    // Local integer ID
setIsDraft(true);
```

**Step 5**: Update Previous Content Reference
- Stores current content for change detection

**Step 6**: Show "Draft saved" Indicator
- Sets `setDraftSaved(true)`
- Clears after 1 second

**Step 7**: Schedule API Call

**API Call Scheduling** (lines 306-319):
```javascript
// Clear existing API timeout
if (apiCallTimeoutRef.current) {
  clearTimeout(apiCallTimeoutRef.current);
}

// Determine if first save
const isFirstSave = isFirstSaveRef.current && !backendDraftIdRef.current;
// isFirstSave = true (no backend ID yet)

// Schedule API call
const delay = isFirstSave ? 1000 : 5000;  // 1 second for first save
apiCallTimeoutRef.current = setTimeout(() => {
  saveDraftToBackend(isFirstSave);
}, delay);
```

---

### 5. **First API Call (POST) - After 1 Second**

**Location**: `src/hooks/useDraftManagement.js` (lines 170-244)

**Function**: `saveDraftToBackend(true)`

#### 5.1 Create Payload

**Mapper Function**: `feToBeDraftPayload()` from `src/utils/draftMapper.js`

**Payload Created**:
```javascript
{
  subject: "User's subject",
  recipients: [
    { email: "user@example.com", type: "to", name: "User Name" },
    // ... cc, bcc recipients
  ],
  body: "plain text content",
  html_body: "<p>HTML content</p>",
  is_draft: true,
  scheduled_send_at: null
}
```

#### 5.2 API Call

**Service**: `src/services/emailService.js` (line 191)

**Endpoint**: `POST /api/v1/emails`

**Request**:
```http
POST /api/v1/emails
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "...",
  "recipients": [...],
  "body": "...",
  "html_body": "...",
  "is_draft": true
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",  // Backend UUID
    "subject": "...",
    "body": "...",
    "html_body": "...",
    "folder": "drafts",
    "category": "primary",
    "is_read": true,
    "is_starred": false,
    "is_important": false,
    "sender_id": "...",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}
```

#### 5.3 Transform Response

**Mapper Function**: `beToFeDraft()` from `src/utils/draftMapper.js`

**Transformation**:
- Backend format → Frontend format
- Uses `emailAPIMapper()` internally
- Converts recipients array to `to`, `cc`, `bcc` arrays
- Maps `html_body` → `body`
- Maps `body` → `preview`

**Frontend Draft Object**:
```javascript
{
  id: "550e8400-e29b-41d4-a716-446655440000",  // Backend UUID
  to: [{ email: "...", name: "...", id: "..." }],
  cc: [...],
  bcc: [...],
  subject: "...",
  body: "<p>HTML content</p>",
  preview: "plain text",
  labels: ["Drafts"],
  folder: "drafts",
  // ... other fields
}
```

#### 5.4 Update Local State with Backend Data

**GlobalContext Update** (lines 198-216):
```javascript
setEmails((prevEmails) => {
  // Remove local draft (by local ID) and any existing backend draft
  const filteredEmails = prevEmails.filter(
    (email) =>
      email.id?.toString() !== draftId?.toString() &&        // Remove local ID (1001)
      email.id?.toString() !== backendDraft.id?.toString()  // Remove backend UUID if exists
  );
  
  // Add backend draft at beginning
  const updatedEmails = [feDraft, ...filteredEmails];
  
  // Update Redux drafts array
  const drafts = updatedEmails.filter(
    (email) => email.labels?.includes("Drafts") || email.folder === "drafts"
  );
  dispatch(setEmailsForCategory({ category: "drafts", emails: drafts }));
  
  return updatedEmails;
});
```

**Redux State After API Response**:
```javascript
{
  mail: {
    inbox: [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",  // Backend UUID
        labels: ["Drafts"],
        folder: "drafts",
        // ... backend data
      },
      // ... other emails
    ],
    drafts: [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        // ... same draft
      }
    ]
  }
}
```

#### 5.5 Update Draft ID References

```javascript
const newBackendId = backendDraft.id;  // UUID
setDraftId(newBackendId);              // Update state to UUID
backendDraftIdRef.current = newBackendId;  // Store in ref
isFirstSaveRef.current = false;       // No longer first save
```

#### 5.6 Update Compose Window Draft ID

**Redux Compose State Update** (lines 225-231):
```javascript
if (composeWindowId && setComposeWindows) {
  setComposeWindows((prev) =>
    prev.map((window) =>
      window.id === composeWindowId 
        ? { ...window, draftId: newBackendId }  // Update to UUID
        : window
    ))
  );
}
```

**Redux State After**:
```javascript
{
  compose: {
    composeWindows: [
      {
        id: 1234567890,
        draftId: "550e8400-e29b-41d4-a716-446655440000",  // Updated to UUID
        // ... other fields
      }
    ]
  }
}
```

#### 5.7 Invalidate React Query Cache

**Cache Invalidation** (lines 233-237):
```javascript
queryClient.invalidateQueries({ queryKey: ["emails", "folder", "drafts"] });
queryClient.invalidateQueries({ queryKey: ["emails", "inbox"] });
queryClient.invalidateQueries({ queryKey: ["emails"] });
queryClient.invalidateQueries({ queryKey: ["emailCounts"] });
```

**Effect**:
- All email queries marked as stale
- Will refetch on next access
- Ensures UI shows latest data

---

### 6. **Subsequent Edits (After First Save)**

#### 6.1 User Continues Typing
- State updates as before
- Auto-save triggers after 1 second

#### 6.2 Local Save
- Same local save process
- Updates local state immediately

#### 6.3 API Call Scheduling
- `isFirstSaveRef.current = false` (already saved)
- `backendDraftIdRef.current = "550e8400..."` (UUID exists)
- Delay: **5 seconds** (instead of 1 second)

#### 6.4 API Call (PUT) - After 5 Seconds

**Function**: `saveDraftToBackend(false)`

**Payload** (via `feToBeDraftUpdatePayload`):
```javascript
{
  subject: "Updated subject",
  body: "Updated plain text",
  html_body: "<p>Updated HTML</p>",
  is_read: true,
  is_starred: false,
  is_important: false,
  folder: "drafts",
  category: "primary"
}
```

**Endpoint**: `PUT /api/v1/emails/{email_id}`

**Request**:
```http
PUT /api/v1/emails/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
Content-Type: application/json

{
  "subject": "...",
  "body": "...",
  "html_body": "...",
  // ... other fields
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "updated_at": "2024-01-01T00:01:00Z",
    // ... updated fields
  }
}
```

**Updates**:
- Same state update process as POST
- Updates local state with backend response
- Invalidates cache
- No draft ID change (same UUID)

---

## Redux State Summary

### Initial State (Before Compose)
```javascript
{
  compose: {
    composeWindows: []
  },
  mail: {
    inbox: [...],
    drafts: []
  }
}
```

### After Compose Button Click
```javascript
{
  compose: {
    composeWindows: [
      {
        id: 1234567890,
        draftId: null,
        isMinimized: false,
        isMaximized: false,
        fields: {},
        autoFocus: true
      }
    ]
  },
  mail: {
    inbox: [...],
    drafts: []
  }
}
```

### After First Local Save (1 second)
```javascript
{
  compose: {
    composeWindows: [
      {
        id: 1234567890,
        draftId: null,  // Still null (local save hasn't updated it yet)
        // ...
      }
    ]
  },
  mail: {
    inbox: [
      {
        id: 1001,  // Local integer ID
        labels: ["Drafts"],
        // ... draft data
      },
      // ... other emails
    ],
    drafts: []  // Not updated yet
  }
}
```

### After First API Save (1 second after local save)
```javascript
{
  compose: {
    composeWindows: [
      {
        id: 1234567890,
        draftId: "550e8400-e29b-41d4-a716-446655440000",  // Backend UUID
        // ...
      }
    ]
  },
  mail: {
    inbox: [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",  // Backend UUID
        labels: ["Drafts"],
        folder: "drafts",
        // ... backend data
      },
      // ... other emails
    ],
    drafts: [
      {
        id: "550e8400-e29b-41d4-a716-446655440000",
        // ... same draft
      }
    ]
  }
}
```

---

## Key Timing

1. **User clicks compose** → Immediate
2. **Component renders** → Immediate
3. **User types** → Immediate state updates
4. **Local save** → 1 second after last keystroke
5. **First API call (POST)** → 1 second after local save (total: 2 seconds)
6. **Subsequent API calls (PUT)** → 5 seconds after local save

---

## Error Handling

### API Call Fails
- Error logged to console
- Local save still works (optimistic update)
- User can continue editing
- Next save will retry API call

### Network Issues
- Same as API failure
- Local state preserved
- Draft available locally until connection restored

---

## Notes

1. **Dual ID System**: 
   - Local integer IDs for backward compatibility
   - Backend UUIDs after first API save
   - Transition happens automatically

2. **Optimistic Updates**:
   - Local state updates immediately
   - API calls happen asynchronously
   - UI remains responsive

3. **Cache Invalidation**:
   - React Query cache invalidated after API calls
   - Ensures fresh data on next fetch
   - Prevents stale data issues

4. **Redux Updates**:
   - `composeWindows` updated in Redux
   - `mail.inbox` updated via GlobalContext
   - `mail.drafts` updated via Redux action

---

## ComposeEmail Component - Detailed Explanation

### Overview

The `ComposeEmail` component (`src/components/ComposeEmail/ComposeEmail.jsx`) is the main component responsible for rendering the compose email interface. It supports:
- Multiple simultaneous compose windows
- Draft management (create, update, load, delete)
- Reply/Forward functionality
- Send and schedule operations
- Window management (minimize, maximize, close)
- Signature insertion
- State persistence across window minimize/restore

---

### Component Structure

#### 1. Imports and Setup (Lines 1-25)

**React Hooks**:
- `useState`, `useEffect`, `useLayoutEffect`, `useMemo`, `useRef` - State and lifecycle management
- `useLocation`, `useNavigate` - React Router for navigation

**Redux**:
- `useDispatch` - Dispatch Redux actions
- `fetchEmailByIdThunk`, `setEmailsForCategory` - Draft-related actions

**Custom Hooks**:
- `useComposeModal` - Window management (minimize, maximize, close)
- `useDraftManagement` - Draft auto-save and backend sync
- `useSendEmail` - Send email functionality
- `useScheduleEmail` - Schedule email functionality
- `useGlobalContext` - Global application state

**Utilities**:
- `beToFeDraft` - Transform backend draft to frontend format
- `restructureRecipients` - Optimize recipient lookup

**Helper Function**:
```javascript
const isUUID = (str) => {
  // Checks if a string is a UUID format (backend draft ID)
  // Returns true for: "123e4567-e89b-12d3-a456-426614174000"
  // Used to distinguish backend drafts (UUID) from local drafts (integer)
}
```

---

#### 2. Component Props and Initial Setup (Lines 27-49)

**Component Signature**:
```javascript
export default function ComposeEmail({ composeWindow }) {
```

**Props**:
- `composeWindow`: Object containing:
  - `id`: Unique window ID (timestamp)
  - `draftId`: Draft email ID (if editing existing draft)
  - `isMinimized`, `isMaximized`: Window state flags
  - `fields`: Preset fields (to, cc, bcc, subject, content) for reply/forward
  - `replyingTo`, `forwardingTo`: Original email for reply/forward
  - `autoFocus`: Whether to auto-focus input on mount

**Global Context Access**:
```javascript
const {
  emails,              // All emails in the application
  mailFolders,         // Organized emails by folder (inbox, drafts, sent, etc.)
  setSnackbar,         // Function to show notifications
  recipients,          // Contact list for autocomplete
  composeWindows,      // Array of all open compose windows
  setComposeWindows,   // Function to update compose windows array
  rightSidebarActiveTab, // Sidebar state for positioning calculations
  loggedInUser,        // Current user information
  signaturesState,     // Email signature settings
} = useGlobalContext();
```

**Recipients Memoization**:
```javascript
const restructuredRecipients = useMemo(() => {
  return restructureRecipients(recipients.filter((recipient) => recipient.email));
}, [recipients]);
```
- Creates an optimized lookup structure for recipients
- Only recalculates when `recipients` array changes
- Used for matching email strings to recipient objects

**Window Visibility Calculation**:
```javascript
const isWindowVisible = useMemo(() => {
  const visibleWindows = composeWindows.slice(-visibleWindowCount);
  return visibleWindows.some((w) => w.id === composeWindow.id);
}, [JSON.stringify(composeWindows), visibleWindowCount, composeWindow.id]);
```
- Determines if this window should be visible based on `visibleWindowCount`
- Uses CSS `display: none` to hide non-visible windows (prevents unmounting)
- **Note**: `JSON.stringify(composeWindows)` in dependencies can cause unnecessary re-renders

---

#### 3. Form State Management (Lines 58-72)

**Local Component State**:
```javascript
const [to, setTo] = useState([]);        // Array of recipient objects
const [cc, setCc] = useState([]);        // Array of CC recipient objects
const [bcc, setBcc] = useState([]);     // Array of BCC recipient objects
const [subject, setSubject] = useState(""); // Email subject string
const [content, setContent] = useState({  // Email body content
  html: "",        // HTML content for rich text editor
  plainText: "",   // Plain text version for preview
});

const [rawInputText, setRawInputText] = useState({ // Raw input for validation
  to: "", cc: "", bcc: ""
});
```

**State Structure**:
- **Recipients**: Arrays of objects with `{id, name, email, avatar, ...}`
- **Content**: Object with `{html, plainText}` for dual-format support
- **Raw Input**: Stores unparsed text for email validation

---

#### 4. Reply/Forward Detection (Lines 77-86)

```javascript
const replyingToEmail = composeWindow?.fields?.replyingTo || null;
const forwardingEmail = composeWindow?.fields?.forwardingTo || null;
const composeReplyType = forwardingEmail
  ? "forward"
  : replyingToEmail
    ? composeWindow?.fields?.replyType || 
      (presetCcRecipients?.length > 0 ? "replyAll" : "reply")
    : null;
```

**Determines**:
- **New email**: `composeReplyType = null`
- **Reply**: `composeReplyType = "reply"` or `"replyAll"`
- **Forward**: `composeReplyType = "forward"`

**Used for**:
- Hiding subject field (replies/forwards use original subject)
- Signature insertion (only for new emails)
- Draft thread management

---

#### 5. Draft Management Hook (Lines 90-102)

```javascript
const { 
  saveDraftManually,   // Manually save draft (on close)
  deleteDraft,         // Delete draft from Redux
  isDraft,             // Boolean: is this a draft?
  draftId,             // Current draft ID (local or UUID)
  draftSaved,          // Boolean: "Draft saved" indicator
  hasDraftContent      // Function: checks if form has content worth saving
} = useDraftManagement({
  to, cc, bcc, subject, content,  // Form state
  currentDraftId,                 // Draft ID from composeWindow
  parentEmail: originalEmail,      // Original email (for replies)
  replyType: composeReplyType,     // "reply", "replyAll", "forward", or null
  composeWindowId: composeWindow?.id,
  setComposeWindows,
});
```

**This hook handles**:
- Auto-save with debouncing (1s for local, 500ms/1s for API)
- Backend synchronization (POST for new, PUT for updates)
- Local Redux updates
- Content change detection (prevents unnecessary API calls)
- Draft ID management (local integer → backend UUID transition)

---

#### 6. Signature Management (Lines 104-139)

**Signature Selection**:
```javascript
const defaultSignatureId = useMemo(() => {
  const isReply = composeWindow?.fields?.replyingTo;
  return isReply 
    ? signaturesState?.useForRepliesAndForwards 
    : signaturesState?.useForNewEmails;
}, [composeWindow, signaturesState]);
```

**Signature Insertion**:
```javascript
useLayoutEffect(() => {
  const isNewCompose = !currentDraftId && !composeWindow?.fields?.replyingTo && !content.html?.trim();
  
  if (isNewCompose && defaultSignatureHTML) {
    // Insert signature based on user preference
    // Either before quoted text or with "--" separator
  }
}, [defaultSignatureHTML, currentDraftId, signaturesState?.insertSignatureBeforeQuotedText]);
```

**Key Points**:
- Runs **before paint** (`useLayoutEffect`) to avoid flicker
- Only inserts for **new emails** (not drafts or replies)
- Sanitizes signature HTML (removes wrapping `<p>` tags)
- Supports two insertion modes (before quoted text or with separator)

---

#### 7. Draft Loading Logic (Lines 169-288)

**Main `useLayoutEffect`** that loads draft data when component mounts or draft ID changes:

**Flow**:
1. **Check if `currentDraftId` exists**
2. **Try to find draft in Redux** (`mailFolders?.drafts`)
3. **If found**: Load form fields immediately (no API call)
4. **If not found but is UUID**: Fetch from backend via `fetchEmailByIdThunk`
5. **Transform backend data** using `beToFeDraft()`
6. **Populate form fields** (to, cc, bcc, subject, content)
7. **Update Redux** with fetched draft

**Code Structure**:
```javascript
useLayoutEffect(() => {
  if (currentDraftId) {
    // Load from Redux first
    const drafts = mailFolders?.drafts || [];
    const existingDraft = drafts.find(
      (email) => email.id.toString() === currentDraftId?.toString() 
        && email.labels.includes("Drafts")
    );
    
    if (existingDraft) {
      // Load form fields from Redux
      setTo(existingDraft.to.map(...));
      setCc(existingDraft.cc.map(...));
      // ... etc
    } else if (isUUID(currentDraftId.toString())) {
      // Fetch from backend if not in Redux
      dispatch(fetchEmailByIdThunk(currentDraftId))
        .then((fetchedDraft) => {
          const feDraft = beToFeDraft(fetchedDraft);
          // Load form fields
          // Update Redux
        });
    }
  } else if (composeWindow?.fields && Object.keys(composeWindow?.fields).length > 0) {
    // Load preset fields (for reply/forward)
  }
}, [currentDraftId?.current, composeWindow?.isMinimized, JSON.stringify(composeWindow?.fields), JSON.stringify(restructuredRecipients)]);
```

**Issues**:
- **Line 288**: `currentDraftId?.current` should be `currentDraftId` (not a ref)
- **Line 288**: `JSON.stringify()` in dependencies can cause unnecessary re-runs
- **Line 175**: Label check assumes string format, should support object format

---

#### 8. Editor Focus Management (Lines 290-318)

```javascript
useEffect(() => {
  if (composeWindow?.fields?.replyingTo && composeWindow?.autoFocus && !composeWindow?.fields?.forwardingTo) {
    setTimeout(() => {
      const composeModal = document.querySelector(`[data-compose-id="${composeWindow.id}"]`);
      const editorElement = composeModal.querySelector(".ProseMirror");
      if (editorElement) {
        editorElement.focus();
      }
    }, 300);
  }
}, [composeWindow?.fields?.replyingTo, composeWindow?.autoFocus, composeWindow?.id]);
```

**Purpose**:
- Focuses the rich text editor for **replies** (not forwards)
- Uses 300ms delay to ensure editor is rendered
- Finds editor via DOM query using window ID

---

#### 9. Draft ID Synchronization (Lines 320-327)

```javascript
useEffect(() => {
  if (draftId) {
    setComposeWindows((prev) =>
      prev.map((window) => 
        window.id === composeWindow.id 
          ? { ...window, draftId: draftId } 
          : window
      )
    );
  }
}, [draftId]);
```

**Purpose**:
- Updates `composeWindow.draftId` when draft is created/updated
- Keeps window state in sync with draft state
- Ensures draft can be reloaded if window is closed and reopened

---

#### 10. Window Positioning (Lines 329-354)

```javascript
const composeModalRightPosition = useMemo(() => {
  const windows = composeWindows.slice(-visibleWindowCount);
  const windowIndex = windows.findIndex((window) => window.id === composeWindow.id);
  
  let rightPosition = rightSidebarActiveTab.activeTab ? 390 : 70;
  
  // If last window, return base position
  if (windowIndex === windows.length - 1) {
    return rightPosition;
  }
  
  // Calculate position based on windows to the right
  for (let i = windowIndex + 1; i < windows.length; i++) {
    const window = windows[i];
    const windowWidth = window.isMinimized ? 350 : 550;
    rightPosition += 5 + windowWidth; // 5px gap + window width
  }
  
  return rightPosition;
}, [composeWindows, visibleWindowCount, composeWindow.id, rightSidebarActiveTab.activeTab]);
```

**Purpose**:
- Calculates right position for window stacking
- Accounts for minimized (350px) vs normal (550px) windows
- Adjusts for sidebar state (390px if active, 70px if not)
- Ensures windows don't overlap

---

#### 11. Window Control Handlers (Lines 356-375)

```javascript
const handleToggleMinimize = () => {
  toggleMinimize(composeWindow.id);
};

const handleToggleMaximize = () => {
  toggleMaximize(composeWindow.id);
};

const handleClose = (saveToDraft = true) => {
  if (hasDraftContent() && saveToDraft) {
    saveDraftManually(); // Save before closing
  }
  removeComposeWindow(composeWindow.id);
};
```

**Functionality**:
- **Minimize/Maximize**: Toggle window state
- **Close**: Saves draft if content exists, then removes window

---

#### 12. Send and Schedule Hooks (Lines 377-429)

**Send Email Hook**:
```javascript
const {
  handleSend: handleSendEmail,
  showErrorModal,
  errorMessage,
  handleErrorModalClose,
  handleSnackbarUndoDelete,
  lastDeletedDraftRef,
} = useSendEmail(composeReplyType, originalEmail);
```

**Send Handler**:
```javascript
const handleSend = ({ attachments = [], embeddedImages = [], processedHtml } = {}) => {
  const finalContent = processedHtml ? { html: processedHtml, plainText: content.plainText } : content;
  handleSendEmail({
    to, cc, bcc, subject,
    content: finalContent,
    rawInputText,
    onClose: handleClose,
    currentDraftId: draftId,
    isDraft: isDraft,
    attachments,
    embeddedImages,
  });
};
```

**Purpose**:
- Wraps `useSendEmail` hook functionality
- Handles processed HTML from rich text editor
- Passes all form data to send function
- Manages send flow (update draft → send → close window)

---

#### 13. Delete Handler (Lines 431-467)

```javascript
const handleDelete = () => {
  if (isDraft) {
    // Store draft data for undo
    lastDeletedDraftRef.current = {
      id: draftId,
      to, cc, bcc, subject, content, rawInputText,
      composeWindowId: composeWindow.id,
      replyType: composeReplyType,
    };
    
    deleteDraft(); // Remove from Redux
    handleClose(false); // Close window (don't save)
    
    // Show snackbar with undo button
    setSnackbar({
      open: true,
      message: "Draft discarded.",
      action: <Button onClick={handleUndoDelete}>Undo</Button>,
      autoHideDuration: 4000,
    });
  } else {
    handleClose(false); // Just close if not a draft
  }
};
```

**Purpose**:
- Stores draft data for potential restoration
- Removes draft from Redux
- Shows undo snackbar
- Allows user to restore deleted draft

---

#### 14. JSX Render (Lines 469-627)

**Component Structure**:

1. **Modal Overlay** (maximized state):
   ```javascript
   {composeWindow?.isMaximized && !composeWindow?.isMinimized && (
     <div className={styles.modalOverlay} onClick={handleToggleMaximize} />
   )}
   ```

2. **Main Compose Modal**:
   ```javascript
   <div
     className={`${styles.composeModal} ${isMinimized ? styles.minimized : ""} ${isMaximized ? styles.maximized : ""}`}
     style={{ 
       right: `${composeModalRightPosition}px`, 
       display: isWindowVisible ? "block" : "none" 
     }}
     data-compose-id={composeWindow.id}
   >
   ```

3. **Title Bar**:
   - Shows "Draft saved", "Re: Subject", "Fwd: Subject", or "New Message"
   - Minimize, maximize, close buttons

4. **Content Area** (hidden when minimized):
   - `RecipientsInput`: To, CC, BCC fields with autocomplete
   - Subject input (hidden for replies/forwards)
   - `RichTextEditor`: Email body editor

5. **Error Modals**:
   - Send error modal
   - Schedule error modal

---

### Data Flow

#### Opening a Draft:
```
Click Draft Email
  ↓
addNewComposeWindow(email.id)
  ↓
ComposeEmail mounts with composeWindow.draftId
  ↓
useLayoutEffect runs
  ↓
Check Redux mail.drafts
  ↓
Found? → Load form fields
Not found? → Fetch from backend → Load form fields
  ↓
Form populated, ready to edit
```

#### Auto-Save Flow:
```
User types
  ↓
Form state updates (to, cc, bcc, subject, content)
  ↓
useDraftManagement hook detects changes
  ↓
Debounce (1s for local, 500ms/1s for API)
  ↓
Local save → Redux mail.drafts
API save → POST (first) or PUT (updates)
  ↓
Backend responds → Update Redux → Update composeWindow.draftId
```

#### Send Flow:
```
User clicks Send
  ↓
handleSend() → handleSendEmail()
  ↓
Validation (recipients, email format)
  ↓
If draft: updateDraftThunk() → sendEmailByIdThunk()
If new: create email object → send
  ↓
Success → Add to mail.sent, remove from mail.drafts
  ↓
Close window, show snackbar with undo
```

---

### Key Implementation Details

1. **State Persistence**: All windows are rendered (not just visible ones) to prevent unmounting and state loss. Visibility is controlled via CSS `display: none`.

2. **Dual Save Strategy**: 
   - Local save (1s debounce) → Immediate Redux update
   - API save (500ms/1s debounce) → Backend synchronization
   - Independent of each other

3. **Draft ID Transition**:
   - Starts with `null` (new compose)
   - Gets local integer ID after first local save
   - Transitions to backend UUID after first API save
   - All subsequent saves use UUID

4. **Content Change Detection**: 
   - Tracks last content sent to API
   - Only sends PUT if content actually changed
   - Prevents unnecessary API calls

5. **Window Management**:
   - Max 2 normal windows visible
   - Additional windows automatically minimized
   - Position calculated based on visible windows
   - State persists when minimized/restored

---

### Known Issues

1. **Dependency Array (Line 288)**:
   - `currentDraftId?.current` should be `currentDraftId` (not a ref)
   - `JSON.stringify()` in dependencies causes unnecessary re-runs
   - Should use more stable dependency checks

2. **Window Visibility (Line 56)**:
   - `JSON.stringify(composeWindows)` in dependencies can cause re-renders
   - Should use a more stable comparison

3. **Label Check (Line 175)**:
   - Assumes string format: `email.labels.includes("Drafts")`
   - Should support object format: `email.labels.some(label => (typeof label === "string" ? label : label?.name) === "Drafts")`

---

### Summary

The `ComposeEmail` component is a complex, feature-rich component that manages:
- **Form state** (recipients, subject, body)
- **Draft lifecycle** (create, update, load, delete)
- **Window state** (minimize, maximize, close, positioning)
- **Reply/Forward logic**
- **Send and schedule operations**
- **Signature insertion**
- **Multiple window coordination**

It integrates with:
- **Redux** for global state management
- **React Query** for backend synchronization
- **Global Context** for window management
- **Custom hooks** for business logic

The component is designed to support multiple simultaneous compose windows while maintaining independent state for each window, ensuring a smooth user experience even when multiple drafts are being edited simultaneously.

