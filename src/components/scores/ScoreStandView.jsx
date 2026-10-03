import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AlphaTabApi, Environment } from '@coderline/alphatab';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Gauge,
  Music,
  Bookmark,
  Layers,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  ArrowLeft,
  FileText,
  Video,
  Mic,
  Headphones,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Loader2,
  Upload,
  Radio,
  Sparkles,
  AlertCircle,
  Maximize2,
  FolderPlus,
  ListMusic,
  Mic2,
  CheckCircle,
  LogOut,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScoreStageBar from './ScoreStageBar';
import TangoArchiveViewer from './TangoArchiveViewer';
import ScoreDigitizerStudio from './ScoreDigitizerStudio';
import { sanitizeAlphaTex } from '../../utils/alphaTexSanitizer';

// Configurar AlphaTab para renderizar la banda de letras en la parte inferior del pentagrama de tablatura (estilo Songsterr)
if (Environment?.defaultRenderers) {
  Environment.defaultRenderers.forEach((factory) => {
    if (factory.effectBands) {
      factory.effectBands.forEach((band) => {
        if (band.effect?.constructor?.name === 'LyricsEffectInfo') {
          band.mode = 3; // 3 = EffectBandMode.SharedBottom (debajo de notas y plicas)
        }
      });
    }
  });
}

const SOUNDFONT_URL = 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2';

function getTuningDescription(tuningArray) {
  if (!tuningArray || tuningArray.length === 0) return 'Estándar (E-A-D-G-B-E)';
  const standard = [64, 59, 55, 50, 45, 40];
  const dropD = [64, 59, 55, 50, 45, 38];
  const ebStandard = [63, 58, 54, 49, 44, 39];
  const dStandard = [62, 57, 53, 48, 43, 38];

  const matches = (arr) => arr.length === tuningArray.length && arr.every((v, i) => v === tuningArray[i]);
  if (matches(standard)) return 'Estándar (E-A-D-G-B-E)';
  if (matches(dropD)) return 'Drop D (D-A-D-G-B-E)';
  if (matches(ebStandard)) return 'Medio tono abajo (Eb-Ab-Db-Gb-Bb-Eb)';
  if (matches(dStandard)) return 'D Standard (1 tono abajo)';
  return 'Afinación Alternativa';
}

function getDifficultyLabel(diff) {
  if (!diff) return null;
  switch (diff) {
    case 1: return { text: 'Principiante', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 2: return { text: 'Intermedio Bajo', color: 'bg-sky-100 text-sky-800 border-sky-300' };
    case 3: return { text: 'Intermedio', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    case 4: return { text: 'Avanzado', color: 'bg-orange-100 text-orange-800 border-orange-300' };
    case 5: return { text: 'Virtuoso', color: 'bg-rose-100 text-rose-800 border-rose-300' };
    default: return { text: `Nivel ${diff}`, color: 'bg-stone-100 text-stone-700 border-stone-300' };
  }
}

/**
 * Detecta automáticamente el perfil de notación óptimo según el instrumento:
 * - Bandoneón / Piano / Teclados / Cuerdas clásicas / Vientos / Voz -> 'score' (Pentagrama estándar)
 * - Guitarras / Bajo / Ukelele -> 'default' (Tablatura + Pentagrama) o 'tab'
 */
function detectIdealStaveProfile(track) {
  if (!track) return 'default';
  if (!track.tuning || track.tuning.length === 0) return 'score';

  const name = (track.name || '').toLowerCase();
  const scoreKeywords = [
    'piano', 'bandoneon', 'bandoneón', 'accordion', 'acordeon', 'acordeón',
    'teclado', 'keyboard', 'organ', 'órgano', 'violin', 'violín', 'viola',
    'cello', 'violonchelo', 'flute', 'flauta', 'trumpet', 'trompeta',
    'sax', 'clarinete', 'oboe', 'fagot', 'voice', 'voz', 'choir', 'coro',
    'brass', 'strings', 'cuerdas'
  ];

  if (scoreKeywords.some(kw => name.includes(kw))) {
    return 'score';
  }

  const p = track.playbackInfo?.program ?? (track.instrument ?? -1);
  if ((p >= 0 && p <= 23) || (p >= 40 && p <= 79)) {
    return 'score';
  }

  return 'default';
}

/**
 * Convierte los segundos de reproducción de un video de YouTube al tick exacto de AlphaTab
 * utilizando la matriz de videoPoints (marcas de tiempo por compás extraídas de Songsterr).
 */
function ytTimeToAlphaTabTick(ytSec, videoPoints, score) {
  if (!score?.masterBars || score.masterBars.length === 0) return null;
  const masterBars = score.masterBars;

  if (!Array.isArray(videoPoints) || videoPoints.length === 0) {
    return null;
  }

  // Si el video está en el silencio de entrada previo al primer compás
  if (ytSec < videoPoints[0]) {
    return {
      tick: masterBars[0].start,
      measureIndex: 0,
      currentBar: 1,
      isIntro: true
    };
  }

  // Si el video ya superó el último punto disponible
  const lastIdx = Math.min(videoPoints.length - 1, masterBars.length - 1);
  if (ytSec >= videoPoints[lastIdx]) {
    const lastBar = masterBars[lastIdx];
    const dur = lastBar.calculateDuration ? lastBar.calculateDuration() : 3840;
    return {
      tick: lastBar.start + dur,
      measureIndex: lastIdx,
      currentBar: lastIdx + 1,
      isIntro: false
    };
  }

  // Búsqueda del compás m donde videoPoints[m] <= ytSec < videoPoints[m + 1]
  let m = 0;
  for (let i = 0; i < videoPoints.length - 1; i++) {
    if (ytSec >= videoPoints[i] && ytSec < videoPoints[i + 1]) {
      m = i;
      break;
    }
  }

  const mStart = videoPoints[m];
  const mEnd = videoPoints[m + 1];
  const mDur = mEnd - mStart;
  const progress = mDur > 0 ? Math.min(1, Math.max(0, (ytSec - mStart) / mDur)) : 0;

  const bar = masterBars[m];
  if (!bar) return null;

  const barDur = bar.calculateDuration ? bar.calculateDuration() : 3840;
  const tick = bar.start + Math.round(progress * barDur);

  return {
    tick,
    measureIndex: m,
    currentBar: m + 1,
    isIntro: false
  };
}

/**
 * Convierte un compás y posición fraccional de AlphaTab a segundos del video de YouTube.
 */
function alphaTabBeatToYtTime(barIndex, beatFraction = 0, videoPoints, api) {
  if (Array.isArray(videoPoints) && videoPoints.length > 0) {
    const idx = Math.max(0, Math.min(barIndex, videoPoints.length - 1));
    const mStart = videoPoints[idx];
    if (idx >= videoPoints.length - 1) return mStart;
    const mEnd = videoPoints[idx + 1];
    return mStart + beatFraction * (mEnd - mStart);
  }
  return (api?.timePosition || 0) / 1000;
}

export default function ScoreStandView({
  scoreData,
  isLoading = false,
  onBack,
  onSaveToLibrary,
  isSaved = false,
  onSwitchPart,
  setlists = [],
  onAddSongToSetlist,
  setlistContext = null,
}) {
  const scrollContainerRef = useRef(null);
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const audioHistoricalRef = useRef(null);
  const isPlayingRef = useRef(false);
  const lastYtSyncTimeRef = useRef(0);
  const ytSyncIntervalRef = useRef(null);
  const lastSyncedBarRef = useRef(-1);
  const standFileInputRef = useRef(null);
  const setlistDropdownRef = useRef(null);
  const addToSetlistRef = useRef(null);

  // Estado local para archivo cargado directamente por Drag & Drop / Input
  const [localScore, setLocalScore] = useState(null);
  const effectiveScore = localScore || scoreData;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [currentBar, setCurrentBar] = useState(1);
  const [layoutMode, setLayoutMode] = useState('page'); // 'page' | 'horizontal'
  const [staveProfile, setStaveProfile] = useState('default'); // 'default' (both) | 'score' | 'tab'
  const [zoomScale, setZoomScale] = useState(1.0);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(effectiveScore?.activePartId ?? 0);
  const [discoveredTracks, setDiscoveredTracks] = useState([]);
  const [isTrackDropdownOpen, setIsTrackDropdownOpen] = useState(false);
  const [isLoadingPart, setIsLoadingPart] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pdfAlertOpen, setPdfAlertOpen] = useState(false);

  // Setlist dropdowns y feedback toast
  const [isAddToSetlistOpen, setIsAddToSetlistOpen] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  // Estudio de Digitalización OMR Split-View
  const [isDigitizerOpen, setIsDigitizerOpen] = useState(false);
  const [digitizerTarget, setDigitizerTarget] = useState(null);

  // Funciones avanzadas y sincronización
  const [isMuteLead, setIsMuteLead] = useState(false); // Modo Ensayo (Backing Track)
  const [isVideoOpen, setIsVideoOpen] = useState(false); // Video YouTube flotante
  const [isLyricsOpen, setIsLyricsOpen] = useState(false); // Panel de letra
  const [isYtReady, setIsYtReady] = useState(false);
  const [isYtMuted, setIsYtMuted] = useState(false);
  const [isSynthMuted, setIsSynthMuted] = useState(Boolean(effectiveScore?.youtubeId));

  // Estados específicos para modo Partitura Histórica (TodoTango)
  const isTangoArchive = effectiveScore?.type === 'tango_archive' || (effectiveScore?.pages && effectiveScore.pages.length > 0);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [tangoZoom, setTangoZoom] = useState(100);
  const [activeRecordingIndex, setActiveRecordingIndex] = useState(0);
  const [isAudioHistoricalPlaying, setIsAudioHistoricalPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  // Click outside para cerrar menú desplegable de Añadir a Setlist
  useEffect(() => {
    if (!isAddToSetlistOpen) return;
    const handleClickOutside = (e) => {
      if (addToSetlistRef.current && !addToSetlistRef.current.contains(e.target)) {
        setIsAddToSetlistOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAddToSetlistOpen]);

  // Manejador para agregar partitura actual a un setlist
  const handleSelectSetlistToAdd = (setlistName) => {
    if (!onAddSongToSetlist || !effectiveScore) return;

    const payload = {
      id: effectiveScore.id || (effectiveScore.songsterrId ? `st_${effectiveScore.songsterrId}` : `tango_${effectiveScore.tangoId || Date.now()}`),
      title: effectiveScore.title,
      artist: effectiveScore.artist || effectiveScore.composer || 'Artista',
      composer: effectiveScore.composer || effectiveScore.artist,
      isScore: true,
      type: effectiveScore.type || (effectiveScore.songsterrId ? 'score' : 'tango_archive'),
      songsterrId: effectiveScore.songsterrId || effectiveScore.songId,
      tangoId: effectiveScore.tangoId || effectiveScore.id,
      pages: effectiveScore.pages,
      recordings: effectiveScore.recordings,
      tracks: effectiveScore.tracks,
      activePartId: selectedTrackIndex,
      youtubeId: effectiveScore.youtubeId,
      difficulty: effectiveScore.difficulty,
      rhythm: effectiveScore.rhythm || 'Score',
    };

    onAddSongToSetlist(setlistName, payload);
    setIsAddToSetlistOpen(false);
    setFeedbackToast(`Añadida a repertorio [${setlistName}]`);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // Loop de sincronización rítmica continua entre YouTube y AlphaTab
  const stopYtSyncLoop = useCallback(() => {
    if (ytSyncIntervalRef.current) {
      clearInterval(ytSyncIntervalRef.current);
      ytSyncIntervalRef.current = null;
    }
  }, []);

  const startYtSyncLoop = useCallback(() => {
    stopYtSyncLoop();

    ytSyncIntervalRef.current = setInterval(() => {
      if (!ytPlayerRef.current || !apiRef.current || !isPlayingRef.current) return;

      try {
        const ytSec = ytPlayerRef.current.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : null;
        if (typeof ytSec !== 'number') return;

        const videoPoints = effectiveScore?.videoPoints;
        const sync = ytTimeToAlphaTabTick(ytSec, videoPoints, apiRef.current.score);

        if (sync) {
          apiRef.current.tickPosition = sync.tick;
          setCurrentBar(sync.currentBar);
          setCurrentTimeMs(Math.round(ytSec * 1000));

          // Desplazamiento inteligente de partitura al cambiar de compás
          if (sync.currentBar !== lastSyncedBarRef.current) {
            lastSyncedBarRef.current = sync.currentBar;
            if (scrollContainerRef.current && apiRef.current.renderer?.boundsLookup) {
              const bounds = apiRef.current.renderer.boundsLookup.findMasterBarByIndex(sync.measureIndex);
              if (bounds) {
                const targetY = bounds.realBounds?.y ?? bounds.visualBounds?.y ?? 0;
                const container = scrollContainerRef.current;
                const currentScroll = container.scrollTop;
                const containerHeight = container.clientHeight;
                if (targetY < currentScroll || targetY > currentScroll + containerHeight - 140) {
                  container.scrollTo({
                    top: Math.max(0, targetY - 60),
                    behavior: 'smooth'
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        // ignore
      }
    }, 40);
  }, [effectiveScore?.videoPoints, stopYtSyncLoop]);

  // Actualizar duración total cuando cargan los videoPoints
  useEffect(() => {
    if (effectiveScore?.videoPoints?.length > 0) {
      const endSec = effectiveScore.videoPoints[effectiveScore.videoPoints.length - 1];
      setTotalTimeMs(Math.round(endSec * 1000));
    }
  }, [effectiveScore?.videoPoints]);

  // Extraer secciones estructurales (markers / \section) de la partitura
  const sections = useMemo(() => {
    if (!effectiveScore?.partData?.measures) return [];
    const list = [];
    effectiveScore.partData.measures.forEach((m, idx) => {
      if (m.marker?.text) {
        list.push({
          name: m.marker.text,
          startBar: idx + 1,
          measureIndex: idx,
        });
      }
    });

    if (list.length === 0) {
      list.push({ name: 'Inicio', startBar: 1, measureIndex: 0 });
    } else if (list[0].measureIndex > 0) {
      list.unshift({ name: 'Intro', startBar: 1, measureIndex: 0 });
    }
    return list;
  }, [effectiveScore?.partData?.measures]);

  // Salto interactivo a una sección seleccionada
  const handleJumpToSection = useCallback((sec) => {
    if (!apiRef.current) return;
    const at = apiRef.current;
    const masterBar = at.score?.masterBars?.[sec.measureIndex];
    if (masterBar && masterBar.start !== undefined) {
      at.tickPosition = masterBar.start;
      setCurrentBar(sec.startBar);
      lastSyncedBarRef.current = sec.startBar;

      // Desplazar suavemente el contenedor de la partitura hacia el compás
      const bounds = at.renderer?.boundsLookup?.findMasterBarByIndex(sec.measureIndex);
      if (bounds && scrollContainerRef.current) {
        const targetY = bounds.realBounds?.y ?? bounds.visualBounds?.y ?? 0;
        scrollContainerRef.current.scrollTo({
          top: Math.max(0, targetY - 24),
          behavior: 'smooth',
        });
      }

      // Sincronizar video de YouTube al compás seleccionado con marcas de tiempo exactas
      if (ytPlayerRef.current) {
        const targetSec = alphaTabBeatToYtTime(sec.measureIndex, 0, effectiveScore?.videoPoints, at);
        try {
          ytPlayerRef.current.seekTo(targetSec, true);
          setCurrentTimeMs(Math.round(targetSec * 1000));
        } catch (e) {}
      }
    }
  }, [effectiveScore?.videoPoints]);

  // Actualizar selectedTrackIndex si effectiveScore cambia
  useEffect(() => {
    if (effectiveScore?.activePartId !== undefined) {
      setSelectedTrackIndex(effectiveScore.activePartId);
    }
  }, [effectiveScore?.activePartId]);

  // Cargar API de YouTube IFrame si aún no está presente
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }
  }, []);

  // Inicializar o recargar reproductor de YouTube sincronizado
  useEffect(() => {
    const rawId = effectiveScore?.youtubeId;
    if (!rawId || typeof rawId !== 'string' || rawId.trim() === '' || rawId === 'null' || rawId === 'undefined') {
      setIsYtReady(false);
      return;
    }

    // Extraer ID limpio si es URL completa de YouTube
    let cleanYtId = rawId.trim();
    if (cleanYtId.includes('v=')) {
      cleanYtId = cleanYtId.split('v=')[1]?.split('&')[0];
    } else if (cleanYtId.includes('youtu.be/')) {
      cleanYtId = cleanYtId.split('youtu.be/')[1]?.split('?')[0];
    } else if (cleanYtId.includes('embed/')) {
      cleanYtId = cleanYtId.split('embed/')[1]?.split('?')[0];
    }

    // Un videoId válido de YouTube debe tener entre 6 y 32 caracteres alfanuméricos, guiones o guiones bajos
    if (!cleanYtId || cleanYtId.length < 6 || !/^[a-zA-Z0-9_-]+$/.test(cleanYtId)) {
      setIsYtReady(false);
      return;
    }

    let destroyed = false;
    setIsYtReady(false);

    const setupYt = () => {
      if (destroyed) return;
      if (!window.YT || !window.YT.Player) {
        setTimeout(setupYt, 150);
        return;
      }

      const targetEl = document.getElementById('score_yt_player_div');
      if (!targetEl) {
        setTimeout(setupYt, 150);
        return;
      }

      try {
        if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
          ytPlayerRef.current.destroy();
        }
      } catch (e) {}

      try {
        ytPlayerRef.current = new window.YT.Player('score_yt_player_div', {
          videoId: cleanYtId,
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (destroyed) return;
              setIsYtReady(true);
              if (isYtMuted) {
                event.target.mute();
              }
            },
            onStateChange: (event) => {
              if (destroyed) return;
              // 1 = Reproduciendo
              if (event.data === 1) {
                setIsPlaying(true);
                isPlayingRef.current = true;
                startYtSyncLoop();
                if (apiRef.current) {
                  try {
                    apiRef.current.masterVolume = 0;
                    apiRef.current.play();
                  } catch (e) {}
                }
              } else if (event.data === 2 || event.data === 0) {
                // 2 = Pausado, 0 = Terminado
                setIsPlaying(false);
                isPlayingRef.current = false;
                stopYtSyncLoop();
                if (apiRef.current) {
                  try { apiRef.current.pause(); } catch (e) {}
                }
              }
            },
          },
        });
      } catch (e) {
        console.error('Error al inicializar YouTube Iframe Player:', e);
      }
    };

    setupYt();

    return () => {
      destroyed = true;
      stopYtSyncLoop();
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
        ytPlayerRef.current = null;
      }
    };
  }, [effectiveScore?.youtubeId, isYtMuted, startYtSyncLoop, stopYtSyncLoop]);

  // ================= INICIALIZACIÓN MULTIFORMATO DE ALPHATAB =================
  useEffect(() => {
    // Si es una partitura de archivo histórico (TodoTango), no inicializamos AlphaTab
    if (isTangoArchive) return;

    const effectiveAlphaTex = effectiveScore?.alphaTex || effectiveScore?.songData?.alphaTex;
    const hasDigitalContent = Boolean(effectiveAlphaTex || effectiveScore?.scoreBuffer || effectiveScore?.musicXml);
    if (!containerRef.current || !hasDigitalContent) return;

    if (apiRef.current) {
      try {
        apiRef.current.destroy();
      } catch (e) {
        console.warn('Error al destruir instancia anterior de AlphaTab:', e);
      }
      apiRef.current = null;
    }

    try {
      const at = new AlphaTabApi(containerRef.current, {
        core: {
          engine: 'svg',
          logLevel: 'warning',
          useWorkers: false,
        },
        display: {
          layoutMode: layoutMode === 'page' ? 0 : 1, // 0 = Page, 1 = Horizontal
          staveProfile: staveProfile === 'tab' ? 3 : (staveProfile === 'score' ? 2 : 0),
          scale: zoomScale,
          padding: [25, 20, 25, 30], // [left, top, right, bottom] márgenes simétricos
          firstSystemPaddingTop: 10,
          systemPaddingTop: 15,
          systemPaddingBottom: 25,
          lastSystemPaddingBottom: 45,
        },
        notation: {
          rhythmMode: 2, // 2 = TabRhythmMode.ShowWithBars (barras y tiempos de compás conectados bajo la tablatura estilo Songsterr)
          rhythmHeight: 24,
          elements: {
            scoreTitle: false,
            scoreSubTitle: false,
            scoreArtist: false,
            scoreAlbum: false,
            scoreWords: false,
            scoreMusic: false,
            scoreWordsAndMusic: false,
            scoreCopyright: false,
          },
        },
        player: {
          enablePlayer: true,
          enableCursor: true,
          soundFont: SOUNDFONT_URL,
          scrollElement: scrollContainerRef.current || containerRef.current,
          scrollMode: 1,
        },
      });

      // Cursor de ensayo estilo Songsterr (cápsula verde vertical redondeada libre de distorsiones)
      at.customCursorHandler = {
        _pill: null,
        onAttach(cursors) {
          const pill = document.createElement('div');
          pill.className = 'songsterr-playback-pill';
          cursors.cursorWrapper.element.appendChild(pill);
          this._pill = pill;
        },
        onDetach() {
          if (this._pill) {
            this._pill.remove();
            this._pill = null;
          }
        },
        placeBarCursor(barCursor, beatBounds) {
          const barBounds = beatBounds.barBounds.masterBarBounds.visualBounds;
          barCursor.setBounds(barBounds.x, barBounds.y, barBounds.w, barBounds.h);
        },
        placeBeatCursor(beatCursor, beatBounds, startBeatX) {
          const barBoundings = beatBounds.barBounds.masterBarBounds;
          const barBounds = barBoundings.visualBounds;

          beatCursor.transitionToX(0, startBeatX);
          beatCursor.setBounds(startBeatX, barBounds.y, 1, barBounds.h);

          if (this._pill) {
            const lineBounds = barBoundings.lineAlignedBounds || barBounds;
            const top = (lineBounds.y ?? barBounds.y) - 6;
            const height = (lineBounds.h ?? barBounds.h) + 12;
            const pillW = 20;

            this._pill.style.position = 'absolute';
            this._pill.style.left = `${startBeatX - pillW / 2}px`;
            this._pill.style.top = `${top}px`;
            this._pill.style.width = `${pillW}px`;
            this._pill.style.height = `${height}px`;
            this._pill.style.transition = 'none';
            this._pill.style.display = 'block';
          }
        },
        transitionBeatCursor(beatCursor, beatBounds, startBeatX, endBeatX, duration) {
          if (this._pill && duration > 0) {
            const pillW = 20;
            this._pill.style.transition = `left ${duration}ms linear`;
            this._pill.style.left = `${endBeatX - pillW / 2}px`;
          } else {
            this.placeBeatCursor(beatCursor, beatBounds, startBeatX);
          }
        },
      };

      // Detección de instrumento al cargar la partitura
      at.scoreLoaded.on((score) => {
        if (score.tracks && score.tracks.length > 0) {
          const tList = score.tracks.map((t, idx) => ({
            trackIndex: idx,
            name: t.name || `Pista ${idx + 1}`,
            tuning: t.tuning ? Array.from(t.tuning) : [],
            instrument: t.playbackInfo?.program
          }));
          setDiscoveredTracks(tList);

          // Si el usuario no especificó manualmente staveProfile, auto-detectar
          const activeTrack = score.tracks[selectedTrackIndex] || score.tracks[0];
          const detected = detectIdealStaveProfile(activeTrack);
          setStaveProfile(detected);
        }
      });

      // CARGA MULTIFORMATO: Guitar Pro binario / Stream interno / MusicXML / AlphaTex
      if (effectiveScore.scoreBuffer) {
        at.load(effectiveScore.scoreBuffer);
      } else if (effectiveScore.streamUrl) {
        scoresApi.getScoreStreamBytes(effectiveScore.streamUrl)
          .then(bytes => {
            at.load(bytes);
          })
          .catch(err => {
            console.error('Error cargando flujo binario interno de partitura:', err);
            setLoadError('No se pudo cargar el archivo de la partitura.');
          });
      } else if (effectiveScore.musicXml) {
        const xmlBytes = typeof effectiveScore.musicXml === 'string'
          ? new TextEncoder().encode(effectiveScore.musicXml)
          : effectiveScore.musicXml;
        at.load(xmlBytes);
      } else if (effectiveAlphaTex) {
        at.tex(sanitizeAlphaTex(effectiveAlphaTex));
      }

      // Eventos del reproductor AlphaTab
      at.playerReady.on(() => {
        setIsPlayerReady(true);
        if (effectiveScore?.videoPoints?.length > 0) {
          const endSec = effectiveScore.videoPoints[effectiveScore.videoPoints.length - 1];
          setTotalTimeMs(Math.round(endSec * 1000));
        } else {
          setTotalTimeMs(at.endTime || 0);
        }

        // Si hay video de YouTube, silenciar sintetizador para que no colisione con el audio del video
        if (isSynthMuted || effectiveScore?.youtubeId) {
          try { at.masterVolume = 0; } catch (e) {}
        }
      });

      at.playerStateChanged.on((args) => {
        const playing = (args.state === 1);
        if (!effectiveScore?.youtubeId) {
          setIsPlaying(playing);
          isPlayingRef.current = playing;
        }
      });

      at.playerPositionChanged.on((args) => {
        if (!effectiveScore?.youtubeId || !isPlayingRef.current) {
          setCurrentTimeMs(args.currentTime || 0);
          if (args.currentBeat?.voice?.bar?.index !== undefined) {
            setCurrentBar(args.currentBeat.voice.bar.index + 1);
          }
        }
      });

      at.playerFinished.on(() => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        stopYtSyncLoop();
        if (ytPlayerRef.current) {
          try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
        }
      });

      // Salto interactivo al hacer clic en cualquier compás o nota
      at.beatMouseDown.on((beat) => {
        if (beat && beat.playbackStart !== undefined && apiRef.current) {
          apiRef.current.tickPosition = beat.playbackStart;

          const bar = beat.voice?.bar;
          const barIndex = bar?.index ?? 0;
          const barStart = bar?.masterBar?.start ?? 0;
          const barDur = bar?.masterBar?.calculateDuration ? bar.masterBar.calculateDuration() : 3840;
          const beatFraction = barDur > 0 ? (beat.playbackStart - barStart) / barDur : 0;

          setCurrentBar(barIndex + 1);
          lastSyncedBarRef.current = barIndex + 1;

          if (ytPlayerRef.current) {
            const targetSec = alphaTabBeatToYtTime(barIndex, beatFraction, effectiveScore?.videoPoints, apiRef.current);
            try {
              ytPlayerRef.current.seekTo(targetSec, true);
              setCurrentTimeMs(Math.round(targetSec * 1000));
            } catch (e) {}
          }
        }
      });

      apiRef.current = at;
    } catch (err) {
      console.error('Error al inicializar AlphaTab:', err);
    }

    return () => {
      if (apiRef.current) {
        try {
          apiRef.current.destroy();
        } catch (e) {}
        apiRef.current = null;
      }
    };
  }, [
    isTangoArchive,
    effectiveScore?.alphaTex,
    effectiveScore?.scoreBuffer,
    effectiveScore?.musicXml,
    effectiveScore?.videoPoints,
    effectiveScore?.youtubeId,
    layoutMode,
    staveProfile,
    zoomScale,
    isSynthMuted,
    stopYtSyncLoop
  ]);

  // ================= MANEJO DE ARCHIVOS LOCALES (.GP, .MUSICXML, ETC) =================
  const processLocalFile = useCallback((file) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
      setPdfAlertOpen(true);
      return;
    }

    const isBinary = ['gp', 'gp3', 'gp4', 'gp5', 'gpx', 'mid', 'midi'].includes(ext);
    const reader = new FileReader();

    if (isBinary) {
      reader.onload = (ev) => {
        const buffer = ev.target?.result;
        if (buffer) {
          setLocalScore({
            title: file.name.replace(/\.[^/.]+$/, ''),
            artist: 'Archivo Local',
            scoreBuffer: buffer,
            fileName: file.name,
            source: 'Local',
            type: 'guitar_pro'
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else if (['xml', 'musicxml'].includes(ext)) {
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === 'string') {
          setLocalScore({
            title: file.name.replace(/\.[^/.]+$/, ''),
            artist: 'Archivo Local',
            musicXml: text,
            fileName: file.name,
            source: 'Local',
            type: 'musicxml'
          });
        }
      };
      reader.readAsText(file);
    } else {
      alert(`Formato .${ext} no compatible. Por favor sube un archivo .gp (3 al 7), .musicxml, o .mid.`);
    }
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processLocalFile(e.dataTransfer.files[0]);
    }
  };

  // Controles de transporte
  const handlePlayPause = useCallback(() => {
    if (isTangoArchive) {
      // En modo Tango Histórico, controla la grabación de audio si existe
      if (audioHistoricalRef.current) {
        if (isAudioHistoricalPlaying) {
          audioHistoricalRef.current.pause();
          setIsAudioHistoricalPlaying(false);
        } else {
          audioHistoricalRef.current.play();
          setIsAudioHistoricalPlaying(true);
        }
      }
      return;
    }

    if (!apiRef.current) return;

    if (isPlaying) {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.pauseVideo(); } catch (e) {}
      }
      apiRef.current.pause();
      stopYtSyncLoop();
      setIsPlaying(false);
      isPlayingRef.current = false;
    } else {
      if (ytPlayerRef.current && effectiveScore?.youtubeId) {
        try { ytPlayerRef.current.playVideo(); } catch (e) {}
        startYtSyncLoop();
      } else {
        apiRef.current.play();
      }
      setIsPlaying(true);
      isPlayingRef.current = true;
    }
  }, [isTangoArchive, isPlaying, isAudioHistoricalPlaying, effectiveScore?.youtubeId, startYtSyncLoop, stopYtSyncLoop]);

  const handleStop = useCallback(() => {
    if (isTangoArchive) {
      if (audioHistoricalRef.current) {
        audioHistoricalRef.current.pause();
        audioHistoricalRef.current.currentTime = 0;
        setIsAudioHistoricalPlaying(false);
        setAudioCurrentTime(0);
      }
      return;
    }

    stopYtSyncLoop();
    if (apiRef.current) {
      apiRef.current.stop();
    }
    setIsPlaying(false);
    isPlayingRef.current = false;

    if (ytPlayerRef.current) {
      try {
        ytPlayerRef.current.pauseVideo();
        const initialSec = effectiveScore?.videoPoints?.[0] ?? 0;
        ytPlayerRef.current.seekTo(initialSec, true);
        setCurrentTimeMs(Math.round(initialSec * 1000));
      } catch (e) {}
    } else {
      setCurrentTimeMs(0);
    }
    setCurrentBar(1);
    lastSyncedBarRef.current = 1;
  }, [isTangoArchive, effectiveScore?.videoPoints, stopYtSyncLoop]);

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (apiRef.current) {
      apiRef.current.playbackSpeed = speed;
    }
    if (ytPlayerRef.current && ytPlayerRef.current.setPlaybackRate) {
      try {
        ytPlayerRef.current.setPlaybackRate(speed);
      } catch (e) {}
    }
  };

  const handleToggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    if (apiRef.current) {
      apiRef.current.isLooping = next;
    }
  };

  const handleToggleMetronome = () => {
    const next = !isMetronomeActive;
    setIsMetronomeActive(next);
    if (apiRef.current) {
      apiRef.current.metronomeVolume = next ? 1.0 : 0.0;
    }
  };

  const handleToggleMuteLead = () => {
    const next = !isMuteLead;
    setIsMuteLead(next);
    if (apiRef.current && apiRef.current.score) {
      try {
        apiRef.current.changeTrackMute([selectedTrackIndex], next);
      } catch (e) {
        console.warn('Error al mutear pista:', e);
      }
    }
  };

  const handleToggleYtMute = () => {
    const next = !isYtMuted;
    setIsYtMuted(next);
    if (ytPlayerRef.current) {
      try {
        if (next) {
          ytPlayerRef.current.mute();
        } else {
          ytPlayerRef.current.unMute();
        }
      } catch (e) {}
    }
  };

  const handleToggleSynthMute = () => {
    const next = !isSynthMuted;
    setIsSynthMuted(next);
    if (apiRef.current) {
      try {
        apiRef.current.masterVolume = next ? 0 : 1;
      } catch (e) {}
    }
  };

  const handleSelectTrack = async (trackIndex) => {
    if (trackIndex === selectedTrackIndex || isLoadingPart) return;
    setIsTrackDropdownOpen(false);
    setSelectedTrackIndex(trackIndex);
    setIsMuteLead(false);

    // Si es un archivo local de AlphaTab, renderizar pista directamente
    if (apiRef.current && apiRef.current.score?.tracks?.[trackIndex]) {
      try {
        apiRef.current.renderTracks([apiRef.current.score.tracks[trackIndex]]);
        const trackObj = apiRef.current.score.tracks[trackIndex];
        setStaveProfile(detectIdealStaveProfile(trackObj));
        return;
      } catch (e) {
        console.warn('Error al cambiar de pista en AlphaTab:', e);
      }
    }

    // Si es una partitura remota de Songsterr
    if (onSwitchPart) {
      setIsLoadingPart(true);
      try {
        await onSwitchPart(trackIndex);
      } catch (err) {
        console.error('Error al cambiar de pista remota:', err);
      } finally {
        setIsLoadingPart(false);
      }
    }
  };

  const handlePrint = () => {
    if (apiRef.current?.print) {
      try {
        apiRef.current.print();
        return;
      } catch (e) {
        console.warn('AlphaTab print fallback:', e);
      }
    }
    window.print();
  };

  const formatTime = (ms) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ================= ESTADO DE CARGA =================
  if (isLoading || !effectiveScore) {
    return (
      <div className="w-full h-full flex flex-col min-h-0 bg-white text-stone-900 rounded-xl sm:rounded-2xl shadow-2xl border border-stone-200 overflow-hidden relative select-none p-6 sm:p-10 justify-between">
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold font-sans transition cursor-pointer shadow-xs border border-stone-300"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Cuaderno</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="font-serif italic text-xs text-stone-400">SongBook • Partituras & Tablaturas</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center my-12">
          <div className="relative mb-4">
            <div className="w-14 h-14 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
            <Music className="w-6 h-6 text-emerald-700 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h3 className="font-serif font-black text-2xl text-stone-900">
            Cargando Hoja de Partitura...
          </h3>
          <p className="font-sans text-xs text-stone-500 mt-2 max-w-sm">
            Preparando compases, afinación, pistas y notación musical para imprimir en pantalla.
          </p>
        </div>

        <div className="text-center text-[11px] text-stone-400 font-mono border-t border-stone-100 pt-3">
          Preparando notación musical de alta fidelidad...
        </div>
      </div>
    );
  }

  const diffBadge = getDifficultyLabel(effectiveScore.difficulty);
  const tuningLabel = getTuningDescription(effectiveScore.activeTuning);
  const activeTracksList = (effectiveScore.tracks && effectiveScore.tracks.length > 0) 
    ? effectiveScore.tracks 
    : discoveredTracks;

  return (
    <div 
      className="w-full h-full flex flex-col min-h-0 bg-white text-stone-900 rounded-xl sm:rounded-2xl shadow-2xl border border-stone-200 overflow-hidden relative select-none print:shadow-none print:border-none print:m-0"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Overlay Drag & Drop */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-amber-900/40 backdrop-blur-sm border-4 border-dashed border-amber-500 flex flex-col items-center justify-center text-white pointer-events-none">
          <Upload className="w-16 h-16 mb-3 animate-bounce text-amber-300" />
          <h3 className="text-xl font-bold font-serif">Suelta tu archivo aquí</h3>
          <p className="text-xs font-sans text-amber-100 mt-1">
            Compatible con Guitar Pro (.gp, .gp3-7), MusicXML y MIDI
          </p>
        </div>
      )}

      {/* Modal Alerta Estricta PDF */}
      {pdfAlertOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-300 text-stone-900">
            <div className="flex items-center gap-3 text-amber-700 mb-3">
              <AlertCircle className="w-7 h-7" />
              <h4 className="font-serif font-bold text-lg text-stone-950">
                Archivo PDF no estructurado
              </h4>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-sans">
              Los archivos PDF contienen imágenes estáticas escaneadas sin información vectorial de compases, tempos ni pistas de audio.
            </p>
            <p className="text-xs text-stone-600 leading-relaxed font-sans mt-2">
              Para reproducir sonido interactivo, cambiar de instrumentos o sincronizar con YouTube, por favor importa un archivo estructurado <strong>.gp (Guitar Pro)</strong> o <strong>.musicxml</strong>.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setPdfAlertOpen(false)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-amber-300 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Comprendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= TOAST NOTIFICATION ================= */}
      <AnimatePresence>
        {feedbackToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-stone-900/90 backdrop-blur-md text-amber-200 px-4 py-2 rounded-2xl shadow-2xl border border-amber-500/40 text-xs font-sans font-bold flex items-center gap-2 pointer-events-none"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{feedbackToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= LIVE STAGE NAVIGATION BAR (When in Setlist Mode) ================= */}
      <ScoreStageBar
        setlistContext={setlistContext}
        currentTitle={effectiveScore.title}
        onBack={onBack}
      />

      {/* ================= BARRA SUPERIOR / ATRIL ================= */}
      <div className="flex-shrink-0 bg-stone-50/95 border-b border-stone-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs z-20 print:hidden">
        {/* Lado izquierdo: Botón volver + Título, Artista, Afinación */}
        <div className="flex items-center gap-3.5 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 rounded-xl text-xs font-bold font-sans transition cursor-pointer shadow-xs border border-stone-300 flex-shrink-0"
              title="Volver al índice del cancionero"
            >
              <ArrowLeft className="w-4 h-4 text-stone-600" />
              <span className="hidden sm:inline">Volver</span>
            </button>
          )}

          <div className="truncate">
            <div className="flex items-center gap-2">
              <h2 className="font-serif font-black text-stone-950 text-base sm:text-xl leading-tight truncate">
                {effectiveScore.title}
              </h2>
              {isTangoArchive ? (
                <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                  🎻 Tango Archivo
                </span>
              ) : diffBadge ? (
                <span className={`text-[10px] font-sans font-bold px-2 py-0.5 rounded-full border shadow-2xs ${diffBadge.color}`}>
                  {diffBadge.text}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-xs text-stone-600 truncate mt-0.5 font-sans">
              <span className="font-bold text-stone-800">{effectiveScore.artist || effectiveScore.composer}</span>
              {isTangoArchive ? (
                <>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-rose-800 font-semibold">
                    {effectiveScore.rhythm || 'Tango'} {effectiveScore.year ? `(${effectiveScore.year})` : ''}
                  </span>
                </>
              ) : (
                <>
                  <span>•</span>
                  <span className="font-mono text-[11px] text-emerald-800 font-semibold">
                    🎸 {tuningLabel}
                  </span>
                  {effectiveScore.capo > 0 && (
                    <>
                      <span>•</span>
                      <span className="bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold text-[10px]">
                        Capo {effectiveScore.capo}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Lado Derecho: Controles de Importación, Imprimir, Modo Ensayo, Video, Guardar */}
        <div className="flex items-center gap-2 flex-wrap relative">
          {/* Botón Abrir Archivo Local */}
          <label className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden lg:inline">Abrir .gp / XML</span>
            <input
              ref={standFileInputRef}
              type="file"
              accept=".gp,.gp3,.gp4,.gp5,.gpx,.xml,.musicxml,.mid,.midi,.pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) processLocalFile(e.target.files[0]);
                if (standFileInputRef.current) standFileInputRef.current.value = '';
              }}
            />
          </label>

          {/* Botón Imprimir / PDF */}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            title="Imprimir hoja de partitura o guardar como PDF"
          >
            <Printer className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden md:inline">Imprimir</span>
          </button>

          {/* Botón Estudio de Digitalización Split-View (Oculto temporalmente) */}
          {/*
          <button
            type="button"
            onClick={() => {
              setDigitizerTarget({
                score: effectiveScore,
                pageUrl: effectiveScore?.pages?.[activePageIndex] || null,
                pageIndex: activePageIndex
              });
              setIsDigitizerOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
            title="Abrir Estudio de Digitalización OMR Split-View (Cotejar original y notación digital)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span className="hidden sm:inline">Digitalizar</span>
          </button>
          */}

          {!isTangoArchive && (
            <>
              {/* Botón Modo Ensayo (Backing Track) */}
              <button
                type="button"
                onClick={handleToggleMuteLead}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-bold transition cursor-pointer ${
                  isMuteLead
                    ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-inner'
                    : 'bg-white hover:bg-stone-100 text-stone-800 border-stone-300 shadow-xs'
                }`}
                title={isMuteLead ? 'Restaurar pista de guitarra' : 'Silenciar guitarra para tocar tú'}
              >
                <Headphones className={`w-3.5 h-3.5 ${isMuteLead ? 'text-amber-700' : 'text-stone-600'}`} />
                <span className="hidden sm:inline">Modo Ensayo</span>
              </button>
            </>
          )}

          {/* Botón Video de YouTube Sincronizado */}
          {effectiveScore.youtubeId && (
            <button
              type="button"
              onClick={() => setIsVideoOpen(!isVideoOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-bold transition cursor-pointer ${
                isVideoOpen
                  ? 'bg-red-600 text-white border-red-700 shadow-inner'
                  : 'bg-white hover:bg-stone-100 text-stone-800 border-stone-300 shadow-xs'
              }`}
              title="Abrir reproductor de video de YouTube sincronizado"
            >
              <Video className={`w-3.5 h-3.5 ${isVideoOpen ? 'text-white' : 'text-red-600'}`} />
              <span className="hidden sm:inline">Video Sync</span>
            </button>
          )}

          {/* Botón Letra */}
          {effectiveScore.lyrics && (
            <button
              type="button"
              onClick={() => setIsLyricsOpen(!isLyricsOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-bold transition cursor-pointer ${
                isLyricsOpen
                  ? 'bg-stone-800 text-amber-300 border-stone-900 shadow-inner'
                  : 'bg-white hover:bg-stone-100 text-stone-800 border-stone-300 shadow-xs'
              }`}
              title="Mostrar letra de la canción"
            >
              <Mic className="w-3.5 h-3.5 text-stone-600" />
              <span className="hidden sm:inline">Letra</span>
            </button>
          )}

          {/* Selector de Pistas / Instrumentos (en scores digitales) */}
          {!isTangoArchive && activeTracksList?.length > 1 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsTrackDropdownOpen(!isTrackDropdownOpen)}
                disabled={isLoadingPart}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg text-xs font-bold text-stone-800 transition shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isLoadingPart ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-700" />
                ) : (
                  <Layers className="w-3.5 h-3.5 text-amber-700" />
                )}
                <span className="truncate max-w-[90px] sm:max-w-[130px]">
                  {activeTracksList.find(t => t.trackIndex === selectedTrackIndex)?.name || 'Instrumento'}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-500" />
              </button>

              {isTrackDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-stone-300 rounded-xl shadow-2xl py-1 z-50 text-xs">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100">
                    Cambiar Pista / Instrumento
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {activeTracksList.map((track) => (
                      <button
                        key={track.trackIndex}
                        type="button"
                        onClick={() => handleSelectTrack(track.trackIndex)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-stone-50 transition cursor-pointer ${
                          track.trackIndex === selectedTrackIndex
                            ? 'bg-amber-50 text-amber-900 font-bold border-l-3 border-amber-600'
                            : 'text-stone-700'
                        }`}
                      >
                        <span className="truncate pr-2">{track.name}</span>
                        {track.tuning?.length > 0 && (
                          <span className="text-[10px] text-stone-400 font-mono">
                            {track.tuning.length}c
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botón Añadir a Setlist */}
          {onAddSongToSetlist && setlists.length > 0 && (
            <div ref={addToSetlistRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAddToSetlistOpen(!isAddToSetlistOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                title="Añadir esta partitura a un setlist"
              >
                <FolderPlus className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Al Setlist</span>
              </button>

              <AnimatePresence>
                {isAddToSetlistOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white text-stone-900 rounded-2xl border border-stone-300 shadow-2xl p-2.5 z-50 text-left paper-texture"
                  >
                    <div className="text-[11px] font-sans font-bold text-stone-700 px-2 py-1 border-b border-stone-200 mb-1.5 flex items-center justify-between">
                      <span>Sumar partitura a:</span>
                      <button
                        type="button"
                        onClick={() => setIsAddToSetlistOpen(false)}
                        className="text-stone-400 hover:text-stone-700 cursor-pointer p-0.5"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {setlists.map((sl) => {
                        const scoreId = effectiveScore.id || (effectiveScore.songsterrId ? `st_${effectiveScore.songsterrId}` : `tango_${effectiveScore.tangoId}`);
                        const alreadyIn = sl.songs?.some((s) => s.id === scoreId || (s.title === effectiveScore.title && (s.artist === effectiveScore.artist || s.artist === effectiveScore.composer)));
                        return (
                          <button
                            key={sl.name}
                            type="button"
                            onClick={() => handleSelectSetlistToAdd(sl.name)}
                            className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-sans hover:bg-amber-50 border border-transparent hover:border-amber-200 flex items-center justify-between transition-colors group cursor-pointer"
                          >
                            <span className="font-semibold text-stone-800 group-hover:text-amber-950 truncate max-w-[150px]">
                              {sl.name}
                            </span>
                            {alreadyIn ? (
                              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                                En lista
                              </span>
                            ) : (
                              <span className="text-[10px] font-sans text-stone-400 group-hover:text-amber-700 flex-shrink-0">
                                {sl.songs?.length || 0} temas
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Botón Guardar en Biblioteca */}
          {onSaveToLibrary && (
            <button
              type="button"
              onClick={onSaveToLibrary}
              disabled={isSaved}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer ${
                isSaved
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border border-stone-900'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
              <span className="hidden sm:inline">{isSaved ? 'Guardada' : 'Guardar'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ================= BARRA DE SECCIONES (MINIMAPA RÍTMICO) ================= */}
      {!isTangoArchive && sections.length > 0 && (
        <div className="flex-shrink-0 bg-stone-100/90 border-b border-stone-200/80 px-4 sm:px-6 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-2xs z-10 print:hidden">
          <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold mr-1 flex-shrink-0">
            Secciones:
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {sections.map((sec, idx) => {
              const nextSec = sections[idx + 1];
              const isActive = nextSec
                ? currentBar >= sec.startBar && currentBar < nextSec.startBar
                : currentBar >= sec.startBar;

              return (
                <button
                  key={`${sec.name}_${sec.startBar}`}
                  type="button"
                  onClick={() => handleJumpToSection(sec)}
                  className={`px-2.5 py-1 rounded-full text-xs font-sans font-semibold transition cursor-pointer flex-shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-stone-900 text-amber-300 shadow-xs ring-1 ring-amber-400/40'
                      : 'bg-white hover:bg-stone-200/80 text-stone-700 border border-stone-300/80 shadow-2xs'
                  }`}
                >
                  <span>{sec.name}</span>
                  <span className="text-[10px] opacity-60 font-mono">c.{sec.startBar}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= BARRA DE TRANSPORTE Y REPRODUCCIÓN ================= */}
      <div className="flex-shrink-0 bg-stone-900 text-stone-100 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-md z-20 print:hidden">
        {/* Play / Pause / Stop */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePlayPause}
            className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center transition shadow-md cursor-pointer flex-shrink-0"
            title={isPlaying || isAudioHistoricalPlaying ? 'Pausar' : 'Reproducir'}
          >
            {isPlaying || isAudioHistoricalPlaying ? (
              <Pause className="w-4 h-4 fill-current" />
            ) : (
              <Play className="w-4 h-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={handleStop}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition cursor-pointer flex-shrink-0"
            title="Detener y volver al inicio"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>

          {/* Tiempo y Compás */}
          <div className="font-mono text-xs text-stone-300 ml-2">
            {isTangoArchive ? (
              <span>{formatTime(audioCurrentTime * 1000)} / {formatTime(audioDuration * 1000)}</span>
            ) : (
              <>
                <span className="text-amber-300 font-bold">{formatTime(currentTimeMs)}</span>
                <span className="text-stone-500"> / </span>
                <span className="text-stone-400">{formatTime(totalTimeMs)}</span>
                <span className="ml-2 text-stone-400 font-sans text-[11px]">
                  (Compás <strong className="text-stone-200 font-mono">{currentBar}</strong>)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Grabación Histórica de Tango si aplica */}
        {isTangoArchive && effectiveScore.recordings?.length > 0 && (
          <div className="flex items-center gap-2 bg-stone-800/90 px-3 py-1 rounded-xl border border-stone-700 text-xs">
            <Radio className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <select
              value={activeRecordingIndex}
              onChange={(e) => {
                const idx = Number(e.target.value);
                setActiveRecordingIndex(idx);
                setIsAudioHistoricalPlaying(false);
                if (audioHistoricalRef.current) {
                  audioHistoricalRef.current.currentTime = 0;
                }
              }}
              className="bg-transparent text-stone-200 font-sans text-xs focus:outline-hidden cursor-pointer max-w-[200px] truncate"
            >
              {effectiveScore.recordings.map((rec, i) => (
                <option key={i} value={i} className="bg-stone-900 text-stone-200">
                  {rec.formation || rec.title} ({rec.details || rec.duration})
                </option>
              ))}
            </select>
            <audio
              ref={audioHistoricalRef}
              src={effectiveScore.recordings[activeRecordingIndex]?.mp3}
              onTimeUpdate={(e) => setAudioCurrentTime(e.target.currentTime)}
              onLoadedMetadata={(e) => setAudioDuration(e.target.duration)}
              onEnded={() => setIsAudioHistoricalPlaying(false)}
            />
          </div>
        )}

        {/* Velocidad, Bucle, Metrónomo y Vistas */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {!isTangoArchive && (
            <>
              {/* Velocidad de Reproducción */}
              <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-0.5 border border-stone-700">
                {[0.75, 1.0, 1.25].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                      playbackSpeed === speed
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'text-stone-300 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Bucle */}
              <button
                type="button"
                onClick={handleToggleLoop}
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  isLooping
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-white'
                }`}
                title={isLooping ? 'Desactivar bucle' : 'Repetir en bucle'}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>

              {/* Metrónomo */}
              <button
                type="button"
                onClick={handleToggleMetronome}
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  isMetronomeActive
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-white'
                }`}
                title={isMetronomeActive ? 'Silenciar metrónomo' : 'Activar clic de metrónomo'}
              >
                <Gauge className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-stone-700 mx-1" />

              {/* Modo de Vista: Tab vs Pentagrama vs Ambos */}
              <div className="flex items-center bg-stone-800 rounded-lg p-0.5 border border-stone-700">
                <button
                  type="button"
                  onClick={() => setStaveProfile('tab')}
                  className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                    staveProfile === 'tab' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
                  }`}
                  title="Mostrar solo tablatura"
                >
                  Tab
                </button>
                <button
                  type="button"
                  onClick={() => setStaveProfile('score')}
                  className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                    staveProfile === 'score' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
                  }`}
                  title="Mostrar solo pentagrama clásico (ideal para Bandoneón y Piano)"
                >
                  Notas
                </button>
                <button
                  type="button"
                  onClick={() => setStaveProfile('default')}
                  className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                    staveProfile === 'default' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
                  }`}
                  title="Mostrar tablatura y pentagrama juntos"
                >
                  Ambos
                </button>
              </div>

              {/* Zoom */}
              <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-0.5 border border-stone-700">
                <button
                  type="button"
                  onClick={() => setZoomScale(Math.max(0.7, zoomScale - 0.1))}
                  className="p-1 text-stone-300 hover:text-white transition cursor-pointer"
                  title="Reducir tamaño"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="font-mono text-[10px] text-stone-400 px-1">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale(Math.min(1.5, zoomScale + 0.1))}
                  className="p-1 text-stone-300 hover:text-white transition cursor-pointer"
                  title="Aumentar tamaño"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
              </div>
            </>
          )}

          {/* Controles de Zoom para Modo Tango Histórico */}
          {isTangoArchive && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-0.5 border border-stone-700">
                <button
                  type="button"
                  onClick={() => setTangoZoom(Math.max(60, tangoZoom - 15))}
                  className="p-1 text-stone-300 hover:text-white transition cursor-pointer"
                  title="Reducir"
                >
                  <ZoomOut className="w-3 h-3" />
                </button>
                <span className="font-mono text-[10px] text-stone-400 px-1">
                  {tangoZoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setTangoZoom(Math.min(180, tangoZoom + 15))}
                  className="p-1 text-stone-300 hover:text-white transition cursor-pointer"
                  title="Aumentar"
                >
                  <ZoomIn className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setTangoZoom(100)}
                  className="p-1 text-stone-300 hover:text-white transition cursor-pointer text-[10px] font-mono"
                  title="Resetear al 100%"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= CONTENEDOR PRINCIPAL SCROLLEABLE ================= */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto bg-stone-100/60 p-2 sm:p-6 pb-28 sm:pb-36 relative select-text"
      >
        {/* VISTA A: MODO PARTITURA HISTÓRICA (TODOTANGO) */}
        {isTangoArchive ? (
          <TangoArchiveViewer
            effectiveScore={effectiveScore}
            activePageIndex={activePageIndex}
            setActivePageIndex={setActivePageIndex}
            tangoZoom={tangoZoom}
            setTangoZoom={setTangoZoom}
          />
        ) : (
          /* VISTA B: NOTACIÓN VECTORIAL DIGITAL (ALPHATAB / SONGSTERR / GUITAR PRO) */
          <>
            {/* Indicador de carga de cambio de pista */}
            {isLoadingPart && (
              <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-xs flex items-center justify-center">
                <div className="bg-white px-5 py-3 rounded-2xl shadow-xl border border-stone-200 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-emerald-700 animate-spin" />
                  <span className="text-xs font-semibold text-stone-800 font-sans">
                    Cargando partitura del instrumento...
                  </span>
                </div>
              </div>
            )}

            {/* Contenedor del Score AlphaTab: Hoja de atril editorial estilo Songsterr */}
            <div className="w-full max-w-5xl mx-auto bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] border border-stone-200/90 pt-8 pb-16 px-2 sm:px-6 mb-16 text-stone-950 transition-all print:max-w-none print:w-full print:border-none print:shadow-none print:p-0 print:m-0">
              {/* Cabecera de Canción estilo Songsterr */}
              <div className="text-center pb-5 mb-3 border-b border-stone-100 px-4 print:hidden">
                <h1 className="font-serif text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight">
                  {effectiveScore.title} <span className="font-serif italic text-slate-500 font-normal text-2xl sm:text-3xl ml-1">tab</span>
                </h1>

                <div className="mt-1.5 flex items-center justify-center gap-2">
                  <span className="font-sans font-semibold text-emerald-600 hover:text-emerald-700 text-sm cursor-pointer transition">
                    {effectiveScore.artist}
                  </span>
                </div>

                <div className="flex items-center justify-center flex-wrap gap-2.5 sm:gap-4 text-xs text-stone-500 mt-2.5 font-mono">
                  <span className="text-stone-700 font-semibold">🎸 {tuningLabel}</span>
                  {effectiveScore.capo > 0 && <span>• Capo {effectiveScore.capo}</span>}
                  {effectiveScore.bpm && <span>• ♩ = {Math.round(effectiveScore.bpm)}</span>}
                  {effectiveScore.activePartName && (
                    <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-sans font-medium text-[11px]">
                      {effectiveScore.activePartName}
                    </span>
                  )}
                </div>
              </div>

              {/* Lienzo del Score AlphaTab */}
              <div ref={containerRef} className="w-full" />
            </div>
          </>
        )}

        {/* Panel Desplegable de Letra */}
        {isLyricsOpen && effectiveScore.lyrics && (
          <div className="absolute top-4 right-4 z-40 w-80 max-h-[75%] bg-white border border-stone-300 rounded-2xl shadow-2xl p-4 overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-stone-200 pb-2 mb-3">
                <span className="font-serif font-bold text-stone-900 text-sm flex items-center gap-1.5">
                  <Mic className="w-4 h-4 text-amber-700" />
                  Letra de la Canción
                </span>
                <button
                  type="button"
                  onClick={() => setIsLyricsOpen(false)}
                  className="p-1 rounded-md text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <pre className="font-serif text-xs text-stone-800 whitespace-pre-wrap leading-relaxed">
                {effectiveScore.lyrics}
              </pre>
            </div>
          </div>
        )}

        {/* Reproductor Flotante de Video YouTube Sincronizado */}
        {effectiveScore.youtubeId && (
          <div
            className={`fixed sm:absolute z-40 w-[90vw] sm:w-96 bg-stone-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-700/80 p-2.5 flex flex-col transition-all duration-200 ${
              isVideoOpen
                ? 'bottom-4 right-4 opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-95 pointer-events-none -bottom-[9999px] right-4'
            }`}
          >
            {/* Header del Reproductor */}
            <div className="flex items-center justify-between text-stone-300 text-xs px-1 pb-2 border-b border-stone-800/80 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <Video className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                <span className="font-bold text-stone-200 truncate max-w-[130px] sm:max-w-[160px]">
                  {effectiveScore.title || 'Video Oficial'}
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Sync
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleToggleYtMute}
                  className={`p-1 rounded-md text-xs transition cursor-pointer ${
                    isYtMuted
                      ? 'bg-red-950/80 text-red-400 border border-red-800/50'
                      : 'bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700'
                  }`}
                  title={isYtMuted ? 'Activar audio del video' : 'Silenciar audio del video'}
                >
                  {isYtMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>

                {!isTangoArchive && (
                  <button
                    type="button"
                    onClick={handleToggleSynthMute}
                    className={`p-1 rounded-md text-xs transition cursor-pointer ${
                      isSynthMuted
                        ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                        : 'bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700'
                    }`}
                    title={isSynthMuted ? 'Activar sonido sintetizador' : 'Silenciar sintetizador'}
                  >
                    <Music className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsVideoOpen(false)}
                  className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
                  title="Ocultar video flotante"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-inner">
              <div id="score_yt_player_div" className="w-full h-full" />
            </div>

            <div className="mt-2 px-1 flex items-center justify-between text-[10px] text-stone-400 font-sans">
              <span className="truncate">
                {isTangoArchive ? 'Video Histórico de Tango' : (isSynthMuted ? 'Tab silenciada' : 'Tab con sonido')}
              </span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1 flex-shrink-0">
                ⚡ Sincronizado
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ================= ESTUDIO DE DIGITALIZACIÓN OMR SPLIT-VIEW (Oculto temporalmente) ================= */}
      {/* isDigitizerOpen && (
        <ScoreDigitizerStudio
          initialImage={digitizerTarget?.pageUrl || effectiveScore?.pages?.[activePageIndex] || null}
          initialScore={digitizerTarget?.score || effectiveScore}
          onClose={() => {
            setIsDigitizerOpen(false);
            setDigitizerTarget(null);
          }}
          onSaveToLibrary={onSaveToLibrary}
          onLoadIntoStand={(digitizedScore) => {
            setLocalScore(digitizedScore);
            setIsDigitizerOpen(false);
            setDigitizerTarget(null);
          }}
        />
      ) */}
    </div>
  );
}
