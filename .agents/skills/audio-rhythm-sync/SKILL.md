---
name: audio-rhythm-sync
description: >-
  Use this skill when working on YouTube video synchronization, BeatGrid measures and beats, Tone.js pitch shifting, or rhythmic metronomes.
---

# Audio Rhythm Sync Skill

Esta skill guía la sincronización rítmica y reproducción de audio en SongBook.

## 1. Sincronización No Lineal por Secciones (`useYouTubeSync.js`)
- Soporta interpolación lineal por tramos (*piece-wise linear interpolation*).
- Formato de sección en letra: `[Coro @ 45.2]` segundos.
- Calcula el BPM local entre dos secciones para ubicar el compás y pulso activo exacto sin desvíos.

## 2. Streaming y Pitch Shifting (`usePitchShiftAudio.js`)
- Exclusivo para usuarios Pro/Premium.
- El backend (`/api/audio/stream?youtubeId=...`) envía audio WebM con soporte de cabeceras HTTP `Range` (código 206).
- Tone.js procesa el tono con `Tone.PitchShift`.
- Silenciar el reproductor nativo de YouTube (`isMuted={isPitchShiftActive}`) durante la transposición de audio.

## 3. BeatGrid y Compases
- Los compases vacíos iniciales son silencios musicales (`𝄾 2T` / `𝄾 4T`).
- Las celdas de compás son arrastrables sobre la letra (`ChordDropSlot`).
- **Preservación Multitiempo**: Toda función que convierta compases a texto (`formatCompasesToText`) debe preservar los cambios de acorde dentro del compás (ej. `[C] [G]`), nunca filtrar con `find()`.
- **Resaltado Rítmico de Acordes Repetidos y Transición Inter-Línea**: `SongLyricsRenderer` mapea cada compás y línea con rangos acumulados exactos de pulsos globales (`startBeatGlobal`, `endBeatGlobal`). La sincronización prioriza `currentBeatIndex` del BeatGrid: cuando el cursor del BeatGrid avanza de pulso/compás (ej. de un acorde final al acorde de inicio de la siguiente línea, o en acordes repetidos como `[A#] ... [A#]`), la línea y el acorde activo avanzan de forma inmediata e irreversible, sin volver a iluminar ocurrencias anteriores.
- **Mapeo Exacto de Compases a Líneas y Acordes (`lineTimingsMap` / `chordTimings`)**: `SongLyricsRenderer` correlaciona el recuento de acordes de cada renglón con los compases exactos del BeatGrid, sus `beatTimes` y sus `chordBeats`. Cada acorde tiene su ventana temporal exacta `[cStart, cEnd]`, evitando que al repetirse un mismo acorde cercano en el tiempo se ilumine la ocurrencia anterior en vez de la siguiente. Si no hay timestamps explícitos por pulso, los tiempos se calculan monótonamente a partir de BPM y los inicios de sección para prevenir superposiciones.
- **Alineación de Secciones y Compases (`alignCompasesWithSongSections`)**: Las secciones se asocian al compás con menor distancia absoluta (`Math.abs(cTime - sec.time)`), evitando que por redondeos decimales de timestamps un compás quede atribuido a la sección previa. Además, si los compases ya contienen secciones no genéricas coincidentes, se preservan directamente.
- **Tolerancia y Latch de Búsqueda (`useYouTubeSync.js`)**: Al buscar el pulso activo en `flatBeats`, se aplica `BEAT_EPSILON = 0.06` para absorber imprecisiones de aterrizaje en keyframes de YouTube. Al invocar `jumpToBeat`, `seekLatchRef` enclava el pulso objetivo de inmediato evitando snapbacks o retrocesos al pulso anterior durante el seek o en pausa.
- **Navegación Bidireccional Letra <-> BeatGrid**: Clic en acorde de la letra despacha su `beatIdx` exacto de `lineTimingsMap` a `jumpToBeat`, saltando al pulso y tiempo milimétrico sin depender de ratios de línea. Clic en BeatGrid (`onBeatClick`) hace sonar el acorde, enclava el pulso y activa el resaltado y auto-scroll suave de la línea y acorde correspondiente en `SongLyricsRenderer` tanto en reproducción como en pausa.
- **Offsets Acumulativos de Pulsos (`measureBeatOffsets`)**: Nunca multiplicar compases por 4 (`compasIdx * 4`) para calcular pulsos. Los compases de duración variable (ej. 2T en silencios o anacrusas, 3T en compases ternarios) requieren calcular los pulsos de inicio sumando acumulativamente `compas.acordes.length`. Al hacer clic en un encabezado de sección (`handleSelectSection`), se debe usar `measureBeatOffsets[targetGlobalCompasIdx]` para llegar al primer acorde y no al segundo.
