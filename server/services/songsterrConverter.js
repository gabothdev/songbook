function midiToAlphaTexNote(midi) {
  const names = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
  const octave = Math.floor(midi / 12) - 1;
  const name = names[midi % 12];
  return `${name}${octave}`;
}

const VALID_DURATIONS = [1, 2, 4, 8, 16, 32, 64];

/**
 * Normaliza duraciones que no sean potencias de 2 (ej. tresillos con duración 6, 12, 24, 3)
 * para que AlphaTex siempre reciba una duración musical válida.
 */
function normalizeDuration(type, duration) {
  if (type && VALID_DURATIONS.includes(type)) return type;
  if (duration && Array.isArray(duration) && VALID_DURATIONS.includes(duration[1])) return duration[1];
  // Conversión de tresillos / tuplets
  if (duration && duration[1] === 6) return 4;
  if (duration && duration[1] === 12) return 8;
  if (duration && duration[1] === 24) return 16;
  if (duration && duration[1] === 3) return 2;
  return 4;
}

/**
 * Convierte un objeto de notas, compases y articulaciones de Songsterr a AlphaTex estándar.
 * Soporta alineación nota por nota de letras sincronizadas (lyricsByMeasure).
 */
export function songsterrToAlphaTex(songMeta, partData, lyricsByMeasure = null) {
  const lines = [];

  // Tempo (AlphaTex inicia directamente con el tempo y afinación, estilo Songsterr)

  // Tempo
  let initialBpm = 120;
  if (partData.automations?.tempo?.length > 0) {
    initialBpm = Math.round(partData.automations.tempo[0].bpm);
  } else if (songMeta.bpm) {
    initialBpm = Math.round(songMeta.bpm);
  }
  lines.push(`\\tempo ${initialBpm}`);

  const isDrums = partData.instrument === 'Drums' || !partData.tuning || partData.tuning.length === 0;

  // Tuning: formato \tuning (e4 b3 g3 d3 a2 e2) - Solo para instrumentos de cuerda
  if (!isDrums && Array.isArray(partData.tuning) && partData.tuning.length > 0) {
    const tuningStr = partData.tuning.map(midiToAlphaTexNote).join(' ');
    lines.push(`\\tuning (${tuningStr})`);
  }

  // Capo
  if (partData.capo && partData.capo > 0) {
    lines.push(`\\capo ${partData.capo}`);
  }

  lines.push('.'); // Separador de encabezado AlphaTex

  const measures = partData.measures || [];
  let currentSig = null;

  for (let mIdx = 0; mIdx < measures.length; mIdx++) {
    const m = measures[mIdx];
    const measureTokens = [];

    // Marcador de sección: \section "Intro"
    if (m.marker?.text) {
      const cleanMarker = m.marker.text.replace(/["\\]/g, '');
      measureTokens.push(`\\section "${cleanMarker}"`);
    }

    // Time signature: \ts (4 4)
    if (m.signature && Array.isArray(m.signature)) {
      const sigKey = `${m.signature[0]} ${m.signature[1]}`;
      if (sigKey !== currentSig) {
        currentSig = sigKey;
        measureTokens.push(`\\ts (${sigKey})`);
      }
    }

    // Tempo local
    const tempoAtM = partData.automations?.tempo?.find(t => t.measure === mIdx);
    if (tempoAtM && mIdx > 0) {
      measureTokens.push(`\\tempo ${Math.round(tempoAtM.bpm)}`);
    }

    const voice = m.voices?.[0];
    const beats = voice?.beats || [];

    if (beats.length === 0) {
      measureTokens.push('r.1'); // Silencio de compás completo
    } else {
      let lastDuration = null;
      let currentMeasureOffset = 0;
      const mLyrics = lyricsByMeasure?.[mIdx] || [];

      for (let beatIndex = 0; beatIndex < beats.length; beatIndex++) {
        const beat = beats[beatIndex];
        const beatTokens = [];

        // Track beat offset within measure (fraction of measure duration)
        const durFraction = beat.duration && Array.isArray(beat.duration)
          ? (beat.duration[0] / beat.duration[1])
          : (1 / (beat.type || 4));
        const beatOffset = currentMeasureOffset;
        currentMeasureOffset += durFraction;

        // Duración normalizada válida
        const durVal = normalizeDuration(beat.type, beat.duration);
        const durStr = `:${durVal}`;
        if (durStr !== lastDuration) {
          beatTokens.push(durStr);
          lastDuration = durStr;
        }

        // Buscar sílaba/palabra lírica sincronizada con este pulso
        let matchedLyric = null;
        if (mLyrics.length > 0) {
          const matchIdx = mLyrics.findIndex(l => 
            (l.beatIndex !== undefined ? l.beatIndex === beatIndex : Math.abs(l.offset - beatOffset) < 0.04)
          );
          if (matchIdx !== -1) {
            matchedLyric = mLyrics[matchIdx].token;
          }
        }

        // 1. Efectos a nivel de Beat/Acorde (chords, lyrics, tuplets)
        const beatEffects = [];
        if (beat.tuplet && beat.tuplet > 1) {
          beatEffects.push(`tu ${beat.tuplet}`);
        }
        if (beat.chord?.text) {
          const cleanChord = beat.chord.text.replace(/["\\]/g, '');
          if (cleanChord) beatEffects.push(`ch "${cleanChord}"`);
        }
        if (matchedLyric) {
          const cleanLyric = matchedLyric.replace(/["\\]/g, '');
          if (cleanLyric) beatEffects.push(`lyrics "${cleanLyric}"`);
        }

        // 2. Efectos estrictamente a nivel de Nota (palm mute, let ring)
        const noteEffectsOnly = [];
        if (beat.palmMute) noteEffectsOnly.push('pm');
        if (beat.letRing) noteEffectsOnly.push('lr');

        // Notas
        const notes = beat.notes || [];
        if (notes.length === 0 || beat.rest) {
          // En silencios, solo aplican efectos de beat (como lyrics o tuplet), nunca pm o lr
          const fx = beatEffects.length > 0 ? `{${beatEffects.join(' ')}}` : '';
          beatTokens.push(`r${fx}`);
        } else {
          const formatNote = (n, isSingleNote = false) => {
            const isDead = n.dead || n.ghost;
            let notePrefix;
            if (isDrums) {
              notePrefix = isDead ? 'x' : (n.fret ?? 36);
            } else {
              const stringNum = Math.max(1, Math.round((n.string ?? 0) + 1));
              const fretVal = isDead ? 'x' : (n.fret ?? 0);
              notePrefix = `${fretVal}.${stringNum}`;
            }

            // Note-level effects
            const noteEffects = [...noteEffectsOnly];
            if (isSingleNote) {
              noteEffects.push(...beatEffects);
            }

            // Bends
            if (n.bend) {
              const bendVal = typeof n.bend === 'number' ? n.bend : (n.bend.value || 4);
              noteEffects.push(`b (0 ${bendVal})`);
            }
            // Slides
            if (n.slide) {
              noteEffects.push('sl');
            }
            // Hammer-on / Pull-off
            if (n.hammerOn || n.pullOff || n.hp) {
              noteEffects.push('h');
            }
            // Tie
            if (n.tie) {
              noteEffects.push('t');
            }
            // Vibrato
            if (n.vibrato) {
              noteEffects.push('v');
            }
            // Harmonics
            if (n.harmonic === 'natural' || n.nh) {
              noteEffects.push('nh');
            } else if (n.harmonic === 'artificial' || n.ah) {
              noteEffects.push('ah');
            }

            const effectsStr = noteEffects.length > 0 ? `{${noteEffects.join(' ')}}` : '';
            return `${notePrefix}${effectsStr}`;
          };

          if (notes.length === 1) {
            // Nota individual: unifica todos los efectos en un solo bloque {}
            beatTokens.push(formatNote(notes[0], true));
          } else {
            // Acordes: los efectos de nota (lr, pm, bends) van en las notas,
            // y los efectos de beat (ch, lyrics, tu) van al acorde en un bloque único {}
            const chordNotes = notes.map(n => formatNote(n, false)).join(' ');
            const chordFx = beatEffects.length > 0 ? `{${beatEffects.join(' ')}}` : '';
            beatTokens.push(`(${chordNotes})${chordFx}`);
          }
        }

        measureTokens.push(beatTokens.join(' '));
      }
    }

    lines.push(measureTokens.join(' ') + ' |');
  }

  return lines.join('\n');
}
