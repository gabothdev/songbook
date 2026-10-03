# Guía de Arquitectura e Índice de Desarrollo: SongBook v2

SongBook (*"The Musician's Notebook"*) es un cancionero y atril digital interactivo diseñado para músicos, compositores y bandas. Recrea la experiencia táctil de un cuaderno encuadernado en espiral con hojas de papel texturadas, sincronización rítmica con videos de YouTube, partituras interactivas y gestión de repertorios.

---

## 1. Arquitectura del Proyecto

```text
songbook/
├── src/
│   ├── components/
│   │   ├── notebook/         # Cuaderno analógico doble página, espiral, setlists, tapas
│   │   ├── song/             # Cancionero (SongSheetView, BeatGrid, Memorabilia, video flotante)
│   │   ├── scores/           # Atril de partituras interactivas AlphaTab, Songsterr, TodoTango
│   │   ├── search/           # Buscador inteligente por opciones y biblioteca interna
│   │   ├── guitar/           # Diagramas vectoriales SVG de acordes
│   │   └── monetization/     # Modal de upgrade a SongBook Pro y control de cuotas
│   ├── services/             # Clientes API: persistenceApi, scoresApi, scraperApi
│   ├── hooks/                # useYouTubeSync, useSongPreferences, useSetlistManager, usePitchShiftAudio
│   └── utils/                # audioPlayer (Tone.js), alphaTexSanitizer, music, gridParser
└── server/
    ├── routes/               # persistence.js, audio.js, songs.js, scores.js
    ├── services/             # songsterr.js, todotango.js, scraper.js, omr.js
    ├── config/               # puppeteer.js (Stealth / Chrome nativo)
    └── prisma/               # schema.prisma, dev.db (SQLite)
```

---

## 2. Reglas Específicas por Dominio

Para optimizar el uso de contexto en las conversaciones con IA, cada módulo técnico cuenta con sus directrices específicas:

- **Partituras, AlphaTab & Songsterr**: Ver [src/components/scores/AGENTS.md](file:///e:/Proyectos/songbook/src/components/scores/AGENTS.md).
- **Base de Datos, Prisma & Usuarios**: Ver [server/prisma/AGENTS.md](file:///e:/Proyectos/songbook/server/prisma/AGENTS.md).
- **Cancionero, BeatGrid & Memorabilia**: Ver [src/components/song/AGENTS.md](file:///e:/Proyectos/songbook/src/components/song/AGENTS.md).
- **Cuaderno Analógico & Setlists**: Ver [src/components/notebook/AGENTS.md](file:///e:/Proyectos/songbook/src/components/notebook/AGENTS.md).

---

## 3. Invariantes del Sistema

1. **Aislamiento de Transposición**: `transpose` y `chordVariants` pertenecen exclusivamente al perfil de usuario (`UserSongPreference`) y nunca modifican el catálogo público global `Song`.
2. **Unicidad de Foto de Artista**: Cada artista tiene una única foto canónica en la tabla `Artist`.
3. **Unicidad de Carátula por Álbum**: Cada álbum tiene una única carátula oficial en la tabla `Album`. Las canciones apuntan a su álbum mediante `albumId`.
4. **Sanitización AlphaTex**: Toda partitura AlphaTex debe procesarse con `alphaTexSanitizer.js` para evitar errores `AT202` y `AT205`.
5. **Layout Persistente**: Nunca desmontar el reproductor de video de YouTube o atril al cambiar de pestaña; mantener el ciclo de vida continuo.
6. **Mantenimiento Continuo de Docs y Skills (Auto-Sync)**: Al implementar nuevas lógicas, corregir bugs o modificar contratos de datos, el agente DEBE actualizar obligatoriamente el archivo `AGENTS.md` del módulo correspondiente y/o las skills afectadas en `.agents/skills/<skill-name>/SKILL.md` antes de dar la tarea por concluida.
