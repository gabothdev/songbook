// src/components/scores/utils/scoreHelpers.js

export const SOUNDFONT_URL = 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2';

/**
 * Obtiene la descripción legible de la afinación a partir de los números MIDI de las cuerdas.
 */
export function getTuningDescription(tuningArray) {
  if (!tuningArray || tuningArray.length === 0) return 'Estándar (E-A-D-G-B-E)';
  const standard = [64, 59, 55, 50, 45, 40];
  const dropD = [64, 59, 55, 50, 45, 38];
  const ebStandard = [63, 58, 54, 49, 44, 39];
  const dStandard = [62, 57, 53, 48, 43, 38];

  const matches = (arr) => arr.length === tuningArray.length && arr.every((v, i) => v === tuningArray[i]);
  if (matches(standard)) return 'Estándar (E-A-D-G-B-E)';
  if (matches(dropD)) return 'Drop D (D-A-D-G-B-E)';
  if (matches(ebStandard)) return 'Medio tono abajo (Eb-Ab-Db-Gb-Bb-Eb)';
  if (matches(dStandard)) return 'D Standard (1 tono abajo)';
  return 'Afinación Alternativa';
}

/**
 * Retorna la etiqueta y estilo visual de dificultad según el nivel numérico (1-5).
 */
export function getDifficultyLabel(diff) {
  if (!diff) return null;
  switch (diff) {
    case 1: return { text: 'Principiante', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 2: return { text: 'Intermedio Bajo', color: 'bg-sky-100 text-sky-800 border-sky-300' };
    case 3: return { text: 'Intermedio', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 4: return { text: 'Avanzado', color: 'bg-orange-100 text-orange-800 border-orange-300' };
    case 5: return { text: 'Virtuoso', color: 'bg-rose-100 text-rose-800 border-rose-300' };
    default: return { text: `Nivel ${diff}`, color: 'bg-stone-100 text-stone-700 border-stone-300' };
  }
}

/**
 * Detecta automáticamente el perfil de notación óptimo según el instrumento:
 * - Bandoneón / Piano / Teclados / Cuerdas clásicas / Vientos / Voz -> 'score' (Pentagrama estándar)
 * - Guitarras / Bajo / Ukelele -> 'default' (Tablatura + Pentagrama) o 'tab'
 */
export function detectIdealStaveProfile(track) {
  if (!track) return 'default';
  if (!track.tuning || track.tuning.length === 0) return 'score';

  const name = (track.name || '').toLowerCase();
  const scoreKeywords = [
    'piano', 'bandoneon', 'bandoneón', 'accordion', 'acordeon', 'acordeón',
    'teclado', 'keyboard', 'organ', 'órgano', 'violin', 'violín', 'viola',
    'cello', 'violonchelo', 'flute', 'flauta', 'trumpet', 'trompeta',
    'sax', 'clarinete', 'oboe', 'fagot', 'voice', 'voz', 'choir', 'coro',
    'brass', 'strings', 'cuerdas'
  ];

  if (scoreKeywords.some(kw => name.includes(kw))) {
    return 'score';
  }

  const p = track.playbackInfo?.program ?? (track.instrument ?? -1);
  if ((p >= 0 && p <= 23) || (p >= 40 && p <= 79)) {
    return 'score';
  }

  return 'default';
}

/**
 * Convierte los segundos de reproducción de un video de YouTube al tick exacto de AlphaTab
 * utilizando la matriz de videoPoints (marcas de tiempo por compás extraídas de Songsterr).
 */
export function ytTimeToAlphaTabTick(ytSec, videoPoints, score) {
  if (!score?.masterBars || score.masterBars.length === 0) return null;
  const masterBars = score.masterBars;

  if (!Array.isArray(videoPoints) || videoPoints.length === 0) {
    return null;
  }

  // Si el video está en el silencio de entrada previo al primer compás
  if (ytSec < videoPoints[0]) {
    return {
      tick: masterBars[0].start,
      measureIndex: 0,
      currentBar: 1,
      isIntro: true
    };
  }

  // Si el video ya superó el último punto disponible
  const lastIdx = Math.min(videoPoints.length - 1, masterBars.length - 1);
  if (ytSec >= videoPoints[lastIdx]) {
    const lastBar = masterBars[lastIdx];
    const dur = lastBar.calculateDuration ? lastBar.calculateDuration() : 3840;
    return {
      tick: lastBar.start + dur,
      measureIndex: lastIdx,
      currentBar: lastIdx + 1,
      isIntro: false
    };
  }

  // Búsqueda del compás m donde videoPoints[m] <= ytSec < videoPoints[m + 1]
  let m = 0;
  for (let i = 0; i < videoPoints.length - 1; i++) {
    if (ytSec >= videoPoints[i] && ytSec < videoPoints[i + 1]) {
      m = i;
      break;
    }
  }

  const mStart = videoPoints[m];
  const mEnd = videoPoints[m + 1];
  const mDur = mEnd - mStart;
  const progress = mDur > 0 ? Math.min(1, Math.max(0, (ytSec - mStart) / mDur)) : 0;

  const bar = masterBars[m];
  if (!bar) return null;

  const barDur = bar.calculateDuration ? bar.calculateDuration() : 3840;
  const tick = bar.start + Math.round(progress * barDur);

  return {
    tick,
    measureIndex: m,
    currentBar: m + 1,
    isIntro: false
  };
}

/**
 * Convierte un compás y posición fraccional de AlphaTab a segundos del video de YouTube.
 */
export function alphaTabBeatToYtTime(barIndex, beatFraction = 0, videoPoints, api) {
  if (Array.isArray(videoPoints) && videoPoints.length > 0) {
    const idx = Math.max(0, Math.min(barIndex, videoPoints.length - 1));
    const mStart = videoPoints[idx];
    if (idx >= videoPoints.length - 1) return mStart;
    const mEnd = videoPoints[idx + 1];
    return mStart + beatFraction * (mEnd - mStart);
  }
  return (api?.timePosition || 0) / 1000;
}
