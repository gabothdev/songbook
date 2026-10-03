import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ArtistPolaroid from './ArtistPolaroid';
import SongReleaseArtifact from './SongReleaseArtifact';
import MemorabiliaImageModal from './MemorabiliaImageModal';
import { autoDiscoverSongMemorabilia } from '../../services/artworkService';
import { updateArtistImage } from '../../services/persistenceApi';
import { useAuth } from '../../context/AuthContext';
import { X, Camera, Disc, Ticket, Film, Radio, Lock, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * SongMemorabiliaDesk Component
 * 
 * Recreates the analog desk interaction sketched by the user:
 * 1. IDLE: The Polaroid(s) and CD appear tucked behind the left page of the notebook,
 *    peeking out by ~50% onto the desk surface. If there are multiple artists,
 *    the Polaroids are rendered as a tactile fanned stack with slight physical rotations.
 * 2. CLICK: The clicked item slides smoothly to the LEFT to clear the notebook edge,
 *    elevates its z-index in front of the page, and then glides to the RIGHT onto
 *    the open notebook page, scaling up into a large prominent view.
 * 3. EXPANDED MULTI-ARTIST: Displays navigation arrows and indicators to flick through
 *    each artist's individual Polaroid, photo, and handwritten name.
 * 4. CLOSE: Clicking the 'X' button reverses the choreography: slides back to the
 *    left, drops behind the notebook, and slides back right into its tucked position.
 */
export default function SongMemorabiliaDesk({
  song,
  onUpdateSongImages = null,
}) {
  const { isAdmin } = useAuth();

  // Normalize and order artists array: the first artist mentioned in song.title / song.artist is ALWAYS #0 (top of the pile)
  const artists = useMemo(() => {
    let list = [];
    if (Array.isArray(song?.artists) && song.artists.length > 0) {
      list = song.artists.map((a, idx) => ({
        id: a.id || `artist-${idx}`,
        name: a.name || 'Artista',
        image: a.image || null,
        bio: a.bio || '',
      }));
    } else if (song?.artist && typeof song.artist === 'string') {
      const parts = song.artist.split(/,\s*|\s*\/\s*/).map((p) => p.trim()).filter(Boolean);
      list = parts.map((name, idx) => ({
        id: `parsed-${idx}`,
        name,
        image: null,
      }));
    } else {
      list = [
        {
          id: 'default',
          name: song?.artist || 'Artista',
          image: song?.artistImage || null,
        },
      ];
    }

    const titleStr = (song?.title || '').toLowerCase();
    const artistStr = (song?.artist || '').toLowerCase();

    // Scoring function: lowest score appears first (first in title or artist header)
    const getOrderScore = (artistName) => {
      const name = (artistName || '').toLowerCase().trim();
      if (!name) return 9999;

      // 1. Exact match in title (e.g. "Artista - Título" or "Título feat. Artista")
      const titlePos = titleStr.indexOf(name);
      if (titlePos !== -1) {
        return titlePos;
      }

      // 2. Exact match in artist header string (ordered comma-separated list)
      const artistPos = artistStr.indexOf(name);
      if (artistPos !== -1) {
        return 1000 + artistPos;
      }

      // 3. Sub-word match for partial names
      const words = name.split(/\s+/).filter((w) => w.length > 2);
      for (const w of words) {
        const tw = titleStr.indexOf(w);
        if (tw !== -1) return 500 + tw;
        const aw = artistStr.indexOf(w);
        if (aw !== -1) return 1500 + aw;
      }

      return 9999;
    };

    list.sort((a, b) => getOrderScore(a.name) - getOrderScore(b.name));

    // If first artist has no image yet, use song.artistImage as fallback
    if (list.length > 0 && !list[0].image && song?.artistImage) {
      list[0].image = song.artistImage;
    }

    return list;
  }, [song?.artists, song?.artist, song?.title, song?.artistImage]);

  // Active artist index when browsing the stacked Polaroids
  const [activeArtistIndex, setActiveArtistIndex] = useState(0);

  // Map of photos per artist: { [artistIdOrName]: imageUrl }
  const [artistImages, setArtistImages] = useState({});
  const [albumCover, setAlbumCover] = useState(song.albumCover || null);
  const [versionType, setVersionType] = useState(song.versionType || 'studio');
  const [album, setAlbum] = useState(song.album || '');
  const [releaseYear, setReleaseYear] = useState(song.releaseYear || null);
  const [versionDetails, setVersionDetails] = useState(song.versionDetails || '');

  // Active expanded item: null | 'polaroid' | 'disc'
  const [activeItem, setActiveItem] = useState(null);
  // Animation phase: 'idle' | 'pulling_out' | 'sliding_in' | 'expanded' | 'closing_out' | 'tucking_back'
  const [animPhase, setAnimPhase] = useState('idle');

  // Modal to upload / search images (admin only)
  const [activeModalType, setActiveModalType] = useState(null);
  const [adminNotice, setAdminNotice] = useState(null);

  // Reset active artist when song changes
  useEffect(() => {
    setActiveArtistIndex(0);
  }, [song.id]);

  // Initialize and synchronize artist images map & album cover
  useEffect(() => {
    const map = {};
    artists.forEach((a, idx) => {
      map[a.id || a.name] = a.image || (idx === 0 ? (song.artistImage || null) : null);
    });
    setArtistImages(map);
    setAlbumCover(song.albumCover || null);
    setVersionType(song.versionType || 'studio');
    setAlbum(song.album || '');
    setReleaseYear(song.releaseYear || null);
    setVersionDetails(song.versionDetails || '');

    // Auto-discover album cover if missing
    let isMounted = true;
    if (!song.albumCover) {
      autoDiscoverSongMemorabilia({
        artist: song.artist,
        title: song.title,
        youtubeId: song.youtubeId,
      }).then((discovered) => {
        if (!isMounted) return;
        if (discovered.albumCover) {
          setAlbumCover(discovered.albumCover);
          if (onUpdateSongImages) {
            onUpdateSongImages({ albumCover: discovered.albumCover });
          }
        }
      });
    }

    // Auto-discover photos for any artist lacking one
    artists.forEach((a, idx) => {
      const currentPhoto = map[a.id || a.name];
      if (!currentPhoto && a.name) {
        autoDiscoverSongMemorabilia({
          artist: a.name,
          title: idx === 0 ? song.title : '',
          youtubeId: idx === 0 ? song.youtubeId : '',
        }).then((discovered) => {
          if (!isMounted || !discovered.artistImage) return;
          setArtistImages((prev) => ({
            ...prev,
            [a.id || a.name]: discovered.artistImage,
          }));
          const cleanId = a.id && !a.id.startsWith('parsed-') && !a.id.startsWith('artist-') && a.id !== 'default'
            ? a.id
            : undefined;
          if (a.name) {
            updateArtistImage({ id: cleanId, name: a.name, image: discovered.artistImage });
          }
          if (idx === 0 && onUpdateSongImages) {
            onUpdateSongImages({ artistImage: discovered.artistImage });
          }
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [song.id, song.artist, song.title, song.youtubeId, artists, song.artistImage, song.albumCover]);

  // Keyboard navigation for closing (Escape) and flicking Polaroids (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && activeItem && animPhase === 'expanded') {
        handleCloseItem();
      } else if (activeItem === 'polaroid' && animPhase === 'expanded' && artists.length > 1) {
        if (e.key === 'ArrowLeft') {
          setActiveArtistIndex((prev) => (prev > 0 ? prev - 1 : artists.length - 1));
        } else if (e.key === 'ArrowRight') {
          setActiveArtistIndex((prev) => (prev < artists.length - 1 ? prev + 1 : 0));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeItem, animPhase, artists.length]);

  // ================= TWO-PHASE EXPANSION SEQUENCE =================
  const handleOpenItem = (itemType) => {
    if (animPhase !== 'idle') return;

    setActiveItem(itemType);
    setAnimPhase('pulling_out');

    // Phase 1: Slide left to clear the notebook edge (320ms)
    setTimeout(() => {
      // Phase 2: Bring to front and glide right onto the notebook page (460ms)
      setAnimPhase('sliding_in');
      setTimeout(() => {
        setAnimPhase('expanded');
      }, 460);
    }, 320);
  };

  // ================= TWO-PHASE CLOSE SEQUENCE =================
  const handleCloseItem = () => {
    if (animPhase !== 'expanded') return;

    setAnimPhase('closing_out');

    // Phase 1: Slide left to clear the notebook edge (350ms)
    setTimeout(() => {
      // Phase 2: Send behind the notebook and tuck back in (320ms)
      setAnimPhase('tucking_back');
      setTimeout(() => {
        setAnimPhase('idle');
        setActiveItem(null);
        setActiveArtistIndex(0); // Always reset to primary artist #0 on close
      }, 320);
    }, 350);
  };

  // Active artist object and current photo
  const currentArtist = artists[activeArtistIndex] || artists[0] || { name: song.artist || 'Artista' };
  const currentArtistImage = artistImages[currentArtist.id || currentArtist.name] || currentArtist.image || null;

  // The displayed artist on the front card: in idle mode, it is ALWAYS the primary artist (#0)
  const displayedArtist = (animPhase === 'idle' || activeItem !== 'polaroid')
    ? (artists[0] || currentArtist)
    : currentArtist;
  const displayedImage = artistImages[displayedArtist?.id || displayedArtist?.name] || displayedArtist?.image || null;

  const handleSaveImage = async (newUrl) => {
    if (!isAdmin) return;
    if (activeModalType === 'artist') {
      const target = currentArtist;
      setArtistImages((prev) => ({
        ...prev,
        [target.id || target.name]: newUrl,
      }));

      try {
        const cleanId = target.id && !target.id.startsWith('parsed-') && !target.id.startsWith('artist-') && target.id !== 'default'
          ? target.id
          : undefined;

        await updateArtistImage({
          id: cleanId,
          name: target.name,
          image: newUrl,
        });
      } catch (err) {
        console.warn('Error updating artist photo in DB:', err);
      }

      if (onUpdateSongImages) {
        onUpdateSongImages({ artistImage: newUrl });
      }

      setAdminNotice(`Foto de ${target.name} guardada en su perfil`);
      setTimeout(() => setAdminNotice(null), 3000);
    } else if (activeModalType === 'disc') {
      const coverUrl = typeof newUrl === 'object' && newUrl !== null ? newUrl.framedString || newUrl.url : newUrl;
      const meta = typeof newUrl === 'object' && newUrl !== null ? newUrl : {};

      setAlbumCover(coverUrl);
      if (meta.versionType) setVersionType(meta.versionType);
      if (meta.album !== undefined) setAlbum(meta.album || '');
      if (meta.releaseYear !== undefined) setReleaseYear(meta.releaseYear);
      if (meta.versionDetails !== undefined) setVersionDetails(meta.versionDetails || '');

      if (onUpdateSongImages) {
        onUpdateSongImages({
          albumCover: coverUrl,
          ...(meta.versionType ? { versionType: meta.versionType } : {}),
          ...(meta.album !== undefined ? { album: meta.album } : {}),
          ...(meta.releaseYear !== undefined ? { releaseYear: meta.releaseYear } : {}),
          ...(meta.versionDetails !== undefined ? { versionDetails: meta.versionDetails } : {}),
        });
      }
      setAdminNotice('Metadatos y carátula guardados');
      setTimeout(() => setAdminNotice(null), 3000);
    }
  };

  // ================= COORDINATES & KINEMATICS =================
  // POLAROID
  let polX = -95;
  let polY = 0;
  let polScale = 1;
  let polRotate = -6;
  let polZIndex = 10; // Top of the pile in idle mode!

  if (activeItem === 'polaroid') {
    if (animPhase === 'pulling_out') {
      polX = -230;
      polY = 0;
      polScale = 1;
      polRotate = -2;
      polZIndex = 30;
    } else if (animPhase === 'sliding_in' || animPhase === 'expanded') {
      polX = 270;
      polY = 50;
      polScale = 1.85;
      polRotate = 0;
      polZIndex = 50;
    } else if (animPhase === 'closing_out') {
      polX = -230;
      polY = 0;
      polScale = 1;
      polRotate = -2;
      polZIndex = 50;
    } else if (animPhase === 'tucking_back') {
      polX = -95;
      polY = 0;
      polScale = 1;
      polRotate = -6;
      polZIndex = 10;
    }
  }

  // COMPACT DISC
  let cdX = -90;
  let cdY = 0;
  let cdScale = 1;
  let cdRotate = 5;
  let cdZIndex = 0;

  if (activeItem === 'disc') {
    if (animPhase === 'pulling_out') {
      cdX = -230;
      cdY = 0;
      cdScale = 1;
      cdRotate = 2;
      cdZIndex = 0;
    } else if (animPhase === 'sliding_in' || animPhase === 'expanded') {
      cdX = 270;
      cdY = -90;
      cdScale = 1.85;
      cdRotate = 0;
      cdZIndex = 50;
    } else if (animPhase === 'closing_out') {
      cdX = -230;
      cdY = 0;
      cdScale = 1;
      cdRotate = 2;
      cdZIndex = 50;
    } else if (animPhase === 'tucking_back') {
      cdX = -90;
      cdY = 0;
      cdScale = 1;
      cdRotate = 5;
      cdZIndex = 0;
    }
  }

  const isTransitioning = animPhase === 'pulling_out' || animPhase === 'sliding_in' || animPhase === 'closing_out' || animPhase === 'tucking_back';

  return (
    <>
      {/* Admin Notice Toast */}
      <AnimatePresence>
        {adminNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] bg-stone-900/95 backdrop-blur-md text-amber-200 px-4 py-2.5 rounded-2xl shadow-2xl border border-purple-500/50 text-xs font-sans font-bold flex items-center gap-2.5 pointer-events-none"
          >
            <Lock className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>{adminNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dimmed backdrop when an item is expanded in front of the page */}
      {animPhase === 'expanded' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.25 }}
          exit={{ opacity: 0 }}
          onClick={handleCloseItem}
          className="absolute inset-0 bg-black z-30 pointer-events-auto rounded-2xl"
        />
      )}

      {/* ================= 1. ARTIST POLAROID(S) ================= */}
      {/* Background stacked Polaroids when tucked in idle state */}
      {animPhase === 'idle' &&
        artists.slice(1, 3).map((bgArtist, bgOffset) => {
          const stackIdx = bgOffset + 1;
          const rot = stackIdx === 1 ? -13 : -20;
          const offX = stackIdx === 1 ? -86 : -76;
          const offY = stackIdx * 6;
          const bgImg =
            artistImages[bgArtist.id || bgArtist.name] || bgArtist.image || null;

          return (
            <motion.div
              key={bgArtist.id || bgArtist.name || bgOffset}
              initial={false}
              animate={{
                x: offX,
                y: offY,
                rotate: rot,
                scale: 0.98 - bgOffset * 0.02,
              }}
              whileHover={{
                x: offX - 12,
                rotate: rot - 4,
                transition: { duration: 0.2 },
              }}
              className="absolute left-0 top-20 sm:top-24 w-[175px] sm:w-[185px] select-none cursor-pointer origin-center pointer-events-auto"
              style={{ zIndex: 10 - stackIdx * 2 }}
              onClick={() => handleOpenItem('polaroid')}
              title={`Pila de fotos: ${artists.map((a) => a.name).join(', ')}`}
            >
              <ArtistPolaroid
                artistImage={bgImg}
                artistName={bgArtist.name}
                songTitle={song.title}
                canEdit={false}
                isHoverable={false}
              />
            </motion.div>
          );
        })}

      {/* Main Front / Expanded Polaroid */}
      {/* Anchored at left-0 of the notebook, positioned vertically around top-24 */}
      <motion.div
        animate={{
          x: polX,
          y: polY,
          scale: polScale,
          rotate: polRotate,
          zIndex: polZIndex,
        }}
        transition={{
          duration:
            animPhase === 'pulling_out' || animPhase === 'tucking_back'
              ? 0.32
              : animPhase === 'sliding_in'
              ? 0.46
              : animPhase === 'closing_out'
              ? 0.35
              : 0.25,
          ease:
            animPhase === 'sliding_in'
              ? [0.22, 1, 0.36, 1]
              : animPhase === 'pulling_out' || animPhase === 'closing_out'
              ? [0.32, 0, 0.67, 0]
              : 'easeInOut',
        }}
        whileHover={
          animPhase === 'idle' && activeItem === null
            ? { x: -110, rotate: -4, transition: { duration: 0.2 } }
            : {}
        }
        className={`absolute left-0 top-20 sm:top-24 w-[175px] sm:w-[185px] select-none pointer-events-auto origin-center ${
          animPhase === 'idle' ? 'cursor-pointer' : ''
        }`}
        style={{ zIndex: polZIndex }}
        onClick={() => {
          if (animPhase === 'idle') {
            handleOpenItem('polaroid');
          }
        }}
      >
        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={displayedArtist?.id || displayedArtist?.name || activeArtistIndex}
              initial={animPhase === 'expanded' ? { opacity: 0.7, scale: 0.98 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0.7, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <ArtistPolaroid
                artistImage={displayedImage}
                artistName={displayedArtist?.name}
                songTitle={song.title}
                canEdit={false} // Edit is handled via button in expanded view
                isHoverable={animPhase === 'idle'}
              />
            </motion.div>
          </AnimatePresence>

          {/* Close 'X' Button on top-right of expanded Polaroid (as sketched) */}
          {animPhase === 'expanded' && activeItem === 'polaroid' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseItem();
              }}
              className="absolute -top-3.5 -right-3.5 w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center shadow-2xl border-2 border-stone-900 transition-all hover:scale-110 cursor-pointer z-50 animate-fade-in"
              title="Cerrar y guardar detrás del cuaderno"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}

          {/* Left Arrow: Previous Artist */}
          {animPhase === 'expanded' && activeItem === 'polaroid' && artists.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveArtistIndex((prev) => (prev > 0 ? prev - 1 : artists.length - 1));
              }}
              className="absolute -left-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-stone-900/90 hover:bg-stone-900 text-amber-200 hover:text-amber-100 flex items-center justify-center shadow-2xl border border-amber-500/50 transition-all hover:scale-110 cursor-pointer z-50 animate-fade-in"
              title="Foto del artista anterior (←)"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          {/* Right Arrow: Next Artist */}
          {animPhase === 'expanded' && activeItem === 'polaroid' && artists.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveArtistIndex((prev) => (prev < artists.length - 1 ? prev + 1 : 0));
              }}
              className="absolute -right-6 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-stone-900/90 hover:bg-stone-900 text-amber-200 hover:text-amber-100 flex items-center justify-center shadow-2xl border border-amber-500/50 transition-all hover:scale-110 cursor-pointer z-50 animate-fade-in"
              title="Foto del siguiente artista (→)"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          {/* Multi-Artist Pagination Dots & Indicator */}
          {animPhase === 'expanded' && activeItem === 'polaroid' && artists.length > 1 && (
            <div className="absolute inset-x-0 -bottom-6 flex items-center justify-center gap-1.5 z-50 pointer-events-auto animate-fade-in">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/85 backdrop-blur-sm border border-amber-500/30 shadow-md">
                {artists.map((a, i) => (
                  <button
                    key={a.id || a.name || i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveArtistIndex(i);
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      i === activeArtistIndex ? 'w-4 bg-amber-400' : 'w-1.5 bg-stone-500 hover:bg-stone-400'
                    }`}
                    title={a.name}
                  />
                ))}
                <span className="text-[9px] font-sans font-bold text-amber-200 ml-1">
                  {activeArtistIndex + 1}/{artists.length}
                </span>
              </div>
            </div>
          )}

          {/* Admin Edit Button when expanded in front of page */}
          {animPhase === 'expanded' && activeItem === 'polaroid' && isAdmin && (
            <div className={`absolute inset-x-0 ${artists.length > 1 ? '-bottom-14' : '-bottom-10'} flex justify-center z-50 animate-fade-in`}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModalType('artist');
                }}
                className="px-3.5 py-1.5 bg-stone-900/95 hover:bg-black text-amber-200 text-xs font-bold font-sans rounded-xl border border-amber-400/50 shadow-2xl backdrop-blur-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span>{artists.length > 1 ? `Cambiar Foto de ${currentArtist.name}` : 'Cambiar Foto del Artista'}</span>
              </button>
            </div>
          )}

          {/* Peeking invite badge when tucked */}
          {animPhase === 'idle' && (
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full pr-2 opacity-0 hover:opacity-100 transition-opacity pointer-events-none hidden xl:block">
              <span className="px-2 py-0.5 bg-stone-900/90 text-amber-200 text-[10px] font-sans font-bold rounded-md whitespace-nowrap shadow border border-amber-500/30">
                {artists.length > 1 ? `Ver Fotos (${artists.length})` : 'Ver Foto'}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ================= 2. ALBUM CD CASE ================= */}
      {/* Anchored at left-0 of the notebook, positioned vertically around top-[340px] */}
      <motion.div
        animate={{
          x: cdX,
          y: cdY,
          scale: cdScale,
          rotate: cdRotate,
          zIndex: cdZIndex,
        }}
        transition={{
          duration:
            animPhase === 'pulling_out' || animPhase === 'tucking_back'
              ? 0.32
              : animPhase === 'sliding_in'
              ? 0.46
              : animPhase === 'closing_out'
              ? 0.35
              : 0.25,
          ease:
            animPhase === 'sliding_in'
              ? [0.22, 1, 0.36, 1]
              : animPhase === 'pulling_out' || animPhase === 'closing_out'
              ? [0.32, 0, 0.67, 0]
              : 'easeInOut',
        }}
        whileHover={
          animPhase === 'idle' && activeItem === null
            ? { x: -105, rotate: 3, transition: { duration: 0.2 } }
            : {}
        }
        className={`absolute left-0 top-[310px] sm:top-[350px] w-[180px] sm:w-[190px] select-none pointer-events-auto origin-center ${
          animPhase === 'idle' ? 'cursor-pointer' : ''
        }`}
        style={{ zIndex: cdZIndex }}
        onClick={() => {
          if (animPhase === 'idle') {
            handleOpenItem('disc');
          }
        }}
      >
        <div className="relative">
          <SongReleaseArtifact
            versionType={versionType || song.versionType || 'studio'}
            albumCover={albumCover}
            artistName={song.artist}
            songTitle={song.title}
            albumName={album || song.album || ''}
            releaseYear={releaseYear || song.releaseYear || null}
            versionDetails={versionDetails || song.versionDetails || ''}
            canEdit={false} // Edit is handled via button in expanded view
            isHoverable={animPhase === 'idle'}
          />

          {/* Close 'X' Button on top-right of expanded artifact (as sketched) */}
          {animPhase === 'expanded' && activeItem === 'disc' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCloseItem();
              }}
              className="absolute -top-3.5 -right-3.5 w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center shadow-2xl border-2 border-stone-900 transition-all hover:scale-110 cursor-pointer z-50 animate-fade-in"
              title="Cerrar y guardar detrás del cuaderno"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}

          {/* Admin Edit Button when expanded in front of page */}
          {animPhase === 'expanded' && activeItem === 'disc' && isAdmin && (
            <div className="absolute inset-x-0 -bottom-10 flex justify-center z-50 animate-fade-in">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveModalType('disc');
                }}
                className="px-3.5 py-1.5 bg-stone-900/95 hover:bg-black text-amber-200 text-xs font-bold font-sans rounded-xl border border-amber-400/50 shadow-2xl backdrop-blur-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
              >
                {versionType === 'live' ? (
                  <>
                    <Ticket className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cambiar Entrada / Foto En Vivo</span>
                  </>
                ) : versionType === 'soundtrack' ? (
                  <>
                    <Film className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cambiar Fotograma / Película</span>
                  </>
                ) : versionType === 'session' ? (
                  <>
                    <Radio className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cambiar Foto de Sesión</span>
                  </>
                ) : (
                  <>
                    <Disc className="w-3.5 h-3.5 text-amber-400" />
                    <span>Cambiar Carátula del Disco</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Peeking invite badge when tucked */}
          {animPhase === 'idle' && (
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 -translate-x-full pr-2 opacity-0 hover:opacity-100 transition-opacity pointer-events-none hidden xl:block">
              <span className="px-2 py-0.5 bg-stone-900/90 text-amber-200 text-[10px] font-sans font-bold rounded-md whitespace-nowrap shadow border border-amber-500/30">
                {versionType === 'live'
                  ? 'Ver Entrada'
                  : versionType === 'soundtrack'
                  ? 'Ver Película'
                  : versionType === 'session'
                  ? 'Ver Sesión'
                  : 'Ver Disco'}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* ================= IMAGE SELECTION / UPLOAD MODAL (ADMIN ONLY) ================= */}
      {isAdmin && (
        <MemorabiliaImageModal
          isOpen={Boolean(activeModalType)}
          type={activeModalType || 'artist'}
          currentImage={activeModalType === 'artist' ? currentArtistImage : albumCover}
          artistName={activeModalType === 'artist' ? currentArtist.name : song.artist}
          songTitle={song.title}
          albumName={album || song.album || ''}
          releaseYear={releaseYear || song.releaseYear || null}
          versionType={versionType || song.versionType || 'studio'}
          versionDetails={versionDetails || song.versionDetails || ''}
          onClose={() => setActiveModalType(null)}
          onSave={handleSaveImage}
        />
      )}
    </>
  );
}
