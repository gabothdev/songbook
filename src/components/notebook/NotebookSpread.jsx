import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpiralRings from './SpiralRings';
import NotebookCover from './NotebookCover';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import GuestPrompt from './GuestPrompt';
import NotebookTabs from './NotebookTabs';
import InstrumentBookmark from './InstrumentBookmark';
import SetlistsPanel from './SetlistsPanel';
import FavoritesLibraryPanel from './FavoritesLibraryPanel';
import SongSheetView from '../song/SongSheetView';
import SongSearchRebuild from '../search/SongSearchRebuild';
import { SAMPLE_SONGS_DATA } from '../../data/sampleSongs';
import useSetlistManager from '../../hooks/useSetlistManager';
import {
  BookOpen,
  Crown,
  Zap,
  LogOut,
  Music2
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth, TIERS } from '../../context/AuthContext';

/**
 * NotebookSpread Component
 * Master dual-page analog notebook spread controller with 3D page flip animation,
 * authentication gating, setlists and favorites panels, and song sheet view.
 */
export default function NotebookSpread() {
  const { t } = useLanguage();
  const { currentUser, login, logout, toggleTier, openUpgradeModal } = useAuth();

  const [activeAuthTab, setActiveAuthTab] = useState('login');
  const [selectedSong, setSelectedSong] = useState(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isPageFlipping, setIsPageFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('forward');

  const isPro = currentUser?.tier === TIERS.PREMIUM;

  // Setlist, Favorites & Catalog Manager Hook
  const {
    userSongs,
    setlists,
    activeSetlist,
    setActiveSetlist,
    setStageModeSetlist,
    setlistContext,
    handleToggleFavorite,
    handleCreateSetlist,
    handleDeleteSetlist,
    handleAddSongToSetlist,
    handleRemoveSongFromSetlist,
    handlePlaySetlist,
    handlePlaySongFromSetlistPanel,
    handleImportScrapedSong,
  } = useSetlistManager({
    onSelectSong: (song) => setSelectedSong(song),
    onUpdateSelectedSong: (updaterFn) => setSelectedSong(updaterFn),
  });

  const triggerPageFlip = (direction, callback) => {
    setFlipDirection(direction);
    setIsPageFlipping(true);
    setTimeout(() => {
      if (callback) callback();
    }, 450);
    setTimeout(() => {
      setIsPageFlipping(false);
    }, 900);
  };

  const handleLoginSubmit = (data) => {
    triggerPageFlip('forward', () => login(data));
  };

  const handleLogoutClick = () => {
    setSelectedSong(null);
    setActiveSetlist(null);
    setStageModeSetlist(null);
    triggerPageFlip('backward', () => logout());
  };

  const handleOpenSongItem = (songItem) => {
    const fullSongData = SAMPLE_SONGS_DATA[songItem.id] || songItem;
    setStageModeSetlist(null);
    triggerPageFlip('forward', () => setSelectedSong(fullSongData));
  };

  const handleBackToLibrary = () => {
    setStageModeSetlist(null);
    triggerPageFlip('backward', () => setSelectedSong(null));
  };

  const onPlaySetlistDirect = (sl) => {
    handlePlaySetlist(sl, 0, (song) => {
      triggerPageFlip('forward', () => setSelectedSong(song));
    });
  };

  const onPlaySongFromPanel = (song) => {
    handlePlaySongFromSetlistPanel(song, (songToOpen) => {
      handleOpenSongItem(songToOpen);
    });
  };

  const onImportScrapedSong = (scrapedData) => {
    handleImportScrapedSong(scrapedData, (songToOpen) => {
      handleOpenSongItem(songToOpen);
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center p-3 sm:p-5 lg:p-6 xl:p-8 desk-surface select-none relative overflow-x-hidden">
      {/* Top Header Bar */}
      <header className="w-full max-w-[1560px] flex items-center justify-between pb-2.5 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-stone-900 text-amber-300 rounded-xl shadow-md">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="font-serif font-bold text-stone-100 text-base sm:text-lg block tracking-tight">
              SongBook
            </span>
            <span className="font-mono text-[11px] text-amber-400/80 font-medium">
              {currentUser ? `Cuaderno de ${currentUser.name}` : 'Estudio de Acordes & Canciones'}
            </span>
          </div>
        </div>

        {/* Status / Plan Toggle / Logout */}
        <div className="flex items-center gap-3">
          {currentUser && (
            <>
              <button
                type="button"
                onClick={toggleTier}
                className={`px-3 py-1 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
                  isPro ? 'bg-amber-600 text-white shadow-sm' : 'bg-stone-800 text-stone-300'
                }`}
                title="Cambiar Plan (Demo)"
              >
                {isPro ? <Crown className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                <span>{isPro ? 'PRO' : 'FREE'}</span>
              </button>

              <button
                type="button"
                onClick={handleLogoutClick}
                disabled={isPageFlipping}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/85 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl border border-stone-700 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cerrar Cuaderno</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ================= MAIN LARGE NOTEBOOK SPREAD ================= */}
      <main className="relative w-full max-w-[1560px] my-auto z-10 py-1">
        <div className="absolute inset-3 bg-black/75 rounded-3xl blur-3xl -z-10 pointer-events-none" />

        <div
          className="relative bg-[#271d17] p-3 sm:p-4 lg:p-5 rounded-2xl sm:rounded-3xl shadow-2xl border border-[#44332a] flex flex-col md:flex-row min-h-[620px] xl:min-h-[680px] 2xl:min-h-[730px]"
          style={{ perspective: 2800 }}
        >
          {/* Index Tabs (only shown when not logged in) */}
          {!currentUser && (
            <NotebookTabs activeTab={activeAuthTab} onTabChange={setActiveAuthTab} />
          )}

          {/* Instrument Bookmark Tab (hanging underneath the left page) */}
          <InstrumentBookmark />

          {/* If a song is selected, render the open SongSheetView spread */}
          {selectedSong ? (
            <SongSheetView
              song={selectedSong}
              onBack={handleBackToLibrary}
              setlistContext={setlistContext}
              isFavorite={
                selectedSong
                  ? !!userSongs.find(
                      (s) =>
                        String(s.id) === String(selectedSong.id) ||
                        (s.title === selectedSong.title && s.artist === selectedSong.artist)
                    )?.isFavorite
                  : false
              }
              onToggleFavorite={handleToggleFavorite}
              setlists={setlists}
              onAddSongToSetlist={handleAddSongToSetlist}
            />
          ) : (
            <>
              {/* ================= LEFT STATIONARY BASE PAGE ================= */}
              <div className="hidden md:flex flex-col justify-between flex-1 bg-[#fcf9f2] rounded-l-2xl shadow-[inset_-10px_0_15px_rgba(0,0,0,0.06)] border-y border-l border-stone-300 overflow-hidden paper-texture p-7 lg:p-9 min-h-[580px] xl:min-h-[640px] 2xl:min-h-[690px] relative z-10">
                <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-stone-900/10 to-transparent pointer-events-none z-10" />

                {!currentUser ? (
                  /* Cover when logged out */
                  <NotebookCover />
                ) : (
                  /* Interactive Setlists Panel when logged in */
                  <SetlistsPanel
                    currentUser={currentUser}
                    setlists={setlists}
                    activeSetlist={activeSetlist}
                    onSelectSetlist={setActiveSetlist}
                    onBackToSetlists={() => setActiveSetlist(null)}
                    onCreateSetlist={handleCreateSetlist}
                    onDeleteSetlist={handleDeleteSetlist}
                    onRemoveSongFromSetlist={handleRemoveSongFromSetlist}
                    onPlaySong={onPlaySongFromPanel}
                    onPlaySetlist={onPlaySetlistDirect}
                    isPro={isPro}
                    onOpenUpgradeModal={openUpgradeModal}
                    onOpenSearchModal={() => setIsSearchModalOpen(true)}
                  />
                )}
              </div>

              {/* ================= PERMANENT CENTRAL SPIRAL RINGS ================= */}
              <div className="hidden md:flex w-10 z-30 items-center justify-center -mx-2.5 pointer-events-none">
                <SpiralRings count={13} />
              </div>

              {/* ================= RIGHT STATIONARY BASE PAGE ================= */}
              <div className="flex-1 bg-[#fcf9f2] rounded-2xl md:rounded-l-none md:rounded-r-2xl shadow-[inset_10px_0_15px_rgba(0,0,0,0.06)] border border-stone-300 overflow-hidden paper-texture p-7 lg:p-9 min-h-[580px] xl:min-h-[640px] 2xl:min-h-[690px] flex flex-col justify-between relative z-10">
                <div className="absolute top-0 left-0 bottom-0 w-10 bg-gradient-to-r from-stone-900/10 to-transparent pointer-events-none z-10" />

                {!currentUser ? (
                  /* Auth Form when logged out */
                  <>
                    {activeAuthTab === 'login' && (
                      <LoginForm
                        onSwitchToRegister={() => setActiveAuthTab('register')}
                        onSubmit={handleLoginSubmit}
                      />
                    )}
                    {activeAuthTab === 'register' && (
                      <RegisterForm
                        onSwitchToLogin={() => setActiveAuthTab('login')}
                        onSubmit={handleLoginSubmit}
                      />
                    )}
                    {activeAuthTab === 'guest' && (
                      <GuestPrompt
                        onEnterGuest={() => handleLoginSubmit({ guest: true, name: 'Invitado' })}
                        onSwitchToLogin={() => setActiveAuthTab('login')}
                      />
                    )}
                  </>
                ) : (
                  /* Favorites & Songs Library when logged in */
                  <FavoritesLibraryPanel
                    userSongs={userSongs}
                    onOpenSong={handleOpenSongItem}
                    onToggleFavorite={handleToggleFavorite}
                    activeSetlist={activeSetlist}
                    onAddSongToSetlist={handleAddSongToSetlist}
                    onOpenSearchModal={() => setIsSearchModalOpen(true)}
                    isPro={isPro}
                  />
                )}
              </div>
            </>
          )}

          {/* ================= 3D PHYSICAL FLIPPING PAPER SHEET ================= */}
          <AnimatePresence>
            {isPageFlipping && (
              <motion.div
                initial={{
                  rotateY: flipDirection === 'forward' ? 0 : -180,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                }}
                animate={{
                  rotateY: flipDirection === 'forward' ? -180 : 0,
                  boxShadow: [
                    '0 10px 25px rgba(0,0,0,0.1)',
                    '-20px 25px 40px rgba(0,0,0,0.35)',
                    '0 10px 25px rgba(0,0,0,0.1)',
                  ],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.85,
                  ease: [0.45, 0.05, 0.25, 1],
                }}
                style={{
                  transformOrigin: 'left center',
                  transformStyle: 'preserve-3d',
                }}
                className="hidden md:block absolute top-3 sm:top-4 lg:top-5 bottom-3 sm:bottom-4 lg:bottom-5 left-1/2 right-3 sm:right-4 lg:right-5 bg-[#fcf9f2] rounded-r-2xl border border-stone-300 paper-texture pointer-events-none z-40 overflow-hidden"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.4, 0] }}
                  transition={{ duration: 0.85 }}
                  className="absolute inset-0 bg-gradient-to-r from-stone-900/30 via-stone-800/10 to-transparent pointer-events-none"
                />

                <div
                  className="w-full h-full p-10 flex flex-col justify-center items-center text-center opacity-75"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <BookOpen className="w-14 h-14 text-stone-400 animate-pulse mb-3" />
                  <p className="font-serif italic text-base text-stone-600">
                    {selectedSong ? 'Cargando canción...' : 'Pasando página...'}
                  </p>
                </div>

                <div
                  className="absolute inset-0 w-full h-full p-10 flex flex-col justify-center items-center text-center bg-[#fcf9f2] rounded-l-2xl border-l border-stone-300 paper-texture"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <Music2 className="w-14 h-14 text-amber-700 animate-bounce mb-3" />
                  <p className="font-serif font-bold text-base text-stone-800">
                    {selectedSong ? selectedSong.title : '¡Bienvenido a tu Cancionero!'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Full Song Search Modal */}
      <SongSearchRebuild
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSongSelect={onImportScrapedSong}
      />

      {/* Footer */}
      <footer className="w-full max-w-[1560px] flex items-center justify-between text-stone-400 text-xs font-sans pt-2 z-10">
        <span>© 2026 SongBook</span>
        <div className="flex items-center gap-1.5 text-stone-400 font-medium">
          <Music2 className="w-3.5 h-3.5" />
          <span>Tu cuaderno interactivo de acordes</span>
        </div>
      </footer>
    </div>
  );
}
