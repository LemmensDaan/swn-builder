import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log('Loading app...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 10000 });
    console.log('✓ App loaded');
    
    // Wait for page content
    await page.waitForTimeout(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'screenshots/01_initial.png' });
    console.log('✓ Initial screenshot');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

test();
