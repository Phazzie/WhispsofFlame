import { test, expect } from '@playwright/test';
import {
  createSession,
  joinSession,
  createTask,
  getTaskId,
  voteReveal,
  waitForTaskReveal,
  getTaskContent
} from '../fixtures/test-helpers';

test.describe('Secret Task Reveal Feature', () => {

  test('creates masked secret task', async ({ page }) => {
    // Create session
    await createSession(page);

    // Create secret task
    await createTask(page, 'Secret plan', true);

    // Wait for task to appear
    await page.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });

    // Get the task ID
    const taskId = await getTaskId(page, 0);
    const taskLocator = page.locator(`[data-testid="task-${taskId}"]`);

    // Task should show lock icon
    await expect(taskLocator).toContainText('🔒');

    // Task content should NOT be visible
    await expect(taskLocator).not.toContainText('Secret plan');

    // Should show vote count
    await expect(taskLocator).toContainText('Secret task (0/2 votes)');
  });

  test('single vote doesn\'t reveal', async ({ page }) => {
    // Create session
    await createSession(page);

    // Create secret task
    await createTask(page, 'Confidential info', true);

    // Wait for task to appear
    await page.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });

    // Get the task ID
    const taskId = await getTaskId(page, 0);
    const taskLocator = page.locator(`[data-testid="task-${taskId}"]`);

    // Click Reveal button
    await voteReveal(page, taskId);

    // Wait a bit for the vote to sync
    await page.waitForTimeout(1000);

    // Should show updated vote count
    await expect(taskLocator).toContainText('Secret task (1/2 votes)', { timeout: 3000 });

    // Task content should STILL be masked
    await expect(taskLocator).not.toContainText('Confidential info');

    // Lock icon still visible
    await expect(taskLocator).toContainText('🔒');
  });

  test('two votes from same user doesn\'t reveal', async ({ page }) => {
    // Create session
    await createSession(page);

    // Create secret task
    await createTask(page, 'Top secret', true);

    // Wait for task to appear
    await page.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });

    // Get the task ID
    const taskId = await getTaskId(page, 0);
    const taskLocator = page.locator(`[data-testid="task-${taskId}"]`);

    // Click Reveal button once
    await voteReveal(page, taskId);
    await page.waitForTimeout(1000);

    // Try to click Reveal button again
    const revealButton = page.locator(`[data-testid="reveal-btn-${taskId}"]`);
    if (await revealButton.isVisible()) {
      await voteReveal(page, taskId);
      await page.waitForTimeout(1000);
    }

    // Should still show only 1 vote (duplicate prevention)
    await expect(taskLocator).toContainText('Secret task (1/2 votes)', { timeout: 3000 });

    // Task content should STILL be masked
    await expect(taskLocator).not.toContainText('Top secret');
  });

  test('two unique votes reveal task', async ({ browser }) => {
    // Create two browser contexts (different users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1 creates session and secret task
      const sessionCode = await createSession(page1);
      await createTask(page1, 'Launch the product', true);

      // Wait for task to appear
      await page1.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });

      // Get the task ID
      const taskId = await getTaskId(page1, 0);

      // User 1 clicks Reveal (1/2 votes)
      await voteReveal(page1, taskId);
      await page1.waitForTimeout(1000);

      // Verify User 1 sees 1/2 votes
      const task1Locator = page1.locator(`[data-testid="task-${taskId}"]`);
      await expect(task1Locator).toContainText('Secret task (1/2 votes)', { timeout: 3000 });

      // User 2 joins the same session
      await joinSession(page2, sessionCode);

      // Wait for task to appear for User 2
      await page2.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });

      // User 2 clicks Reveal (2/2 votes)
      await voteReveal(page2, taskId);

      // Wait for reveal to sync
      await page2.waitForTimeout(2000);

      // Both users should see revealed content
      await expect(task1Locator).toContainText('Launch the product', { timeout: 5000 });

      const task2Locator = page2.locator(`[data-testid="task-${taskId}"]`);
      await expect(task2Locator).toContainText('Launch the product', { timeout: 5000 });

      // No lock icon for both users
      await expect(task1Locator).not.toContainText('🔒');
      await expect(task2Locator).not.toContainText('🔒');

      // No reveal button for both users
      const revealBtn1 = page1.locator(`[data-testid="reveal-btn-${taskId}"]`);
      const revealBtn2 = page2.locator(`[data-testid="reveal-btn-${taskId}"]`);
      await expect(revealBtn1).not.toBeVisible({ timeout: 3000 });
      await expect(revealBtn2).not.toBeVisible({ timeout: 3000 });

    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('revealed task stays revealed for new users', async ({ browser }) => {
    // Create three browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const context3 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    const page3 = await context3.newPage();

    try {
      // User 1 creates session and secret task
      const sessionCode = await createSession(page1);
      await createTask(page1, 'Already revealed secret', true);

      // Wait for task to appear
      await page1.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });
      const taskId = await getTaskId(page1, 0);

      // User 1 votes
      await voteReveal(page1, taskId);
      await page1.waitForTimeout(1000);

      // User 2 joins and votes (reveals the task)
      await joinSession(page2, sessionCode);
      await page2.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });
      await voteReveal(page2, taskId);
      await page2.waitForTimeout(2000);

      // Verify task is revealed for User 1 and User 2
      const task1Locator = page1.locator(`[data-testid="task-${taskId}"]`);
      await expect(task1Locator).toContainText('Already revealed secret', { timeout: 5000 });

      // User 3 joins after revelation
      await joinSession(page3, sessionCode);
      await page3.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });

      // User 3 should immediately see revealed content (no voting needed)
      const task3Locator = page3.locator(`[data-testid="task-${taskId}"]`);
      await expect(task3Locator).toContainText('Already revealed secret', { timeout: 5000 });

      // No reveal button for User 3
      const revealBtn3 = page3.locator(`[data-testid="reveal-btn-${taskId}"]`);
      await expect(revealBtn3).not.toBeVisible({ timeout: 3000 });

    } finally {
      await page1.close();
      await page2.close();
      await page3.close();
      await context1.close();
      await context2.close();
      await context3.close();
    }
  });

  test('multiple secret tasks', async ({ browser }) => {
    // Create two browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1 creates session and two secret tasks
      const sessionCode = await createSession(page1);
      await createTask(page1, 'Secret task A', true);
      await page1.waitForTimeout(500);
      await createTask(page1, 'Secret task B', true);

      // Wait for both tasks to appear
      await page1.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });
      await page1.waitForTimeout(1000);

      // Get task IDs
      const taskAId = await getTaskId(page1, 0);
      const taskBId = await getTaskId(page1, 1);

      const taskALocator = page1.locator(`[data-testid="task-${taskAId}"]`);
      const taskBLocator = page1.locator(`[data-testid="task-${taskBId}"]`);

      // Both should be masked initially
      await expect(taskALocator).toContainText('🔒');
      await expect(taskBLocator).toContainText('🔒');
      await expect(taskALocator).not.toContainText('Secret task A');
      await expect(taskBLocator).not.toContainText('Secret task B');

      // User 2 joins
      await joinSession(page2, sessionCode);
      await page2.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });
      await page2.waitForTimeout(1000);

      // User 1 votes reveal on task A (1/2)
      await voteReveal(page1, taskAId);
      await page1.waitForTimeout(1000);
      await expect(taskALocator).toContainText('(1/2 votes)', { timeout: 3000 });

      // User 2 votes reveal on task A (2/2)
      await voteReveal(page2, taskAId);
      await page2.waitForTimeout(2000);

      // Task A should be revealed
      await expect(taskALocator).toContainText('Secret task A', { timeout: 5000 });
      const task2ALocator = page2.locator(`[data-testid="task-${taskAId}"]`);
      await expect(task2ALocator).toContainText('Secret task A', { timeout: 5000 });

      // Task B should STILL be masked
      await expect(taskBLocator).toContainText('🔒');
      await expect(taskBLocator).not.toContainText('Secret task B');
      const task2BLocator = page2.locator(`[data-testid="task-${taskBId}"]`);
      await expect(task2BLocator).toContainText('🔒');

      // User 1 votes on task B (1/2)
      await voteReveal(page1, taskBId);
      await page1.waitForTimeout(1000);

      // User 2 votes on task B (2/2)
      await voteReveal(page2, taskBId);
      await page2.waitForTimeout(2000);

      // Task B should be revealed
      await expect(taskBLocator).toContainText('Secret task B', { timeout: 5000 });
      await expect(task2BLocator).toContainText('Secret task B', { timeout: 5000 });

    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('deleting unrevealed secret task', async ({ page }) => {
    // Create session
    await createSession(page);

    // Create secret task
    await createTask(page, 'Delete me before reveal', true);

    // Wait for task to appear
    await page.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });

    // Get the task ID
    const taskId = await getTaskId(page, 0);

    // Delete the task
    await page.click(`[data-testid="delete-btn-${taskId}"]`);

    // Wait for deletion to sync
    await page.waitForTimeout(1000);

    // Task should be removed
    const taskLocator = page.locator(`[data-testid="task-${taskId}"]`);
    await expect(taskLocator).not.toBeVisible({ timeout: 3000 });
  });

  test('deleting revealed secret task', async ({ browser }) => {
    // Create two browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1 creates session and secret task
      const sessionCode = await createSession(page1);
      await createTask(page1, 'Delete after reveal', true);

      // Wait for task to appear
      await page1.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });
      const taskId = await getTaskId(page1, 0);

      // User 1 votes
      await voteReveal(page1, taskId);
      await page1.waitForTimeout(1000);

      // User 2 joins and votes (reveals the task)
      await joinSession(page2, sessionCode);
      await page2.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });
      await voteReveal(page2, taskId);
      await page2.waitForTimeout(2000);

      // Verify task is revealed
      const task1Locator = page1.locator(`[data-testid="task-${taskId}"]`);
      await expect(task1Locator).toContainText('Delete after reveal', { timeout: 5000 });

      // Delete the revealed task
      await page1.click(`[data-testid="delete-btn-${taskId}"]`);
      await page1.waitForTimeout(1000);

      // Task should be removed from both pages
      await expect(task1Locator).not.toBeVisible({ timeout: 3000 });

      const task2Locator = page2.locator(`[data-testid="task-${taskId}"]`);
      await expect(task2Locator).not.toBeVisible({ timeout: 3000 });

    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('voting on already revealed task does nothing', async ({ browser }) => {
    // Create two browser contexts
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1 creates session and secret task
      const sessionCode = await createSession(page1);
      await createTask(page1, 'Already revealed', true);

      // Wait for task to appear
      await page1.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });
      const taskId = await getTaskId(page1, 0);

      // Reveal the task with 2 votes
      await voteReveal(page1, taskId);
      await page1.waitForTimeout(1000);

      await joinSession(page2, sessionCode);
      await page2.waitForSelector('[data-testid^="task-"]', { timeout: 5000 });
      await voteReveal(page2, taskId);
      await page2.waitForTimeout(2000);

      // Verify task is revealed
      const task1Locator = page1.locator(`[data-testid="task-${taskId}"]`);
      await expect(task1Locator).toContainText('Already revealed', { timeout: 5000 });

      // Reveal button should not be visible anymore
      const revealBtn1 = page1.locator(`[data-testid="reveal-btn-${taskId}"]`);
      await expect(revealBtn1).not.toBeVisible({ timeout: 3000 });

      // Content should remain visible (no change)
      await expect(task1Locator).toContainText('Already revealed');

    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('creating secret task with empty content should fail', async ({ page }) => {
    // Create session
    await createSession(page);

    // Try to create secret task with empty content
    await page.check('[data-testid="secret-toggle"]');
    await page.click('[data-testid="add-task"]');

    // Wait a bit
    await page.waitForTimeout(1000);

    // No task should be created
    const tasks = page.locator('[data-testid^="task-"]');
    await expect(tasks).toHaveCount(0);
  });
});
