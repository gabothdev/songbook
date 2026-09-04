import axios from 'axios';
import * as cheerio from 'cheerio';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

async function run() {
  const query = 'Radiohead Creep chordify';
  const url = `https://search.yahoo.com/search?q=${encodeURIComponent(query)}`;
  console.log(`Buscando en Yahoo: ${url}`);
  
  try {
    const { data } = await axios.get(url, { headers: BROWSER_HEADERS, timeout: 5000 });
    const $ = cheerio.load(data);
    
    console.log('Yahoo Title:', $('title').text());
    
    const links = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      
      if (href.startsWith('http') && !href.includes('yahoo.com')) {
        links.push({ text, href });
      }
    });
    
    console.log(`Se encontraron ${links.length} enlaces externos:`);
    console.log(JSON.stringify(links.slice(0, 15), null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

run();
