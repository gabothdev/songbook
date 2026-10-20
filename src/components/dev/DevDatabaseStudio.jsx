import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Music,
  Users,
  ListMusic,
  Star,
  FileMusic,
  Code,
  Terminal,
  Save,
  RefreshCw,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Sliders,
  Sparkles,
  Disc,
  User,
  UserCheck,
  FlaskConical,
} from 'lucide-react';
import { config } from '../../config';
import ChordifyTestStudio from './ChordifyTestStudio';
import SqlQueryConsoleTab from './tabs/SqlQueryConsoleTab';
import DevDatabaseTable from './components/DevDatabaseTable';
import DevItemEditModal from './modals/DevItemEditModal';

const TABLES = [
  { id: 'chordifytest', label: 'Laboratorio Chordify', model: 'Tester', icon: FlaskConical, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'songs', label: 'Canciones', model: 'Song', icon: Music, color: 'text-amber-600 bg-amber-50' },
  { id: 'albums', label: 'Álbumes', model: 'Album', icon: Disc, color: 'text-rose-600 bg-rose-50' },
  { id: 'artists', label: 'Artistas', model: 'Artist', icon: Users, color: 'text-teal-600 bg-teal-50' },
  { id: 'setlists', label: 'Repertorios', model: 'Setlist', icon: ListMusic, color: 'text-indigo-600 bg-indigo-50' },
  { id: 'users', label: 'Usuarios', model: 'User', icon: User, color: 'text-sky-600 bg-sky-50' },
  { id: 'userpreferences', label: 'Preferencias Usuario', model: 'UserSongPreference', icon: UserCheck, color: 'text-blue-600 bg-blue-50' },
  { id: 'favorites', label: 'Favoritos', model: 'Favorite', icon: Star, color: 'text-yellow-600 bg-yellow-50' },
  { id: 'scoresheets', label: 'Partituras (AlphaTab)', model: 'ScoreSheet', icon: FileMusic, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'chorddefinitions', label: 'Diccionario Acordes', model: 'ChordDefinition', icon: Code, color: 'text-purple-600 bg-purple-50' },
  { id: 'customchords', label: 'Acordes Personalizados', model: 'CustomChord', icon: Sliders, color: 'text-rose-600 bg-rose-50' },
  { id: 'chordifycache', label: 'Caché Chordify', model: 'ChordifyCache', icon: Sparkles, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'query', label: 'Consola SQL', model: 'Console', icon: Terminal, color: 'text-cyan-600 bg-cyan-50' },
];

export default function DevDatabaseStudio({ onNavigateHome, initialTab = 'songs' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [songFilter, setSongFilter] = useState('all');
  const [customChordFilter, setCustomChordFilter] = useState('all');
  const [loadingTable, setLoadingTable] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Edit / Create modal state
  const [editingItem, setEditingItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [newArtistTag, setNewArtistTag] = useState('');

  // Copy helper
  const [copiedId, setCopiedId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Cargar estadísticas generales
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      showToast('No se pudieron obtener las estadísticas de la base de datos', 'error');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // Cargar registros de la tabla seleccionada
  const fetchTableData = useCallback(async (tabId = activeTab, pageNum = page, search = searchTerm, filter = null) => {
    if (tabId === 'query' || tabId === 'chordifytest') return;
    setLoadingTable(true);
    try {
      const activeFilter = filter !== null ? filter : (tabId === 'customchords' ? customChordFilter : songFilter);
      const url = new URL(`${config.API_BASE_URL}/dev/tables/${tabId}`, window.location.origin);
      url.searchParams.set('page', pageNum);
      url.searchParams.set('limit', limit);
      if (search) url.searchParams.set('search', search);
      if (tabId === 'songs' && activeFilter && activeFilter !== 'all') {
        url.searchParams.set('filter', activeFilter);
      } else if (tabId === 'customchords' && activeFilter && activeFilter !== 'all') {
        url.searchParams.set('filter', activeFilter);
      }

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
      setTotalItems(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(`Error fetching ${tabId}:`, err);
      showToast(`Error al cargar datos de ${tabId}: ${err.message}`, 'error');
    } finally {
      setLoadingTable(false);
    }
  }, [activeTab, page, limit, searchTerm, songFilter, customChordFilter]);

  // Promover acorde personalizado al catálogo oficial
  const handlePromoteCustomChord = async (item) => {
    if (!window.confirm(`¿Promover el acorde "${item.chordName}" (${item.instrument}) al catálogo oficial? Sus posiciones se integrarán en ChordDefinition y se eliminará de acordes personalizados.`)) {
      return;
    }
    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/customchords/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Acorde promovido al catálogo oficial con éxito', 'success');
        fetchTableData(activeTab, page, searchTerm, customChordFilter);
        fetchStats();
      } else {
        showToast(data.error || 'Error al promover acorde', 'error');
      }
    } catch (err) {
      showToast('Error de conexión al promover acorde', 'error');
    }
  };

  // Alternar verificación de acorde personalizado
  const handleToggleVerifyCustomChord = async (item) => {
    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/customchords/${item.id}/toggle-verify`, {
        method: 'PATCH',
      });
      if (res.ok) {
        showToast(`Estado de verificación actualizado para ${item.chordName}`, 'success');
        fetchTableData(activeTab, page, searchTerm, customChordFilter);
      } else {
        showToast('Error al actualizar verificación', 'error');
      }
    } catch (err) {
      showToast('Error al actualizar verificación', 'error');
    }
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
    setItems([]);
    if (activeTab !== 'query' && activeTab !== 'chordifytest') {
      fetchTableData(activeTab, 1, searchTerm, songFilter);
    }
  }, [activeTab, fetchTableData]);

  // Manejar cambio de filtro rápido para canciones
  const handleFilterChange = (newFilter) => {
    setSongFilter(newFilter);
    setPage(1);
    fetchTableData(activeTab, 1, searchTerm, newFilter);
  };

  // Manejar búsqueda con Enter o botón
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTableData(activeTab, 1, searchTerm, songFilter);
  };

  // Guardar (crear o editar)
  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    setSavingItem(true);

    try {
      const isNew = isCreating;
      const url = isNew
        ? `${config.API_BASE_URL}/dev/tables/${activeTab}`
        : `${config.API_BASE_URL}/dev/tables/${activeTab}/${editingItem.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const payload = { ...editingItem };
      // Limpiar relaciones complejas para evitar conflictos con Prisma
      delete payload.songs;
      delete payload.favorites;
      delete payload.setlistSongs;
      delete payload.song;
      delete payload.setlist;
      delete payload.albumRel;
      delete payload.scoreSheets;
      delete payload.userPreferences;
      delete payload.preferences;
      delete payload.user;
      delete payload.artist;
      delete payload.albums;
      delete payload._count;
      if (activeTab !== 'songs') {
        delete payload.artistNames;
        delete payload.artists;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      showToast(isNew ? 'Registro creado correctamente' : 'Registro actualizado correctamente', 'success');
      setEditingItem(null);
      setIsCreating(false);
      setNewArtistTag('');
      fetchTableData(activeTab, page, searchTerm);
      fetchStats();
    } catch (err) {
      console.error('Error saving item:', err);
      showToast(`Error al guardar: ${err.message}`, 'error');
    } finally {
      setSavingItem(false);
    }
  };

  // Eliminar registro
  const handleDeleteItem = async (item) => {
    const label = item.title || item.name || item.chordName || item.id;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar este registro (${label})? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/tables/${activeTab}/${item.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      showToast(`Registro eliminado con éxito`, 'success');
      fetchTableData(activeTab, page, searchTerm);
      fetchStats();
    } catch (err) {
      console.error('Error deleting item:', err);
      showToast(`Error al eliminar: ${err.message}`, 'error');
    }
  };

  // Crear copia de respaldo
  const handleCreateBackup = async () => {
    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/backup`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(`Respaldo creado: ${data.backupName}`, 'success');
      fetchStats();
    } catch (err) {
      showToast(`Error al crear respaldo: ${err.message}`, 'error');
    }
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const openEditModal = (item) => {
    setIsCreating(false);
    let rawNames = item.artists && Array.isArray(item.artists)
      ? item.artists.map((a) => a.name)
      : (item.artist ? item.artist.split(',').map((s) => s.trim()).filter(Boolean) : []);

    const artistNames = [];
    for (const name of rawNames) {
      if (name.includes(',')) {
        const parts = name.split(',').map((p) => p.trim());
        const allPartsExist = parts.every((p) =>
          rawNames.some((other) => other !== name && other.toLowerCase() === p.toLowerCase())
        );
        if (allPartsExist) continue;
      }
      if (!artistNames.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
        artistNames.push(name);
      }
    }

    setEditingItem({
      ...item,
      artistNames,
    });
    setNewArtistTag('');
  };

  // Plantilla para nuevo registro según tabla
  const handleNewRecord = () => {
    setIsCreating(true);
    setNewArtistTag('');
    if (activeTab === 'songs') {
      setEditingItem({
        title: '',
        artist: '',
        artistNames: [],
        album: '',
        albumCover: '',
        releaseYear: new Date().getFullYear(),
        versionType: 'studio',
        versionDetails: '',
        genre: '',
        content: '[BPM @ 120]\n[Beats @ 4]\n\n[Intro]\n[C] [G] [Am] [F]\n\n[Estrofa 1]\n[C]Primera [G]línea de la [Am]canción [F]',
        youtubeId: '',
        syncData: '[]',
        transpose: 0,
        isCustom: false,
      });
    } else if (activeTab === 'albums') {
      setEditingItem({
        title: '',
        cover: '',
        releaseYear: new Date().getFullYear(),
        versionType: 'studio',
        versionDetails: '',
        artistId: '',
      });
    } else if (activeTab === 'artists') {
      setEditingItem({ name: '', image: '', bio: '' });
    } else if (activeTab === 'users') {
      setEditingItem({
        name: '',
        email: '',
        role: 'FREE',
        avatar: '',
      });
    } else if (activeTab === 'userpreferences') {
      setEditingItem({
        userId: '',
        songId: '',
        transpose: 0,
        chordVariants: '{}',
        customContent: '',
        isCustom: false,
        isFavorite: false,
      });
    } else if (activeTab === 'setlists') {
      setEditingItem({ name: 'Nuevo Repertorio' });
    } else if (activeTab === 'customchords') {
      setEditingItem({
        instrument: 'guitar',
        chordName: '',
        data: '{"frets":[0,1,0,2,3,-1],"fingers":[0,1,0,2,3,0]}',
      });
    } else {
      setEditingItem({});
    }
  };

  // Agregar tag de artista
  const handleAddArtistTag = (customName = null) => {
    const nameToAdd = typeof customName === 'string' ? customName : newArtistTag;
    const trimmed = nameToAdd.trim();
    if (!trimmed || !editingItem) return;
    const current = editingItem.artistNames || [];
    if (!current.includes(trimmed)) {
      const updated = [...current, trimmed];
      setEditingItem({
        ...editingItem,
        artistNames: updated,
        artist: updated.join(', '),
      });
    }
    setNewArtistTag('');
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border text-sm font-medium transition-all transform animate-bounce ${
            toast.type === 'error'
              ? 'bg-rose-950/95 text-rose-200 border-rose-700/80 shadow-rose-950/50'
              : 'bg-emerald-950/95 text-emerald-200 border-emerald-700/80 shadow-emerald-950/50'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle className="w-5 h-5 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-stone-950 border-b border-stone-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all text-xs font-semibold border border-stone-700 active:scale-95 cursor-pointer"
            title="Volver a la interfaz del cancionero"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a SongBook</span>
          </button>

          <div className="h-6 w-px bg-stone-800" />

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">SongBook Studio</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-stone-950">
                  /DEV DB
                </span>
              </div>
              <p className="text-xs text-stone-400 font-mono">SQLite (server/prisma/dev.db)</p>
            </div>
          </div>
        </div>

        {/* Database Quick Stats & Backup */}
        <div className="flex items-center gap-3">
          {stats && (
            <div className="hidden md:flex items-center gap-4 text-xs font-mono bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-lg text-stone-400">
              <div className="flex items-center gap-1.5" title="Tamaño en disco">
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                <span>{stats.database?.sizeFormatted || '0 MB'}</span>
              </div>
              <div className="w-px h-3 bg-stone-800" />
              <div>
                <span className="text-stone-500">Canciones: </span>
                <span className="text-stone-200 font-bold">{stats.counts?.songs ?? 0}</span>
              </div>
              <div className="w-px h-3 bg-stone-800" />
              <div>
                <span className="text-stone-500">Álbumes: </span>
                <span className="text-rose-300 font-bold">{stats.counts?.albums ?? 0}</span>
              </div>
              <div className="w-px h-3 bg-stone-800" />
              <div>
                <span className="text-stone-500">Artistas: </span>
                <span className="text-teal-300 font-bold">{stats.counts?.artists ?? 0}</span>
              </div>
              <div className="w-px h-3 bg-stone-800" />
              <div>
                <span className="text-stone-500">Repertorios: </span>
                <span className="text-stone-200 font-bold">{stats.counts?.setlists ?? 0}</span>
              </div>
              <div className="w-px h-3 bg-stone-800" />
              <div>
                <span className="text-stone-500">Usuarios: </span>
                <span className="text-sky-300 font-bold">{stats.counts?.users ?? 0}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleCreateBackup}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
            title="Crear una copia de respaldo instantánea de dev.db"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Crear Respaldo</span>
          </button>

          <button
            onClick={() => {
              fetchStats();
              if (activeTab !== 'query') fetchTableData(activeTab, page, searchTerm);
            }}
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-all border border-stone-700 cursor-pointer"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loadingTable || loadingStats ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Navigation Sidebar */}
        <nav className="w-full md:w-64 bg-stone-950/80 border-r border-stone-800 p-3 space-y-1 flex-shrink-0">
          <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500 px-3 py-2 font-bold">
            Tablas del Sistema
          </div>
          {TABLES.map((tab) => {
            const Icon = tab.icon;
            const count = stats?.counts?.[tab.id] ?? null;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/10'
                    : 'text-stone-300 hover:bg-stone-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-stone-950' : 'text-stone-400'}`} />
                  <span>{tab.label}</span>
                </div>
                {count !== null && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-stone-950/20 text-stone-950' : 'bg-stone-900 text-stone-400 border border-stone-800'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Content Body */}
        <main className="flex-1 flex flex-col min-w-0 bg-stone-900 overflow-y-auto">
          {activeTab === 'chordifytest' ? (
            <div className="p-6 max-w-[1600px] mx-auto w-full">
              <ChordifyTestStudio />
            </div>
          ) : activeTab === 'query' ? (
            <SqlQueryConsoleTab onToast={showToast} />
          ) : (
            <DevDatabaseTable
              activeTab={activeTab}
              items={items}
              totalItems={totalItems}
              totalPages={totalPages}
              page={page}
              setPage={setPage}
              limit={limit}
              setLimit={setLimit}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              handleSearchSubmit={handleSearchSubmit}
              songFilter={songFilter}
              handleFilterChange={handleFilterChange}
              customChordFilter={customChordFilter}
              setCustomChordFilter={setCustomChordFilter}
              loadingTable={loadingTable}
              fetchTableData={fetchTableData}
              handleNewRecord={handleNewRecord}
              handleCopyId={handleCopyId}
              copiedId={copiedId}
              openEditModal={openEditModal}
              handleDeleteItem={handleDeleteItem}
              handlePromoteCustomChord={handlePromoteCustomChord}
              handleToggleVerifyCustomChord={handleToggleVerifyCustomChord}
            />
          )}
        </main>
      </div>

      {/* Record Editor Modal */}
      <DevItemEditModal
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        activeTab={activeTab}
        isCreating={isCreating}
        savingItem={savingItem}
        onSave={handleSaveItem}
        newArtistTag={newArtistTag}
        setNewArtistTag={setNewArtistTag}
        onAddArtistTag={handleAddArtistTag}
        showToast={showToast}
      />
    </div>
  );
}
