# Reglas y Directrices del Cancionero & Memorabilia (`src/components/song/`)

Este archivo rige para los componentes del visor de canciones (`SongSheetView`, `SongLyricsRenderer`, `BeatGrid`, `SongMemorabiliaDesk`, `SongReleaseArtifact`).

---

## 1. Memorabilia y Estuches Vectoriales
1. **Mapeo de Tipos de Versión y Contenedores**:
   - `studio` y `acoustic`: Usan `AlbumDiscCase.jsx` con el SVG base `/cd-2.svg` (estuche de disco acrílico).
   - `live`: Usa `TicketStubCase.jsx` con `/ticket.svg` (entrada/ticket vintage, foto en `#photo`).
   - `soundtrack` y `session`: Usan `MovieFilmCase.jsx` con `/movie.svg` (fotograma de película, foto en `#photo` con overlay `/57E67BC6.png`).
2. **Foto de Artista (Polaroid)**:
   - Polaroids apiladas arrastrables con rotación orgánica.
   - Guardar una foto desde el modal actualiza `updateArtistImage`, sincronizando el perfil del artista y propagando a todas sus canciones.
3. **Persistencia de Edición**:
   - Al editar carátula, álbum, año o versión, llamar a `updateSongPreferences` con `currentUser` para aislar preferencias y actualizar el modelo `Album`.

---

## 2. Audio & Pitch Shifting (Tone.js)
1. **Pitch Shifting en Nube (`usePitchShiftAudio.js`)**:
   - Exclusivo para usuarios Pro/Premium.
   - Silencia el reproductor nativo de YouTube (`isMuted={isPitchShiftActive}`) mientras reproduce el stream `/api/audio/stream?youtubeId=...` transpuesto mediante `Tone.PitchShift`.
   - Heartbeat cada 120ms para sincronía inmediata de play/pause.
2. **Síntesis y Rasgueo de Acordes (`audioPlayer.js`)**:
   - Simula rasgueo descendente/ascendente usando Tone.js Sampler con muestras acústicas en OGG (`dist/assets/*.ogg`).

---

## 3. BeatGrid y Sincronización Rítmica
1. **Compases Vacíos y Silencios**:
   - Compases iniciales vacíos se renderizan como silencios musicales (`𝄾 2T` / `𝄾 4T`).
   - Caracteres espurios (`[']`, `['´]`, `’`) se filtran mediante `IGNORED_CHORD_REGEX`.
2. **Drag & Drop**:
   - Las celdas de acordes del BeatGrid son arrastrables con payload `{ chord, beatIndex, secTime, seccion }`.
   - Al soltarse sobre las palabras de la letra (`ChordDropSlot`), asocian el acorde y su marca de tiempo rítmica.
3. **Preservación de Acordes Multitiempo en Compases (`formatCompasesToText`)**:
   - NUNCA usar `find()` para extraer un solo acorde por compás.
   - En compases con múltiples acordes (ej. 2 tiempos de `C` y 2 tiempos de `G`), deben preservarse todos los cambios (`[C] [G]`).
4. **Resaltado Rítmico de Acordes Repetidos y Transición Inter-Línea**:
   - `SongLyricsRenderer` mapea cada compás y línea con rangos acumulados exactos de pulsos globales (`startBeatGlobal`, `endBeatGlobal`) basados en `acordes.length`.
   - La sincronización prioriza `currentBeatIndex` del BeatGrid: cuando el cursor del BeatGrid avanza de compás/pulso (ej. de un `Dm` al final del verso al `C` inicial de la siguiente línea, o acordes repetidos como `[A#] ... [A#]`), la línea y el acorde activo avanzan de manera inmediata e irreversible, garantizando que nunca se destaque la ocurrencia anterior.
5. **Sincronización Bidireccional BeatGrid <-> Letra**:
   - Modificar cualquier celda rítmica vía `handleUpdateBeatGridChord` actualiza `activeCompases` y sincroniza el texto del visualizador (`formatCompasesToText`).
6. **Mapeo Exacto de Compases a Líneas y Acordes (`lineTimingsMap` / `chordTimings`)**:
   - `SongLyricsRenderer` calcula `lineTimingsMap` correlacionando los acordes de cada línea con los compases exactos del BeatGrid, sus `beatTimes` y sus `chordBeats`.
   - Cada acorde dentro de la línea obtiene su rango rítmico (`startBeatGlobal`) y ventana temporal exacta `[chord.startTime, chord.endTime]`, prescindiendo de cálculos basados en longitud de caracteres de texto o divisiones equitativas arbitrarias.
   - Si no hay timestamps explícitos por pulso, los tiempos de compás se interpolan monótonamente a partir del BPM y los tiempos de inicio de sección para evitar timestamps superpuestos o estáticos.
7. **Alineación de Secciones y Compases (`alignCompasesWithSongSections`)**:
   - Al alinear compases con secciones de la letra (`[Sección @ time]`), cada sección se asocia al compás más cercano por distancia temporal absoluta (`Math.abs(cTime - sec.time)`), inmune a truncamientos decimales de punto flotante.
   - Si los compases ya traen secciones no genéricas coincidentes, se preservan directamente para evitar desfases de compases o desalineación de tiempos (ej. que un compás pertenezca a la sección anterior).
8. **Tolerancia y Latch de Búsqueda en Beat Tracking (`useYouTubeSync.js`)**:
   - Al buscar pulsos activos en `flatBeats`, se aplica una tolerancia de 60ms (`BEAT_EPSILON = 0.06`) para absorber el aterrizaje de keyframes de video de YouTube y la latencia perceptual.
   - `jumpToBeat` establece un `seekLatchRef` con expiración breve para enclavar el pulso seleccionado de forma estable e inmediata, evitando retrocesos o saltos a pulsos anteriores por retrasos en la respuesta del reproductor.
9. **Navegación Bidireccional Letra <-> BeatGrid**:
   - **Letra a BeatGrid (`handleSelectChordFromLyrics`)**: Al hacer clic en cualquier acorde en `SongLyricsRenderer`, se despacha su pulso global exacto (`beatIdx`) y timestamp calculado en `lineTimingsMap`. `SongSheetView` ejecuta `jumpToBeat(chordContext.beatIdx)`, posicionando el cursor del BeatGrid en el pulso exacto (ej. pulso 3 de un compás dividido) sin heurísticas de ratios ni saltos al inicio de compás, y haciendo sonar el acorde.
   - **BeatGrid a Letra (`onBeatClick`)**: Al hacer clic en cualquier pulso del BeatGrid, `onBeatClick` hace sonar el acorde (`handlePlayChord`), actualiza el reproductor y enclava el pulso. `SongLyricsRenderer` resalta la sección, línea y acorde activo cuando `currentBeatIndex >= 0` tanto en reproducción como en pausa, y realiza autoscroll suave localizado hacia la línea activa para mantenerla siempre visible.
10. **Offsets Acumulativos de Pulsos por Compás (`measureBeatOffsets`)**:
    - NUNCA calcular índices de pulso multiplicando compases rígidamente por 4 (`compasIdx * 4`).
    - Las canciones pueden contener compases de duración variable (ej. compases de silencio de 2 tiempos `2T`, anacrusas, compases en 3/4 o 6/8).
    - El índice de pulso de cualquier compás se calcula sumando acumulativamente `compas.acordes.length` (`measureBeatOffsets`).
    - Al hacer clic en una sección (`handleSelectSection`), se ubica el primer pulso real con `measureBeatOffsets[targetGlobalCompasIdx]`, se reproduce su primer acorde (`handlePlayChord(firstChord)`) y se empareja por nombre exacto de sección antes de recurrir al índice.
