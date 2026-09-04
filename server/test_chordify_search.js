import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import { PUPPETEER_ARGS } from './config/puppeteer.js';

puppeteer.use(StealthPlugin());

async function run() {
  const query = 'Carlos Gardel Mano a mano';
  console.log(`Iniciando Puppeteer para buscar: "${query}"`);
  const browser = await puppeteer.launch({
    headless: true,
    args: PUPPETEER_ARGS
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  const url = `https://chordify.net/search/${encodeURIComponent(query)}`;
  console.log(`Navegando a: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Esperar unos segundos por si hay carga dinámica o hydration
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const title = await page.title();
    console.log(`Título de la página: ${title}`);
    
    // Buscar los enlaces que lleven a canciones (típicamente contienen /chords/)
    const links = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href') || '';
        const text = a.textContent?.trim() || '';
        if (href.includes('/chords/')) {
          results.push({ text, href });
        }
      });
      return results;
    });
    
    console.log('\n--- ENLACES /CHORDS/ ENCONTRADOS ---');
    console.log(JSON.stringify(links.slice(0, 30), null, 2));

    // Guardar el HTML completo para inspeccionarlo si es necesario
    const html = await page.content();
    fs.writeFileSync('C:/Users/gabom/.gemini/antigravity/brain/cd569fb7-1023-48f6-bef9-8c014110f9d0/scratch/search_page.html', html);
    console.log('\nHTML guardado en scratch/search_page.html');
    
  } catch (error) {
    console.error('Error durante la búsqueda:', error);
  } finally {
    await browser.close();
    console.log('Browser cerrado.');
  }
}

run();
