---
name: score-transcriber
description: >-
  Use this skill when developing, debugging, or extending sheet music and tablature features using AlphaTab, Songsterr API, TodoTango archives, or AlphaTex syntax.
---

# Score Transcriber Skill

Esta skill guía el trabajo con partituras y tablaturas interactivas multitrack en AlphaTab.

## 1. Verificación de Sintaxis AlphaTex
Antes de renderizar cualquier tablatura con `api.load()`:
1. Asegurarse de que `lr` (*let ring*) y `pm` (*palm mute*) estén únicamente en notas individuales, nunca en acordes ni silencios.
2. Agrupar propiedades de tiempo en un único bloque de llaves `{ch "C" lyrics "texto"}` (evitar `{...}{...}`).
3. Pasar siempre el texto por `src/utils/alphaTexSanitizer.js`.

## 2. Configuración de AlphaTab en el Atril (`ScoreStandView.jsx`)
- Contenedor con `w-full p-0`.
- Altura acotada al viewport: `h-[calc(100vh-115px)]` con `overflow-y-auto`.
- `scrollElement` asignado al contenedor de la partitura.
- Rítmica de tablatura: `notation.rhythmMode = 2` y `notation.rhythmHeight = 24`.
- Perfil de pentagrama: `detectIdealStaveProfile(track)` para conmutar a pentagrama clásico sin tablaturas numéricas en instrumentos como bandoneón, piano y voz.

## 3. Sincronización con YouTube
- Consultar marcas de compases (`videoPoints`).
- Priorizar grabaciones maestras originales o audios oficiales de estudio (`start < 1.5s`).
- Interpolar ticks en tiempo real según `ytPlayer.getCurrentTime()`.
