# Reglas y Directrices de Base de Datos (Prisma + SQLite)

Este archivo rige para el esquema `server/prisma/schema.prisma`, rutas en `server/routes/persistence.js` y servicios de datos.

---

## 1. Principios y Reglas de Negocio
1. **Aislamiento de Transposición por Perfil (`UserSongPreference`)**:
   - `transpose` y `chordVariants` **NUNCA** se modifican en el registro global `Song`.
   - Se guardan siempre en `UserSongPreference` con la clave compuesta `[userId, songId]`.
   - Si no se especifica usuario, usar el usuario local/admin por defecto (`getResolvedUser`).
2. **Unicidad de Foto de Artista (`Artist.image`)**:
   - Cada artista tiene **una única foto oficial** en la tabla `Artist`.
   - Al actualizar la foto de un artista, sincronizar `Song.artistImage` en todas sus canciones.
3. **Unicidad de Carátula por Álbum (`Album.cover`)**:
   - La carátula oficial y año de lanzamiento residen en `Album`.
   - Cada canción apunta a su álbum mediante `albumId`.
   - Modificar una carátula de álbum actualiza a todas las canciones que pertenecen al mismo álbum.
4. **Relación con Partituras (`ScoreSheet.songId`)**:
   - `ScoreSheet` enlaza opcionalmente a `Song` para permitir navegación directa de acordes a partituras interactivas.
5. **Canciones Instrumentales (`Song.isInstrumental`)**:
   - La bandera `isInstrumental` distingue piezas 100% instrumentales en el catálogo general. Su edición y marcado está restringido a administradores (`role === 'ADMIN'`).

---

## 2. Procedimiento Seguro de Migraciones en Windows
1. **Prevención de Bloqueo EPERM en DLL**:
   - Antes de ejecutar `npx prisma generate` o `npx prisma db push`, detener el proceso Node que esté escuchando en el puerto 3001 para liberar el bloqueo de `query_engine-windows.dll.node`.
2. **Uso de cmd.exe**:
   - En Windows PowerShell, los scripts `npx` pueden estar bloqueados por política de ejecución (`PSSecurityException`). Usar siempre `cmd.exe /c npx prisma ...`.
3. **Respaldo Obligatorio**:
   - Antes de cualquier cambio estructural, duplicar `dev.db` en `dev.db.bak` o invocar `POST /api/dev/backup`.

---

## 3. Panel de Desarrollo (Dev Database Studio)
- **Ruta Backend**: `server/routes/dev.js` montado en `/api/dev`.
- **Componente Frontend**: `src/components/dev/DevDatabaseStudio.jsx` (accesible en `/dev`).
- **Mapeo de Modelos Prisma**:
  - `songs` -> `Song` (con filtros `sync`, `lyrics`, `youtube`, `score`, carátula y edición).
  - `albums` -> `Album` (con autocompletado en `/api/dev/albums/suggest`).
  - `artists` -> `Artist` (con autocompletado en `/api/dev/artists/suggest`).
  - `setlists` -> `Setlist` y `setlistsongs` -> `SetlistSong`.
  - `users` -> `User` y `userpreferences` -> `UserSongPreference`.
  - `scoresheets` -> `ScoreSheet`.
  - `chorddefinitions` -> `ChordDefinition` y `customchords` -> `CustomChord`.
- **Endpoints Clave**:
  - `GET /api/dev/stats`: Conteos globales en vivo de todos los modelos y tamaño de `dev.db`.
  - `GET /api/dev/tables/:table`: Paginación, ordenamiento y búsqueda relacional.
  - `POST /api/dev/query`: Consola SQL en vivo con medición de latencia.
  - `POST /api/dev/backup`: Snapshot instantáneo de `dev.db` con timestamp.
