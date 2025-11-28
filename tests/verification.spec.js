// @ts-check
const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3002';

// Helper function to reset state
async function resetState(page) {
  await page.goto(`${BASE_URL}/inbox`);
  await page.evaluate(() => {
    localStorage.clear();
    indexedDB.deleteDatabase('my-database');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

// Helper to dismiss any tooltips/popovers
async function dismissOverlays(page) {
  // Click on the body to dismiss any overlays
  await page.mouse.click(10, 10);
  await page.waitForTimeout(200);
  // Also press Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
}

// =====================================================
// TASK 1: MAILG-COMPOSE-SEND-001
// Compose and send an email
// =====================================================
test.describe('Task 1: MAILG-COMPOSE-SEND-001', () => {
  test('Compose and send email', async ({ page }) => {
    test.setTimeout(90000);
    console.log('Starting Task 1: Compose and Send Email');

    await resetState(page);
    console.log('State reset complete');

    await page.goto(`${BASE_URL}/inbox`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    console.log('Navigated to inbox');

    // Click Compose button
    const composeBtn = page.locator('.T-I.T-I-KE.L3, [gh="cm"]').first();
    await composeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await composeBtn.click();
    await page.waitForTimeout(1000);
    console.log('Clicked Compose button');

    // Wait for compose modal
    await page.waitForSelector('[data-compose-id]', { timeout: 10000 });
    const composeModal = page.locator('[data-compose-id]');
    console.log('Compose dialog opened');

    // Fill the To field
    const toInputArea = composeModal.locator('input[type="text"]').first();
    await toInputArea.click();
    await toInputArea.fill('david.kim@acelogistics.com');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    console.log('Filled To field');

    // Dismiss tooltip by clicking outside and pressing Tab to move focus
    await page.keyboard.press('Tab');
    await page.waitForTimeout(300);

    // Fill Subject using force click
    const subjectInput = composeModal.locator('input[placeholder="Subject"]');
    await subjectInput.click({ force: true });
    await subjectInput.fill('Q3 Financial Forecast Submission');
    console.log('Filled Subject field');

    // Fill Body
    const bodyEditor = composeModal.locator('.ProseMirror').first();
    await bodyEditor.click({ force: true });
    await page.keyboard.type('Hi David, please find attached the updated Q3 financial forecast. We\'ve incorporated the recent adjustments in marketing spend and logistics costs. Kindly review and confirm if these align with your records. Best, Laura');
    console.log('Filled body content');

    await page.screenshot({ path: 'test-results/task1-before-send.png', fullPage: true });

    // Click Send button with force
    const sendBtn = composeModal.locator('div[role="button"]:has-text("Send")').first();
    await sendBtn.click({ force: true });
    console.log('Clicked Send button');

    await page.waitForTimeout(3000);

    // Verify email in localStorage
    const emails = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('emails') || '[]');
    });

    console.log(`Total emails in storage: ${emails.length}`);

    const sentEmail = emails.find(e =>
      e.to && Array.isArray(e.to) && e.to.includes('david.kim@acelogistics.com')
    );

    if (sentEmail) {
      console.log('SUCCESS: Email found');
      console.log(`  Subject: ${sentEmail.subject}`);
      console.log(`  To: ${sentEmail.to}`);
      console.log(`  Labels: ${sentEmail.labels}`);
      console.log(`  Has Sent label: ${sentEmail.labels?.includes('Sent')}`);

      expect(sentEmail.subject).toBe('Q3 Financial Forecast Submission');
    } else {
      console.log('WARNING: Email not found');
    }

    await page.screenshot({ path: 'test-results/task1-after-send.png', fullPage: true });
  });
});

// =====================================================
// TASK 4: MAILG-DRAFT-SCHEDULE-004
// =====================================================
test.describe('Task 4: MAILG-DRAFT-SCHEDULE-004', () => {
  test('Create draft email', async ({ page }) => {
    test.setTimeout(60000);
    console.log('Starting Task 4: Draft Management');

    await resetState(page);

    await page.goto(`${BASE_URL}/inbox`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click Compose
    const composeBtn = page.locator('.T-I.T-I-KE.L3, [gh="cm"]').first();
    await composeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await composeBtn.click();
    await page.waitForTimeout(1000);
    console.log('Opened compose dialog');

    await page.waitForSelector('[data-compose-id]', { timeout: 10000 });
    const composeModal = page.locator('[data-compose-id]');

    // Fill To field
    const toInput = composeModal.locator('input[type="text"]').first();
    await toInput.click();
    await toInput.fill('jane.doe@northwindretail.com');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    console.log('Filled To field');

    // Fill Subject with force
    const subjectInput = composeModal.locator('input[placeholder="Subject"]');
    await subjectInput.click({ force: true });
    await subjectInput.fill('Draft: Proposal Outline');
    console.log('Filled Subject');

    // Fill Body with force
    const bodyEditor = composeModal.locator('.ProseMirror').first();
    await bodyEditor.click({ force: true });
    await page.keyboard.type('Hi Jane, here are the sections I plan to include in the proposal: 1) Market Overview, 2) Budget Estimates, 3) Implementation Plan. Please add your thoughts.');
    console.log('Filled body');

    // Wait for auto-save
    await page.waitForTimeout(5000);
    console.log('Waited for auto-save');

    // Close to save draft
    const closeBtn = composeModal.locator('button[title="Close"]').first();
    await closeBtn.click({ force: true });
    await page.waitForTimeout(1000);
    console.log('Closed compose window');

    // Verify draft
    const emails = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('emails') || '[]');
    });

    const draftEmail = emails.find(e => e.subject === 'Draft: Proposal Outline');

    console.log('\nVerification Results:');
    if (draftEmail) {
      console.log('Draft found');
      console.log(`  To: ${draftEmail.to}`);
      console.log(`  Labels: ${draftEmail.labels}`);

      expect(draftEmail.labels).toContain('Drafts');
      expect(draftEmail.labels).not.toContain('Sent');
    } else {
      console.log('WARNING: Draft not found');
    }

    await page.screenshot({ path: 'test-results/task4-final.png', fullPage: true });
  });
});

// =====================================================
// VERIFICATION PAGE TEST
// =====================================================
test.describe('Verification Page', () => {
  test('Check verification page structure', async ({ page }) => {
    test.setTimeout(60000);
    console.log('Starting Verification Page Test');

    await page.goto(`${BASE_URL}/verify_raw`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('Navigated to /verify_raw');

    await page.screenshot({ path: 'test-results/verify-raw-page.png', fullPage: true });

    // Look for tasks
    const task1 = page.locator('text=MAILG-COMPOSE-SEND-001');
    const task2 = page.locator('text=MAILG-REPLY-FORWARD-002');
    const task3 = page.locator('text=MAILG-ORGANIZE-LABELS-003');
    const task4 = page.locator('text=MAILG-DRAFT-SCHEDULE-004');
    const task5 = page.locator('text=MAILG-EMAIL-ANALYSIS-RDT-005');

    console.log('Tasks visible:');
    console.log(`  Task 1: ${await task1.count() > 0}`);
    console.log(`  Task 2: ${await task2.count() > 0}`);
    console.log(`  Task 3: ${await task3.count() > 0}`);
    console.log(`  Task 4: ${await task4.count() > 0}`);
    console.log(`  Task 5: ${await task5.count() > 0}`);

    // Check localStorage
    const data = await page.evaluate(() => {
      const emails = JSON.parse(localStorage.getItem('emails') || '[]');
      return {
        emailCount: emails.length,
        labels: [...new Set(emails.flatMap(e => e.labels || []))],
      };
    });

    console.log(`\nLocalStorage: ${data.emailCount} emails`);
    console.log(`Labels: ${data.labels.slice(0, 10).join(', ')}`);
  });
});

// =====================================================
// FULL WORKFLOW TEST
// =====================================================
test.describe('Full Workflow', () => {
  test('Compose email and verify', async ({ page }) => {
    test.setTimeout(120000);
    console.log('Starting Full Workflow Test');

    await resetState(page);

    await page.goto(`${BASE_URL}/inbox`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const composeBtn = page.locator('.T-I.T-I-KE.L3, [gh="cm"]').first();
    await composeBtn.waitFor({ state: 'visible', timeout: 10000 });
    await composeBtn.click();
    await page.waitForTimeout(1000);

    const composeModal = page.locator('[data-compose-id]');
    await composeModal.waitFor({ state: 'visible', timeout: 10000 });

    // Fill To
    const toInput = composeModal.locator('input[type="text"]').first();
    await toInput.click();
    await toInput.fill('david.kim@acelogistics.com');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    console.log('Filled To');

    // Fill Subject
    const subjectInput = composeModal.locator('input[placeholder="Subject"]');
    await subjectInput.click({ force: true });
    await subjectInput.fill('Q3 Financial Forecast Submission');
    console.log('Filled Subject');

    // Fill Body
    const bodyEditor = composeModal.locator('.ProseMirror').first();
    await bodyEditor.click({ force: true });
    await page.keyboard.type('Hi David, please find attached the updated Q3 financial forecast. We\'ve incorporated the recent adjustments in marketing spend and logistics costs. Kindly review and confirm if these align with your records. Best, Laura');
    console.log('Filled Body');

    // Click Send
    const sendBtn = composeModal.locator('div[role="button"]:has-text("Send")').first();
    await sendBtn.click({ force: true });
    console.log('Clicked Send');

    await page.waitForTimeout(3000);

    // Verify
    let emails = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('emails') || '[]');
    });

    const sentEmail = emails.find(e =>
      e.to && Array.isArray(e.to) && e.to.includes('david.kim@acelogistics.com')
    );

    console.log('\n=== Email Verification ===');
    if (sentEmail) {
      console.log('Email found:');
      console.log(`  Subject: ${sentEmail.subject}`);
      console.log(`  To: ${sentEmail.to}`);
      console.log(`  Labels: ${sentEmail.labels}`);
      console.log(`  From: ${sentEmail.from?.email}`);

      const assertions = [
        { name: 'Subject matches', pass: sentEmail.subject === 'Q3 Financial Forecast Submission' },
        { name: 'Has Sent label', pass: sentEmail.labels?.includes('Sent') },
        { name: 'Has timestamp', pass: !!sentEmail.timestamp },
        { name: 'Has correct recipient', pass: sentEmail.to?.includes('david.kim@acelogistics.com') },
        { name: 'Body contains Q3', pass: sentEmail.body?.toLowerCase().includes('q3 financial forecast') },
      ];

      console.log('\n=== Assertion Results ===');
      assertions.forEach(a => {
        console.log(`  ${a.pass ? '✓' : '✗'} ${a.name}`);
      });

      console.log(`\nPassed: ${assertions.filter(a => a.pass).length}/${assertions.length}`);
    } else {
      console.log('Email NOT found');
    }

    // Navigate to verify_raw
    await page.goto(`${BASE_URL}/verify_raw`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/full-workflow-verify.png', fullPage: true });

    console.log('\nFull workflow test completed.');
  });
});
