import axios from 'axios';
import * as cheerio from 'cheerio';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

async function run() {
  const query = 'Radiohead Creep chordify';
  const url = `https://lite.duckduckgo.com/lite/`;
  console.log(`Buscando en DDG Lite: ${url} con query: ${query}`);
  
  try {
    // DDG Lite uses a POST request with form data
    const params = new URLSearchParams();
    params.append('q', query);
    
    const { data } = await axios.post(url, params.toString(), {
      headers: {
        ...BROWSER_HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 5000
    });
    
    const $ = cheerio.load(data);
    
    console.log('DDG Lite Title:', $('title').text());
    
    const results = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      
      if (href.includes('chordify.net/chords/')) {
        results.push({ text, href });
      }
    });
    
    console.log(`Se encontraron ${results.length} resultados de Chordify en DDG Lite:`);
    console.log(JSON.stringify(results, null, 2));
    
    if (results.length === 0) {
      // Print first 10 links on the page
      const anyLinks = [];
      $('a').each((i, el) => {
        const href = $(el).attr('href') || '';
        if (href.startsWith('http')) {
          anyLinks.push({ text: $(el).text().trim(), href });
        }
      });
      console.log('Top 10 general links found:');
      console.log(JSON.stringify(anyLinks.slice(0, 10), null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

run();
