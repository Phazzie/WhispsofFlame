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
