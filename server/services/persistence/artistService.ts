import prisma from '../db.js';

/**
 * Actualiza los datos de un artista por su ID.
 */
export async function updateArtistById(id: string, data: { image?: string; name?: string; bio?: string }) {
  const { image, name, bio } = data;
  return prisma.artist.update({
    where: { id },
    data: {
      ...(image !== undefined ? { image } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(bio !== undefined ? { bio } : {})
    }
  });
}

/**
 * Actualiza o asigna la foto canónica de un artista asegurando la regla de unicidad en toda la base de datos.
 */
export async function updateArtistImage(name?: string, image?: string, id?: string) {
  const trimmedName = (name || '').trim();
  if (!trimmedName && !id) {
    const error: any = new Error('id or name is required');
    error.status = 400;
    throw error;
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

  // REGLA: Cada artista debe tener asignada una única foto canónica en la tabla Artist.
  // En Song.artistImage solo se propaga si el artista es el artista principal de la canción (o solista).
  if (image && finalName) {
    await prisma.song.updateMany({
      where: {
        OR: [
          { artist: { equals: finalName } },
          { artist: { startsWith: `${finalName},` } },
          { artist: { startsWith: `${finalName} /` } }
        ]
      },
      data: { artistImage: image }
    });
  }

  return { success: true, artist };
}
