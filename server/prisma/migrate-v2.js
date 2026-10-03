import prisma from '../services/db.js';

async function runMigration() {
  console.log('--- Starting Migration to v2 (User, UserSongPreference, Album) ---');

  // 1. Crear usuarios por defecto
  const adminUser = await prisma.user.upsert({
    where: { email: 'gabothdev@gmail.com' },
    update: { role: 'ADMIN', name: 'Gabriel (GabothDev)' },
    create: {
      id: 'user_admin_gabothdev',
      email: 'gabothdev@gmail.com',
      name: 'Gabriel (GabothDev)',
      role: 'ADMIN'
    }
  });
  console.log(`✓ Admin user ready: ${adminUser.email} (${adminUser.id})`);

  const localUser = await prisma.user.upsert({
    where: { email: 'local@songbook.app' },
    update: { role: 'FREE', name: 'Músico Local' },
    create: {
      id: 'user_local_guest',
      email: 'local@songbook.app',
      name: 'Músico Local',
      role: 'FREE'
    }
  });
  console.log(`✓ Local user ready: ${localUser.email} (${localUser.id})`);

  // 2. Migrar Artistas, Álbumes y Preferencias de Canciones
  const songs = await prisma.song.findMany({
    include: {
      artists: true,
      favorites: true
    }
  });
  console.log(`Processing ${songs.length} songs...`);

  for (const song of songs) {
    const artistName = (song.artist || 'Desconocido').trim();
    
    // 2.1 Asegurar Artista
    let artist = await prisma.artist.findFirst({
      where: {
        OR: [
          { name: { equals: artistName } },
          { name: { equals: artistName.toLowerCase() } }
        ]
      }
    });

    if (!artist) {
      artist = await prisma.artist.create({
        data: {
          name: artistName,
          image: song.artistImage || null
        }
      });
    } else if (song.artistImage && !artist.image) {
      artist = await prisma.artist.update({
        where: { id: artist.id },
        data: { image: song.artistImage }
      });
    }

    // Conectar artista a la canción si no está conectado
    await prisma.song.update({
      where: { id: song.id },
      data: {
        artists: {
          connect: { id: artist.id }
        }
      }
    });

    // 2.2 Crear Álbum si existe
    let albumId = song.albumId;
    if (song.album) {
      const albumTitle = song.album.trim();
      let album = await prisma.album.findFirst({
        where: {
          artistId: artist.id,
          title: albumTitle
        }
      });

      if (!album) {
        album = await prisma.album.create({
          data: {
            title: albumTitle,
            cover: song.albumCover || null,
            releaseYear: song.releaseYear || null,
            versionType: song.versionType || 'studio',
            versionDetails: song.versionDetails || null,
            artistId: artist.id
          }
        });
      } else if (song.albumCover && !album.cover) {
        album = await prisma.album.update({
          where: { id: album.id },
          data: { cover: song.albumCover }
        });
      }

      albumId = album.id;
      await prisma.song.update({
        where: { id: song.id },
        data: { albumId }
      });
    }

    // 2.3 Crear UserSongPreference para admin y usuario local
    const isFav = song.favorites.length > 0;
    for (const u of [adminUser, localUser]) {
      await prisma.userSongPreference.upsert({
        where: {
          userId_songId: {
            userId: u.id,
            songId: song.id
          }
        },
        update: {
          transpose: song.transpose || 0,
          chordVariants: song.chordVariants || null,
          isCustom: Boolean(song.isCustom),
          customContent: song.isCustom ? song.content : null,
          isFavorite: isFav
        },
        create: {
          userId: u.id,
          songId: song.id,
          transpose: song.transpose || 0,
          chordVariants: song.chordVariants || null,
          isCustom: Boolean(song.isCustom),
          customContent: song.isCustom ? song.content : null,
          isFavorite: isFav
        }
      });
    }
  }

  // 3. Vincular Favoritos existentes a usuarios
  await prisma.favorite.updateMany({
    where: { userId: null },
    data: { userId: adminUser.id }
  });

  // 4. Vincular Setlists a adminUser
  await prisma.setlist.updateMany({
    where: { userId: null },
    data: { userId: adminUser.id }
  });

  // 5. Vincular ScoreSheet con Song coincidentes
  const scoreSheets = await prisma.scoreSheet.findMany({ where: { songId: null } });
  for (const score of scoreSheets) {
    const matchingSong = await prisma.song.findFirst({
      where: {
        title: { equals: score.title.trim() },
        artist: { equals: score.artist.trim() }
      }
    });
    if (matchingSong) {
      await prisma.scoreSheet.update({
        where: { id: score.id },
        data: { songId: matchingSong.id }
      });
    }
  }

  console.log('--- Migration v2 completed successfully! ---');
  process.exit(0);
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
