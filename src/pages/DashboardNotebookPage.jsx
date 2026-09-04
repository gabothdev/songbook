import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Plus,
  Search,
  ListMusic,
  Play,
  LogOut,
  Guitar,
  Crown,
  Zap,
  Music2
} from 'lucide-react';
import SpiralRings from '../components/notebook/SpiralRings';
import AdBanner from '../components/monetization/AdBanner';
import { useLanguage } from '../context/LanguageContext';
import { useAuth, TIERS } from '../context/AuthContext';

const USER_SONGS = [
  { id: '1', title: 'Muchacha (Ojos de papel)', artist: 'Almendra', key: 'G' },
  { id: '2', title: 'De Música Ligera', artist: 'Soda Stereo', key: 'Bm' },
  { id: '3', title: 'Seminare', artist: 'Serú Girán', key: 'C' },
  { id: '4', title: 'Los Mareados', artist: 'Aníbal Troilo', key: 'Am' },
  { id: '5', title: 'Rezo por vos', artist: 'Charly García & Spinetta', key: 'A' },
  { id: '6', title: 'Seguir viviendo sin tu amor', artist: 'Luis Alberto Spinetta', key: 'E' },
];

const SETLISTS = [
  { name: 'En Vivo Acústico', count: 8 },
  { name: 'Práctica de Bandoneón', count: 5 },
  { name: 'Canciones para Fogón', count: 12 },
];

export default function DashboardNotebookPage({ onLogout, onOpenSong }) {
  const { lang, setLang, t } = useLanguage();
  const { currentUser, toggleTier, openUpgradeModal } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const user = currentUser || {
    name: 'Gabriel (GabothDev)',
    email: 'gabothdev@gmail.com',
    instrument: 'Guitarra & Bandoneón',
    tier: TIERS.PREMIUM,
  };

  const isPro = user.tier === TIERS.PREMIUM;

  const filteredSongs = USER_SONGS.filter((s) => {
    return (
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.artist.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-4 sm:p-6 lg:p-8 desk-surface select-none">
      {/* Top Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between pb-3 z-20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-stone-900 text-amber-300 rounded-xl">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-serif font-bold text-stone-200 text-base">
            SongBook
          </span>
        </div>

        {/* Status + Demo Tier Switcher + Logout */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTier}
            className={`px-3 py-1 rounded-lg text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
              isPro ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300'
            }`}
            title="Cambiar Plan (Demo)"
          >
            {isPro ? <Crown className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
            <span>{isPro ? 'PRO' : 'FREE'}</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1 bg-stone-900/80 hover:bg-stone-800 text-stone-300 hover:text-white rounded-lg border border-stone-700 text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Notebook Spread */}
      <main className="relative w-full max-w-5xl my-auto z-10 py-2">
        <div className="absolute inset-3 bg-black/60 rounded-3xl blur-2xl -z-10 pointer-events-none" />

        <div className="relative bg-[#2c211b] p-3 sm:p-4 rounded-3xl shadow-2xl border border-[#44332a] flex flex-col md:flex-row">
          
          {/* ================= LEFT PAGE (Profile & Setlists) ================= */}
          <div className="hidden md:flex flex-col justify-between flex-1 bg-[#fcf9f2] rounded-l-2xl shadow-[inset_-8px_0_12px_rgba(0,0,0,0.06)] border-y border-l border-stone-300 overflow-hidden paper-texture p-8 min-h-[560px] relative">
            <div className="absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-stone-900/10 to-transparent pointer-events-none z-10" />

            {/* Profile Info */}
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-200 flex items-center justify-center font-serif text-xl font-bold">
                  G
                </div>
                <div>
                  <h2 className="text-xl font-serif font-bold text-stone-900">
                    {user.name}
                  </h2>
                  <p className="text-xs font-sans text-stone-500">
                    {user.instrument || 'Guitarra'}
                  </p>
                </div>
              </div>

              {/* Setlists */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-600 font-sans flex items-center gap-1.5">
                    <ListMusic className="w-3.5 h-3.5 text-amber-700" />
                    Listas de Canciones
                  </span>
                  <button className="text-xs font-sans text-amber-800 hover:text-amber-950 font-semibold cursor-pointer">
                    + Nueva
                  </button>
                </div>

                <div className="space-y-1.5">
                  {SETLISTS.map((setlist, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white/80 hover:bg-white rounded-xl border border-stone-200/80 shadow-sm flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="text-xs font-sans font-medium text-stone-800">{setlist.name}</span>
                      <span className="text-[11px] font-mono text-stone-400">{setlist.count} temas</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Action */}
            <div className="pt-4 border-t border-stone-200/60 space-y-3">
              {!isPro && (
                <button
                  onClick={openUpgradeModal}
                  className="w-full py-2 px-3 bg-amber-100 hover:bg-amber-200/80 text-amber-900 border border-amber-300 rounded-xl font-sans font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-600" />
                  <span>Desbloquear SongBook Pro</span>
                </button>
              )}

              <button className="w-full py-2.5 px-4 bg-stone-900 hover:bg-black text-amber-100 rounded-xl font-sans font-bold text-xs shadow flex items-center justify-center gap-2 cursor-pointer">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Agregar Canción</span>
              </button>
            </div>
          </div>

          {/* ================= SPIRAL SPINE ================= */}
          <div className="hidden md:flex w-10 z-20 items-center justify-center -mx-2.5">
            <SpiralRings count={11} />
          </div>

          {/* ================= RIGHT PAGE (Song List) ================= */}
          <div className="flex-1 bg-[#fcf9f2] rounded-2xl md:rounded-l-none md:rounded-r-2xl shadow-[inset_8px_0_12px_rgba(0,0,0,0.06)] border border-stone-300 overflow-hidden paper-texture p-7 sm:p-8 min-h-[560px] flex flex-col justify-between relative">
            <div className="absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-stone-900/10 to-transparent pointer-events-none z-10" />

            <div>
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-2xl font-serif font-bold text-stone-900">
                  Biblioteca
                </h3>
                <p className="text-xs font-sans text-stone-500 mt-0.5">
                  Elige una canción para empezar a tocar
                </p>
              </div>

              {/* Clean Search Bar */}
              <div className="relative mb-3.5">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar canción o artista..."
                  className="w-full bg-white border border-stone-300 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm text-stone-900 font-sans transition-all outline-none"
                />
              </div>

              {/* Clean Songs List */}
              <div className="space-y-1.5 max-h-[330px] overflow-y-auto pr-1">
                {filteredSongs.map((song) => (
                  <motion.div
                    key={song.id}
                    whileHover={{ x: 3 }}
                    onClick={() => onOpenSong && onOpenSong(song)}
                    className="p-3 bg-white/80 hover:bg-white rounded-xl border border-stone-200 shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-mono text-xs font-bold border border-amber-300 group-hover:bg-stone-900 group-hover:text-amber-300 group-hover:border-stone-900 transition-colors">
                        {song.key}
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-stone-900 text-sm group-hover:text-amber-900 transition-colors">
                          {song.title}
                        </h4>
                        <p className="text-xs font-sans text-stone-500">
                          {song.artist}
                        </p>
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg text-stone-400 group-hover:text-stone-900 transition-colors">
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Optional Ad Banner for Free Users */}
              <AdBanner slotId="dashboard-bottom" />
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-stone-200/60 flex items-center justify-between text-xs font-sans text-stone-500">
              <span>{filteredSongs.length} canciones</span>
              <span className="italic">SongBook Studio</span>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl flex items-center justify-between text-stone-400 text-xs font-sans pt-2 z-10">
        <span>© 2026 SongBook</span>
        <div className="flex items-center gap-1.5 text-stone-400 font-medium">
          <Music2 className="w-3.5 h-3.5" />
          <span>Tu cuaderno de música</span>
        </div>
      </footer>
    </div>
  );
}
