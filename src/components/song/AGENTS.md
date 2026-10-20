# Reglas y Directrices del Cancionero & Memorabilia (`src/components/song/`)

Este archivo rige para los componentes del visor de canciones (`SongSheetView`, `SongLyricsRenderer`, `BeatGrid`, `SongMemorabiliaDesk`, `SongReleaseArtifact`).

---

## 1. Memorabilia y Estuches Vectoriales
1. **Mapeo de Tipos de Versión y Contenedores**:
   - `studio` y `acoustic`: Usan `AlbumDiscCase.jsx` con el SVG base `/cd-2.svg` (estuche de disco acrílico).
   - `live`: Usa `TicketStubCase.jsx` con `/ticket.svg` (entrada/ticket vintage, foto en `#photo`).
   - `soundtrack` y `session`: Usan `MovieFilmCase.jsx` con `/movie.svg` (fotograma de película, foto en `#photo` con overlay `/57E67BC6.png`).
2. **Foto de Artista (Polaroid) y Manejo de Múltiples Artistas**:
   - Polaroids apiladas arrastrables con rotación orgánica y navegación secuencial (<kbd>←</kbd> / <kbd>→</kbd>).
   - Guardar una foto desde el modal actualiza `updateArtistImage`, sincronizando el perfil individual del artista en la tabla `Artist`.
   - Si la edición corresponde a un artista secundario (`activeArtistIndex > 0`), solo se actualiza dicho artista y el array `song.artists`; NUNCA se sobreescribe `song.artistImage` (reservada para el artista principal #0).
   - **Prohibición de Asignación Automática**: Si un artista o un disco no están en la base de datos o no tienen una imagen asignada (`image: null`, `albumCover: null`), NUNCA se auto-descubre ni se asigna foto automáticamente en segundo plano. Se renderizan directamente sus respectivos contenedores analógicos por defecto (`ArtistPolaroid` con silueta analógica en `#292019` y tipografía caligráfica, y `AlbumDiscCase` con vinilo labrado dorado). La asignación de imágenes es estrictamente manual a través de la curación o el modal de edición de memorabilia.
   - Al actualizar metadatos o fotos, `onUpdateSong` sincroniza la lista `userSongs` en `NotebookSpread`, garantizando que al navegar ("Volver a Canciones") y reabrir el tema no se revierta a valores desactualizados.
3. **Persistencia de Edición**:
   - Al editar carátula, álbum, año o versión, llamar a `updateSongPreferences` con `currentUser` para aislar preferencias y actualizar el modelo `Album`.
4. **Búsqueda Reactiva Multifuente en el Estudio de Carátulas (`MemorabiliaImageModal.jsx`)**:
   - **Desplegable de Fuentes**: El selector de fuentes de búsqueda se presenta como un menú desplegable (`<select>`), integrando Discogs (`discogs`), Deezer (`deezer`), Apple Music / iTunes (`itunes`), Wikipedia (`wikipedia`) y Cover Art Archive (`coverart`).
   - **Soporte para Discogs y Formatos JPEG**: Soporte nativo para carátulas de Discogs (`discogs.com`, `i.discogs.com`) y resolución de URLs de releases mediante scraper sigiloso (o API token si se define `DISCOGS_TOKEN`). Admite explícitamente URLs y archivos con extensión `.jpeg`, `.jpg`, `.png` y `.webp`.
   - **Búsqueda Dinámica y Debounce**: La barra de búsqueda ejecuta consultas debounced (400ms) al tipear, además de soportar <kbd>Enter</kbd> y el botón manual "Buscar".
   - **Desacoplamiento de Términos**: Las sugerencias de carátulas (`searchAlbumArtworkOptions`) utilizan el término textual tipeado por el usuario (`searchQuery`) como consulta principal, sin quedar ancladas al `songTitle` o `artistName` original de la canción.
   - **Resiliencia de Agregadores**: En el backend (`/api/artwork/search`), si una búsqueda por entidad álbum no arroja resultados inmediatos (ej. al buscar por nombre de canción como "Iris"), se ejecutan fallbacks automáticos hacia búsqueda de pistas (`tracks` en Deezer y `entity=song` en iTunes) para extraer el arte del disco al que pertenece la canción.
   - **Resiliencia Visual en Estuches Vectoriales**: Los estuches (`AlbumDiscCase`, `TicketStubCase`, `MovieFilmCase`, `ArtistPolaroid`) resetean automáticamente su estado `imageError` cuando `actualUrl` cambia, usan `referrerPolicy="no-referrer"` (evitando `crossOrigin="anonymous"` que bloqueaba CDNs sin cabecera CORS como Discogs) e implementan fallback automático en cascada hacia el proxy `/api/artwork/proxy?url=...` si la conexión directa al CDN falla.

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
   - NUNCA dividir los tiempos o pulsos equitativamente mediante divisiones lineales ciegas (`cIdx * Math.floor(lineBeats.length / chords.length)`). Cada acorde de la línea se mapea contra los eventos reales de cambio o entrada de acorde en los compases asignados (`compasChordEvents`), asignando el pulso global exacto (`startBeatGlobal`), el tiempo de inicio (`startTime`) y extendiendo su ventana de vigencia hasta el inicio del siguiente acorde.
   - Si no hay timestamps explícitos por pulso, los tiempos de compás se interpolan monótonamente a partir del BPM y los tiempos de inicio de sección para evitar timestamps superpuestos o estáticos.
7. **Alineación de Secciones y Compases (`alignCompasesWithSongSections`)**:
   - Al alinear compases con secciones de la letra (`[Sección @ time]`), si los compases ya traen secciones estructuradas coincidentes (`isAlreadyStructured`), se preserva su asignación métrica intacta y únicamente se sincroniza el `secTime` en el primer compás de cada sección, limpiando marcas redundantes en compases internos.
   - Para compases genéricos (de Chordify), se interpola un mapa temporal continuo monótono sobre todos los compases para asociar cada sección al compás más cercano de forma robusta, garantizando que el primer compás de la sección reciba el `secTime` y que los compases siguientes no hereden marcas espurias.
8. **Tolerancia, Latch y Monotonicidad en Beat Tracking (`useYouTubeSync.js`)**:
   - Al buscar pulsos activos en `flatBeats`, se aplica una tolerancia de 60ms (`BEAT_EPSILON = 0.06`) para absorber el aterrizaje de keyframes de video de YouTube y la latencia perceptual.
   - `jumpToBeat` establece un `seekLatchRef` con expiración breve para enclavar el pulso seleccionado de forma estable e inmediata.
   - En `timingBlocks`, se valida estrictamente que los tiempos de inicio de cada bloque sean monótonamente crecientes (`blocks[i].startTime > blocks[i - 1].startTime`), previniendo saltos erráticos o duraciones negativas durante la reproducción tanto en el visor como dentro del editor.
9. **Modal Centrado de Opciones de Sección (`SectionGutterHeader.jsx`)**:
   - El menú de configuración de sección (renombrado, duplicar, reordenar arriba/abajo, sincronizar tiempo del video y eliminar) se renderiza mediante `createPortal(..., document.body)` con `z-[9999]` y fondo oscurecido (`bg-black/60 backdrop-blur-xs`), asegurando que quede siempre al frente de todo el cuaderno, pestañas, anillas y reproductor de video.
   - Soporta cierre con la tecla <kbd>Escape</kbd> y clic en el backdrop.
10. **Navegación Bidireccional Letra <-> BeatGrid**:
    - **Letra a BeatGrid (`handleSelectChordFromLyrics`)**: Al hacer clic en cualquier acorde en `SongLyricsRenderer`, se despacha su pulso global exacto (`beatIdx`) y timestamp calculado en `lineTimingsMap`. `SongSheetView` ejecuta `jumpToBeat(chordContext.beatIdx)`, posicionando el cursor del BeatGrid en el pulso exacto (ej. pulso 3 de un compás dividido) sin heurísticas de ratios ni saltos al inicio de compás, y haciendo sonar el acorde.
    - **BeatGrid a Letra (`onBeatClick`)**: Al hacer clic en cualquier pulso del BeatGrid, `onBeatClick` hace sonar el acorde (`handlePlayChord`), actualiza el reproductor y enclava el pulso. `SongLyricsRenderer` resalta la sección, línea y acorde activo cuando `currentBeatIndex >= 0` tanto en reproducción como en pausa, y realiza autoscroll suave localizado hacia la línea activa para mantenerla siempre visible.
11. **Offsets Acumulativos de Pulsos por Compás (`measureBeatOffsets`)**:
    - NUNCA calcular índices de pulso multiplicando compases rígidamente por 4 (`compasIdx * 4`).
    - Las canciones pueden contener compases de duración variable (ej. compases de silencio de 2 tiempos `2T`, anacrusas, compases en 3/4 o 6/8).
    - El índice de pulso de cualquier compás se calcula sumando acumulativamente `compas.acordes.length` (`measureBeatOffsets`).
    - Al hacer clic en una sección (`handleSelectSection`), se ubica el primer pulso real con `measureBeatOffsets[targetGlobalCompasIdx]`, se reproduce su primer acorde (`handlePlayChord(firstChord)`) y se empareja por nombre exacto de sección antes de recurrir al índice.
12. **Arrastre del Marcador Rítmico / Needle Scrubber en Cinta (`BeatGrid.jsx`)**:
    - En el modo Ribbon, el marcador de aguja permanece **fijo en el centro geométrico** (`left: 50%`) y cuenta con un manejador interactivo de arrastre horizontal (`cursor-ew-resize`).
    - Al arrastrar el marcador hacia la derecha o izquierda, la aguja NO se desplaza: se desplaza suavemente la cinta del BeatGrid por debajo de ella para avanzar o retroceder.
    - Durante el arrastre, se detecta en tiempo real el pulso ubicado bajo la aguja (`findBeatUnderNeedle`), iluminándolo y desplazando la reproducción de YouTube en tiempo real de forma silenciosa.
    - Al soltar el marcador (`pointerup`), se centra el compás, se hace sonar el acorde correspondiente y se afianza el pulso seleccionado.
13. **Métricas Variables Multi-Alcance y Desplazamiento de Pulsos en Cadena (Ripple Shift)**:
    - En modo edición (`isEditMode`), al hacer clic en el número de compás (`C.#` en Ribbon o `Compás #` en Grid), se abre el menú contextual de configuración métrica (`renderMeasureModal` en `BeatGrid.jsx`).
    - Permite elegir el **Alcance (`measureScope`)**:
      - `single` (*"Solo este compás"*): Ajusta únicamente el compás elegido y desplaza los pulsos siguientes hacia adelante (Ripple Shift) conservando la métrica propia de cada compás posterior y creando compases extra al final si sobran pulsos.
      - `section` (*"Sección (Nombre)"*): Reagrupa todos los pulsos de esa sección en la métrica elegida (`3/4`, `4/4`, `2/4`, `6/8`) sin alterar las demás secciones (ideal para canciones con cambios de compás entre estrofa y estribillo).
      - `from_here` (*"Desde aquí al final"*): Reagrupa todos los pulsos desde ese compás hasta el final de la canción en la nueva métrica, preservando las fronteras de sección.
      - `all` (*"Toda la canción"*): Reagrupa todos los pulsos de la canción entera en compases de la métrica seleccionada (ej. convertir toda una canción como *Pobre Flor* a `3/4`), preservando todos los `beatTimes` y re-anclando los inicios de sección (`seccion`, `secTime`).
    - `useSongRhythmGrid.js` expone `handleChangeMeasureLength(measureIdx, newLength, scope)` y calcula dinámicamente los índices de compás en `handleUpdateBeatGridChord` basándose en los anchos reales de cada compás.
    - En modo normal de lectura y reproducción, la visualización se mantiene limpia mostrando las celdas exactas correspondientes sin badges invasivos.

---

## 4. Permisos de Edición y Canciones Instrumentales
1. **Acceso Exclusivo para Administradores**:
   - El botón `Editar` en `SongHeaderControls.jsx` se renderiza **únicamente** cuando `isAdmin` es `true` (`currentUser.tier === 'ADMIN'`).
   - Para usuarios Free o Pro, el botón se oculta por completo de la barra de controles.
   - Los endpoints `POST /api/persistence/songs` y `POST /api/persistence/songs/restore-original` validan que el usuario solicitante posea rol `ADMIN`, rechazando con `403 Forbidden` cualquier intento no autorizado.
2. **Flujo de Canción Instrumental ("Completamente instrumental" y "➕ Añadir Letra a esta Canción")**:
   - En `SongLyricsVisualEditor.jsx`, cuando una canción no tiene letra asignada (`isInstrumentalSong` retorna `true`), se despliega el aviso con dos opciones: *"➕ Añadir Letra a esta Canción"* y *"Completamente instrumental"*.
   - Al presionar *"➕ Añadir Letra a esta Canción"*, se abre directamente el **Asistente de Sincronización Rítmica (`SteppedSyncWizardModal`)** unificado (eliminando el antiguo `AddLyricsModal`).
   - Al presionar *"Completamente instrumental"*, se asigna `isInstrumental: true` en la base de datos, se desbloquea el lienzo de diseño para estructurar compases y acordes, y se previene que vuelva a mostrarse el bloqueo de letra faltante (`isExplicitInstrumental = true`).
   - En el visor de lectura (`SongLyricsRenderer`), la canción instrumental renderiza sus secciones y acordes de forma regular y limpia sin interrupciones.

---

## 5. Escalado de BPM y Subdivisión/Fusión de Compases Multi-Métrica
1. **Control Unificado de Escalado (x2 / ÷2)**:
   - Disponible en la cabecera del BeatGrid en `ChordCatalogPanel.jsx` durante el modo edición (`isEditMode`).
   - Permite duplicar el tempo (`x2`, llamando a `doubleGridBpm`) o reducirlo a la mitad (`÷2`, llamando a `halveGridBpm`).
   - En modo edición (`isEditMode`), `handleScaleBpm` modifica únicamente `draftContent` y `activeCompases` sin mutar `currentContent`, garantizando que si el usuario cancela la edición la canción original permanezca intacta.
2. **Subdivisión Rítmica Polimétrica y Preservación de Tiempos (`3/4`, `4/4`, `2/4`, `6/8`)**:
   - `doubleGridBpm`: Lee la longitud real $N = \text{acordes.length}$ de cada compás individual, subdivide cada uno de sus $N$ pulsos en 2 pulsos interpolando linealmente los puntos medios de `beatTimes` ($2N$ pulsos en total), y los divide en **2 compases de $N$ tiempos** que conservan la métrica original de ese compás (ej. un compás de `3/4` se divide en 2 compases de `3/4` `[c0, c0, c1]` y `[c1, c2, c2]`; uno de `4/4` en 2 de `4/4`; uno de `6/8` en 2 de `6/8`). Funciona también en canciones con cambios de métrica entre secciones.
   - `halveGridBpm`: Fusiona parejas consecutivas de compases que comparten la misma sección y métrica $N$, tomando los pulsos pares (`0, 2, ..., 2N-2`) para reconstruir 1 compás de $N$ tiempos sin cruzar fronteras de sección ni mezclar métricas distintas.
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

---

## 7. Filtrado y Ponderación Musical de YouTube (`server/services/youtube.js`)
1. **Criterio Estilo Chordify**:
   - Descarta videos no musicales: tutoriales (*"cómo tocar"*, *"guitar lesson"*, *"clases de"*), podcasts, entrevistas, reacciones, álbumes completos / compilaciones (*"grandes éxitos"*, *"disco completo"*), loops (*"10 hours"*) y transmisiones en vivo (`LIVE`).
   - Límite de duración estricto: rechaza videos menores a **1:15 min (75s)** o mayores a **12:00 min (720s)**.
2. **Scoring y Jerarquía de Resultados**:
   - **+50 pts**: Pistas oficiales de discográfica en canales Topic (`- Topic`).
   - **+35 pts**: Canales oficiales de artista verificado (`BADGE_STYLE_TYPE_VERIFIED_ARTIST` / `AUDIO_BADGE`).
   - **+30 pts / +25 pts**: Títulos con sufijos *"Official Audio"* o *"Official Video"* / *"Videoclip"*.
   - Penalización a covers (`-15 pts`) o karaokes (`-10 pts`), asegurando que las pistas originales de estudio encabecen la lista.
3. **Consumo Centralizado**:
   - Tanto el buscador de canciones de Chordify (`chordify-scraper.js`) como el selector de video (`/api/songs/search/youtube` en `routes/songs.js`) delegan en `searchYouTubeMusic`, garantizando resultados musicales limpios y de alta fidelidad rítmica.

---

## 8. Modularización del Visor de Canciones (`SongSheetView.jsx`)
1. **Separación de Responsabilidades**:
   - `SongSheetView` no contiene lógica monolítica de cálculo de compases ni llamadas de persistencia de arreglos.
2. **Hook de Rítmica (`useSongRhythmGrid.js`)**:
   - Encapsula `initialCompases`, `parsedCompases`, `transposedCompases`, `measureBeatOffsets`, `totalBeats`, `flatBeats`, `currentBpm`, `handleScaleBpm`, y helpers de compases (`handleAddMeasureToSection`, `handleUpdateBeatGridChord`, `handleChangeMeasureLength`).
   - Provee el helper exportado `useCurrentPlayingChord` para resolver el acorde activo y distancia al siguiente pulso con cero dependencia circular.
3. **Hook de Arreglos (`useSongArrangement.js`)**:
   - Gestiona estado de edición (`isEditMode`), borradores (`draftContent`), guardado de versiones personalizadas (`handleSaveCustomVersion` limpiando separadores invisibles de sílabas `\u200D`), restauración del original (`handleRestoreOriginal`) e instrumentalización.

---

## 9. Asistente Unificado de Letra y Sincronización Rítmica (`SteppedSyncWizardModal.jsx`)
1. **Arquitectura Modular (`syncWizard/`)**:
   - [SteppedSyncWizardModal.jsx](file:///e:/Proyectos/songbook/src/components/song/editor/SteppedSyncWizardModal.jsx): Orquestador unificado para añadir/editar letra y sincronizarla con el audio, con Etapa 1 (pegar letra, insertar etiquetas de sección y opción de montaje directo sin sincronizar) y Etapa 2 (teleprompter con reloj en vivo, barra de progreso de audio interactiva y botonera).
   - [useSteppedSyncEngine.js](file:///e:/Proyectos/songbook/src/components/song/editor/syncWizard/useSteppedSyncEngine.js): Custom hook que recibe los `compases` reales del BeatGrid, consulta el estado del reproductor (`playerInstance`) cada 100ms (`liveCurrentTime`, `effectiveDuration`, `isVideoPlaying`, `seekToTime`), realiza snapping automático a compases (`snapToNearestMeasure`), y gestiona la cola de frases y secciones (<kbd>Espacio</kbd>, <kbd>C</kbd>, <kbd>V</kbd>, <kbd>X</kbd>, <kbd>Backspace</kbd>, <kbd>Enter</kbd>, <kbd>Shift+Enter</kbd>, <kbd>Esc</kbd>).
   - [SectionClosingModal.jsx](file:///e:/Proyectos/songbook/src/components/song/editor/syncWizard/SectionClosingModal.jsx): Al presionar <kbd>X</kbd>, cierra siempre la sección actual (`currentSectionName`) y solicita el nombre de la **nueva sección que comienza ahora** (con sugerencias inteligentes según la sección previa y 2 acciones: *"Iniciar [Sección] [Enter]"* o *"Iniciar + Marcar 1ª oración [Shift+Enter]"*), eliminando el antiguo bug de `[Siguiente Sección]`.
   - [LyricsCorrectionModal.jsx](file:///e:/Proyectos/songbook/src/components/song/editor/syncWizard/LyricsCorrectionModal.jsx): Diálogo contextual para corregir tipografías o separar versos durante la pausa sin perder timestamps.
   - [wizardChordDistributor.js](file:///e:/Proyectos/songbook/src/components/song/editor/syncWizard/wizardChordDistributor.js): Algoritmo puro de ensamblado armónico (`buildFinalSynchronizedContent`, `buildDirectMountedContent`, `buildChordTimeline`, `attachChordsToWords`). Construye la línea de tiempo directamente desde los `compases` reales del BeatGrid (aprovechando `beatTimes` exactos de Chordify cuando existen).
2. **Flujo Guiado de 2 Etapas y Montaje Directo**:
   - **Etapa 1: Letra Limpia + Montaje Directo**: Permite pegar/escribir la letra, insertar etiquetas rápidas de sección (`[Intro]`, `[Verso 1]`, `[Coro]`, etc.) y elegir entre **"Montar letra directo sin sincronizar"** (`buildDirectMountedContent`, que estructura la letra inmediatamente en el Editor Visual conservando los compases del BeatGrid y desactivando `isExplicitInstrumental`) o **"Siguiente: Sincronizar con Audio"**.
   - **Etapa 2: Sincronización con el BeatGrid**:
     - Encabezado con reloj en tiempo real (`liveCurrentTime / effectiveDuration`) y **barra de progreso de audio interactiva** (sin reproductor de video flotante superpuesto).
     - Primera sección se nombra al inicio (ej. `[Intro]`). Al pulsar <kbd>X</kbd>, guarda la sección en curso y pide nombrar la nueva sección que arranca en ese instante.
     - Marcado de oraciones: <kbd>C</kbd> marca el inicio del verso actual (y cierra automáticamente el anterior si seguía abierto). <kbd>V</kbd> es opcional para marcar el final del verso antes de un hueco o pasaje instrumental (conservando los acordes de ese hueco como acordes de cola o línea instrumental).
     - Al presionar *"Finalizar y Montar Acordes en Editor"* (o *"Guardar Progreso"*), si el último verso quedó abierto sin <kbd>V</kbd>, se cierra automáticamente de forma limpia sin bloquear al usuario.
3. **Preservación de Acordes Instrumentales y Huecos Post-[V]**:
   - En secciones puramente instrumentales sin frases (`[Intro]`, `[Solo]`, `[Interludio]`), `buildFinalSynchronizedContent` extrae todos los acordes reales de `chordEvents` dentro de `[sec.startTime, secEndTime)` en grupos de hasta 4 acordes por línea, en lugar de reemplazarlos por `[𝄾 (4T)]`.
   - En canciones originalmente instrumentales (`wasOriginallyInstrumental`), no se arrastran bloques vacíos antiguos al final del texto sincronizado.

---

## 10. Extracción de Secciones Instrumentales de Chordify (`chordsLine`)
1. **Doble Contrato de LeadSheet en Chordify**:
   - En canciones con secciones instrumentales (`Intro`, `Interlude`, `Solo/Inst`, `Outro`), la API de hidratación de Chordify no genera `lyricLine` sino `chordsLine` (`c.line.chordsLine.chords`).
   - El scraper [`chordify-scraper.js`](file:///e:/Proyectos/songbook/server/services/chordify-scraper.js) extrae y normaliza tanto `lyricLine` (letras con acordes embebidos) como `chordsLine` (líneas puras de acordes como `[G]   [C]   [D]`), evitando que las secciones instrumentales queden vacías en la base de datos o en el visor de partituras y letras [`SongLyricsRenderer.jsx`](file:///e:/Proyectos/songbook/src/components/song/SongLyricsRenderer.jsx).
2. **Preservación de `chordsLine` en Secciones Mixtas (Intro, Solos, Interludios)**:
   - Muchas canciones (como *Iris* de Goo Goo Dolls) poseen secciones que combinan un preludio o pasaje instrumental (`chordsLine`) seguido por una línea vocal (`lyricLine`) dentro de la misma sección (ej. `[Intro @ 1.0]`, `[Verse 2 @ 69.0]`, `[Inst @ 146.1]`).
   - NUNCA condicionar la extracción de `chordsLine` a la ausencia de líneas líricas (`!hasLyricLines`). Cada `chordsLine` representa un evento musical cronológico real de compases instrumentales que debe emitirse en el cancionero como renglón interactivo de acordes.
3. **Separación de Acordes Instrumentales Embebidos en `lyricLine` (`sanitizeLyricLineSegments`)**:
   - En datos de hidratación de Chordify (`leadSheet.data.value`), cuando ocurren riffs instrumentales, fills de guitarra, preludios o arrastres de sección dentro de una `lyricLine`, Chordify inserta **2 o más espacios consecutivos (`"  "`, `"   "`, `"       "`)** en `lyricLine.lyrics` y posiciona esos acordes instrumentales sobre los espacios en blanco (ej. *Metallica - Whiskey in the Jar*, `boanuwUMNNQ`).
   - `sanitizeLyricLineSegments` en [`chordify-scraper.js`](file:///e:/Proyectos/songbook/server/services/chordify-scraper.js) inspecciona cada segmento de `lyricLine`:
     - **Acordes de arrastre entre secciones (`droppedCarryoverChord`)**: Si el primer segmento de la primera línea de una sección es puramente espacios en blanco con el mismo acorde que cerraba la sección anterior y sólo dura 1 compás antes del acorde real de entrada de la sección, se descarta como *bleed* de frontera y se adelanta el `startTime` de la sección al compás donde entra el primer acorde real.
     - **Riffs instrumentales iniciales (`leadingInstrumentalChords`)**: Si una línea comienza con acordes sobre espacios puros (o palabras cortas sueltas de speech-to-text intercaladas con huecos multi-espacio en secciones `Inst`/`Solo`/`Intro`), dichos acordes instrumentales se extraen y se fusionan con la `chordsLine` instrumental previa de la misma sección (o se emiten como renglón instrumental independiente antes del verso).
     - **Fills instrumentales finales (`trailingInstrumentalChords`)**: Si un segmento vocal termina en 2+ espacios seguidos por acordes sobre espacios o al final de la cadena (`lyricIndex === lyrics.length`), esos acordes se separan a una línea instrumental posterior (ej. `[Dm]   [Bb]` al final del primer verso de `Verse 2` en *Whiskey in the Jar*).
4. **Consumo de Compases Sostenidos, Acordes Repetidos por Compás, Frases Sin Acorde Inicial y Arrastre Visual (`lyricsTimingCalculator.js` & `SongLyricsRenderer.jsx`)**:
   - Cuando una línea vocal escribe un único `[Chord]` para varios compases consecutivos del mismo acorde (ej. un solo `[F]` en la letra mientras el BeatGrid sostiene 2 compases de `F`), el cursor de compases en `lineTimingsMap` avanza a través de los compases que sostienen dicho acorde y colapsa los eventos entre compases porque el siguiente acorde esperado en `lineChords` es distinto (`expectedNextChord !== lastSeenChord`).
   - En cambio, cuando una línea escribe explícitamente un acorde por compás repitiendo el mismo acorde (ej. `[Bm7]   [Bm7]` o `[A]   [A]` en canciones sin letra o generadas por `formatCompasesToText`), `isExplicitRepeatInLine` detecta que `lineChords[chordsAccum] === lastSeenChord` y asigna 1 compás a cada ocurrencia en `rawMeasureEvents` / `compasChordEvents`, sin robar compases de la línea siguiente cuando `nextLineFirstChord === lastSeenChord`.
   - Si la siguiente línea comienza con una frase vocal sin etiqueta de acorde inicial (`hasLeadingUnchordedPhrase`, `>= 3` palabras antes del primer `[Chord]`, cantadas sobre el acorde sostenido de la línea previa, como `"As I was going over the [Dm]Cork..."`), el bloque sostenido se reparte entre ambas líneas y esos compases iniciales (`leadInCompasesCount`) se excluyen al mapear `compasChordEvents` para que el primer `[Chord]` explícito de la línea apunte exactamente al compás donde cambia el acorde (ej. `C.15` para `[Dm]Cork`).
   - Durante los compases de entrada de una frase sin acorde inicial (`resolvedChordRank === -1`) o en líneas vocales sin acordes propios que continúan el acorde previo, `resolveActivePlaybackLocation` busca hacia atrás con `findPreviousChordLocation` y expone `activeChordSectionIdx` y `activeChordLineIdx` apuntando al último acorde de la línea anterior (ej. el último `[F]` de `[Dm] [F] [Dm] [F]`), manteniéndolo iluminado en `SongLyricsRenderer.jsx` mientras la línea activa actual ya está resaltada. NUNCA buscar hacia adelante en la línea actual por coincidencia de nombre (`currentPlayingChord`), ya que iluminaría falsamente un acorde homónimo al final del verso (como `[F]money` en `C.19` durante `C.13`).
5. **Omisión Total de Marcas de Silencio en el Visor de Cancionero y Estado Neutro de Autofollow (`SongLyricsRenderer.jsx`, `lyricsTimingCalculator.js` & `measureParser.js`)**:
   - En `SongLyricsRenderer.jsx`, las marcas de silencio (`[𝄾]`, `[𝄽]`, `[𝄾 (4T)]`, `[N]`, `silencio`) se filtran mediante `IGNORED_CHORD_REGEX`, `parseSongStructure` y `extractLineChords`. NUNCA deben renderizarse badges de silencio (`𝄾 2T`) en la hoja de letra/acordes ni incluirse en el arreglo `lineChords` de `lineTimingsMap` (ya que desplazarían en +1 el resaltado del primer acorde real como `Dm`).
   - En `measureParser.js`, los tokens `"N"` de `chordsLine` y `lyricLine` se descartan al construir `leadSheetText`, mientras que los compases completos de silencio inicial (`["𝄾", "𝄾", "𝄾", "𝄾"]`) desde el primer downbeat (`beatNum === 1`) se preservan en `compases` para que el `BeatGrid` muestre el conteo visual de los pulsos de silencio previos al primer acorde.
   - Durante los compases de silencio inicial previos a la entrada de la primera línea musical (`currentBeatIndex < firstTimedLine.startBeatGlobal` o `currentTime < firstTimedLine.startTime`), `resolveActivePlaybackLocation` en `lyricsTimingCalculator.js` retorna estado neutro (`activeSectionIdx: -1, activeLineIdx: -1, activeChordRank: -1`), evitando que los fallbacks lineales marquen erróneamente versos o acordes antes de que empiece la música.

---

## 11. Barra de Controles de Cabecera y Metadatos (`SongHeaderControls.jsx`)
1. **Botones de Acción Compactos con Tooltip en Hover**:
   - Los botones de acción (`Editar`, `Guardar`, `Favorito` y `Al Setlist`) presentan una cuadrícula compacta (`w-8 h-8 rounded-xl`) mostrando exclusivamente su icono vectorial, liberando espacio horizontal valioso en el atril/cuaderno.
   - Cada botón incluye un tooltip flotante superior (`absolute -top-8 left-1/2 -translate-x-1/2`) con opacidad en hover (`group-hover:opacity-100`) para revelar su descripción (`Editar`, `Guardada`, `Favorito`, `Al Setlist`).
2. **Metadatos de Álbum Inline**:
   - En lugar de ocupar una fila separada con *"De: <Album>"*, el nombre del álbum y su año de lanzamiento se ubican directamente al lado del nombre del artista con el icono de vinilo/CD (`Disc`), unificando los créditos en una sola línea elegante: `<Artista> • 💽 <Álbum> (<Año>)`.

---

## 12. Detección de Letras Sincronizadas y Distintivo en Búsqueda (`SongSearchModal.jsx`, `OnlineOptionsList.jsx`)
1. **Distintivo 'Incluye letra'**:
   - En los resultados de búsqueda de Chordify (tanto en `SongSearchModal.jsx` como en `OnlineOptionsList.jsx` / `useSongSearch.js`), se muestra un distintivo verde esmeralda (`bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 shadow-xs`) con el icono `AlignLeft` y el texto *"Incluye letra"*.
   - Se alimenta inmediatamente de la caché en SQLite (`ChordifyCache` y canciones canónicas `Song`), y ejecuta una verificación asíncrona en segundo plano (`POST /api/songs/chordify/check-lyrics`) para enriquecer las tarjetas en tiempo real sin degradar la latencia de búsqueda.
2. **Alineación Métrica y Secciones Estructurales de Chordify (`getChordifyBeatGrid`)**:
   - `getChordifyBeatGrid` correlaciona las secciones reales del leadSheet (`Intro`, `Verse`, `Chorus`, etc.) directamente con los compases downbeat (`beatNum === 1`), asignando `seccion` y `secTime` de forma estrictamente monótona.
   - Preserva el título y artista originales de la búsqueda y rechaza el título genérico `"Chordify"`, garantizando que la canción se guarde en `Song` y `syncData` con sincronía perfecta de compases y secciones.
3. **Preservación de Líneas Instrumentales vs. Fusión de 2 Líneas (`alignChordsWithLyrics`)**:
   - Si el texto ya posee formato de acordes embebidos (Chordify / ChordPro), `alignChordsWithLyrics` no aplica la fusión de 2 líneas de Ultimate Guitar, preservando las líneas instrumentales independientes (`Intro`, `Solo`, `Interludio`, `Outro`) como renglones de acordes en vez de aplastarlos erróneamente sobre la frase cantada de abajo.
4. **Preservación de Compases Completos de Silencio Inicial en `BeatGrid` (`measureParser.js`, `gridParser.js`, `useYouTubeSync.js`)**:
   - En `measureParser.js`, únicamente se descartan los micro-pulsos sueltos de silencio previos al primer downbeat (`beatNum === 1`, ej. pulsos 3 y 4 entre `0.00s` y `0.56s`). Todos los compases completos de 4 tiempos de silencio (`["𝄾", "𝄾", "𝄾", "𝄾"]`) desde el primer `beatNum === 1` hasta el primer acorde real se conservan en `compases` (ej. `C.1` a `C.4` de `0.56s` a `7.94s` en *Whiskey in the Jar*), permitiendo seguir el conteo rítmico visual en el `BeatGrid` con `𝄾` en cada celda.
   - `alignCompasesWithSongSections` en `gridParser.js` preserva el `secTime` original de `C.1` (`0.56s`) aunque el encabezado `[Intro @ 7.9]` de `leadSheetText` apunte al primer compás con música (`C.5`).
   - En `useYouTubeSync.js`, durante la reproducción activa en la breve ventana previa al primer downbeat (`0 <= time < flatBeats[0].time` con `flatBeats[0].time <= 1.5s`), `currentBeatIndex` se ancla en `0` para que la aguja del `BeatGrid` comience inmediatamente sobre el pulso 1 del compás 1.
5. **Género Musical (`genre`)**:
   - Almacenado canónicamente en `Song.genre` (reemplaza cualquier nomenclatura anterior como *style*).
   - Se renderiza de forma compacta en `SongHeaderControls.jsx` junto al artista, álbum y año, y se edita/filtra desde `DevDatabaseStudio.jsx`.

---

## 13. Modularización del Visor y Editor Visual (`SongSheetView.jsx` & `SongLyricsVisualEditor.jsx`)
1. **Hook de Desplazamiento Automático (`useAutoScroll.js`)**:
   - Encapsula el ciclo de vida `requestAnimationFrame`, velocidad en píxeles/segundo (`scrollSpeed`), pausa manual por interacción de usuario y reanudación automática.
   - Desacopla la lógica de scroll del visor de lectura analógico `SongSheetView.jsx`.
2. **Hook de Definición de Acordes (`useChordDefinitions.js`)**:
   - Consulta la base de datos SQLite (`/api/persistence/chords/lookup`) y mantiene una caché local reactiva en memoria para los acordes de la canción actual.
   - Gestiona variantes preferidas por el usuario y resuelve enharmonías sin saturar el componente de vista.
3. **Barra de Herramientas de Edición y Switcher Visual / Texto (`EditorToolbar.jsx` & `SongLyricsVisualEditor.jsx`)**:
   - `EditorToolbar.jsx` incluye el selector de modo **`Diseño Visual` / `Modo Texto`**, deshacer/rehacer (`Ctrl+Z` / `Ctrl+Y`), asistente de sincronización (`SteppedSyncWizardModal`) y guardado/restauración de versión personalizada.
   - En **`Modo Texto`**, el usuario edita directamente el código ChordPro (`[Intro @ 12.5]`, `[Am]palabra`) en un `textarea` sincronizado con el historial Undo/Redo, permitiendo insertar acordes desde `ChordStampBar`, secciones desde un menú rápido y silencios (`𝄾 2T` / `𝄾 4T`) en la posición del cursor.
4. **División Persistente de Sílabas (`✂️`) y Fusión (`🔗`) (`lyricsBlocks.js` & `WordChordDropSlot.jsx`)**:
   - Al dividir una palabra con `✂️` (`splitWordAtChar`), las sílabas resultantes quedan separadas visualmente en el lienzo sin abrir ningún selector de acordes automático, permitiendo dividir en 2, 3 o más sílabas y arrastrar/estampar acordes después.
   - `reconstructTextFromBlocks` preserva divisiones de sílabas sin acorde mediante el marcador invisible `SYLLABLE_JOINER` (`\u200D`), que se limpia automáticamente en `handleSaveCustomVersion` al guardar en la base de datos.
   - `parseLyricsToVisualBlocks` y `reconstructTextFromBlocks` preservan siempre las etiquetas de metadatos globales (`[BPM @ ...]`, `[Beats @ ...]`, `[Time @ ...]`) en `sections[0].metadataTags`.
5. **Acciones por Renglón y Divisores Compactos (`SongLyricsVisualEditor.jsx`, `SectionBoundaryDivider.jsx`, `AddSectionPopover.jsx`)**:
   - Cada línea en `Diseño Visual` cuenta en su margen derecho con acciones en hover para insertar silencios (`2T`/`4T`), añadir un verso nuevo debajo (`+`) o eliminar el renglón (`🗑️`).
   - `SectionBoundaryDivider.jsx` permanece compacto y oculto por defecto, mostrándose únicamente al pasar el mouse entre líneas (`group-hover/boundary:opacity-100`).
   - Al pie del lienzo visual se presenta un único botón `+ Añadir Sección` que abre `AddSectionPopover`.
6. **Paleta de Estampado Rápido y Edición de Pulsos en BeatGrid (`ChordStampBar.jsx` & `BeatGrid.jsx`)**:
   - `activeStampChord` se comparte entre `SongLyricsVisualEditor` y `BeatGrid`: en modo edición, un clic simple sobre una celda del `BeatGrid` salta a ese pulso en el audio/video (igual que en lectura), **salvo** cuando el Modo Sello (`activeStampChord`) está activo, en cuyo caso estampa el acorde directamente en ese pulso.
   - Hacer **doble clic** sobre cualquier celda del `BeatGrid` en modo edición (o clic en el icono de lápiz en hover) abre el modal selector de acordes (`renderBeatChordModal`) para cambiar el acorde del pulso o marcar silencio (`𝄾`).
7. **Sincronización Bidireccional y Resaltado en Tiempo Real en el Editor Visual (`SongLyricsVisualEditor.jsx`, `WordChordDropSlot.jsx`, `LineChordPrefixSuffix.jsx`)**:
   - `SongLyricsVisualEditor` construye `sectionsForTiming` en correspondencia 1:1 con `visualSections` y utiliza `calculateSectionTimingMap`, `calculateLineTimingsMap` y `resolveActivePlaybackLocation` junto con los compases activos (`compases`), `currentBeatIndex` y `currentPlaybackTime`.
   - **Resaltado en Vivo y Auto-Scroll**: Durante la reproducción o al seleccionar un pulso en el `BeatGrid`, el editor resalta la sección activa (`SectionGutterHeader`), el verso que está sonando (`isLineActive` con barra lateral ámbar y texto en negrita) y el acorde exacto activo (`isChordActive`, tanto en acordes previos `LinePrefixChords`, sobre palabras `WordChordDropSlot` como en acordes finales `LineSuffixChords`), desplazando suavemente el lienzo hacia el verso activo (`canvasScrollRef`).
   - **Clic en Acorde -> BeatGrid y Video**: Al hacer clic en cualquier acorde del lienzo del editor (cuando el Modo Sello no está activo), `handleNavigateToChord` invoca `handleSelectChordFromLyrics` con el `beatIdx` (`startBeatGlobal`) y `targetTime` exactos del acorde, haciendo sonar el acorde y llevando el cursor del `BeatGrid` y el video de YouTube a ese momento sincronizado (doble clic sobre el acorde abre el selector rápido para cambiarlo).
8. **Cálculo Matemático de Tiempos y Secciones (`lyricsTimingCalculator.js`) & Resaltado (`useLyricsSyncHighlight.js`)**:
   - Extrae las funciones puras `parseLineToChordSegments`, `parseSongStructure`, `calculateSectionTimingMap`, `calculateLineTimingsMap` y `resolveActivePlaybackLocation`.
   - `useLyricsSyncHighlight.js` gestiona de forma reactiva la correlación temporal entre el audio/pulsos y los versos de la canción (`activeSectionIdx`, `activeLineIdx`, `lineProgress`, `activeChordRank`).
9. **Desplazamiento Rápido de Acordes (`[◀]` y `[▶]`) con División Silábica Natural (`handleNudgeChord`)**:
   - En `WordChordDropSlot.jsx`, `LinePrefixChords` y `LineSuffixChords`, los badges de acordes exponen flechas de desplazamiento rápido en hover (`[◀]` y `[▶]`).
   - Al presionar `◀` o `▶`, el acorde se desplaza una palabra o sílaba en la dirección deseada.
   - Si la palabra destino ya tiene un acorde asignado y cuenta con $\ge 4$ letras, se divide automáticamente en sus sílabas naturales en español mediante `splitWordIntoTwoSyllables`, alojando el acorde entrante sin apilar dos acordes en la misma palabra. Si la palabra es corta o ya está dividida, intercambia los acordes limpiamente.
   - Al presionar `◀` en la primera palabra de un verso, el acorde se transfiere a acordes previos (`prefixChords`); al presionar `▶` en la última palabra, se envía a acordes de remate (`suffixChords`).
10. **Sincronización Automática de Secciones, Timestamps (`@ time`) y BeatGrid (`compases`) en División (`✂️`), Renombrado y Fronteras**:
    - `SongLyricsVisualEditor` implementa `syncCompasesWithVisualSections` para mantener una correspondencia estricta e inmediata entre la letra y los compases del `BeatGrid` (`compases`).
    - Al dividir una sección con la tijera (`✂️` en `handleSplitSectionAtLine`), el editor infiere inteligentemente el nombre de la nueva sección mediante `suggestSmartSectionName` (distinguiendo estribillos por similitud textual o numerando secuencialmente `Estrofa 1`, `Estrofa 2`, etc.), extrae automáticamente el `@ timestamp` exacto del verso a partir de `lineTimingsMap` / `compases`, y actualiza `c.seccion` y `c.secTime` en los compases correspondientes vía `onSaveCompases`.
    - Al renombrar secciones, unirlas (`handleMergeWithPrevSection`) o mover sus fronteras arriba/abajo (`handleMoveBoundaryUp`, `handleMoveBoundaryDown`), los compases del BeatGrid y sus marcas de tiempo se actualizan en tiempo real sin requerir guardar manualmente ni salir del editor.
11. **Detección y Cierre Automático de Secciones en Asistente Rítmico (`SteppedSyncWizardModal`)**:
    - `useSteppedSyncEngine` detecta automáticamente saltos de línea (estrofas separadas por párrafos) y tags `[Sección]` desde la Etapa 1.
    - Al presionar `[C]` durante la reproducción de la Etapa 2, si la canción comenzó con más de 2 segundos de introducción instrumental, el `[Intro]` se cierra automáticamente al marcar el primer verso cantado, y cada nueva estrofa abre su sección (`[Estrofa 1]`, `[Estribillo]`, etc.) sin obligar al usuario a presionar `[X]`.
    - La distribución de acordes en `wizardChordDistributor` divide las palabras más largas en sílabas naturales cuando hay más acordes que palabras en un verso, desviando cualquier exceso residual a `suffixChords` para evitar saturación.

---

## 14. Curación de Canciones Online y Restricción de Búsqueda (`SongSearchRebuild.jsx`, `AdminSongImportCurationModal.jsx`)
1. **Restricción de Búsqueda por Nivel (Free / Pro vs. Admin)**:
   - Los usuarios estándar y Pro (`!isAdmin`) tienen su búsqueda restringida **únicamente** al catálogo de canciones ya almacenado en la base de datos (`databaseSongs`).
   - No se despliegan pestañas ni resultados de fuentes online (Chordify, Ultimate Guitar, Cifra Club) ni se ejecutan scrapers externos para no administradores.
2. **Modal de Curación Previa para Administradores (`AdminSongImportCurationModal.jsx`)**:
   - Al seleccionar una canción no indexada proveniente de una fuente online, la descarga se ejecuta en segundo plano mostrando la barra de progreso táctil (`importProgress`).
   - Al concluir, en vez de insertarse de forma cruda, se abre el modal de curación pre-poblado con la información extraída y enriquecido automáticamente en segundo plano (`searchAlbumArtworkOptions` de iTunes/Spotify).
   - Permite editar título, chips de artistas múltiples con autocompletado contra la base de datos, álbum canónico, carátula con el selector y enmarcado táctil (`MemorabiliaImageModal`), año, versión (studio, acoustic, live, etc.), género, ID de YouTube, letra con acordes y estructura BeatGrid (JSON formateado o texto).
   - **Guardar en Base de Datos**: Despacha a `POST /api/dev/tables/songs`, creando la canción `Song`, vinculando o creando el `Album` canónico (`albumId`), asociando los artistas y abriendo la canción limpia en el cuaderno.
   - **Cancelar**: Permite omitir la persistencia en base de datos y abrir la canción directamente como borrador uncurated en el cuaderno del administrador.

