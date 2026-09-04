import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import { PUPPETEER_ARGS } from './config/puppeteer.js';

puppeteer.use(StealthPlugin());

async function run() {
  const url = 'https://chordify.net/chords/lady-gaga-bruno-mars-songs/die-with-a-smile-chords?edit=6752f5f2786de09929000ca1';
  console.log(`Navegando a: ${url}`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: PUPPETEER_ARGS
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Esperar a que se cargue la hidratación
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
    
    if (!dataStr) {
      throw new Error('No se pudo encontrar window.__staticRouterHydrationData');
    }
    
    const jsonStr = JSON.parse(dataStr);
    const hydrationData = JSON.parse(jsonStr);
    
    // Guardar para inspección
    fs.writeFileSync('C:/Users/gabom/.gemini/antigravity/brain/cd569fb7-1023-48f6-bef9-8c014110f9d0/scratch/chordify_song_data.json', JSON.stringify(hydrationData, null, 2));
    console.log('JSON de datos guardado en scratch/chordify_song_data.json');
    
    const keys = Object.keys(hydrationData.loaderData);
    const loaderKey = keys[0];
    const chordsData = hydrationData.loaderData[loaderKey];
    
    if (chordsData && chordsData.chords) {
      const value = chordsData.chords.value;
      console.log('--- CLAVES DISPONIBLES EN VALUE ---');
      console.log(Object.keys(value));
      
      // Mostrar info de acordes
      console.log('\n--- CHORD INFO ---');
      console.log(JSON.stringify(value.chordInfo, null, 2));
      
      // Mostrar una muestra de los acordes en crudo
      console.log('\n--- MUESTRA DE ACORDES EN CRUDO (primeras 5 líneas) ---');
      const rawChords = value.chords || '';
      console.log(rawChords.split('\n').slice(0, 10).join('\n'));
      
      // Verificar si hay letras
      // Buscar claves como "lyrics", "vocals", "text", "lyricsData"
      console.log('\n--- BUSCANDO LETRAS ---');
      const lyricsKeys = Object.keys(value).filter(k => k.toLowerCase().includes('lyric') || k.toLowerCase().includes('text') || k.toLowerCase().includes('vocal'));
      console.log('Claves con nombres similares a letras:', lyricsKeys);
      
      // Si existe alguna, imprimir su tipo/contenido
      lyricsKeys.forEach(k => {
        console.log(`Clave "${k}":`, typeof value[k], Array.isArray(value[k]) ? `Array (length: ${value[k].length})` : value[k]);
      });
      
    } else {
      console.log('No se encontraron acordes en loaderData.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

run();
