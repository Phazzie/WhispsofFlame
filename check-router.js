const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[${msg.type().toUpperCase()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.toString()}`);
  });

  try {
    await page.goto('http://localhost:4200/', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    await page.waitForTimeout(1000);

    // Check if app-root exists
    const appRootCount = await page.locator('app-root').count();
    console.log(`\napp-root count: ${appRootCount}`);

    // Check if router-outlet exists
    const routerOutletCount = await page.locator('router-outlet').count();
    console.log(`router-outlet count: ${routerOutletCount}`);

    // Check if app-home exists
    const homeCount = await page.locator('app-home').count();
    console.log(`app-home count: ${homeCount}`);

    // Get the text content of app-root
    const appRootText = await page.locator('app-root').textContent().catch(() => '(error getting text)');
    console.log(`\napp-root text content: "${appRootText}"`);

    // Get innerHTML of app-root
    const appRootHtml = await page.locator('app-root').innerHTML().catch(() => '(error getting html)');
    console.log(`\napp-root innerHTML:\n${appRootHtml}`);

  } catch (e) {
    console.error(`\n❌ Error: ${e.message}`);
  }

  await browser.close();
})();
