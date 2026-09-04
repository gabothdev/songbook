import axios from 'axios';
import * as cheerio from 'cheerio';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

async function testSearch(engine, urlTemplate, parser) {
  const query = 'Radiohead Creep';
  const url = urlTemplate.replace('{query}', encodeURIComponent(query));
  console.log(`\nProbando en [${engine}]: ${url}`);
  
  try {
    const { data } = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    const results = parser($, data);
    console.log(`[${engine}] Resultados encontrados (${results.length}):`);
    console.log(JSON.stringify(results.slice(0, 5), null, 2));
    return results;
  } catch (error) {
    console.error(`[${engine}] Error:`, error.message);
    return [];
  }
}

async function run() {
  // 1. Ecosia site search
  await testSearch('Ecosia (site)', 'https://www.ecosia.org/search?q=site%3Achordify.net+{query}', ($) => {
    const list = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('chordify.net/chords/')) {
        list.push({ text: $(el).text().trim(), href });
      }
    });
    return list;
  });

  // 2. Bing general search
  await testSearch('Bing (general)', 'https://www.bing.com/search?q=site%3achordify.net+{query}', ($) => {
    const list = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('chordify.net/chords/')) {
        list.push({ text: $(el).text().trim(), href });
      }
    });
    return list;
  });

  // 3. Yahoo general search
  await testSearch('Yahoo (general)', 'https://search.yahoo.com/search?q=site%3Achordify.net+{query}', ($) => {
    const list = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      if (href.includes('chordify.net/chords/')) {
        let cleanUrl = href;
        if (href.includes('/RU=')) {
          const match = href.match(/\/RU=([^\/]+)/);
          if (match) cleanUrl = decodeURIComponent(match[1]);
        }
        list.push({ text: $(el).text().trim(), href: cleanUrl });
      }
    });
    return list;
  });
}

run();
