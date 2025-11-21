import { test, expect } from '@playwright/test';

test.describe('Guest Flow', () => {
  test('should join session and create public task', async ({ page }) => {
    // Navigate to home
    await page.goto('/');

    // Should see title
    await expect(page.locator('h1')).toContainText('WhispsofFlame');

    // Create new session
    await page.click('[data-testid="create-session-btn"]');

    // Should navigate to /s/ABC123 format
    await expect(page).toHaveURL(/\/s\/[A-Z0-9]{6}/);

    // Wait for session to load
    await expect(page.locator('h1')).toContainText('Session:');

    // Should see user info (animal name)
    await expect(page.locator('text=/.*Elephant|Dolphin|Fox|Owl|Bear|Wolf/')).toBeVisible();

    // Create a task
    await page.fill('[data-testid="task-input"]', 'Test task 1');
    await page.click('[data-testid="add-task"]');

    // Task should appear
    await expect(page.locator('text=Test task 1')).toBeVisible();
  });

  test('should mark task as done', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="create-session-btn"]');

    // Create task
    await page.fill('[data-testid="task-input"]', 'Task to complete');
    await page.click('[data-testid="add-task"]');

    // Mark as done
    const doneCheckbox = page.locator('[data-testid^="done-toggle-"]').first();
    await doneCheckbox.check();

    // Should have line-through styling
    await expect(page.locator('text=Task to complete')).toHaveClass(/line-through/);
  });
});
