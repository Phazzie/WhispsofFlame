const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('❌', msg.text());
  });
  page.on('pageerror', err => errors.push(err.toString()));

  try {
    await page.goto('http://localhost:4200/', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    // Check what's in the DOM
    const appRoot = await page.locator('app-root').innerHTML().catch(() => null);
    const body = await page.locator('body').innerHTML();

    console.log('\n=== APP ROOT CONTENT ===');
    console.log(appRoot || '(empty)');

    console.log('\n=== BODY CONTENT (first 1000 chars) ===');
    console.log(body.substring(0, 1000));

    // Check if router outlet exists
    const routerOutlet = await page.locator('router-outlet').count();
    console.log('\n=== ROUTER OUTLET COUNT ===');
    console.log(routerOutlet);

    // Check for any errors
    console.log('\n=== ERRORS ===');
    console.log(errors.length === 0 ? '✅ No errors' : errors.join('\n'));

  } catch (e) {
    console.error('Error:', e.message);
  }

  await browser.close();
})();
