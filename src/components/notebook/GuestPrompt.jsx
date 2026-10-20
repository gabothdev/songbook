import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Search,
  X,
  Play,
  Music,
  LogIn,
  UserPlus,
  Guitar,
  Flame,
  Star
} from 'lucide-react';
import { WashiTape } from './MusicalDoodles';
import { useLanguage } from '../../context/LanguageContext';

export default function GuestPrompt({
  songs = [],
  onSelectSong = null,
  onSwitchToLogin = null,
  onSwitchToRegister = null,
}) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrado reactivo en tiempo real por título o artista
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return songs;
    const q = searchQuery.toLowerCase().trim();
    return songs.filter(
      (s) =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.artist || '').toLowerCase().includes(q)
    );
  }, [songs, searchQuery]);

  return (
    <div className="relative h-full flex flex-col justify-between select-none space-y-2.5">
      {/* ================= ENCABEZADO SUPERIOR ================= */}
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <WashiTape color="bg-emerald-200/80" className="transform -rotate-1" />
          <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300 uppercase tracking-wider">
            {t.tabGuest || 'Modo Libre'}
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-serif font-black text-stone-900 tracking-tight leading-tight">
          {t.guestTitle || 'Cancionero en Modo Libre'}
        </h2>
        <p className="text-[11px] sm:text-xs font-sans text-stone-600 mt-0.5">
          {t.guestSubtitle || 'Explorá canciones completas con acordes, tablaturas y video sincronizado.'}
        </p>
      </div>

      {/* ================= TARJETA DESTACADA (PROPUESTA DE INICIO DE SESIÓN) ================= */}
      <div className="flex-shrink-0 relative overflow-hidden bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 text-white rounded-xl p-3 sm:p-3.5 shadow-md border border-amber-400/40">
        <div className="absolute -right-4 -bottom-6 w-20 h-20 bg-white/5 rounded-full blur-lg pointer-events-none" />
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 bg-amber-500/30 rounded-lg border border-amber-300/30 flex-shrink-0 mt-0.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-serif font-bold text-xs sm:text-sm text-amber-100 leading-snug">
              ¿Querés armar setlists y guardar tus canciones?
            </h3>
            <p className="font-sans text-[10.5px] sm:text-[11px] text-amber-200/90 mt-0.5 leading-tight">
              Iniciá sesión o creá tu cuenta gratis para organizar repertorios, guardar favoritas y recordar tus tonos personalizados.
            </p>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {onSwitchToLogin && (
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-950 rounded-lg font-sans font-bold text-[11px] shadow-xs hover:shadow transition-all flex items-center gap-1 cursor-pointer"
                >
                  <LogIn className="w-3 h-3 text-amber-700" />
                  <span>Iniciar Sesión</span>
                </button>
              )}
              {onSwitchToRegister && (
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="px-2.5 py-1 bg-amber-900/40 hover:bg-amber-900/60 border border-amber-300/40 hover:border-amber-200 text-amber-100 rounded-lg font-sans font-semibold text-[11px] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3 h-3 text-amber-300" />
                  <span>Crear Cuenta Gratis</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= BUSCADOR RÁPIDO & INDICADOR DE POPULARIDAD ================= */}
      <div className="flex-shrink-0 space-y-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por canción, artista o género en Modo Libre..."
            className="w-full pl-8 pr-7 py-1.5 bg-white/90 focus:bg-white text-xs font-sans text-stone-800 placeholder-stone-400 rounded-xl border border-stone-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/20 shadow-2xs transition-all outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] font-sans text-stone-500 px-1">
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
            <span>Top comunitarias ({filteredSongs.length} temas)</span>
          </span>
          {searchQuery && (
            <span className="text-amber-800 font-medium">Filtrado: "{searchQuery}"</span>
          )}
        </div>
      </div>

      {/* ================= CUADRÍCULA DE TARJETAS (2 COLUMNAS) ================= */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredSongs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-1">
              {filteredSongs.map((song, i) => {
                const rotationClass = i % 2 === 0 ? '-rotate-1' : 'rotate-1';
                const hasScore = song.popularityScore > 0;

                return (
                  <motion.div
                    key={song.id || `free-song-${i}`}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.12 }}
                    onClick={() => onSelectSong && onSelectSong(song)}
                    className="p-2 bg-white/95 hover:bg-white rounded-xl border border-stone-200/90 hover:border-amber-400/80 shadow-2xs hover:shadow-md transition-all cursor-pointer flex items-center gap-2.5 group text-left relative overflow-hidden"
                  >
                    {/* Foto del Artista en formato Polaroid */}
                    <div
                      className={`relative p-0.5 pb-1 bg-[#f4f2ec] rounded border border-stone-300/80 shadow-2xs flex-shrink-0 transition-transform duration-200 group-hover:rotate-0 group-hover:scale-105 ${rotationClass}`}
                    >
                      {song.artistImage ? (
                        <img
                          src={song.artistImage}
                          alt={song.artist || 'Artista'}
                          className="w-10 h-10 rounded-[2px] object-cover bg-stone-900 border border-stone-300/40"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-[2px] bg-[#352820] flex items-center justify-center text-amber-200">
                          <Guitar className="w-4 h-4 text-amber-300/80" />
                        </div>
                      )}
                    </div>

                    {/* Información de la canción */}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif font-bold text-stone-900 text-xs group-hover:text-amber-900 transition-colors truncate leading-tight">
                        {song.title}
                      </h4>
                      <p className="text-[10.5px] font-sans text-stone-500 font-medium truncate mt-0.5 leading-tight">
                        {song.artist || 'Artista Desconocido'}
                      </p>

                      {/* Metadatos: Tono & Popularidad */}
                      <div className="flex items-center gap-1.5 mt-1">
                        {song.key && (
                          <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200/80">
                            {song.key}
                          </span>
                        )}
                        {hasScore ? (
                          <span className="font-sans text-[9px] font-semibold text-amber-700 flex items-center gap-0.5 bg-amber-50/80 px-1 py-0.2 rounded border border-amber-200/50">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600" />
                            <span>{song.popularityScore}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Botón de acceso al cancionero */}
                    <div className="w-6 h-6 rounded-full bg-stone-100 group-hover:bg-amber-600 text-stone-400 group-hover:text-white flex items-center justify-center transition-all flex-shrink-0 shadow-2xs">
                      <Play className="w-2.5 h-2.5 ml-0.5 fill-current" />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-stone-500 space-y-1.5">
              <Music className="w-6 h-6 mx-auto text-stone-400/80" />
              <p className="text-xs font-sans">No se encontraron canciones para "{searchQuery}".</p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-sans font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                >
                  Ver todas las canciones
                </button>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
