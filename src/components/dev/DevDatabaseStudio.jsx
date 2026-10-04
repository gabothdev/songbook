import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Database,
  Music,
  Users,
  ListMusic,
  Star,
  FileMusic,
  Code,
  Terminal,
  Search,
  Plus,
  Trash2,
  Edit,
  Save,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sliders,
  Sparkles,
  X,
  Disc,
  User,
  UserCheck,
  Filter
} from 'lucide-react';
import { config } from '../../config';

const TABLES = [
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
  { id: 'query', label: 'Consola SQL', model: 'Console', icon: Terminal, color: 'text-cyan-600 bg-cyan-50' },
];

/**
 * Componente interactivo de autocompletado y sugerencia de artistas
 */
function ArtistAutocompleteInput({
  value,
  onChange,
  onSelectArtist,
  onAddCustom,
  placeholder = 'Escribe el nombre de un artista...',
  buttonLabel = 'Añadir',
  existingNames = [],
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Consultar artistas en la base de datos
  const fetchSuggestions = useCallback(async (q) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/artists/suggest?q=${encodeURIComponent(q || '')}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data || []);
      }
    } catch (e) {
      console.warn('Error fetching artist suggestions:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    onChange(val);
    setActiveIndex(-1);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 150);
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (suggestions.length === 0) {
      fetchSuggestions(value);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = suggestions.filter(
    (s) => !existingNames.map((n) => n.toLowerCase()).includes(s.name.toLowerCase())
  );

  const handleSelect = (artistName) => {
    onSelectArtist(artistName);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && filteredSuggestions[activeIndex]) {
        handleSelect(filteredSuggestions[activeIndex].name);
      } else if (value.trim()) {
        if (onAddCustom) {
          onAddCustom(value.trim());
        } else {
          handleSelect(value.trim());
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-teal-500 pr-7 transition"
          />
          {isLoading && (
            <RefreshCw className="w-3 h-3 text-teal-400 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (value.trim()) {
              if (onAddCustom) {
                onAddCustom(value.trim());
              } else {
                handleSelect(value.trim());
              }
            }
          }}
          disabled={!value.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-teal-600/30 hover:bg-teal-600/50 disabled:opacity-40 text-teal-200 border border-teal-500/40 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{buttonLabel}</span>
        </button>
      </div>

      {/* Menú flotante de autocompletado */}
      {isOpen && (filteredSuggestions.length > 0 || value.trim()) && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-stone-950/95 backdrop-blur-md border border-stone-800 rounded-xl shadow-2xl z-50 overflow-hidden max-h-56 overflow-y-auto divide-y divide-stone-900 animate-fade-in">
          {filteredSuggestions.map((item, idx) => {
            const isSelected = activeIndex === idx;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.name)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-xs transition cursor-pointer ${
                  isSelected ? 'bg-teal-950/90 text-teal-200 font-bold' : 'text-stone-300 hover:bg-stone-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1 rounded-md bg-stone-900 border border-stone-800 text-teal-400">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium">{item.name}</span>
                </div>
                {item._count?.songs !== undefined && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-stone-400">
                    {item._count.songs} tema(s)
                  </span>
                )}
              </button>
            );
          })}

          {value.trim() && !filteredSuggestions.some((s) => s.name.toLowerCase() === value.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => {
                if (onAddCustom) {
                  onAddCustom(value.trim());
                } else {
                  handleSelect(value.trim());
                }
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs text-amber-400 hover:bg-amber-950/30 transition cursor-pointer border-t border-stone-800/80 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                Añadir nuevo artista: <strong className="text-white font-bold">"{value.trim()}"</strong>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function getSyncMeasureCount(syncData) {
  if (!syncData) return null;
  try {
    const parsed = typeof syncData === 'string' ? JSON.parse(syncData) : syncData;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.length;
    }
  } catch {}
  return null;
}

export default function DevDatabaseStudio({ onNavigateHome }) {
  const [activeTab, setActiveTab] = useState('songs');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [songFilter, setSongFilter] = useState('all');
  const [loadingTable, setLoadingTable] = useState(false);
  const [toast, setToast] = useState(null);

  // Edit / Create modal state
  const [editingItem, setEditingItem] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [newArtistTag, setNewArtistTag] = useState('');

  // SQL Console state
  const [sqlQuery, setSqlQuery] = useState('SELECT id, title, artist, youtubeId, updatedAt FROM Song ORDER BY updatedAt DESC LIMIT 10;');
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlLoading, setSqlLoading] = useState(false);

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
  const fetchTableData = useCallback(async (tabId = activeTab, pageNum = page, search = searchTerm, filter = songFilter) => {
    if (tabId === 'query') return;
    setLoadingTable(true);
    try {
      const url = new URL(`${config.API_BASE_URL}/dev/tables/${tabId}`, window.location.origin);
      url.searchParams.set('page', pageNum);
      url.searchParams.set('limit', limit);
      if (search) url.searchParams.set('search', search);
      if (tabId === 'songs' && filter && filter !== 'all') {
        url.searchParams.set('filter', filter);
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
  }, [activeTab, page, limit, searchTerm, songFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    setPage(1);
    if (activeTab !== 'query') {
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

  // Ejecutar consulta SQL
  const handleRunSqlQuery = async (queryToRun = sqlQuery) => {
    if (!queryToRun.trim()) return;
    setSqlLoading(true);
    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al ejecutar SQL');
      setSqlResult(data);
      showToast(`Consulta ejecutada en ${data.executionTimeMs}ms`, 'success');
    } catch (err) {
      setSqlResult({ error: err.message });
      showToast(err.message, 'error');
    } finally {
      setSqlLoading(false);
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
    const artistNames = item.artists && Array.isArray(item.artists)
      ? item.artists.map((a) => a.name)
      : (item.artist ? item.artist.split(',').map((s) => s.trim()).filter(Boolean) : []);

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
          {activeTab === 'query' ? (
            /* SQL Console View */
            <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
              <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">Consola SQL Directa</h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-400">
                    <span>Atajo:</span>
                    <kbd className="px-2 py-0.5 bg-stone-800 rounded text-stone-300 font-mono text-[11px] border border-stone-700">Ctrl + Enter</kbd>
                  </div>
                </div>

                {/* Preset Queries */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => setSqlQuery('SELECT id, title, artist, youtubeId, updatedAt FROM Song ORDER BY updatedAt DESC LIMIT 15;')}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-stone-700 transition cursor-pointer font-mono"
                  >
                    Últimas 15 Canciones
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT al.id, al.title, al.releaseYear, al.versionType, ar.name as artista, count(s.id) as canciones FROM Album al JOIN Artist ar ON al.artistId = ar.id LEFT JOIN Song s ON al.id = s.albumId GROUP BY al.id ORDER BY al.releaseYear DESC;')}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-stone-700 transition cursor-pointer font-mono"
                  >
                    Álbumes con Artista
                  </button>
                  <button
                    onClick={() => setSqlQuery("SELECT id, title, artist, youtubeId, CASE WHEN syncData IS NOT NULL AND syncData != '' AND syncData != '[]' THEN 'Sincronizada (BeatGrid)' ELSE 'Solo Letra' END as estadoSync FROM Song ORDER BY updatedAt DESC;")}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-stone-700 transition cursor-pointer font-mono"
                  >
                    Canciones y Estado Sync
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT u.id, u.email, u.name, u.role, count(p.id) as totalPreferencias FROM User u LEFT JOIN UserSongPreference p ON u.id = p.userId GROUP BY u.id;')}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-stone-700 transition cursor-pointer font-mono"
                  >
                    Usuarios y Preferencias
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT a.name as artista, count(s.id) as canciones FROM Artist a LEFT JOIN _ArtistToSong rel ON a.id = rel.A LEFT JOIN Song s ON rel.B = s.id GROUP BY a.id ORDER BY canciones DESC;')}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-stone-700 transition cursor-pointer font-mono"
                  >
                    Artistas con más canciones
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT s.id, s.name, count(ss.id) as totalCanciones FROM Setlist s LEFT JOIN SetlistSong ss ON s.id = ss.setlistId GROUP BY s.id;')}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-stone-700 transition cursor-pointer font-mono"
                  >
                    Repertorios con conteo
                  </button>
                  <button
                    onClick={() => setSqlQuery("SELECT name FROM sqlite_master WHERE type='table';")}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-stone-700 transition cursor-pointer font-mono"
                  >
                    Listar Tablas SQLite
                  </button>
                </div>

                {/* Query Textarea */}
                <div className="relative">
                  <textarea
                    rows={4}
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        handleRunSqlQuery();
                      }
                    }}
                    placeholder="Escribe tu consulta SQL aquí (ej: SELECT * FROM Song WHERE artist LIKE '%Soda%')..."
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 font-mono text-xs text-amber-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-500">Ejecuta consultas en vivo sobre SQLite con Prisma</span>
                  <button
                    onClick={() => handleRunSqlQuery()}
                    disabled={sqlLoading || !sqlQuery.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer active:scale-95 shadow-lg shadow-cyan-600/20"
                  >
                    {sqlLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
                    <span>Ejecutar Consulta</span>
                  </button>
                </div>
              </div>

              {/* SQL Results */}
              {sqlResult && (
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-400 pb-2 border-b border-stone-800">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">Resultado:</span>
                      {sqlResult.rowCount !== undefined && (
                        <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[11px]">
                          {sqlResult.rowCount} fila(s)
                        </span>
                      )}
                    </div>
                    {sqlResult.executionTimeMs !== undefined && (
                      <span className="font-mono text-emerald-400 text-[11px]">
                        ⏱ {sqlResult.executionTimeMs} ms
                      </span>
                    )}
                  </div>

                  {sqlResult.error ? (
                    <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl text-xs font-mono text-rose-300">
                      ⚠️ {sqlResult.error}
                    </div>
                  ) : Array.isArray(sqlResult.rows) && sqlResult.rows.length > 0 ? (
                    <div className="overflow-x-auto max-h-[450px]">
                      <table className="w-full text-left text-xs font-mono border-collapse">
                        <thead className="bg-stone-900 sticky top-0 border-b border-stone-800">
                          <tr>
                            {Object.keys(sqlResult.rows[0]).map((col) => (
                              <th key={col} className="px-3 py-2 text-stone-400 font-semibold whitespace-nowrap">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-800/60">
                          {sqlResult.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-stone-900/60 transition">
                              {Object.keys(sqlResult.rows[0]).map((col) => {
                                const val = row[col];
                                const isObj = typeof val === 'object' && val !== null;
                                return (
                                  <td key={col} className="px-3 py-2 text-stone-300 max-w-xs truncate" title={String(val)}>
                                    {isObj ? JSON.stringify(val) : String(val ?? 'NULL')}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-stone-500 font-mono">
                      {sqlResult.message || 'No se devolvieron filas.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Table Records View */
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
                                        alt={item.title}
                                        className="w-9 h-9 rounded-lg object-cover border border-stone-800 shadow-sm flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-9 h-9 rounded-lg bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-600 flex-shrink-0">
                                        <Music className="w-4 h-4" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="font-semibold text-white truncate text-xs" title={item.title}>
                                        {item.title}
                                      </div>
                                      {(item.albumRel?.title || item.album) && (
                                        <div className="text-[11px] text-stone-400 truncate flex items-center gap-1.5 mt-0.5">
                                          <Disc className="w-3 h-3 text-stone-500 flex-shrink-0" />
                                          <span className="truncate">{item.albumRel?.title || item.album}</span>
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
                                    {item.artists && item.artists.length > 0 ? (
                                      item.artists.map((art) => (
                                        <span
                                          key={art.id}
                                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-teal-950/70 border border-teal-800/70 text-teal-300"
                                        >
                                          {art.name}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-stone-300">{item.artist || '—'}</span>
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
                              </>
                            )}

                            {/* Updated At */}
                            <td className="px-4 py-3 font-mono text-[10px] text-stone-500 whitespace-nowrap">
                              {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
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
          )}
        </main>
      </div>

      {/* Record Editor Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-950 border border-stone-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-900/60">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-white">
                  {isCreating ? `Nuevo Registro en ${activeTab}` : `Editar ${activeTab} (${editingItem.id})`}
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto p-6 space-y-4">
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
                      value={editingItem.artist || ''}
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
                          handleAddArtistTag(artistName);
                        }}
                        onAddCustom={(customName) => {
                          handleAddArtistTag(customName);
                        }}
                        existingNames={editingItem.artistNames || []}
                        placeholder="Escribe el nombre de un artista (ej: Soda Stereo, Bruno Mars, Cerati)..."
                        buttonLabel="Añadir"
                      />
                    </div>
                  </div>

                  {/* Album & Edition Metadata */}
                  <div className="space-y-3 md:col-span-2 bg-stone-900/50 p-4 rounded-2xl border border-stone-800">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-200">
                      <Disc className="w-4 h-4 text-rose-400" />
                      <span>Metadatos del Álbum y Edición Canónica</span>
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
                        <label className="text-xs font-semibold text-stone-400">URL de Carátula del Álbum</label>
                        <input
                          type="text"
                          value={editingItem.albumCover || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, albumCover: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                        />
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
                    <label className="text-xs font-semibold text-stone-400">URL de Carátula Oficial</label>
                    <input
                      type="text"
                      value={editingItem.cover || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, cover: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
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
      )}
    </div>
  );
}
