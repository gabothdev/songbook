/**
 * Utilidad de alineación armónica y parsing (gridParser) para SongBook
 * 
 * Toma un texto estándar con acordes en corchetes [C] o datos de sincronización
 * y genera una estructura de compases y tiempos (4/4) para el BeatGrid interactivo.
 */

/**
 * Parsea el texto de una canción a un listado de compases estructurados para la grilla
 * @param {string} text Texto completo de la canción
 * @param {number} beatsPerMeasure Cantidad de tiempos por compás (ej: 4)
 * @returns {Array} Listado de compases [{ id, seccion, acordes: [...], secTime }]
 */
export function parseSongTextToGrid(text, beatsPerMeasure = 4) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split('\n');
  const compases = [];
  let currentSection = 'Intro';
  let sectionStartTime = null;
  let measureCounter = 1;

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine === '') return;

    // Ignorar líneas de metadatos
    if (trimmedLine.match(/^\[(?:BPM|Beats|TimeSignature)\s*@\s*[\d./]+\]$/i)) {
      return;
    }

    // 1. Detectar cabeceras de sección con tiempo opcional
    const sectionMatch = trimmedLine.match(/^\[(Intro|Estrofa\s*\d*|Verse\s*\d*|Coro|Chorus|Pre-Estribillo|Pre-Chorus|Solo|Puente|Bridge|Outro|Tema)(?:\s*@\s*([\d.]+))?\]$/i);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      sectionStartTime = sectionMatch[2] ? parseFloat(sectionMatch[2]) : null;
      return;
    }

    // 2. Analizar partes del texto de la línea para separar acordes y letras
    const parts = trimmedLine.split(/(\[.*?\])/g);
    
    // Identificar si es una línea que contiene solo acordes
    const isChordOnlyLine = parts.every(part => part.startsWith('[') || part.trim() === '' || part.trim() === '|');

    // Extraer acordes y sus posiciones relativas
    const lineChords = [];
    let cleanTextLength = 0;
    
    parts.forEach((part) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        const chordName = part.replace(/[[\]]/g, '').trim();
        if (chordName && chordName !== '|') {
          lineChords.push({
            chord: chordName,
            charPosition: cleanTextLength
          });
        }
      } else {
        cleanTextLength += part.length;
      }
    });

    if (lineChords.length === 0) return;

    if (isChordOnlyLine) {
      // Caso A: Línea con solo acordes (ej: [C] [G] [Am] [F])
      lineChords.forEach((chordInfo) => {
        const beatArray = Array(beatsPerMeasure).fill('');
        beatArray[0] = chordInfo.chord;
        
        compases.push({
          id: measureCounter++,
          seccion: currentSection,
          acordes: beatArray,
          secTime: sectionStartTime
        });
        sectionStartTime = null; // solo el primer compás de la sección hereda el timestamp
      });
    } else {
      // Caso B: Línea mixta con letra y acordes
      const measuresForLine = 2;
      const totalBeatsForLine = measuresForLine * beatsPerMeasure; // 8 tiempos
      
      const lineBeats = Array(totalBeatsForLine).fill('');

      lineChords.forEach((chordInfo) => {
        const relativePosition = cleanTextLength > 0 ? (chordInfo.charPosition / cleanTextLength) : 0;
        const beatIndex = Math.min(
          totalBeatsForLine - 1,
          Math.max(0, Math.round(relativePosition * (totalBeatsForLine - 1)))
        );
        lineBeats[beatIndex] = chordInfo.chord;
      });

      // Compás 1 (tiempos 0 a 3)
      compases.push({
        id: measureCounter++,
        seccion: currentSection,
        acordes: lineBeats.slice(0, beatsPerMeasure),
        secTime: sectionStartTime,
        lyric: trimmedLine.replace(/\[.*?\]/g, '').trim()
      });
      sectionStartTime = null;

      // Compás 2 (tiempos 4 a 7)
      compases.push({
        id: measureCounter++,
        seccion: currentSection,
        acordes: lineBeats.slice(beatsPerMeasure, totalBeatsForLine),
        secTime: null
      });
    }
  });

  return compases;
}
