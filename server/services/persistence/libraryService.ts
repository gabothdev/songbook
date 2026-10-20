import prisma from '../db.js';
import { findExistingSong } from './songService.js';

/**
 * Obtiene la biblioteca personal del usuario (canciones guardadas, favoritas o presentes en sus setlists).
 */
export async function getUserLibrary(activeUser: any) {
  if (!activeUser) {
    return [];
  }

  // 1. Obtener canciones de setlists de este usuario
  const userSetlists = await prisma.setlist.findMany({
    where: { userId: activeUser.id },
    select: { songs: { select: { songId: true } } }
  });
  const setlistSongIds = new Set<string>();
  userSetlists.forEach(sl => sl.songs.forEach(s => setlistSongIds.add(s.songId)));

  // 2. Obtener preferencias donde la canción está guardada, es favorita o está en un setlist
  const userPrefs = await prisma.userSongPreference.findMany({
    where: {
      userId: activeUser.id,
      OR: [
        { isSaved: true },
        { isFavorite: true },
        { songId: { in: Array.from(setlistSongIds) } }
      ]
    },
    include: {
      song: {
        include: {
          artists: true,
          albumRel: true,
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  const songsMap = new Map<string, any>();

  userPrefs.forEach(pref => {
    const s = pref.song;
    if (!s) return;
    const artistImg = s.artistImage || s.artists?.find((a: any) => a.image)?.image || null;
    songsMap.set(s.id, {
      ...s,
      id: s.id,
      artistImage: artistImg,
      albumCover: s.albumRel?.cover || s.albumCover || null,
      album: s.albumRel?.title || s.album || null,
      releaseYear: s.albumRel?.releaseYear || s.releaseYear || null,
      transpose: pref.transpose ?? (s.transpose || 0),
      chordVariants: pref.chordVariants || s.chordVariants || null,
      isCustom: Boolean(pref.isCustom),
      isFavorite: Boolean(pref.isFavorite),
      isSaved: Boolean(pref.isSaved || pref.isFavorite || setlistSongIds.has(s.id)),
      content: (pref.isCustom && pref.customContent) ? pref.customContent : s.content
    });
  });

  // 3. Incluir canciones que puedan estar en setlists sin registro previo en UserSongPreference
  if (setlistSongIds.size > 0) {
    const missingIds = Array.from(setlistSongIds).filter(id => !songsMap.has(id));
    if (missingIds.length > 0) {
      const missingSongs = await prisma.song.findMany({
        where: { id: { in: missingIds } },
        include: { artists: true, albumRel: true }
      });
      missingSongs.forEach(s => {
        const artistImg = s.artistImage || s.artists?.find((a: any) => a.image)?.image || null;
        songsMap.set(s.id, {
          ...s,
          id: s.id,
          artistImage: artistImg,
          albumCover: s.albumRel?.cover || s.albumCover || null,
          album: s.albumRel?.title || s.album || null,
          releaseYear: s.albumRel?.releaseYear || s.releaseYear || null,
          transpose: s.transpose || 0,
          chordVariants: s.chordVariants || null,
          isCustom: Boolean(s.isCustom),
          isFavorite: false,
          isSaved: true,
          content: s.content
        });
      });
    }
  }

  return Array.from(songsMap.values());
}

/**
 * Guarda una canción en la biblioteca personal del usuario.
 */
export async function saveToLibrary(data: any, activeUser: any) {
  if (!activeUser) {
    const error: any = new Error('Debes iniciar sesión para guardar canciones en tu cuaderno.');
    error.status = 401;
    throw error;
  }

  const { songId, title, artist, content, youtubeId, syncData, transpose, chordVariants } = data;

  let song = await findExistingSong({ id: songId, title, artist, youtubeId });
  if (!song) {
    song = await prisma.song.create({
      data: {
        title: title || 'Sin Título',
        artist: artist || 'Desconocido',
        content: content || '',
        youtubeId: youtubeId || null,
        syncData: syncData || null
      }
    });
  }

  const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null
    ? JSON.stringify(chordVariants)
    : chordVariants;
  const parsedTranspose = transpose !== undefined ? (parseInt(transpose, 10) || 0) : undefined;

  const userPref = await prisma.userSongPreference.upsert({
    where: {
      userId_songId: {
        userId: activeUser.id,
        songId: song.id
      }
    },
    update: {
      isSaved: true,
      ...(parsedTranspose !== undefined ? { transpose: parsedTranspose } : {}),
      ...(chordVariantsStr !== undefined ? { chordVariants: chordVariantsStr } : {})
    },
    create: {
      userId: activeUser.id,
      songId: song.id,
      isSaved: true,
      transpose: parsedTranspose !== undefined ? parsedTranspose : 0,
      chordVariants: chordVariantsStr || null
    }
  });

  return {
    success: true,
    isSaved: true,
    songId: song.id,
    isFavorite: Boolean(userPref.isFavorite)
  };
}

/**
 * Quita una canción de la biblioteca guardada del usuario.
 */
export async function unsaveFromLibrary(songId: string, activeUser: any) {
  if (!activeUser) {
    const error: any = new Error('Debes iniciar sesión para desguardar canciones.');
    error.status = 401;
    throw error;
  }

  await prisma.userSongPreference.updateMany({
    where: {
      userId: activeUser.id,
      songId
    },
    data: {
      isSaved: false
    }
  });

  return { success: true, isSaved: false };
}

/**
 * Obtiene las canciones favoritas del usuario.
 */
export async function getUserFavorites(activeUser: any) {
  if (!activeUser) {
    return [];
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: activeUser.id },
    include: {
      song: {
        include: {
          artists: true,
          albumRel: true,
          userPreferences: {
            where: { userId: activeUser.id }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return favorites.map(f => {
    const s = f.song;
    const userPref = (s as any).userPreferences?.[0];
    const artistImg = s.artistImage || s.artists?.find((a: any) => a.image)?.image || null;
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
  });
}

/**
 * Agrega una canción a los favoritos del usuario.
 */
export async function addFavorite(data: any, activeUser: any) {
  const { title, artist, content, youtubeId, syncData, transpose, chordVariants } = data;
  const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null
    ? JSON.stringify(chordVariants)
    : chordVariants;

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
        isSaved: true,
        ...(transpose !== undefined ? { transpose: parseInt(transpose, 10) || 0 } : {}),
        ...(chordVariantsStr !== undefined ? { chordVariants: chordVariantsStr } : {})
      },
      create: {
        userId: activeUser.id,
        songId: song.id,
        isFavorite: true,
        isSaved: true,
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

  return {
    ...song,
    transpose: parseInt(transpose, 10) || 0,
    chordVariants: chordVariantsStr || null
  };
}

/**
 * Remueve una canción de los favoritos del usuario.
 */
export async function removeFavorite(songId: string, activeUser: any) {
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

  return { success: true };
}
