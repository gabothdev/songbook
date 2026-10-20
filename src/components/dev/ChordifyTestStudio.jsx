import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search,
  Play,
  Pause,
  RefreshCw,
  Save,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Camera,
  SplitSquareVertical,
  Activity,
  Music,
  AlignLeft,
  Database,
  Globe,
  Link2,
  Eye,
  Clock,
  Layers,
  ChevronRight,
  FileCode2,
} from 'lucide-react';
import { config } from '../../config';
import SongLyricsRenderer, { parseSongStructure, parseLineToChordSegments } from '../song/SongLyricsRenderer';
import BeatGrid from '../song/BeatGrid';
import { useSongRhythmGrid } from '../../hooks/useSongRhythmGrid';
import { useYouTubeSync } from '../../hooks/useYouTubeSync';

/**
 * ChordifyTestStudio Component
 * Dedicated laboratory and visual verification tool to audit that everything scraped
 * from Chordify (beats, downbeats, pickup measures, instrumental chordsLine, vocal lyricLine,
 * section timestamps) renders accurately in SongBook's BeatGrid and SongLyricsRenderer.
 */
export default function ChordifyTestStudio() {
  // Input Mode: 'url' | 'catalog' | 'search'
  const [inputMode, setInputMode] = useState('catalog');

  // Mode 1: Direct URL / YouTube ID
  const [urlInput, setUrlInput] = useState('');
  const [captureScreenshots, setCaptureScreenshots] = useState(true);
  const [forceScrape, setForceScrape] = useState(true);

  // Mode 2: Local Catalog (Song & ChordifyCache)
  const [catalogData, setCatalogData] = useState({ songs: [], chordifyCache: [] });
  const [catalogFilter, setCatalogFilter] = useState('');
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);

  // Mode 3: Chordify Online Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Active Test Session State
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [editableContent, setEditableContent] = useState('');
  const [isSavingToCatalog, setIsSavingToCatalog] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);

  // Active Verification View Tab: 'split' | 'screenshots' | 'diagnostics'
  const [activeTab, setActiveTab] = useState('split');
  const [beatGridMode, setBeatGridMode] = useState('grid'); // 'ribbon' | 'grid'
  const [activeScreenshotTab, setActiveScreenshotTab] = useState('chords'); // 'chords' | 'lyrics'

  // Embedded YouTube Player for live sync testing
  const [playerInstance, setPlayerInstance] = useState(null);
  const [externalTime, setExternalTime] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const ytContainerRef = useRef(null);
  const playerRef = useRef(null);
  const lyricsScrollRef = useRef(null);

  // Fetch local catalog on mount
  const fetchCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/chordify-test/catalog`);
      if (res.ok) {
        const data = await res.json();
        setCatalogData({
          songs: data.songs || [],
          chordifyCache: data.chordifyCache || [],
        });
      }
    } catch (err) {
      console.warn('[ChordifyTestStudio] Error cargando catálogo:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Execute live scrape or load test
  const handleRunScrape = async ({
    targetYoutubeId,
    title = null,
    artist = null,
    force = forceScrape,
    screenshots = captureScreenshots,
  }) => {
    const idToUse = targetYoutubeId || urlInput;
    if (!idToUse || !String(idToUse).trim()) return;

    setIsScraping(true);
    setScrapeError(null);
    setSaveFeedback(null);

    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/chordify-test/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeId: idToUse,
          title,
          artist,
          captureScreenshots: screenshots,
          forceScrape: force,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al ejecutar el test de Chordify');
      }

      setTestResult(data);
      setEditableContent(data.contentText || '');
      if (data.screenshots?.chordsView || data.screenshots?.lyricsView) {
        setActiveScreenshotTab(data.screenshots.lyricsView ? 'lyrics' : 'chords');
      }
      fetchCatalog();
    } catch (err) {
      setScrapeError(err.message);
    } finally {
      setIsScraping(false);
    }
  };

  // Load directly from local Song without opening Puppeteer (instant preview)
  const handleSelectCatalogSong = (songItem) => {
    setScrapeError(null);
    setSaveFeedback(null);
    setUrlInput(songItem.youtubeId);

    const syntheticResult = {
      status: 'success',
      fromCache: true,
      youtubeId: songItem.youtubeId,
      chordifyUrl: `https://chordify.net/chords/youtube:${songItem.youtubeId}`,
      title: songItem.title,
      artist: songItem.artist,
      bpm: songItem.bpm || 120,
      barLength: songItem.barLength || 4,
      key: 'C',
      hasLyrics: songItem.hasLyrics,
      contentText: songItem.content || '',
      compases: songItem.compases || [],
      existingSongId: songItem.id,
      screenshots: null,
      rawDiagnostics: null,
    };

    setTestResult(syntheticResult);
    setEditableContent(songItem.content || '');
  };

  // Search songs on Chordify
  const handleSearchChordify = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setScrapeError(null);
    try {
      const res = await fetch(
        `${config.API_BASE_URL}/songs/search/chordify?q=${encodeURIComponent(searchQuery.trim())}`
      );
      if (res.ok) {
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setScrapeError('Error buscando en Chordify: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  // Save verified result into official Song catalog
  const handleSaveToCatalog = async () => {
    if (!testResult) return;
    setIsSavingToCatalog(true);
    setSaveFeedback(null);
    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/chordify-test/save-song`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeId: testResult.youtubeId,
          title: testResult.title,
          artist: testResult.artist,
          contentText: editableContent || testResult.contentText,
          compases: parsedCompases,
          isInstrumental: !testResult.hasLyrics,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');

      setSaveFeedback({ type: 'success', message: data.message });
      setTestResult((prev) => ({ ...prev, existingSongId: data.song?.id }));
      fetchCatalog();
    } catch (err) {
      setSaveFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSavingToCatalog(false);
    }
  };

  // Build synthetic song object for SongBook's native hooks
  const syntheticSong = useMemo(() => {
    if (!testResult) return null;
    return {
      id: testResult.existingSongId || `test_${testResult.youtubeId}`,
      title: testResult.title,
      artist: testResult.artist,
      youtubeId: testResult.youtubeId,
      content: editableContent || testResult.contentText || '',
      compases: testResult.compases || [],
      syncData: JSON.stringify(testResult.compases || []),
    };
  }, [testResult, editableContent]);

  // Rhythm Grid Hook (exact same hook used by SongSheetView)
  const {
    parsedCompases,
    transposedCompases,
    measureBeatOffsets,
    totalBeats,
    currentBpm,
  } = useSongRhythmGrid({
    song: syntheticSong,
    currentContent: editableContent,
    transpose: 0,
  });

  // YouTube Sync Hook (exact same hook used by SongSheetView)
  const {
    currentBeatIndex,
    currentTime,
    jumpToBeat,
    seekToTime,
  } = useYouTubeSync({
    playerInstance,
    totalBeats,
    bpm: currentBpm || testResult?.bpm || 120,
    youtubeId: testResult?.youtubeId || '',
    compases: transposedCompases,
    beatsPerMeasure: testResult?.barLength || 4,
    isPlaying: isPlayingVideo,
    externalTime,
  });

  // Initialize / update YouTube IFrame Player when testResult.youtubeId changes
  useEffect(() => {
    const vid = testResult?.youtubeId;
    if (!vid) return;

    let intervalId = null;

    const initPlayer = () => {
      if (!ytContainerRef.current) return;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(ytContainerRef.current, {
        videoId: vid,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event) => {
            setPlayerInstance(event.target);
            intervalId = setInterval(() => {
              try {
                if (event.target && typeof event.target.getCurrentTime === 'function') {
                  const t = event.target.getCurrentTime();
                  if (typeof t === 'number' && !isNaN(t)) {
                    setExternalTime(t);
                  }
                }
              } catch (e) {}
            }, 60);
          },
          onStateChange: (event) => {
            setIsPlayingVideo(event.data === 1);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
      setPlayerInstance(null);
      setIsPlayingVideo(false);
    };
  }, [testResult?.youtubeId]);

  // Compute automated audit checks comparing Chordify raw vs SongBook parsed
  const auditReport = useMemo(() => {
    if (!testResult) return null;

    const parsedStruct = parseSongStructure(editableContent || testResult.contentText || '', 0);
    const songbookSections = parsedStruct.sections || [];

    // Count vocal and instrumental lines in SongBook
    let sbVocalLines = 0;
    let sbInstrumentalLines = 0;
    let sbTotalChordsInLyrics = 0;

    songbookSections.forEach((sec) => {
      (sec.lines || []).forEach((line) => {
        const trimmed = (line || '').trim();
        if (!trimmed) return;
        const segments = parseLineToChordSegments(trimmed);
        const hasWords = segments.some((s) => (s.text || '').trim().length > 0);
        const chordCount = segments.filter((s) => Boolean(s.chord)).length;
        sbTotalChordsInLyrics += chordCount;
        if (hasWords) sbVocalLines++;
        else if (chordCount > 0) sbInstrumentalLines++;
      });
    });

    // Check monotonic beatTimes across all compases
    let nonMonotonicBeats = 0;
    let prevBeatTime = -1;
    let restMeasuresCount = 0;
    let variableLengthMeasures = 0;

    transposedCompases.forEach((m, mIdx) => {
      const len = m.acordes?.length || 0;
      if (len !== (testResult.barLength || 4)) variableLengthMeasures++;
      if ((m.acordes || []).every((c) => !c || c === '𝄾' || c === '𝄽')) restMeasuresCount++;

      (m.beatTimes || []).forEach((bt) => {
        if (bt < prevBeatTime) {
          nonMonotonicBeats++;
        }
        prevBeatTime = bt;
      });
    });

    // Compare against rawDiagnostics if available
    const rawDiag = testResult.rawDiagnostics;
    let rawVocalLines = 0;
    let rawInstrumentalLines = 0;
    if (rawDiag?.rawSectionsStructured) {
      rawDiag.rawSectionsStructured.forEach((sec) => {
        (sec.lines || []).forEach((l) => {
          if (l.type === 'lyricLine') rawVocalLines++;
          if (l.type === 'chordsLine') rawInstrumentalLines++;
        });
      });
    }

    return {
      songbookSectionsCount: songbookSections.length,
      rawSectionsCount: rawDiag ? rawDiag.leadSectionsCount : null,
      sbVocalLines,
      sbInstrumentalLines,
      rawVocalLines: rawDiag ? rawVocalLines : null,
      rawInstrumentalLines: rawDiag ? rawInstrumentalLines : null,
      sbTotalChordsInLyrics,
      measuresCount: transposedCompases.length,
      totalBeats,
      nonMonotonicBeats,
      restMeasuresCount,
      variableLengthMeasures,
      droppedPreRollCount: rawDiag?.droppedPreRollCount ?? null,
      keptPickupCount: rawDiag?.keptPickupCount ?? null,
      isHealthy:
        nonMonotonicBeats === 0 &&
        transposedCompases.length > 0 &&
        (!rawDiag ||
          (rawVocalLines === sbVocalLines && rawInstrumentalLines === sbInstrumentalLines)),
    };
  }, [testResult, editableContent, transposedCompases, totalBeats]);

  const filteredCatalogSongs = useMemo(() => {
    const q = catalogFilter.toLowerCase().trim();
    if (!q) return catalogData.songs;
    return catalogData.songs.filter(
      (s) =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.artist || '').toLowerCase().includes(q) ||
        (s.youtubeId || '').toLowerCase().includes(q)
    );
  }, [catalogData.songs, catalogFilter]);

  return (
    <div className="space-y-4">
      {/* Top Control & Input Selector Panel */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Laboratorio de Verificación Chordify</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Sandbox / Dry-Run
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Audita que los acordes, compases, anacrusas, secciones instrumentales (chordsLine) y letras sincronizadas de Chordify se vean exactamente como deben verse.
              </p>
            </div>
          </div>

          {/* 3 Input Mode Switchers */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
            <button
              type="button"
              onClick={() => setInputMode('catalog')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                inputMode === 'catalog'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>1. Base de Datos ({catalogData.songs.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                inputMode === 'url'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>2. URL / YouTube ID en Vivo</span>
            </button>
            <button
              type="button"
              onClick={() => setInputMode('search')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                inputMode === 'search'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>3. Buscador Chordify</span>
            </button>
          </div>
        </div>

        {/* Input Mode Content */}
        <div className="pt-3">
          {inputMode === 'url' && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Pega un YouTube ID (ej: NdYWuo9OFAw), URL de YouTube o URL de Chordify..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3.5 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={captureScreenshots}
                  onChange={(e) => setCaptureScreenshots(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Capturar screenshots de Chordify</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  checked={forceScrape}
                  onChange={(e) => setForceScrape(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>Forzar Scrape en vivo</span>
              </label>

              <button
                type="button"
                disabled={isScraping || !urlInput.trim()}
                onClick={() => handleRunScrape({ targetYoutubeId: urlInput })}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
              >
                {isScraping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Scrapeando Chordify...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Testear en Vivo</span>
                  </>
                )}
              </button>
            </div>
          )}

          {inputMode === 'catalog' && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={catalogFilter}
                    onChange={(e) => setCatalogFilter(e.target.value)}
                    placeholder="Filtrar canciones guardadas por título, artista o YouTube ID..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-[11px] text-slate-400">
                  Haz clic en <strong>Inspeccionar</strong> para ver al instante o en <strong>Re-Scrapear</strong> para comparar contra Chordify en vivo.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {isLoadingCatalog ? (
                  <div className="col-span-full py-6 text-center text-xs text-slate-500">
                    Cargando canciones del catálogo...
                  </div>
                ) : filteredCatalogSongs.length === 0 ? (
                  <div className="col-span-full py-6 text-center text-xs text-slate-500">
                    No se encontraron canciones con YouTube ID en la base de datos.
                  </div>
                ) : (
                  filteredCatalogSongs.map((item) => {
                    const isSelected = testResult?.youtubeId === item.youtubeId;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs truncate flex items-center gap-1.5">
                            <span className="truncate">{item.title}</span>
                            {item.hasLyrics && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex-shrink-0">
                                Letra
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {item.artist} • <span className="font-mono text-[10px] text-slate-500">{item.youtubeId}</span> ({item.measuresCount} comp.)
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSelectCatalogSong(item)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition cursor-pointer"
                            title="Inspeccionar datos guardados sin abrir Puppeteer"
                          >
                            Inspeccionar
                          </button>
                          <button
                            type="button"
                            disabled={isScraping}
                            onClick={() =>
                              handleRunScrape({
                                targetYoutubeId: item.youtubeId,
                                title: item.title,
                                artist: item.artist,
                                force: true,
                                screenshots: captureScreenshots,
                              })
                            }
                            className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                            title="Lanzar Puppeteer y comparar con Chordify en vivo"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Live Test</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {inputMode === 'search' && (
            <div className="space-y-3">
              <form onSubmit={handleSearchChordify} className="flex items-center gap-2">
                <div className="relative flex-1 max-w-lg">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar canción o artista para testear en Chordify (ej: Goo Goo Dolls Iris, Soda Stereo)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Buscar Candidatos</span>
                </button>
              </form>

              {searchResults.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {searchResults.map((cand) => (
                    <div
                      key={cand.youtubeId}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-200 truncate flex items-center gap-1.5">
                          <span className="truncate">{cand.title}</span>
                          {cand.hasLyrics && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5 flex-shrink-0">
                              <AlignLeft className="w-2.5 h-2.5" />
                              Incluye letra
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {cand.artist} • <span className="font-mono text-[10px]">{cand.duration || cand.youtubeId}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={isScraping}
                        onClick={() =>
                          handleRunScrape({
                            targetYoutubeId: cand.youtubeId,
                            title: cand.title,
                            artist: cand.artist,
                            force: true,
                            screenshots: captureScreenshots,
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition cursor-pointer flex items-center gap-1 flex-shrink-0"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Scrapear & Verificar</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status / Error Banner */}
        {isScraping && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>
                Ejecutando Puppeteer Stealth en <strong>chordify.net/chords/youtube:{urlInput}</strong>... Extrayendo hidratación, compases, secciones y capturas de referencia.
              </span>
            </div>
          </div>
        )}

        {scrapeError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{scrapeError}</span>
          </div>
        )}
      </div>

      {/* Main Verification Workspace */}
      {testResult && (
        <div className="space-y-4">
          {/* Song Summary & Audit Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{testResult.title}</h3>
                  <span className="text-sm text-slate-400">— {testResult.artist}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    {currentBpm || testResult.bpm} BPM • {testResult.barLength || 4}/4
                  </span>
                  {testResult.key && (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                      Tono: {testResult.key}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                  <span className="font-mono text-[11px]">YouTube ID: {testResult.youtubeId}</span>
                  <span>•</span>
                  <a
                    href={testResult.chordifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Abrir en Chordify.net</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {auditReport && (
                    <>
                      <span>•</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          auditReport.isHealthy
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {auditReport.isHealthy ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span> Paridad Verificada ({auditReport.measuresCount} compases / {auditReport.songbookSectionsCount} secciones)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            <span> Revisar diagnóstico ({auditReport.measuresCount} compases)</span>
                          </>
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons: Re-Scrape with Screenshots & Save to Catalog */}
            <div className="flex flex-wrap items-center gap-2">
              {saveFeedback && (
                <span
                  className={`text-xs px-3 py-1.5 rounded-xl font-semibold ${
                    saveFeedback.type === 'success'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {saveFeedback.message}
                </span>
              )}

              <button
                type="button"
                disabled={isScraping}
                onClick={() =>
                  handleRunScrape({
                    targetYoutubeId: testResult.youtubeId,
                    title: testResult.title,
                    artist: testResult.artist,
                    force: true,
                    screenshots: true,
                  })
                }
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Volver a scrapear en vivo desde Chordify incluyendo capturas de pantalla"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>Re-Scrapear con Capturas</span>
              </button>

              <button
                type="button"
                disabled={isSavingToCatalog}
                onClick={handleSaveToCatalog}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-lg cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>
                  {isSavingToCatalog
                    ? 'Guardando...'
                    : testResult.existingSongId
                    ? 'Actualizar en Catálogo (Song)'
                    : 'Guardar en Catálogo (Song)'}
                </span>
              </button>
            </div>
          </div>

          {/* Synchronized YouTube Mini-Bar + BeatGrid Ribbon Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* YouTube Player Box */}
            <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-amber-400" />
                  <span>Video de Referencia Sincronizado</span>
                </span>
                <span className="font-mono text-xs text-amber-400 font-bold">
                  t = {currentTime.toFixed(2)}s • Pulso #{currentBeatIndex >= 0 ? currentBeatIndex + 1 : '-'}
                </span>
              </div>
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
                <div ref={ytContainerRef} className="w-full h-full" />
              </div>
            </div>

            {/* SongBook BeatGrid Interactive Preview */}
            <div className="lg:col-span-8 bg-[#fcf9f2] text-stone-900 border border-stone-300 rounded-2xl p-4 paper-texture shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2 border-b border-stone-300 pb-2">
                <div>
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                    BeatGrid Renderizado en SongBook ({transposedCompases.length} compases)
                  </span>
                  <p className="text-[11px] text-stone-600">
                    Haz clic en cualquier pulso para saltar en el video de YouTube y verificar la sincronía exacta con el compás.
                  </p>
                </div>
                <div className="flex items-center gap-1 bg-stone-200/80 p-1 rounded-xl border border-stone-300">
                  <button
                    type="button"
                    onClick={() => setBeatGridMode('ribbon')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      beatGridMode === 'ribbon'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    Modo Cinta (Ribbon)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBeatGridMode('grid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      beatGridMode === 'grid'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    Mapa Completo (Grid)
                  </button>
                </div>
              </div>

              <div className="max-h-[230px] overflow-y-auto pr-1">
                <BeatGrid
                  compases={transposedCompases}
                  currentBeatIndex={currentBeatIndex}
                  beatsPerMeasure={testResult.barLength || 4}
                  mode={beatGridMode}
                  transpose={0}
                  isEditMode={false}
                  currentTime={currentTime}
                  onBeatClick={(beatIdx, chord, options) => {
                    jumpToBeat(beatIdx);
                  }}
                />
              </div>
            </div>
          </div>

          {/* 3 Verification View Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('split')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'split'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <SplitSquareVertical className="w-4 h-4" />
                <span>1. Comparativa Lado a Lado (Chordify Crudo vs SongBook)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('screenshots')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'screenshots'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>
                  2. Capturas Reales de Chordify vs SongBook
                  {testResult.screenshots?.chordsView ? ' (Listas)' : ' (Requiere Live Scrape)'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('diagnostics')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                  activeTab === 'diagnostics'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>3. Inspector de Diagnóstico y Auditoría de Compases</span>
              </button>
            </div>
          </div>

          {/* TAB 1: SPLIT VIEW (CHORDIFY RAW HYDRATION STRUCTURE VS SONGBOOK LYRICS RENDERER) */}
          {activeTab === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Left Column: Raw Chordify LeadSheet / Hydration Structure */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[680px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      <FileCode2 className="w-4 h-4" />
                      <span> Datos Crudos Extraídos de Chordify</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Secciones nativas (`lyricLine` vocales + `chordsLine` instrumentales) y texto generado.
                    </p>
                  </div>
                </div>

                {testResult.rawDiagnostics?.rawSectionsStructured?.length > 0 ? (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {testResult.rawDiagnostics.rawSectionsStructured.map((sec, sIdx) => (
                      <div
                        key={sIdx}
                        className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            [{sec.title} @ {sec.startTime.toFixed(1)}s]
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {sec.lines.length} líneas
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {sec.lines.map((line, lIdx) => (
                            <div
                              key={lIdx}
                              onClick={() => {
                                if (line.startTime !== null) seekToTime(line.startTime);
                              }}
                              className={`p-2 rounded-lg border text-xs font-mono cursor-pointer transition ${
                                line.type === 'chordsLine'
                                  ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-200 hover:bg-indigo-950/50'
                                  : 'bg-slate-900/90 border-slate-800 text-slate-200 hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                <span
                                  className={`px-1.5 py-0.2 rounded font-bold uppercase ${
                                    line.type === 'chordsLine'
                                      ? 'bg-indigo-500/20 text-indigo-300'
                                      : 'bg-emerald-500/20 text-emerald-300'
                                  }`}
                                >
                                  {line.type === 'chordsLine' ? 'Instrumental (chordsLine)' : 'Vocal (lyricLine)'}
                                </span>
                                {line.startTime !== null && (
                                  <span>
                                    {line.startTime.toFixed(2)}s → {line.endTime?.toFixed(2) ?? '?'}s
                                  </span>
                                )}
                              </div>
                              <div className="whitespace-pre-wrap break-words text-xs">
                                {line.renderedText}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col space-y-2 overflow-hidden">
                    <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                      Texto `[Sección @ t]` con acordes embebidos (puedes editarlo en vivo para probar cómo renderiza SongBook a la derecha):
                    </div>
                    <textarea
                      value={editableContent}
                      onChange={(e) => setEditableContent(e.target.value)}
                      className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Native SongBook Sheet Render (Paper Texture) */}
              <div className="bg-[#fcf9f2] text-stone-900 border border-stone-300 rounded-2xl p-5 paper-texture shadow-xl flex flex-col h-[680px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-300">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-700" />
                      <span>Renderizado Real en SongBook (SongLyricsRenderer)</span>
                    </h4>
                    <p className="text-[11px] text-stone-600">
                      Exactamente como lo ve el músico en el cuaderno. Haz clic en cualquier acorde o sección para verificar el salto en el BeatGrid y en YouTube.
                    </p>
                  </div>
                </div>

                <div ref={lyricsScrollRef} className="flex-1 overflow-y-auto pr-2">
                  <SongLyricsRenderer
                    song={syntheticSong}
                    compases={transposedCompases}
                    transpose={0}
                    scrollRef={lyricsScrollRef}
                    currentTime={currentTime}
                    currentBeatIndex={currentBeatIndex}
                    isPlaybackActive={isPlayingVideo}
                    onSelectChord={(chordContext) => {
                      const ctx = typeof chordContext === 'object' ? chordContext : null;
                      if (ctx && ctx.beatIdx !== undefined && ctx.beatIdx !== null) {
                        jumpToBeat(ctx.beatIdx);
                      } else if (ctx && ctx.startTime !== undefined && ctx.startTime !== null) {
                        seekToTime(ctx.startTime);
                      }
                    }}
                    onSelectSection={(secIdx, secTitle, secTimestamp) => {
                      const targetIdx = transposedCompases.findIndex(
                        (c) => (c.seccion || '').trim().toLowerCase() === (secTitle || '').trim().toLowerCase()
                      );
                      if (targetIdx !== -1 && measureBeatOffsets[targetIdx] !== undefined) {
                        jumpToBeat(measureBeatOffsets[targetIdx]);
                      } else if (secTimestamp !== null && secTimestamp !== undefined) {
                        seekToTime(secTimestamp);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCREENSHOTS COMPARISON VIEW */}
          {activeTab === 'screenshots' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* Left: Official Chordify Screenshot */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col h-[680px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      <span>Captura Oficial de Chordify.net (Puppeteer)</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Imagen capturada directamente del DOM de Chordify al momento del scrape.
                    </p>
                  </div>

                  {testResult.screenshots && (
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setActiveScreenshotTab('chords')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          activeScreenshotTab === 'chords'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Vista Chords (Grilla)
                      </button>
                      <button
                        type="button"
                        disabled={!testResult.screenshots.lyricsView}
                        onClick={() => setActiveScreenshotTab('lyrics')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer disabled:opacity-40 ${
                          activeScreenshotTab === 'lyrics'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Vista Lyrics (Letra)
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto flex items-center justify-center bg-slate-950 rounded-xl border border-slate-800 p-2">
                  {testResult.screenshots?.chordsView || testResult.screenshots?.lyricsView ? (
                    <img
                      src={
                        activeScreenshotTab === 'lyrics' && testResult.screenshots.lyricsView
                          ? testResult.screenshots.lyricsView
                          : testResult.screenshots.chordsView
                      }
                      alt="Chordify official view"
                      className="max-w-full h-auto rounded-lg shadow-lg border border-slate-800"
                    />
                  ) : (
                    <div className="text-center p-8 space-y-3 max-w-md">
                      <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-xs text-slate-300 font-semibold">
                        Esta canción se cargó desde la base de datos local sin capturas en memoria.
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Presiona el botón <strong>"Re-Scrapear con Capturas"</strong> arriba a la derecha para que Puppeteer abra Chordify y tome las fotos de la grilla de acordes y de la pestaña Lyrics.
                      </p>
                      <button
                        type="button"
                        disabled={isScraping}
                        onClick={() =>
                          handleRunScrape({
                            targetYoutubeId: testResult.youtubeId,
                            title: testResult.title,
                            artist: testResult.artist,
                            force: true,
                            screenshots: true,
                          })
                        }
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Tomar Capturas de Chordify Ahora</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: SongBook Render for Visual Comparison */}
              <div className="bg-[#fcf9f2] text-stone-900 border border-stone-300 rounded-2xl p-5 paper-texture shadow-xl flex flex-col h-[680px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-300">
                  <div>
                    <h4 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-700" />
                      <span>Vista en SongBook para Contraste Visual</span>
                    </h4>
                    <p className="text-[11px] text-stone-600">
                      Compara visualmente la imagen oficial de la izquierda con nuestra hoja interactiva.
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                  <SongLyricsRenderer
                    song={syntheticSong}
                    compases={transposedCompases}
                    transpose={0}
                    currentTime={currentTime}
                    currentBeatIndex={currentBeatIndex}
                    isPlaybackActive={isPlayingVideo}
                    onSelectChord={(chordContext) => {
                      const ctx = typeof chordContext === 'object' ? chordContext : null;
                      if (ctx?.beatIdx !== undefined && ctx?.beatIdx !== null) {
                        jumpToBeat(ctx.beatIdx);
                      } else if (ctx?.startTime !== undefined && ctx?.startTime !== null) {
                        seekToTime(ctx.startTime);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DIAGNOSTICS & MEASURE-BY-MEASURE AUDITOR */}
          {activeTab === 'diagnostics' && auditReport && (
            <div className="space-y-4">
              {/* Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Compases Totales</div>
                  <div className="text-xl font-bold text-white font-mono mt-0.5">
                    {auditReport.measuresCount}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {auditReport.totalBeats} pulsos totales
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Secciones</div>
                  <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">
                    {auditReport.songbookSectionsCount}
                    {auditReport.rawSectionsCount !== null && ` / ${auditReport.rawSectionsCount}`}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    SongBook vs Chordify
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Líneas Vocales (lyricLine)</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">
                    {auditReport.sbVocalLines}
                    {auditReport.rawVocalLines !== null && ` / ${auditReport.rawVocalLines}`}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Renglones con letra y acordes
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Líneas Instrum. (chordsLine)</div>
                  <div className="text-xl font-bold text-indigo-400 font-mono mt-0.5">
                    {auditReport.sbInstrumentalLines}
                    {auditReport.rawInstrumentalLines !== null && ` / ${auditReport.rawInstrumentalLines}`}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Intro / Solo / Interludios
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Pre-Roll / Anacrusa</div>
                  <div className="text-xl font-bold text-sky-400 font-mono mt-0.5">
                    {auditReport.droppedPreRollCount !== null ? `-${auditReport.droppedPreRollCount}T` : 'N/A'} /{' '}
                    {auditReport.keptPickupCount !== null ? `+${auditReport.keptPickupCount}T` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Silencios descartados / Anacrusa
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Monotonicidad Temporal</div>
                  <div
                    className={`text-xl font-bold font-mono mt-0.5 ${
                      auditReport.nonMonotonicBeats === 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {auditReport.nonMonotonicBeats === 0 ? '100% OK' : `${auditReport.nonMonotonicBeats} err`}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Timestamps crecientes
                  </div>
                </div>
              </div>

              {/* Detailed Measure Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Tabla de Auditoría Compás por Compás ({transposedCompases.length} compases)</span>
                </h4>
                <div className="max-h-[420px] overflow-y-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 border-b border-slate-800">Compás</th>
                        <th className="py-2.5 px-3 border-b border-slate-800">Sección Asignada</th>
                        <th className="py-2.5 px-3 border-b border-slate-800">Marca Sección (secTime)</th>
                        <th className="py-2.5 px-3 border-b border-slate-800">Métrica</th>
                        <th className="py-2.5 px-3 border-b border-slate-800">Acordes por Pulso</th>
                        <th className="py-2.5 px-3 border-b border-slate-800">Timestamps de Pulso (beatTimes)</th>
                        <th className="py-2.5 px-3 border-b border-slate-800">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono">
                      {transposedCompases.map((compas, idx) => {
                        const startBeat = measureBeatOffsets[idx] || 0;
                        const isCurrentMeasure =
                          currentBeatIndex >= startBeat &&
                          currentBeatIndex < startBeat + (compas.acordes?.length || 4);
                        return (
                          <tr
                            key={idx}
                            className={`transition ${
                              isCurrentMeasure
                                ? 'bg-amber-500/15 text-amber-200'
                                : 'hover:bg-slate-800/50 text-slate-300'
                            }`}
                          >
                            <td className="py-2 px-3 font-bold text-white">#{idx + 1}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[11px]">
                                {compas.seccion || '-'}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {compas.secTime !== undefined && compas.secTime !== null ? (
                                <span className="text-emerald-400 font-bold">
                                  {Number(compas.secTime).toFixed(2)}s
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {(compas.acordes || []).length}/4
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {(compas.acordes || []).map((ch, bIdx) => (
                                  <span
                                    key={bIdx}
                                    className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                      ch === '𝄾' || ch === '𝄽'
                                        ? 'bg-slate-800 text-slate-500'
                                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    }`}
                                  >
                                    {ch || '𝄾'}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-400">
                              {(compas.beatTimes || []).map((t) => Number(t).toFixed(2) + 's').join(' | ')}
                            </td>
                            <td className="py-2 px-3">
                              <button
                                type="button"
                                onClick={() => jumpToBeat(startBeat)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-[11px] font-sans font-bold transition cursor-pointer"
                              >
                                Saltar aquí
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
