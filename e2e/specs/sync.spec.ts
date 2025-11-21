import { test, expect } from '@playwright/test';

test.describe('Multi-tab Sync', () => {
  test('should sync tasks between two tabs', async ({ browser }) => {
    // Create two browser contexts (different users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // User 1 creates session
    await page1.goto('/');
    await page1.click('[data-testid="create-session-btn"]');
    const sessionUrl = page1.url();
    const sessionId = sessionUrl.split('/').pop();

    // User 2 joins same session
    await page2.goto('/');
    await page2.fill('[data-testid="session-code-input"]', sessionId!);
    await page2.click('[data-testid="join-session-btn"]');

    // User 1 creates task
    await page1.fill('[data-testid="task-input"]', 'Synced task');
    await page1.click('[data-testid="add-task"]');

    // User 2 should see it within 2 seconds
    await expect(page2.locator('text=Synced task')).toBeVisible({ timeout: 2000 });

    // User 2 marks done
    await page2.locator('[data-testid^="done-toggle-"]').first().check();

    // User 1 should see it marked done
    await expect(page1.locator('text=Synced task').locator('xpath=ancestor::div')).toHaveClass(/opacity-50/, { timeout: 2000 });

    await context1.close();
    await context2.close();
  });
});
