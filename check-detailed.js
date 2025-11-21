const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const events = [];

  // Capture all console messages
  page.on('console', msg => {
    events.push(`[CONSOLE ${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  // Capture page errors
  page.on('pageerror', err => {
    events.push(`[PAGE ERROR] ${err.toString()}`);
  });

  // Capture request failures
  page.on('requestfailed', request => {
    events.push(`[REQUEST FAILED] ${request.url()} - ${request.failure().errorText}`);
  });

  // Capture responses
  page.on('response', response => {
    if (!response.ok()) {
      events.push(`[HTTP ${response.status()}] ${response.url()}`);
    }
  });

  try {
    console.log('Navigating to http://localhost:4201/...');
    await page.goto('http://localhost:4201/', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });

    console.log('✅ Page loaded (domcontentloaded)');

    await page.waitForTimeout(2000);

    // Check DOM
    const appRootExists = await page.locator('app-root').count();
    const h1Exists = await page.locator('h1').count();
    const btnExists = await page.locator('[data-testid="create-session-btn"]').count();

    console.log(`\nDOM CHECK:`);
    console.log(`  app-root count: ${appRootExists}`);
    console.log(`  h1 count: ${h1Exists}`);
    console.log(`  create button count: ${btnExists}`);

    if (h1Exists > 0) {
      const h1Text = await page.locator('h1').first().textContent();
      console.log(`  h1 text: "${h1Text}"`);
    }

    console.log(`\n=== ALL EVENTS (${events.length}) ===`);
    if (events.length === 0) {
      console.log('(no events captured)');
    } else {
      events.forEach(event => console.log(event));
    }

  } catch (e) {
    console.error(`\n❌ Error: ${e.message}`);
    console.log(`\n=== EVENTS BEFORE ERROR (${events.length}) ===`);
    events.forEach(event => console.log(event));
  }

  await browser.close();
})();
