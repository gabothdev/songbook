import React, { useState } from 'react';
import { X, Users, Disc, RefreshCw, Save, Sparkles, Camera } from 'lucide-react';
import ArtistAutocompleteInput from '../components/ArtistAutocompleteInput';
import MemorabiliaImageModal from '../../song/MemorabiliaImageModal';
import { parseImageFraming } from '../../../services/artworkService';

export default function DevItemEditModal({
  editingItem,
  setEditingItem,
  activeTab,
  isCreating,
  savingItem,
  onSave,
  newArtistTag,
  setNewArtistTag,
  onAddArtistTag,
  showToast,
}) {
  if (!editingItem) return null;

  const [isArtworkModalOpen, setIsArtworkModalOpen] = useState(false);
  const [artworkModalType, setArtworkModalType] = useState('disc');

  const parsedSongCoverUrl = parseImageFraming(editingItem?.albumCover)?.url;
  const parsedAlbumCoverUrl = parseImageFraming(editingItem?.cover)?.url;
  const parsedArtistImageUrl = parseImageFraming(editingItem?.image)?.url;

  const handleSaveArtwork = (result) => {
    if (!result) {
      if (artworkModalType === 'artist') {
        setEditingItem((prev) => ({ ...prev, image: '' }));
      } else if (activeTab === 'albums') {
        setEditingItem((prev) => ({ ...prev, cover: '' }));
      } else {
        setEditingItem((prev) => ({ ...prev, albumCover: '' }));
      }
      return;
    }

    if (artworkModalType === 'artist') {
      const imgVal = typeof result === 'string' ? result : (result.framedString || result.url || '');
      setEditingItem((prev) => ({ ...prev, image: imgVal }));
      if (showToast) showToast('Foto de artista seleccionada con éxito');
      return;
    }

    // Disc / Album Cover:
    const coverVal = typeof result === 'string' ? result : (result.framedString || result.url || '');
    if (activeTab === 'albums') {
      setEditingItem((prev) => ({
        ...prev,
        cover: coverVal,
        title: result.album !== undefined && result.album !== null ? result.album : prev.title,
        releaseYear: result.releaseYear !== undefined && result.releaseYear !== null ? result.releaseYear : prev.releaseYear,
        versionType: result.versionType || prev.versionType || 'studio',
        versionDetails: result.versionDetails !== undefined && result.versionDetails !== null ? result.versionDetails : prev.versionDetails,
      }));
      if (showToast) showToast('Carátula y metadatos del álbum actualizados');
    } else {
      setEditingItem((prev) => ({
        ...prev,
        albumCover: coverVal,
        album: result.album !== undefined && result.album !== null ? result.album : prev.album,
        releaseYear: result.releaseYear !== undefined && result.releaseYear !== null ? result.releaseYear : prev.releaseYear,
        versionType: result.versionType || prev.versionType || 'studio',
        versionDetails: result.versionDetails !== undefined && result.versionDetails !== null ? result.versionDetails : prev.versionDetails,
      }));
      if (showToast) showToast('Carátula y metadatos de la canción actualizados');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-stone-950 border border-stone-800 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div>
            <h2 className="text-base font-bold text-white">
              {isCreating ? `Crear Registro en ${activeTab}` : `Editar Registro #${editingItem.id || 'N/A'}`}
            </h2>
            <p className="text-xs text-stone-400">Modifica los campos del modelo en la base de datos</p>
          </div>
          <button
            onClick={() => setEditingItem(null)}
            className="p-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          {activeTab === 'songs' ? (
            /* Song Form */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Título de la canción</label>
                <input
                  type="text"
                  required
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Texto principal de Artistas (Resumen)</label>
                <input
                  type="text"
                  required
                  value={typeof editingItem.artist === 'object' ? (editingItem.artist?.name || '') : (editingItem.artist || '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    const splitNames = val.split(',').map((s) => s.trim()).filter(Boolean);
                    setEditingItem({ ...editingItem, artist: val, artistNames: splitNames });
                  }}
                  placeholder="ej: Soda Stereo o Roberto Goyeneche, Aníbal Troilo"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Multi-Artist Tag Chips Editor */}
              <div className="space-y-1.5 md:col-span-2 bg-stone-900/60 p-3.5 rounded-2xl border border-stone-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-teal-400" />
                    <span>Artistas Asignados a la Canción (Múltiples)</span>
                  </label>
                  <span className="text-[10px] text-stone-500 font-mono">
                    {editingItem.artistNames?.length || 0} artista(s)
                  </span>
                </div>

                {/* Tags list */}
                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-stone-950 rounded-xl border border-stone-800 items-center">
                  {editingItem.artistNames && editingItem.artistNames.length > 0 ? (
                    editingItem.artistNames.map((artName, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-950/80 border border-teal-700/60 text-teal-200 shadow-xs"
                      >
                        <span>{artName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = editingItem.artistNames.filter((_, i) => i !== idx);
                            setEditingItem({
                              ...editingItem,
                              artistNames: updated,
                              artist: updated.join(', '),
                            });
                          }}
                          className="hover:text-rose-400 transition cursor-pointer"
                          title="Quitar artista"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-stone-500 text-xs italic">Sin artistas asignados</span>
                  )}
                </div>

                {/* Add new artist input with dynamic autocomplete */}
                <div className="pt-1">
                  <ArtistAutocompleteInput
                    value={newArtistTag}
                    onChange={setNewArtistTag}
                    onSelectArtist={(artistName) => {
                      onAddArtistTag(artistName);
                    }}
                    onAddCustom={(customName) => {
                      onAddArtistTag(customName);
                    }}
                    existingNames={editingItem.artistNames || []}
                    placeholder="Escribe el nombre de un artista (ej: Soda Stereo, Bruno Mars, Cerati)..."
                    buttonLabel="Añadir"
                  />
                </div>
              </div>

              {/* Album & Edition Metadata */}
              <div className="space-y-3 md:col-span-2 bg-stone-900/50 p-4 rounded-2xl border border-stone-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-stone-200">
                    <Disc className="w-4 h-4 text-rose-400" />
                    <span>Metadatos del Álbum y Edición Canónica</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setArtworkModalType('disc');
                      setIsArtworkModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                    title="Buscar carátulas en Deezer, Apple Music, Cover Art Archive, Wikipedia o subir archivo"
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
                      value={editingItem.album || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, album: e.target.value })}
                      placeholder="ej: Bicicleta, Canción Animal"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-400">Año de Lanzamiento</label>
                    <input
                      type="number"
                      value={editingItem.releaseYear ?? ''}
                      onChange={(e) => setEditingItem({ ...editingItem, releaseYear: e.target.value })}
                      placeholder="ej: 1980"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-400">Tipo de Versión</label>
                    <select
                      value={editingItem.versionType || 'studio'}
                      onChange={(e) => setEditingItem({ ...editingItem, versionType: e.target.value })}
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
                        onClick={() => {
                          setArtworkModalType('disc');
                          setIsArtworkModalOpen(true);
                        }}
                        className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Abrir buscador y encuadrador</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setArtworkModalType('disc');
                          setIsArtworkModalOpen(true);
                        }}
                        className="relative w-10 h-10 rounded-xl overflow-hidden bg-stone-950 border border-stone-800 flex-shrink-0 flex items-center justify-center cursor-pointer hover:border-amber-500/60 transition group shadow-inner"
                        title="Haz clic para abrir el selector visual de carátulas"
                      >
                        {parsedSongCoverUrl ? (
                          <>
                            <img
                              src={parsedSongCoverUrl}
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
                        value={editingItem.albumCover || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, albumCover: e.target.value })}
                        placeholder="https://... o selecciona con el botón"
                        className="flex-1 min-w-0 bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-stone-400">Detalles de Versión</label>
                    <input
                      type="text"
                      value={editingItem.versionDetails || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, versionDetails: e.target.value })}
                      placeholder="ej: Remaster 2021"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">YouTube Video ID</label>
                <input
                  type="text"
                  value={editingItem.youtubeId || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, youtubeId: e.target.value })}
                  placeholder="ej: 1zzzby2tAQM"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Género Musical (Genre)</label>
                <input
                  type="text"
                  value={editingItem.genre || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, genre: e.target.value })}
                  placeholder="ej: Rock Nacional, Tango, Punk, Pop"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Tono Transposición (-6 a +6)</label>
                <input
                  type="number"
                  value={editingItem.transpose ?? 0}
                  onChange={(e) => setEditingItem({ ...editingItem, transpose: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Content (Lyrics + Chords) */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-400">Letra y Acordes (Formato SongBook)</label>
                  <span className="text-[10px] text-stone-500 font-mono">Usa [Acorde] y [Sección @ timestamp]</span>
                </div>
                <textarea
                  rows={12}
                  value={editingItem.content || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 font-mono text-xs text-amber-200 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              {/* SyncData (JSON) */}
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-400">BeatGrid SyncData (JSON)</label>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(editingItem.syncData || '[]');
                        setEditingItem({ ...editingItem, syncData: JSON.stringify(parsed, null, 2) });
                        showToast('JSON formateado correctamente');
                      } catch {
                        showToast('JSON inválido', 'error');
                      }
                    }}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Formatear JSON
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={typeof editingItem.syncData === 'object' ? JSON.stringify(editingItem.syncData, null, 2) : editingItem.syncData || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, syncData: e.target.value })}
                  placeholder="[]"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 font-mono text-xs text-emerald-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ) : activeTab === 'albums' ? (
            /* Album Form */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-stone-400">Título del Álbum</label>
                <input
                  type="text"
                  required
                  value={editingItem.title || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder="ej: Bicicleta"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">ID del Artista Principal</label>
                <input
                  type="text"
                  required
                  value={editingItem.artistId || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, artistId: e.target.value })}
                  placeholder="ID del modelo Artist"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Año de Lanzamiento</label>
                <input
                  type="number"
                  value={editingItem.releaseYear ?? ''}
                  onChange={(e) => setEditingItem({ ...editingItem, releaseYear: e.target.value })}
                  placeholder="ej: 1980"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-400">URL de Carátula Oficial</label>
                  <button
                    type="button"
                    onClick={() => {
                      setArtworkModalType('disc');
                      setIsArtworkModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                    title="Buscar carátulas en Deezer, Apple Music, Cover Art Archive, Wikipedia o subir archivo"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                    <span>Seleccionar Carátula</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setArtworkModalType('disc');
                      setIsArtworkModalOpen(true);
                    }}
                    className="relative w-10 h-10 rounded-xl overflow-hidden bg-stone-900 border border-stone-800 flex-shrink-0 flex items-center justify-center cursor-pointer hover:border-rose-500/60 transition group shadow-inner"
                    title="Haz clic para abrir el selector visual de carátulas"
                  >
                    {parsedAlbumCoverUrl ? (
                      <>
                        <img
                          src={parsedAlbumCoverUrl}
                          alt="Carátula"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-rose-300">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      </>
                    ) : (
                      <Disc className="w-5 h-5 text-stone-600 group-hover:text-rose-400 transition-colors" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={editingItem.cover || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, cover: e.target.value })}
                    placeholder="https://... o selecciona con el botón"
                    className="flex-1 min-w-0 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Tipo de Versión</label>
                <select
                  value={editingItem.versionType || 'studio'}
                  onChange={(e) => setEditingItem({ ...editingItem, versionType: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="studio">Estudio (studio)</option>
                  <option value="live">En Vivo (live)</option>
                  <option value="acoustic">Acústico (acoustic)</option>
                  <option value="soundtrack">Banda Sonora (soundtrack)</option>
                  <option value="session">Sesión (session)</option>
                  <option value="demo">Demo / Inédito (demo)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Detalles de Versión</label>
                <input
                  type="text"
                  value={editingItem.versionDetails || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, versionDetails: e.target.value })}
                  placeholder="ej: Edición original 1980"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          ) : activeTab === 'artists' ? (
            /* Artist Form */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-stone-400">Nombre del Artista</label>
                <input
                  type="text"
                  required
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  placeholder="ej: Charly García, Metallica"
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-stone-400">Foto Oficial del Artista (Polaroid)</label>
                  <button
                    type="button"
                    onClick={() => {
                      setArtworkModalType('artist');
                      setIsArtworkModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-bold transition active:scale-95 cursor-pointer shadow-xs"
                    title="Buscar fotos oficiales en Deezer, Apple Music, Wikipedia o subir archivo"
                  >
                    <Camera className="w-3.5 h-3.5 text-teal-400" />
                    <span>Seleccionar Foto Polaroid</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setArtworkModalType('artist');
                      setIsArtworkModalOpen(true);
                    }}
                    className="relative w-10 h-10 rounded-xl overflow-hidden bg-stone-900 border border-stone-800 flex-shrink-0 flex items-center justify-center cursor-pointer hover:border-teal-500/60 transition group shadow-inner"
                    title="Haz clic para abrir el estudio de fotos de artistas"
                  >
                    {parsedArtistImageUrl ? (
                      <>
                        <img
                          src={parsedArtistImageUrl}
                          alt="Artista"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-teal-300">
                          <Camera className="w-4 h-4" />
                        </div>
                      </>
                    ) : (
                      <Users className="w-5 h-5 text-stone-600 group-hover:text-teal-400 transition-colors" />
                    )}
                  </button>
                  <input
                    type="text"
                    value={editingItem.image || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, image: e.target.value })}
                    placeholder="https://... o selecciona con el botón"
                    className="flex-1 min-w-0 bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-stone-400">Biografía / Notas</label>
                <textarea
                  rows={4}
                  value={editingItem.bio || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, bio: e.target.value })}
                  placeholder="Biografía breve o notas del artista..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 font-mono text-xs text-stone-200 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>
            </div>
          ) : activeTab === 'users' ? (
            /* User Form */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Nombre del Usuario</label>
                <input
                  type="text"
                  required
                  value={editingItem.name || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={editingItem.email || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, email: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Rol del Usuario</label>
                <select
                  value={editingItem.role || 'FREE'}
                  onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="FREE">FREE</option>
                  <option value="PRO">PRO</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">URL del Avatar</label>
                <input
                  type="text"
                  value={editingItem.avatar || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, avatar: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          ) : activeTab === 'userpreferences' ? (
            /* UserSongPreference Form */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">User ID</label>
                <input
                  type="text"
                  required
                  value={editingItem.userId || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, userId: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Song ID</label>
                <input
                  type="text"
                  required
                  value={editingItem.songId || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, songId: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-400">Tono Personal Transposición</label>
                <input
                  type="number"
                  value={editingItem.transpose ?? 0}
                  onChange={(e) => setEditingItem({ ...editingItem, transpose: parseInt(e.target.value, 10) || 0 })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5 flex items-center gap-6 pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                  <input
                    type="checkbox"
                    checked={!!editingItem.isFavorite}
                    onChange={(e) => setEditingItem({ ...editingItem, isFavorite: e.target.checked })}
                    className="rounded bg-stone-900 border-stone-800 text-amber-500 focus:ring-0"
                  />
                  <span>Marcar como Favorito</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                  <input
                    type="checkbox"
                    checked={!!editingItem.isCustom}
                    onChange={(e) => setEditingItem({ ...editingItem, isCustom: e.target.checked })}
                    className="rounded bg-stone-900 border-stone-800 text-sky-500 focus:ring-0"
                  />
                  <span>Versión Personalizada</span>
                </label>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-stone-400">Variantes de Acordes JSON (ej: {"{\"C\": 1}"})</label>
                <input
                  type="text"
                  value={editingItem.chordVariants || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, chordVariants: e.target.value })}
                  placeholder='{"C": 1, "G": 0}'
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-stone-400">Arreglo o Letra Personalizada (Opcional)</label>
                <textarea
                  rows={6}
                  value={editingItem.customContent || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, customContent: e.target.value })}
                  className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 font-mono text-xs text-stone-200 focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>
            </div>
          ) : (
            /* Dynamic form for other models */
            <div className="space-y-3">
              {Object.keys(editingItem).map((key) => {
                if (['id', 'createdAt', 'updatedAt', 'artists', 'songs'].includes(key)) return null;
                const val = editingItem[key];
                const isLongText = typeof val === 'string' && (val.length > 80 || val.includes('\n') || key.toLowerCase().includes('data'));

                return (
                  <div key={key} className="space-y-1">
                    <label className="text-xs font-semibold text-stone-400 capitalize">{key}</label>
                    {isLongText ? (
                      <textarea
                        rows={6}
                        value={typeof val === 'object' ? JSON.stringify(val, null, 2) : val ?? ''}
                        onChange={(e) => setEditingItem({ ...editingItem, [key]: e.target.value })}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 font-mono text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={val ?? ''}
                        onChange={(e) => setEditingItem({ ...editingItem, [key]: e.target.value })}
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3 sticky bottom-0 bg-stone-950 py-2">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingItem}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition cursor-pointer active:scale-95 shadow-lg shadow-amber-500/20"
            >
              {savingItem ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isCreating ? 'Crear Registro' : 'Guardar Cambios'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Studio Modal for Selecting Album Artwork / Artist Photo */}
    {isArtworkModalOpen && (
      <MemorabiliaImageModal
        isOpen={isArtworkModalOpen}
        type={artworkModalType}
        currentImage={
          artworkModalType === 'artist'
            ? editingItem.image
            : activeTab === 'albums'
            ? editingItem.cover
            : editingItem.albumCover
        }
        artistName={
          artworkModalType === 'artist'
            ? (editingItem.name || '')
            : (editingItem.artist || (editingItem.artistNames && editingItem.artistNames.join(', ')) || (editingItem.artistRel?.name || editingItem.artist?.name) || '')
        }
        songTitle={activeTab === 'songs' ? (editingItem.title || '') : ''}
        albumName={activeTab === 'albums' ? (editingItem.title || '') : (editingItem.album || '')}
        releaseYear={editingItem.releaseYear ? parseInt(editingItem.releaseYear, 10) : null}
        versionType={editingItem.versionType || 'studio'}
        versionDetails={editingItem.versionDetails || ''}
        onClose={() => setIsArtworkModalOpen(false)}
        onSave={handleSaveArtwork}
      />
    )}
  </>
  );
}
