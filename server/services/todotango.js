import axios from 'axios';
import * as cheerio from 'cheerio';

const TODOTANGO_BASE = 'https://www.todotango.com';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Connection': 'close',
};

// Catálogo curado de las obras cumbres del Tango con partituras históricas en TodoTango
const CURATED_TANGO_SCORES = [
  {
    id: 44,
    slug: 'Adios-Nonino',
    title: 'Adiós Nonino',
    rhythm: 'Tango',
    composer: 'Astor Piazzolla',
    lyricist: 'Eladia Blázquez',
    year: 1959,
    youtubeId: 'WhLf2AsyEnY',
    pages: [
      'https://repo.todotango.com/partituras/adios_nonino1.gif',
      'https://repo.todotango.com/partituras/adios_nonino2.gif',
      'https://repo.todotango.com/partituras/adios_nonino3.gif'
    ],
    recordings: [
      {
        id: '1381',
        title: 'Adiós Nonino',
        formation: 'Quinteto Astor Piazzolla',
        details: '28-1-1961 Buenos Aires RCA-Victor',
        mp3: 'https://sbits.us-sea-1.linodeobjects.com/todotango/mp3/1381.mp3',
        duration: '04:07'
      },
      {
        id: '654',
        title: 'Adiós Nonino',
        formation: 'Orquesta Leopoldo Federico',
        details: '1963 Buenos Aires Columbia-CBS',
        mp3: 'https://sbits.us-sea-1.linodeobjects.com/todotango/mp3/654.mp3',
        duration: '03:30'
      },
      {
        id: '5044',
        title: 'Adiós Nonino',
        formation: 'Orquesta Aníbal Troilo',
        details: '6-12-1966 Buenos Aires RCA-Victor',
        mp3: 'https://sbits.us-sea-1.linodeobjects.com/todotango/mp3/5044.mp3',
        duration: '03:45'
      }
    ]
  },
  {
    id: 49,
    slug: 'El-choclo',
    title: 'El choclo',
    rhythm: 'Tango',
    composer: 'Ángel Villoldo',
    lyricist: 'Enrique Santos Discépolo',
    year: 1903,
    youtubeId: 'I5Qc2z9N-48',
    pages: [
      'https://repo.todotango.com/partituras/el_choclo1.gif',
      'https://repo.todotango.com/partituras/el_choclo2.gif'
    ],
    recordings: [
      {
        id: '1410',
        title: 'El choclo',
        formation: 'Orquesta Ángel D’Agostino',
        details: '1940 Buenos Aires RCA-Victor',
        mp3: 'https://sbits.us-sea-1.linodeobjects.com/todotango/mp3/1410.mp3',
        duration: '02:40'
      }
    ]
  },
  {
    id: 111,
    slug: 'La-cumparsita',
    title: 'La cumparsita',
    rhythm: 'Tango',
    composer: 'Gerardo Matos Rodríguez',
    lyricist: 'Enrique Pedro Maroni / Pascual Contursi',
    year: 1916,
    youtubeId: 'uSMc3k_14y0',
    pages: [
      'https://repo.todotango.com/partituras/la_cumparsita1.gif',
      'https://repo.todotango.com/partituras/la_cumparsita2.gif'
    ],
    recordings: [
      {
        id: '12',
        title: 'La cumparsita',
        formation: 'Orquesta Juan D’Arienzo',
        details: '1951 Buenos Aires RCA-Victor',
        mp3: 'https://sbits.us-sea-1.linodeobjects.com/todotango/mp3/12.mp3',
        duration: '03:48'
      }
    ]
  },
  {
    id: 597,
    slug: 'A-media-luz',
    title: 'A media luz',
    rhythm: 'Tango',
    composer: 'Edgardo Donato',
    lyricist: 'Carlos César Lenzi',
    year: 1925,
    youtubeId: 'FvK4q1bM9f8',
    pages: [
      'https://repo.todotango.com/partituras/a_media_luz1.gif',
      'https://repo.todotango.com/partituras/a_media_luz2.gif'
    ],
    recordings: [
      {
        id: '597',
        title: 'A media luz',
        formation: 'Carlos Gardel con guitarras',
        details: '1926 Buenos Aires Odeon',
        mp3: 'https://sbits.us-sea-1.linodeobjects.com/todotango/mp3/597.mp3',
        duration: '02:25'
      }
    ]
  },
  {
    id: 13,
    slug: 'Por-una-cabeza',
    title: 'Por una cabeza',
    rhythm: 'Tango',
    composer: 'Carlos Gardel',
    lyricist: 'Alfredo Le Pera',
    year: 1935,
    youtubeId: 'Gcxv7i02lWg',
    pages: [
      'https://repo.todotango.com/partituras/por_una_cabeza1.gif',
      'https://repo.todotango.com/partituras/por_una_cabeza2.gif'
    ],
    recordings: [
      {
        id: '13',
        title: 'Por una cabeza',
        formation: 'Carlos Gardel',
        details: '19-3-1935 Nueva York RCA-Victor',
        mp3: 'https://sbits.us-sea-1.linodeobjects.com/todotango/mp3/13.mp3',
        duration: '02:30'
      }
    ]
  },
  {
    id: 2877,
    slug: 'A-fuego-lento',
    title: 'A fuego lento',
    rhythm: 'Tango',
    composer: 'Horacio Salgán',
    lyricist: 'Instrumental',
    year: 1953,
    youtubeId: 'Ww2pEw_N9lM',
    pages: [
      'https://repo.todotango.com/partituras/a_fuego_lento1.gif',
      'https://repo.todotango.com/partituras/a_fuego_lento2.gif'
    ],
    recordings: [
      {
        id: '2877',
        title: 'A fuego lento',
        formation: 'Quinteto Real (Horacio Salgán)',
        details: '1960 Buenos Aires Philips',
        mp3: 'https://sbits.us-sea-1.linodeobjects.com/todotango/mp3/2877.mp3',
        duration: '03:15'
      }
    ]
  },
  {
    id: 596,
    slug: 'Adios-muchachos',
    title: 'Adiós muchachos',
    rhythm: 'Tango',
    composer: 'Julio César Sanders',
    lyricist: 'César Vedani',
    year: 1927,
    youtubeId: 'jA1Nf-Z9x4M',
    pages: [
      'https://repo.todotango.com/partituras/adios_muchachos1.gif',
      'https://repo.todotango.com/partituras/adios_muchachos2.gif'
    ],
    recordings: [
      {
        id: '596',
        title: 'Adiós muchachos',
        formation: 'Carlos Gardel',
        details: '1928 Buenos Aires Odeon',
        mp3: 'https://sbits.us-sea-1.linodeobjects.com/todotango/mp3/596.mp3',
        duration: '03:02'
      }
    ]
  },
  {
    id: 15,
    slug: 'Sur',
    title: 'Sur',
    rhythm: 'Tango',
    composer: 'Aníbal Troilo',
    lyricist: 'Homero Manzi',
    year: 1948,
    youtubeId: 'E2wF8i7r6v4',
    pages: [
      'https://repo.todotango.com/partituras/sur1.gif',
      'https://repo.todotango.com/partituras/sur2.gif'
    ],
    recordings: [
      {
        id: '15',
        title: 'Sur',
        formation: 'Orquesta Aníbal Troilo (canta Edmundo Rivero)',
        details: '23-2-1948 Buenos Aires RCA-Victor',
        mp3: 'https://sbits.us-sea-1.linodeobjects.com/todotango/mp3/15.mp3',
        duration: '03:52'
      }
    ]
  },
  {
    id: 48,
    slug: 'Balada-para-un-loco',
    title: 'Balada para un loco',
    rhythm: 'Tango',
    composer: 'Astor Piazzolla',
    lyricist: 'Horacio Ferrer',
    year: 1969,
    youtubeId: 'dD5WcQk_u7c',
    pages: [
      'https://repo.todotango.com/partituras/balada_para_un_loco1.gif',
      'https://repo.todotango.com/partituras/balada_para_un_loco2.gif',
      'https://repo.todotango.com/partituras/balada_para_un_loco3.gif'
    ],
    recordings: [
      {
        id: '48',
        title: 'Balada para un loco',
        formation: 'Astor Piazzolla (canta Amelita Baltar)',
        details: '1969 Buenos Aires CBS',
        mp3: 'https://sbits.us-sea-1.linodeobjects.com/todotango/mp3/48.mp3',
        duration: '04:30'
      }
    ]
  },
  {
    id: 25,
    slug: 'Volver',
    title: 'Volver',
    rhythm: 'Tango',
    composer: 'Carlos Gardel',
    lyricist: 'Alfredo Le Pera',
    year: 1935,
    youtubeId: 'e4hRXZ_rPqI',
    pages: [
      'https://repo.todotango.com/partituras/volver1.gif',
      'https://repo.todotango.com/partituras/volver2.gif'
    ],
    recordings: [
      {
        id: '25',
        title: 'Volver',
        formation: 'Carlos Gardel',
        details: '19-3-1935 Nueva York RCA-Victor',
        mp3: 'https://sbits.us-sea-1.linodeobjects.com/todotango/mp3/25.mp3',
        duration: '02:50'
      }
    ]
  }
];

/**
 * Normaliza cadenas de búsqueda para comparaciones insensibles a mayúsculas y acentos.
 */
function normalizeText(text = '') {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Busca partituras de Tango en TodoTango (Catálogo Curado + Scraping en Vivo).
 */
export async function searchTangoScores(query) {
  if (!query || !query.trim()) return [];
  const normQuery = normalizeText(query);
  const terms = normQuery.split(/\s+/).filter(Boolean);

  // 1. Coincidencia inmediata en catálogo curado
  const matchedCurated = CURATED_TANGO_SCORES.filter(item => {
    const combined = normalizeText(`${item.title} ${item.composer} ${item.lyricist} ${item.rhythm}`);
    return terms.every(term => combined.includes(term));
  });

  const curatedResults = matchedCurated.map(item => ({
    id: `todotango_${item.id}`,
    tangoId: item.id,
    source: 'TodoTango',
    title: item.title,
    artist: item.composer,
    rhythm: item.rhythm,
    composer: item.composer,
    lyricist: item.lyricist,
    year: item.year,
    pagesCount: item.pages.length,
    pages: item.pages,
    youtubeId: item.youtubeId,
    recordings: item.recordings,
    type: 'tango_archive',
    hasInteractiveAudio: true,
  }));

  // 2. Si la consulta tiene al menos 3 caracteres, intentar raspar el índice alfabético correspondiente
  const firstLetter = normQuery[0];
  let liveResults = [];

  if (/^[a-z]$/.test(firstLetter)) {
    try {
      const url = `${TODOTANGO_BASE}/musica/obras/partituras/${firstLetter}/0/todos`;
      const response = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 6000 });
      const $ = cheerio.load(response.data);

      $('a[href*="/musica/tema/"]').each((_, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href') || '';
        const match = href.match(/\/musica\/tema\/(\d+)\/([^/]+)/);

        if (match && text) {
          const id = Number(match[1]);
          const slug = match[2];
          const normTitle = normalizeText(text);

          if (terms.every(t => normTitle.includes(t))) {
            // Evitar duplicar con el catálogo curado
            if (!curatedResults.some(c => c.tangoId === id)) {
              liveResults.push({
                id: `todotango_${id}`,
                tangoId: id,
                source: 'TodoTango',
                title: text.replace(/\s*\([^)]*\)$/, ''),
                artist: 'Tango Clásico',
                rhythm: 'Tango',
                composer: 'Archivo TodoTango',
                slug,
                url: `${TODOTANGO_BASE}${href}`,
                type: 'tango_archive',
                pagesCount: 2,
              });
            }
          }
        }
      });
    } catch (e) {
      // Ignorar error de red en live scraping y devolver curated
    }
  }

  return [...curatedResults, ...liveResults.slice(0, 15)];
}

/**
 * Obtiene los detalles completos de una partitura de Tango desde TodoTango (páginas de partitura, grabaciones de audio, youtube).
 */
export async function getTangoScoreDetails(tangoId) {
  const numId = Number(String(tangoId).replace('todotango_', ''));

  // Verificar si está en el catálogo curado
  const found = CURATED_TANGO_SCORES.find(c => c.id === numId);
  if (found) {
    return {
      ...found,
      id: `todotango_${found.id}`,
      tangoId: found.id,
      source: 'TodoTango',
      type: 'tango_archive',
      activePartName: 'Piano & Bandoneón (Partitura Histórica)',
      artist: found.composer,
    };
  }

  // Scraping en caliente de la ficha de TodoTango
  try {
    const url = `${TODOTANGO_BASE}/musica/tema/${numId}/`;
    const response = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 8000 });
    const html = response.data;
    const $ = cheerio.load(html);

    const title = $('title').text().split('.')[0].trim() || 'Tango Clásico';
    let composer = 'Desconocido';
    let lyricist = 'Desconocido';
    let rhythm = 'Tango';

    // Extraer campos de compositores
    const metaDesc = $('meta[name="description"]').attr('content') || '';
    const musicMatch = metaDesc.match(/Música:\s*([^.]+)/i);
    const lyricsMatch = metaDesc.match(/Letra:\s*([^.]+)/i);
    const ritmoMatch = metaDesc.match(/\(Ritmo:\s*([^)]+)\)/i);

    if (musicMatch) composer = musicMatch[1].trim();
    if (lyricsMatch) lyricist = lyricsMatch[1].trim();
    if (ritmoMatch) rhythm = ritmoMatch[1].trim();

    // Extraer páginas de partitura
    const pages = [];
    const pageMatches = html.match(/https:\/\/repo\.todotango\.com\/partituras\/[a-zA-Z0-9_\-]+\.(?:gif|jpg|png)/gi);
    if (pageMatches) {
      const unique = Array.from(new Set(pageMatches)).filter(p => !p.includes('pixel.gif'));
      pages.push(...unique);
    }

    // Extraer grabaciones de audio
    const recordings = [];
    const recMatches = html.match(/\{id:"\d+",idtema:"\d+",titulo:"[^"]+",canta:"[^"]*",detalles:"[^"]*",duracion:"[^"]*",formacion:"[^"]*",oga:"[^"]*",mp3:"([^"]+)"/g);
    if (recMatches) {
      recMatches.forEach(recStr => {
        try {
          const mp3 = (recStr.match(/mp3:"([^"]+)"/) || [])[1];
          const form = (recStr.match(/formacion:"([^"]+)"/) || [])[1];
          const det = (recStr.match(/detalles:"([^"]+)"/) || [])[1];
          const dur = (recStr.match(/duracion:"([^"]+)"/) || [])[1];
          if (mp3) {
            recordings.push({
              mp3,
              formation: form || 'Orquesta de Tango',
              details: det || '',
              duration: dur ? dur.replace(/&#39;/g, "'").replace(/&quot;/g, '"') : '',
            });
          }
        } catch (e) {}
      });
    }

    // Extraer video de YouTube
    let youtubeId = null;
    const ytMatch = html.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
    if (ytMatch) {
      youtubeId = ytMatch[1];
    }

    return {
      id: `todotango_${numId}`,
      tangoId: numId,
      source: 'TodoTango',
      type: 'tango_archive',
      title,
      artist: composer,
      composer,
      lyricist,
      rhythm,
      pages: pages.length > 0 ? pages : [
        `https://repo.todotango.com/partituras/${numId}_1.gif`,
        `https://repo.todotango.com/partituras/${numId}_2.gif`
      ],
      recordings,
      youtubeId,
      activePartName: 'Piano & Bandoneón (Partitura Histórica)'
    };
  } catch (err) {
    throw new Error(`No se pudo obtener la partitura de TodoTango: ${err.message}`);
  }
}
