import prisma from '../db.js';
import { getResolvedUser } from './userHelper.js';

export interface FindSongCriteria {
  id?: string | null;
  youtubeId?: string | null;
  title?: string | null;
  artist?: string | null;
}

/**
 * Busca una canción existente por ID, YoutubeID, coincidencia exacta o coincidencia flexible (fuzzy).
 */
export async function findExistingSong({ id, youtubeId, title, artist }: FindSongCriteria) {
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
    const clean = (s: string | null | undefined) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetT = clean(title);
    const targetA = clean(artist);
    const fuzzy = all.find(s => clean(s.title) === targetT && clean(s.artist) === targetA);
    if (fuzzy) return fuzzy;
  }
  return null;
}

/**
 * Obtiene todas las canciones enriquecidas con popularidad comunitaria y preferencias del usuario activo.
 */
export async function getEnrichedSongs(userParam?: string, userId?: string) {
  const activeUser = await getResolvedUser(userId || userParam);

  const songs = await prisma.song.findMany({
    include: {
      artists: true,
      albumRel: true,
      scoreSheets: true,
      userPreferences: activeUser ? {
        where: { userId: activeUser.id }
      } : false,
      _count: {
        select: {
          favorites: true,
          setlistSongs: true,
          userPreferences: {
            where: { isSaved: true }
          }
        }
      }
    }
  });

  const enriched = songs.map(s => {
    const userPref = (s as any).userPreferences?.[0];
    const artistImg = s.artistImage || s.artists?.find((a: any) => a.image)?.image || null;
    const albumCov = s.albumRel?.cover || s.albumCover || null;
    const albumName = s.albumRel?.title || s.album || null;
    const relYear = s.albumRel?.releaseYear || s.releaseYear || null;
    const vType = s.versionType || s.albumRel?.versionType || 'studio';
    const vDetails = s.versionDetails || s.albumRel?.versionDetails || null;

    const favoritesCount = s._count?.favorites || 0;
    const setlistsCount = s._count?.setlistSongs || 0;
    const savedCount = s._count?.userPreferences || 0;
    const popularityScore = (favoritesCount * 3) + (setlistsCount * 2) + (savedCount * 1);

    return {
      ...s,
      artistImage: artistImg,
      albumCover: albumCov,
      album: albumName,
      releaseYear: relYear,
      versionType: vType,
      versionDetails: vDetails,
      popularityScore,
      favoritesCount,
      setlistsCount,
      savedCount,
      transpose: userPref ? userPref.transpose : (s.transpose || 0),
      chordVariants: userPref?.chordVariants || s.chordVariants || null,
      isCustom: userPref ? userPref.isCustom : Boolean(s.isCustom),
      isInstrumental: Boolean(s.isInstrumental),
      isFavorite: userPref ? userPref.isFavorite : false,
      content: (userPref?.isCustom && userPref.customContent) ? userPref.customContent : s.content
    };
  });

  // Ordenar por popularidad comunitaria descendente (fallback a updatedAt más reciente)
  enriched.sort((a, b) => {
    if (b.popularityScore !== a.popularityScore) {
      return b.popularityScore - a.popularityScore;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return enriched;
}

/**
 * Guarda o actualiza versión de canción en el catálogo público (Exclusivo Administradores).
 */
export async function upsertSongAsAdmin(data: any, activeUser: any) {
  if (!activeUser || (activeUser.role !== 'ADMIN' && activeUser.email !== 'gabothdev@gmail.com')) {
    const error: any = new Error('Solo los administradores pueden editar canciones en el catálogo');
    error.status = 403;
    throw error;
  }

  const {
    id, title, artist, artists, artistNames, content, youtubeId, syncData,
    transpose, chordVariants, originalContent, isCustom, isInstrumental, artistImage, albumCover,
    album, releaseYear, versionType, versionDetails, genre
  } = data;

  const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null
    ? JSON.stringify(chordVariants)
    : chordVariants;
  const parsedYear = releaseYear !== undefined ? (parseInt(releaseYear, 10) || null) : undefined;

  let connectedArtistIds: { id: string }[] | undefined = undefined;
  let finalArtistString = artist;
  const rawArtistList = artistNames || (Array.isArray(artists) ? artists.map((a: any) => typeof a === 'string' ? a : a?.name) : null) || (artist ? artist.split(/,\s*|\s*\/\s*/).map((s: string) => s.trim()).filter(Boolean) : null);
  if (Array.isArray(rawArtistList) && rawArtistList.length > 0) {
    connectedArtistIds = [];
    for (const name of rawArtistList) {
      const cleanName = (name || '').trim();
      if (!cleanName) continue;
      const art = await prisma.artist.upsert({
        where: { name: cleanName },
        update: {},
        create: { name: cleanName, image: (cleanName === rawArtistList[0] ? artistImage : null) || null }
      });
      connectedArtistIds.push({ id: art.id });
    }
    finalArtistString = rawArtistList.join(', ');
  }

  const existingSong = await findExistingSong({ id, youtubeId, title, artist: finalArtistString || artist });
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
      ...(genre !== undefined ? { genre: genre || null } : {}),
      ...(backupOriginalContent ? { originalContent: backupOriginalContent } : {}),
      ...(isCustom !== undefined ? { isCustom: Boolean(isCustom) } : {}),
      ...(isInstrumental !== undefined ? { isInstrumental: Boolean(isInstrumental) } : {}),
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
      genre: genre || null,
      originalContent: backupOriginalContent || null,
      isCustom: Boolean(isCustom),
      isInstrumental: Boolean(isInstrumental),
      ...(connectedArtistIds ? { artists: { connect: connectedArtistIds } } : {})
    },
    include: { artists: true }
  });

  // 1. REGLA: Cada artista tiene una única foto asignada en Artist. Solo el artista principal propaga a Song.artistImage
  const primaryArtist = rawArtistList && rawArtistList.length > 0
    ? rawArtistList[0]
    : (finalArtistString ? finalArtistString.split(/,\s*|\s*\/\s*/)[0].trim() : null);

  if (artistImage && primaryArtist) {
    await prisma.artist.upsert({
      where: { name: primaryArtist },
      update: { image: artistImage },
      create: { name: primaryArtist, image: artistImage }
    });
    await prisma.song.updateMany({
      where: {
        OR: [
          { artist: { equals: primaryArtist } },
          { artist: { startsWith: `${primaryArtist},` } },
          { artist: { startsWith: `${primaryArtist} /` } },
          { artists: { some: { name: primaryArtist } } }
        ]
      },
      data: { artistImage }
    });
  } else if (!song.artistImage && primaryArtist) {
    const existingArtist = await prisma.artist.findFirst({
      where: {
        OR: [
          { name: { equals: primaryArtist } },
          { name: { equals: primaryArtist.toLowerCase() } }
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

  // 2. REGLA: Cada álbum / versión tiene una única carátula asignada
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

  return song;
}

/**
 * Restaura la versión original de una canción respaldada previamente.
 */
export async function restoreOriginalSong({ id, title, artist }: FindSongCriteria, activeUser: any) {
  if (!activeUser || (activeUser.role !== 'ADMIN' && activeUser.email !== 'gabothdev@gmail.com')) {
    const error: any = new Error('Solo los administradores pueden restaurar canciones en el catálogo');
    error.status = 403;
    throw error;
  }

  let song = null;
  if (id) {
    song = await prisma.song.findUnique({ where: { id } });
  }
  if (!song && title && artist) {
    song = await prisma.song.findFirst({ where: { title, artist } });
  }

  if (!song) {
    const error: any = new Error('Canción no encontrada');
    error.status = 404;
    throw error;
  }

  if (!song.originalContent) {
    return { message: 'La canción ya se encuentra en su versión original', song };
  }

  const restored = await prisma.song.update({
    where: { id: song.id },
    data: {
      content: song.originalContent,
      isCustom: false
    }
  });

  return { message: 'Canción restaurada exitosamente a la versión original', song: restored };
}

/**
 * Actualiza preferencias personales (transposición, digitaciones de acordes) en UserSongPreference
 * y administra metadatos canónicos de álbum/artista si corresponde.
 */
export async function updateSongPreferences(data: any, activeUser: any) {
  const {
    id, title, artist, content, youtubeId, syncData, transpose, chordVariants, artistImage, albumCover,
    album, releaseYear, versionType, versionDetails, isCustom, genre
  } = data;

  const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null
    ? JSON.stringify(chordVariants)
    : chordVariants;
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
        versionDetails: versionDetails || null,
        genre: genre || null
      },
      include: { artists: true, albumRel: true }
    });
  }

  if (song) {
    // 2. Gestionar Álbum Canónico si se proporcionó información de álbum
    if (targetAlbum && targetArtist) {
      const primaryArtistName = targetArtist.split(/,\s*|\s*\/\s*/)[0].trim();
      let art = await prisma.artist.findFirst({
        where: {
          OR: [
            { name: { equals: primaryArtistName } },
            { name: { equals: primaryArtistName.toLowerCase() } }
          ]
        }
      });
      if (!art && primaryArtistName) {
        art = await prisma.artist.create({
          data: { name: primaryArtistName, image: artistImage || null }
        });
      }

      // Conectar todos los artistas individuales a la canción
      const allArtistNames = targetArtist.split(/,\s*|\s*\/\s*/).map((s: string) => s.trim()).filter(Boolean);
      if (allArtistNames.length > 0) {
        const connectedArtists: { id: string }[] = [];
        for (const aName of allArtistNames) {
          const singleArt = await prisma.artist.upsert({
            where: { name: aName },
            update: {},
            create: { name: aName, image: aName === primaryArtistName ? (artistImage || null) : null }
          });
          connectedArtists.push({ id: singleArt.id });
        }
        await prisma.song.update({
          where: { id: song.id },
          data: {
            artists: { set: connectedArtists }
          }
        });
      }

      let alb = await prisma.album.findFirst({
        where: { artistId: art?.id || '', title: targetAlbum.trim() }
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
          ...(genre !== undefined ? { genre: genre || null } : {}),
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
          ...(genre !== undefined ? { genre: genre || null } : {}),
          ...(youtubeId !== undefined ? { youtubeId } : {}),
          ...(syncData !== undefined ? { syncData } : {})
        },
        include: { artists: true, albumRel: true }
      });
    }

    // 3. REGLA: Cada artista tiene una única foto asignada
    if (artistImage && targetArtist) {
      const primaryArtistName = targetArtist.split(/,\s*|\s*\/\s*/)[0].trim();
      if (primaryArtistName) {
        await prisma.artist.upsert({
          where: { name: primaryArtistName },
          update: { image: artistImage },
          create: { name: primaryArtistName, image: artistImage }
        });
        await prisma.song.updateMany({
          where: {
            OR: [
              { artist: { equals: primaryArtistName } },
              { artist: { startsWith: `${primaryArtistName},` } },
              { artist: { startsWith: `${primaryArtistName} /` } },
              { artists: { some: { name: primaryArtistName } } }
            ]
          },
          data: { artistImage }
        });
      }
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

      // Si el usuario activo es ADMINISTRADOR, registrar la selección de variaciones canónicamente en Song
      if (chordVariantsStr !== undefined && (activeUser.role === 'ADMIN' || activeUser.email === 'gabothdev@gmail.com')) {
        await prisma.song.update({
          where: { id: song.id },
          data: { chordVariants: chordVariantsStr }
        });
      }
    }

    return {
      ...song,
      transpose: userPref ? userPref.transpose : (song.transpose || 0),
      chordVariants: userPref?.chordVariants || song.chordVariants || null,
      isCustom: userPref ? userPref.isCustom : Boolean(song.isCustom)
    };
  }

  return { message: 'Song preferences noted for local store' };
}
