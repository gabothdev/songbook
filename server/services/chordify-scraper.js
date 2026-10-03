import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { PUPPETEER_ARGS, getChromeExecutablePath } from '../config/puppeteer.js';
import axios from 'axios';

puppeteer.use(StealthPlugin());

export async function getChordifyBeatGrid(youtubeId) {
  console.log(`[Chordify Scraper] Iniciando scraping para youtubeId: ${youtubeId}`);
  const chromePath = getChromeExecutablePath();
  const browser = await puppeteer.launch({
    headless: false,
    ...(chromePath ? { executablePath: chromePath } : {}),
    args: [
      ...PUPPETEER_ARGS,
      '--window-position=-2400,-2400',
      '--window-size=1280,800'
    ]
  });
  
  const page = await browser.newPage();
  
  const url = `https://chordify.net/chords/youtube:${youtubeId}`;
  console.log(`[Chordify Scraper] Navegando a: ${url}`);
  
  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = response.status();
    
    if (status >= 400) {
      throw new Error(`Chordify retornó código de estado ${status}`);
    }
    
    // Esperar a que el script de hidratación se cargue en el DOM
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
      throw new Error('No se pudo encontrar window.__staticRouterHydrationData en la página.');
    }
    
    const jsonStr = JSON.parse(dataStr);
    const hydrationData = JSON.parse(jsonStr);
    
    const keys = Object.keys(hydrationData.loaderData);
    const loaderKey = keys[0];
    const chordsData = hydrationData.loaderData[loaderKey];
    
    if (!chordsData || !chordsData.chords || chordsData.chords._type === 'Failure') {
      throw new Error('Chordify no tiene acordes disponibles para este video.');
    }
    
    const chordsObj = chordsData.chords.value;
    let songTitle = chordsData.title || chordsObj.title || chordsData.meta?.title || chordsData.track?.title || null;
    let songArtist = chordsData.artist || chordsObj.artist || chordsData.meta?.artist || chordsData.track?.artist || null;

    if (!songTitle || !songArtist) {
      try {
        const rawTitle = await page.title();
        const cleaned = rawTitle.replace(/\s+(?:Chords|Acordes)\s*-\s*Chordify$/i, '').trim();
        if (cleaned.includes(' - ')) {
          const parts = cleaned.split(' - ');
          if (!songArtist) songArtist = parts[0].trim();
          if (!songTitle) songTitle = parts.slice(1).join(' - ').trim();
        } else if (!songTitle) {
          songTitle = cleaned;
        }
      } catch (titleErr) {
        console.warn('[Chordify Scraper] No se pudo inferir título desde el tag <title>:', titleErr.message);
      }
    }

    const bpm = chordsObj.chordInfo.derivedBpm || 120;
    const key = chordsObj.chordInfo.derivedKey || 'C:maj';
    const barLength = chordsObj.barLength || chordsObj.chordInfo.barLength || 4;
    const chordsStr = chordsObj.chords;
    
    if (!chordsStr) {
      throw new Error('La cadena de acordes de Chordify está vacía.');
    }
    
    // Parsear la cadena de acordes
    const lines = chordsStr.split('\n').filter(l => l.trim() !== '');
    const beats = lines.map(line => {
      const parts = line.split(';');
      return {
        beatNum: parseInt(parts[0], 10),
        chord: normalizeChord(parts[1] || 'N'),
        startTime: parseFloat(parts[2] || '0'),
        endTime: parseFloat(parts[3] || '0')
      };
    });
    
    // Agrupar en compases preservando compases de anacrusa/intro (ej. 2 tiempos) y agrupando acordes en 4/4
    const firstChordIdx = beats.findIndex((b) => b.chord !== '𝄾' && b.chord !== '𝄽');
    const rawMeasures = [];

    if (firstChordIdx > 0) {
      // Tomar los silencios previos al primer acorde (hasta barLength tiempos) como compás de intro
      const firstBarIdx = beats.findIndex((b) => b.beatNum === 1);
      const introStart = (firstBarIdx !== -1 && firstBarIdx < firstChordIdx)
        ? firstBarIdx
        : Math.max(0, firstChordIdx - 2);

      const introBeats = beats.slice(introStart, firstChordIdx);
      if (introBeats.length > 0) {
        rawMeasures.push(introBeats);
      }

      // Desde el primer acorde en adelante, agrupar de a barLength (4 tiempos)
      const songBeats = beats.slice(firstChordIdx);
      for (let i = 0; i < songBeats.length; i += barLength) {
        rawMeasures.push(songBeats.slice(i, i + barLength));
      }
    } else {
      for (let i = 0; i < beats.length; i += barLength) {
        rawMeasures.push(beats.slice(i, i + barLength));
      }
    }

    const hasIntro = rawMeasures.length > 0 && rawMeasures[0].every(b => b.chord === '𝄾' || b.chord === '𝄽');
    const compases = rawMeasures.map((measureBeats, mIdx) => {
      const acordes = measureBeats.map((b) => b.chord);
      const beatTimes = measureBeats.map((b) => b.startTime);
      const id = mIdx + 1;

      let seccion = '';
      let isSecStart = false;

      if (hasIntro && mIdx === 0) {
        seccion = 'Intro';
        isSecStart = true;
      } else {
        const songMeasureIdx = hasIntro ? mIdx - 1 : mIdx;
        const secIdx = Math.floor(songMeasureIdx / 8) + 1;
        seccion = `Estrofa ${secIdx}`;
        isSecStart = songMeasureIdx % 8 === 0;
      }

      const secTime = isSecStart && measureBeats[0] ? measureBeats[0].startTime : null;

      return {
        id,
        acordes,
        beatTimes,
        seccion,
        ...(secTime !== null ? { secTime } : {})
      };
    });
    
    // Reconstruir leadSheet si existe
    let leadSheetText = null;
    const leadSheet = chordsData.leadSheet;
    if (leadSheet && leadSheet.data && leadSheet.data.value) {
      try {
        const sections = leadSheet.data.value;
        let textOutput = '';
        
        sections.forEach(section => {
          const title = section.title || 'Sección';
          const firstContent = section.content && section.content[0];
          const secTimeSec = firstContent ? (firstContent.start / 1000).toFixed(1) : '0.0';
          
          textOutput += `\n[${title} @ ${secTimeSec}]\n`;
          
          if (section.content) {
            section.content.forEach(c => {
              if (c.line && c.line.lyricLine) {
                const lyrics = c.line.lyricLine.lyrics || '';
                const chordsList = c.line.lyricLine.chords || [];
                
                let lineText = '';
                let lyricIndex = 0;
                
                chordsList.forEach(item => {
                  if (item.chord) {
                    lineText += `[${normalizeChord(item.chord)}]`;
                  } else if (item.step !== undefined) {
                    const stepVal = item.step;
                    lineText += lyrics.substring(lyricIndex, lyricIndex + stepVal);
                    lyricIndex += stepVal;
                  }
                });
                
                if (lyricIndex < lyrics.length) {
                  lineText += lyrics.substring(lyricIndex);
                }
                
                textOutput += lineText + '\n';
              }
            });
          }
        });
        
        leadSheetText = textOutput.trim();
      } catch (err) {
        console.warn('[Chordify Scraper] Error al reconstruir leadSheet:', err.message);
      }
    }
    
    return {
      title: songTitle,
      artist: songArtist,
      bpm,
      key: normalizeChord(key),
      compases,
      barLength,
      ...(leadSheetText ? { leadSheetText } : {})
    };
    
  } finally {
    await browser.close();
    console.log('[Chordify Scraper] Browser cerrado.');
  }
}

function normalizeChord(chord) {
  if (!chord || chord === 'N' || chord === 'none') return '𝄾';
  let c = chord.trim();

  // 1. Colon replacements from Chordify (e.g. E:maj -> E, E:min -> Em, E:maj7 -> Emaj7)
  c = c
    .replace(/:min/gi, 'm')
    .replace(/:maj(?=\/|$)/gi, '')
    .replace(/:maj/gi, 'maj')
    .replace(/:/g, '');

  // 2. Pure major triad simplification (e.g. Emaj/Ab -> E/Ab, Emaj -> E, while preserving Emaj7, Emaj9)
  c = c.replace(/^([A-G][b#]?)maj(?!\d)(\/[A-G][b#]?)?$/i, (match, root, bass) => {
    return `${root}${bass || ''}`;
  });

  c = c.replace(/^([A-G][b#]?)major(?!\d)(\/[A-G][b#]?)?$/i, (match, root, bass) => {
    return `${root}${bass || ''}`;
  });

  return c;
}

// Buscar todas las ocurrencias de una clave de forma recursiva en JSON de YT
function findKeysRecursive(obj, targetKey, results = []) {
  if (!obj || typeof obj !== 'object') return results;
  
  if (obj[targetKey] !== undefined) {
    results.push(obj[targetKey]);
  }
  
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object') {
      findKeysRecursive(obj[key], targetKey, results);
    }
  }
  
  return results;
}

export async function searchSongsOnChordify(query, signal) {
  console.log(`[Chordify Scraper] Buscando en YouTube para Chordify: "${query}"`);
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  };
  
  try {
    const { data: html } = await axios.get(url, { headers, signal, timeout: 10000 });
    
    const match = html.match(/ytInitialData\s*=\s*({[\s\S]*?});/);
    if (!match) {
      console.warn('[Chordify Scraper] No se pudo encontrar ytInitialData en el HTML de YouTube.');
      return [];
    }
    
    const jsonStr = match[1];
    const data = JSON.parse(jsonStr);
    
    const videoRenderers = findKeysRecursive(data, 'videoRenderer');
    const results = [];
    
    for (const video of videoRenderers) {
      const videoId = video.videoId;
      const title = video.title?.runs?.[0]?.text || video.title?.simpleText || '';
      const artist = video.ownerText?.runs?.[0]?.text || video.shortBylineText?.runs?.[0]?.text || 'Artista Desconocido';
      
      if (videoId && title) {
        results.push({
          title,
          artist,
          versions: [{
            url: `https://chordify.net/chords/youtube:${videoId}`,
            rating: null,
            votes: 0,
            source: 'Chordify',
            type: 'Chordify'
          }]
        });
      }
    }
    
    return results.slice(0, 15);
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.error('[Chordify Scraper] Error al buscar canciones:', error.message);
    return [];
  }
}
