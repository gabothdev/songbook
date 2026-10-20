import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { PUPPETEER_ARGS, getChromeExecutablePath } from '../config/puppeteer.js';
import { searchYouTubeMusic } from './youtube.js';
import prisma from './db.js';
import {
  parseChordifyMeasuresAndLyrics,
  normalizeChord,
  sanitizeLyricLineSegments,
  buildRawLyricSegments,
} from './chordify/measureParser.js';

puppeteer.use(StealthPlugin());

// Re-export helpers from measureParser for backward compatibility
export { normalizeChord, sanitizeLyricLineSegments, buildRawLyricSegments };

export async function getChordifyBeatGrid(youtubeId, fallbackTitle = null, fallbackArtist = null, options = {}) {
  const {
    captureScreenshots = false,
    includeRawData = false,
    skipCacheSave = false,
  } = options;

  console.log(`[Chordify Scraper] Iniciando scraping para youtubeId: ${youtubeId} (screenshots=${captureScreenshots})`);
  const chromePath = getChromeExecutablePath();
  const browser = await puppeteer.launch({
    headless: false,
    ...(chromePath ? { executablePath: chromePath } : {}),
    args: [
      ...PUPPETEER_ARGS,
      '--window-position=-2400,-2400',
      '--window-size=1366,900',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 900 });

  const url = `https://chordify.net/chords/youtube:${youtubeId}`;
  console.log(`[Chordify Scraper] Navegando a: ${url}`);

  try {
    const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const status = response.status();

    if (status >= 400) {
      throw new Error(`Chordify retornó código de estado ${status}`);
    }

    // Esperar a que el script de hidratación se cargue en el DOM
    await page.waitForFunction(
      () => {
        const scripts = Array.from(document.querySelectorAll('script'));
        return scripts.some((s) => s.textContent?.includes('window.__staticRouterHydrationData'));
      },
      { timeout: 15000 }
    );

    const dataStr = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const target = scripts.find((s) => s.textContent?.includes('window.__staticRouterHydrationData'));
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

    // Infer title fallback from <title> if missing
    let pageTitleFallback = fallbackTitle;
    if (!pageTitleFallback) {
      try {
        const rawTitle = await page.title();
        const cleaned = rawTitle
          .replace(/\s+(?:Chords\s*&\s*Lyrics|Chords|Acordes)\s*(?:by.*?)?(?:-\s*Chordify|\|\s*Chordify)?$/i, '')
          .trim();
        if (cleaned && !/^chordify$/i.test(cleaned)) {
          pageTitleFallback = cleaned;
        }
      } catch (titleErr) {
        console.warn('[Chordify Scraper] No se pudo inferir título desde el tag <title>:', titleErr.message);
      }
    }

    // Pure musical and measure parsing decoupled to measureParser
    const parsed = parseChordifyMeasuresAndLyrics(chordsData, {
      fallbackTitle: pageTitleFallback,
      fallbackArtist,
    });

    const hasLyrics = parsed.hasLyrics;

    // Capturas de pantalla opcionales (Chords Grid + Lyrics View)
    let screenshots = null;
    if (captureScreenshots) {
      screenshots = { chordsView: null, lyricsView: null };
      try {
        // Limpiar banners de cookies, modales y overlays molestos
        await page.evaluate(() => {
          const selectorsToHide = [
            '#CybotCookiebotDialog',
            '[id*="cookie"]',
            '[class*="cookie"]',
            '[class*="consent"]',
            '[role="dialog"]',
            '[class*="modal"]',
            '[class*="Popup"]',
            '[class*="Banner"]',
          ];
          selectorsToHide.forEach((sel) => {
            document.querySelectorAll(sel).forEach((el) => {
              el.style.display = 'none';
            });
          });
        });

        await new Promise((r) => setTimeout(r, 800));

        // 1. Captura de la vista por defecto (Chords / Diagramas)
        const chordsBase64 = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 82 });
        screenshots.chordsView = `data:image/jpeg;base64,${chordsBase64}`;

        // 2. Intentar cambiar a la pestaña de Lyrics / LeadSheet si existe
        if (hasLyrics) {
          const clickedLyrics = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button, a, [role="tab"]'));
            const lyricsBtn = buttons.find((b) => {
              const txt = (b.textContent || '').trim().toLowerCase();
              return txt === 'lyrics' || txt === 'letra' || txt === 'letras' || txt.includes('lyrics') || txt.includes('chords & lyrics');
            });
            if (lyricsBtn) {
              lyricsBtn.click();
              return true;
            }
            return false;
          });

          if (clickedLyrics) {
            await new Promise((r) => setTimeout(r, 900));
            const lyricsBase64 = await page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 82 });
            screenshots.lyricsView = `data:image/jpeg;base64,${lyricsBase64}`;
          }
        }
      } catch (shotErr) {
        console.warn('[Chordify Scraper] Error al tomar capturas de referencia:', shotErr.message);
      }
    }

    // Guardar en la caché persistente de SQLite para que futuras búsquedas lo reconozcan al instante
    if (!skipCacheSave) {
      try {
        await prisma.chordifyCache.upsert({
          where: { youtubeId },
          update: {
            hasLyrics,
            lyricsType: chordsData.lyricsType || (hasLyrics ? 'synced' : null),
            title: parsed.songTitle,
            artist: parsed.songArtist,
            bpm: Number(parsed.bpm) || null,
            leadSheetText: parsed.leadSheetText || null,
          },
          create: {
            youtubeId,
            hasLyrics,
            lyricsType: chordsData.lyricsType || (hasLyrics ? 'synced' : null),
            title: parsed.songTitle,
            artist: parsed.songArtist,
            bpm: Number(parsed.bpm) || null,
            leadSheetText: parsed.leadSheetText || null,
          },
        });
      } catch (cacheErr) {
        console.warn('[Chordify Scraper] Error al guardar en ChordifyCache:', cacheErr.message);
      }
    }

    return {
      youtubeId,
      chordifyUrl: url,
      title: parsed.songTitle,
      artist: parsed.songArtist,
      bpm: parsed.bpm,
      rawKey: parsed.key,
      key: parsed.normalizedKey,
      compases: parsed.compases,
      barLength: parsed.barLength,
      hasLyrics,
      lyricsType: chordsData.lyricsType || (hasLyrics ? 'synced' : null),
      ...(parsed.leadSheetText ? { leadSheetText: parsed.leadSheetText } : {}),
      ...(screenshots ? { screenshots } : {}),
      ...(includeRawData
        ? {
            rawDiagnostics: {
              ...parsed.diagnostics,
              chordsDataKeys: Object.keys(chordsData || {}),
              chordsObjKeys: Object.keys(chordsData.chords?.value || {}),
              rawLyricsObj: chordsData.lyrics || chordsData.chords?.value?.lyrics || null,
              chordInfo: chordsData.chords?.value?.chordInfo || {},
              beatsSample: parsed.diagnostics.beats.slice(0, 64),
              allBeats: parsed.diagnostics.beats,
            },
          }
        : {}),
    };
  } finally {
    await browser.close();
    console.log('[Chordify Scraper] Browser cerrado.');
  }
}

export async function searchSongsOnChordify(query, signal) {
  console.log(`[Chordify Scraper] Buscando canciones filtradas para Chordify: "${query}"`);
  try {
    const candidates = await searchYouTubeMusic(query, { signal, maxResults: 15 });

    const candidateIds = candidates.map((item) => item.videoId).filter(Boolean);
    const hasLyricsMap = new Map();

    if (candidateIds.length > 0) {
      try {
        const [cachedChordify, cachedSongs] = await Promise.all([
          prisma.chordifyCache.findMany({
            where: { youtubeId: { in: candidateIds } },
            select: { youtubeId: true, hasLyrics: true },
          }),
          prisma.song.findMany({
            where: { youtubeId: { in: candidateIds } },
            select: { youtubeId: true, content: true, isInstrumental: true },
          }),
        ]);

        for (const c of cachedChordify) {
          if (c.hasLyrics) hasLyricsMap.set(c.youtubeId, true);
        }
        for (const s of cachedSongs) {
          if (s.content && !s.isInstrumental) hasLyricsMap.set(s.youtubeId, true);
        }
      } catch (dbErr) {
        console.warn('[Chordify Scraper] Error al consultar caché de letras:', dbErr.message);
      }
    }

    return candidates.map((item) => {
      const hasLyrics = Boolean(hasLyricsMap.get(item.videoId));
      return {
        title: item.title,
        artist: item.artist,
        youtubeId: item.videoId,
        duration: item.duration,
        hasLyrics,
        versions: [
          {
            url: `https://chordify.net/chords/youtube:${item.videoId}`,
            rating: null,
            votes: 0,
            source: 'Chordify',
            type: 'Chordify',
            hasLyrics,
          },
        ],
      };
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    console.error('[Chordify Scraper] Error al buscar canciones:', error.message);
    return [];
  }
}

export async function checkChordifyLyrics(youtubeIds = []) {
  if (!Array.isArray(youtubeIds) || youtubeIds.length === 0) return {};
  const results = {};

  try {
    const [cachedChordify, cachedSongs] = await Promise.all([
      prisma.chordifyCache.findMany({
        where: { youtubeId: { in: youtubeIds } },
        select: { youtubeId: true, hasLyrics: true },
      }),
      prisma.song.findMany({
        where: { youtubeId: { in: youtubeIds } },
        select: { youtubeId: true, content: true, isInstrumental: true },
      }),
    ]);

    for (const c of cachedChordify) {
      results[c.youtubeId] = c.hasLyrics;
    }
    for (const s of cachedSongs) {
      if (s.content && !s.isInstrumental) results[s.youtubeId] = true;
    }

    const uncachedIds = youtubeIds.filter((id) => results[id] === undefined);
    if (uncachedIds.length > 0) {
      const topId = uncachedIds[0];
      try {
        console.log(`[Chordify Scraper] Verificando en background candidato no cacheado: ${topId}`);
        const scraped = await getChordifyBeatGrid(topId);
        results[topId] = Boolean(scraped.leadSheetText);
      } catch (err) {
        console.warn(`[Chordify Scraper] Falló chequeo en background para ${topId}:`, err.message);
      }
    }
  } catch (err) {
    console.warn('[Chordify Scraper] Error en checkChordifyLyrics:', err.message);
  }

  return results;
}
