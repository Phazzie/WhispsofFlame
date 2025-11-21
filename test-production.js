// test-production.js - Test production build
const { chromium } = require('@playwright/test');

(async () => {
  console.log('🧪 Testing production build on :4201...\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to http://localhost:4201/...');
    await page.goto('http://localhost:4201/', {
      timeout: 15000,
      waitUntil: 'domcontentloaded'
    });
    console.log('✅ Page loaded\n');

    // Wait for Angular
    console.log('Waiting 5 seconds for Angular bootstrap...');
    await page.waitForTimeout(5000);

    // Check console logs
    const logs = [];
    page.on('console', msg => logs.push(msg.text()));

    console.log(`Console logs captured: ${logs.length}`);
    if (logs.length > 0) {
      logs.forEach(log => console.log(`  ${log}`));
    }
    console.log('');

    // Try to get page title
    const title = await page.title();
    console.log(`Page title: ${title}\n`);

    console.log('✅ Production build test complete');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await browser.close();
})();
