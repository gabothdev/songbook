# Reglas y Directrices de Partituras & Tabs (AlphaTab, Songsterr, TodoTango)

Este archivo rige para todos los componentes de notación musical interactiva en `src/components/scores/` y servicios relacionados (`services/scoresApi.js`, `services/songsterr.js`, `services/todotango.js`).

---

## 1. Reglas Críticas de AlphaTex
1. **Propiedades de Nota (`lr`, `pm`)**:
   - `lr` (*let ring*) y `pm` (*palm mute*) son exclusivas de notas individuales (ej: `1.2{lr}`).
   - **NUNCA** colocarlos en acordes agrupados `(...){lr}` ni en silencios `r{pm}`. Provoca error fatal `AT205: Unrecognized property`.
2. **Bloque Único `{...}` por Pulso**:
   - Todas las propiedades de pulso (`ch`, `lyrics`, `tu`) deben convivir en un único bloque de llaves: `{ch "C" lyrics "palabra"}`.
   - Múltiples bloques contiguos (`{...}{...}`) fallan con error fatal `AT202 Unexpected LBrace`.
3. **Pistas de Percusión (Drums)**:
   - Se expresan como códigos MIDI enteros (`42`, `38`, `36`) sin sufijo de cuerda (`.string`).
4. **Sanitización Obligatoria**:
   - Siempre pasar texto AlphaTex por `src/utils/alphaTexSanitizer.js` antes de cargarlo con `api.load()`.

---

## 2. Configuración y Renderizado de AlphaTab
1. **Plicas y Barras de Ritmo en Tablatura**:
   - Para mostrar plicas y figuras rítmicas debajo de los números:
     `notation.rhythmMode = 2` (`TabRhythmMode.ShowWithBars`) y `notation.rhythmHeight = 24`.
2. **Prevención de Recorte Derecho e Inferior**:
   - AlphaTab calcula el ancho SVG por `container.clientWidth`. `containerRef` debe ser `w-full p-0`.
   - Delegar márgenes internos a `display.padding = [25, 20, 25, 30]`, `systemPaddingBottom = 25`, `lastSystemPaddingBottom = 45`.
3. **Mapeo Inteligente de Pentagrama (`detectIdealStaveProfile`)**:
   - Bandoneón, Piano, Teclado, Violín, Cello, Vientos, Voz: `staveProfile: 'score'` (pentagrama tradicional sin tablaturas numéricas).
   - Guitarras y Bajos: `staveProfile: 'default'` (Pentagrama + Tab) o `'tab'`.
4. **Cursor de Ensayo Estilo Songsterr**:
   - Usar `api.customCursorHandler` para inyectar `.songsterr-playback-pill` sin aplicar escala `transform: scale(0.01, h)` que deforma el borde.

---

## 3. Sincronización Rítmica con YouTube (`videoPoints`)
- Usar marcas de tiempo exactas por compás de `videoPoints` con interpolación de ticks en tiempo real.
- Priorizar versiones oficiales de estudio (`start < 1.5s` y `feature: null`).
- Al hacer clic en compases (`beatMouseDown`), sincronizar instantáneamente el reproductor de YouTube mediante `alphaTabBeatToYtTime`.
