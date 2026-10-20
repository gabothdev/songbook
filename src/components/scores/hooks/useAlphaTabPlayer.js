// src/components/scores/hooks/useAlphaTabPlayer.js
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AlphaTabApi } from '@coderline/alphatab';
import { sanitizeAlphaTex } from '../../../utils/alphaTexSanitizer';
import { scoresApi } from '../../../services/scoresApi';
import {
  SOUNDFONT_URL,
  detectIdealStaveProfile,
  ytTimeToAlphaTabTick,
  alphaTabBeatToYtTime
} from '../utils/scoreHelpers';

export function useAlphaTabPlayer({
  containerRef,
  scrollContainerRef,
  ytPlayerRef,
  audioHistoricalRef,
  effectiveScore,
  isTangoArchive,
  isAudioHistoricalPlaying,
  setIsAudioHistoricalPlaying,
  setAudioCurrentTime,
  onSwitchPart,
}) {
  const apiRef = useRef(null);
  const isPlayingRef = useRef(false);
  const ytSyncIntervalRef = useRef(null);
  const lastSyncedBarRef = useRef(-1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [isMetronomeActive, setIsMetronomeActive] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [currentBar, setCurrentBar] = useState(1);
  const [layoutMode, setLayoutMode] = useState('page'); // 'page' | 'horizontal'
  const [staveProfile, setStaveProfile] = useState('default'); // 'default' | 'score' | 'tab'
  const [zoomScale, setZoomScale] = useState(1.0);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState(effectiveScore?.activePartId ?? 0);
  const [discoveredTracks, setDiscoveredTracks] = useState([]);
  const [isLoadingPart, setIsLoadingPart] = useState(false);
  const [isMuteLead, setIsMuteLead] = useState(false);
  const [isSynthMuted, setIsSynthMuted] = useState(Boolean(effectiveScore?.youtubeId));

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
  }, [effectiveScore?.videoPoints, scrollContainerRef, ytPlayerRef, stopYtSyncLoop]);

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

      const bounds = at.renderer?.boundsLookup?.findMasterBarByIndex(sec.measureIndex);
      if (bounds && scrollContainerRef.current) {
        const targetY = bounds.realBounds?.y ?? bounds.visualBounds?.y ?? 0;
        scrollContainerRef.current.scrollTo({
          top: Math.max(0, targetY - 24),
          behavior: 'smooth',
        });
      }

      if (ytPlayerRef.current) {
        const targetSec = alphaTabBeatToYtTime(sec.measureIndex, 0, effectiveScore?.videoPoints, at);
        try {
          ytPlayerRef.current.seekTo(targetSec, true);
          setCurrentTimeMs(Math.round(targetSec * 1000));
        } catch (e) {}
      }
    }
  }, [effectiveScore?.videoPoints, scrollContainerRef, ytPlayerRef]);

  // Sincronizar selectedTrackIndex con effectiveScore
  useEffect(() => {
    if (effectiveScore?.activePartId !== undefined) {
      setSelectedTrackIndex(effectiveScore.activePartId);
    }
  }, [effectiveScore?.activePartId]);

  // Inicialización de AlphaTab
  useEffect(() => {
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
          layoutMode: layoutMode === 'page' ? 0 : 1,
          staveProfile: staveProfile === 'tab' ? 3 : (staveProfile === 'score' ? 2 : 0),
          scale: zoomScale,
          padding: [25, 20, 25, 30],
          firstSystemPaddingTop: 10,
          systemPaddingTop: 15,
          systemPaddingBottom: 25,
          lastSystemPaddingBottom: 45,
        },
        notation: {
          rhythmMode: 2,
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

      // Cursor de ensayo estilo Songsterr
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

          const activeTrack = score.tracks[selectedTrackIndex] || score.tracks[0];
          const detected = detectIdealStaveProfile(activeTrack);
          setStaveProfile(detected);
        }
      });

      // CARGA MULTIFORMATO
      if (effectiveScore.scoreBuffer) {
        at.load(effectiveScore.scoreBuffer);
      } else if (effectiveScore.streamUrl) {
        scoresApi.getScoreStreamBytes(effectiveScore.streamUrl)
          .then(bytes => {
            at.load(bytes);
          })
          .catch(err => {
            console.error('Error cargando flujo binario interno de partitura:', err);
          });
      } else if (effectiveScore.musicXml) {
        const xmlBytes = typeof effectiveScore.musicXml === 'string'
          ? new TextEncoder().encode(effectiveScore.musicXml)
          : effectiveScore.musicXml;
        at.load(xmlBytes);
      } else if (effectiveAlphaTex) {
        at.tex(sanitizeAlphaTex(effectiveAlphaTex));
      }

      at.playerReady.on(() => {
        setIsPlayerReady(true);
        if (effectiveScore?.videoPoints?.length > 0) {
          const endSec = effectiveScore.videoPoints[effectiveScore.videoPoints.length - 1];
          setTotalTimeMs(Math.round(endSec * 1000));
        } else {
          setTotalTimeMs(at.endTime || 0);
        }

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
    effectiveScore?.streamUrl,
    effectiveScore?.videoPoints,
    effectiveScore?.youtubeId,
    layoutMode,
    staveProfile,
    zoomScale,
    isSynthMuted,
    stopYtSyncLoop,
    containerRef,
    scrollContainerRef,
    ytPlayerRef,
  ]);

  const handlePlayPause = useCallback(() => {
    if (isTangoArchive) {
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
  }, [isTangoArchive, isPlaying, isAudioHistoricalPlaying, effectiveScore?.youtubeId, startYtSyncLoop, stopYtSyncLoop, audioHistoricalRef, setIsAudioHistoricalPlaying, ytPlayerRef]);

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
  }, [isTangoArchive, effectiveScore?.videoPoints, stopYtSyncLoop, audioHistoricalRef, setIsAudioHistoricalPlaying, setAudioCurrentTime, ytPlayerRef]);

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
    setSelectedTrackIndex(trackIndex);
    setIsMuteLead(false);

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

  return {
    apiRef,
    isPlaying,
    isPlayerReady,
    playbackSpeed,
    isLooping,
    isMetronomeActive,
    currentTimeMs,
    totalTimeMs,
    currentBar,
    layoutMode,
    setLayoutMode,
    staveProfile,
    setStaveProfile,
    zoomScale,
    setZoomScale,
    selectedTrackIndex,
    discoveredTracks,
    isLoadingPart,
    isMuteLead,
    isSynthMuted,
    sections,
    handlePlayPause,
    handleStop,
    handleSpeedChange,
    handleToggleLoop,
    handleToggleMetronome,
    handleToggleMuteLead,
    handleToggleSynthMute,
    handleSelectTrack,
    handlePrint,
    handleJumpToSection,
    startYtSyncLoop,
    stopYtSyncLoop,
    setIsPlaying,
    isPlayingRef,
  };
}
