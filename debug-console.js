const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const logs = [];
  const errors = [];

  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(err.toString()));

  try {
    await page.goto('http://localhost:4200/', { waitUntil: 'networkidle', timeout: 10000 });
    await page.waitForTimeout(2000);

    console.log('\n=== CONSOLE LOGS ===');
    logs.forEach(log => console.log(log));

    console.log('\n=== PAGE ERRORS ===');
    errors.forEach(err => console.log(err));

    console.log('\n=== PAGE CONTENT ===');
    const html = await page.content();
    console.log(html.substring(0, 500));

  } catch (e) {
    console.error('Navigation error:', e.message);
  }

  await browser.close();
})();
