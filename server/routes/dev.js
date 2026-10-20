// server/routes/dev.js
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../services/db.js';
import { getChordifyBeatGrid } from '../services/chordify-scraper.js';
import { parseChordifyMeasuresAndLyrics } from '../services/chordify/measureParser.js';

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
  chordifycache: 'chordifyCache',
  chordifycaches: 'chordifyCache',
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
      chordifyCacheCount,
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
      prisma.chordifyCache.count(),
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
        chordifycache: chordifyCacheCount,
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
            { genre: { contains: search } },
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
      } else if (filter === 'pending') {
        conditions.push({ verified: false });
      } else if (filter === 'verified') {
        conditions.push({ verified: true });
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
      } else if (modelName === 'chordifyCache') {
        where = {
          OR: [
            { youtubeId: { contains: search } },
            { title: { contains: search } },
            { artist: { contains: search } },
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
    const whereClause = lookup.modelName === 'chordifyCache' ? { youtubeId: id } : { id };
    const item = await lookup.delegate.findUnique({
      where: whereClause,
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
async function handleSongArtists(data, isCreate = false) {
  let rawNames = null;
  if (Array.isArray(data.artistNames)) {
    rawNames = data.artistNames;
  } else if (Array.isArray(data.artists)) {
    rawNames = data.artists.map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean);
  } else if (typeof data.artist === 'string' && data.artist.trim()) {
    rawNames = data.artist.split(',').map((s) => s.trim()).filter(Boolean);
  }

  if (rawNames && rawNames.length > 0) {
    // Aplanar cualquier elemento que contenga comas y desduplicar
    const flatNames = rawNames.flatMap((n) => (typeof n === 'string' ? n.split(',').map((s) => s.trim()) : [])).filter(Boolean);
    const uniqueNames = [...new Set(flatNames)];

    const connected = [];
    for (const cleanName of uniqueNames) {
      const artist = await prisma.artist.upsert({
        where: { name: cleanName },
        update: {},
        create: { name: cleanName, image: data.artistImage || null },
      });
      connected.push({ id: artist.id });
    }
    data.artists = isCreate ? { connect: connected } : { set: connected };
    data.artist = uniqueNames.join(', ');
  } else if (rawNames && rawNames.length === 0) {
    if (isCreate) {
      delete data.artists;
    } else {
      data.artists = { set: [] };
    }
  }
  delete data.artistNames;
}

// Helper para vincular o sincronizar el Álbum canónico al guardar una canción
async function handleSongAlbum(data) {
  // Asegurar que releaseYear sea numérico o null
  if ('releaseYear' in data) {
    data.releaseYear = data.releaseYear !== '' && data.releaseYear !== null && !isNaN(Number(data.releaseYear))
      ? parseInt(data.releaseYear, 10)
      : null;
  }

  if (typeof data.album === 'string' && data.album.trim()) {
    const albumTitle = data.album.trim();
    let artistId = null;

    if (data.artists?.set && data.artists.set.length > 0) {
      artistId = data.artists.set[0].id;
    } else if (data.artists?.connect && data.artists.connect.length > 0) {
      artistId = data.artists.connect[0].id;
    } else if (data.artist) {
      const primaryArtistName = data.artist.split(',')[0].trim();
      if (primaryArtistName) {
        const art = await prisma.artist.findUnique({ where: { name: primaryArtistName } });
        if (art) artistId = art.id;
      }
    }

    if (artistId) {
      let album = await prisma.album.findFirst({
        where: {
          artistId,
          title: albumTitle,
        },
      });

      if (!album) {
        album = await prisma.album.create({
          data: {
            title: albumTitle,
            cover: data.albumCover || null,
            releaseYear: data.releaseYear || null,
            versionType: data.versionType || 'studio',
            versionDetails: data.versionDetails || null,
            artistId,
          },
        });
      } else {
        const updateData = {};
        if (data.albumCover && data.albumCover !== album.cover) updateData.cover = data.albumCover;
        if (data.releaseYear !== undefined && data.releaseYear !== album.releaseYear) updateData.releaseYear = data.releaseYear;
        if (data.versionType && data.versionType !== album.versionType) updateData.versionType = data.versionType;
        if (data.versionDetails !== undefined && data.versionDetails !== album.versionDetails) updateData.versionDetails = data.versionDetails;
        if (Object.keys(updateData).length > 0) {
          album = await prisma.album.update({
            where: { id: album.id },
            data: updateData,
          });
        }
      }

      data.albumId = album.id;
    }
  } else if (data.album === '' || data.album === null) {
    data.albumId = null;
  }
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
      // Evitar canciones duplicadas si ya existe por id, youtubeId o combinación de título y artista
      let existingSong = null;
      if (data.id) {
        existingSong = await prisma.song.findUnique({ where: { id: data.id } }).catch(() => null);
      }
      if (!existingSong && data.youtubeId) {
        existingSong = await prisma.song.findFirst({ where: { youtubeId: data.youtubeId } });
      }
      if (!existingSong && data.title && data.artist) {
        existingSong = await prisma.song.findFirst({
          where: {
            title: { equals: data.title.trim() },
            artist: { equals: data.artist.trim() }
          }
        });
      }

      const isCreate = !existingSong;
      await handleSongArtists(data, isCreate);
      await handleSongAlbum(data);
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

      if (existingSong) {
        const updated = await prisma.song.update({
          where: { id: existingSong.id },
          data,
          include: { artists: true, albumRel: true }
        });
        return res.status(200).json(updated);
      }
    } else {
      sanitizeIncomingData(lookup.modelName, data);
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
      await handleSongArtists(data, false);
      await handleSongAlbum(data);
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

    const whereClause = lookup.modelName === 'chordifyCache' ? { youtubeId: id } : { id };
    const updated = await lookup.delegate.update({
      where: whereClause,
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
    const whereClause = lookup.modelName === 'chordifyCache' ? { youtubeId: id } : { id };
    await lookup.delegate.delete({
      where: whereClause,
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

// 9. Promover acorde personalizado al catálogo oficial (ChordDefinition)
router.post('/customchords/promote', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Falta el id del acorde' });

  try {
    const custom = await prisma.customChord.findUnique({ where: { id } });
    if (!custom) return res.status(404).json({ error: 'Acorde no encontrado' });

    let incomingPositions = [];
    try {
      const parsed = JSON.parse(custom.data);
      incomingPositions = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      incomingPositions = [];
    }

    if (incomingPositions.length === 0) {
      return res.status(400).json({ error: 'El acorde no tiene posiciones válidas' });
    }

    // Inferir key y suffix a partir de chordName
    const match = custom.chordName.match(/^([A-G][b#]?)(.*)$/);
    const key = match ? match[1] : 'C';
    let suffix = match ? match[2] : '';
    if (!suffix) suffix = 'major';

    // Buscar si ya existe en el catálogo oficial
    const existingOfficial = await prisma.chordDefinition.findFirst({
      where: {
        instrument: custom.instrument,
        chordName: custom.chordName,
      },
    });

    const normalizeFrets = (f) => {
      if (!f) return '';
      if (Array.isArray(f)) return f.map(x => (x === -1 || x === '' || x === 'x' || x === 'X') ? 'x' : String(x).toLowerCase()).join('');
      return String(f).toLowerCase().replace(/\s+/g, '');
    };
    const arePosEqual = (a, b) => {
      if (!a || !b) return false;
      if (normalizeFrets(a.frets) !== normalizeFrets(b.frets)) return false;
      return Number(a.position || a.baseFret || 1) === Number(b.position || b.baseFret || 1);
    };

    let officialResult;
    if (existingOfficial) {
      let currentPositions = [];
      try {
        const parsed = JSON.parse(existingOfficial.positions);
        currentPositions = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        currentPositions = [];
      }

      // Fusionar posiciones sin duplicar
      for (const pos of incomingPositions) {
        if (!currentPositions.some(p => arePosEqual(p, pos))) {
          currentPositions.push(pos);
        }
      }

      officialResult = await prisma.chordDefinition.update({
        where: { id: existingOfficial.id },
        data: { positions: JSON.stringify(currentPositions) },
      });
    } else {
      officialResult = await prisma.chordDefinition.create({
        data: {
          instrument: custom.instrument,
          key,
          suffix,
          chordName: custom.chordName,
          positions: JSON.stringify(incomingPositions),
        },
      });
    }

    // Eliminar de CustomChord tras la promoción oficial (acordado con el usuario)
    await prisma.customChord.delete({ where: { id: custom.id } });

    res.json({
      success: true,
      message: `El acorde ${custom.chordName} fue promovido al catálogo oficial con éxito.`,
      officialChord: officialResult,
    });
  } catch (error) {
    console.error('[Dev API] Error al promover acorde custom:', error);
    res.status(500).json({ error: error.message });
  }
});

// 10. Alternar estado de verificación de acorde personalizado
router.patch('/customchords/:id/toggle-verify', async (req, res) => {
  const { id } = req.params;
  try {
    const custom = await prisma.customChord.findUnique({ where: { id } });
    if (!custom) return res.status(404).json({ error: 'Acorde no encontrado' });

    const updated = await prisma.customChord.update({
      where: { id },
      data: { verified: !custom.verified },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper interno para formatear compases a texto de respaldo si no hay leadSheetText
function formatCompasesToFallbackText(compases = []) {
  let textOutput = '';
  let lastSection = '';
  for (let i = 0; i < compases.length; i++) {
    const compas1 = compases[i];
    if (compas1.seccion && compas1.seccion !== lastSection) {
      const timeStr = compas1.secTime !== undefined && compas1.secTime !== null ? ` @ ${Number(compas1.secTime).toFixed(1)}` : '';
      textOutput += `\n[${compas1.seccion}${timeStr}]\n`;
      lastSection = compas1.seccion;
    }
    const isAllRest1 = (compas1.acordes || []).every((ch) => !ch || ch === '𝄾' || ch === '𝄽');
    if (isAllRest1) {
      textOutput += `[𝄾 (${(compas1.acordes || []).length}T)]\n`;
      continue;
    }
    const formatChords = (c) => {
      if (!c || !c.acordes) return '';
      const distinct = [];
      let lastCh = null;
      c.acordes.forEach((ch) => {
        const clean = (ch || '').trim();
        if (!clean) return;
        if (clean !== lastCh) {
          distinct.push(clean);
          lastCh = clean;
        }
      });
      return distinct.length === 0 ? '[𝄾]' : distinct.map((ch) => `[${ch}]`).join(' ');
    };
    const compas2 = i + 1 < compases.length && compases[i + 1].seccion === compas1.seccion ? compases[i + 1] : null;
    const str1 = formatChords(compas1);
    const str2 = compas2 ? formatChords(compas2) : '';
    textOutput += str2 ? `${str1}   ${str2}\n` : `${str1}\n`;
    if (compas2) i++;
  }
  return textOutput.trim();
}

// 11. Catálogo local de canciones y caché de Chordify para el Laboratorio de Testeo
router.get('/chordify-test/catalog', async (req, res) => {
  try {
    const [songs, cachedItems] = await Promise.all([
      prisma.song.findMany({
        where: {
          youtubeId: { not: null },
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          title: true,
          artist: true,
          youtubeId: true,
          content: true,
          syncData: true,
          isInstrumental: true,
          updatedAt: true,
        },
      }),
      prisma.chordifyCache.findMany({
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const parsedSongs = songs
      .filter((s) => s.youtubeId && s.youtubeId.trim() !== '')
      .map((s) => {
        let compases = [];
        try {
          compases = s.syncData ? JSON.parse(s.syncData) : [];
        } catch (e) {
          compases = [];
        }
        const bpmMatch = (s.content || '').match(/\[BPM\s*@\s*(\d+(?:\.\d+)?)\]/i);
        const beatsMatch = (s.content || '').match(/\[Beats\s*@\s*(\d+)\]/i);
        return {
          sourceType: 'song',
          id: s.id,
          youtubeId: s.youtubeId,
          title: s.title,
          artist: s.artist,
          bpm: bpmMatch ? Number(bpmMatch[1]) : 120,
          barLength: beatsMatch ? Number(beatsMatch[1]) : 4,
          hasLyrics: Boolean(s.content && !s.isInstrumental),
          isInstrumental: Boolean(s.isInstrumental),
          content: s.content,
          compases,
          measuresCount: compases.length,
          updatedAt: s.updatedAt,
        };
      });

    res.json({
      songs: parsedSongs,
      chordifyCache: cachedItems,
    });
  } catch (error) {
    console.error('[Dev API] Error en /chordify-test/catalog:', error);
    res.status(500).json({ error: error.message });
  }
});

// 11b. Inspección rápida por GET de un youtubeId en Chordify
router.get('/chordify-test/inspect/:youtubeId', async (req, res) => {
  try {
    const { youtubeId } = req.params;
    const updateDb = req.query.updateDb === '1' || req.query.updateDb === 'true';
    const fromStepFile = req.query.fromStepFile;
    let scraped;

    if (fromStepFile && fs.existsSync(fromStepFile)) {
      const rawFile = fs.readFileSync(fromStepFile, 'utf-8');
      const jsonStart = rawFile.indexOf('{');
      scraped = JSON.parse(jsonStart >= 0 ? rawFile.slice(jsonStart) : rawFile);
    } else {
      scraped = await getChordifyBeatGrid(youtubeId, null, null, {
        captureScreenshots: false,
        includeRawData: true,
        skipCacheSave: !updateDb,
      });
    }

    // Asegurar que siempre se aplique el parser actualizado de measureParser.js (con compases de silencio inicial 𝄾)
    const allBeats = scraped?.rawDiagnostics?.allBeats || scraped?.rawDiagnostics?.beats;
    if (Array.isArray(allBeats) && allBeats.length > 0) {
      const { pathToFileURL } = await import('url');
      const parserUrl = `${pathToFileURL(path.resolve(__dirname, '../services/chordify/measureParser.js')).href}?t=${Date.now()}`;
      const { parseChordifyMeasuresAndLyrics: freshParse } = await import(parserUrl);

      const chordsStr = allBeats
        .map((b) => `${b.beatNum};${b.rawChord};${b.startTime};${b.endTime}`)
        .join('\n');
      const rawLeadSheetValue =
        scraped.rawDiagnostics.rawHydrationLeadSheet ||
        (scraped.rawDiagnostics.rawSectionsStructured || []).map((sec) => ({
          title: sec.title,
          content: (sec.lines || []).map((l) =>
            l.type === 'lyricLine'
              ? {
                  start: Math.round((l.startTime || 0) * 1000),
                  end: Math.round((l.endTime || 0) * 1000),
                  line: { lyricLine: { lyrics: l.rawLyrics, chords: l.rawChords } },
                }
              : {
                  start: Math.round((l.startTime || 0) * 1000),
                  end: Math.round((l.endTime || 0) * 1000),
                  line: { chordsLine: { chords: l.rawChords } },
                }
          ),
        }));

      const reparsed = freshParse(
        {
          title: scraped.title,
          artist: scraped.artist,
          lyricsType: scraped.lyricsType,
          chords: {
            value: {
              barLength: scraped.barLength,
              chords: chordsStr,
              chordInfo: scraped.rawDiagnostics.chordInfo,
            },
          },
          leadSheet: { data: { value: rawLeadSheetValue } },
        },
        { fallbackTitle: scraped.title, fallbackArtist: scraped.artist }
      );

      scraped.compases = reparsed.compases;
      scraped.leadSheetText = reparsed.leadSheetText;
      scraped.rawDiagnostics = {
        ...scraped.rawDiagnostics,
        ...reparsed.diagnostics,
      };
    }

    let updatedSongsCount = 0;
    if (updateDb && scraped.leadSheetText) {
      const bpmTag = `[BPM @ ${scraped.bpm || 120}]\n[Beats @ ${scraped.barLength || 4}]\n\n`;
      const fullContent = bpmTag + scraped.leadSheetText;
      await prisma.chordifyCache.upsert({
        where: { youtubeId },
        update: {
          hasLyrics: true,
          lyricsType: scraped.lyricsType || 'synced',
          title: scraped.title || youtubeId,
          artist: scraped.artist || null,
          bpm: Number(scraped.bpm) || 120,
          leadSheetText: scraped.leadSheetText,
        },
        create: {
          youtubeId,
          hasLyrics: true,
          lyricsType: scraped.lyricsType || 'synced',
          title: scraped.title || youtubeId,
          artist: scraped.artist || null,
          bpm: Number(scraped.bpm) || 120,
          leadSheetText: scraped.leadSheetText,
        },
      });
      const matchingSongs = await prisma.song.findMany({ where: { youtubeId }, select: { id: true } });
      const updateRes = await prisma.song.updateMany({
        where: { youtubeId },
        data: {
          content: fullContent,
          originalContent: fullContent,
          isCustom: false,
          syncData: JSON.stringify(scraped.compases || []),
        },
      });
      updatedSongsCount = updateRes.count;
      if (matchingSongs.length > 0) {
        await prisma.userSongPreference.updateMany({
          where: { songId: { in: matchingSongs.map((s) => s.id) } },
          data: {
            customContent: null,
            isCustom: false,
          },
        });
      }
    }

    if (req.query.summaryOnly === '1') {
      return res.json({
        youtubeId,
        title: scraped.title,
        bpm: scraped.bpm,
        updatedSongsCount,
        droppedPreRollCount: scraped.rawDiagnostics?.droppedPreRollCount,
        totalMeasures: scraped.compases?.length,
        firstSixMeasures: (scraped.compases || []).slice(0, 6),
        leadSheetStart: (scraped.leadSheetText || '').slice(0, 300),
      });
    }

    res.json(scraped);
  } catch (error) {
    res.status(200).json({ error: error.message, stack: error.stack });
  }
});

// 12. Ejecutar test de scraping / auditoría de Chordify (Modo Sandbox / Dry-Run)
router.post('/chordify-test/scrape', async (req, res) => {
  const {
    youtubeId: rawInput,
    title: fallbackTitle,
    artist: fallbackArtist,
    captureScreenshots = true,
    forceScrape = true,
  } = req.body;

  if (!rawInput || !String(rawInput).trim()) {
    return res.status(400).json({ error: 'Debes proporcionar un YouTube ID o URL válida.' });
  }

  // Extraer el YouTube ID limpio desde cualquier URL de YouTube o de Chordify
  const inputStr = String(rawInput).trim();
  let youtubeId = inputStr;
  const chordifyMatch = inputStr.match(/youtube:([a-zA-Z0-9_-]{11})/);
  const ytWatchMatch = inputStr.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  const ytShortMatch = inputStr.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (chordifyMatch) {
    youtubeId = chordifyMatch[1];
  } else if (ytWatchMatch) {
    youtubeId = ytWatchMatch[1];
  } else if (ytShortMatch) {
    youtubeId = ytShortMatch[1];
  } else {
    const cleanId = inputStr.match(/^([a-zA-Z0-9_-]{11})$/);
    if (cleanId) youtubeId = cleanId[1];
  }

  try {
    const existingSong = await prisma.song.findFirst({
      where: { youtubeId },
    });

    // Si no se fuerza el scrape y ya existe en Song + ChordifyCache, devolver instantáneamente
    if (!forceScrape && existingSong && existingSong.syncData) {
      const compases = JSON.parse(existingSong.syncData);
      const bpmMatch = (existingSong.content || '').match(/\[BPM\s*@\s*(\d+(?:\.\d+)?)\]/i);
      const beatsMatch = (existingSong.content || '').match(/\[Beats\s*@\s*(\d+)\]/i);
      const bpm = bpmMatch ? Number(bpmMatch[1]) : 120;
      const barLength = beatsMatch ? Number(beatsMatch[1]) : 4;

      return res.json({
        status: 'success',
        fromCache: true,
        youtubeId,
        chordifyUrl: `https://chordify.net/chords/youtube:${youtubeId}`,
        title: existingSong.title,
        artist: existingSong.artist,
        bpm,
        barLength,
        key: 'C',
        hasLyrics: Boolean(existingSong.content && !existingSong.isInstrumental),
        contentText: existingSong.content,
        compases,
        existingSongId: existingSong.id,
      });
    }

    const scraped = await getChordifyBeatGrid(youtubeId, fallbackTitle, fallbackArtist, {
      captureScreenshots: Boolean(captureScreenshots),
      includeRawData: true,
      skipCacheSave: false, // Actualiza ChordifyCache pero NO modifica la tabla Song (Sandbox)
    });

    const bpm = scraped.bpm || 120;
    const barLength = scraped.barLength || 4;
    const bpmHeader = `[BPM @ ${bpm}]\n[Beats @ ${barLength}]\n\n`;
    const bodyText = scraped.leadSheetText || formatCompasesToFallbackText(scraped.compases);
    const contentText = bpmHeader + bodyText;

    res.json({
      status: 'success',
      fromCache: false,
      youtubeId,
      chordifyUrl: scraped.chordifyUrl,
      title: scraped.title || fallbackTitle || 'Canción de Prueba',
      artist: scraped.artist || fallbackArtist || 'Artista',
      bpm,
      barLength,
      rawKey: scraped.rawKey,
      key: scraped.key,
      hasLyrics: scraped.hasLyrics,
      lyricsType: scraped.lyricsType,
      leadSheetText: scraped.leadSheetText || null,
      contentText,
      compases: scraped.compases || [],
      screenshots: scraped.screenshots || null,
      rawDiagnostics: scraped.rawDiagnostics || null,
      existingSongId: existingSong?.id || null,
    });
  } catch (error) {
    console.error('[Dev API] Error en /chordify-test/scrape:', error);
    res.status(500).json({ error: error.message });
  }
});

// 13. Persistir explícitamente el resultado del test de Chordify en el catálogo oficial (Song)
router.post('/chordify-test/save-song', async (req, res) => {
  const { youtubeId, title, artist, contentText, compases, isInstrumental = false } = req.body;
  if (!youtubeId || !title || !contentText) {
    return res.status(400).json({ error: 'Faltan datos requeridos (youtubeId, title, contentText).' });
  }

  try {
    let song = await prisma.song.findFirst({
      where: { youtubeId },
    });

    if (!song && title && artist) {
      song = await prisma.song.findFirst({
        where: {
          title: { equals: title.trim() },
          artist: { equals: artist.trim() },
        },
      });
    }

    const syncDataStr = typeof compases === 'string' ? compases : JSON.stringify(compases || []);

    if (song) {
      song = await prisma.song.update({
        where: { id: song.id },
        data: {
          title: title.trim(),
          artist: (artist || 'Artista').trim(),
          youtubeId,
          content: contentText,
          syncData: syncDataStr,
          isInstrumental: Boolean(isInstrumental),
        },
      });
    } else {
      song = await prisma.song.create({
        data: {
          title: title.trim(),
          artist: (artist || 'Artista').trim(),
          youtubeId,
          content: contentText,
          syncData: syncDataStr,
          isInstrumental: Boolean(isInstrumental),
        },
      });
    }

    res.json({
      success: true,
      message: `Canción "${song.title}" guardada en el catálogo oficial (Song).`,
      song,
    });
  } catch (error) {
    console.error('[Dev API] Error en /chordify-test/save-song:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
