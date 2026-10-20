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
- **Resaltado Rítmico de Acordes Repetidos, Arrastre Inter-Línea y Transición (`lyricsTimingCalculator.js` & `SongLyricsRenderer.jsx`)**: `SongLyricsRenderer` mapea cada compás y línea con rangos acumulados exactos de pulsos globales (`startBeatGlobal`, `endBeatGlobal`). La sincronización prioriza `currentBeatIndex` del BeatGrid: cuando el cursor del BeatGrid avanza de pulso/compás (ej. de un acorde final al acorde de inicio de la siguiente línea, o en acordes repetidos como `[A#] ... [A#]`), la línea y el acorde activo avanzan de forma inmediata e irreversible, sin volver a iluminar ocurrencias anteriores. Si una línea comienza con una frase cantada sobre el acorde sostenido de la línea anterior antes de que entre su primer `[Chord]` explícito (`startsWithUnchordedPhrase`, `leadInCompasesCount > 0`) o no tiene acordes propios, `resolveActivePlaybackLocation` retorna `activeChordSectionIdx` y `activeChordLineIdx` apuntando al último acorde de la línea previa para mantenerlo resaltado hasta que el pulso alcance el primer acorde de la nueva línea. NUNCA usar un fallback por nombre (`chordPositions.find(cp => cp.chord === currentPlayingChord)`) sobre la línea activa, ya que saltaría erróneamente a un acorde homónimo situado más adelante en el verso.
- **Mapeo Exacto de Compases a Líneas y Acordes (`lineTimingsMap` / `chordTimings`)**: `SongLyricsRenderer` correlaciona el recuento de acordes de cada renglón con los compases exactos del BeatGrid, sus `beatTimes` y sus `chordBeats`. NUNCA dividir los tiempos o pulsos equitativamente mediante divisiones lineales ciegas (`cIdx * Math.floor(lineBeats.length / chords.length)`). Cada acorde de la línea se mapea contra los eventos reales de cada compás (`rawMeasureEvents` / `compasChordEvents`): si la línea repite explícitamente el mismo acorde por compás (ej. `[Bm7] [Bm7]` en canciones sin letra o `formatCompasesToText`), cada compás incrementa `chordsAccum` (`isExplicitRepeatInLine`) y mapea 1:1 a su compás; mientras que si una línea con letra tiene un solo `[Chord]` sostenido varios compases, los compases sostenidos se agrupan bajo ese acorde. Si no hay timestamps explícitos por pulso, los tiempos se calculan monótonamente a partir de BPM y los inicios de sección para prevenir superposiciones.
- **Alineación de Secciones y Compases (`alignCompasesWithSongSections`)**: Las secciones se asocian al compás con menor distancia absoluta (`Math.abs(cTime - sec.time)`), evitando que por redondeos decimales de timestamps un compás quede atribuido a la sección previa. Además, si los compases ya contienen secciones no genéricas coincidentes, se preservan directamente.
- **Tolerancia y Latch de Búsqueda (`useYouTubeSync.js`)**: Al buscar el pulso activo en `flatBeats`, se aplica `BEAT_EPSILON = 0.06` para absorber imprecisiones de aterrizaje en keyframes de YouTube. Al invocar `jumpToBeat`, `seekLatchRef` enclava el pulso objetivo de inmediato evitando snapbacks o retrocesos al pulso anterior durante el seek o en pausa.
- **Navegación Bidireccional Letra <-> BeatGrid**: Clic en acorde de la letra despacha su `beatIdx` exacto de `lineTimingsMap` a `jumpToBeat`, saltando al pulso y tiempo milimétrico sin depender de ratios de línea. Clic en BeatGrid (`onBeatClick`) hace sonar el acorde, enclava el pulso y activa el resaltado y auto-scroll suave de la línea y acorde correspondiente en `SongLyricsRenderer` tanto en reproducción como en pausa.
- **Offsets Acumulativos de Pulsos (`measureBeatOffsets`)**: Nunca multiplicar compases por 4 (`compasIdx * 4`) para calcular pulsos. Los compases de duración variable (ej. 2T en silencios o anacrusas, 3T en compases ternarios) requieren calcular los pulsos de inicio sumando acumulativamente `compas.acordes.length`. Al hacer clic en un encabezado de sección (`handleSelectSection`), se debe usar `measureBeatOffsets[targetGlobalCompasIdx]` para llegar al primer acorde y no al segundo.

## 4. Escalado de BPM Polimétrico y Subdivisión de Compases (`gridParser.js`)
- **`doubleGridBpm`**: Duplica la resolución de cada compás respetando su métrica individual $N = \text{acordes.length}$ (`3/4`, `4/4`, `2/4`, `6/8`). Subdivide cada pulso en 2 pulsos (total $2N$) interpolando linealmente los `beatTimes`, y los parte en **dos compases de $N$ tiempos** (ej. en `3/4`: `[c0, c0, c1]` y `[c1, c2, c2]`; en `4/4`: `[c0, c0, c1, c1]` y `[c2, c2, c3, c3]`). Soporta canciones con cambios de métrica entre secciones.
- **`halveGridBpm`**: Fusiona parejas consecutivas de compases dentro de la misma sección y métrica $N$, tomando los pulsos pares (`0, 2, ..., 2N-2`) y restaurando los timestamps y etiquetas de sección originales sin mezclar secciones ni métricas distintas.
- **`updateTextBpm` & `getSongBpm`**: Extrae y actualiza la etiqueta de metadatos `[BPM @ <val>]` en el texto sin corromper la estructura de secciones ni compases.

## 5. Agrupación Canónica de Compases en Chordify (`chordify-scraper.js` & `measureParser.ts`)
- **Procesador Aislado de Compases (`server/services/chordify/measureParser.ts`)**:
  - Desacopla la normalización de acordes (`normalizeChord`), deducción de silencios pre-roll, preservación de anacrusas y sanitización armónica (`sanitizeLyricLineSegments`) de la navegación Puppeteer.
  - Permite testear unitariamente el parsing rítmico con Vitest sin levantar instancias del navegador Chromium.
- **Alineación por Downbeat (`beatNum === 1`)**: Al procesar la secuencia de pulsos devuelta por Chordify, los compases NUNCA deben agruparse mediante un `slice(i, i + barLength)` ciego desde el índice 0. Cada compás canónico debe abrirse estrictamente cuando `beatNum === 1` o cuando la celda alcance `barLength` tiempos.
- **Mapeo de Secciones del LeadSheet (`leadSections`)**: Si el scrap provee secciones reales en `leadSheet` (`Intro`, `Verse`, `Chorus`, etc.), se correlaciona cada sección con el compás downbeat más cercano de manera estrictamente monótona, asignándole `seccion` y `secTime`. Esto reemplaza las divisiones genéricas ficticias cada 8 compases y garantiza perfecta sincronía de `syncData` con la letra sincronizada.
- **Preservación de Compases Completos de Silencio Inicial vs Descarte de Micro-Pulsos Pre-Downbeat (`measureParser.js`)**: Se descartan únicamente los micro-pulsos incompletos previos al primer downbeat (`beatNum === 1`) si son de silencio (`N` / `𝄾`); a partir del primer `beatNum === 1`, todos los compases completos de 4 tiempos de silencio (`["𝄾", "𝄾", "𝄾", "𝄾"]`) se preservan en `compases` para que el `BeatGrid` muestre el conteo visual del silencio inicial (mientras se omiten de `leadSheetText` en `SongSheetView`).
- **Estado Neutro de Autofollow durante Silencio Inicial (`lyricsTimingCalculator.js`)**: En `resolveActivePlaybackLocation`, mientras el pulso o tiempo actual sea anterior al inicio de la primera línea musical (`currentBeatIndex < firstTimedLine.startBeatGlobal` o `currentTime < firstTimedLine.startTime`), se retorna estado neutro (`activeSectionIdx: -1, activeLineIdx: -1, activeChordRank: -1`), evitando que los fallbacks lineales iluminen secciones o acordes antes de que empiece la canción.
- **Preservación de Renglones Instrumentales en Letra (`alignChordsWithLyrics` y `chordsLine`)**: Si el contenido proviene de Chordify o formato inline, se inhabilita la fusión de 2 líneas de Ultimate Guitar, preservando las líneas de acordes instrumentales de intros, solos o interludios como líneas autónomas sin montarlas sobre los versos cantados. En el scraper `chordify-scraper.js`, los eventos `c.line.chordsLine` se extraen y renderizan siempre, incluso cuando la misma sección contiene luego versos cantados (`c.line.lyricLine`), garantizando que preludios instrumentales (como la intro o el solo de *Iris*) aparezcan con sus acordes intactos en el visor.

## 6. Filtrado y Scoring Musical de YouTube (`server/services/youtube.js`)
- **Regla Anti-Ruido Estilo Chordify**: Se descartan transmisiones en vivo (`isLiveOrStream`), duraciones fuera de banda (menor a 75s o mayor a 720s) y contenido no musical (tutoriales, clases, cómo tocar, podcasts, entrevistas, reacciones, álbumes completos, loops).
- **Priorización y Scoring**:
  - `+50 pts`: Pista de audio oficial en canal Topic (`- Topic`).
  - `+35 pts`: Insignia de artista oficial verificado (`BADGE_STYLE_TYPE_VERIFIED_ARTIST` / `AUDIO_BADGE`).
  - `+30 pts / +25 pts`: Títulos con *"Official Audio"* o *"Official Video"*.
  - `-15 pts`: Covers (permitidos solo como respaldo si no hay original).
- **Consumo Compartido**: `searchYouTubeMusic` sirve tanto al selector de video (`/api/songs/search/youtube`) como al scraper de Chordify (`chordify-scraper.js`).

## 7. Asistente de Sincronización Rítmica Guiada (`SteppedSyncWizardModal.jsx`)
- **Etapa 1 (Letra Limpia)**: Carga y limpieza de frases en texto plano (sin acordes). Al presionar *"Siguiente: Sincronizar"*, `handleProceedToStep2` borra completamente cualquier información previa de secciones, oraciones sincronizadas o marcas para iniciar limpio.
- **Etapa 2 (Marcado Rítmico con Video)**:
  - **Nombrado de Secciones**: La primera sección se nombra al principio (por defecto `Intro`, arranca en `0.0s`). Al pulsar `<kbd>X</kbd>` para cerrar la primera sección, **NO** se solicita nombre (ya está nombrada) y se consolida con su marca `[Intro @ 0.0]`. En cambio, las secciones posteriores sí abren el popover al cerrarse con `<kbd>X</kbd>` para definir su nombre (`[Verso 1]`, `[Coro]`, etc.) con su tiempo de inicio exacto.
  - Atajos de teclado en vivo y botones táctiles:
    - `<kbd>Espacio</kbd>`: Play / Pausa (indica estado `Reproduciendo` o `Pausado`).
    - `<kbd>C</kbd>`: Marcar inicio de oración y ajustar (snap) al comienzo del compás más cercano.
    - `<kbd>V</kbd>`: Marcar fin de la oración cantada en el compás actual (o pulsar `<kbd>C</kbd>` en la siguiente frase la cierra automáticamente).
    - `<kbd>X</kbd>`: Cerrar sección actual y comenzar la siguiente (cierra automáticamente cualquier frase abierta).
    - `<kbd>Borrar</kbd>` / `<kbd>Backspace</kbd>`: `handleRemoveLastTimestamp` primero reabre la frase si tenía `<kbd>V</kbd>` fijado, o elimina la marca si estaba abierta, rebobinando el reproductor con margen de preludio.
  - **Corrección de Letra en Pausa**: Al pausar la reproducción, se despliega una barra contextual que permite presionar *"Corregir letra"*, abriendo un modal para modificar texto o corregir saltos de línea sin perder las marcas ya sincronizadas.
  - **Validación de Frase Abierta al Guardar**: Si el usuario intenta guardar progreso habiendo marcado inicio de oración con `<kbd>C</kbd>` pero sin haber cerrado con `<kbd>V</kbd>` o `<kbd>X</kbd>`, se muestra una alerta roja destacada (*"Tienes que marcar el final de la última oración trabajada primero"*), impidiendo inconsistencias de tiempo.
- **Sincronización Progresiva y Preservación de Acordes**: Admite sincronizar hasta cualquier punto intermedio ("Guardar Progreso hasta aquí") para continuar en otro momento. En el editor visual y BeatGrid, lo sincronizado queda anclado a sus tiempos exactos de video, y después de lo sincronizado se preservan íntegramente los acordes y secciones que ya existían en la canción original (`initialContent`) junto con la letra pendiente.

- **Cancelación Segura al Marcar Sección**: `handleCancelSectionModal` permite abortar el cierre de una sección si se pulsó `<kbd>X</kbd>` por error, reanudando la reproducción automáticamente y conservando la sección actual activa.
- **Opciones de Cierre de Sección en Asistente Rítmico**: El modal de sección (`isNamingSection`) ofrece: "Cancelar [Esc]", "Agregar solo sección [Enter]" y "Agregar también inicio de oración [Shift+Enter]" (marca la siguiente oración y la sección simultáneamente en el mismo timestamp).
- **Módulos de syncWizard**: Arquitectura modular desacoplada en `useSteppedSyncEngine.js`, `SectionClosingModal.jsx`, `LyricsCorrectionModal.jsx` y `wizardChordDistributor.js`.

## 8. Métricas Variables Multi-Alcance y Desplazamiento de Pulsos en Cadena (Ripple Shift)
- **Modificación Interactiva con Selector de Alcance en BeatGrid**: En modo edición (`isEditMode`), al hacer clic sobre el identificador de un compás (`C.#` en Ribbon o `Compás #` en Grid), se activa el menú contextual (`renderMeasureModal` en `BeatGrid.jsx`) que permite elegir el alcance (`single`, `section`, `from_here`, `all`) y fijar métricas como `4/4`, `3/4`, `2/4`, `6/8` o sumar/restar tiempos finos (`[-1 T]`, `[+1 T]`).
- **Algoritmo `rippleShiftCompases` (`src/utils/gridParser.js`)**:
  - `single`: Cambia únicamente el compás elegido y redistribuye secuencialmente los pulsos downstream respetando la métrica individual de cada compás subsiguiente (y creando compases adicionales al final si sobran pulsos).
  - `section`: Reagrupa todos los pulsos de la sección seleccionada en compases de la nueva métrica (`3/4`, `6/8`, etc.), dejando intactas las demás secciones para soportar canciones con cambios de compás entre secciones.
  - `from_here` / `all`: Reagrupa todos los pulsos desde el compás elegido (o desde el inicio de la canción) en compases de la métrica indicada, conservando los `beatTimes` exactos de YouTube y re-anclando los encabezados de sección (`seccion`, `secTime`).
- **Resolución Dinámica de Compases**: `useSongRhythmGrid.js` expone `handleChangeMeasureLength(measureIdx, newLength, scope)` y resuelve los índices en `handleUpdateBeatGridChord` iterando los anchos reales de cada compás en lugar de asumir divisiones estáticas de 4 tiempos.

## 9. Robustez de Interpolación por Secciones y Modal de Secciones en Portal
- **Modal Centrado de Opciones de Sección (`SectionGutterHeader.jsx`)**: Se renderiza mediante `createPortal(..., document.body)` con fondo `bg-black/60 backdrop-blur-xs`, `z-[9999]`, centrado en pantalla, soporte de <kbd>Esc</kbd> y clic en backdrop. Permite renombrar, duplicar, reordenar y sincronizar marcas de tiempo sin quedar cortado por el lienzo del cuaderno o la barra de anillas.
- **Alineación Monótona de Compases (`alignCompasesWithSongSections`)**: Cuando `compases` ya posee secciones estructuradas coincidentes con la letra, no se redistribuyen ni colapsan compases; únicamente se asegura el `secTime` en la cabeza de cada sección y se limpian marcas redundantes en compases internos. Para compases genéricos, se calcula un mapa temporal continuo sobre toda la grilla para ubicar con precisión el compás de inicio de cada sección sin crear tramos de 1 compás ni marcas nulas.
- **Monotonicidad y Enclavamiento en Playback (`useYouTubeSync.js`)**: Los `timingBlocks` garantizan tiempos de inicio estrictamente crecientes (`blocks[i].startTime > blocks[i - 1].startTime`), protegiendo la aguja y cursor del BeatGrid de saltos hacia atrás o aceleraciones bruscas durante la reproducción dentro del editor visual o en la vista de atril.
- **Sincronización en Memoria de Arreglos (`useSongArrangement.js`)**: Al guardar cambios personalizados (`handleSaveCustomVersion`), actualiza síncronamente `song.content`, `song.syncData` y `song.isCustom` en el objeto en memoria para que todas las vistas y hooks hijos lean de inmediato la última versión.

## 10. Distribución Armónica por Ventanas de Tiempo y Propagación en BeatGrid
- **Línea de Tiempo Armónica (`buildChordTimeline` en `wizardChordDistributor.js`)**: A partir de la canción base (ej. scrap de Chordify), interpola monótonamente cada compás y pulso a lo largo de toda la pista de audio.
- **Compases Dinámicos por Frase**: Cada oración calcula su duración en compases exactos a partir de su compás de inicio y fin (`endMeasureIdx - startMeasureIdx`). Frases de corta duración (ej. versos rápidos de 1 compás como *"A vivir otras vidas"*) reciben exactamente 1 compás en `generatedCompases`, mientras que versos estándar reciben 2 o más compases según el audio.
- **Ventana Real de Frase `[phrase.time, nextPhrase.time)`**: Cada frase vocal extrae los acordes que sonaron en su franja temporal real:
  - Primer acorde asociado a la primera palabra: `[C]Palabra`.
  - Acordes adicionales distribuidos de forma uniforme sobre los índices de palabras (`Math.floor(words.length * c / N)`).
  - Deduplicación consecutiva dentro de la frase para una letra visual limpia, preservando cada frase con su acorde inicial sonoro.
- **Lead-In Instrumental**: Si la primera frase de una sección vocal inicia con más de 0.8s de retardo respecto al inicio de la sección, se genera una línea previa con los acordes instrumentales que sonaron antes de la voz (ej. `[A] [Am]`).
- **Propagación Armónica Automática (`gridParser.js`)**: En líneas con letra y acordes (2 compases por línea), los compases sin cambio armónico explícito heredan automáticamente el último acorde activo (`lastActiveChord`) en su primer tiempo, garantizando que el BeatGrid nunca presente compases vacíos ni silencios falsos mientras la letra conserva una lectura limpia y musical.
- **Preservación Parcial**: Las secciones y acordes originales a partir de `maxSyncedTime` se preservan intactas en su lugar, y cualquier letra pendiente se concatena limpiamente bajo `[Letra Pendiente de Sincronizar]`.

