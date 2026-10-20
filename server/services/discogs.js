import axios from 'axios';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { PUPPETEER_ARGS, getChromeExecutablePath } from '../config/puppeteer.js';

puppeteer.use(StealthPlugin());

/**
 * Searches Discogs for album covers or artist portraits.
 * 1. If DISCOGS_TOKEN is configured in environment, uses official Discogs REST API.
 * 2. Otherwise, uses Puppeteer with Stealth plugin and native Chrome/Edge binary to bypass Cloudflare
 *    and extract authentic https://i.discogs.com/... images.
 */
export async function searchDiscogs({ query = '', type = 'album', limit = 12 }) {
  const trimmed = (query || '').trim();
  if (!trimmed) return [];

  const discogsToken = process.env.DISCOGS_TOKEN;

  // 1. If user supplied a DISCOGS_TOKEN, use official Discogs API
  if (discogsToken) {
    try {
      const discogsType = type === 'artist' ? 'artist' : 'release';
      const apiUrl = `https://api.discogs.com/database/search?q=${encodeURIComponent(trimmed)}&type=${discogsType}&per_page=${limit}`;
      const response = await axios.get(apiUrl, {
        headers: {
          'Authorization': `Discogs token=${discogsToken}`,
          'User-Agent': 'SongBookApp/1.0 (gabothdev@gmail.com)',
        },
        timeout: 5000,
      });

      const items = response.data?.results || [];
      const results = [];
      const seen = new Set();

      for (const item of items) {
        const imgUrl = item.cover_image || item.thumb;
        if (imgUrl && !imgUrl.includes('spacer.gif') && !seen.has(imgUrl)) {
          seen.add(imgUrl);
          results.push({
            url: imgUrl,
            label: `${item.title || trimmed}${item.year ? ` (${item.year})` : ''}`,
            source: 'Discogs',
            resolution: '600×600',
          });
        }
      }

      if (results.length > 0) {
        return results;
      }
    } catch (apiErr) {
      console.warn('[DiscogsService] API search failed, attempting stealth scraper fallback:', apiErr.message);
    }
  }

  // 2. Stealth scraper fallback using native Chrome/Edge
  let browser = null;
  try {
    const executablePath = getChromeExecutablePath();
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: PUPPETEER_ARGS,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    const discogsSearchType = type === 'artist' ? 'artist' : 'all';
    const searchUrl = `https://www.discogs.com/search/?q=${encodeURIComponent(trimmed)}&type=${discogsSearchType}`;

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });

    const rawResults = await page.evaluate((max) => {
      const list = [];
      const seen = new Set();
      const images = Array.from(document.querySelectorAll('img[src*="i.discogs.com"]'));

      for (const img of images) {
        if (list.length >= max) break;
        const src = img.src;
        if (!src || src.includes('spacer.gif') || seen.has(src)) continue;
        seen.add(src);

        // Find associated text/title
        const container = img.closest('li') || img.closest('tr') || img.parentElement?.parentElement;
        let title = img.alt?.replace(/^Cover art of:\s*/i, '') || '';
        if (!title && container) {
          title = container.textContent?.replace(/\s+/g, ' ').trim().slice(0, 100) || '';
        }

        list.push({
          url: src,
          label: title || 'Edición Discogs',
          source: 'Discogs',
          resolution: '600×600',
        });
      }
      return list;
    }, limit);

    return rawResults;
  } catch (err) {
    console.warn('[DiscogsService] Stealth scraper error:', err.message);
    return [];
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}

/**
 * Resolves a direct Discogs release, master or artist page URL to its primary image.
 */
export async function resolveDiscogsPageImage(pageUrl) {
  if (!pageUrl || !pageUrl.includes('discogs.com')) return null;

  let browser = null;
  try {
    const executablePath = getChromeExecutablePath();
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: PUPPETEER_ARGS,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });

    const imageUrl = await page.evaluate(() => {
      const mainImg = document.querySelector('.image_gallery img, .primary_image img, img[src*="i.discogs.com"]');
      return mainImg?.src || null;
    });

    return imageUrl;
  } catch (e) {
    return null;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}
