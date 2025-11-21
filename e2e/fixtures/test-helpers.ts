export async function createSession(page: any): Promise<string> {
  await page.goto('/');
  await page.click('[data-testid="create-session-btn"]');
  const url = page.url();
  return url.split('/').pop();
}

export async function joinSession(page: any, sessionId: string): Promise<void> {
  await page.goto('/');
  await page.fill('[data-testid="session-code-input"]', sessionId);
  await page.click('[data-testid="join-session-btn"]');
}

export async function createTask(page: any, content: string, isSecret = false): Promise<void> {
  await page.fill('[data-testid="task-input"]', content);
  if (isSecret) {
    await page.check('[data-testid="secret-toggle"]');
  }
  await page.click('[data-testid="add-task"]');
}

/**
 * Get task ID from a task element by index
 */
export async function getTaskId(page: any, index: number = 0): Promise<string> {
  const taskElements = await page.locator('[data-testid^="task-"]').all();

  if (index >= taskElements.length) {
    throw new Error(`Task at index ${index} not found. Found ${taskElements.length} tasks.`);
  }

  const testId = await taskElements[index].getAttribute('data-testid');
  if (!testId) {
    throw new Error(`Task at index ${index} has no data-testid attribute`);
  }

  return testId.replace('task-', '');
}

/**
 * Click the reveal button for a specific task
 */
export async function voteReveal(page: any, taskId: string): Promise<void> {
  const revealBtn = page.locator(`[data-testid="reveal-btn-${taskId}"]`);
  await revealBtn.waitFor({ state: 'visible', timeout: 5000 });
  await revealBtn.click();
}

/**
 * Wait for a task to be revealed (lock icon disappears)
 */
export async function waitForTaskReveal(page: any, taskId: string, timeout: number = 5000): Promise<void> {
  const taskLocator = page.locator(`[data-testid="task-${taskId}"]`);

  // Wait for task to exist
  await taskLocator.waitFor({ state: 'visible', timeout });

  // Wait for lock icon to disappear (means revealed)
  await page.waitForFunction(
    (id: string) => {
      const taskElement = document.querySelector(`[data-testid="task-${id}"]`);
      return taskElement && !taskElement.textContent?.includes('🔒');
    },
    taskId,
    { timeout }
  );
}

/**
 * Get the text content of a task
 */
export async function getTaskContent(page: any, taskId: string): Promise<string> {
  const taskLocator = page.locator(`[data-testid="task-${taskId}"]`);
  await taskLocator.waitFor({ state: 'visible', timeout: 5000 });

  const content = await taskLocator.textContent();
  return content?.trim() || '';
}
