import prisma from '../services/db.js';

function normalizeChordText(text) {
  if (!text) return text;

  // 1. Colon formats from Chordify
  let clean = text
    .replace(/\[([A-G][b#]?):min(\/[A-G][b#]?)?\]/gi, '[$1m$2]')
    .replace(/\[([A-G][b#]?):maj7(\/[A-G][b#]?)?\]/gi, '[$1maj7$2]')
    .replace(/\[([A-G][b#]?):maj(\/[A-G][b#]?)?\]/gi, (match, root, bass) => `[${root}${bass || ''}]`)
    .replace(/\[([A-G][b#]?):7(\/[A-G][b#]?)?\]/gi, '[$17$2]')
    .replace(/\[([A-G][b#]?):([a-zA-Z0-9]+)(\/[A-G][b#]?)?\]/gi, '[$1$2$3]');

  // 2. Pure major triads with or without slash: [Emaj] -> [E], [Emaj/Ab] -> [E/Ab] (preserving maj7, maj9)
  clean = clean.replace(/\[([A-G][b#]?)maj(?!\d)(\/[A-G][b#]?)?\]/gi, (match, root, bass) => {
    return `[${root}${bass || ''}]`;
  });

  clean = clean.replace(/\[([A-G][b#]?)major(?!\d)(\/[A-G][b#]?)?\]/gi, (match, root, bass) => {
    return `[${root}${bass || ''}]`;
  });

  return clean;
}

function normalizeSyncData(syncDataStr) {
  if (!syncDataStr) return syncDataStr;
  try {
    const compases = JSON.parse(syncDataStr);
    if (!Array.isArray(compases)) return syncDataStr;

    const updatedCompases = compases.map((compas) => {
      if (!compas.acordes || !Array.isArray(compas.acordes)) return compas;
      const cleanAcordes = compas.acordes.map((chord) => {
        if (!chord || chord === '𝄾' || chord === '𝄽') return chord;
        let c = chord.trim();
        c = c.replace(/^([A-G][b#]?)maj(?!\d)(\/[A-G][b#]?)?$/i, (m, root, bass) => `${root}${bass || ''}`);
        c = c.replace(/^([A-G][b#]?)major(?!\d)(\/[A-G][b#]?)?$/i, (m, root, bass) => `${root}${bass || ''}`);
        return c;
      });
      return { ...compas, acordes: cleanAcordes };
    });

    return JSON.stringify(updatedCompases);
  } catch (e) {
    return syncDataStr;
  }
}

async function runCleanup() {
  console.log('🔄 Iniciando actualización de acordes en SQLite database...');

  const songs = await prisma.song.findMany();
  console.log(`📋 Total de canciones encontradas: ${songs.length}`);

  let updatedCount = 0;

  for (const song of songs) {
    const cleanContent = normalizeChordText(song.content);
    const cleanSyncData = normalizeSyncData(song.syncData);

    if (cleanContent !== song.content || cleanSyncData !== song.syncData) {
      await prisma.song.update({
        where: { id: song.id },
        data: {
          content: cleanContent,
          syncData: cleanSyncData,
        },
      });
      updatedCount++;
      console.log(`✅ Canción actualizada: "${song.title}" - ${song.artist}`);
    }
  }

  console.log(`🎉 Proceso completado. ${updatedCount} canciones fueron actualizadas en SQLite.`);
  process.exit(0);
}

runCleanup().catch((err) => {
  console.error('❌ Error en script de actualización:', err);
  process.exit(1);
});
