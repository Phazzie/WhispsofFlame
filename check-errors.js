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
    await page.goto('http://localhost:4200/', {
      waitUntil: 'domcontentloaded',
      timeout: 8000
    });

    await page.waitForTimeout(3000);

    console.log('\n=== CONSOLE LOGS ===');
    logs.forEach(log => console.log(log));

    console.log('\n=== PAGE ERRORS ===');
    if (errors.length === 0) {
      console.log('✅ No JavaScript errors!');
    } else {
      errors.forEach(err => console.log('❌', err));
    }

    const h1 = await page.locator('h1').textContent().catch(() => null);
    console.log('\n=== PAGE CONTENT ===');
    console.log('H1 text:', h1 || '(not found)');

  } catch (e) {
    console.error('❌ Navigation/page error:', e.message);
    console.log('\n=== LOGS BEFORE CRASH ===');
    logs.forEach(log => console.log(log));
    console.log('\n=== ERRORS BEFORE CRASH ===');
    errors.forEach(err => console.log(err));
  }

  await browser.close();
})();
