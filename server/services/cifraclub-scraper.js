import puppeteer from 'puppeteer';
import axios from 'axios';
import { PUPPETEER_ARGS, BROWSER_HEADERS } from '../config/puppeteer.js';

/**
 * Busca canciones en Cifra Club usando múltiples estrategias
 */
export async function searchSongsOnCifraClub(query, signal, timeout = 15000) {
  console.log(`(CC) Iniciando búsqueda para: "${query}"`);

  // Estrategia 1: API de Solr (Sugerencias/Búsqueda interna)
  // Es la más rápida y confiable
  try {
    console.log('(CC) Usando API de Solr...');
    const results = await searchCifraClubWithAPI(query, signal);
    if (results.length > 0) {
      console.log(`(CC) Búsqueda con API completada: ${results.length} resultados`);
      return results;
    }
  } catch (apiError) {
    console.log(`(CC) Búsqueda con API falló: ${apiError.message}`);
  }

  // Estrategia 2: Navegador (GSC) - Fallback
  try {
    console.log('(CC) Usando búsqueda con navegador (fallback)...');
    const results = await searchCifraClubWithBrowser(query, signal, timeout);
    console.log(`(CC) Búsqueda con navegador completada: ${results.length} resultados`);
    return formatResults(results);
  } catch (error) {
    console.log(`(CC) Búsqueda con navegador falló: ${error.message}`);
    return [];
  }
}

/**
 * Búsqueda usando la API de Solr de Cifra Club
 */
async function searchCifraClubWithAPI(query, signal) {
  const url = `https://solr.sscdn.co/cc/c7/?q=${encodeURIComponent(query)}&limit=100`;

  try {
    const { data } = await axios.get(url, {
      signal,
      timeout: 8000
    });

    if (!data.response || !data.response.docs) {
      return [];
    }

    // Filtrar solo resultados que son canciones (tipo "2")
    const songs = data.response.docs
      .filter(doc => doc.tipo === "2")
      .map(doc => ({
        title: doc.txt,
        artist: doc.art,
        versions: [{
          url: `https://www.cifraclub.com/${doc.dns}/${doc.url}/`,
          rating: null,
          votes: 0,
          source: 'Cifra Club',
        }],
      }));

    // Priorizar resultados donde la query esté en el título o artista
    const lowerQuery = query.toLowerCase();

    return songs.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const aArtist = a.artist.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const bArtist = b.artist.toLowerCase();

      // Puntuación para A
      let scoreA = 0;
      if (aTitle === lowerQuery || aArtist === lowerQuery) scoreA += 100;
      else if (aTitle.includes(lowerQuery) || aArtist.includes(lowerQuery)) scoreA += 50;

      // Puntuación para B
      let scoreB = 0;
      if (bTitle === lowerQuery || bArtist === lowerQuery) scoreB += 100;
      else if (bTitle.includes(lowerQuery) || bArtist.includes(lowerQuery)) scoreB += 50;

      return scoreB - scoreA;
    });
  } catch (error) {
    throw new Error(`API de Solr error: ${error.message}`);
  }
}

/**
 * Búsqueda con navegador automatizado - para sitios con JavaScript
 */
async function searchCifraClubWithBrowser(query, signal, timeout = 25000) {
  let browser = null;

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout en búsqueda con navegador')), timeout)
  );

  try {
    return await Promise.race([
      timeoutPromise,
      (async () => {
        console.log('(CC) Iniciando navegador...');
        browser = await puppeteer.launch({
          headless: true,
          args: PUPPETEER_ARGS
        });

        const page = await browser.newPage();
        await page.setUserAgent(BROWSER_HEADERS['User-Agent']);
        await page.setViewport({ width: 1280, height: 720 });

        console.log('(CC) Probando URLs de búsqueda directamente...');
        const searchUrls = [
          `https://www.cifraclub.com/?q=${encodeURIComponent(query)}#gsc.tab=0&gsc.q=${encodeURIComponent(query)}&gsc.page=1`,
          `https://www.cifraclub.com/?q=${encodeURIComponent(query)}`,
          `https://www.cifraclub.com.br/?q=${encodeURIComponent(query)}`
        ];

        let songs = [];
        let successUrl = null;

        for (const searchUrl of searchUrls) {
          try {
            console.log(`(CC) Intentando: ${searchUrl}`);
            await page.goto(searchUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 7000
            });

            // Manejar cookies
            try {
              await page.waitForSelector('#onetrust-accept-btn-handler', { timeout: 1500 });
              await page.click('#onetrust-accept-btn-handler');
              console.log('(CC) Cookies aceptadas');
            } catch (e) { }

            // Esperar resultados de GSC
            try {
              await page.waitForSelector('.gsc-webResult', { timeout: 8000 });
              console.log('(CC) Resultados de GSC detectados');
            } catch (e) {
              console.log('(CC) No se detectaron resultados en esta URL');
              continue;
            }

            await new Promise(resolve => setTimeout(resolve, 1500));

            const results = await page.evaluate(() => {
              const songLinks = [];
              const resultContainers = document.querySelectorAll('.gsc-webResult.gsc-result');

              resultContainers.forEach((container) => {
                try {
                  const link = container.querySelector('a.gs-title');
                  if (!link) return;

                  const href = link.href || '';
                  let text = (link.textContent || link.innerText || '').trim();
                  const snippet = container.querySelector('.gs-snippet')?.textContent || '';

                  if (href.includes('cifraclub.com') &&
                    !href.includes('/blog/') &&
                    !href.includes('/enviar/') &&
                    !href.includes('/noticias/') &&
                    !href.includes('/instru-') &&
                    !href.includes('/letra/') &&
                    !href.includes('?q=')) {

                    if (!text.includes(' - ') && snippet.includes(' - ')) {
                      const possibleTitle = snippet.split('...')[0].trim();
                      if (possibleTitle.includes(' - ')) {
                        text = possibleTitle;
                      }
                    }

                    songLinks.push({ text: text, url: href });
                  }
                } catch (e) { }
              });

              return songLinks;
            });

            if (results.length > 0) {
              songs = results;
              successUrl = searchUrl;
              break;
            }
          } catch (e) {
            console.log(`(CC) Error en URL de búsqueda: ${e.message.substring(0, 50)}`);
          }
        }

        return songs.slice(0, 15);
      })()
    ]);
  } finally {
    if (browser) await browser.close().catch(() => { });
  }
}

/**
 * Parsear texto para extraer artista y título
 */
function parseArtistAndTitle(text) {
  if (!text) return { artist: 'Artista desconocido', title: 'Título desconocido' };

  let cleanText = text
    .replace(/\(cifra\)/gi, '')
    .replace(/\(letra\)/gi, '')
    .replace(/\(tab\)/gi, '')
    .replace(/\(tablatura\)/gi, '')
    .replace(/cifra club/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  let artist = 'Artista desconocido';
  let title = cleanText;

  if (cleanText.includes(' - ')) {
    const parts = cleanText.split(' - ');
    if (parts.length >= 2) {
      if (parts[parts.length - 1].toLowerCase().includes('cifra') || parts.length >= 3) {
        title = parts[0].trim();
        artist = parts[1].trim();
      } else {
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }
    }
  }

  return { artist, title };
}

/**
 * Formatear resultados al formato esperado
 */
function formatResults(results) {
  return results.map(song => {
    const parsed = parseArtistAndTitle(song.text);
    return {
      title: parsed.title,
      artist: parsed.artist,
      versions: [{
        url: song.url,
        rating: null,
        votes: 0,
        source: 'Cifra Club',
      }],
    };
  });
}

export default { searchSongsOnCifraClub };