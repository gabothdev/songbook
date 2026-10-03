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
4. **Reiniciar Servidor**:
   ```bash
   cd server
   cmd.exe /c npm run dev
   ```

## 3. Verificación
Comprobar integridad consultando la base de datos:
```bash
node -e "import('./server/services/db.js').then(async m => { console.log(await m.default.user.findMany()); process.exit(0); })"
```
