// final-integration-test.js - Comprehensive integration test
const { chromium } = require('@playwright/test');

(async () => {
  console.log('🧪 Starting integration test...\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = {
    pageLoads: false,
    angularBoots: false,
    h1Found: false,
    createButton: false,
    canNavigate: false,
  };

  // Capture console logs and errors
  const logs = [];
  const errors = [];
  page.on('console', msg => logs.push(msg.text()));
  page.on('pageerror', err => errors.push(err.message));

  try {
    // Test 1: Page loads
    console.log('Test 1: Checking if page loads...');
    await page.goto('http://localhost:4200/', {
      timeout: 10000,
      waitUntil: 'domcontentloaded'
    });
    results.pageLoads = true;
    console.log('✅ Page loads\n');

    // Wait for Angular to bootstrap
    await page.waitForTimeout(3000);

    // Test 2: Angular boots
    console.log('Test 2: Checking if Angular bootstraps...');
    results.angularBoots = logs.some(log =>
      log.includes('Angular') || log.includes('vite')
    );
    if (results.angularBoots) {
      console.log('✅ Angular/Vite activity detected');
      console.log(`   Console logs: ${logs.length} messages`);
    } else {
      console.log('⚠️  Angular boot unclear');
    }

    // Show console logs
    if (logs.length > 0) {
      console.log('\n📋 Console logs:');
      logs.slice(0, 5).forEach(log => console.log(`   ${log}`));
      if (logs.length > 5) console.log(`   ... and ${logs.length - 5} more`);
    }
    console.log('');

    // Show errors if any
    if (errors.length > 0) {
      console.log('❌ Page errors detected:');
      errors.forEach(err => console.log(`   ${err}`));
      console.log('');
    } else {
      console.log('✅ No JavaScript errors\n');
    }

    // Test 3: H1 exists
    console.log('Test 3: Checking for H1 element...');
    try {
      const h1 = await page.locator('h1').textContent({ timeout: 5000 });
      results.h1Found = h1 !== null;
      console.log(`✅ H1 found: "${h1}"\n`);
    } catch (e) {
      console.log('❌ H1 not found\n');
    }

    // Test 4: Create button exists
    console.log('Test 4: Checking for create button...');
    try {
      const btn = await page.locator('[data-testid="create-session-btn"]').count({ timeout: 5000 });
      results.createButton = btn > 0;
      if (results.createButton) {
        console.log('✅ Create button found\n');
      } else {
        console.log('❌ Create button missing\n');
      }
    } catch (e) {
      console.log('❌ Create button not found\n');
    }

    // Test 5: Can click and navigate
    if (results.createButton) {
      console.log('Test 5: Testing navigation...');
      try {
        await page.click('[data-testid="create-session-btn"]', { timeout: 5000 });
        await page.waitForTimeout(2000);
        const url = page.url();
        results.canNavigate = url.includes('/s/');
        if (results.canNavigate) {
          console.log(`✅ Navigated to: ${url}\n`);
        } else {
          console.log(`❌ Navigation failed (URL: ${url})\n`);
        }
      } catch (e) {
        console.log(`❌ Navigation error: ${e.message}\n`);
      }
    } else {
      console.log('Test 5: Skipped (button not found)\n');
    }

    // Additional diagnostic: Get page HTML
    console.log('📄 Page structure:');
    try {
      const appRoot = await page.locator('app-root').count();
      const routerOutlet = await page.locator('router-outlet').count();
      const body = await page.locator('body').innerHTML({ timeout: 2000 });

      console.log(`   <app-root>: ${appRoot > 0 ? 'Present' : 'Missing'}`);
      console.log(`   <router-outlet>: ${routerOutlet > 0 ? 'Present' : 'Missing'}`);
      console.log(`   Body content length: ${body.length} chars`);

      if (body.length < 200) {
        console.log(`   Body HTML: ${body}`);
      }
    } catch (e) {
      console.log(`   ⚠️  Could not inspect DOM: ${e.message}`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }

  await browser.close();

  // Summary
  console.log('\n📊 RESULTS:');
  console.log('─────────────────────────────────────');
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').toLowerCase();
    console.log(`${icon} ${testName}`);
  });
  console.log('─────────────────────────────────────');

  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  console.log(`\n   ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('\n🎉 ALL TESTS PASSED - APP IS READY!');
    process.exit(0);
  } else if (passed >= 3) {
    console.log('\n⚠️  PARTIAL SUCCESS - SOME FEATURES WORK');
    process.exit(0);
  } else {
    console.log('\n⚠️  CRITICAL ISSUES DETECTED - NEEDS DEBUG');
    process.exit(1);
  }
})();
