---
name: memorabilia-artifacts
description: >-
  Use this skill when developing or modifying SongMemorabiliaDesk, Polaroid cards, album disc cases (cd-2.svg), concert ticket cases (ticket.svg), or movie film cases (movie.svg).
---

# Memorabilia Artifacts Skill

Esta skill guía la experiencia visual de coleccionables y estuches vectoriales en el escritorio de SongBook.

## 1. Asignación de Estuches Vectoriales
- `studio` y `acoustic`: Usan `AlbumDiscCase.jsx` con `/cd-2.svg` (estuche acrílico de disco compacto).
- `live`: Usa `TicketStubCase.jsx` con `/ticket.svg` (recorte de entrada con foto en elemento SVG `<rect id="photo" />`).
- `soundtrack` y `session`: Usan `MovieFilmCase.jsx` con `/movie.svg` (fotograma de película con textura cinematográfica y foto en `<rect id="photo" />`).

## 2. Pila de Polaroids de Artistas
- Muestra fotos de los artistas de la canción apiladas con rotación orgánica.
- Al hacer clic, se expande a pantalla completa con navegación por flechas (`ArrowLeft` / `ArrowRight`).
- Los administradores pueden cambiar la foto del artista, la cual se sincroniza canónicamente en `Artist.image` y se propaga a todas sus canciones.

## 3. Persistencia
- Al editar datos del estuche (álbum, año, tipo de versión o carátula), enviar siempre el `currentUser` a `updateSongPreferences` para persistir en `Album` y `UserSongPreference`.
