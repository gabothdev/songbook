@echo off
title SongBook - Compartir con Usuarios
cd /d "%~dp0"
echo Iniciando entorno para compartir SongBook...
node scripts/share.js
pause
