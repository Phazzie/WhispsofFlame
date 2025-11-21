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
    errors.push(err.toString());
  });

  try {
    await page.goto('http://localhost:4200/', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    // Immediately take a screenshot
    await page.screenshot({ path: '/tmp/app-screenshot.png', fullPage: true });
    console.log('✅ Screenshot saved to /tmp/app-screenshot.png');

    // Try to get the HTML
    const html = await page.content();
    console.log('\n=== PAGE HTML (first 2000 chars) ===');
    console.log(html.substring(0, 2000));

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
