# 📖 SongBook — The Musician's Notebook

[![React](https://img.shields.io/badge/React-18-61dafb.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646cff.svg?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933.svg?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-SQLite-2D3748.svg?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![AlphaTab](https://img.shields.io/badge/AlphaTab-Music_Notation-22c55e.svg?style=for-the-badge)](https://www.alphatab.net/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06b6d4.svg?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

**SongBook** es un cancionero y atril digital interactivo diseñado para músicos, compositores y bandas. Recrea la experiencia táctil y estética de un **cuaderno de notas encuadernado en espiral metálica**, con hojas de papel texturadas y recortes rasgados flotantes, combinándolo con un motor moderno de notación musical, reproducción de sonido real y sincronización rítmica.

---

## ✨ Características Principales

### 1. Cuaderno Analógico Interactivo (The Musician's Notebook)
- **Doble Página con Espiral Metálica:** Navegación fluida con animación 3D de pase de página (*page-flip*), tapas de cuero y texturas de papel realistas.
- **Página Izquierda:** Gestión de repertorios (**Setlists**), orden de ejecución en vivo y modo escenario (*Stage Mode*).
- **Página Derecha:** Biblioteca de canciones favoritas (**⭐ Favoritas**), catálogo guardado y buscador con importación web.

### 2. Atril de Letras y Acordes con Sonido Real & Sincronización Bidireccional
- **Diagramas SVG de Acordes:** Visualización gráfica e interactiva para guitarra y bandoneón.
- **Audio Real con Tone.js:** Rasgueo y arpegio de acordes con muestreo acústico.
- **Transposición Inteligente & Aislamiento por Usuario:** Cambio de tono semitonal instantáneo preservando las digitaciones seleccionadas, aislado en el perfil personal (`UserSongPreference`) sin alterar el catálogo público.
- **Auto-Scroll Manos Libres:** Velocidad ajustable para tocar en vivo o ensayar sin interrupciones con desplazamiento suave localizado.
- **Navegación Bidireccional Exacta (Letra ↔ BeatGrid):**
  - Clic en cualquier acorde de la letra salta al pulso, tiempo y celda milimétrica del BeatGrid, reproduciendo el sonido del acorde.
  - Clic en cualquier pulso o compás del BeatGrid ilumina al instante la sección, renglón y acorde correspondiente en la letra (tanto en vivo como en pausa) y centra la vista automáticamente.
- **Editor Visual Drag-and-Drop:** Arrastre de acordes desde la cuadrícula rítmica hacia las palabras de la letra sin lidiar con corchetes en texto plano.

### 3. Sincronización Rítmica y Reproductor Flotante
- **Papel Rasgado Flotante (*Floating Video Paper*):** Video de YouTube integrado en una nota arrastrable sobre el atril con persistencia ininterrumpida de reproducción al cambiar de pestañas.
- **BeatGrid Rítmico Compás a Compás:** Línea de tiempo visual (modos *Ribbon* y *Grid*) con detección de BPM, silencios de entrada (*Intro*), marcas de tiempo de sección (`[Coro @ 45.2]`) y soporte para compases de métrica variable (`measureBeatOffsets` para 2T, 3/4, 4/4, 6/8).
- **Pitch Shifting en Tiempo Real:** Reproducción del audio del video en el tono transpuesto exacto sin alterar la velocidad.
- **Enclavamiento Anti-Snapback (*SeekLatch & Beat Epsilon*):** Absorbe la latencia de fotogramas clave (*keyframes*) de YouTube al pulsar acordes o tiempos, garantizando saltos estables sin desfase rítmico.

### 4. Escritorio de Memorabilia & Estuches de Coleccionista (*SongMemorabiliaDesk*)
- **Estuches Físicos Vectoriales según Tipo de Versión:**
  - 💿 **Estuche Acrílico de Disco (`cd-2.svg`):** Para grabaciones oficiales de estudio (*Studio*) y acústicas (*Acoustic*).
  - 🎟️ **Ticket Vintage de Concierto (`ticket.svg`):** Para grabaciones y conciertos en vivo (*Live*).
  - 🎞️ **Fotograma de Película (`movie.svg`):** Para bandas sonoras de cine (*Soundtrack*) y sesiones especiales (*Session*).
- **Foto de Artista en Polaroid Vintage:** Tarjetas Polaroid arrastrables con foto canónica por artista y galería de imágenes.
- **Metadatos Musicales Completos:** Edición rápida de carátula de álbum, año de lanzamiento, tipo de versión y notas de coleccionista.

### 5. Atril de Partituras y Tablaturas Interactivas (AlphaTab Multi-Fuente)
- **Búsqueda Unificada en 6 Fuentes:** Integración agregada de **Songsterr** (tablaturas multitrack modernas), **TodoTango** (partituras de época), **BitMidi / MIDI Archive** (millones de canciones multitrack en `.mid`), **OpenScore** (MusicXML de dominio público), **IMSLP** (clásicos históricos) e importador de archivos locales.
- **Arquitectura de Almacenamiento Privado & Cero URLs Externas:** El backend descarga y almacena las obras en `server/storage/scores/` bajo demanda, sirviéndolas exclusivamente por streaming binario interno (`GET /api/scores/unified/stream/:id`) a la memoria del navegador (`Uint8Array`), aislando la aplicación de enlaces externos rotos o riesgos legales de indexación directa.
- **Carga Multiformato Directa:** Soporte de archivos `.gp` (Guitar Pro 3 al 7), `.musicxml`, `.mxl`, `.xml` y `.mid` por arrastrar y soltar o pegado rápido.
- **Cursor de Ensayo sin Distorsión:** Píldora animada y plicas de ritmo (*TabRhythmMode*) debajo de los números de tablatura.
- **Sincronización Exacta con YouTube:** Mapeo de marcas de tiempo por compás (*videoPoints*) con versiones oficiales de estudio.
- **Minimapa Rítmico de Secciones:** Barra interactiva con bloques (*Intro, Verso, Coro, Solo, Outro*) para saltar instantáneamente.

### 6. Archivo Histórico de Tango & Grabaciones Maestras (TodoTango)
- Catálogo curado de grandes obras históricas (Piazzolla, Gardel, Troilo, Salgán, Villoldo, Matos Rodríguez).
- Visor de escaneos originales de alta resolución con zoom dinámico.
- Reproductor sincronizado de grabaciones de audio de época (MP3) y videos de YouTube.
- Integración en repertorios de escenario (*Stage Mode*) junto con canciones de acordes tradicionales.

### 7. Scraper Rítmico con Evasión de Cloudflare (Puppeteer Stealth)
- Extracción de acordes y cuadrículas compás a compás desde **Chordify**, **Ultimate Guitar** y **Cifra Club**.
- Detección automática del binario nativo de Google Chrome en Windows y plugins de sigilo para sortear Cloudflare Turnstile con status 200 y extracción rítmica en menos de 10 segundos.

### 8. Motor OMR de Digitalización (Audiveris + Gemini Vision)
- **Audiveris 5.11 (Local OMR Geométrico):** Reconocimiento de pentagramas, armaduras y compases con reescalado automático a 300 DPI (Lanczos) y extracción MusicXML en memoria (`Uint8Array`).
- **Gemini Vision:** Transcripción multimodal opcional con IA a AlphaTex.
- *(Nota: Los botones visuales del estudio de digitalización se encuentran en pausa en la interfaz mientras se operan partituras vectoriales y archivo histórico).*

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
- **Node.js** 18 o superior
- **npm** o gestor de paquetes preferido
- **Google Chrome** instalado (para el motor de scraping con Puppeteer)
- *(Opcional)* **Audiveris 5.11** para el motor de reconocimiento geométrico OMR local

### 1. Clonar el repositorio
```bash
cd e:/Proyectos/songbook
```

### 2. Configurar el Backend
```bash
cd server
npm install
npx prisma db push
node prisma/seed-chords.js   # Carga inicial del catálogo de acordes en SQLite
node index.js               # Inicia el servidor backend en http://localhost:3001
```

### 3. Configurar el Frontend
En otra terminal:
```bash
cd e:/Proyectos/songbook
npm install
npm run dev                 # Inicia Vite en http://localhost:5173
```

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Heroicons.
- **Música & Audio:** Tone.js, `@coderline/alphatab`, `tonejs-instrument-guitar-acoustic-ogg`.
- **Backend:** Node.js, Express, Puppeteer Stealth, Prisma ORM, SQLite.
- **Streaming & Media:** `youtube-dl-exec`, Axios, Adm-Zip.
- **OMR:** Audiveris 5.11 (AGPLv3), Google Gemini Vision SDK.

---

## 📄 Licencia

Desarrollado para músicos y compositores.
