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

## 4. Búsqueda Multifuente y Formatos de Imagen
- El estudio de carátulas (`MemorabiliaImageModal.jsx`) cuenta con selector desplegable de fuentes integrando Discogs, Deezer (1000px), Apple Music, Wikipedia y Cover Art Archive.
- Soporta formatos de imagen JPEG (`.jpeg`), JPG (`.jpg`), PNG (`.png`) y WebP (`.webp`) mediante archivo local, pegado de URL o portapapeles (<kbd>Ctrl+V</kbd>).
- Los contenedores vectoriales SVG configuran `referrerPolicy="no-referrer"` (sin `crossOrigin` forzado para no exigir cabeceras CORS ausentes en CDNs de terceros) y cuentan con fallback en cascada a `/api/artwork/proxy?url=...` si la imagen remota se bloquea.

## 5. Ausencia de Fotos y Prohibición de Asignación Automática
- Si un artista o un disco no posee imagen en la base de datos (`null` o vacío), **está estrictamente prohibido auto-descubrir o asignar imágenes automáticamente en segundo plano**.
- En su lugar, el sistema preserva la experiencia analógica original:
  - `ArtistPolaroid.jsx` muestra su silueta de perfil en `#292019` con el nombre del artista en tipografía caligráfica manual (*Caveat*).
  - `AlbumDiscCase.jsx` muestra el vinilo con surcos concéntricos grabados y tipografía dorada en bajorrelieve.
- La asignación de imágenes es exclusivamente voluntaria por parte del usuario o curador a través del modal interactivo de memorabilia.
