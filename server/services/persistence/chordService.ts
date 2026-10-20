import prisma from '../db.js';

/**
 * Obtiene los nombres enarmónicos equivalentes de un acorde (ej. Bb <-> A#).
 */
export function getEnharmonicEquivalents(name?: string) {
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

/**
 * Compara la igualdad física de digitaciones de acordes (trastes y cejuela/posición base).
 */
export function arePositionsEquivalent(posA: any, posB: any) {
  if (!posA || !posB) return false;
  const normalizeFrets = (f: any) => {
    if (!f) return '';
    if (Array.isArray(f)) return f.map(x => (x === -1 || x === '' || x === 'x' || x === 'X') ? 'x' : String(x).toLowerCase()).join('');
    return String(f).toLowerCase().replace(/\s+/g, '');
  };
  const fretsA = normalizeFrets(posA.frets);
  const fretsB = normalizeFrets(posB.frets);
  if (fretsA !== fretsB) return false;

  const baseA = Number(posA.position || posA.baseFret || 1);
  const baseB = Number(posB.position || posB.baseFret || 1);
  return baseA === baseB;
}

/**
 * Obtiene todos los acordes personalizados registrados para un instrumento.
 */
export async function getCustomChords(instrument?: string) {
  const chords = await prisma.customChord.findMany({
    where: instrument ? { instrument } : {}
  });
  return chords.map(c => ({
    ...c,
    data: JSON.parse(c.data)
  }));
}

/**
 * Guarda o acumula una variación de acorde personalizado, verificando duplicados oficiales o personalizados.
 */
export async function saveCustomChord(instrument = 'guitar', chordName: string, data: any) {
  if (!chordName || !data) {
    const error: any = new Error('Faltan parámetros requeridos (chordName, data)');
    error.status = 400;
    throw error;
  }

  const lookupNames = getEnharmonicEquivalents(chordName);
  const incomingPositions = Array.isArray(data) ? data : [data];
  const targetPos = incomingPositions[0];

  // 1. Verificar contra el catálogo oficial (ChordDefinition)
  const officialChord = await prisma.chordDefinition.findFirst({
    where: { instrument, chordName: { in: lookupNames } }
  });
  let officialPositions: any[] = [];
  if (officialChord) {
    try {
      const parsed = JSON.parse(officialChord.positions);
      officialPositions = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      officialPositions = [];
    }
    const existingOfficialIdx = officialPositions.findIndex(pos => arePositionsEquivalent(pos, targetPos));
    if (existingOfficialIdx !== -1) {
      return {
        exists: true,
        isOfficial: true,
        variantIndex: existingOfficialIdx,
        message: 'Esta variación ya existe en el catálogo oficial.',
        positions: officialPositions
      };
    }
  }

  // 2. Verificar contra los acordes personalizados existentes (CustomChord)
  const customChord = await prisma.customChord.findFirst({
    where: { instrument, chordName: { in: lookupNames } }
  });
  let existingCustomPositions: any[] = [];
  if (customChord) {
    try {
      const parsed = JSON.parse(customChord.data);
      existingCustomPositions = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      existingCustomPositions = [];
    }
    const existingCustomIdx = existingCustomPositions.findIndex(pos => arePositionsEquivalent(pos, targetPos));
    if (existingCustomIdx !== -1) {
      const combinedIdx = officialPositions.length + existingCustomIdx;
      return {
        exists: true,
        isCustom: true,
        variantIndex: combinedIdx,
        message: 'Esta variación ya existe entre tus acordes personalizados.',
        positions: [...officialPositions, ...existingCustomPositions]
      };
    }
  }

  // 3. No existe en ninguno: acumular la nueva variación en CustomChord
  const updatedCustomPositions = [...existingCustomPositions, targetPos];
  let savedCustom;
  if (customChord) {
    savedCustom = await prisma.customChord.update({
      where: { id: customChord.id },
      data: {
        data: JSON.stringify(updatedCustomPositions),
        verified: false
      }
    });
  } else {
    savedCustom = await prisma.customChord.create({
      data: {
        instrument,
        chordName: chordName.trim(),
        data: JSON.stringify(updatedCustomPositions),
        verified: false
      }
    });
  }

  const newVariantIndex = officialPositions.length + updatedCustomPositions.length - 1;
  return {
    success: true,
    isNew: true,
    variantIndex: newVariantIndex,
    message: '¡Variación guardada con éxito!',
    chord: savedCustom,
    positions: [...officialPositions, ...updatedCustomPositions]
  };
}

/**
 * Busca un acorde por nombre en el catálogo oficial y personalizado.
 */
export async function lookupChord(name: string, instrument = 'guitar') {
  if (!name) {
    const error: any = new Error('Missing chord name parameter');
    error.status = 400;
    throw error;
  }

  const lookupNames = getEnharmonicEquivalents(name);

  // 1. Obtener variaciones del catálogo oficial
  const officialChord = await prisma.chordDefinition.findFirst({
    where: { instrument, chordName: { in: lookupNames } }
  });
  let officialPositions: any[] = [];
  if (officialChord) {
    try {
      const parsed = JSON.parse(officialChord.positions);
      officialPositions = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      officialPositions = [];
    }
  }

  // 2. Obtener variaciones personalizadas
  const customChord = await prisma.customChord.findFirst({
    where: { instrument, chordName: { in: lookupNames } }
  });
  let customPositions: any[] = [];
  if (customChord) {
    try {
      const parsed = JSON.parse(customChord.data);
      customPositions = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      customPositions = [];
    }
  }

  const combinedPositions = [...officialPositions, ...customPositions];

  if (combinedPositions.length === 0) {
    if (instrument === 'bandoneon') {
      return { chordName: name, instrument: 'bandoneon', positions: [] };
    }
    const error: any = new Error(`Chord ${name} not found`);
    error.status = 404;
    throw error;
  }

  return {
    chordName: name,
    instrument,
    key: officialChord?.key || '',
    suffix: officialChord?.suffix || '',
    officialCount: officialPositions.length,
    customCount: customPositions.length,
    positions: combinedPositions
  };
}
