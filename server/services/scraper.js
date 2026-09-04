import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { PUPPETEER_ARGS } from '../config/puppeteer.js';
import { searchSongsOnCifraClub as newCifraClubSearch } from './cifraclub-scraper.js';

// Aplicamos el plugin de sigilo
puppeteer.use(StealthPlugin());

const ULTIMATE_GUITAR_BASE_URL = 'https://www.ultimate-guitar.com';

// Simular una cabecera de navegador moderna (Firefox) para evitar bloqueos de Cloudflare
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
};

/**
 * Analiza el contenido de la tienda de datos de Ultimate Guitar.
 * @param {CheerioAPI} $ - La instancia de Cheerio cargada con la página.
 * @returns {object|null} - El objeto JSON parseado o null si no se encuentra.
 */
function parseStoreData($) {
  try {
    const storeDiv = $('.js-store');
    const dataContent = storeDiv.attr('data-content');
    if (dataContent) {
      return JSON.parse(dataContent);
    }
  } catch (error) {
    console.error('Error al parsear los datos de la tienda de UG:', error);
  }
  return null;
}

/**
 * Busca canciones en Ultimate Guitar.
 * @param {string} query - El término de búsqueda (ej. "Wonderwall").
 * @param {AbortSignal} signal - La señal para abortar la petición.
 * @returns {Promise<Array<{title: string, artist: string, url: string}>>} - Una lista de resultados de búsqueda.
 */
// Funciones auxiliares para parsear y limpiar contenido de Ultimate Guitar
function parseStoreDataResults(storeData) {
  if (!storeData || !storeData.store || !storeData.store.page || !storeData.store.page.data || !storeData.store.page.data.results) {
    throw new Error('No se pudo encontrar la sección de resultados en los datos de la página.');
  }

  const searchResults = storeData.store.page.data.results;

  // Agrupar resultados por canción y artista
  const groupedResults = searchResults
    .filter(result => result.type === 'Chords' && result.status !== 'pro')
    .reduce((acc, result) => {
      const key = `${result.artist_name} - ${result.song_name}`;
      if (!acc[key]) {
        acc[key] = {
          title: result.song_name,
          artist: result.artist_name,
          versions: [],
        };
      }
      acc[key].versions.push({
        url: result.tab_url,
        rating: result.rating,
        votes: result.votes,
        source: 'Ultimate Guitar',
      });
      return acc;
    }, {});

  // Convertir el objeto de grupos en un array y ordenar las versiones por rating
  const finalResults = Object.values(groupedResults);
  finalResults.forEach(song => {
    song.versions.sort((a, b) => b.rating - a.rating);
  });

  return finalResults;
}

function cleanUGContent(content) {
  // Reemplazar las etiquetas de acordes [ch]C[/ch] por [C]
  content = content.replace(/\[ch\]/g, '[');
  content = content.replace(/\[\/ch\]/g, ']');

  // Eliminar etiquetas de tablatura que no nos interesan
  content = content.replace(/\[tab\]/g, '');
  content = content.replace(/\[\/tab\]/g, '');

  return content;
}

function parseSearchResultsFromHTML($) {
  const results = [];
  let currentArtist = 'Unknown Artist';

  $('.oRSaY').each(function() {
    const row = $(this);
    
    // 1. Artist
    const artistLink = row.find('._-5lfs a.JVQ-d');
    if (artistLink.length > 0) {
      currentArtist = artistLink.text().trim();
    }
    
    // 2. Song
    const songLink = row.find('.nMn5B a.JVQ-d');
    if (songLink.length === 0) return; // Not a song row
    
    const title = songLink.text().trim();
    const url = songLink.attr('href') || '';
    
    // 3. Type
    const type = row.find('.okCUx').text().trim();
    if (type.toLowerCase() !== 'chords') return; // We only want chords
    
    // 4. Rating & Votes
    const votesText = row.find('.XivAI').text().trim();
    const votes = votesText ? parseInt(votesText, 10) : 0;
    
    const filledStars = row.find('.jeWLi span._7OgtD:not(._5FNKh)').length;
    const rating = votes > 0 ? filledStars : null;

    results.push({
      title,
      artist: currentArtist,
      url,
      rating,
      votes
    });
  });

  if (results.length === 0) return null;

  // Group results by title & artist
  const groupedResults = results.reduce((acc, result) => {
    const key = `${result.artist.toLowerCase()} - ${result.title.toLowerCase()}`;
    if (!acc[key]) {
      acc[key] = {
        title: result.title,
        artist: result.artist,
        versions: [],
      };
    }
    acc[key].versions.push({
      url: result.url,
      rating: result.rating,
      votes: result.votes,
      source: 'Ultimate Guitar',
    });
    return acc;
  }, {});

  const finalResults = Object.values(groupedResults);
  finalResults.forEach(song => {
    song.versions.sort((a, b) => b.rating - a.rating);
  });

  return finalResults;
}

function parseSongContentFromHTML($) {
  const pre = $('pre');
  if (pre.length === 0) return null;

  // Encontrar todas las etiquetas span[data-name] que son los acordes interactivos
  const clone = pre.clone();
  clone.find('span[data-name]').each(function() {
    const chordName = $(this).attr('data-name');
    $(this).replaceWith(`[${chordName}]`);
  });

  let text = clone.text();
  
  // Reemplazar cualquier etiqueta de acordes legacy por si acaso
  text = text.replace(/\[ch\]/g, '[');
  text = text.replace(/\[\/ch\]/g, ']');
  text = text.replace(/\[tab\]/g, '');
  text = text.replace(/\[\/tab\]/g, '');

  return text;
}

export async function searchSongs(query, signal) {
  console.log(`(UG) Buscando canciones para: "${query}"`);
  const searchUrl = `${ULTIMATE_GUITAR_BASE_URL}/search.php?search_type=title&value=${encodeURIComponent(query)}`;

  try {
    const { data } = await axios.get(searchUrl, { headers: BROWSER_HEADERS, signal });
    const $ = cheerio.load(data);
    
    // Intentar primero con el nuevo parser HTML
    const htmlResults = parseSearchResultsFromHTML($);
    if (htmlResults && htmlResults.length > 0) {
      return htmlResults;
    }
    
    // Fallback al storeData legacy
    const storeData = parseStoreData($);
    return parseStoreDataResults(storeData);
  } catch (error) {
    console.warn(`(UG) Scraper con Axios falló para "${query}" (${error.message}). Reintentando con Puppeteer...`);
    try {
      return await searchSongsWithPuppeteer(query, signal);
    } catch (pupError) {
      console.error('Error en scraping de UG con Puppeteer:', pupError.message);
      throw new Error('No se pudo obtener la lista de canciones de Ultimate Guitar.');
    }
  }
}

async function searchSongsWithPuppeteer(query, signal) {
  console.log(`(UG) Iniciando búsqueda en Puppeteer para: "${query}"`);
  const searchUrl = `${ULTIMATE_GUITAR_BASE_URL}/search.php?search_type=title&value=${encodeURIComponent(query)}`;
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: PUPPETEER_ARGS
    });
    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_HEADERS['User-Agent']);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Esperar a que la tabla de resultados se renderice
    try {
      await page.waitForSelector('.oRSaY, a[href*="/tab/"]', { timeout: 8000 });
    } catch (e) {
      console.warn('(UG) El selector de resultados de búsqueda no apareció a tiempo.');
    }

    const html = await page.content();
    const $ = cheerio.load(html);
    
    const htmlResults = parseSearchResultsFromHTML($);
    if (htmlResults && htmlResults.length > 0) {
      return htmlResults;
    }

    const storeDataContent = await page.evaluate(() => {
      const storeDiv = document.querySelector('.js-store');
      return storeDiv ? storeDiv.getAttribute('data-content') : null;
    });

    if (!storeDataContent) {
      throw new Error('No se encontró el contenedor .js-store ni resultados HTML en la búsqueda de UG.');
    }

    const storeData = JSON.parse(storeDataContent);
    return parseStoreDataResults(storeData);
  } finally {
    if (browser) await browser.close();
  }
}

export async function getSongContent(songUrl, signal) {
  console.log(`(UG) Obteniendo contenido de: ${songUrl}`);

  try {
    const { data } = await axios.get(songUrl, { headers: BROWSER_HEADERS, signal });
    const $ = cheerio.load(data);
    
    const htmlContent = parseSongContentFromHTML($);
    if (htmlContent) {
      return htmlContent;
    }

    const storeData = parseStoreData($);
    if (!storeData || !storeData.store.page.data.tab_view || !storeData.store.page.data.tab_view.wiki_tab.content) {
      throw new Error('No se pudo encontrar el contenido de la canción en la página.');
    }

    let content = storeData.store.page.data.tab_view.wiki_tab.content;
    return cleanUGContent(content);
  } catch (error) {
    console.warn(`(UG) Scraper de contenido con Axios falló para "${songUrl}" (${error.message}). Reintentando con Puppeteer...`);
    try {
      return await getSongContentWithPuppeteer(songUrl, signal);
    } catch (pupError) {
      console.error('Error en scraping de contenido de UG con Puppeteer:', pupError.message);
      throw new Error('No se pudo obtener el contenido de la canción de Ultimate Guitar.');
    }
  }
}

async function getSongContentWithPuppeteer(songUrl, signal) {
  console.log(`(UG) Iniciando descarga de contenido en Puppeteer para: ${songUrl}`);
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: PUPPETEER_ARGS
    });
    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_HEADERS['User-Agent']);
    await page.goto(songUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Esperar a que el pre tag con los acordes se renderice
    try {
      await page.waitForSelector('pre', { timeout: 8000 });
    } catch (e) {
      console.warn('(UG) El selector pre de contenido no apareció a tiempo.');
    }

    const html = await page.content();
    const $ = cheerio.load(html);
    
    const htmlContent = parseSongContentFromHTML($);
    if (htmlContent) {
      return htmlContent;
    }

    const storeDataContent = await page.evaluate(() => {
      const storeDiv = document.querySelector('.js-store');
      return storeDiv ? storeDiv.getAttribute('data-content') : null;
    });

    if (!storeDataContent) {
      throw new Error('No se encontró el contenedor .js-store ni resultados HTML en la página de tablatura de UG.');
    }

    const storeData = JSON.parse(storeDataContent);
    
    if (!storeData || !storeData.store.page.data.tab_view || !storeData.store.page.data.tab_view.wiki_tab.content) {
      throw new Error('No se pudo encontrar el contenido de la canción en los datos parseados de UG.');
    }

    const content = storeData.store.page.data.tab_view.wiki_tab.content;
    return cleanUGContent(content);
  } finally {
    if (browser) await browser.close();
  }
}

// --- Scrapers para Cifra Club ---

/**
 * Busca canciones en Cifra Club usando Puppeteer.
 * @param {string} query - El término de búsqueda.
 * @param {AbortSignal} signal - La señal para abortar la petición.
 * @returns {Promise<Array<object>>} - Una lista de canciones estandarizada.
 */
// Función legacy - ahora usa la nueva implementación
export async function searchSongsOnCifraClub(query, signal, timeout = 10000) {
  return await newCifraClubSearch(query, signal, timeout);
}

// Función antigua (comentada para referencia)
async function searchSongsOnCifraClubOld(query, signal, timeout = 15000) {
  console.log(`(CC) Iniciando búsqueda para: "${query}" con timeout de ${timeout}ms`);
  const homepageUrl = 'https://www.cifraclub.com.br/';
  let browser = null;

  // Timeout general para toda la operación
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout en búsqueda de Cifra Club')), timeout)
  );

  const abortPromise = new Promise((_, reject) => {
    if (signal) {
      signal.addEventListener('abort', () => {
        reject(new Error('Búsqueda en Cifra Club abortada por el cliente.'));
      });
    }
  });

  try {
    // Carrera entre timeout y toda la operación
    return await Promise.race([
      timeoutPromise,
      (async () => {
        browser = await puppeteer.launch({ headless: true });

        // Si la búsqueda se aborta mientras se inicia el navegador, cerramos y salimos.
        signal?.throwIfAborted();

        const page = await browser.newPage();
        await page.setUserAgent(BROWSER_HEADERS['User-Agent']);

        // Carrera entre la carga de la página y la señal de aborto
        await Promise.race([
          page.goto(homepageUrl, { waitUntil: 'networkidle2' }),
          abortPromise,
        ]);

        // Manejar banner de cookies
        try {
          const acceptButtonSelector = '#onetrust-accept-btn-handler';
          await Promise.race([
            page.waitForSelector(acceptButtonSelector, { timeout: 5000 }),
            abortPromise
          ]);
          await page.click(acceptButtonSelector);
          console.log('(CC) Banner de cookies aceptado.');
          await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 5000 }),
            abortPromise
          ]).catch(() => { });
        } catch (e) {
          if (signal?.aborted) throw new Error('Búsqueda abortada.');
          console.log('(CC) Banner de cookies no encontrado o ya fue aceptado.');
        }

        signal?.throwIfAborted();

        // Buscar usando la nueva interfaz de Cifra Club
        const searchInputSelector = '.header-search input, input[placeholder*="tocar"]';
        await Promise.race([
          page.waitForSelector(searchInputSelector, { visible: true }),
          abortPromise
        ]);

        // Limpiar campo y escribir búsqueda
        await page.click(searchInputSelector);
        await page.keyboard.selectAll();
        await page.type(searchInputSelector, query);

        signal?.throwIfAborted();

        // Esperar a que aparezcan las sugerencias
        await page.waitForTimeout(1000);

        // Presionar Enter o buscar botón de búsqueda
        try {
          const searchButtonSelector = '.header-searchButton, button[type="submit"]';
          await page.click(searchButtonSelector);
        } catch {
          await page.keyboard.press('Enter');
        }

        // Esperar por los resultados - la nueva interfaz puede usar diferentes selectores
        const possibleResultSelectors = [
          '.list-suggest .suggest',
          '.search-results .result-item',
          'article.song',
          '.song-item',
          'a[href*="/cifra/"]'
        ];

        let resultsSelector = null;
        for (const selector of possibleResultSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            resultsSelector = selector;
            break;
          } catch {
            continue;
          }
        }

        if (!resultsSelector) {
          console.log('(CC) No se encontraron resultados con los selectores conocidos');
          return [];
        }

        signal?.throwIfAborted();

        const songs = await page.evaluate((selector) => {
          const results = [];
          const elements = document.querySelectorAll(selector);

          elements.forEach(element => {
            let linkElement = element;

            // Si no es un enlace, buscar uno dentro del elemento
            if (!linkElement.href) {
              linkElement = element.querySelector('a');
            }

            if (!linkElement?.href) return;

            const url = linkElement.href;

            // Solo procesar URLs que contengan cifras/acordes
            if (!url.includes('/cifra/') && !url.includes('/tablatura/')) return;

            // Extraer título y artista del contenido
            let title = '';
            let artist = '';

            const titleElement = element.querySelector('.title, .song-title, h3, h4') || linkElement;
            const artistElement = element.querySelector('.artist, .song-artist, .subtitle');

            if (titleElement) {
              const fullText = (titleElement.innerText || titleElement.textContent || '').trim();

              if (artistElement) {
                title = fullText;
                artist = (artistElement.innerText || artistElement.textContent || '').trim();
              } else {
                // Intentar extraer artista del título si no hay elemento separado
                const parts = fullText.split(' - ');
                if (parts.length >= 2) {
                  artist = parts[0].trim();
                  title = parts.slice(1).join(' - ').trim();
                } else {
                  title = fullText;
                  artist = 'Artista desconocido';
                }
              }
            }

            if (title) {
              results.push({ title, artist, url });
            }
          });

          return results;
        }, resultsSelector);

        signal?.throwIfAborted();

        console.log(`(CC) Búsqueda en Cifra Club finalizada. Se encontraron ${cleanedSongs.length} canciones con acordes.`);

        // Estandarizar el formato de salida para que coincida con el de Ultimate Guitar
        return cleanedSongs.map(song => ({
          title: song.title,
          artist: song.artist,
          versions: [{
            url: song.url,
            rating: null, // Cifra Club no tiene este dato en la búsqueda
            votes: 0,
            source: 'Cifra Club',
          }],
        }));
      })() // Cerrar la función async del Promise.race
    ]);

  } catch (error) {
    console.error('Error en la búsqueda de Cifra Club:', error.message);
    throw new Error(`No se pudo obtener la lista de canciones de Cifra Club: ${error.message}`);
  } finally {
    if (browser) await browser.close();
  }
}

/**
 * Obtiene el contenido de una canción (letra y acordes) desde una URL de Cifra Club.
 * @param {string} songUrl - La URL de la canción de Cifra Club.
 * @param {AbortSignal} signal - La señal para abortar la petición.
 * @returns {Promise<string>} - El contenido de la canción.
 */
export async function getSongContentFromCifraClub(songUrl, signal) {
  console.log(`(CC) Obteniendo contenido de: ${songUrl}`);

  try {
    const { data } = await axios.get(songUrl, {
      headers: BROWSER_HEADERS,
      signal,
      timeout: 10000
    });

    const $ = cheerio.load(data);
    
    // Buscar primero el selector estándar, luego el alternativo y finalmente cualquier tag pre
    let element = $('div.cifra_cnt pre');
    if (!element.length) {
      element = $('pre.cifra-mono');
    }
    if (!element.length) {
      element = $('pre');
    }

    if (!element.length) {
      throw new Error('No se pudo encontrar el contenedor de acordes en la página.');
    }

    return processCifraClubElement(element, $);
  } catch (error) {
    console.error('Error en scraping de contenido de CC:', error.message);

    // Fallback a Puppeteer solo si axios falla y no es un aborto
    if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
      console.log('(CC) Reintentando con Puppeteer como fallback...');
      return await getSongContentFromCifraClubWithPuppeteer(songUrl, signal);
    }

    throw new Error('No se pudo obtener el contenido de la canción de Cifra Club.');
  }
}

/**
 * Procesa el elemento de Cifra Club para extraer acordes entre corchetes
 */
function processCifraClubElement(element, $) {
  // Reemplazar etiquetas <b> por [acorde]
  element.find('b').each(function () {
    const chord = $(this).text();
    $(this).replaceWith(`[${chord}]`);
  });

  return element.text();
}

/**
 * Fallback usando Puppeteer para casos difíciles
 */
async function getSongContentFromCifraClubWithPuppeteer(songUrl, signal) {
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: PUPPETEER_ARGS
    });
    const page = await browser.newPage();
    await page.setUserAgent(BROWSER_HEADERS['User-Agent']);

    await page.goto(songUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

    const contentSelector = 'div.cifra_cnt pre';
    await page.waitForSelector(contentSelector, { timeout: 10000 });

    const content = await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const clone = el.cloneNode(true);
      clone.querySelectorAll('b').forEach(b => {
        b.replaceWith(`[${b.textContent}]`);
      });
      return clone.innerText;
    }, contentSelector);

    return content;
  } finally {
    if (browser) await browser.close();
  }
}
