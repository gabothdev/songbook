import React from 'react';
import {
  Search,
  Plus,
  Filter,
  RefreshCw,
  Database,
  Music,
  Disc,
  Users,
  Copy,
  Check,
  ExternalLink,
  Clock,
  ShieldCheck,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

function defaultGetSyncMeasureCount(syncData) {
  if (!syncData) return null;
  try {
    const parsed = typeof syncData === 'string' ? JSON.parse(syncData) : syncData;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.length;
    }
  } catch {}
  return null;
}

export default function DevDatabaseTable({
  activeTab,
  items,
  totalItems,
  totalPages,
  page,
  setPage,
  limit,
  setLimit,
  searchTerm,
  setSearchTerm,
  handleSearchSubmit,
  songFilter,
  handleFilterChange,
  customChordFilter,
  setCustomChordFilter,
  loadingTable,
  fetchTableData,
  handleNewRecord,
  handleCopyId,
  copiedId,
  openEditModal,
  handleDeleteItem,
  handlePromoteCustomChord,
  handleToggleVerifyCustomChord,
  getSyncMeasureCount = defaultGetSyncMeasureCount,
}) {
  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto w-full">
      {/* Controls bar: Search, Quick Filters, Pagination, New Record */}
      <div className="space-y-3 bg-stone-950 p-4 rounded-2xl border border-stone-800 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[260px] max-w-md relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Buscar en ${activeTab}...`}
              className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </form>

          <div className="flex items-center gap-3">
            <button
              onClick={handleNewRecord}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition active:scale-95 shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Registro</span>
            </button>

            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="bg-stone-900 border border-stone-800 text-stone-300 text-xs rounded-xl px-2.5 py-2 focus:outline-none cursor-pointer"
            >
              <option value={10}>10 filas</option>
              <option value={20}>20 filas</option>
              <option value={50}>50 filas</option>
              <option value={100}>100 filas</option>
            </select>
          </div>
        </div>

        {activeTab === 'songs' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-900">
            <span className="text-[10px] font-mono uppercase text-stone-500 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-stone-400" />
              <span>Filtrar:</span>
            </span>
            {[
              { id: 'all', label: 'Todas' },
              { id: 'sync', label: 'BeatGrid OK (Sincronizadas)', dotColor: 'bg-emerald-400' },
              { id: 'lyrics', label: 'Solo Letra' },
              { id: 'youtube', label: 'Con YouTube', dotColor: 'bg-red-400' },
              { id: 'score', label: 'Con Partitura', dotColor: 'bg-cyan-400' },
            ].map((f) => {
              const isSelected = songFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleFilterChange(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
                  }`}
                >
                  {f.dotColor && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-stone-950' : f.dotColor}`} />
                  )}
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'customchords' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-900">
            <span className="text-[10px] font-mono uppercase text-stone-500 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-stone-400" />
              <span>Filtrar:</span>
            </span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending', label: 'Pendientes de Revisión', dotColor: 'bg-amber-400' },
              { id: 'verified', label: 'Verificados', dotColor: 'bg-emerald-400' },
            ].map((f) => {
              const isSelected = customChordFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    setCustomChordFilter(f.id);
                    setPage(1);
                    fetchTableData('customchords', 1, searchTerm, f.id);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-stone-950 shadow-sm'
                      : 'bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800'
                  }`}
                >
                  {f.dotColor && (
                    <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-stone-950' : f.dotColor}`} />
                  )}
                  <span>{f.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Records Table */}
      <div className="bg-stone-950 border border-stone-800 rounded-2xl shadow-xl overflow-hidden">
        {loadingTable ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-400">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <span className="text-xs font-mono">Cargando registros...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Database className="w-10 h-10 text-stone-700 mx-auto" />
            <p className="text-sm font-semibold text-stone-300">No se encontraron registros</p>
            <p className="text-xs text-stone-500">Prueba ajustando el término de búsqueda o crea un nuevo elemento.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-stone-900/80 border-b border-stone-800 text-stone-400 font-semibold uppercase text-[10px] tracking-wider font-mono">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  {activeTab === 'songs' && (
                    <>
                      <th className="px-4 py-3">Título y Edición</th>
                      <th className="px-4 py-3">Artistas</th>
                      <th className="px-4 py-3">YouTube</th>
                      <th className="px-4 py-3">Sincronización</th>
                      <th className="px-4 py-3">Partitura</th>
                      <th className="px-4 py-3">Tono</th>
                    </>
                  )}
                  {activeTab === 'albums' && (
                    <>
                      <th className="px-4 py-3">Carátula y Álbum</th>
                      <th className="px-4 py-3">Artista</th>
                      <th className="px-4 py-3">Año</th>
                      <th className="px-4 py-3">Versión</th>
                      <th className="px-4 py-3">Canciones</th>
                    </>
                  )}
                  {activeTab === 'artists' && (
                    <>
                      <th className="px-4 py-3">Nombre del Artista</th>
                      <th className="px-4 py-3">Canciones Vinculadas</th>
                    </>
                  )}
                  {activeTab === 'setlists' && (
                    <>
                      <th className="px-4 py-3">Nombre</th>
                      <th className="px-4 py-3">Canciones</th>
                    </>
                  )}
                  {activeTab === 'users' && (
                    <>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Actividad</th>
                    </>
                  )}
                  {activeTab === 'userpreferences' && (
                    <>
                      <th className="px-4 py-3">Usuario</th>
                      <th className="px-4 py-3">Canción</th>
                      <th className="px-4 py-3">Tono</th>
                      <th className="px-4 py-3">Variantes Acordes</th>
                      <th className="px-4 py-3">Estado</th>
                    </>
                  )}
                  {activeTab === 'favorites' && (
                    <>
                      <th className="px-4 py-3">Canción ID</th>
                      <th className="px-4 py-3">Detalle Canción</th>
                    </>
                  )}
                  {activeTab === 'scoresheets' && (
                    <>
                      <th className="px-4 py-3">Título</th>
                      <th className="px-4 py-3">Artista</th>
                      <th className="px-4 py-3">Songsterr ID</th>
                    </>
                  )}
                  {activeTab === 'chorddefinitions' && (
                    <>
                      <th className="px-4 py-3">Acorde</th>
                      <th className="px-4 py-3">Tonalidad</th>
                      <th className="px-4 py-3">Sufijo</th>
                      <th className="px-4 py-3">Instrumento</th>
                    </>
                  )}
                  {activeTab === 'customchords' && (
                    <>
                      <th className="px-4 py-3">Acorde</th>
                      <th className="px-4 py-3">Instrumento</th>
                      <th className="px-4 py-3">Estado</th>
                    </>
                  )}
                  <th className="px-4 py-3">Actualizado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-sans">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-900/50 transition">
                    {/* ID badge with copy */}
                    <td className="px-4 py-3 font-mono text-[11px] text-stone-400">
                      <button
                        onClick={() => handleCopyId(item.id)}
                        className="flex items-center gap-1.5 hover:text-amber-400 transition cursor-pointer"
                        title="Copiar ID"
                      >
                        <span>{item.id.slice(0, 8)}...</span>
                        {copiedId === item.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-40 hover:opacity-100" />}
                      </button>
                    </td>

                    {/* Specific Columns */}
                    {activeTab === 'songs' && (
                      <>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex items-center gap-3">
                            {(item.albumRel?.cover || item.albumCover) ? (
                              <img
                                src={item.albumRel?.cover || item.albumCover}
                                alt={typeof item.title === 'string' ? item.title : ''}
                                className="w-9 h-9 rounded-lg object-cover border border-stone-800 shadow-sm flex-shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-600 flex-shrink-0">
                                <Music className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-white truncate text-xs" title={typeof item.title === 'string' ? item.title : ''}>
                                  {typeof item.title === 'string' ? item.title : (item.title?.title || String(item.title || ''))}
                                </span>
                                {item.genre && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-sans font-medium bg-amber-950/80 text-amber-300 border border-amber-800/60">
                                    {typeof item.genre === 'string' ? item.genre : ''}
                                  </span>
                                )}
                              </div>
                              {(item.albumRel?.title || item.album) && (
                                <div className="text-[11px] text-stone-400 truncate flex items-center gap-1.5 mt-0.5">
                                  <Disc className="w-3 h-3 text-stone-500 flex-shrink-0" />
                                  <span className="truncate">
                                    {typeof (item.albumRel?.title || item.album) === 'object'
                                      ? (item.albumRel?.title || item.album)?.title
                                      : String(item.albumRel?.title || item.album)}
                                  </span>
                                  {(item.releaseYear || item.albumRel?.releaseYear) && (
                                    <span className="text-[10px] text-stone-500 font-mono">
                                      ({item.releaseYear || item.albumRel?.releaseYear})
                                    </span>
                                  )}
                                  {(item.versionType || item.albumRel?.versionType) && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] uppercase font-mono font-bold bg-stone-800 text-stone-300 border border-stone-700">
                                      {item.versionType || item.albumRel?.versionType}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.artists && Array.isArray(item.artists) && item.artists.length > 0 ? (
                              item.artists.map((art) => (
                                <span
                                  key={art.id || (typeof art === 'string' ? art : Math.random())}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-teal-950/70 border border-teal-800/70 text-teal-300"
                                >
                                  {typeof art === 'object' ? (art.name || art.title || '') : String(art)}
                                </span>
                              ))
                            ) : (
                              <span className="text-stone-300">
                                {typeof item.artist === 'object' && item.artist !== null
                                  ? (item.artist.name || item.artist.title || '—')
                                  : (item.artist || '—')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          {item.youtubeId ? (
                            <a
                              href={`https://www.youtube.com/watch?v=${item.youtubeId}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 hover:underline"
                            >
                              <span>{item.youtubeId}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-stone-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getSyncMeasureCount(item.syncData) ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>BeatGrid ({getSyncMeasureCount(item.syncData)} C)</span>
                            </span>
                          ) : item.syncData && item.syncData !== '[]' && item.syncData !== '' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              BeatGrid OK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono text-stone-500 bg-stone-900 border border-stone-800">
                              Texto plano
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item._count?.scoreSheets > 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                              Tab ({item._count.scoreSheets})
                            </span>
                          ) : (
                            <span className="text-stone-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-amber-300">
                          {item.transpose !== undefined && item.transpose !== null ? (item.transpose >= 0 ? `+${item.transpose}` : item.transpose) : '0'}
                        </td>
                      </>
                    )}

                    {activeTab === 'albums' && (
                      <>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex items-center gap-3">
                            {item.cover ? (
                              <img
                                src={item.cover}
                                alt={item.title}
                                className="w-10 h-10 rounded-lg object-cover border border-stone-800 shadow-md flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-rose-950/40 border border-rose-800/40 flex items-center justify-center text-rose-400 flex-shrink-0">
                                <Disc className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-white text-xs truncate" title={item.title}>{item.title}</div>
                              {item.versionDetails && (
                                <div className="text-[10px] text-stone-400 italic truncate">{item.versionDetails}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-stone-300">
                          {item.artist?.name ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-teal-950/70 border border-teal-800 text-teal-300">
                              {item.artist.name}
                            </span>
                          ) : (
                            <span className="text-stone-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-amber-300">
                          {item.releaseYear ? (
                            <span className="px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-stone-300 font-bold">
                              {item.releaseYear}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold bg-rose-950/70 text-rose-300 border border-rose-800">
                            {item.versionType || 'studio'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-stone-300">
                          {item._count?.songs ?? item.songs?.length ?? 0} tema(s)
                        </td>
                      </>
                    )}

                    {activeTab === 'artists' && (
                      <>
                        <td className="px-4 py-3 font-bold text-white text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-teal-400" />
                            <span>{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-stone-300 font-mono text-xs">
                          <div className="flex flex-wrap gap-1 max-w-md">
                            {item.songs && item.songs.length > 0 ? (
                              item.songs.map((s) => (
                                <span
                                  key={s.id}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-900 text-stone-300 border border-stone-800"
                                >
                                  {s.title}
                                </span>
                              ))
                            ) : (
                              <span className="text-stone-500">Sin canciones</span>
                            )}
                          </div>
                        </td>
                      </>
                    )}

                    {activeTab === 'setlists' && (
                      <>
                        <td className="px-4 py-3 font-semibold text-white">{item.name}</td>
                        <td className="px-4 py-3 text-stone-400 font-mono text-xs">
                          {item.songs?.length ?? 0} tema(s)
                        </td>
                      </>
                    )}

                    {activeTab === 'users' && (
                      <>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {item.avatar ? (
                              <img src={item.avatar} alt={item.name} className="w-8 h-8 rounded-full object-cover border border-stone-700" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-stone-800 text-sky-400 font-bold flex items-center justify-center text-xs border border-stone-700">
                                {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
                              </div>
                            )}
                            <span className="font-semibold text-white text-xs">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-stone-300">{item.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                              item.role === 'ADMIN'
                                ? 'bg-purple-950 text-purple-300 border-purple-800'
                                : item.role === 'PRO'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-stone-900 text-stone-400 border-stone-800'
                            }`}
                          >
                            {item.role || 'FREE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-stone-400 space-x-2">
                          <span title="Preferencias de canciones">⭐ {item._count?.preferences ?? 0} prefs</span>
                          <span title="Repertorios creados">📁 {item._count?.setlists ?? 0} sets</span>
                          <span title="Favoritos">❤️ {item._count?.favorites ?? 0} favs</span>
                        </td>
                      </>
                    )}

                    {activeTab === 'userpreferences' && (
                      <>
                        <td className="px-4 py-3 text-white font-medium">
                          {item.user ? (
                            <div>
                              <div className="font-semibold text-xs">{item.user.name}</div>
                              <div className="text-[10px] text-stone-500 font-mono">{item.user.email}</div>
                            </div>
                          ) : (
                            <span className="font-mono text-stone-500 text-xs">{item.userId}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-stone-300">
                          {item.song ? (
                            <div>
                              <div className="font-semibold text-xs text-white">{item.song.title}</div>
                              <div className="text-[10px] text-stone-400">{item.song.artist}</div>
                            </div>
                          ) : (
                            <span className="font-mono text-stone-500 text-xs">{item.songId}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-amber-300">
                          {item.transpose !== undefined && item.transpose !== null ? (item.transpose >= 0 ? `+${item.transpose}` : item.transpose) : '0'}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-stone-400 max-w-xs truncate" title={item.chordVariants || ''}>
                          {item.chordVariants ? item.chordVariants : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {item.isFavorite && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-yellow-950/80 text-yellow-300 border border-yellow-800 font-bold">
                                Favorito
                              </span>
                            )}
                            {item.isCustom && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-950/80 text-sky-300 border border-sky-800 font-bold">
                                Arreglo
                              </span>
                            )}
                            {!item.isFavorite && !item.isCustom && <span className="text-stone-600 text-xs">—</span>}
                          </div>
                        </td>
                      </>
                    )}

                    {activeTab === 'favorites' && (
                      <>
                        <td className="px-4 py-3 font-mono text-stone-400">{item.songId}</td>
                        <td className="px-4 py-3 text-stone-300">
                          {item.song ? `${item.song.title} - ${item.song.artist}` : '—'}
                        </td>
                      </>
                    )}

                    {activeTab === 'scoresheets' && (
                      <>
                        <td className="px-4 py-3 font-medium text-white">{item.title}</td>
                        <td className="px-4 py-3 text-stone-300">{item.artist}</td>
                        <td className="px-4 py-3 font-mono text-stone-400">{item.songsterrId || '—'}</td>
                      </>
                    )}

                    {activeTab === 'chorddefinitions' && (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-amber-300 text-sm">{item.chordName}</td>
                        <td className="px-4 py-3 text-stone-300">{item.key}</td>
                        <td className="px-4 py-3 text-stone-400">{item.suffix}</td>
                        <td className="px-4 py-3 font-mono text-stone-400">{item.instrument}</td>
                      </>
                    )}

                    {activeTab === 'customchords' && (
                      <>
                        <td className="px-4 py-3 font-mono font-bold text-rose-300 text-sm">{item.chordName}</td>
                        <td className="px-4 py-3 font-mono text-stone-400">{item.instrument}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleVerifyCustomChord(item)}
                            className="cursor-pointer transition hover:opacity-80"
                            title="Haz clic para alternar verificación"
                          >
                            {item.verified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <Check className="w-2.5 h-2.5" /> Verificado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <Clock className="w-2.5 h-2.5" /> Pendiente
                              </span>
                            )}
                          </button>
                        </td>
                      </>
                    )}

                    {/* Updated At */}
                    <td className="px-4 py-3 font-mono text-[10px] text-stone-500 whitespace-nowrap">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                      {activeTab === 'customchords' && (
                        <button
                          onClick={() => handlePromoteCustomChord(item)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-emerald-950 text-stone-400 hover:text-emerald-400 transition cursor-pointer"
                          title="Promover al catálogo oficial (ChordDefinition)"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 hover:text-amber-300 transition cursor-pointer"
                        title="Editar registro"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-400 transition cursor-pointer"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="bg-stone-900/60 border-t border-stone-800 px-4 py-3 flex items-center justify-between text-xs text-stone-400 font-mono">
          <span>
            Mostrando <strong className="text-stone-200">{items.length}</strong> de <strong className="text-stone-200">{totalItems}</strong> registros
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newPage = Math.max(1, page - 1);
                setPage(newPage);
                fetchTableData(activeTab, newPage, searchTerm);
              }}
              disabled={page <= 1}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => {
                const newPage = Math.min(totalPages, page + 1);
                setPage(newPage);
                fetchTableData(activeTab, newPage, searchTerm);
              }}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 cursor-pointer"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
