const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  const logs = [];

  page.on('console', msg => {
    logs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    errors.push(`PAGE ERROR: ${err.toString()}`);
  });

  page.on('crash', () => {
    console.log('❌ PAGE CRASHED!');
  });

  try {
    console.log('Navigating to http://localhost:4200/...');
    await page.goto('http://localhost:4200/', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    console.log('✅ Page loaded (domcontentloaded)');

    // Wait a bit to see if any errors occur
    await page.waitForTimeout(2000);
    console.log('✅ Waited 2 seconds after load');

    // Try to get some basic info
    const title = await page.title().catch(e => `Error: ${e.message}`);
    console.log(`Page title: ${title}`);

    const url = page.url();
    console.log(`Current URL: ${url}`);

    console.log('\n=== CONSOLE LOGS ===');
    logs.forEach(log => console.log(log));

    console.log('\n=== PAGE ERRORS ===');
    if (errors.length === 0) {
      console.log('✅ No page errors');
    } else {
      errors.forEach(err => console.log(err));
    }

  } catch (e) {
    console.error('❌ Error:', e.message);
    console.log('\n=== LOGS BEFORE ERROR ===');
    logs.forEach(log => console.log(log));
    console.log('\n=== ERRORS ===');
    errors.forEach(err => console.log(err));
  }

  await browser.close();
  console.log('\n✅ Browser closed');
})();
