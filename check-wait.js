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
    console.log('Loading page...');
    await page.goto('http://localhost:4200/', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    console.log('Page loaded. Waiting 1 second...');
    await page.waitForTimeout(1000);

    // Try multiple times to find the H1
    for (let i = 1; i <= 5; i++) {
      const h1 = await page.locator('h1').textContent().catch(() => null);
      console.log(`Attempt ${i}: H1 text = ${h1 || '(not found)'}`);

      if (h1) {
        console.log(`✅ Component rendered! H1 found: "${h1}"`);
        break;
      }

      await page.waitForTimeout(1000);
    }

    console.log('\n=== CONSOLE LOGS ===');
    logs.forEach(log => console.log(log));

    if (errors.length > 0) {
      console.log('\n=== ERRORS ===');
      errors.forEach(err => console.log(err));
    }

  } catch (e) {
    console.error('❌ Error:', e.message);
  }

  await browser.close();
})();
