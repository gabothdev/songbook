import fs from 'fs';

const isWindows = process.platform === 'win32';

/**
 * Detects real installed Chrome / Edge binary to bypass Cloudflare anti-bot checks
 */
export function getChromeExecutablePath() {
  const possiblePaths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/microsoft-edge',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    process.env.CHROME_BIN,
    process.env.PUPPETEER_EXECUTABLE_PATH,
  ];

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

/**
 * Clean stealth arguments without bot-revealing flags (--disable-gpu, --no-zygote)
 */
export const PUPPETEER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-blink-features=AutomationControlled',
  '--window-size=1280,800',
];

export const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};
