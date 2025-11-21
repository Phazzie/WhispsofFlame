const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const logs = [];

  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    errors.push(err.toString());
  });

  try {
    await page.goto('http://localhost:4201/', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.waitForTimeout(3000);

    const h1 = await page.locator('h1').textContent().catch(() => null);
    console.log('✓ H1 text:', h1 || '(not found)');

    const createBtn = await page.locator('[data-testid="create-session-btn"]').count().catch(() => 0);
    console.log('✓ Create button count:', createBtn);

    console.log('\n=== CONSOLE LOGS ===');
    logs.forEach(log => console.log(log));

    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach(err => console.log(err));
    } else {
      console.log('\n✅ No page errors');
    }

  } catch (e) {
    console.error('❌ Error:', e.message);
    console.log('\n=== LOGS ===');
    logs.forEach(log => console.log(log));
  }

  await browser.close();
})();
