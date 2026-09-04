import axios from 'axios';
import * as cheerio from 'cheerio';

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

async function test() {
  // Let's use a YouTube ID for Pugliese's Esta noche de luna if we know it, or a generic one
  const videoId = 'dQw4w9WgXcQ'; // Rick Astley
  const url = `https://chordify.net/chords/youtube:${videoId}`;
  console.log('Requesting URL:', url);
  try {
    const { data } = await axios.get(url, { headers: BROWSER_HEADERS });
    const $ = cheerio.load(data);
    
    console.log('Title:', $('title').text());
    
    // Look for BPM and Key selectors on Chordify
    // Often there is a JSON state or metadata scripts
    $('script').each((i, el) => {
      const html = $(el).html() || '';
      if (html.includes('bpm') || html.includes('derivedKey') || html.includes('tempo')) {
        console.log(`Script ${i} matches! Length:`, html.length);
        if (html.length < 2000) {
          console.log(html);
        } else {
          console.log(html.substring(0, 500) + '...');
        }
      }
    });

    // Let's print some divs that might contain key and tempo
    console.log('Body text sample:', $('body').text().substring(0, 1000).replace(/\s+/g, ' '));
  } catch (e) {
    console.error('Error:', e.message);
    if (e.response) {
      console.error('Response status:', e.response.status);
    }
  }
}

test();
