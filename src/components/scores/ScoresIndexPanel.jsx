import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Music, 
  Bookmark, 
  Sparkles, 
  Trash2, 
  Layers, 
  Loader2, 
  Play, 
  Upload, 
  FileMusic, 
  FileText, 
  AlertCircle,
  Radio
} from 'lucide-react';
import { scoresApi } from '../../services/scoresApi';

export default function ScoresIndexPanel({
  onSelectScore,
  currentScoreId,
  savedScores,
  onRefreshSavedScores,
  onDeleteSavedScore,
  onOpenDigitizer
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'saved'
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'songsterr' | 'todotango'
  const [showPdfAlert, setShowPdfAlert] = useState(false);
  const fileInputRef = useRef(null);

  // Búsqueda unificada multicanal con debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);

      try {
        const results = await scoresApi.searchUnified(searchQuery, sourceFilter);
        setSearchResults(results);
      } catch (err) {
        console.error('Error en búsqueda unificada de partituras:', err);
        setSearchError('Error al conectar con los catálogos.');
      } finally {
        setIsSearching(false);
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [searchQuery, sourceFilter]);

  const handleSelectSongsterrResult = (song) => {
    onSelectScore({
      songsterrId: song.songId || song.sourceId,
      title: song.title,
      artist: song.artist,
      defaultTrack: song.popularTrackGuitar ?? song.popularTrack ?? song.defaultTrack ?? 0,
      tracks: song.tracks,
      source: 'Songsterr',
    });
  };

  const handleSelectTangoResult = (tango) => {
    onSelectScore({
      id: tango.id,
      tangoId: tango.tangoId || tango.sourceId,
      title: tango.title,
      artist: tango.artist,
      composer: tango.composer || tango.artist,
      lyricist: tango.lyricist,
      rhythm: tango.rhythm,
      pages: tango.pages,
      recordings: tango.recordings,
      youtubeId: tango.youtubeId,
      source: 'TodoTango',
      type: 'tango_archive',
    });
  };

  const handleSelectUnifiedResult = async (item) => {
    if (item.source === 'songsterr') {
      handleSelectSongsterrResult(item);
      return;
    }
    if (item.source === 'todotango') {
      handleSelectTangoResult(item);
      return;
    }

    // Cargar / importar partitura en el backend privado y enviar a atril sin exponer URLs
    try {
      setIsSearching(true);
      const score = await scoresApi.loadUnifiedScore(item.source, item.sourceId);
      onSelectScore({
        id: score.id,
        title: item.title,
        artist: item.artist,
        source: item.sourceLabel || item.source,
        format: item.format,
        streamUrl: score.streamUrl,
        fileName: score.fileName,
        isPublicDomain: item.isPublicDomain
      });
    } catch (err) {
      console.error('Error cargando partitura:', err);
      setSearchError('Error al importar partitura: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSavedScore = (saved) => {
    onSelectScore({
      id: saved.id,
      songsterrId: saved.songsterrId,
      title: saved.title,
      artist: saved.artist,
      defaultTrack: saved.defaultTrack,
      tracks: saved.tracks,
      songData: saved.songData,
    });
  };

  // Manejo de archivo local (Guitar Pro, MusicXML, MIDI)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
      setShowPdfAlert(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const isBinary = ['gp', 'gp3', 'gp4', 'gp5', 'gpx', 'mid', 'midi'].includes(ext);
    const reader = new FileReader();

    if (isBinary) {
      reader.onload = (ev) => {
        const buffer = ev.target?.result;
        if (buffer) {
          onSelectScore({
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
          onSelectScore({
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
      alert(`Formato .${ext} no compatible. Sube un archivo .gp (3 al 7), .musicxml, o .mid.`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full justify-between select-none">
      {/* ================= ENCABEZADO DE PÁGINA ================= */}
      <div>
        <div className="flex items-center justify-between border-b-2 border-stone-800 pb-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-serif font-black text-xl sm:text-2xl text-stone-900 tracking-tight">
              Partituras & Tabs
            </span>
          </div>

          {/* Toggle Búsqueda vs Guardadas */}
          <div className="flex items-center bg-stone-200/80 p-0.5 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTab('search')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                activeTab === 'search'
                  ? 'bg-stone-900 text-amber-300 shadow-xs'
                  : 'text-stone-700 hover:text-stone-950'
              }`}
            >
              Buscar
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-2.5 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                activeTab === 'saved'
                  ? 'bg-stone-900 text-amber-300 shadow-xs'
                  : 'text-stone-700 hover:text-stone-950'
              }`}
            >
              <span>Guardadas</span>
              {savedScores?.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {savedScores.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Botón de importación de archivo local y Digitalizar OMR */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <p className="text-[11px] text-stone-600 font-serif italic truncate">
            {activeTab === 'search'
              ? 'Catálogo Songsterr, Tango histórico o archivos locales.'
              : 'Partituras guardadas en la memoria de tu cuaderno.'}
          </p>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* onOpenDigitizer && (
              <button
                type="button"
                onClick={onOpenDigitizer}
                className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs"
                title="Abrir Estudio de Digitalización OMR para transcribir partituras desde imágenes, fotos o capturas"
              >
                <Sparkles className="w-3 h-3 text-amber-200" />
                <span>Digitalizar OMR</span>
              </button>
            ) */}

            <label className="flex items-center gap-1 px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-lg text-[10px] font-bold cursor-pointer transition shadow-2xs">
              <Upload className="w-3 h-3 text-stone-500" />
              <span>Abrir .gp / XML</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".gp,.gp3,.gp4,.gp5,.gpx,.xml,.musicxml,.mid,.midi,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        </div>

        {/* ================= BUSCADOR EN VIVO (TAB BUSCAR) ================= */}
        {activeTab === 'search' && (
          <div className="space-y-2 mb-2">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar canción, artista o tango (Piazzolla, Gardel, Hotel California)..."
                className="w-full pl-9 pr-9 py-2 bg-white/90 border border-stone-300 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-600/50 shadow-inner"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-amber-700 animate-spin absolute right-3 top-2.5" />
              )}
            </div>

            {/* Chips de filtro de origen */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
              <span className="text-stone-400 text-[10px] uppercase font-mono mr-1">Fuente:</span>
              <button
                type="button"
                onClick={() => setSourceFilter('all')}
                className={`px-2 py-0.5 rounded-full transition cursor-pointer ${
                  sourceFilter === 'all'
                    ? 'bg-stone-800 text-white font-bold shadow-2xs'
                    : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('songsterr')}
                className={`px-2 py-0.5 rounded-full transition cursor-pointer flex items-center gap-1 ${
                  sourceFilter === 'songsterr'
                    ? 'bg-amber-700 text-white font-bold shadow-2xs'
                    : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
                }`}
              >
                <span>🎸 Songsterr</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('tango')}
                className={`px-2 py-0.5 rounded-full transition cursor-pointer flex items-center gap-1 ${
                  sourceFilter === 'tango'
                    ? 'bg-rose-800 text-white font-bold shadow-2xs'
                    : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
                }`}
              >
                <span>🎻 Tango</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('midi')}
                className={`px-2 py-0.5 rounded-full transition cursor-pointer flex items-center gap-1 ${
                  sourceFilter === 'midi'
                    ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                    : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
                }`}
              >
                <span>🎹 MIDI</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter('classical')}
                className={`px-2 py-0.5 rounded-full transition cursor-pointer flex items-center gap-1 ${
                  sourceFilter === 'classical'
                    ? 'bg-indigo-800 text-white font-bold shadow-2xs'
                    : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
                }`}
              >
                <span>🎼 Clásicos</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= ALERTA DE ARCHIVO PDF (ESTRICTO) ================= */}
      {showPdfAlert && (
        <div className="mb-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h5 className="font-bold">Los archivos PDF son escaneos de imagen estática</h5>
            <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
              Para reproducir sonido interactivo, afinaciones y tablaturas, utiliza partituras en formato estructurado (<strong>.gp</strong> o <strong>.musicxml</strong>).
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setShowPdfAlert(false)}
                className="text-[10px] font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CONTENIDO SCROLLABLE ================= */}
      <div className="flex-1 overflow-y-auto pr-1 my-1 space-y-2 max-h-[410px] xl:max-h-[470px]">
        {/* VISTA 1: RESULTADOS DE BÚSQUEDA */}
        {activeTab === 'search' && (
          <>
            {searchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {searchError}
              </div>
            )}

            {!searchQuery.trim() && searchResults.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center text-center text-stone-400">
                <Music className="w-10 h-10 mb-2 stroke-[1.5] text-stone-300" />
                <span className="text-xs font-serif italic max-w-xs">
                  Escribe una canción o tango para buscar tablaturas interactivas y partituras de época
                </span>
              </div>
            )}

            {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
              <div className="py-8 text-center text-xs text-stone-500 font-serif italic">
                No se encontraron partituras para "{searchQuery}".
              </div>
            )}

            {searchResults.map((item, idx) => {
              // Ítem de TodoTango
              if (item._sourceType === 'todotango' || item.type === 'tango_archive') {
                const isCurrent = currentScoreId === item.id || currentScoreId === item.tangoId;
                return (
                  <div
                    key={`tango_${item.id || idx}`}
                    onClick={() => handleSelectTangoResult(item)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-rose-100/90 border-rose-500 shadow-sm'
                        : 'bg-white/80 hover:bg-white border-stone-200 hover:border-rose-400 shadow-xs'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-rose-100 text-rose-900 font-black border border-rose-200">
                          🎻 Tango Archivo
                        </span>
                        <span className="text-[10px] text-stone-500 font-serif italic">
                          {item.rhythm || 'Tango'} {item.year ? `(${item.year})` : ''}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-stone-900 text-xs sm:text-sm truncate">
                        {item.title}
                      </h4>
                      <p className="font-sans text-[11px] text-stone-600 truncate">
                        {item.artist || item.composer}
                      </p>
                      {item.recordings?.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-rose-700 font-semibold font-sans">
                          <Radio className="w-2.5 h-2.5" />
                          <span>Grabación histórica disponible</span>
                        </div>
                      )}
                    </div>

                    <button
                      className="p-2 rounded-lg bg-rose-800 hover:bg-rose-700 text-white transition shadow-xs flex-shrink-0"
                      title="Abrir Partitura Histórica de Tango"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  </div>
                );
              }

              // Ítem de MIDI Multitrack
              if (item.source === 'midi_archive' || item.format === 'midi') {
                const isCurrent = currentScoreId === item.id;
                return (
                  <div
                    key={`midi_${item.id || idx}`}
                    onClick={() => handleSelectUnifiedResult(item)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-emerald-100/90 border-emerald-500 shadow-sm'
                        : 'bg-white/80 hover:bg-white border-stone-200 hover:border-emerald-400 shadow-xs'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-900 font-black border border-emerald-200">
                          🎹 MIDI Multitrack
                        </span>
                        <span className="text-[10px] text-stone-500 font-serif italic">
                          Sonido real • Todos los instrumentos
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-stone-900 text-xs sm:text-sm truncate">
                        {item.title}
                      </h4>
                      <p className="font-sans text-[11px] text-stone-600 truncate mb-1">
                        {item.artist}
                      </p>
                      {item.plays > 0 && (
                        <span className="text-[10px] text-emerald-700 font-mono">
                          {item.plays.toLocaleString()} reproducciones
                        </span>
                      )}
                    </div>

                    <button
                      className="p-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition shadow-xs flex-shrink-0"
                      title="Cargar MIDI en el Atril"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  </div>
                );
              }

              // Ítem de OpenScore / IMSLP (Dominio Público)
              if (item.source === 'openscore' || item.source === 'imslp') {
                const isCurrent = currentScoreId === item.id;
                return (
                  <div
                    key={`classical_${item.id || idx}`}
                    onClick={() => handleSelectUnifiedResult(item)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-indigo-100/90 border-indigo-500 shadow-sm'
                        : 'bg-white/80 hover:bg-white border-stone-200 hover:border-indigo-400 shadow-xs'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 font-black border border-indigo-200">
                          {item.source === 'imslp' ? '🏛️ IMSLP' : '🎼 OpenScore'}
                        </span>
                        <span className="text-[10px] text-indigo-700 font-serif italic">
                          Dominio Público • Partitura Clásica
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-stone-900 text-xs sm:text-sm truncate">
                        {item.title}
                      </h4>
                      <p className="font-sans text-[11px] text-stone-600 truncate">
                        {item.artist}
                      </p>
                    </div>

                    <button
                      className="p-2 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white transition shadow-xs flex-shrink-0"
                      title="Cargar Partitura en el Atril"
                    >
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  </div>
                );
              }

              // Ítem de Songsterr
              const isCurrent = currentScoreId === item.songId || currentScoreId === item.id || currentScoreId === item.sourceId;
              const guitarTracks = item.tracks?.filter(t => t.name?.toLowerCase().includes('guitar') || t.instrument?.toLowerCase().includes('guitar')) || [];

              return (
                <div
                  key={`songsterr_${item.songId || item.id || idx}`}
                  onClick={() => handleSelectSongsterrResult(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isCurrent
                      ? 'bg-amber-100/90 border-amber-500 shadow-sm'
                      : 'bg-white/80 hover:bg-white border-stone-200 hover:border-amber-400 shadow-xs'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-black border border-amber-200">
                        🎸 Songsterr
                      </span>
                    </div>
                    <h4 className="font-serif font-bold text-stone-900 text-xs sm:text-sm truncate">
                      {item.title}
                    </h4>
                    <p className="font-sans text-[11px] text-stone-600 truncate mb-1">
                      {item.artist}
                    </p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 font-mono flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5 text-stone-400" />
                        {item.tracks?.length || 1} pistas
                      </span>
                      {guitarTracks.length > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-mono">
                          {guitarTracks.length} guitarras
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    className="p-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white transition shadow-xs flex-shrink-0"
                    title="Cargar en el Atril"
                  >
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                </div>
              );
            })}
          </>
        )}

        {/* VISTA 2: PARTITURAS GUARDADAS EN LA BIBLIOTECA */}
        {activeTab === 'saved' && (
          <>
            {savedScores.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-stone-400">
                <Bookmark className="w-10 h-10 mb-2 stroke-[1.5] text-stone-300" />
                <span className="text-xs font-serif italic">
                  Aún no tienes partituras guardadas en este cuaderno.
                </span>
                <span className="text-[11px] text-stone-400 mt-1">
                  Busca una canción y pulsa "Guardar" en el atril.
                </span>
              </div>
            ) : (
              savedScores.map((score) => {
                const isCurrent = currentScoreId === score.songsterrId || currentScoreId === score.id;

                return (
                  <div
                    key={score.id}
                    onClick={() => handleSelectSavedScore(score)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isCurrent
                        ? 'bg-amber-100/90 border-amber-500 shadow-sm'
                        : 'bg-white/80 hover:bg-white border-stone-200 hover:border-amber-400 shadow-xs'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-stone-200 text-stone-800 font-bold">
                          Guardada
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-stone-900 text-xs sm:text-sm truncate">
                        {score.title}
                      </h4>
                      <p className="font-sans text-[11px] text-stone-600 truncate">
                        {score.artist}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDeleteSavedScore) onDeleteSavedScore(score.id);
                        }}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Eliminar de partituras guardadas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        className="p-2 rounded-lg bg-stone-900 hover:bg-amber-700 text-amber-300 hover:text-white transition shadow-xs"
                        title="Abrir en el Atril"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}
