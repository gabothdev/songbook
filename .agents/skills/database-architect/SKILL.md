---
name: database-architect
description: >-
  Use this skill when modifying the Prisma schema, creating database migrations, seeding chords or songs, or debugging persistence issues in SQLite dev.db.
---

# Database Architect Skill

Esta skill guía el mantenimiento y evolución de la base de datos relacional Prisma (SQLite) de SongBook.

## 1. Reglas de Modelado
- **Transposición Personal**: Guardar siempre en `UserSongPreference` con clave `[userId, songId]`.
- **Álbumes y Portadas**: Toda carátula debe residir en `Album.cover`. Las canciones vinculan con `albumId`.
- **Artistas**: Foto única en `Artist.image`.

## 2. Procedimiento de Migración Segura en Windows
1. **Verificar procesos bloqueando DLL**:
   ```bash
   netstat -ano | findstr :3001
   ```
   Si el servidor backend está corriendo, detenerlo temporalmente antes de generar el cliente Prisma para evitar error `EPERM` en `query_engine-windows.dll.node`.
2. **Crear Respaldo**:
   Copiar `server/prisma/dev.db` a `server/prisma/dev.db.bak`.
3. **Aplicar Cambios de Esquema**:
   ```bash
   cd server
   cmd.exe /c npx prisma db push
   cmd.exe /c npx prisma generate
   ```
   # Desde la raíz del proyecto para ambos entornos:
   npm run dev
   # O solo backend:
   npm run dev:server

## 3. Verificación y Panel Dev Studio
- **API Dev Studio**:
  - `GET /api/dev/stats`: Estadísticas de tablas SQLite (`Song`, `Album`, `Artist`, `User`, `UserSongPreference`, `CustomChord`, `ChordDefinition`, etc.).
  - `GET /api/dev/tables/:table`: CRUD completo y paginado con búsquedas y filtros (`filter=sync|lyrics|youtube|score` para canciones, y `filter=pending|verified` para acordes personalizados).
  - `POST /api/dev/customchords/promote`: Promueve un acorde personalizado fusionándolo en `ChordDefinition` y eliminándolo de `CustomChord`.
  - `PATCH /api/dev/customchords/:id/toggle-verify`: Alterna estado de verificación (`verified`).
  - `GET /api/dev/albums/suggest`: Sugerencias de álbumes para autocompletado.
  - `GET /api/dev/artists/suggest`: Sugerencias de artistas vinculados.
  - `POST /api/dev/backup`: Snapshot instantáneo de `dev.db`.
  - **Sincronización Canónica de Artistas y Álbumes en `POST/PUT /api/dev/tables/songs` (`handleSongArtists` & `handleSongAlbum`)**:
    - `handleSongArtists`: En `POST` (`lookup.delegate.create`), vincula relaciones m-a-n con `{ connect: [...] }`. En `PUT` (`lookup.delegate.update`), actualiza con `{ set: [...] }`. Previene el error `Unknown argument set` en Prisma.
    - `handleSongAlbum`: Al guardar una canción con metadatos de álbum o carátula, se crea o vincula automáticamente el registro canónico en `Album` asignando `song.albumId` a partir del artista conectado.
- **Editor Visual Dev Studio (`DevItemEditModal.jsx`)**:
  - Integra `MemorabiliaImageModal` directamente en los formularios de `Song` (carátula del álbum), `Album` (carátula oficial) y `Artist` (foto Polaroid).
  - Incluye miniaturas táctiles interactivas con preview en tiempo real y buscador multifuente (Deezer, Apple Music, Cover Art Archive, Wikipedia, subida de archivos y pegado desde portapapeles con `Ctrl+V`).
- **Comprobar integridad desde CLI**:
  ```bash
  node -e "import('./server/services/db.js').then(async m => { console.log(await m.default.user.findMany()); process.exit(0); })"
  ```

