import express from 'express';
import prisma from '../services/db.js';

const router = express.Router();

// --- CANCIONES ---

// Helper para resolver el usuario activo (por email o id, o fallback a usuario admin/local)
async function getResolvedUser(identifier) {
    if (identifier) {
        const u = await prisma.user.findFirst({
            where: {
                OR: [
                    { id: identifier },
                    { email: identifier }
                ]
            }
        });
        if (u) return u;
    }
    let defaultUser = await prisma.user.findUnique({ where: { email: 'gabothdev@gmail.com' } });
    if (!defaultUser) {
        defaultUser = await prisma.user.findFirst();
    }
    return defaultUser;
}

// Obtener todas las canciones guardadas con sus álbumes y preferencias personales del usuario
router.get('/songs', async (req, res) => {
    try {
        const { user: userParam, userId } = req.query;
        const activeUser = await getResolvedUser(userId || userParam);

        const songs = await prisma.song.findMany({
            orderBy: { updatedAt: 'desc' },
            include: {
                artists: true,
                albumRel: true,
                scoreSheets: true,
                userPreferences: activeUser ? {
                    where: { userId: activeUser.id }
                } : false
            }
        });

        const enriched = songs.map(s => {
            const userPref = s.userPreferences?.[0];
            const artistImg = s.artistImage || s.artists?.find(a => a.image)?.image || null;
            const albumCov = s.albumRel?.cover || s.albumCover || null;
            const albumName = s.albumRel?.title || s.album || null;
            const relYear = s.albumRel?.releaseYear || s.releaseYear || null;
            const vType = s.versionType || s.albumRel?.versionType || 'studio';
            const vDetails = s.versionDetails || s.albumRel?.versionDetails || null;

            return {
                ...s,
                artistImage: artistImg,
                albumCover: albumCov,
                album: albumName,
                releaseYear: relYear,
                versionType: vType,
                versionDetails: vDetails,
                // El transpose y chordVariants provienen del perfil personal del usuario
                transpose: userPref ? userPref.transpose : (s.transpose || 0),
                chordVariants: userPref?.chordVariants || s.chordVariants || null,
                isCustom: userPref ? userPref.isCustom : Boolean(s.isCustom),
                isFavorite: userPref ? userPref.isFavorite : false,
                content: (userPref?.isCustom && userPref.customContent) ? userPref.customContent : s.content
            };
        });
        res.json(enriched);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper para encontrar canciones existentes por id, youtubeId o coincidencia de título y artista
async function findExistingSong({ id, youtubeId, title, artist }) {
    if (id) {
        const song = await prisma.song.findUnique({ where: { id } });
        if (song) return song;
    }
    if (youtubeId) {
        const song = await prisma.song.findFirst({ where: { youtubeId } });
        if (song) return song;
    }
    if (title && artist) {
        const exact = await prisma.song.findFirst({
            where: {
                title: { equals: title.trim() },
                artist: { equals: artist.trim() }
            }
        });
        if (exact) return exact;

        // Búsqueda flexible insensible a mayúsculas, espacios y caracteres especiales
        const all = await prisma.song.findMany();
        const clean = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const targetT = clean(title);
        const targetA = clean(artist);
        const fuzzy = all.find(s => clean(s.title) === targetT && clean(s.artist) === targetA);
        if (fuzzy) return fuzzy;
    }
    return null;
}

// Guardar o actualizar versión personalizada de canción
router.post('/songs', async (req, res) => {
    const { 
        id, title, artist, artists, artistNames, content, youtubeId, syncData, 
        transpose, chordVariants, originalContent, isCustom, artistImage, albumCover,
        album, releaseYear, versionType, versionDetails 
    } = req.body;
    try {
        const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null ? JSON.stringify(chordVariants) : chordVariants;
        const parsedYear = releaseYear !== undefined ? (parseInt(releaseYear, 10) || null) : undefined;
        
        let connectedArtistIds = undefined;
        let finalArtistString = artist;
        const rawArtistList = artistNames || (Array.isArray(artists) ? artists.map(a => typeof a === 'string' ? a : a?.name) : null);
        if (Array.isArray(rawArtistList) && rawArtistList.length > 0) {
            connectedArtistIds = [];
            for (const name of rawArtistList) {
                const cleanName = name.trim();
                if (!cleanName) continue;
                const art = await prisma.artist.upsert({
                    where: { name: cleanName },
                    update: {},
                    create: { name: cleanName, image: artistImage || null }
                });
                connectedArtistIds.push({ id: art.id });
            }
            finalArtistString = rawArtistList.join(', ');
        }

        const existingSong = await findExistingSong({ id, youtubeId, title, artist: finalArtistString || artist });

        // Si es una versión personalizada y aún no hay originalContent guardado, respaldamos el content previo
        const backupOriginalContent = existingSong?.originalContent || (isCustom ? existingSong?.content : null) || originalContent;

        const song = await prisma.song.upsert({
            where: { id: existingSong?.id || id || 'new_dummy_id' },
            update: {
                ...(title ? { title } : {}),
                ...(finalArtistString ? { artist: finalArtistString } : {}),
                ...(content !== undefined ? { content } : {}),
                ...(youtubeId !== undefined ? { youtubeId } : {}),
                ...(syncData !== undefined ? { syncData } : {}),
                ...(transpose !== undefined ? { transpose: parseInt(transpose, 10) || 0 } : {}),
                ...(chordVariantsStr !== undefined ? { chordVariants: chordVariantsStr } : {}),
                ...(artistImage !== undefined ? { artistImage } : {}),
                ...(albumCover !== undefined ? { albumCover } : {}),
                ...(album !== undefined ? { album } : {}),
                ...(parsedYear !== undefined ? { releaseYear: parsedYear } : {}),
                ...(versionType !== undefined ? { versionType } : {}),
                ...(versionDetails !== undefined ? { versionDetails } : {}),
                ...(backupOriginalContent ? { originalContent: backupOriginalContent } : {}),
                ...(isCustom !== undefined ? { isCustom: Boolean(isCustom) } : {}),
                ...(connectedArtistIds ? { artists: { set: connectedArtistIds } } : {})
            },
            create: {
                title,
                artist: finalArtistString || artist,
                content,
                youtubeId,
                syncData,
                transpose: parseInt(transpose, 10) || 0,
                chordVariants: chordVariantsStr || null,
                artistImage: artistImage || null,
                albumCover: albumCover || null,
                album: album || null,
                releaseYear: parseInt(releaseYear, 10) || null,
                versionType: versionType || 'studio',
                versionDetails: versionDetails || null,
                originalContent: backupOriginalContent || null,
                isCustom: Boolean(isCustom),
                ...(connectedArtistIds ? { artists: { connect: connectedArtistIds } } : {})
            },
            include: { artists: true }
        });
        // 1. REGLA: Cada artista tiene una única foto asignada
        if (artistImage && finalArtistString) {
            await prisma.artist.upsert({
                where: { name: finalArtistString },
                update: { image: artistImage },
                create: { name: finalArtistString, image: artistImage }
            });
            await prisma.song.updateMany({
                where: {
                    OR: [
                        { artist: { equals: finalArtistString } },
                        { artist: { contains: finalArtistString } },
                        { artists: { some: { name: finalArtistString } } }
                    ]
                },
                data: { artistImage }
            });
        } else if (!song.artistImage && finalArtistString) {
            const existingArtist = await prisma.artist.findFirst({
                where: {
                    OR: [
                        { name: { equals: finalArtistString } },
                        { name: { contains: finalArtistString } }
                    ]
                }
            });
            if (existingArtist?.image) {
                await prisma.song.update({
                    where: { id: song.id },
                    data: { artistImage: existingArtist.image }
                });
                song.artistImage = existingArtist.image;
            }
        }

        // 2. REGLA: Cada álbum / versión tiene una única foto/carátula asignada
        const targetAlbum = album || song.album;
        if (albumCover && targetAlbum) {
            await prisma.song.updateMany({
                where: {
                    album: targetAlbum,
                    ...(finalArtistString ? { artist: { contains: finalArtistString } } : {})
                },
                data: {
                    albumCover,
                    ...(versionType ? { versionType } : {}),
                    ...(parsedYear !== undefined ? { releaseYear: parsedYear } : {})
                }
            });
        } else if (!song.albumCover && targetAlbum) {
            const siblingSong = await prisma.song.findFirst({
                where: {
                    album: targetAlbum,
                    albumCover: { not: null },
                    ...(finalArtistString ? { artist: { contains: finalArtistString } } : {})
                }
            });
            if (siblingSong?.albumCover) {
                await prisma.song.update({
                    where: { id: song.id },
                    data: {
                        albumCover: siblingSong.albumCover,
                        ...(siblingSong.versionType && !song.versionType ? { versionType: siblingSong.versionType } : {}),
                        ...(siblingSong.releaseYear && !song.releaseYear ? { releaseYear: siblingSong.releaseYear } : {})
                    }
                });
                song.albumCover = siblingSong.albumCover;
            }
        }

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

// Actualizar preferencias de una canción (transposición en perfil del usuario, imágenes, álbum y versión)
router.patch('/songs/preferences', async (req, res) => {
    const { 
        id, title, artist, content, youtubeId, syncData, transpose, chordVariants, artistImage, albumCover,
        album, releaseYear, versionType, versionDetails, user: userParam, userId, isCustom
    } = req.body;
    try {
        const activeUser = await getResolvedUser(userId || userParam);
        const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null ? JSON.stringify(chordVariants) : chordVariants;
        let song = await findExistingSong({ id, youtubeId, title, artist });
        const targetArtist = (artist || song?.artist || '').trim();
        const targetAlbum = album !== undefined ? album : song?.album;
        const parsedYear = releaseYear !== undefined ? (parseInt(releaseYear, 10) || null) : undefined;

        // 1. Asegurar o crear la canción canónica si no existía
        if (!song && (title || id)) {
            song = await prisma.song.create({
                data: {
                    title: title || 'Sin Título',
                    artist: targetArtist || 'Desconocido',
                    content: content || '',
                    youtubeId: youtubeId || null,
                    syncData: syncData || null,
                    artistImage: artistImage || null,
                    albumCover: albumCover || null,
                    album: targetAlbum || null,
                    releaseYear: parsedYear || null,
                    versionType: versionType || 'studio',
                    versionDetails: versionDetails || null
                },
                include: { artists: true, albumRel: true }
            });
        }

        if (song) {
            // 2. Gestionar Álbum Canónico si se proporcionó información de álbum
            if (targetAlbum && targetArtist) {
                let art = await prisma.artist.findFirst({
                    where: {
                        OR: [
                            { name: { equals: targetArtist } },
                            { name: { equals: targetArtist.toLowerCase() } }
                        ]
                    }
                });
                if (!art) {
                    art = await prisma.artist.create({
                        data: { name: targetArtist, image: artistImage || null }
                    });
                }

                let alb = await prisma.album.findFirst({
                    where: { artistId: art.id, title: targetAlbum.trim() }
                });

                if (!alb) {
                    alb = await prisma.album.create({
                        data: {
                            title: targetAlbum.trim(),
                            cover: albumCover || song.albumCover || null,
                            releaseYear: parsedYear !== undefined ? parsedYear : song.releaseYear,
                            versionType: versionType || song.versionType || 'studio',
                            versionDetails: versionDetails || song.versionDetails || null,
                            artistId: art.id
                        }
                    });
                } else if (albumCover !== undefined || parsedYear !== undefined || versionType !== undefined) {
                    alb = await prisma.album.update({
                        where: { id: alb.id },
                        data: {
                            ...(albumCover !== undefined ? { cover: albumCover } : {}),
                            ...(parsedYear !== undefined ? { releaseYear: parsedYear } : {}),
                            ...(versionType !== undefined ? { versionType } : {}),
                            ...(versionDetails !== undefined ? { versionDetails } : {})
                        }
                    });
                }

                // Vincular álbum a la canción y actualizar metadatos espejados
                song = await prisma.song.update({
                    where: { id: song.id },
                    data: {
                        albumId: alb.id,
                        album: alb.title,
                        albumCover: alb.cover,
                        releaseYear: alb.releaseYear,
                        ...(versionType ? { versionType } : {}),
                        ...(versionDetails !== undefined ? { versionDetails } : {}),
                        ...(youtubeId !== undefined ? { youtubeId } : {}),
                        ...(syncData !== undefined ? { syncData } : {})
                    },
                    include: { artists: true, albumRel: true }
                });
            } else {
                song = await prisma.song.update({
                    where: { id: song.id },
                    data: {
                        ...(artistImage !== undefined ? { artistImage } : {}),
                        ...(albumCover !== undefined ? { albumCover } : {}),
                        ...(album !== undefined ? { album } : {}),
                        ...(parsedYear !== undefined ? { releaseYear: parsedYear } : {}),
                        ...(versionType !== undefined ? { versionType } : {}),
                        ...(versionDetails !== undefined ? { versionDetails } : {}),
                        ...(youtubeId !== undefined ? { youtubeId } : {}),
                        ...(syncData !== undefined ? { syncData } : {})
                    },
                    include: { artists: true, albumRel: true }
                });
            }

            // 3. REGLA: Cada artista tiene una única foto asignada
            if (artistImage && targetArtist) {
                await prisma.artist.upsert({
                    where: { name: targetArtist },
                    update: { image: artistImage },
                    create: { name: targetArtist, image: artistImage }
                });
                await prisma.song.updateMany({
                    where: {
                        OR: [
                            { artist: { equals: targetArtist } },
                            { artist: { contains: targetArtist } },
                            { artists: { some: { name: targetArtist } } }
                        ]
                    },
                    data: { artistImage }
                });
            }

            // 4. PREFERENCIAS DEL USUARIO: el transpose y digitaciones se guardan SOLO en el perfil del usuario
            let userPref = null;
            if (activeUser) {
                const parsedTranspose = transpose !== undefined ? (parseInt(transpose, 10) || 0) : undefined;
                userPref = await prisma.userSongPreference.upsert({
                    where: {
                        userId_songId: {
                            userId: activeUser.id,
                            songId: song.id
                        }
                    },
                    update: {
                        ...(parsedTranspose !== undefined ? { transpose: parsedTranspose } : {}),
                        ...(chordVariantsStr !== undefined ? { chordVariants: chordVariantsStr } : {}),
                        ...(isCustom !== undefined ? { isCustom: Boolean(isCustom) } : {}),
                        ...(content !== undefined && isCustom ? { customContent: content } : {})
                    },
                    create: {
                        userId: activeUser.id,
                        songId: song.id,
                        transpose: parsedTranspose !== undefined ? parsedTranspose : 0,
                        chordVariants: chordVariantsStr || null,
                        isCustom: Boolean(isCustom),
                        customContent: isCustom ? content : null
                    }
                });
            }

            return res.json({
                ...song,
                transpose: userPref ? userPref.transpose : (song.transpose || 0),
                chordVariants: userPref?.chordVariants || song.chordVariants || null,
                isCustom: userPref ? userPref.isCustom : Boolean(song.isCustom)
            });
        }

        res.json({ message: 'Song preferences noted for local store' });
    } catch (error) {
        console.error('Error in /songs/preferences:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- FAVORITOS ---

router.get('/favorites', async (req, res) => {
    try {
        const { user: userParam, userId } = req.query;
        const activeUser = await getResolvedUser(userId || userParam);

        const favorites = await prisma.favorite.findMany({
            where: activeUser ? {
                OR: [
                    { userId: activeUser.id },
                    { userId: null }
                ]
            } : undefined,
            include: {
                song: {
                    include: {
                        artists: true,
                        albumRel: true,
                        userPreferences: activeUser ? {
                            where: { userId: activeUser.id }
                        } : false
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(favorites.map(f => {
            const s = f.song;
            const userPref = s.userPreferences?.[0];
            const artistImg = s.artistImage || s.artists?.find(a => a.image)?.image || null;
            return {
                ...s,
                id: s.id,
                artistImage: artistImg,
                albumCover: s.albumRel?.cover || s.albumCover || null,
                album: s.albumRel?.title || s.album || null,
                releaseYear: s.albumRel?.releaseYear || s.releaseYear || null,
                transpose: userPref ? userPref.transpose : (s.transpose || 0),
                chordVariants: userPref?.chordVariants || s.chordVariants || null,
                isCustom: userPref ? userPref.isCustom : Boolean(s.isCustom),
                content: (userPref?.isCustom && userPref.customContent) ? userPref.customContent : s.content
            };
        }));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/favorites', async (req, res) => {
    const { title, artist, content, youtubeId, syncData, transpose, chordVariants, user: userParam, userId } = req.body;
    try {
        const activeUser = await getResolvedUser(userId || userParam);
        const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null ? JSON.stringify(chordVariants) : chordVariants;

        let song = await findExistingSong({ title, artist, youtubeId });
        if (!song) {
            song = await prisma.song.create({
                data: {
                    title,
                    artist,
                    content,
                    youtubeId,
                    syncData
                }
            });
        }

        if (activeUser) {
            await prisma.userSongPreference.upsert({
                where: {
                    userId_songId: {
                        userId: activeUser.id,
                        songId: song.id
                    }
                },
                update: {
                    isFavorite: true,
                    ...(transpose !== undefined ? { transpose: parseInt(transpose, 10) || 0 } : {}),
                    ...(chordVariantsStr !== undefined ? { chordVariants: chordVariantsStr } : {})
                },
                create: {
                    userId: activeUser.id,
                    songId: song.id,
                    isFavorite: true,
                    transpose: parseInt(transpose, 10) || 0,
                    chordVariants: chordVariantsStr || null
                }
            });

            const favId = `fav_${activeUser.id}_${song.id}`;
            await prisma.favorite.upsert({
                where: { id: favId },
                update: {},
                create: { id: favId, songId: song.id, userId: activeUser.id }
            });
        }

        res.json({
            ...song,
            transpose: parseInt(transpose, 10) || 0,
            chordVariants: chordVariantsStr || null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/favorites/:songId', async (req, res) => {
    const songId = req.params.songId;
    const { user: userParam, userId } = req.query;
    try {
        const activeUser = await getResolvedUser(userId || userParam);
        await prisma.favorite.deleteMany({
            where: {
                OR: [
                    { id: songId },
                    { id: `fav_${songId}` },
                    { songId: songId }
                ],
                ...(activeUser ? {
                    OR: [
                        { userId: activeUser.id },
                        { userId: null }
                    ]
                } : {})
            }
        });
        if (activeUser) {
            await prisma.userSongPreference.updateMany({
                where: { userId: activeUser.id, songId },
                data: { isFavorite: false }
            });
        }
        res.json({ success: true });
    } catch (error) {
        res.json({ success: true, message: 'Already removed or not found' });
    }
});

// --- SETLISTS ---

router.get('/setlists', async (req, res) => {
    try {
        const { user: userParam, userId } = req.query;
        const activeUser = await getResolvedUser(userId || userParam);

        const setlists = await prisma.setlist.findMany({
            where: activeUser ? {
                OR: [
                    { userId: activeUser.id },
                    { userId: null }
                ]
            } : undefined,
            include: {
                songs: {
                    include: {
                        song: {
                            include: { artists: true, albumRel: true }
                        }
                    },
                    orderBy: { order: 'asc' }
                }
            }
        });
        res.json(setlists.map(s => ({
            name: s.name,
            songs: s.songs.map(ss => {
                const song = ss.song;
                return {
                    ...song,
                    transpose: ss.transpose !== null && ss.transpose !== undefined ? ss.transpose : (song.transpose || 0),
                    chordVariants: ss.chordVariants || song.chordVariants || null,
                    artistImage: song.artistImage || song.artists?.find(a => a.image)?.image || null,
                    albumCover: song.albumRel?.cover || song.albumCover || null,
                    album: song.albumRel?.title || song.album || null
                };
            })
        })));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/setlists', async (req, res) => {
    const { name, user: userParam, userId } = req.body;
    try {
        const activeUser = await getResolvedUser(userId || userParam);
        const setlist = await prisma.setlist.create({
            data: {
                name,
                userId: activeUser?.id || null
            }
        });
        res.json(setlist);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Agregar canción a una colección (creando la canción y colección si no existen)
router.post('/setlists/songs', async (req, res) => {
    const { setlistName, title, artist, content, youtubeId, syncData, transpose, chordVariants, user: userParam, userId } = req.body;
    try {
        const activeUser = await getResolvedUser(userId || userParam);
        const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null ? JSON.stringify(chordVariants) : chordVariants;
        const parsedTranspose = parseInt(transpose, 10) || 0;

        // 1. Encontrar o crear la canción reutilizando registro si ya existe
        let song = await findExistingSong({ title, artist, youtubeId });
        if (!song) {
            song = await prisma.song.create({
                data: {
                    title,
                    artist,
                    content,
                    youtubeId,
                    syncData
                }
            });
        }
        
        // 2. Encontrar o crear el setlist
        let setlist = await prisma.setlist.findFirst({
            where: {
                name: setlistName,
                ...(activeUser ? {
                    OR: [
                        { userId: activeUser.id },
                        { userId: null }
                    ]
                } : {})
            }
        });
        if (!setlist) {
            setlist = await prisma.setlist.create({
                data: {
                    name: setlistName,
                    userId: activeUser?.id || null
                }
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
                    order: nextOrder,
                    transpose: parsedTranspose,
                    chordVariants: chordVariantsStr || null
                }
            });
        } else {
            await prisma.setlistSong.update({
                where: { id: existingRelation.id },
                data: {
                    transpose: parsedTranspose,
                    chordVariants: chordVariantsStr || null
                }
            });
        }
        
        res.json({
            success: true,
            song: {
                ...song,
                transpose: parsedTranspose,
                chordVariants: chordVariantsStr || null
            }
        });
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

// --- ARTISTAS ---

// Actualizar foto o datos de un artista por ID o por nombre
router.patch('/artists/:id', async (req, res) => {
    const { id } = req.params;
    const { image, name, bio } = req.body;
    try {
        const updated = await prisma.artist.update({
            where: { id },
            data: {
                ...(image !== undefined ? { image } : {}),
                ...(name !== undefined ? { name } : {}),
                ...(bio !== undefined ? { bio } : {})
            }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/artists/update-image', async (req, res) => {
    const { id, name, image } = req.body;
    try {
        const trimmedName = (name || '').trim();
        if (!trimmedName && !id) {
            return res.status(400).json({ error: 'id or name is required' });
        }

        let artist = null;
        if (id) {
            artist = await prisma.artist.findUnique({ where: { id } }).catch(() => null);
        }
        if (!artist && trimmedName) {
            artist = await prisma.artist.findFirst({
                where: {
                    OR: [
                        { name: { equals: trimmedName } },
                        { name: { equals: trimmedName.toLowerCase() } }
                    ]
                }
            });
        }

        if (artist) {
            artist = await prisma.artist.update({
                where: { id: artist.id },
                data: { image: image || null }
            });
        } else if (trimmedName) {
            artist = await prisma.artist.create({
                data: { name: trimmedName, image: image || null }
            });
        }

        const finalName = artist ? artist.name : trimmedName;

        // REGLA: Cada artista debe tener asignada una única foto en toda la base de datos
        if (image && finalName) {
            await prisma.song.updateMany({
                where: {
                    OR: [
                        { artist: { equals: finalName } },
                        { artist: { contains: finalName } },
                        { artists: { some: { name: finalName } } }
                    ]
                },
                data: { artistImage: image }
            });
        }

        res.json({ success: true, artist });
    } catch (error) {
        console.error('Error in /artists/update-image:', error);
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

