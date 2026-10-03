# 📖 Manual de Usuario de SongBook
### *"The Musician's Notebook" — Tu cancionero, atril y cuaderno interactivo*

---

## 📌 Índice de Contenidos

1. [Introducción a SongBook](#1-introducción-a-songbook)
2. [Acceso, Cuentas y Planes](#2-acceso-cuentas-y-planes)
3. [Navegación en el Cuaderno Analógico](#3-navegación-en-el-cuaderno-analógico)
4. [Gestión de Repertorios (Setlists) & Modo Escenario](#4-gestión-de-repertorios-setlists--modo-escenario)
5. [Biblioteca de Favoritas y Búsqueda Online](#5-biblioteca-de-favoritas-y-búsqueda-online)
6. [Atril de Canciones: Letras, Acordes y Audio Real](#6-atril-de-canciones-letras-acordes-y-audio-real)
7. [Editor Visual de Canciones Drag-and-Drop](#7-editor-visual-de-canciones-drag-and-drop)
8. [Sincronización Rítmica y Papel de Video Flotante](#8-sincronización-rítmica-y-papel-de-video-flotante)
9. [Atril de Partituras y Tablaturas Interactivas (Scores Stand)](#9-atril-de-partituras-y-tablaturas-interactivas-scores-stand)
10. [Archivo Histórico de Tango y Grabaciones de Época](#10-archivo-histórico-de-tango-y-grabaciones-de-época)
11. [Instrumentos Disponibles (Guitarra y Bandoneón)](#11-instrumentos-disponibles-guitarra-y-bandoneón)
12. [Preguntas Frecuentes y Atajos Recomendados](#12-preguntas-frecuentes-y-atajos-recomendados)

---

## 1. Introducción a SongBook

**SongBook** es un ecosistema interactivo concebido para músicos solistas, bandas, docentes y compositores. Su diseño combina la familiaridad y calidez estética de un **cuaderno de partituras encuadernado en anillas metálicas** (con texturas de papel de pergamino, notas rasgadas y bocetos musicales) con tecnologías de vanguardia:

- **Sonido real con Tone.js:** Rasgueo y digitación con muestras acústicas reales de instrumentos.
- **Sincronización de video y BeatGrid:** Compases rítmicos que avanzan en perfecta sincronía con YouTube.
- **Pitch Shifting en tiempo real:** Reproduce canciones y videos en el tono exacto en que vas a tocarlos, sin cambiar la velocidad de la pista.
- **Atril multiformato de partituras con AlphaTab:** Soporte de tablaturas multitrack modernas (Songsterr, Guitar Pro, MusicXML, MIDI) y partituras históricas de Tango de dominio público.

---

## 2. Acceso, Cuentas y Planes

Al abrir SongBook verás la tapa de cuero de tu cuaderno personal de notas con bocetos e ilustraciones musicales.

```
       ┌──────────────────────────┐
       │   📖 THE MUSICIAN'S      │
       │        NOTEBOOK          │
       │                          │
       │   [ Iniciar Sesión ]     │
       │   [ Crear Cuenta ]       │
       │   [ Entrar como Invitado]│
       └──────────────────────────┘
```

### Opciones de Ingreso
1. **Modo Libre / Invitado (*Guest Mode*):** Si deseas tocar de inmediato sin registrarte, pulsa **"Entrar como Invitado"**. Podrás explorar el cancionero, buscar partituras, probar los acordes y ver videos sin restricciones iniciales.
2. **Iniciar Sesión / Registrarse:** Si inicias sesión con tu usuario, tus repertorios, canciones favoritas, digitaciones personalizadas y afinaciones se sincronizarán y guardarán en la base de datos local para que nunca pierdas tu trabajo.

### Planes Disponibles
- **Plan Free (Gratuito):**
  - Acceso completo a letras, acordes, diagramas y reproducción de audio con Tone.js.
  - Creación de setlists y biblioteca personal (con límites estándar).
  - Consulta y reproducción de partituras interactivas de catálogo.
  - Sutil banner inferior de soporte.
- **Plan Pro / Premium:**
  - **Sin límites** en número de repertorios, temas guardados o partituras.
  - **Pitch Shifting de Audio en vivo:** Transpón cualquier video de YouTube y escucha el audio original procesado en tu tono elegido.
  - Sin anuncios publicitarios.
  - Herramientas avanzadas de digitalización de partituras (OMR) y acceso anticipado a funciones beta.

### Cambio de Idioma
SongBook detecta automáticamente el idioma de tu navegador, pero puedes alternar manualmente entre **Español** e **Inglés** en cualquier momento desde el selector de idioma ubicado en la esquina superior de la interfaz.

---

## 3. Navegación en el Cuaderno Analógico

La pantalla principal recrea una **doble página abierta** dividida por espirales metálicos centrales (*Spiral Rings*):

```
┌─────────────────────────┬──┬─────────────────────────┐
│     PÁGINA IZQUIERDA    │  │     PÁGINA DERECHA      │
│                         │💿│                         │
│  [📋 REPERTORIOS]       │  │  [⭐ FAVORITAS / BUSCAR] │
│  - Setlists activos     │💿│  - Biblioteca personal  │
│  - Orden de temas       │  │  - Buscador web online  │
│  - Botón "Tocar en Vivo"│💿│  - Importador Cifra/UG  │
│                         │  │                         │
└─────────────────────────┴──┴─────────────────────────┘
```

### Pestañas Laterales de Acceso Rápido
En los laterales del cuaderno dispones de pestañas de índice tipo marcapáginas:
- **Repertorios:** Abre la gestión de setlists para organizar tus conciertos o ensayos.
- **Favoritas:** Muestra tu catálogo de temas preferidos guardados con 1 clic.
- **Cancionero:** Vuelve a la hoja activa de letra y acordes.
- **Partituras:** Despliega el atril interactivo de partituras (Scores Stand).
- **Marcador de Instrumento (*Instrument Bookmark*):** Conmuta instantáneamente entre **Guitarra** y **Bandoneón** para adaptar todos los diagramas del cuaderno a tu instrumento principal.

---

## 4. Gestión de Repertorios (Setlists) & Modo Escenario

En la **Página Izquierda** del cuaderno puedes estructurar los repertorios de tus shows, listas de temas para bodas, ensayos de banda o rutinas de estudio diario.

### ¿Qué puedes hacer con los Repertorios?
1. **Crear un nuevo Setlist:** Escribe el nombre (por ejemplo: *"Show Acústico Acapulco"*, *"Tango Trío 2026"* o *"Ensayo Rock"*) y presiona `Crear`.
2. **Agregar temas a una lista:**
   - Desde la biblioteca de canciones o la vista de letra, usa el botón **[➕ Al Setlist]**.
   - Desde cualquier partitura de Songsterr o TodoTango, pulsa **[➕ Al Setlist]** para guardarla con su afinación y pista seleccionada.
3. **Reordenar canciones:** Modifica el orden de ejecución (1, 2, 3...) según la dinámica de tu concierto.
4. **Badges Identificatorios de Contenido:**
   - 🎸 `TAB`: Indica que se trata de una tablatura interactiva multitrack (Guitar Pro / Songsterr).
   - 🎻 `TANGO`: Indica una partitura histórica de archivo escaneado con grabaciones de época (TodoTango).
   - `{Tono}`: Muestra la tonalidad específica guardada para esa canción (ej: `Am`, `C#m`).

### Modo Escenario (*Stage Mode*)
Cuando estés en vivo en el escenario o en una sala de ensayo, pulsa **"Tocar en Vivo / Iniciar Escenario"**:
- **Pantalla Limpia y Despejada:** Se maximiza el área de lectura reduciendo distracciones visuales.
- **Barra Superior de Escenario (*Stage Bar*):**
  - Botón **`< Anterior`**: Vuelve al tema previo sin cortar el ritmo.
  - **Selector Desplegable:** Salta a cualquier tema del repertorio al instante si la banda decide cambiar el orden del show.
  - Botón **`Siguiente >`**: Carga de inmediato la próxima canción.
  - Botón **`Salir`**: Regresa a la vista del cuaderno.
- **Conmutación Inteligente Automática:** Si en el setlist pasas de una canción con letra a una partitura de guitarra o a un tango escaneado, la pantalla cambiará fluidamente entre el visor de letra y el atril de partituras sin recargar la página.

---

## 5. Biblioteca de Favoritas y Búsqueda Online

En la **Página Derecha** administras tu colección personal de temas y buscas nuevas obras en internet.

```
┌──────────────────────────────────────────────┐
│ 🔍 Buscar por título o artista...            │
│ 🔘 [Mis Canciones]   🔘 [Importar de la Web] │
├──────────────────────────────────────────────┤
│ ⭐ Despacito — Luis Fonsi        [Tono: Bm]  │
│ ⭐ Stairway to Heaven — Led Z.   [Tono: Am]  │
│ ⭐ Muchacha Ojos de Papel — Alm. [Tono: G]   │
└──────────────────────────────────────────────┘
```

### Funciones Principales:
1. **Marcado Rápido con Estrella (⭐):** Haz clic en la estrella de cualquier canción para fijarla en tu listado de acceso preferencial.
2. **Filtrado en Tiempo Real:** Escribe una palabra clave y el listado filtrará instantáneamente por título o compositor.
3. **Buscador Web Unificado (Ultimate Guitar & Cifra Club):**
   - Pulsa en **"Importar Canción"** o abre el modal de búsqueda online.
   - Escribe el nombre de la obra y el artista. El sistema consultará los repositorios de Ultimate Guitar y Cifra Club en tiempo real.
   - **Modal de Progreso por Etapas:**
     1. Conexión con el servidor y descarga del texto original.
     2. Detección automática de acordes y secciones.
     3. Vinculación rítmica y cálculo del BeatGrid inicial.
   - **Importación por URL Directa:** ¿Encontraste una versión específica en tu navegador? Pega el enlace de Ultimate Guitar o Cifra Club en el campo correspondiente y SongBook la convertirá en un tema interactivo en segundos.

---

## 6. Atril de Canciones: Letras, Acordes y Audio Real

Al abrir una canción se despliega el **Atril de Hoja de Papel** (*SongSheetView*), diseñado para una lectura clara desde cualquier atril físico o atril de micrófono.

```
            Stairway to Heaven — Led Zeppelin
                     Tono: Am | Capo: 0

   [Am]           [Ab+]         [C/G]         [D/F#]
   There's a lady who's sure all that glitters is gold
   [Fmaj7]                 [G]   [Am]
   And she's buying a stairway to heaven...
```

### Controles de la Hoja de Atril:
- **Transposición Semitonal Instantánea (`-1` / `+1`):**
  - ¿El cantante necesita la canción un tono más bajo? Toca dos veces en **`-1`**.
  - Todos los acordes del texto se recalculan automáticamente sin alterar la estructura lírica.
  - La transposición se guarda automáticamente para esa canción específica.
- **Auto-Scroll Manos Libres:**
  - Presiona el botón de **Play/Scroll**.
  - Regula la velocidad milimétrica con el control deslizante para que el texto avance suavemente al ritmo de tu interpretación sin que tengas que soltar el instrumento.
- **Tarjeta Interactiva de Acordes (*Active Chord Card*):**
  - Toca o haz clic sobre cualquier acorde sobre la letra.
  - Se abrirá la tarjeta flotante con el diagrama detallado:
    - **Guitarra:** Muestra los 6 bordones, cejillas (*barres*), número de traste y los dedos exactos (1, 2, 3, 4).
    - **Bandoneón:** Muestra los botones de mano izquierda o derecha y la indicación de fuelle (*Abriendo* o *Cerrando*).
  - **Selector de Variaciones:** Usa las flechas para explorar inversiones y digitaciones alternativas a lo largo de todo el mástil.
  - **Botón de Audio Real:** Pulsa el icono del altavoz para escuchar el rasgueo o arpegio generado con muestras reales de alta fidelidad vía Tone.js.

---

## 7. Editor Visual de Canciones Drag-and-Drop

SongBook elimina la necesidad de editar archivos complejos de texto con corchetes (`[Am]`, `[G7]`). Mediante el **Editor Visual de Canciones Pro**, la edición es tan intuitiva como armar un collage sobre papel:

```
    ┌──────┐                ┌──────┐
    │  Am  │ ──(Arrastrar)─>│  C   │
    └──────┘                └──────┘
       ↓                       ↓
    [Ranura]                [Ranura]
     There's   a   lady      who's    sure
```

### Cómo Utilizar el Editor Visual:
1. **Modo Edición:** Pulsa el botón del lápiz en la cabecera de la canción.
2. **Ranuras Magnéticas de Acordes (*WordChordDropSlot*):**
   - Cada palabra de la letra cuenta con una ranura magnética superior.
   - Puedes arrastrar cualquier acorde desde la cuadrícula rítmica (*BeatGrid*) o el catálogo inferior y soltarlo directamente sobre la palabra exacta donde debe sonar el cambio armónico.
3. **Mover o Eliminar Acordes:**
   - Para reubicar un acorde, arrástralo a otra sílaba o palabra.
   - Para quitarlo, haz clic sobre el acorde y selecciona eliminar o arrástralo fuera de la línea.
4. **Canciones Instrumentales o Sin Letra:**
   - Si importaste un tema instrumental o una sucesión de acordes puros, verás un cartel destacado con el botón **`➕ Añadir Letra`**.
   - Haz clic para pegar el texto de los versos; el sistema generará automáticamente las ranuras sobre cada palabra conservando tus compases.
5. **Divisores de Sección:**
   - Organiza la estructura insertando bloques de *Intro*, *Verso 1*, *Coro*, *Solo*, *Puente* o *Outro*.

---

## 8. Sincronización Rítmica y Papel de Video Flotante

### El Papel Rasgado Flotante (*Floating Video Paper*)
Para ensayar sobre la grabación de referencia o la pista original, SongBook integra el video de YouTube en una **nota de papel rasgado adhesiva**:

```
      ╔════════════════════════════════════╗
      ║  📌 NOTA ADHESIVA - VIDEO ENSAYO  ║
      ║  ┌──────────────────────────────┐  ║
      ║  │      ▶ Video de YouTube      │  ║
      ║  └──────────────────────────────┘  ║
      ║  [⏮] [⏸/▶] [⏭]    🔊 [100%]     ║
      ╚════════════════════════════════════╝
```

- **Arrastrable y Libre:** Puedes mover la nota a cualquier rincón de la pantalla para que nunca tape la parte de la letra que estás leyendo.
- **Buscador de Videos Integrado:** Si la canción aún no tiene video enlazado, pulsa **"Buscar en YouTube"** o pega la URL del video para asociarlo para siempre.
- **Modo Minimizado:** Puedes plegar la nota a una pequeña pestaña cuando solo quieras escuchar el audio de fondo.

### Cuadrícula Rítmica (*BeatGrid*)
Debajo de la cabecera dispones de una línea de tiempo compás por compás:
- Cada compás está dividido en tiempos (1, 2, 3, 4).
- **Seguimiento en Vivo:** Mientras el video avanza, el cursor ilumina la celda y el pulso activo en tiempo real.
- **Silencios Musicales Iniciales:** Si la canción tarda unos segundos en comenzar, el BeatGrid crea compases de silencio (`𝄾 2T` / `𝄾 4T`) en la sección de Intro para que el primer acorde caiga en el momento rítmico exacto.

### Pitch Shifting de Audio en Vivo *(Función Pro)*
Si transpones una canción (por ejemplo de *Sol Mayor* a *Mi Mayor* para adaptarla a tu registro vocal) y enciendes el video:
- El reproductor original de YouTube se silencia automáticamente.
- El motor de audio de SongBook toma la pista de audio y aplica **Pitch Shifting en tiempo real**.
- **Resultado:** Escucharás la canción original sonando exactamente en *Mi Mayor* y a la velocidad original, permitiéndote ensayar sobre la pista real sin desafinar.

---

## 9. Atril de Partituras y Tablaturas Interactivas (Scores Stand)

El atril interactivo de partituras está impulsado por el motor **AlphaTab** y ofrece una experiencia comparable a los mejores programas de edición de partituras de escritorio.

```
       Stairway to Heaven — Tablatura Interactiva
  ─────────────────────────────────────────────────────
  [▶ Play] [⏸] | Pistas: [🎸 Guitarra Acústica ▼] | BPM: 72
  ─────────────────────────────────────────────────────
  Secciones: [Intro] ─── [Verso 1] ─── [Coro] ─── [Solo]
  ─────────────────────────────────────────────────────
     Am               Ab+              C/G
  E|-------5-7-----7-|-8-------8-----8-|-7-------7-----7-|
  B|-----5-----5-----|---5---5---5-----|---8---8---8-----|
  G|---5---------5---|-----5-------5---|-----9-------9---|
  D|-7---------------|-6---------------|-5---------------|
  A|-----------------|-----------------|-----------------|
  E|-----------------|-----------------|-----------------|
     |   |   |   |     |   |   |   |     |   |   |   |
```

### Catálogo Unificado de Partituras en 6 Fuentes
Desde el buscador de partituras puedes consultar simultáneamente:
1. **Songsterr:** Cientos de miles de tablaturas multitrack modernas revisadas por la comunidad.
2. **TodoTango:** Partituras históricas de tango escaneadas en alta resolución.
3. **BitMidi / MIDI Archive:** Millones de canciones secuenciadas en formato `.mid`.
4. **OpenScore:** Obras corales y orquestales clásicas de dominio público en MusicXML.
5. **IMSLP:** Obras históricas de conservatorio y música clásica.
6. **Importador de Archivos Propios:** Arrastra y suelta desde tu computadora archivos `.gp` (Guitar Pro 3, 4, 5, 6 y 7), `.musicxml`, `.xml` o `.mid`.

> 🔒 **Seguridad y Privacidad:** Las partituras se transmiten directamente a la memoria interna de tu navegador en formato binario (`Uint8Array`), sin enlaces externos rotos y garantizando carga instantánea.

### Funciones Avanzadas del Atril de Partituras:
- **Cursor de Ensayo Animado:** Una píldora verde de alta precisión recorre las notas en tiempo real sin deformaciones visuales.
- **Plicas y Barras de Ritmo (*TabRhythmMode*):** Debajo de los números de tablatura verás las plicas verticales y corchetes de duración (negras, corcheas, semicorcheas), para leer el ritmo exacto sin adivinar.
- **Mapeo Inteligente de Instrumentos:**
  - Si seleccionas guitarra o bajo, verás pentagrama + tablatura.
  - Si seleccionas piano, bandoneón, violín, acordeón, vientos o voz, la vista conmuta automáticamente a **Pentagrama Clásico Tradicional** eliminando las cuerdas numéricas innecesarias.
- **Selector Multitrack:** Alterna entre guitarra líder, guitarra rítmica, bajo eléctrico, batería o pistas de teclado en un menú desplegable.
- **Minimapa Rítmico de Secciones:** Cinta horizontal con las secciones de la obra (*Intro, Verso, Coro, Solo, Outro*). Haz clic sobre cualquiera de ellas para saltar de inmediato tanto en la partitura como en el video de YouTube enlazado.
- **Sincronización Exacta por Compás con YouTube:** SongBook mapea los compases de la partitura con grabaciones oficiales de estudio; al pulsar Play, la partitura y el video avanzan de la mano compás a compás.
- **Botón `[➕ Al Setlist]`:** Agrega la partitura interactiva con tu instrumento seleccionado directamente a cualquier repertorio de escenario.

---

## 10. Archivo Histórico de Tango y Grabaciones de Época

Para los amantes del tango y la música de raíz rioplatense, SongBook cuenta con una integración dedicada con el archivo histórico de **TodoTango**:

```
      ╔═══════════════════════════════════════════════════╗
      ║  🎻 ARCHIVO HISTÓRICO DE TANGO — ESCANEO ORIGINAL ║
      ║                                                   ║
      ║  Obra: "Adiós Nonino" — Astor Piazzolla (1959)    ║
      ║  Grabación: Quinteto Astor Piazzolla (MP3 1961)   ║
      ║                                                   ║
      ║  [ Zoom: 120% ]  [ Pág 1 / 4 ]  [ ◀ Ant ] [ Sig ▶]║
      ║  [ ▶ Escuchar Grabación Maestra de Época ]        ║
      ╚═══════════════════════════════════════════════════╝
```

### Características del Visor de Tango:
- **Obras Inmortales:** Catálogo curado con obras de Astor Piazzolla, Carlos Gardel, Aníbal Troilo, Horacio Salgán, Ángel Villoldo y Gerardo Matos Rodríguez.
- **Escaneos Originales de Alta Definición:** Partituras de época digitalizadas de manuscritos y ediciones históricas.
- **Control de Zoom Dinámico:** Ajusta el tamaño de página entre el `50%` y el `200%` para leer con total nitidez desde cualquier pantalla o atril.
- **Grabaciones Maestras Originales en Audio MP3:** Reproductor de audio integrado que te permite escuchar la interpretación original de los grandes maestros (ej: orquestas típicas de Troilo de 1966 o Gardel con sus guitarristas de 1935) mientras lees la partitura.
- **Integrable en Setlists:** Toca tangos históricos dentro de los mismos repertorios donde tienes tus canciones de guitarra o partituras modernas.

---

## 11. Instrumentos Disponibles (Guitarra y Bandoneón)

SongBook está diseñado con soporte específico para las particularidades mecánicas y sonoras de cada instrumento:

### 1. Guitarra 🎸
- **Afinación:** Soporte para afinación estándar (`E A D G B E`) y afinaciones abiertas.
- **Diagramas SVG:** Visualización de trastes del 1 al 12+, con indicación de cejillas completas y medias cejillas, cuerdas al aire (○), cuerdas muteadas (×) y digitación recomendada (dedos 1 al 4).
- **Variaciones de Acordes:** Diccionario masivo con todas las posiciones canónicas, inversiones, notas añadidas (sus4, 7, maj7, 9, 11, dim) y acordes alterados.
- **Audio de Guitarra Acústica:** Arpegios y rasgueos polifónicos basados en muestras de cuerdas reales.

### 2. Bandoneón 🪗
- **Teclado Bi-Sonoro:** Cada botón emite una nota diferente según la dirección del aire.
- **Selector de Fuelle:** Alterna entre **Abriendo** (*abriendo fuelle*) y **Cerrando** (*cerrando fuelle*).
- **Manos Independientes:** Visualización diferenciada para el teclado de **Mano Derecha** (canto / melodía) y **Mano Izquierda** (bajos / acompañamiento armónico).
- **Muestreo Típico:** Sonoridad con carácter de fuelle tanguero generada por el motor de síntesis.

---

## 12. Preguntas Frecuentes y Atajos Recomendados

### ¿Mis repertorios y preferencias se pierden al cerrar el navegador?
No. SongBook cuenta con persistencia dual: guarda tus datos tanto en el almacenamiento local de tu navegador (*LocalStorage*) como en la base de datos relacional SQLite del backend. Tus tonalidades elegidas, canciones favoritas y setlists estarán siempre disponibles al volver.

### ¿Cómo cambio la tonalidad de una canción para mi voz?
Abre la canción y haz clic en los botones **`-1`** o **`+1`** en la cabecera. La transposición es automática. Si tienes una cuenta iniciada, la tonalidad elegida se guardará automáticamente para la próxima vez que abras esa canción.

### ¿Puedo arrastrar acordes si la canción es un tema instrumental?
Sí. Puedes organizar compases en el BeatGrid o presionar el botón `➕ Añadir Letra` en el editor visual para incorporar versos o guías de texto y colocar los acordes donde desees.

### ¿Cómo toco en vivo sin tocar la pantalla?
1. Configura el **Auto-Scroll** con la velocidad deseada para que el texto baje solo.
2. Inicia el **Modo Escenario (*Stage Mode*)** desde tu setlist para avanzar de un tema a otro con un solo toque en el botón `Siguiente >`.

### ¿Qué formatos de partituras puedo abrir directamente?
Puedes arrastrar o abrir archivos:
- `.gp`, `.gp3`, `.gp4`, `.gp5`, `.gpx` (Guitar Pro)
- `.musicxml`, `.xml`, `.mxl` (MusicXML)
- `.mid`, `.midi` (Archivos MIDI multitrack)
- O buscar directamente en el catálogo en línea de Songsterr y TodoTango sin necesidad de descargar ningún archivo a tu disco.

---

> 💡 **Consejo para Músicos:** Antes de salir al escenario, arma tu repertorio en la pestaña **Repertorios**, prueba la tonalidad de cada tema y asegúrate de marcar con ⭐ tus canciones más tocadas para tenerlas a mano durante la prueba de sonido.
