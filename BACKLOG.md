# 📋 Backlog de Desarrollo: SongBook v2
*"The Musician's Notebook" — Tareas Pendientes, Roadmap y Mejoras Futuras*

Este documento consolida las iniciativas y tareas pendientes identificadas tras la refactorización arquitectónica de SongBook v2 (Backend TypeScript, persistencia modular, BeatGrid desacoplado y suite de pruebas Vitest al 100%).

---

## 📌 Prioridades de Desarrollo

### 1. 🖨️ Exportación a PDF & Formato Imprimible
- [ ] **Generador de PDF de Canción Individual**:
  - Vista limpia optimizada para hojas A4 / Carta con tipografía analógica.
  - Opciones de exportación: con diagramas de acordes, solo letra o con compases.
- [ ] **Exportación de Setlist Completo**:
  - Compilación de un repertorio en un solo cuadernillo descargable o imprimible.
  - Índice inicial con canciones, tonalidades, notas de ensayo y duración estimada.
- [ ] Conectar el contenedor en `NotebookSpread.jsx` (`HOJA BLANCA QUE OCUPA TODO EL ANCHO DEL CUADERNO`).

---

### 2. 🎼 Digitalización OMR de Partituras (Reactivación de Interfaz)
- [ ] **Habilitar acceso en la UI**:
  - Reactivar el acceso al estudio de digitalización desde el atril de partituras (`ScoresStand`).
- [ ] **Pipeline de Escaneo OMR**:
  - Subida de archivos físicos (fotografías de partituras o archivos PDF escaneados).
  - Preprocesamiento y reescalado automático a 300 DPI mediante Lanczos en `server/services/omrDigitizer.js`.
  - Integración con el motor local Audiveris 5.11 para extracción MusicXML binaria.
- [ ] **Asistencia de IA con Gemini Vision**:
  - Transcripción y corrección asistida de compases o armaduras complejas a formato AlphaTex.

---

### 3. 🎸 Herramientas de Músico en Vivo (Stage Tools)
- [ ] **Metrónomo Flotante en el Escritorio**:
  - Widget analógico arrastrable o anclado a la barra de controles con sonido real de Tone.js, selector de compás (2/4, 3/4, 4/4, 6/8) y tap tempo.
- [ ] **Afinador Cromático Web**:
  - Captura de audio por micrófono con detección de tono por autocorrelación y visualización de aguja analógica vintage.
- [ ] **Modo Escenario Offline (PWA)**:
  - Cacheo mediante Service Worker (`vite-plugin-pwa`) para permitir abrir repertorios, letras y partituras en recintos o festivales sin conexión a internet.

---

### 4. 💳 Pasarela Real de Pagos (SongBook Pro)
- [ ] **Integración de Webhook de Pagos**:
  - Conectar pasarela con **MercadoPago** y/o **Stripe**.
- [ ] **Automatización de Suscripciones**:
  - Actualización automática de `User.role = 'PRO'` al confirmarse el evento `payment.approved`.
  - Habilitación de beneficios Pro: pitch shifting ilimitado en YouTube, digitalización OMR sin cuotas y setlists ilimitados.

---

### 5. 🤖 Transcripción Local Asistida por IA (Demucs + Omnizart)
- [ ] **Wrapper de Separación de Pistas**:
  - Estabilizar `transcribe.py` en `server/services/` para aislar pistas de audio (voz, bajo, batería, guitarra).
- [ ] **Detección Automática de Acordes y Melodías**:
  - Reconocimiento de acordes polifónicos a partir de audio crudo sin depender de fuentes web externas.
- [ ] **Interfaz de Progreso**:
  - Notificaciones en tiempo real del estado de procesamiento mediante Server-Sent Events (SSE) o WebSocket.

---

### 6. 🧹 Deuda Técnica Menor & Mantenimiento
- [ ] **Modularización de `ScoreDigitizerStudio.jsx`** (1.188 líneas):
  - Dividir los paneles de recorte de imagen, visor de pentagrama y editor de notas.
- [ ] **Modularización de `ChordifyTestStudio.jsx`** (1.386 líneas):
  - Dividir la consola de pruebas de scraping, visor de JSON crudo y comparador de beats.

---

## 📈 Historial de Versiones Recientes
- **Fase 1 (DX & TypeScript)**: Unificación de entorno con `concurrently` y ejecución TS en backend con `nodemon --ext js,ts,json --exec tsx index.js` (eliminando cuelgues de TTY en Git Bash y Windows).
- **Fase 2 (Persistencia Modular)**: Extracción de `server/routes/persistence.js` en 6 servicios tipados y 6 rutas con 100% de compatibilidad de contratos.
- **Fase 3 (Frontend Modular)**:
  - `ScoreStandView.jsx` desacoplado con `useAlphaTabPlayer`, `scoreHelpers` y `ScorePlaybackBar`.
  - `SongSheetView.jsx` y `SongLyricsVisualEditor.jsx` desacoplados con `useAutoScroll`, `useChordDefinitions`, `EditorToolbar` y `ChordStampBar`.
- **Fase 4 (Limpieza Profunda)**:
  - `SongLyricsRenderer.jsx`: Reducido en 65% con `lyricsTimingCalculator.js` y `useLyricsSyncHighlight.js`.
  - `chordify-scraper.js`: Reducido en 62% con `measureParser.ts`.
  - `DevDatabaseStudio.jsx`: Reducido en 78% con `SqlQueryConsoleTab`, `DevDatabaseTable` y `DevItemEditModal`.
  - Vitest: **58 tests pasando al 100%**.
