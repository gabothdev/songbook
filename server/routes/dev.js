// server/routes/dev.js
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../services/db.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapa de nombres de tablas / rutas a modelos Prisma
const MODEL_MAPPING = {
  songs: 'song',
  song: 'song',
  favorites: 'favorite',
  favorite: 'favorite',
  setlists: 'setlist',
  setlist: 'setlist',
  setlistsongs: 'setlistSong',
  setlistsong: 'setlistSong',
  customchords: 'customChord',
  customchord: 'customChord',
  chorddefinitions: 'chordDefinition',
  chorddefinition: 'chordDefinition',
  scoresheets: 'scoreSheet',
  scoresheet: 'scoreSheet',
  artists: 'artist',
  artist: 'artist',
  albums: 'album',
  album: 'album',
  users: 'user',
  user: 'user',
  userpreferences: 'userSongPreference',
  usersongpreferences: 'userSongPreference',
  usersongpreference: 'userSongPreference',
};

function getModelDelegate(tableName) {
  const modelName = MODEL_MAPPING[tableName.toLowerCase()];
  if (!modelName || !prisma[modelName]) {
    return null;
  }
  return { delegate: prisma[modelName], modelName };
}

// 1. Estadísticas generales de la base de datos
router.get('/stats', async (req, res) => {
  try {
    const dbPath = path.resolve(__dirname, '../prisma/dev.db');
    let dbSize = 0;
    let lastModified = null;

    if (fs.existsSync(dbPath)) {
      const stat = fs.statSync(dbPath);
      dbSize = stat.size;
      lastModified = stat.mtime;
    }

    const [
      songCount,
      artistCount,
      albumCount,
      userCount,
      userSongPrefCount,
      favoriteCount,
      setlistCount,
      setlistSongCount,
      customChordCount,
      chordDefCount,
      scoreSheetCount,
    ] = await Promise.all([
      prisma.song.count(),
      prisma.artist.count(),
      prisma.album.count(),
      prisma.user.count(),
      prisma.userSongPreference.count(),
      prisma.favorite.count(),
      prisma.setlist.count(),
      prisma.setlistSong.count(),
      prisma.customChord.count(),
      prisma.chordDefinition.count(),
      prisma.scoreSheet.count(),
    ]);

    res.json({
      database: {
        type: 'SQLite',
        path: dbPath,
        sizeBytes: dbSize,
        sizeFormatted: `${(dbSize / (1024 * 1024)).toFixed(2)} MB`,
        lastModified,
      },
      counts: {
        songs: songCount,
        artists: artistCount,
        albums: albumCount,
        users: userCount,
        userpreferences: userSongPrefCount,
        favorites: favoriteCount,
        setlists: setlistCount,
        setlistsongs: setlistSongCount,
        customchords: customChordCount,
        chorddefinitions: chordDefCount,
        scoresheets: scoreSheetCount,
      },
      server: {
        uptime: process.uptime(),
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage(),
      },
    });
  } catch (error) {
    console.error('[Dev API] Error en /stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// 1b. Autocompletado y sugerencias de artistas
router.get('/artists/suggest', async (req, res) => {
  const query = (req.query.q || '').trim();
  try {
    const artists = await prisma.artist.findMany({
      where: query
        ? {
            name: {
              contains: query,
            },
          }
        : undefined,
      take: 15,
      orderBy: query
        ? { name: 'asc' }
        : {
            songs: {
              _count: 'desc',
            },
          },
      select: {
        id: true,
        name: true,
        image: true,
        _count: {
          select: { songs: true },
        },
      },
    });

    res.json(artists);
  } catch (error) {
    console.error('[Dev API] Error en /artists/suggest:', error);
    res.status(500).json({ error: error.message });
  }
});

// 1c. Autocompletado y sugerencias de álbumes
router.get('/albums/suggest', async (req, res) => {
  const query = (req.query.q || '').trim();
  try {
    const albums = await prisma.album.findMany({
      where: query
        ? {
            title: {
              contains: query,
            },
          }
        : undefined,
      take: 20,
      orderBy: { title: 'asc' },
      include: {
        artist: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    res.json(albums);
  } catch (error) {
    console.error('[Dev API] Error en /albums/suggest:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Obtener registros de una tabla con búsqueda y paginación
router.get('/tables/:table', async (req, res) => {
  const { table } = req.params;
  const lookup = getModelDelegate(table);
  if (!lookup) {
    return res.status(404).json({ error: `Modelo no reconocido para la tabla: ${table}` });
  }

  const { delegate, modelName } = lookup;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;
  const search = (req.query.search || '').trim();
  const filter = (req.query.filter || 'all').trim();
  const sortField = req.query.sortField || 'createdAt';
  const sortDir = (req.query.sortDir || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  try {
    let where = {};

    // Filtros de búsqueda específicos por modelo
    if (modelName === 'song') {
      const conditions = [];
      if (search) {
        conditions.push({
          OR: [
            { title: { contains: search } },
            { artist: { contains: search } },
            { album: { contains: search } },
            { youtubeId: { contains: search } },
            { content: { contains: search } },
            { artists: { some: { name: { contains: search } } } },
          ],
        });
      }

      if (filter === 'sync') {
        conditions.push({
          AND: [
            { syncData: { not: null } },
            { syncData: { not: '' } },
            { syncData: { not: '[]' } },
          ],
        });
      } else if (filter === 'lyrics') {
        conditions.push({
          OR: [
            { syncData: null },
            { syncData: '' },
            { syncData: '[]' },
          ],
        });
      } else if (filter === 'youtube') {
        conditions.push({
          AND: [
            { youtubeId: { not: null } },
            { youtubeId: { not: '' } },
          ],
        });
      } else if (filter === 'score') {
        conditions.push({
          scoreSheets: { some: {} },
        });
      }

      if (conditions.length === 1) {
        where = conditions[0];
      } else if (conditions.length > 1) {
        where = { AND: conditions };
      }
    } else if (search) {
      if (modelName === 'artist') {
        where = { name: { contains: search } };
      } else if (modelName === 'album') {
        where = {
          OR: [
            { title: { contains: search } },
            { versionType: { contains: search } },
            { versionDetails: { contains: search } },
            { artist: { name: { contains: search } } },
          ],
        };
      } else if (modelName === 'user') {
        where = {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { role: { contains: search } },
          ],
        };
      } else if (modelName === 'userSongPreference') {
        where = {
          OR: [
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
            { song: { title: { contains: search } } },
            { song: { artist: { contains: search } } },
          ],
        };
      } else if (modelName === 'setlist') {
        where = { name: { contains: search } };
      } else if (modelName === 'chordDefinition') {
        where = {
          OR: [
            { chordName: { contains: search } },
            { key: { contains: search } },
            { suffix: { contains: search } },
            { instrument: { contains: search } },
          ],
        };
      } else if (modelName === 'scoreSheet') {
        where = {
          OR: [
            { title: { contains: search } },
            { artist: { contains: search } },
          ],
        };
      } else if (modelName === 'customChord') {
        where = {
          OR: [
            { chordName: { contains: search } },
            { instrument: { contains: search } },
          ],
        };
      }
    }

    // Configuración de inclusión de relaciones útiles
    let include = undefined;
    if (modelName === 'song') {
      include = {
        artists: true,
        albumRel: { select: { id: true, title: true, cover: true, releaseYear: true, versionType: true } },
        _count: {
          select: { scoreSheets: true, userPreferences: true },
        },
      };
    } else if (modelName === 'album') {
      include = {
        artist: { select: { id: true, name: true, image: true } },
        _count: { select: { songs: true } },
      };
    } else if (modelName === 'artist') {
      include = {
        songs: {
          select: { id: true, title: true, artist: true, youtubeId: true },
        },
        _count: {
          select: { albums: true, songs: true },
        },
      };
    } else if (modelName === 'user') {
      include = {
        _count: {
          select: { preferences: true, setlists: true, favorites: true },
        },
      };
    } else if (modelName === 'userSongPreference') {
      include = {
        user: { select: { id: true, name: true, email: true, role: true } },
        song: { select: { id: true, title: true, artist: true, youtubeId: true } },
      };
    } else if (modelName === 'setlist') {
      include = {
        songs: {
          include: {
            song: {
              select: { id: true, title: true, artist: true, youtubeId: true },
            },
          },
          orderBy: { order: 'asc' },
        },
      };
    } else if (modelName === 'favorite') {
      include = {
        song: {
          select: { id: true, title: true, artist: true, youtubeId: true },
        },
      };
    } else if (modelName === 'setlistSong') {
      include = {
        song: { select: { id: true, title: true, artist: true } },
        setlist: { select: { id: true, name: true } },
      };
    } else if (modelName === 'scoreSheet') {
      include = {
        song: { select: { id: true, title: true, artist: true } },
      };
    }

    // Validar ordenamiento
    let orderBy = {};
    if (['createdAt', 'updatedAt', 'title', 'artist', 'name', 'chordName', 'order', 'releaseYear'].includes(sortField)) {
      orderBy[sortField] = sortDir;
    } else {
      orderBy = { createdAt: 'desc' };
    }

    const [total, items] = await Promise.all([
      delegate.count({ where }),
      delegate.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        ...(include ? { include } : {}),
      }),
    ]);

    res.json({
      table,
      modelName,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items,
    });
  } catch (error) {
    console.error(`[Dev API] Error en GET /tables/${table}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 3. Obtener un registro individual por ID
router.get('/tables/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  const lookup = getModelDelegate(table);
  if (!lookup) {
    return res.status(404).json({ error: `Modelo no reconocido: ${table}` });
  }

  try {
    const item = await lookup.delegate.findUnique({
      where: { id },
      ...(lookup.modelName === 'setlist'
        ? {
            include: {
              songs: {
                include: { song: true },
                orderBy: { order: 'asc' },
              },
            },
          }
        : {}),
      ...(lookup.modelName === 'artist'
        ? {
            include: {
              songs: {
                select: { id: true, title: true, artist: true, youtubeId: true },
              },
              albums: true,
            },
          }
        : {}),
      ...(lookup.modelName === 'album'
        ? {
            include: {
              artist: true,
              songs: { select: { id: true, title: true, artist: true, youtubeId: true } },
            },
          }
        : {}),
      ...(lookup.modelName === 'user'
        ? {
            include: {
              preferences: { include: { song: { select: { id: true, title: true } } } },
              setlists: true,
              favorites: { include: { song: { select: { id: true, title: true } } } },
            },
          }
        : {}),
      ...(lookup.modelName === 'userSongPreference'
        ? {
            include: {
              user: true,
              song: true,
            },
          }
        : {}),
      ...(lookup.modelName === 'song'
        ? {
            include: {
              artists: true,
              albumRel: true,
              favorites: true,
              setlistSongs: { include: { setlist: true } },
              scoreSheets: true,
            },
          }
        : {}),
    });

    if (!item) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }

    res.json(item);
  } catch (error) {
    console.error(`[Dev API] Error en GET /tables/${table}/${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Helper para vincular múltiples artistas al guardar una canción
async function handleSongArtists(data) {
  let names = null;
  if (Array.isArray(data.artistNames)) {
    names = data.artistNames;
  } else if (Array.isArray(data.artists)) {
    names = data.artists.map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean);
  }

  if (names && names.length > 0) {
    const connected = [];
    for (const name of names) {
      const cleanName = name.trim();
      if (!cleanName) continue;
      const artist = await prisma.artist.upsert({
        where: { name: cleanName },
        update: {},
        create: { name: cleanName, image: data.artistImage || null },
      });
      connected.push({ id: artist.id });
    }
    data.artists = { set: connected };
    data.artist = names.join(', ');
  } else if (names && names.length === 0) {
    data.artists = { set: [] };
  }
  delete data.artistNames;
}

// Helper para limpiar campos calculados y relaciones que no son columnas directas
function sanitizeIncomingData(modelName, data) {
  delete data.id;
  delete data.createdAt;
  delete data.updatedAt;
  delete data._count;

  if (modelName === 'artist') {
    delete data.songs;
    delete data.albums;
    delete data.artistNames;
  } else if (modelName === 'album') {
    delete data.artist;
    delete data.songs;
  } else if (modelName === 'user') {
    delete data.preferences;
    delete data.setlists;
    delete data.favorites;
  } else if (modelName === 'userSongPreference') {
    delete data.user;
    delete data.song;
  } else if (modelName === 'song') {
    delete data.favorites;
    delete data.setlistSongs;
    delete data.albumRel;
    delete data.scoreSheets;
    delete data.userPreferences;
  } else if (modelName === 'setlist') {
    delete data.songs;
    delete data.setlistSongs;
    delete data.user;
  } else if (modelName === 'favorite') {
    delete data.song;
    delete data.user;
  } else if (modelName === 'setlistSong') {
    delete data.song;
    delete data.setlist;
  } else if (modelName === 'scoreSheet') {
    delete data.song;
  }

  // Sanitizar tipos numéricos y claves foráneas
  if ('releaseYear' in data) {
    data.releaseYear = data.releaseYear !== '' && data.releaseYear !== null && !isNaN(Number(data.releaseYear))
      ? parseInt(data.releaseYear, 10)
      : null;
  }
  if ('transpose' in data) {
    data.transpose = data.transpose !== '' && data.transpose !== null && !isNaN(Number(data.transpose))
      ? parseInt(data.transpose, 10)
      : 0;
  }
  if ('albumId' in data && !data.albumId) data.albumId = null;
  if ('userId' in data && !data.userId) data.userId = null;
  if ('songId' in data && !data.songId) data.songId = null;
  if ('isCustom' in data) data.isCustom = Boolean(data.isCustom);
  if ('isFavorite' in data) data.isFavorite = Boolean(data.isFavorite);

  // Limpiar cualquier propiedad que sea un array de objetos para evitar error de Prisma
  for (const key of Object.keys(data)) {
    if (key !== 'artists' && Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'object') {
      delete data[key];
    }
  }
}

// 4. Crear un nuevo registro
router.post('/tables/:table', async (req, res) => {
  const { table } = req.params;
  const lookup = getModelDelegate(table);
  if (!lookup) {
    return res.status(404).json({ error: `Modelo no reconocido: ${table}` });
  }

  try {
    const data = { ...req.body };

    if (lookup.modelName === 'song') {
      await handleSongArtists(data);
    }
    sanitizeIncomingData(lookup.modelName, data);

    // Normalizar campos JSON si vienen como objetos
    if (data.syncData && typeof data.syncData === 'object') {
      data.syncData = JSON.stringify(data.syncData);
    }
    if (data.chordVariants && typeof data.chordVariants === 'object') {
      data.chordVariants = JSON.stringify(data.chordVariants);
    }
    if (data.positions && typeof data.positions === 'object') {
      data.positions = JSON.stringify(data.positions);
    }
    if (data.tracks && typeof data.tracks === 'object') {
      data.tracks = JSON.stringify(data.tracks);
    }
    if (data.songData && typeof data.songData === 'object') {
      data.songData = JSON.stringify(data.songData);
    }

    const created = await lookup.delegate.create({
      data,
      ...(lookup.modelName === 'song' ? { include: { artists: true, albumRel: true } } : {}),
      ...(lookup.modelName === 'artist' ? { include: { songs: { select: { id: true, title: true } } } } : {}),
      ...(lookup.modelName === 'album' ? { include: { artist: true } } : {}),
      ...(lookup.modelName === 'userSongPreference' ? { include: { user: true, song: true } } : {}),
    });
    res.status(201).json(created);
  } catch (error) {
    console.error(`[Dev API] Error en POST /tables/${table}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 5. Actualizar un registro existente
router.put('/tables/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  const lookup = getModelDelegate(table);
  if (!lookup) {
    return res.status(404).json({ error: `Modelo no reconocido: ${table}` });
  }

  try {
    const data = { ...req.body };

    if (lookup.modelName === 'song') {
      await handleSongArtists(data);
    }
    sanitizeIncomingData(lookup.modelName, data);

    // Normalizar campos JSON
    if (data.syncData && typeof data.syncData === 'object') {
      data.syncData = JSON.stringify(data.syncData);
    }
    if (data.chordVariants && typeof data.chordVariants === 'object') {
      data.chordVariants = JSON.stringify(data.chordVariants);
    }
    if (data.positions && typeof data.positions === 'object') {
      data.positions = JSON.stringify(data.positions);
    }
    if (data.tracks && typeof data.tracks === 'object') {
      data.tracks = JSON.stringify(data.tracks);
    }
    if (data.songData && typeof data.songData === 'object') {
      data.songData = JSON.stringify(data.songData);
    }

    const updated = await lookup.delegate.update({
      where: { id },
      data,
      ...(lookup.modelName === 'song' ? { include: { artists: true, albumRel: true } } : {}),
      ...(lookup.modelName === 'artist' ? { include: { songs: { select: { id: true, title: true, artist: true, youtubeId: true } } } } : {}),
      ...(lookup.modelName === 'album' ? { include: { artist: true } } : {}),
      ...(lookup.modelName === 'userSongPreference' ? { include: { user: true, song: true } } : {}),
    });

    res.json(updated);
  } catch (error) {
    console.error(`[Dev API] Error en PUT /tables/${table}/${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 6. Eliminar un registro
router.delete('/tables/:table/:id', async (req, res) => {
  const { table, id } = req.params;
  const lookup = getModelDelegate(table);
  if (!lookup) {
    return res.status(404).json({ error: `Modelo no reconocido: ${table}` });
  }

  try {
    await lookup.delegate.delete({
      where: { id },
    });
    res.json({ success: true, message: `Registro ${id} eliminado de ${table}` });
  } catch (error) {
    console.error(`[Dev API] Error en DELETE /tables/${table}/${id}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// 7. Consola de consultas SQL directa
router.post('/query', async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'La propiedad "query" es requerida' });
  }

  const trimmed = query.trim();
  const startTime = Date.now();

  try {
    const isSelectOrPragma = /^(SELECT|PRAGMA|EXPLAIN)/i.test(trimmed);

    if (isSelectOrPragma) {
      const rows = await prisma.$queryRawUnsafe(trimmed);
      const executionTimeMs = Date.now() - startTime;
      res.json({
        type: 'query',
        rowCount: Array.isArray(rows) ? rows.length : 1,
        executionTimeMs,
        rows,
      });
    } else {
      const rowCount = await prisma.$executeRawUnsafe(trimmed);
      const executionTimeMs = Date.now() - startTime;
      res.json({
        type: 'execute',
        rowCount,
        executionTimeMs,
        message: `Comando ejecutado con éxito. Filas afectadas: ${rowCount}`,
      });
    }
  } catch (error) {
    console.error('[Dev API] Error al ejecutar consulta SQL:', error);
    res.status(500).json({
      error: error.message,
      executionTimeMs: Date.now() - startTime,
    });
  }
});

// 8. Crear copia de respaldo de la base de datos
router.post('/backup', async (req, res) => {
  try {
    const dbPath = path.resolve(__dirname, '../prisma/dev.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Archivo dev.db no encontrado' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `dev.db.backup-${timestamp}`;
    const backupPath = path.resolve(__dirname, `../prisma/${backupName}`);

    fs.copyFileSync(dbPath, backupPath);

    res.json({
      success: true,
      message: 'Copia de respaldo creada con éxito',
      backupName,
      backupPath,
    });
  } catch (error) {
    console.error('[Dev API] Error en /backup:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
