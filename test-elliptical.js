import puppeteer from 'puppeteer';

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });

    // Wait for app to load
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'screenshot1.png', fullPage: true });
    console.log('Screenshot taken: screenshot1.png');

    // Try to find and click a "Generate System" or similar button
    const buttons = await page.$$('button');
    console.log(`Found ${buttons.length} buttons`);

    // Look for any button that might generate a system
    for (let i = 0; i < buttons.length; i++) {
      const text = await page.evaluate(el => el.textContent, buttons[i]);
      console.log(`Button ${i}: "${text}"`);
    }

    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
