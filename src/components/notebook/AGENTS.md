# Reglas y Directrices del Cuaderno Analógico (`src/components/notebook/`)

Este archivo rige para los componentes del cuaderno doble página (`NotebookSpread`, `SetlistsPanel`, `FavoritesLibraryPanel`, `NotebookCover`, `SpiralRings`).

---

## 1. Diseño y Estética Visual
1. **Metáfora Analógica del Cuaderno**:
   - Todo elemento debe evocar papel real, textura granulada (`.paper-texture`), escritorio (`.desk-surface`), anillas metálicas centrales (`SpiralRings`) y sombras orgánicas.
   - Usar Framer Motion para animaciones físicas creíbles: pase de página en 3D (`triggerPageFlip`), inclinación suave de tarjetas y recortes rasgados.
2. **Animación 3D de Pase de Página**:
   - Duración: Fase 1 (450ms) -> llamada al callback de cambio de contenido -> Fase 2 (450ms) conclusión.
   - Total 900ms con `isPageFlipping` para bloquear clics espurios durante la transición.

---

## 2. Gestión de Repertorios (Setlists) y Biblioteca (Usuario Autenticado)
1. **Página Izquierda (`SetlistsPanel`) - Hub de Filtros y Repertorios**:
   - Cabecera con mini-perfil del usuario (nombre e instrumento).
   - Botones selectores de filtro principal:
     - 🔖 **Mis Guardadas**: Muestra el catálogo completo guardado por el usuario (`userSongs.filter(s => s.isSaved !== false)`).
     - ⭐ **Mis Favoritas**: Filtra únicamente las canciones marcadas con estrella (`userSongs.filter(s => s.isFavorite)`).
   - Sección interactiva **Mis Setlists & Repertorios**:
     - Botón "+ Nueva Lista" con formulario desplegable en línea.
     - Lista de carpetas de repertorios con conteo de temas y acción para eliminar repertorios con confirmación.
     - Al seleccionar un setlist, actualiza el filtro activo (`activeLibraryFilter = 'setlist'`) y carga inmediatamente las canciones de dicho repertorio en la página derecha.
   - Acciones inferiores fijas: "Desbloquear SongBook Pro" (si aplica), "Buscar en Web" y "+ Nueva Canción".
2. **Página Derecha (`FavoritesLibraryPanel`) - Catálogo en Cuadrícula y Buscador Rápido**:
   - Cabecera reactiva al filtro activo:
     - Muestra el título contextual ("Mis Canciones Guardadas", "Mis Canciones Favoritas", o el nombre del setlist activo).
     - Badge con la cantidad total de canciones filtradas.
     - En vista de setlist: botón para iniciar show en vivo (`▶ Tocar Set`) y botón de eliminación de setlist con confirmación.
   - Buscador rápido en tiempo real (idéntico al de Modo Libre / `GuestPrompt.jsx`), filtrando instantáneamente por título, artista o tono (`key`).
   - Cuadrícula de 2 columnas de tarjetas (`grid-cols-1 sm:grid-cols-2 gap-2`):
     - Tarjetas en formato botón interactivo con marco Polaroid alternado (`-rotate-1` / `rotate-1`), foto del artista o fallback temático, título, artista, tono y popularidad.
     - **Play en Hover**: La foto Polaroid revela un overlay con botón Play al hacer hover sobre la tarjeta, y toda la superficie de la tarjeta abre y reproduce la canción en `SongSheetView`.
     - Botones de acción rápida embebidos a la derecha con `e.stopPropagation()`:
       - ⭐ Favorito: activa o remueve la estrella sin abrir la canción.
       - 📁➕ Sumar a Repertorio: abre un popover flotante con la lista de setlists del usuario, indicando con tilde (`✓`) los que ya contienen el tema y permitiendo sumar o quitar de cualquier setlist con un solo clic.
       - 🗑️ Quitar: activa confirmación rápida inline (`¿Quitar? Sí / No`) para evitar borrados accidentales, y tras confirmar remueve del setlist actual (en vista de setlist) o desguarda del catálogo (en vista de guardadas).
3. **Stage Mode (Modo Escenario)**:
   - Permite navegación fluida entre canciones y partituras con `< Anterior` y `Siguiente >` sin desmontar la sesión ni perder el tono personalizado.
4. **Catálogo Exclusivo por Base de Datos**:
   - Toda inicialización de canciones y repertorios proviene exclusivamente de SQLite (`/api/persistence/*`).
   - Se prescinde de listas estáticas de canciones de muestra (`SAMPLE_SONGS_DATA` opera como caché dinámico en memoria y `INITIAL_USER_SONGS` / `INITIAL_SETLISTS` inician vacíos).

---

## 3. Modo Libre Inicial y Acceso al Cancionero (`GuestPrompt.jsx`)
1. **Solapa Inicial por Defecto**:
   - Al cargar el cuaderno sin sesión activa, la solapa visible es siempre `'guest'` (**Modo Libre**).
2. **Propuesta de Autenticación de Alto Contraste**:
   - Tarjeta en gradiente ámbar con botones directos para *"Iniciar Sesión"* y *"Crear Cuenta Gratis"*, explicando el beneficio de guardar favoritas y armar setlists.
3. **Cards con Foto en Polaroid en Cuadrícula de 2 Columnas**:
   - Grilla interactiva en 2 columnas (`grid-cols-1 sm:grid-cols-2 gap-2`) filtrable en tiempo real con buscador integrado.
   - Cada canción se muestra en una tarjeta botón compacta con foto del artista en marco Polaroid analógico (rotación alternada), título, artista, badge de tono (`key`) y badge de popularidad comunitaria (`⭐ popularityScore`).
   - El catálogo en Modo Libre y catálogo general de base de datos se ordenan automáticamente por popularidad comunitaria descendente (`(favorites * 3) + (setlists * 2) + (saved * 1)`).
   - Al hacer clic en cualquier punto de la card, abre la canción directamente en `SongSheetView`.
4. **Dimensiones Bloqueadas del Cuaderno (`h-[580px] xl:h-[640px] 2xl:h-[700px]`)**:
   - Tanto la página izquierda como la derecha base en `NotebookSpread.jsx` poseen las mismas restricciones rígidas de altura (`h-[...] min-h-[...] max-h-[...]`) que `SongSheetView`, garantizando que el cuaderno jamás altere su altura ni se estire al cambiar de pestaña.
5. **Protección y Aislamiento Estricto de Setlists y Favoritos**:
   - Se elimina el botón de sesión temporal *"Comenzar a tocar"*. Los usuarios sin cuenta navegan el catálogo canónico en Modo Libre.
   - Si un usuario no autenticado intenta marcar favorita o añadir a un setlist desde `SongSheetView`, se despliega un modal interactivo (`AuthRequiredModal`).
   - Al pulsar *"Crear Cuenta Gratis"*, se navega directamente a la pestaña de registro (`setActiveAuthTab('register')`) cerrando la canción sin regresar a Modo Libre.
   - Al pulsar *"Iniciar Sesión"*, se navega directamente a la solapa de ingreso (`setActiveAuthTab('login')`).
   - Los setlists y favoritos pertenecen **estricta y exclusivamente** al usuario que los creó (`userId: activeUser.id`). Usuarios anónimos o diferentes cuentas jamás tienen visibilidad ni acceso a repertorios ajenos (`GET /setlists` y `GET /favorites` devuelven `[]` si no hay sesión activa).
6. **Navegación mediante Solapas de Índice (`NotebookTabs`)**:
   - Al hacer clic en las solapas externas (*"Ingresar"*, *"Crear Cuenta"* o *"Modo Libre"*) mientras se está dentro de una canción (`SongSheetView`), el sistema cierra la canción con animación 3D de pase de página hacia atrás (`triggerPageFlip('backward')`) y muestra directamente la vista correspondiente (formulario de login, registro o catálogo de Modo Libre).

---

## 4. Controlador Centralizado de Navegación y Hooks de Repertorio
1. **Controlador `navigateNotebook` en `NotebookSpread.jsx`**:
   - Centraliza todas las transiciones entre Modo Libre, formularios de ingreso/registro, repertorios y visor de canciones/partituras.
   - Bloquea clics duplicados con `isPageFlipping`, limpia de forma atómica canciones y partituras activas (`selectedSong`, `activeScoreData`, `stageModeSetlist`) y ejecuta el efecto de pase de página en 3D en la dirección correspondiente.
2. **Modularización de `useSetlistManager.js`**:
   - Compone internamente dos hooks especializados:
     - `useUserLibrary.js`: Catálogo de canciones, favoritos y guardado en biblioteca personal (`isSaved`).
     - `useSetlistRepertoire.js`: Setlists, modo escenario (`stageModeSetlist`) y navegación de show en vivo (`setlistContext`).
   - Mantiene 100% retrocompatibilidad con la API consumida en toda la aplicación.
