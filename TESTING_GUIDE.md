# Mailg Verification System - Testing Guide

**Version:** 1.0  
**Last Updated:** $(date)  
**Purpose:** Step-by-step instructions for testing all verification prompts

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Setup Instructions](#setup-instructions)
3. [Testing Workflow Overview](#testing-workflow-overview)
4. [Task 1: MAILG-COMPOSE-SEND-001](#task-1-mailg-compose-send-001)
5. [Task 2: MAILG-REPLY-FORWARD-002](#task-2-mailg-reply-forward-002)
6. [Task 3: MAILG-ORGANIZE-LABELS-003](#task-3-mailg-organize-labels-003)
7. [Task 4: MAILG-DRAFT-SCHEDULE-004](#task-4-mailg-draft-schedule-004)
8. [Task 5: MAILG-EMAIL-ANALYSIS-RDT-005](#task-5-mailg-email-analysis-rdt-005)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Environment Variables

For **standard tasks** (Tasks 1-4), no environment variables are required.

For **RDT task** (Task 5), set these in your `.env` file:

```bash
VITE_OPENROUTER_API_KEY=your-api-key-here
VITE_OPENROUTER_URL=https://openrouter.ai/api/v1/chat/completions
VITE_OPENROUTER_MODEL=openai/gpt-4o-mini  # or your preferred model
```

### Optional Environment Variables

```bash
# Filter to specific tasks (comma-separated)
VITE_TASK_IDS=MAILG-COMPOSE-SEND-001,MAILG-REPLY-FORWARD-002
```

### Application Setup

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Navigate to the verification page:**
   ```
   http://localhost:3001/verify_raw
   ```

3. **Verify you see 5 tasks** listed on the page

---

## Setup Instructions

### Before Testing Each Task

1. **Reset Application State:**
   - Click the **"Reset State"** button in the header
   - This clears localStorage and reloads the page
   - **Important:** Do this before each new task to ensure clean state

2. **Prepare Test Data (if needed):**
   - Some tasks require existing emails in localStorage
   - See individual task instructions below for specific requirements

3. **Download State (for debugging):**
   - Use **"Download localStorage"** button to save current state
   - Useful for debugging assertion failures

---

## Testing Workflow Overview

### Standard Testing Flow

1. **Reset State** → Clear previous test data
2. **Open Verifier** → Click "Open Verifier" button for the task
3. **Read Prompt** → Review the prompt in the modal
4. **Execute Prompt** → Manually perform the actions described in the prompt (in the main mailg app)
5. **Run Assertions** → Return to `/verify_raw` modal and click "Run All Assertions"
6. **Verify Results** → Check that all assertions pass (green checkmarks)

### RDT Testing Flow (Task 5)

1. **Reset State** → Clear previous test data
2. **Open Verifier** → Click "Open Verifier" for MAILG-EMAIL-ANALYSIS-RDT-005
3. **Read Prompt** → Review the analysis prompt
4. **Execute Prompt** → Get model response (from LLM or manual analysis)
5. **Enter Model Response** → Paste response into textarea for each RDT assertion
6. **Run Assertions** → Click "Run All Assertions"
7. **Verify Scores** → Check that scores meet thresholds (80% for FACTUAL_VERIFICATION, 75% for others)

---

## Task 1: MAILG-COMPOSE-SEND-001

### Prompt

```
Compose a new email addressed to david.kim@acelogistics.com, cc: sarah.johnson@northwindretail.com, bcc: compliance@company.com. Subject should be 'Q3 Financial Forecast Submission'. The message body: 'Hi David, please find attached the updated Q3 financial forecast. We've incorporated the recent adjustments in marketing spend and logistics costs. Kindly review and confirm if these align with your records. Best, Laura'. Send it immediately.
```

### Prerequisites

- **Logged in user:** Must be logged in as `john.doe@example.com`
- **No existing emails required** (starts with empty inbox)

### Step-by-Step Testing

1. **Reset State:**
   - Navigate to `http://localhost:3001/verify_raw`
   - Click **"Reset State"** button

2. **Open Verifier:**
   - Click **"Open Verifier"** button for `MAILG-COMPOSE-SEND-001`
   - Verify modal opens showing the prompt and 9 assertions

3. **Execute the Prompt:**
   - Navigate to main mailg app (`http://localhost:3001/inbox`)
   - Click **"Compose"** button
   - Fill in:
     - **To:** `david.kim@acelogistics.com`
     - **CC:** `sarah.johnson@northwindretail.com`
     - **BCC:** `compliance@company.com`
     - **Subject:** `Q3 Financial Forecast Submission`
     - **Body:** `Hi David, please find attached the updated Q3 financial forecast. We've incorporated the recent adjustments in marketing spend and logistics costs. Kindly review and confirm if these align with your records. Best, Laura`
   - Click **"Send"**

4. **Run Assertions:**
   - Return to `/verify_raw` page (keep modal open or reopen it)
   - Click **"Run All Assertions"** button
   - Wait for all assertions to complete

5. **Verify Results:**
   - All 9 assertions should show **PASSED** (green checkmark)
   - Check execution log for any errors

### Expected Assertions (9 total)

| # | Title | Operator | Expected Result |
|---|-------|----------|----------------|
| 1 | Email count increased after sending | ARRAY_LENGTH | >= 1 email |
| 2 | New email exists with correct recipient | ARRAY_CONTAINS | `david.kim@acelogistics.com` in `to` |
| 3 | Email has correct CC recipient | ARRAY_CONTAINS | `sarah.johnson@northwindretail.com` in `cc` |
| 4 | Email has correct BCC recipient | ARRAY_CONTAINS | `compliance@company.com` in `bcc` |
| 5 | Email subject matches exactly | STRING_MATCH | `Q3 Financial Forecast Submission` |
| 6 | Email body contains key content | STRING_CONTAINS | `Q3 financial forecast` (case-insensitive) |
| 7 | Email has Sent label | ARRAY_CONTAINS | `Sent` in labels array |
| 8 | Email has timestamp | EXISTS | timestamp field exists |
| 9 | Email is from logged in user | STRING_MATCH | `john.doe@example.com` |

### Common Issues

- **Assertion fails:** Check that email was actually sent (not saved as draft)
- **Recipient not found:** Verify exact email addresses match (case-sensitive for `to`, but not for `from`)
- **Subject mismatch:** Ensure exact subject match (case-sensitive, trimmed)

---

## Task 2: MAILG-REPLY-FORWARD-002

### Prompt

```
Reply to the email thread from emma.brown@techstream.com with subject 'Invoice mismatch - URGENT' with message: 'Hi Emma, thank you for flagging this. Our finance team has identified the issue and a corrected invoice has been generated. You should receive it today by 5 PM UTC. Apologies for the inconvenience.' Then forward the original email to finance@company.com with note: 'Please review the corrected invoice details.'
```

### Prerequisites

- **Existing email required:** An email from `emma.brown@techstream.com` with subject `Invoice mismatch - URGENT` must exist in inbox
- **Logged in user:** Must be logged in as `john.doe@example.com`

### Step-by-Step Testing

1. **Reset State:**
   - Click **"Reset State"** button

2. **Setup Test Data:**
   - Navigate to main mailg app
   - Create or ensure an email exists:
     - **From:** `emma.brown@techstream.com`
     - **To:** `john.doe@example.com`
     - **Subject:** `Invoice mismatch - URGENT`
     - **Body:** Any content (e.g., "There's a mismatch in invoice #12345")
   - Save this email in localStorage (it should appear in inbox)

3. **Open Verifier:**
   - Return to `/verify_raw`
   - Click **"Open Verifier"** for `MAILG-REPLY-FORWARD-002`
   - Verify 6 assertions are listed

4. **Execute the Prompt:**
   - Navigate to main mailg app
   - Find the email with subject `Invoice mismatch - URGENT`
   - **Reply:**
     - Click **"Reply"** button
     - Enter body: `Hi Emma, thank you for flagging this. Our finance team has identified the issue and a corrected invoice has been generated. You should receive it today by 5 PM UTC. Apologies for the inconvenience.`
     - Send the reply
   - **Forward:**
     - Open the original email again
     - Click **"Forward"** button
     - **To:** `finance@company.com`
     - Add note: `Please review the corrected invoice details.`
     - Send the forward

5. **Run Assertions:**
   - Return to `/verify_raw` modal
   - Click **"Run All Assertions"**

6. **Verify Results:**
   - All 6 assertions should **PASS**

### Expected Assertions (6 total)

| # | Title | Operator | Expected Result |
|---|-------|----------|----------------|
| 1 | Reply email exists in thread | ARRAY_CONTAINS | Subject contains `Re: Invoice mismatch - URGENT` |
| 2 | Reply body contains key message | STRING_CONTAINS | Body contains `corrected invoice has been generated` |
| 3 | Reply is to correct recipient | ARRAY_CONTAINS | `emma.brown@techstream.com` in `to` |
| 4 | Forwarded email exists | ARRAY_CONTAINS | Email to `finance@company.com` with subject `Fwd: Invoice mismatch - URGENT` |
| 5 | Forward body contains note | STRING_CONTAINS | Body contains `Please review the corrected invoice details` |
| 6 | Thread has multiple messages | ARRAY_LENGTH | >= 2 emails in thread |

### Common Issues

- **Reply subject format:** Must be exactly `Re: Invoice mismatch - URGENT` (with `Re: ` prefix)
- **Forward subject format:** Must be exactly `Fwd: Invoice mismatch - URGENT` (with `Fwd: ` prefix)
- **Thread count:** Ensure both reply and forward are created (original + reply + forward = 3 total)

---

## Task 3: MAILG-ORGANIZE-LABELS-003

### Prompt

```
Archive the email from alex.green@northwindretail.com with subject 'Project Phoenix Kickoff Notes'. Add the label 'Projects/Phoenix' to it. Star the email from logistics.manager@acelogistics.com with subject 'Tracking update for Order #56789'. Remove the star from the thread 'Weekly HR Digest - September Week 2'.
```

### Prerequisites

- **Three existing emails required:**
  1. Email from `alex.green@northwindretail.com` with subject `Project Phoenix Kickoff Notes`
  2. Email from `logistics.manager@acelogistics.com` with subject `Tracking update for Order #56789`
  3. Email/thread with subject `Weekly HR Digest - September Week 2` (must be starred initially)

### Step-by-Step Testing

1. **Reset State:**
   - Click **"Reset State"** button

2. **Setup Test Data:**
   - Navigate to main mailg app
   - Create three emails:
     - **Email 1:** From `alex.green@northwindretail.com`, Subject `Project Phoenix Kickoff Notes`, in Inbox
     - **Email 2:** From `logistics.manager@acelogistics.com`, Subject `Tracking update for Order #56789`, in Inbox, NOT starred
     - **Email 3:** Subject `Weekly HR Digest - September Week 2`, in Inbox, **STARRED** (important!)

3. **Open Verifier:**
   - Click **"Open Verifier"** for `MAILG-ORGANIZE-LABELS-003`
   - Verify 6 assertions listed

4. **Execute the Prompt:**
   - **Archive Email 1:**
     - Find email with subject `Project Phoenix Kickoff Notes`
     - Archive it (remove from Inbox)
   - **Add Label:**
     - Find the archived email (in All Mail or Archive folder)
     - Add label `Projects/Phoenix` to it
   - **Star Email 2:**
     - Find email with subject `Tracking update for Order #56789`
     - Star it (click star icon)
   - **Unstar Email 3:**
     - Find email with subject `Weekly HR Digest - September Week 2`
     - Remove star (click star icon to unstar)

5. **Run Assertions:**
   - Return to `/verify_raw` modal
   - Click **"Run All Assertions"**

6. **Verify Results:**
   - All 6 assertions should **PASS**

### Expected Assertions (6 total)

| # | Title | Operator | Expected Result |
|---|-------|----------|----------------|
| 1 | Project Phoenix email has correct label | ARRAY_CONTAINS | `Projects/Phoenix` in labels |
| 2 | Project Phoenix email is not in Inbox | NOT_EXISTS | Email not found with `Inbox` label |
| 3 | Tracking email is starred | JSON_MATCH | `starred: true` |
| 4 | HR Digest is not starred | JSON_MATCH | `starred: false` |
| 5 | Project Phoenix email still exists in All Mail | EXISTS | Email exists (not deleted) |
| 6 | Tracking email has correct sender | STRING_MATCH | `from.email` is `logistics.manager@acelogistics.com` |

### Common Issues

- **Label format:** Label must be exactly `Projects/Phoenix` (case-sensitive, with forward slash)
- **Archive vs Delete:** Email must be archived (removed from Inbox) but NOT deleted (still exists in All Mail)
- **Star state:** Ensure Email 3 starts starred, then gets unstarred

---

## Task 4: MAILG-DRAFT-SCHEDULE-004

### Prompt

```
Create a draft email to jane.doe@northwindretail.com with subject 'Draft: Proposal Outline' and body 'Hi Jane, here are the sections I plan to include in the proposal: 1) Market Overview, 2) Budget Estimates, 3) Implementation Plan. Please add your thoughts.' Save it as a draft. Then edit the draft to add cc: sarah.connor@company.com. Do not send.
```

### Prerequisites

- **No existing emails required** (starts with empty inbox)
- **Logged in user:** Must be logged in as `john.doe@example.com`

### Step-by-Step Testing

1. **Reset State:**
   - Click **"Reset State"** button

2. **Open Verifier:**
   - Click **"Open Verifier"** for `MAILG-DRAFT-SCHEDULE-004`
   - Verify 8 assertions listed

3. **Execute the Prompt:**
   - Navigate to main mailg app
   - **Create Draft:**
     - Click **"Compose"** button
     - Fill in:
       - **To:** `jane.doe@northwindretail.com`
       - **Subject:** `Draft: Proposal Outline`
       - **Body:** `Hi Jane, here are the sections I plan to include in the proposal: 1) Market Overview, 2) Budget Estimates, 3) Implementation Plan. Please add your thoughts.`
     - **Save as Draft** (do NOT send - close compose window or click "Save Draft")
   - **Edit Draft:**
     - Open the draft from Drafts folder
     - Add **CC:** `sarah.connor@company.com`
     - **Save Draft** again (do NOT send)

4. **Run Assertions:**
   - Return to `/verify_raw` modal
   - Click **"Run All Assertions"**

5. **Verify Results:**
   - All 8 assertions should **PASS**

### Expected Assertions (8 total)

| # | Title | Operator | Expected Result |
|---|-------|----------|----------------|
| 1 | Draft email exists | ARRAY_CONTAINS | Email with subject `Draft: Proposal Outline` |
| 2 | Draft has correct recipient | ARRAY_CONTAINS | `jane.doe@northwindretail.com` in `to` |
| 3 | Draft has CC recipient | ARRAY_CONTAINS | `sarah.connor@company.com` in `cc` |
| 4 | Draft body contains key content | STRING_CONTAINS | Body contains `Market Overview` |
| 5 | Draft has Drafts label | ARRAY_CONTAINS | `Drafts` in labels array |
| 6 | Draft is not in Sent | NOT_EXISTS | Email NOT found with `Sent` label |
| 7 | Draft has timestamp | EXISTS | timestamp field exists |
| 8 | Draft body contains all sections | STRING_CONTAINS | Body contains `Implementation Plan` |

### Common Issues

- **Draft not sent:** Critical - draft must NOT have `Sent` label
- **Subject format:** Must be exactly `Draft: Proposal Outline` (with `Draft: ` prefix)
- **Body content:** Must include both `Market Overview` and `Implementation Plan` (case-insensitive)

---

## Task 5: MAILG-EMAIL-ANALYSIS-RDT-005

### Prompt

```
Analyze the current inbox and provide a summary that includes: 1) Total number of unread emails, 2) The sender who has sent the most emails, 3) The most recent email received, 4) Any emails marked as important, and 5) A brief analysis of email patterns (e.g., most active time period, common senders, etc.).
```

### Prerequisites

- **Environment variables required:** `VITE_OPENROUTER_API_KEY`, `VITE_OPENROUTER_URL`, `VITE_OPENROUTER_MODEL`
- **Existing emails in inbox:** Create several emails with different senders, read/unread status, and timestamps
- **Logged in user:** Must be logged in as `john.doe@example.com`

### Step-by-Step Testing

1. **Reset State:**
   - Click **"Reset State"** button

2. **Setup Test Data:**
   - Navigate to main mailg app
   - Create a diverse set of emails:
     - **Unread emails:** Create 3-5 unread emails
     - **Multiple senders:** Create emails from at least 3 different senders (one should send more than others)
     - **Recent email:** Create one email with the most recent timestamp
     - **Important emails:** Mark 1-2 emails as important (if supported)
     - **Various timestamps:** Spread emails across different times/dates

3. **Open Verifier:**
   - Click **"Open Verifier"** for `MAILG-EMAIL-ANALYSIS-RDT-005`
   - Verify 3 RDT assertions listed
   - Notice each assertion has a **"Model Response"** textarea

4. **Execute the Prompt:**
   - **Option A: Use LLM (Recommended)**
     - Analyze inbox manually or use an LLM to generate the analysis
     - The analysis should include all 5 required elements
   - **Option B: Manual Analysis**
     - Count unread emails
     - Identify most frequent sender
     - Find most recent email
     - Check for important emails
     - Analyze patterns

5. **Enter Model Response:**
   - For each of the 3 RDT assertions, paste the model response into the textarea
   - The response should be a comprehensive analysis covering all required points

6. **Run Assertions:**
   - Click **"Run All Assertions"**
   - Wait for LLM judge evaluation (may take 10-30 seconds per assertion)

7. **Verify Results:**
   - Check **scores** displayed for each assertion:
     - **FACTUAL_VERIFICATION:** Score >= 4.0/5.0 (80% threshold)
     - **REASONING_QUALITY:** Score >= 3.75/5.0 (75% threshold)
     - **INFORMATION_PRECISION:** Score >= 3.75/5.0 (75% threshold)
   - Review **criteria scores** in the details section

### Expected Assertions (3 total - RDT)

| # | Title | Operator | Expected Result |
|---|-------|----------|----------------|
| 1 | Verify factual accuracy of inbox statistics | FACTUAL_VERIFICATION | Score >= 4.0/5.0 (80%) |
| 2 | Evaluate reasoning quality of email pattern analysis | REASONING_QUALITY | Score >= 3.75/5.0 (75%) |
| 3 | Assess information precision of the analysis | INFORMATION_PRECISION | Score >= 3.75/5.0 (75%) |

### RDT Assertion Details

#### Assertion 1: FACTUAL_VERIFICATION
**Expected Facts (5 total, each weight: 1):**
1. Total number of unread emails in the inbox
2. The sender email address who has sent the most emails
3. The subject line of the most recent email received
4. Whether there are any emails marked as important (true/false)
5. The timestamp or date of the most recent email

**Pass Threshold:** 80% (weighted average >= 4.0/5.0)

#### Assertion 2: REASONING_QUALITY
**Aspects (4 total, each weight: 1):**
1. Correctly identifies patterns in email activity (e.g., time periods, frequency)
2. Draws valid conclusions from the email data
3. Provides clear logical reasoning for identified patterns
4. Connects different pieces of information meaningfully

**Pass Threshold:** 75% (weighted average >= 3.75/5.0)

#### Assertion 3: INFORMATION_PRECISION
**Expected Facts (5 total):**
- Unread email count is accurately reported
- Most active sender is correctly identified
- Most recent email details are precise
- Important email status is accurately stated
- Email pattern analysis is based on actual data

**Expected Reasonings (3 total):**
- Analysis of email activity patterns
- Identification of trends or commonalities
- Logical connections between different email characteristics

**Pass Threshold:** 75% (average score >= 3.75/5.0)

### Common Issues

- **Missing environment variables:** RDT assertions will fail if OpenRouter env vars not set
- **Low scores:** Ensure model response is comprehensive and accurate
- **Timeout errors:** LLM calls may timeout - check network and API key validity
- **Incomplete analysis:** Model response must cover all required facts/aspects

---

## Troubleshooting

### General Issues

#### Assertions Not Running
- **Check:** Browser console for errors
- **Fix:** Ensure dev server is running (`npm run dev`)
- **Fix:** Verify route `/verify_raw` is accessible

#### Assertions Failing Unexpectedly
- **Check:** Download localStorage and inspect email data structure
- **Fix:** Verify email fields match expected format (e.g., `to` is array, `labels` is array)
- **Fix:** Check JSONPath expressions are correct (use browser console to test)

#### Modal Not Opening
- **Check:** Browser console for React errors
- **Fix:** Verify all components are imported correctly
- **Fix:** Check that `getExpectedState()` returns valid data

### Task-Specific Issues

#### Task 1: Email Not Found
- **Issue:** Assertion can't find email with recipient
- **Fix:** Verify email was actually sent (check `Sent` label exists)
- **Fix:** Check exact email address matches (case-sensitive for `to` field)

#### Task 2: Reply/Forward Subject Format
- **Issue:** Subject doesn't match expected format
- **Fix:** Ensure reply has `Re: ` prefix, forward has `Fwd: ` prefix
- **Fix:** Check exact subject match (case-sensitive)

#### Task 3: Label Not Found
- **Issue:** Label assertion fails
- **Fix:** Verify label format is exactly `Projects/Phoenix` (case-sensitive, forward slash)
- **Fix:** Check email still exists after archiving (should be in All Mail, not Inbox)

#### Task 4: Draft Sent Instead of Saved
- **Issue:** Assertion fails because draft has `Sent` label
- **Fix:** Ensure draft is saved, NOT sent
- **Fix:** Check Drafts folder for the email

#### Task 5: RDT Assertions Fail
- **Issue:** LLM judge returns low scores
- **Fix:** Ensure model response is comprehensive and accurate
- **Fix:** Check environment variables are set correctly
- **Fix:** Verify OpenRouter API is accessible and API key is valid
- **Fix:** Review criteria scores to identify which facts/aspects failed

### Environment Variable Issues

#### RDT Operators Not Working
```bash
# Check environment variables are set
echo $VITE_OPENROUTER_API_KEY
echo $VITE_OPENROUTER_URL
echo $VITE_OPENROUTER_MODEL

# Restart dev server after setting env vars
npm run dev
```

#### TASK_IDS Filtering Not Working
```bash
# Set in .env file
VITE_TASK_IDS=MAILG-COMPOSE-SEND-001,MAILG-REPLY-FORWARD-002

# Restart dev server
npm run dev
```

### Debugging Tips

1. **Use Browser Console:**
   - Open DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for API calls

2. **Download localStorage:**
   - Click "Download localStorage" button
   - Inspect JSON structure
   - Verify email data matches expected format

3. **Test Individual Assertions:**
   - Click "Run" button on individual assertions
   - Check execution log for detailed output
   - Review diff viewer for actual vs expected values

4. **Check Assertion Engine:**
   - Test JSONPath expressions in browser console:
     ```javascript
     import { resolvePath } from './lib/utils/path-resolver.js';
     const data = JSON.parse(localStorage.getItem('mailg-state'));
     resolvePath(data, 'emails[?(@.to[0]=="david.kim@acelogistics.com")].subject');
     ```

---

## Quick Reference

### All Prompts Summary

1. **MAILG-COMPOSE-SEND-001:** Compose and send email with CC/BCC
2. **MAILG-REPLY-FORWARD-002:** Reply to thread and forward email
3. **MAILG-ORGANIZE-LABELS-003:** Archive, label, star, and unstar emails
4. **MAILG-DRAFT-SCHEDULE-004:** Create and edit draft email
5. **MAILG-EMAIL-ANALYSIS-RDT-005:** Analyze inbox with LLM evaluation

### Assertion Operators Used

- `ARRAY_LENGTH` - Check array length with operators (==, >, >=, <, <=)
- `ARRAY_CONTAINS` - Check if array contains expected items
- `STRING_MATCH` - Exact string match (with options: caseInsensitive, trim)
- `STRING_CONTAINS` - Substring match (with caseInsensitive option)
- `EXISTS` - Check if path exists and is not null/undefined
- `NOT_EXISTS` - Check if path does not exist or is null/undefined
- `JSON_MATCH` - Deep equality check for JSON values
- `FACTUAL_VERIFICATION` - LLM-based factual accuracy check (RDT)
- `REASONING_QUALITY` - LLM-based reasoning quality check (RDT)
- `INFORMATION_PRECISION` - LLM-based information precision check (RDT)

---

## Additional Resources

- **Harness Report:** See `HARNESS_REPORT.md` for implementation details
- **Assertion Engine:** See `src/lib/assertion-engine.js` for operator implementations
- **Path Resolver:** See `src/lib/utils/path-resolver.js` for JSONPath usage
- **Assertion Operators:** See `src/lib/utils/assertion-operators.js` for all operators

---

**Last Updated:** $(date)  
**Maintained By:** Development Team  
**Questions?** Check troubleshooting section or review source code comments

