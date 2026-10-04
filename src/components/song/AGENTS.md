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
11. **Arrastre del Marcador Rítmico / Needle Scrubber en Cinta (`BeatGrid.jsx`)**:
    - En el modo Ribbon, el marcador de aguja permanece **fijo en el centro geométrico** (`left: 50%`) y cuenta con un manejador interactivo de arrastre horizontal (`cursor-ew-resize`).
    - Al arrastrar el marcador hacia la derecha o izquierda, la aguja NO se desplaza: se desplaza suavemente la cinta del BeatGrid por debajo de ella para avanzar o retroceder.
    - Durante el arrastre, se detecta en tiempo real el pulso ubicado bajo la aguja (`findBeatUnderNeedle`), iluminándolo y desplazando la reproducción de YouTube en tiempo real de forma silenciosa.
    - Al soltar el marcador (`pointerup`), se centra el compás, se hace sonar el acorde correspondiente y se afianza el pulso seleccionado.

---

## 4. Permisos de Edición y Canciones Instrumentales
1. **Acceso Exclusivo para Administradores**:
   - El botón `Editar` en `SongHeaderControls.jsx` se renderiza **únicamente** cuando `isAdmin` es `true` (`currentUser.tier === 'ADMIN'`).
   - Para usuarios Free o Pro, el botón se oculta por completo de la barra de controles.
   - Los endpoints `POST /api/persistence/songs` y `POST /api/persistence/songs/restore-original` validan que el usuario solicitante posea rol `ADMIN`, rechazando con `403 Forbidden` cualquier intento no autorizado.
2. **Flujo de Canción Instrumental ("Completamente instrumental")**:
   - En `SongLyricsVisualEditor.jsx`, cuando una canción no tiene letra asignada (`isInstrumentalSong` retorna `true`), se despliega el aviso con dos opciones: *"➕ Añadir Letra a esta Canción"* y *"Completamente instrumental"*.
   - Al presionar *"Completamente instrumental"*, se asigna `isInstrumental: true` en la base de datos, se desbloquea el lienzo de diseño para estructurar compases y acordes, y se previene que vuelva a mostrarse el bloqueo de letra faltante (`isExplicitInstrumental = true`).
   - En el visor de lectura (`SongLyricsRenderer`), la canción instrumental renderiza sus secciones y acordes de forma regular y limpia sin interrupciones.

---

## 5. Escalado de BPM y Subdivisión/Fusión de Compases
1. **Controles de Escalado (x2 / ÷2)**:
   - Disponibles tanto en la barra superior de `SongLyricsVisualEditor.jsx` como en la cabecera del BeatGrid en `ChordCatalogPanel.jsx` durante el modo edición.
   - Permiten duplicar el tempo (`x2`, llamando a `doubleGridBpm`) o reducirlo a la mitad (`÷2`, llamando a `halveGridBpm`).
2. **Subdivisión Rítmica y Preservación de Tiempos**:
   - `doubleGridBpm`: Convierte cada compás de 4 tiempos en 2 compases de 4 tiempos duplicando acordes (`[c0, c0, c1, c1]` y `[c2, c2, c3, c3]`), e interpolando linealmente los `beatTimes` para sincronización milimétrica con YouTube.
   - `halveGridBpm`: Fusiona parejas consecutivas de compases en uno solo (`[c0, c2, c4, c6]`), preservando tiempos de inicio de sección (`secTime`) y etiquetas de sección.
   - `updateTextBpm`: Actualiza dinámicamente la etiqueta `[BPM @ <val>]` en el texto de la canción. Al guardar cambios, la nueva estructura de compases se persiste en `syncData`.

---

## 6. Etiqueta Analógica de Video (`SongSheetView.jsx` & `FloatingVideoPaper.jsx`)
1. **Acción Única de Minimizado**:
   - `FloatingVideoPaper.jsx` cuenta con un único control de colapso/minimizado (`Minimize2`), prescindiendo de cierres destructivos.
   - Al presionar dicho botón, el reproductor de video se minimiza y se transforma en la pestaña analógica ("etiqueta") abajo a la derecha (`bottom-6 sm:bottom-8`).
2. **Reproducción Continua en Segundo Plano (Sin Interrupciones)**:
   - Al minimizar a la etiqueta, el iframe de YouTube **NUNCA se destruye ni se detiene** (mantiene su ciclo de vida activo sin unmount ni reinicio de `window.YT.Player`).
   - Si el video estaba sonando, continúa reproduciéndose fluidamente en segundo plano.
   - El pulso rítmico y el seguimiento de tiempo con el BeatGrid continúan sincronizados en tiempo real.
   - La etiqueta inferior derecha muestra un indicador activo de pulso y reproducción en vivo (`animate-ping` + `animate-pulse` en el botón `Play`).
   - Al presionar la etiqueta, el reproductor flotante vuelve a la pantalla de inmediato, continuando la reproducción en el segundo exacto.
