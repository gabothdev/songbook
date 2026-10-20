import prisma from '../db.js';
import { findExistingSong } from './songService.js';

/**
 * Obtiene todos los setlists pertenecientes estrictamente al usuario activo con sus canciones ordenadas.
 */
export async function getUserSetlists(activeUser: any) {
  if (!activeUser) {
    return [];
  }

  const setlists = await prisma.setlist.findMany({
    where: { userId: activeUser.id },
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

  return setlists.map(s => ({
    name: s.name,
    songs: s.songs.map(ss => {
      const song = ss.song;
      return {
        ...song,
        transpose: ss.transpose !== null && ss.transpose !== undefined ? ss.transpose : (song.transpose || 0),
        chordVariants: ss.chordVariants || song.chordVariants || null,
        artistImage: song.artistImage || song.artists?.find((a: any) => a.image)?.image || null,
        albumCover: song.albumRel?.cover || song.albumCover || null,
        album: song.albumRel?.title || song.album || null
      };
    })
  }));
}

/**
 * Crea un nuevo setlist para el usuario activo.
 */
export async function createSetlist(name: string, activeUser: any) {
  if (!activeUser) {
    const error: any = new Error('Debes iniciar sesión para crear un setlist.');
    error.status = 401;
    throw error;
  }

  return prisma.setlist.create({
    data: {
      name,
      userId: activeUser.id
    }
  });
}

/**
 * Agrega una canción a una colección/setlist (creando la canción y setlist si no existen).
 */
export async function addSongToSetlist(data: any, activeUser: any) {
  if (!activeUser) {
    const error: any = new Error('Debes iniciar sesión para agregar canciones a un setlist.');
    error.status = 401;
    throw error;
  }

  const { setlistName, title, artist, content, youtubeId, syncData, transpose, chordVariants } = data;
  const chordVariantsStr = typeof chordVariants === 'object' && chordVariants !== null
    ? JSON.stringify(chordVariants)
    : chordVariants;
  const parsedTranspose = parseInt(transpose, 10) || 0;

  // 1. Encontrar o crear la canción
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

  // 2. Encontrar o crear el setlist asociado a este usuario
  let setlist = await prisma.setlist.findFirst({
    where: {
      name: setlistName,
      userId: activeUser.id
    }
  });
  if (!setlist) {
    setlist = await prisma.setlist.create({
      data: {
        name: setlistName,
        userId: activeUser.id
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

  // Regla: Si se agrega a un setlist, se considera automáticamente guardada en el cuaderno
  await prisma.userSongPreference.upsert({
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
      transpose: parsedTranspose,
      chordVariants: chordVariantsStr || null
    }
  });

  return {
    success: true,
    song: {
      ...song,
      transpose: parsedTranspose,
      chordVariants: chordVariantsStr || null
    }
  };
}

/**
 * Quita una canción de un setlist.
 */
export async function removeSongFromSetlist(setlistName: string, songId: string, activeUser: any) {
  if (!activeUser) {
    const error: any = new Error('Usuario no autenticado');
    error.status = 401;
    throw error;
  }

  const setlist = await prisma.setlist.findFirst({
    where: {
      name: setlistName,
      userId: activeUser.id
    }
  });

  if (!setlist) {
    const error: any = new Error('Setlist no encontrado para este usuario.');
    error.status = 404;
    throw error;
  }

  await prisma.setlistSong.deleteMany({
    where: { setlistId: setlist.id, songId }
  });

  return { success: true };
}

/**
 * Elimina una colección o setlist completo.
 */
export async function deleteSetlist(name: string, activeUser: any) {
  if (!activeUser) {
    const error: any = new Error('Usuario no autenticado');
    error.status = 401;
    throw error;
  }

  await prisma.setlist.deleteMany({
    where: {
      name,
      userId: activeUser.id
    }
  });

  return { success: true };
}
