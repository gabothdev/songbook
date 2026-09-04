import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { PUPPETEER_ARGS } from './config/puppeteer.js';
import fs from 'fs';

puppeteer.use(StealthPlugin());

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

async function test() {
  const searchUrl = 'https://www.ultimate-guitar.com/search.php?search_type=title&value=mano%20a%20mano';
  console.log(`Launching Puppeteer to fetch ${searchUrl}...`);
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: PUPPETEER_ARGS
    });
    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_HEADERS['User-Agent']);
    await page.setViewport({ width: 1280, height: 800 });
    
    console.log('Navigating to page...');
    const response = await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Response status:', response ? response.status() : 'No response');
    
    // Wait for 3 seconds just in case
    await new Promise(r => setTimeout(r, 3000));
    
    const html = await page.content();
    fs.writeFileSync('ug_debug.html', html);
    console.log('Saved html to ug_debug.html. Size:', html.length);
    
    await page.screenshot({ path: 'ug_screenshot.png' });
    console.log('Saved screenshot to ug_screenshot.png');
    
    const jsStoreFound = await page.evaluate(() => {
      return !!document.querySelector('.js-store');
    });
    console.log('js-store found:', jsStoreFound);
  } catch (err) {
    console.error(err);
  } finally {
    if (browser) await browser.close();
  }
}
test();
