import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SpiralRings from './SpiralRings';
import NotebookCover from './NotebookCover';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import GuestPrompt from './GuestPrompt';
import NotebookTabs from './NotebookTabs';
import InstrumentBookmark from './InstrumentBookmark';
import LanguageSelector from './LanguageSelector';
import SetlistsPanel from './SetlistsPanel';
import FavoritesLibraryPanel from './FavoritesLibraryPanel';
import SongSheetView from '../song/SongSheetView';
import SongSearchRebuild from '../search/SongSearchRebuild';
import ScoresIndexPanel from '../scores/ScoresIndexPanel';
import ScoreStandView from '../scores/ScoreStandView';
import ScoreDigitizerStudio from '../scores/ScoreDigitizerStudio';
import { scoresApi } from '../../services/scoresApi';
import { SAMPLE_SONGS_DATA } from '../../data/sampleSongs';
import useSetlistManager from '../../hooks/useSetlistManager';
import {
  BookOpen,
  Crown,
  Zap,
  ShieldCheck,
  LogOut,
  Music2,
  FileText,
  Music,
  Database
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth, TIERS } from '../../context/AuthContext';

/**
 * NotebookSpread Component
 * Master dual-page analog notebook spread controller with 3D page flip animation,
 * authentication gating, setlists and favorites panels, and song sheet view.
 */
export default function NotebookSpread({ onNavigateDev }) {
  const { t } = useLanguage();
  const { currentUser, login, logout, toggleTier, openUpgradeModal, isPro, isAdmin } = useAuth();

  const [activeAuthTab, setActiveAuthTab] = useState('login');
  const [selectedSong, setSelectedSong] = useState(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isPageFlipping, setIsPageFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('forward');
  const [isDigitizerOpen, setIsDigitizerOpen] = useState(false);
  const [digitizerTarget, setDigitizerTarget] = useState(null);

  // Sección del cuaderno: 'songs' (Cancionero) | 'scores' (Partituras & Tabs)
  const [notebookSection, setNotebookSection] = useState('songs');
  const [activeScoreData, setActiveScoreData] = useState(null);
  const [savedScores, setSavedScores] = useState([]);
  const [isLoadingScore, setIsLoadingScore] = useState(false);

  // Cargar partituras guardadas
  React.useEffect(() => {
    if (currentUser) {
      scoresApi.getSavedScores().then(setSavedScores).catch(() => {});
    }
  }, [currentUser]);

  const handleSelectScore = async (scoreInfo) => {
    setIsLoadingScore(true);
    try {
      if (scoreInfo.type === 'tango_archive' || scoreInfo.source === 'TodoTango') {
        const tangoData = await scoresApi.getTangoScore(scoreInfo.tangoId || scoreInfo.id);
        setActiveScoreData(tangoData);
      } else if (scoreInfo.scoreBuffer || scoreInfo.musicXml) {
        setActiveScoreData(scoreInfo);
      } else if (scoreInfo.songsterrId) {
        const fullScore = await scoresApi.getSongsterrScore(scoreInfo.songsterrId, scoreInfo.defaultTrack);
        setActiveScoreData(fullScore);
      } else {
        setActiveScoreData(scoreInfo);
      }
    } catch (err) {
      console.error('Error al cargar partitura:', err);
      alert('No se pudo cargar la partitura seleccionada.');
    } finally {
      setIsLoadingScore(false);
    }
  };

  const handleSwitchScorePart = async (partId) => {
    if (!activeScoreData) return;
    if (!activeScoreData.songId) {
      setActiveScoreData(prev => ({
        ...prev,
        activePartId: partId,
      }));
      return;
    }
    try {
      const updated = await scoresApi.switchPart(activeScoreData.songId, partId, {
        revisionId: activeScoreData.revisionId,
        image: activeScoreData.image,
        title: activeScoreData.title,
        artist: activeScoreData.artist
      });
      setActiveScoreData(prev => ({
        ...prev,
        activePartId: partId,
        activePartName: updated.name,
        activeTuning: updated.tuning,
        capo: updated.capo,
        measuresCount: updated.measuresCount,
        alphaTex: updated.alphaTex,
        partData: updated.partData
      }));
    } catch (err) {
      console.error('Error al cambiar de pista en partitura:', err);
    }
  };

  const handleSaveActiveScore = async () => {
    if (!activeScoreData) return;
    try {
      await scoresApi.saveScoreToLibrary({
        songsterrId: activeScoreData.songId,
        title: activeScoreData.title,
        artist: activeScoreData.artist,
        defaultTrack: activeScoreData.activePartId,
        tracks: activeScoreData.tracks,
        songData: activeScoreData.partData
      });
      const updated = await scoresApi.getSavedScores();
      setSavedScores(updated);
    } catch (err) {
      console.error('Error al guardar partitura en biblioteca:', err);
    }
  };

  const handleDeleteSavedScore = async (id) => {
    try {
      await scoresApi.removeScoreFromLibrary(id);
      const updated = await scoresApi.getSavedScores();
      setSavedScores(updated);
      if (activeScoreData?.id === id) {
        setActiveScoreData(null);
      }
    } catch (err) {
      console.error('Error al eliminar partitura:', err);
    }
  };

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
    onSelectSong: (song) => handleOpenSongItem(song),
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
    // Si el ítem es una partitura / tablatura de Songsterr o TodoTango
    const isScore = Boolean(
      songItem?.isScore ||
      songItem?.type === 'score' ||
      songItem?.type === 'tango_archive' ||
      songItem?.songsterrId ||
      songItem?.tangoId ||
      songItem?.content?.startsWith('[SCORE_SHEET]')
    );

    if (isScore) {
      let scoreInfo = songItem;
      if (songItem.content?.startsWith('[SCORE_SHEET]')) {
        try {
          const parsed = JSON.parse(songItem.content.replace('[SCORE_SHEET]', ''));
          scoreInfo = { ...songItem, ...parsed };
        } catch (e) {}
      }
      setSelectedSong(null);
      handleSelectScore(scoreInfo);
      return;
    }

    const baseSample = SAMPLE_SONGS_DATA[songItem.id] || {};
    const fullSongData = { ...baseSample, ...songItem };
    if (fullSongData.id) {
      SAMPLE_SONGS_DATA[String(fullSongData.id)] = fullSongData;
    }
    setActiveScoreData(null);
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
              {currentUser ? `${t.notebookOf || 'Cuaderno de'} ${currentUser.name}` : (t.chordStudio || 'Estudio de Acordes & Canciones')}
            </span>
          </div>
        </div>

        {/* Top Controls: Language Switcher (Always Visible) + Status / Plan Toggle / Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Selector de idiomas universal (siempre visible en todos los estados) */}
          <LanguageSelector />

          {currentUser && (
            <>
              <button
                type="button"
                onClick={toggleTier}
                className={`px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer ${
                  isAdmin
                    ? 'bg-gradient-to-r from-purple-800 to-indigo-800 text-purple-100 border border-purple-500/40 shadow-sm'
                    : isPro
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-stone-800 text-stone-300'
                }`}
                title="Cambiar Rol (Demo): Free / Pro / Admin"
              >
                {isAdmin ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                ) : isPro ? (
                  <Crown className="w-3.5 h-3.5" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>{isAdmin ? 'ADMIN' : isPro ? 'PRO' : 'FREE'}</span>
              </button>

              {isAdmin && onNavigateDev && (
                <button
                  type="button"
                  onClick={onNavigateDev}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  title="Abrir consola de base de datos /dev"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>DEV DB</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleLogoutClick}
                disabled={isPageFlipping}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-stone-900/85 hover:bg-stone-800 text-stone-300 hover:text-white rounded-xl border border-stone-700 text-xs font-semibold cursor-pointer transition-colors shadow-sm"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.closeNotebook || 'Cerrar Cuaderno'}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ================= MAIN LARGE NOTEBOOK SPREAD ================= */}
      <main className="relative w-full max-w-[1560px] my-auto z-10 py-1">
        <div className="absolute inset-3 bg-black/75 rounded-3xl blur-3xl -z-10 pointer-events-none" />

        <div
          className={`relative bg-[#271d17] p-2 sm:p-3.5 lg:p-4 rounded-2xl sm:rounded-3xl shadow-2xl border border-[#44332a] flex flex-col ${
            (activeScoreData || isLoadingScore)
              ? 'w-full h-[calc(100vh-115px)] min-h-[580px] max-h-[920px] overflow-hidden'
              : 'md:flex-row min-h-[620px] xl:min-h-[680px] 2xl:min-h-[730px]'
          }`}
          style={{ perspective: 2800 }}
        >
          {/* Index Tabs */}
          {!currentUser ? (
            <NotebookTabs activeTab={activeAuthTab} onTabChange={setActiveAuthTab} mode="auth" />
          ) : (
            <NotebookTabs
              activeTab={notebookSection}
              onTabChange={(tab) => {
                setSelectedSong(null);
                setNotebookSection(tab);
              }}
              mode="musician"
            />
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
          ) : (activeScoreData || isLoadingScore) ? (
            /* HOJA BLANCA QUE OCUPA TODO EL ANCHO DEL CUADERNO (ATRIL / IMPRESIÓN) */
            <ScoreStandView
              scoreData={activeScoreData}
              isLoading={isLoadingScore}
              onBack={() => {
                setActiveScoreData(null);
                setIsLoadingScore(false);
              }}
              onSaveToLibrary={handleSaveActiveScore}
              isSaved={savedScores.some(s => s.songsterrId === activeScoreData?.songId || s.id === activeScoreData?.id)}
              onSwitchPart={handleSwitchScorePart}
              setlists={setlists}
              onAddSongToSetlist={handleAddSongToSetlist}
              setlistContext={setlistContext}
            />
          ) : (
            <>
              {/* ================= LEFT STATIONARY BASE PAGE ================= */}
              <div className="hidden md:flex flex-col justify-between flex-1 bg-[#fcf9f2] rounded-l-2xl shadow-[inset_-10px_0_15px_rgba(0,0,0,0.06)] border-y border-l border-stone-300 overflow-hidden paper-texture p-7 lg:p-9 min-h-[580px] xl:min-h-[640px] 2xl:min-h-[690px] relative z-10">
                <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-stone-900/10 to-transparent pointer-events-none z-10" />

                {!currentUser ? (
                  /* Cover when logged out */
                  <NotebookCover />
                ) : notebookSection === 'scores' ? (
                  /* Panel de búsqueda y catálogo de partituras Songsterr */
                  <ScoresIndexPanel
                    onSelectScore={handleSelectScore}
                    currentScoreId={activeScoreData?.songId}
                    savedScores={savedScores}
                    onRefreshSavedScores={() => scoresApi.getSavedScores().then(setSavedScores)}
                    onDeleteSavedScore={handleDeleteSavedScore}
                  />
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
                  /* Favorites, Songs & Scores Library when logged in */
                  <FavoritesLibraryPanel
                    userSongs={userSongs}
                    onOpenSong={handleOpenSongItem}
                    onToggleFavorite={handleToggleFavorite}
                    activeSetlist={activeSetlist}
                    onAddSongToSetlist={handleAddSongToSetlist}
                    onOpenSearchModal={() => setIsSearchModalOpen(true)}
                    isPro={isPro}
                    onSelectScore={handleSelectScore}
                    savedScores={savedScores}
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
        onScoreSelect={(score) => {
          setIsSearchModalOpen(false);
          handleSelectScore(score);
        }}
        databaseSongs={userSongs}
        onDirectPlaySong={handleOpenSongItem}
      />

      {/* Estudio de Digitalización OMR Split-View Global (Oculto temporalmente) */}
      {/* isDigitizerOpen && (
        <ScoreDigitizerStudio
          initialImage={digitizerTarget?.pageUrl || digitizerTarget?.pages?.[0] || null}
          initialScore={digitizerTarget || null}
          onClose={() => {
            setIsDigitizerOpen(false);
            setDigitizerTarget(null);
          }}
          onSaveToLibrary={async (scorePayload) => {
            const saved = await scoresApi.saveScoreToLibrary(scorePayload);
            const updated = await scoresApi.getSavedScores();
            setSavedScores(updated);
            return saved;
          }}
          onLoadIntoStand={(digitizedScore) => {
            handleSelectScore(digitizedScore);
            setIsDigitizerOpen(false);
            setDigitizerTarget(null);
          }}
        />
      ) */}

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
