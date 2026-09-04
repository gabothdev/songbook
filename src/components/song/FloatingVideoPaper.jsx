import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as Tone from 'tone';
import { Youtube, X, Minimize2, Maximize2, Move } from 'lucide-react';

/**
 * Floating / Pinned Paper Scrap containing the synchronized YouTube Player.
 * Uses the authentic torn grid paper container and the YouTube IFrame API.
 */
export default function FloatingVideoPaper({
  youtubeId,
  songTitle,
  songArtist,
  isVisible = true,
  isMuted = false,
  onClose,
  onTimeUpdate,
  onStateChange,
  onPlayerReady,
}) {
  const [isMinimized, setIsMinimized] = useState(false);
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const playerIdRef = useRef(`yt_player_${Math.random().toString(36).substring(2, 9)}`);

  // Handle muting state when pitch shift is active
  useEffect(() => {
    if (!playerRef.current) return;
    try {
      if (isMuted) {
        playerRef.current.mute();
        playerRef.current.setVolume(0);
      } else {
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
      }
    } catch (e) {}
  }, [isMuted]);

  // Load YouTube IFrame API script once if not already present
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Initialize or re-create YouTube Player when youtubeId changes
  useEffect(() => {
    if (!youtubeId || !isVisible || isMinimized) return;

    let destroyed = false;

    const setupPlayer = () => {
      if (destroyed) return;
      if (!window.YT || !window.YT.Player) {
        setTimeout(setupPlayer, 150);
        return;
      }

      const targetEl = document.getElementById(playerIdRef.current);
      if (!targetEl) {
        setTimeout(setupPlayer, 150);
        return;
      }

      try {
        if (playerRef.current && playerRef.current.destroy) {
          playerRef.current.destroy();
        }

        playerRef.current = new window.YT.Player(playerIdRef.current, {
          videoId: youtubeId,
          playerVars: {
            autoplay: 0,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (isMuted) {
                try {
                  event.target.mute();
                  event.target.setVolume(0);
                } catch (e) {}
              }
              if (onPlayerReady) onPlayerReady(event.target);
            },
            onStateChange: (event) => {
              const state = event.data;
              if (onStateChange) onStateChange(state);

              // If playing (state === 1), emit time update every 80ms for beat synchronization
              if (state === 1) {
                if (intervalRef.current) clearInterval(intervalRef.current);
                intervalRef.current = setInterval(() => {
                  if (playerRef.current && playerRef.current.getCurrentTime && onTimeUpdate) {
                    try {
                      onTimeUpdate(playerRef.current.getCurrentTime());
                    } catch (e) {}
                  }
                }, 80);
              } else {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
              }
            },
          },
        });
      } catch (e) {
        console.warn('Error setting up YouTube player:', e);
      }
    };

    setupPlayer();

    return () => {
      destroyed = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [youtubeId, isVisible, isMinimized]);

  if (!isVisible || !youtubeId) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.08}
      initial={{ opacity: 0, scale: 0.9, y: 30, rotate: 2 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotate: isMinimized ? 0 : 1.5 }}
      exit={{ opacity: 0, scale: 0.85, y: 20 }}
      whileDrag={{ scale: 1.03, cursor: 'grabbing', zIndex: 60 }}
      onPointerDown={() => {
        try {
          if (Tone.context.state !== 'running') {
            Tone.start().then(() => Tone.context.resume());
          }
        } catch (e) {}
      }}
      className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-50 select-none cursor-grab"
      style={{ touchAction: 'none' }}
    >
      {/* Paper Container */}
      <div className="relative w-[320px] sm:w-[380px] md:w-[420px] filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.45)]">
        {/* Background Paper SVG */}
        <img
          src="/white-paper-scrap-01-01.svg"
          alt="Hoja de Papel"
          className="w-full h-auto pointer-events-none select-none"
        />

        {/* Content Nested on the Paper Sheet */}
        <div className="absolute inset-0 pt-7 pb-10 px-5 sm:px-6 flex flex-col justify-between">
          {/* Header bar on paper */}
          <div className="flex items-center justify-between gap-2 mb-1.5 z-10">
            <div className="flex items-center gap-1.5 min-w-0">
              <Youtube className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span className="font-serif font-black text-stone-900 text-xs truncate">
                {songTitle}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(!isMinimized);
                }}
                className="p-1 rounded-md hover:bg-stone-200/80 text-stone-600 transition-colors cursor-pointer"
                title={isMinimized ? 'Expandir video' : 'Minimizar'}
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="p-1 rounded-md hover:bg-stone-200/80 text-stone-600 transition-colors cursor-pointer"
                  title="Cerrar video"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Video container element */}
          {!isMinimized ? (
            <div className="w-full aspect-video rounded-xl overflow-hidden shadow-md bg-black border border-stone-300 relative z-10">
              <div id={playerIdRef.current} className="w-full h-full" />
            </div>
          ) : (
            <div className="py-3 px-3 bg-white/90 rounded-xl border border-stone-300 flex items-center justify-between text-xs font-sans text-stone-700 shadow-sm">
              <span className="truncate font-medium">{songArtist}</span>
              <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                Video en segundo plano
              </span>
            </div>
          )}

          {/* Subtle footer label on torn sheet */}
          <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 pt-1">
            <span className="flex items-center gap-1">
              <Move className="w-2.5 h-2.5" /> Arrastra para mover
            </span>
            <span className="font-serif italic font-bold text-stone-700">Video Sincronizado</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
