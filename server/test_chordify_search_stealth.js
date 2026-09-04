import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import { PUPPETEER_ARGS } from './config/puppeteer.js';

puppeteer.use(StealthPlugin());

async function run() {
  const query = 'Carlos Gardel Mano a mano';
  console.log(`Iniciando Puppeteer Stealth para buscar: "${query}"`);
  const browser = await puppeteer.launch({
    headless: true,
    args: PUPPETEER_ARGS
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    console.log('Navegando a la home de Chordify...');
    await page.goto('https://chordify.net/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Esperar a que la página se cargue
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Aceptar cookies si aparece el banner
    try {
      const cookieSelector = '#onetrust-accept-btn-handler, button[class*="accept"]';
      await page.waitForSelector(cookieSelector, { timeout: 3000 });
      await page.click(cookieSelector);
      console.log('Cookies aceptadas.');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      console.log('No se detectó banner de cookies.');
    }
    
    // Buscar el input de búsqueda
    // Según el HTML que vimos antes: <form role="search" ...><input placeholder="What do you want to play?" type="search" ...></form>
    const searchInputSelector = 'input[type="search"], input[placeholder*="play"], input[placeholder*="Buscar"]';
    await page.waitForSelector(searchInputSelector, { timeout: 5000 });
    
    console.log('Escribiendo consulta en el input...');
    await page.click(searchInputSelector);
    await page.keyboard.type(query);
    
    console.log('Presionando Enter...');
    await page.keyboard.press('Enter');
    
    // Esperar a ver si cambia la URL o si carga resultados
    console.log('Esperando navegación/resultados...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const currentUrl = page.url();
    const title = await page.title();
    console.log(`URL actual: ${currentUrl}`);
    console.log(`Título de la página: ${title}`);
    
    // Intentar buscar los resultados (enlaces con /chords/)
    const links = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href') || '';
        const text = a.textContent?.trim() || '';
        if (href.includes('/chords/') && !href.includes('/chords/youtube:')) {
          results.push({ text, href });
        }
      });
      return results;
    });
    
    console.log('\n--- ENLACES /CHORDS/ ENCONTRADOS ---');
    console.log(JSON.stringify(links.slice(0, 10), null, 2));
    
    // Guardar captura de pantalla para depuración
    await page.screenshot({ path: 'C:/Users/gabom/.gemini/antigravity/brain/cd569fb7-1023-48f6-bef9-8c014110f9d0/scratch/search_screenshot.png' });
    console.log('Captura de pantalla guardada.');
    
  } catch (error) {
    console.error('Error durante la búsqueda:', error);
  } finally {
    await browser.close();
    console.log('Browser cerrado.');
  }
}

run();
