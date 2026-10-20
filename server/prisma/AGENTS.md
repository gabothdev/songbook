# Reglas y Directrices de Base de Datos (Prisma + SQLite)

Este archivo rige para el esquema `server/prisma/schema.prisma`, las rutas modulares en `server/routes/persistence/` y los servicios desacoplados en `server/services/persistence/`.

---

## 1. Principios y Reglas de Negocio
1. **Aislamiento de Transposición por Perfil (`UserSongPreference`)**:
   - `transpose` y `chordVariants` **NUNCA** se modifican en el registro global `Song`.
   - Se guardan siempre en `UserSongPreference` con la clave compuesta `[userId, songId]`.
   - Si no se especifica usuario, usar el usuario local/admin por defecto (`getResolvedUser`).
2. **Unicidad de Foto de Artista e Identidad Individual (`Artist.image`)**:
   - Cada artista tiene **una única foto oficial** en la tabla `Artist`.
   - Cuando una canción tiene múltiples colaboradores (ej. `"Edmundo Rivero, Humberto Correa"`), cada artista se almacena de forma individual en `Artist` y se conecta mediante la relación `Song.artists`. **NUNCA** crear registros compuestos concatenando nombres con comas.
   - Al actualizar la foto de un artista, `Song.artistImage` solo se propaga si dicho artista es el artista principal (o solista).
   - **Prevención de Canciones Duplicadas**: Al importar o guardar desde el buscador o el panel Dev, si ya existe una canción con el mismo `youtubeId` o combinación canónica `(title, artist)`, se actualiza (`prisma.song.update`) en lugar de crear un nuevo registro redundante.
3. **Unicidad de Carátula por Álbum (`Album.cover`)**:
   - La carátula oficial y año de lanzamiento residen en `Album`.
   - Cada canción apunta a su álbum mediante `albumId`.
   - Modificar una carátula de álbum actualiza a todas las canciones que pertenecen al mismo álbum.
   - **Tipado Estricto de `releaseYear` (`Int?`)**: En los endpoints de guardado e importación (`handleSongAlbum` en `dev.js`), `releaseYear` debe parsearse obligatoriamente con `parseInt(releaseYear, 10)` o `null` antes de invocar `prisma.album.create` o `prisma.album.update`, evitando errores de validación de Prisma si el valor proviene como string desde inputs de formulario.
4. **Relación con Partituras (`ScoreSheet.songId`)**:
   - `ScoreSheet` enlaza opcionalmente a `Song` para permitir navegación directa de acordes a partituras interactivas.
5. **Canciones Instrumentales (`Song.isInstrumental`)**:
   - La bandera `isInstrumental` distingue piezas 100% instrumentales en el catálogo general. Su edición y marcado está restringido a administradores (`role === 'ADMIN'`).
6. **Género Musical (`Song.genre`)**:
   - El campo `genre` categoriza estilos musicales (Rock, Pop, Tango, Punk, Folclore, etc.) a nivel canónico en `Song` con índice `@@index([genre])`.
   - Se persiste vía `POST /songs` y `PATCH /songs/preferences`, y se expone en búsquedas y filtros en `DevDatabaseStudio`.
7. **Caché Persistente de Letras Chordify (`ChordifyCache`)**:
   - Almacena el resultado de scraping de Chordify (`youtubeId`, `hasLyrics`, `lyricsType`, `title`, `artist`, `bpm`, `leadSheetText`) indexado por `hasLyrics`.
   - Permite verificar de forma instantánea y en segundo plano si los candidatos de búsqueda en Chordify cuentan con letra sincronizada (`leadSheetText` disponible) para desplegar el distintivo *"Incluye letra"*.
8. **Biblioteca Personal y Guardado (`UserSongPreference.isSaved`)**:
   - La biblioteca personal de un usuario en su cuaderno se compone exclusivamente de canciones con `isSaved: true`, `isFavorite: true` o incluidas en sus setlists.
   - Si una canción se marca como favorita (`isFavorite: true`) o se agrega a un setlist, se actualiza automáticamente `isSaved: true`.
   - Desguardar una canción establece `isSaved: false` en `UserSongPreference`.
   - Las relaciones en base de datos (`Favorite`, `SetlistSong`, `UserSongPreference.isSaved`) permiten computar métricas de popularidad y relevancia interna sin saturar la interfaz.
9. **Independencia del Catálogo Oficial en Búsquedas (`useSongSearch.js`)**:
   - El modal de búsqueda de canciones (`SongSearchRebuild`) busca sobre el catálogo general y canónico de la base de datos (`fetchSavedSongs()` / `GET /api/persistence/songs`), independientemente de si la canción ya fue guardada en el cuaderno personal del usuario (`UserSongPreference.isSaved`).
   - Al abrir el buscador, se consulta el catálogo oficial fresco para reflejar de inmediato canciones añadidas, curadas o renombradas en el panel Dev.

---

## 2. Procedimiento Seguro de Migraciones en Windows
1. **Prevención de Bloqueo EPERM en DLL**:
   - Antes de ejecutar `npx prisma generate` o `npx prisma db push`, detener el proceso Node que esté escuchando en el puerto 3001 para liberar el bloqueo de `query_engine-windows.dll.node`.
2. **Uso de cmd.exe**:
   - En Windows PowerShell, los scripts `npx` pueden estar bloqueados por política de ejecución (`PSSecurityException`). Usar siempre `cmd.exe /c npx prisma ...`.
3. **Respaldo Obligatorio**:
   - Antes de cualquier cambio estructural, duplicar `dev.db` en `dev.db.bak` o invocar `POST /api/dev/backup`.

---

## 3. Panel de Desarrollo (Dev Database Studio) y Laboratorio Chordify
- **Ruta Backend**: `server/routes/dev.js` montado en `/api/dev`.
- **Componente Frontend**: `src/components/dev/DevDatabaseStudio.jsx` (accesible en `/dev`, y directamente en el tester vía `/test-chordify` o `/dev/chordify`).
- **Laboratorio de Verificación Chordify (`src/components/dev/ChordifyTestStudio.jsx`)**:
  - Pestaña `chordifytest` ("Laboratorio Chordify") para auditar la paridad exacta entre el scraping de Chordify y el renderizado en SongBook (`SongLyricsRenderer` + `BeatGrid`).
  - Soporta 3 modos de carga: Base de Datos local (`Song`/`ChordifyCache`), URL o YouTube ID en vivo con Puppeteer, y buscador integrado de Chordify.
  - Incluye triple vista: Comparativa Lado a Lado (estructura cruda `lyricLine`/`chordsLine` vs hoja SongBook), Capturas de Pantalla reales tomadas por Puppeteer en Chordify (`Chords` y `Lyrics`), e Inspector de Diagnóstico compás por compás.
  - Opera en modo **Sandbox / Dry-Run** por defecto (actualiza `ChordifyCache` sin sobrescribir `Song` hasta que se pulse explícitamente *"Guardar / Actualizar en Catálogo (Song)"*).
- **Mapeo de Modelos Prisma**:
  - `songs` -> `Song` (con filtros `sync`, `lyrics`, `youtube`, `score`, carátula y edición).
  - `albums` -> `Album` (con autocompletado en `/api/dev/albums/suggest`).
  - `artists` -> `Artist` (con autocompletado en `/api/dev/artists/suggest`).
  - `setlists` -> `Setlist` y `setlistsongs` -> `SetlistSong`.
  - `users` -> `User` y `userpreferences` -> `UserSongPreference`.
  - `scoresheets` -> `ScoreSheet`.
  - `chorddefinitions` -> `ChordDefinition` y `customchords` -> `CustomChord`.
  - `chordifycache` -> `ChordifyCache`.
- **Resiliencia en Transición de Tablas (`DevDatabaseTable.jsx` / `DevDatabaseStudio.jsx`)**:
  - Al cambiar de pestaña en el panel Dev, `items` se limpia inmediatamente (`setItems([])`) para evitar que la nueva vista intente renderizar temporalmente filas con esquema cruzado antes de recibir los datos del servidor.
  - Los campos susceptibles a diferencias de esquema (como `item.artist`, que en `Album` es un objeto relacional `{ id, name, image }` y en `Song` es un string o array de colaboradores) se renderizan de manera defensiva con validación de tipo (`typeof === 'object' ? item.artist?.name : item.artist`), evitando errores de React por nodos objeto no válidos.
- **Endpoints Clave**:
  - `GET /api/dev/stats`: Conteos globales en vivo de todos los modelos y tamaño de `dev.db`.
  - `GET /api/dev/tables/:table`: Paginación, ordenamiento y búsqueda relacional (incluye filtros `pending` y `verified` para `customchords`).
  - `GET /api/dev/chordify-test/catalog`: Lista canciones locales con `youtubeId` y registros de `ChordifyCache` para el laboratorio.
  - `POST /api/dev/chordify-test/scrape`: Ejecuta scraping de diagnóstico en Chordify devolviendo `rawDiagnostics`, `screenshots` (`chordsView` y `lyricsView` en Base64) y `compases` en modo Sandbox.
  - `POST /api/dev/chordify-test/save-song`: Persiste manualmente la canción auditada en el catálogo canónico `Song`.
  - `POST /api/dev/customchords/promote`: Promueve un acorde personalizado fusionando sus posiciones en `ChordDefinition` y eliminándolo de `CustomChord`.
  - `PATCH /api/dev/customchords/:id/toggle-verify`: Alterna la bandera `verified` del acorde custom.
  - `POST /api/dev/query`: Consola SQL en vivo con medición de latencia.
  - `POST /api/dev/backup`: Snapshot instantáneo de `dev.db` con timestamp.

---

## 4. Acordes Personalizados y Catálogo Oficial
1. **Deduplicación y Acumulación (`POST /chords`)**:
   - Al guardar una variación, se verifica si ya existe físicamente (mismos trastes y posición base) en `ChordDefinition` o en `CustomChord`.
   - Si ya existe, no se duplica en la base de datos y se devuelve su índice respectivo para seleccionarlo en la canción.
   - Si no existe, se acumula en el array de posiciones de `CustomChord` y se marca con `verified: false`.
2. **Codificación de Trastes (Base36)**:
   - Las posiciones almacenan una cadena de 6 caracteres (uno por cuerda de 6ª a 1ª): `'x'` (mute), `'0'` (al aire), `'1'`..`'9'`, y letras en minúsculas en base36 (`'a'`=10, `'b'`=11, `'c'`=12... `'o'`=24) para trastes mayores o iguales a 10.
   - En el editor visual (`ChordEditorModal.jsx`), el músico visualiza e ingresa números decimales (0 a 24), transformándose de manera transparente al formato canónico base36 al guardar en la base de datos.
3. **Orden de Búsqueda (`GET /chords/lookup`)**:
   - Devuelve primero las variaciones del catálogo oficial (`ChordDefinition`) y luego las personalizadas (`CustomChord`).
4. **Persistencia de Variaciones para Administradores**:
   - Cuando un usuario con rol `ADMIN` edita o selecciona variantes de acordes para una canción, las variantes se guardan canónicamente en `Song.chordVariants` además de en su perfil `UserSongPreference`.
5. **Promoción al Catálogo Oficial**:
   - Los administradores pueden promover acordes de `CustomChord` al catálogo canónico `ChordDefinition` desde `DevDatabaseStudio`. Las posiciones se fusionan sin duplicar y el registro en `CustomChord` se elimina.

---

## 5. Arquitectura Modular de Persistencia (TypeScript + Services)
- **Rutas (`server/routes/persistence/`)**:
  - `index.ts`: Orquestador que monta subrutas garantizando 100% retrocompatibilidad con `/api/persistence/*`.
  - `songs.routes.ts`: `GET /songs`, `POST /songs`, `POST /songs/restore-original`, `PATCH /songs/preferences`.
  - `library.routes.ts`: `GET /library`, `POST /library/save`, `POST /library/unsave`, `GET /favorites`, `POST /favorites`, `DELETE /favorites/:songId`.
  - `setlists.routes.ts`: `GET /setlists`, `POST /setlists`, `POST /setlists/songs`, `DELETE /setlists/:setlistName/songs/:songId`, `DELETE /setlists/:name`.
  - `artists.routes.ts`: `PATCH /artists/:id`, `POST /artists/update-image`.
  - `chords.routes.ts`: `GET /chords`, `POST /chords`, `GET /chords/lookup`.
- **Servicios Desacoplados (`server/services/persistence/`)**:
  - `songService.ts`: Búsqueda flexible/fuzzy, cálculo de popularidad, transposición, aislamiento de preferencias de usuario y respaldos de versión original.
  - `libraryService.ts`: Gestión de canciones guardadas, favoritas y en setlists.
  - `setlistService.ts`: Colecciones, ordenamiento secuencial y aislamiento por usuario.
  - `artistService.ts`: Unicidad canónica de fotos de artistas y sincronización con canciones.
  - `chordService.ts`: Búsqueda enarmónica, verificación de equivalencia física de digitaciones y acumulación de variantes.
  - `userHelper.ts`: Resolución segura de usuario activo / admin fallback.
