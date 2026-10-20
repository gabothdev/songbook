import React, { useState, useEffect } from 'react';
import { X, Disc, Save, RefreshCw, Sparkles, Youtube, AlignLeft, Music, Check, ArrowLeft } from 'lucide-react';
import ArtistAutocompleteInput from '../dev/components/ArtistAutocompleteInput';
import MemorabiliaImageModal from '../song/MemorabiliaImageModal';
import { parseImageFraming } from '../../services/artworkService';
import { config } from '../../config';

export default function AdminSongImportCurationModal({
  isOpen,
  rawSong,
  onClose,
  onSaveToDatabase,
  onSaveAsDraft,
}) {
  if (!isOpen || !rawSong) return null;

  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    artistNames: [],
    album: '',
    releaseYear: '',
    versionType: 'studio',
    versionDetails: '',
    albumCover: '',
    youtubeId: '',
    genre: '',
    transpose: 0,
    content: '',
    syncData: '[]',
  });

  const [newArtistTag, setNewArtistTag] = useState('');
  const [isArtworkModalOpen, setIsArtworkModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Inicializar y enriquecer metadatos automáticamente en segundo plano
  useEffect(() => {
    if (!rawSong) return;

    const initialArtist = rawSong.artist || 'Artista';
    const initialTitle = rawSong.title || 'Canción';

    // Desglosar nombres de artistas iniciales
    const rawNames = initialArtist.split(',').map((s) => s.trim()).filter(Boolean);
    const artistNames = rawNames.length > 0 ? rawNames : [initialArtist];

    const initialContent = typeof rawSong === 'string' ? rawSong : (rawSong.content || '');
    let initialSync = '[]';
    if (rawSong.compases) {
      try {
        initialSync = JSON.stringify(rawSong.compases, null, 2);
      } catch (e) {}
    } else if (rawSong.syncData) {
      initialSync = typeof rawSong.syncData === 'object' ? JSON.stringify(rawSong.syncData, null, 2) : rawSong.syncData;
    }

    setFormData({
      title: initialTitle,
      artist: initialArtist,
      artistNames,
      album: rawSong.album || '',
      releaseYear: rawSong.releaseYear || '',
      versionType: rawSong.versionType || 'studio',
      versionDetails: rawSong.versionDetails || '',
      albumCover: rawSong.albumCover || '',
      youtubeId: rawSong.youtubeId || '',
      genre: rawSong.genre || '',
      transpose: rawSong.transpose ?? 0,
      content: initialContent,
      syncData: initialSync,
    });
  }, [rawSong]);

  const parsedCoverUrl = parseImageFraming(formData.albumCover)?.url;

  const handleAddArtistTag = (customName = null) => {
    const nameToAdd = typeof customName === 'string' ? customName : newArtistTag;
    const trimmed = nameToAdd.trim();
    if (!trimmed) return;
    if (!formData.artistNames.includes(trimmed)) {
      const updated = [...formData.artistNames, trimmed];
      setFormData((prev) => ({
        ...prev,
        artistNames: updated,
        artist: updated.join(', '),
      }));
    }
    setNewArtistTag('');
  };

  const handleSaveArtwork = (result) => {
    if (!result) {
      setFormData((prev) => ({ ...prev, albumCover: '' }));
      return;
    }
    const coverVal = typeof result === 'string' ? result : (result.framedString || result.url || '');
    setFormData((prev) => ({
      ...prev,
      albumCover: coverVal,
      album: result.album !== undefined && result.album !== null ? result.album : prev.album,
      releaseYear: result.releaseYear !== undefined && result.releaseYear !== null ? result.releaseYear : prev.releaseYear,
      versionType: result.versionType || prev.versionType || 'studio',
      versionDetails: result.versionDetails !== undefined && result.versionDetails !== null ? result.versionDetails : prev.versionDetails,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      await onSaveToDatabase(formData);
    } catch (err) {
      console.error('[CurationModal] Error saving song to database:', err);
      setErrorMessage(err.message || 'Error al guardar la canción');
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md">
        <div className="bg-stone-950 border border-stone-800 rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-7 space-y-5 text-stone-100">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-stone-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Revisar e Importar Canción
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-stone-950">
                    CURACIÓN ADMIN
                  </span>
                </div>
                <p className="text-xs text-stone-400">
                  Verifica y completa los metadatos antes de registrarla en la base de datos oficial
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSaveAsDraft(formData)}
              className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
              title="Guardar como borrador sin curar y abrir"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl text-xs text-rose-300">
              {errorMessage}
            </div>
          )}

          {/* Formulario de Curación */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Título de la canción */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Título de la canción</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Resumen de Artistas */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Texto principal de Artistas (Resumen)</label>
                <input
                  type="text"
                  required
                  value={formData.artist}
                  onChange={(e) => {
                    const val = e.target.value;
                    const splitNames = val.split(',').map((s) => s.trim()).filter(Boolean);
                    setFormData({ ...formData, artist: val, artistNames: splitNames });
                  }}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Artistas asignados (Chips) */}
              <div className="space-y-1.5 md:col-span-2 bg-stone-900/60 p-3.5 rounded-2xl border border-stone-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-teal-400" />
                    <span>Artistas Asignados a la Canción (Múltiples)</span>
                  </label>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {formData.artistNames?.length || 0} artista(s)
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-stone-950 rounded-xl border border-stone-800 items-center">
                  {formData.artistNames && formData.artistNames.length > 0 ? (
                    formData.artistNames.map((artName, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-950/80 border border-teal-700/60 text-teal-200 shadow-xs"
                      >
                        <span>{artName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = formData.artistNames.filter((_, i) => i !== idx);
                            setFormData({
                              ...formData,
                              artistNames: updated,
                              artist: updated.join(', '),
                            });
                          }}
                          className="hover:text-rose-400 transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-stone-500 text-xs italic">Sin artistas asignados</span>
                  )}
                </div>

                <div className="pt-1">
                  <ArtistAutocompleteInput
                    value={newArtistTag}
                    onChange={setNewArtistTag}
                    onSelectArtist={(artistName) => handleAddArtistTag(artistName)}
                    onAddCustom={(customName) => handleAddArtistTag(customName)}
                    existingNames={formData.artistNames || []}
                    placeholder="Escribe o busca un artista para agregar..."
                    buttonLabel="Añadir"
                  />
                </div>
              </div>

              {/* Metadatos del Álbum y Edición Canónica */}
              <div className="space-y-3 md:col-span-2 bg-stone-900/50 p-4 rounded-2xl border border-stone-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-200">
                    <Disc className="w-4 h-4 text-rose-400" />
                    <span>Metadatos del Álbum y Edición Canónica</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsArtworkModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                    title="Buscar carátula oficial en Deezer, Apple Music o subir imagen"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Seleccionar Carátula</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-400">Nombre del Álbum</label>
                    <input
                      type="text"
                      value={formData.album}
                      onChange={(e) => setFormData({ ...formData, album: e.target.value })}
                      placeholder="ej: Bicicleta, Canción Animal"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-400">Año de Lanzamiento</label>
                    <input
                      type="number"
                      value={formData.releaseYear}
                      onChange={(e) => setFormData({ ...formData, releaseYear: e.target.value })}
                      placeholder="ej: 1980"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-400">Tipo de Versión</label>
                    <select
                      value={formData.versionType}
                      onChange={(e) => setFormData({ ...formData, versionType: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="studio">Estudio (Canónica)</option>
                      <option value="live">En Vivo (Live)</option>
                      <option value="acoustic">Acústico</option>
                      <option value="soundtrack">Banda Sonora</option>
                      <option value="session">Sesión</option>
                      <option value="demo">Demo / Inédito</option>
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-stone-400">URL de Carátula del Álbum</label>
                      <button
                        type="button"
                        onClick={() => setIsArtworkModalOpen(true)}
                        className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Abrir buscador y encuadrador</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsArtworkModalOpen(true)}
                        className="relative w-10 h-10 rounded-xl overflow-hidden bg-stone-950 border border-stone-800 flex-shrink-0 flex items-center justify-center cursor-pointer hover:border-amber-500/60 transition group shadow-inner"
                        title="Haz clic para abrir el selector visual de carátulas"
                      >
                        {parsedCoverUrl ? (
                          <>
                            <img
                              src={parsedCoverUrl}
                              alt="Carátula"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-amber-300">
                              <Sparkles className="w-4 h-4" />
                            </div>
                          </>
                        ) : (
                          <Disc className="w-5 h-5 text-stone-600 group-hover:text-amber-400 transition-colors" />
                        )}
                      </button>

                      <input
                        type="text"
                        value={formData.albumCover}
                        onChange={(e) => setFormData({ ...formData, albumCover: e.target.value })}
                        placeholder="https://... o haz clic en Seleccionar Carátula"
                        className="flex-1 min-w-0 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-400">Detalles de Versión</label>
                    <input
                      type="text"
                      value={formData.versionDetails}
                      onChange={(e) => setFormData({ ...formData, versionDetails: e.target.value })}
                      placeholder="ej: Remaster 2021"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* YouTube Video ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400 flex items-center gap-1.5">
                  <Youtube className="w-3.5 h-3.5 text-rose-500" />
                  <span>YouTube Video ID</span>
                </label>
                <input
                  type="text"
                  value={formData.youtubeId}
                  onChange={(e) => setFormData({ ...formData, youtubeId: e.target.value })}
                  placeholder="ej: 1zzzby2tAQM"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Género Musical */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Género Musical (Genre)</label>
                <input
                  type="text"
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="ej: Rock Nacional, Tango, Punk, Pop"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Letra y Acordes */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-400 flex items-center gap-1.5">
                    <AlignLeft className="w-3.5 h-3.5 text-amber-400" />
                    <span>Letra y Acordes Descargados (Formato SongBook)</span>
                  </label>
                  <span className="text-[10px] text-stone-500 font-mono">Usa [Acorde] y [Sección @ timestamp]</span>
                </div>
                <textarea
                  rows={10}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 font-mono text-xs text-amber-200 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              {/* SyncData (JSON) */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-400">BeatGrid SyncData (JSON de Compases)</label>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(formData.syncData || '[]');
                        setFormData({ ...formData, syncData: JSON.stringify(parsed, null, 2) });
                      } catch (e) {}
                    }}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Formatear JSON
                  </button>
                </div>
                <textarea
                  rows={4}
                  value={formData.syncData}
                  onChange={(e) => setFormData({ ...formData, syncData: e.target.value })}
                  placeholder="[]"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Acciones */}
            <div className="pt-4 border-t border-stone-800 flex items-center justify-between gap-3 sticky bottom-0 bg-stone-950 py-2">
              <button
                type="button"
                onClick={() => onSaveAsDraft(formData)}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                title="Abrir como borrador en el cancionero sin registrar en base de datos"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancelar (Abrir como borrador)</span>
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition cursor-pointer active:scale-95 shadow-lg shadow-amber-500/20"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Guardar en Base de Datos</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Selector de Carátula con MemorabiliaImageModal */}
      {isArtworkModalOpen && (
        <MemorabiliaImageModal
          isOpen={isArtworkModalOpen}
          type="disc"
          currentImage={formData.albumCover}
          artistName={formData.artist || (formData.artistNames && formData.artistNames.join(', ')) || ''}
          songTitle={formData.title}
          albumName={formData.album}
          releaseYear={formData.releaseYear ? parseInt(formData.releaseYear, 10) : null}
          versionType={formData.versionType || 'studio'}
          versionDetails={formData.versionDetails}
          onClose={() => setIsArtworkModalOpen(false)}
          onSave={handleSaveArtwork}
        />
      )}
    </>
  );
}
