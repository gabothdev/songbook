import express from 'express';
import prisma from '../services/db.js';

const router = express.Router();

// --- CANCIONES ---

// Obtener todas las canciones guardadas
router.get('/songs', async (req, res) => {
    try {
        const songs = await prisma.song.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        res.json(songs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Guardar o actualizar versión personalizada de canción
router.post('/songs', async (req, res) => {
    const { id, title, artist, content, youtubeId, syncData, transpose, chordVariants, originalContent, isCustom } = req.body;
    try {
        const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null ? JSON.stringify(chordVariants) : chordVariants;
        
        let existingSong = null;
        if (id) {
            existingSong = await prisma.song.findUnique({ where: { id } });
        }
        if (!existingSong && title && artist) {
            existingSong = await prisma.song.findFirst({ where: { title, artist } });
        }

        // Si es una versión personalizada y aún no hay originalContent guardado, respaldamos el content previo
        const backupOriginalContent = existingSong?.originalContent || (isCustom ? existingSong?.content : null) || originalContent;

        const song = await prisma.song.upsert({
            where: { id: existingSong?.id || id || 'new_dummy_id' },
            update: {
                ...(title ? { title } : {}),
                ...(artist ? { artist } : {}),
                ...(content !== undefined ? { content } : {}),
                ...(youtubeId !== undefined ? { youtubeId } : {}),
                ...(syncData !== undefined ? { syncData } : {}),
                ...(transpose !== undefined ? { transpose: parseInt(transpose, 10) || 0 } : {}),
                ...(chordVariantsStr !== undefined ? { chordVariants: chordVariantsStr } : {}),
                ...(backupOriginalContent ? { originalContent: backupOriginalContent } : {}),
                ...(isCustom !== undefined ? { isCustom: Boolean(isCustom) } : {})
            },
            create: {
                title,
                artist,
                content,
                youtubeId,
                syncData,
                transpose: parseInt(transpose, 10) || 0,
                chordVariants: chordVariantsStr || null,
                originalContent: backupOriginalContent || null,
                isCustom: Boolean(isCustom)
            }
        });
        res.json(song);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Restaurar versión original de la canción (revertir cambios personalizados)
router.post('/songs/restore-original', async (req, res) => {
    const { id, title, artist } = req.body;
    try {
        let song = null;
        if (id) {
            song = await prisma.song.findUnique({ where: { id } });
        }
        if (!song && title && artist) {
            song = await prisma.song.findFirst({ where: { title, artist } });
        }

        if (!song) {
            return res.status(404).json({ error: 'Canción no encontrada' });
        }

        if (!song.originalContent) {
            return res.json({ message: 'La canción ya se encuentra en su versión original', song });
        }

        const restored = await prisma.song.update({
            where: { id: song.id },
            data: {
                content: song.originalContent,
                isCustom: false
            }
        });

        res.json({ message: 'Canción restaurada exitosamente a la versión original', song: restored });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Actualizar preferencias de una canción (transposición y variaciones de acordes)
router.patch('/songs/preferences', async (req, res) => {
    const { id, title, artist, transpose, chordVariants } = req.body;
    try {
        const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null ? JSON.stringify(chordVariants) : chordVariants;
        let song = null;

        if (id) {
            song = await prisma.song.findUnique({ where: { id } });
        }
        if (!song && title && artist) {
            song = await prisma.song.findFirst({ where: { title, artist } });
        }

        if (song) {
            const updated = await prisma.song.update({
                where: { id: song.id },
                data: {
                    ...(transpose !== undefined ? { transpose: parseInt(transpose, 10) || 0 } : {}),
                    ...(chordVariantsStr !== undefined ? { chordVariants: chordVariantsStr } : {})
                }
            });
            return res.json(updated);
        }

        res.json({ message: 'Song preferences noted for local store' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- FAVORITOS ---

router.get('/favorites', async (req, res) => {
    try {
        const favorites = await prisma.favorite.findMany({
            include: { song: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(favorites.map(f => ({
            ...f.song,
            id: f.song.id // Asegurar que el ID pase
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/favorites', async (req, res) => {
    const { title, artist, content, youtubeId, syncData, transpose, chordVariants } = req.body;
    try {
        const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null ? JSON.stringify(chordVariants) : chordVariants;

        // 1. Asegurar que la canción existe
        let song = await prisma.song.findFirst({
            where: { title, artist }
        });

        if (!song) {
            song = await prisma.song.create({
                data: {
                    title,
                    artist,
                    content,
                    youtubeId,
                    syncData,
                    transpose: parseInt(transpose, 10) || 0,
                    chordVariants: chordVariantsStr || null
                }
            });
        } else {
            song = await prisma.song.update({
                where: { id: song.id },
                data: {
                    content,
                    ...(youtubeId !== undefined ? { youtubeId } : {}),
                    ...(syncData !== undefined ? { syncData } : {}),
                    ...(transpose !== undefined ? { transpose: parseInt(transpose, 10) || 0 } : {}),
                    ...(chordVariantsStr !== undefined ? { chordVariants: chordVariantsStr } : {})
                }
            });
        }

        // 2. Crear favorito (id determinista)
        const favId = `fav_${song.id}`;
        await prisma.favorite.upsert({
            where: { id: favId },
            update: {},
            create: { id: favId, songId: song.id }
        });

        res.json(song);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/favorites/:songId', async (req, res) => {
    const songId = req.params.songId;
    try {
        await prisma.favorite.deleteMany({
            where: {
                OR: [
                    { id: songId },
                    { id: `fav_${songId}` },
                    { songId: songId }
                ]
            }
        });
        res.json({ success: true });
    } catch (error) {
        res.json({ success: true, message: 'Already removed or not found' });
    }
});

// --- SETLISTS ---

router.get('/setlists', async (req, res) => {
    try {
        const setlists = await prisma.setlist.findMany({
            include: {
                songs: {
                    include: { song: true },
                    orderBy: { order: 'asc' }
                }
            }
        });
        res.json(setlists.map(s => ({
            name: s.name,
            songs: s.songs.map(ss => ss.song)
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/setlists', async (req, res) => {
    const { name } = req.body;
    try {
        const setlist = await prisma.setlist.create({
            data: { name }
        });
        res.json(setlist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Agregar canción a una colección (creando la canción y colección si no existen)
router.post('/setlists/songs', async (req, res) => {
    const { setlistName, title, artist, content, youtubeId, syncData, transpose, chordVariants } = req.body;
    try {
        const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null ? JSON.stringify(chordVariants) : chordVariants;

        // 1. Encontrar o crear la canción
        let song = await prisma.song.findFirst({
            where: { title, artist }
        });
        if (!song) {
            song = await prisma.song.create({
                data: {
                    title,
                    artist,
                    content,
                    youtubeId,
                    syncData,
                    transpose: parseInt(transpose, 10) || 0,
                    chordVariants: chordVariantsStr || null
                }
            });
        } else {
            // Actualizar contenido por si acaso cambió
            song = await prisma.song.update({
                where: { id: song.id },
                data: { 
                    content,
                    ...(youtubeId !== undefined ? { youtubeId } : {}),
                    ...(syncData !== undefined ? { syncData } : {}),
                    ...(transpose !== undefined ? { transpose: parseInt(transpose, 10) || 0 } : {}),
                    ...(chordVariantsStr !== undefined ? { chordVariants: chordVariantsStr } : {})
                }
            });
        }
        
        // 2. Encontrar o crear el setlist
        let setlist = await prisma.setlist.findFirst({
            where: { name: setlistName }
        });
        if (!setlist) {
            setlist = await prisma.setlist.create({
                data: { name: setlistName }
            });
        }
        
        // 3. Comprobar si ya está en el setlist
        const existingRelation = await prisma.setlistSong.findFirst({
            where: { setlistId: setlist.id, songId: song.id }
        });
        
        if (!existingRelation) {
            const maxOrder = await prisma.setlistSong.aggregate({
                where: { setlistId: setlist.id },
                _max: { order: true }
            });
            const nextOrder = (maxOrder._max.order || 0) + 1;
            
            await prisma.setlistSong.create({
                data: {
                    setlistId: setlist.id,
                    songId: song.id,
                    order: nextOrder
                }
            });
        }
        
        res.json({ success: true, song });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Quitar una canción de una colección
router.delete('/setlists/:setlistName/songs/:songId', async (req, res) => {
    const { setlistName, songId } = req.params;
    try {
        const setlist = await prisma.setlist.findFirst({
            where: { name: setlistName }
        });
        if (setlist) {
            await prisma.setlistSong.deleteMany({
                where: { setlistId: setlist.id, songId }
            });
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Collection not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eliminar una colección completa
router.delete('/setlists/:name', async (req, res) => {
    const { name } = req.params;
    try {
        await prisma.setlist.deleteMany({
            where: { name }
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ACORDES PERSONALIZADOS ---

router.get('/chords', async (req, res) => {
    const { instrument } = req.query;
    try {
        const chords = await prisma.customChord.findMany({
            where: instrument ? { instrument } : {}
        });
        res.json(chords.map(c => ({
            ...c,
            data: JSON.parse(c.data)
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/chords', async (req, res) => {
    const { instrument, chordName, data } = req.body;
    console.log(`[Persistence] Recibida petición para guardar acorde: ${chordName} (${instrument})`);
    try {
        // Upsert para acordes personalizados
        const existing = await prisma.customChord.findFirst({
            where: { instrument, chordName }
        });

        if (existing) {
            const updated = await prisma.customChord.update({
                where: { id: existing.id },
                data: { data: JSON.stringify(data) }
            });
            return res.json(updated);
        }

        const chord = await prisma.customChord.create({
            data: {
                instrument,
                chordName,
                data: JSON.stringify(data)
            }
        });
        res.json(chord);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- DICCIONARIO DE ACORDES (Prisma SQLite) ---

function getEnharmonicEquivalents(name) {
    if (!name) return [];
    const clean = name.trim();
    const variants = [clean];

    // Convert flats to sharps
    const toSharp = clean
        .replace(/^Bb/, 'A#').replace(/^Db/, 'C#').replace(/^Eb/, 'D#').replace(/^Gb/, 'F#').replace(/^Ab/, 'G#')
        .replace(/\/Bb$/, '/A#').replace(/\/Db$/, '/C#').replace(/\/Eb$/, '/D#').replace(/\/Gb$/, '/F#').replace(/\/Ab$/, '/G#');
    if (toSharp !== clean && !variants.includes(toSharp)) variants.push(toSharp);

    // Convert sharps to flats
    const toFlat = clean
        .replace(/^A#/, 'Bb').replace(/^C#/, 'Db').replace(/^D#/, 'Eb').replace(/^F#/, 'Gb').replace(/^G#/, 'Ab')
        .replace(/\/A#$/, '/Bb').replace(/\/C#$/, '/Db').replace(/\/D#$/, '/Eb').replace(/\/F#$/, '/Gb').replace(/\/G#$/, '/Ab');
    if (toFlat !== clean && !variants.includes(toFlat)) variants.push(toFlat);

    return variants;
}

// Buscar acorde por nombre (ej. /api/persistence/chords/lookup?name=Bb&instrument=guitar)
router.get('/chords/lookup', async (req, res) => {
    const { name, instrument = 'guitar' } = req.query;
    if (!name) return res.status(400).json({ error: 'Missing chord name parameter' });

    try {
        const lookupNames = getEnharmonicEquivalents(name);

        // 1. Primero buscar si el usuario tiene una versión personalizada
        const custom = await prisma.customChord.findFirst({
            where: { instrument, chordName: { in: lookupNames } }
        });
        if (custom) {
            const parsedData = JSON.parse(custom.data);
            const positions = Array.isArray(parsedData) ? parsedData : [parsedData];
            return res.json({
                chordName: name, // Conservar el nombre exacto solicitado por el usuario (ej. Bb)
                instrument: custom.instrument,
                isCustom: true,
                positions
            });
        }

        // 2. Buscar en el diccionario oficial de acordes
        const chord = await prisma.chordDefinition.findFirst({
            where: { instrument, chordName: { in: lookupNames } }
        });

        if (!chord) {
            if (instrument === 'bandoneon') {
                return res.json({ chordName: name, instrument: 'bandoneon', positions: [] });
            }
            return res.status(404).json({ error: `Chord ${name} not found` });
        }

        const parsedPositions = JSON.parse(chord.positions);
        const positions = Array.isArray(parsedPositions) ? parsedPositions : [parsedPositions];

        res.json({
            chordName: name, // Conservar la notación bemol o sostenida solicitada
            instrument: chord.instrument,
            key: chord.key,
            suffix: chord.suffix,
            positions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

