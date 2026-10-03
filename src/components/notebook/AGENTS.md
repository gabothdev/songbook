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

## 2. Gestión de Repertorios (Setlists) y Biblioteca
1. **Página Izquierda (`SetlistsPanel`)**:
   - Listado de repertorios y contenido ordenado por `order`.
   - Badges enriquecidos para identificar tipos de contenido: `🎸 TAB` (Songsterr), `🎻 TANGO` (TodoTango), `{Tono}` (Cancionero estándar).
2. **Página Derecha (`FavoritesLibraryPanel`)**:
   - Catálogo ordenado alfabéticamente o por favoritos.
   - Al abrir cualquier canción, fusionar siempre con las preferencias del usuario (`UserSongPreference`) y catálogo canónico.
3. **Stage Mode (Modo Escenario)**:
   - Permite navegación fluida entre canciones y partituras con `< Anterior` y `Siguiente >` sin desmontar la sesión ni perder el tono personalizado.
