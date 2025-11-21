// simple-diagnostic.js - Basic diagnostic without complex queries
const { chromium } = require('@playwright/test');

(async () => {
  console.log('🔍 Running simple diagnostic...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // Navigate and wait
    await page.goto('http://localhost:4200/', {
      timeout: 10000,
      waitUntil: 'domcontentloaded'
    });
    console.log('✅ Page loaded\n');

    // Wait for potential rendering
    await page.waitForTimeout(4000);
    console.log('⏱️  Waited 4 seconds for rendering\n');

    // Try to get HTML without queries
    try {
      const html = await page.evaluate(() => document.body.innerHTML);
      console.log('📄 Body HTML length:', html.length, 'characters\n');

      if (html.length < 500) {
        console.log('HTML content:');
        console.log('─────────────────────────────────────');
        console.log(html);
        console.log('─────────────────────────────────────\n');
      } else {
        console.log('HTML snippet (first 500 chars):');
        console.log('─────────────────────────────────────');
        console.log(html.substring(0, 500));
        console.log('...\n─────────────────────────────────────\n');
      }

      // Check for specific elements
      const hasAppRoot = html.includes('app-root');
      const hasRouterOutlet = html.includes('router-outlet');
      const hasH1 = html.includes('<h1');
      const hasButton = html.includes('create-session-btn');

      console.log('Element detection:');
      console.log(`  app-root: ${hasAppRoot ? '✅' : '❌'}`);
      console.log(`  router-outlet: ${hasRouterOutlet ? '✅' : '❌'}`);
      console.log(`  h1 tag: ${hasH1 ? '✅' : '❌'}`);
      console.log(`  create button: ${hasButton ? '✅' : '❌'}\n`);

    } catch (e) {
      console.log('❌ Could not evaluate HTML:', e.message, '\n');
    }

    // Take screenshot
    try {
      await page.screenshot({ path: '/home/user/WhispsofFlame/screenshot.png', fullPage: true });
      console.log('📸 Screenshot saved to screenshot.png\n');
    } catch (e) {
      console.log('⚠️  Could not take screenshot:', e.message, '\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await browser.close();
  console.log('✅ Diagnostic complete');
})();
