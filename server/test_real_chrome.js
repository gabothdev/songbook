import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { PUPPETEER_ARGS } from './config/puppeteer.js';

puppeteer.use(StealthPlugin());

async function testHeadlessRealChrome() {
  const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  console.log('🚀 Probando en segundo plano (headless) con Chrome Real...');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: chromePath,
    args: PUPPETEER_ARGS,
  });

  const page = await browser.newPage();
  try {
    const res = await page.goto('https://chordify.net/chords/youtube:sMU2OunBM_M', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    console.log('Status code en headless:', res.status());

    await page.waitForFunction(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.some(s => s.textContent?.includes('window.__staticRouterHydrationData'));
    }, { timeout: 15000 });

    const dataStr = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const target = scripts.find(s => s.textContent?.includes('window.__staticRouterHydrationData'));
      if (!target) return null;
      const content = target.textContent || '';
      const match = content.match(/window\.__staticRouterHydrationData\s*=\s*JSON\.parse\((.*)\);/);
      return match ? match[1] : null;
    });

    if (dataStr) {
      const parsed = JSON.parse(JSON.parse(dataStr));
      const loaderKey = Object.keys(parsed.loaderData)[0];
      const chordsObj = parsed.loaderData[loaderKey].chords.value;
      console.log('🎉 BINGO! BPM extraído:', chordsObj.chordInfo.derivedBpm, 'Key:', chordsObj.chordInfo.derivedKey);
      console.log('Total acordes crudos extraídos:', chordsObj.chords.split('\n').length);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await browser.close();
    console.log('Browser cerrado.');
  }
}

testHeadlessRealChrome();
