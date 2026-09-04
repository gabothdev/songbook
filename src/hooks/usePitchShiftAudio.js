import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { getAudioStreamUrl } from '../services/audioApi';

/**
 * usePitchShiftAudio Hook for SongBook
 * - When transpose === 0: ONLY the original YouTube video audio plays (stream is paused, YouTube is unmuted).
 * - When transpose !== 0: YouTube video is muted and the Tone.PitchShift audio stream plays in the transposed key.
 */
export default function usePitchShiftAudio({
  youtubeId = '',
  transpose = 0,
  isPremium = true,
  playerInstance = null,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [hasAudioStream, setHasAudioStream] = useState(false);
  const [pitchShiftStatus, setPitchShiftStatus] = useState('idle');
  const [pitchShiftMessage, setPitchShiftMessage] = useState(null);

  const audioRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const pitchShiftNodeRef = useRef(null);
  const isInitializedRef = useRef(false);
  const isPlayPendingRef = useRef(false);
  const hasAudioStreamRef = useRef(false);
  const semitonesRef = useRef(0);
  const prevTransposeRef = useRef(transpose);

  const semitones = parseInt(transpose, 10) || 0;
  const isPitchShiftRequested = Boolean(semitones !== 0 && youtubeId);
  const isPitchShiftActive = Boolean(isPitchShiftRequested && hasAudioStream);

  useEffect(() => {
    hasAudioStreamRef.current = hasAudioStream;
  }, [hasAudioStream]);

  useEffect(() => {
    semitonesRef.current = semitones;
  }, [semitones]);

  // Promise-safe Audio Playback
  const safePlay = useCallback(async (audioEl, ytTime) => {
    // Only play stream when pitch shifting is active (semitones !== 0)
    if (!audioEl || !hasAudioStreamRef.current || semitonesRef.current === 0 || audioEl.error) return;
    if (isPlayPendingRef.current) return;

    try {
      if (Tone.context.state !== 'running') {
        await Tone.start();
        await Tone.context.resume();
      }

      if (ytTime !== undefined && ytTime !== null) {
        if (Math.abs(audioEl.currentTime - ytTime) > 0.25) {
          audioEl.currentTime = ytTime;
        }
      }

      isPlayPendingRef.current = true;
      await audioEl.play();
      setIsPlaying(true);
    } catch (e) {
      if (e.name !== 'AbortError' && !e.message?.includes('no supported source')) {
        console.warn('[PitchShift] Play prevented:', e.message);
      }
    } finally {
      isPlayPendingRef.current = false;
    }
  }, []);

  // Promise-safe Audio Pause
  const safePause = useCallback((audioEl) => {
    if (!audioEl || audioEl.paused) return;

    if (isPlayPendingRef.current) {
      setTimeout(() => {
        try {
          if (!audioEl.paused) {
            audioEl.pause();
            setIsPlaying(false);
          }
        } catch (e) {}
      }, 50);
      return;
    }

    try {
      audioEl.pause();
      setIsPlaying(false);
    } catch (e) {}
  }, []);

  // Initialize Web Audio graph
  const initAudioGraph = useCallback(async () => {
    if (!audioRef.current) return;

    try {
      if (Tone.context.state !== 'running') {
        await Tone.start();
        await Tone.context.resume();
      }

      const rawCtx = Tone.getContext().rawContext;

      if (!sourceNodeRef.current) {
        sourceNodeRef.current = rawCtx.createMediaElementSource(audioRef.current);
      }

      if (!pitchShiftNodeRef.current) {
        pitchShiftNodeRef.current = new Tone.PitchShift({
          pitch: semitones,
          windowSize: 0.1,
          delayTime: 0,
          feedback: 0,
          wet: semitones !== 0 ? 1.0 : 0.0,
        });

        Tone.connect(sourceNodeRef.current, pitchShiftNodeRef.current);
        pitchShiftNodeRef.current.toDestination();
      } else {
        pitchShiftNodeRef.current.pitch = semitones;
        pitchShiftNodeRef.current.wet.value = semitones !== 0 ? 1.0 : 0.0;
      }

      isInitializedRef.current = true;
      setIsReady(true);
    } catch (err) {
      console.warn('[PitchShift] Audio graph connected:', err.message);
    }
  }, [semitones]);

  // INSTANTANEOUS PITCH UPDATE & RESTORE ORIGINAL YOUTUBE AUDIO AT 0 SEMITONES
  useEffect(() => {
    if (pitchShiftNodeRef.current) {
      pitchShiftNodeRef.current.pitch = semitones;
      pitchShiftNodeRef.current.wet.value = semitones !== 0 ? 1.0 : 0.0;
    }

    if (semitones === 0) {
      // Restore original YouTube audio completely
      safePause(audioRef.current);
      if (playerInstance?.unMute) {
        try {
          playerInstance.unMute();
          playerInstance.setVolume(100);
        } catch (e) {}
      }
    } else {
      // Pitch shift active: Mute YouTube player so only the transposed stream is heard
      if (playerInstance?.mute && hasAudioStreamRef.current) {
        try {
          playerInstance.mute();
          playerInstance.setVolume(0);
        } catch (e) {}
      }
    }

    if (prevTransposeRef.current !== transpose) {
      prevTransposeRef.current = transpose;

      // Pause video on transpose change
      if (playerInstance?.pauseVideo) {
        try {
          playerInstance.pauseVideo();
        } catch (e) {}
      }

      if (semitones !== 0) {
        const sign = semitones > 0 ? `+${semitones}` : `${semitones}`;
        setPitchShiftStatus('ready');
        setPitchShiftMessage(`✅ Tono ajustado a ${sign} semitonos`);
        const t = setTimeout(() => {
          setPitchShiftStatus('idle');
          setPitchShiftMessage(null);
        }, 2200);
        return () => clearTimeout(t);
      } else {
        setPitchShiftStatus('ready');
        setPitchShiftMessage('✅ Tono original de YouTube (0 semitonos)');
        const t = setTimeout(() => {
          setPitchShiftStatus('idle');
          setPitchShiftMessage(null);
        }, 1800);
        return () => clearTimeout(t);
      }
    }
  }, [semitones, transpose, playerInstance, safePause]);

  // LOAD AUDIO STREAM ONCE PER YOUTUBE VIDEO (Never loops)
  useEffect(() => {
    if (!youtubeId) {
      setHasAudioStream(false);
      hasAudioStreamRef.current = false;
      return;
    }

    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.preload = 'auto';
      audioRef.current = audio;
    }

    const audioEl = audioRef.current;
    const streamUrl = getAudioStreamUrl(youtubeId);
    let retryTimeout = null;
    let isCancelled = false;

    const tryLoadAudio = () => {
      if (isCancelled) return;
      setIsLoadingAudio(true);
      audioEl.src = streamUrl;
      audioEl.load();
    };

    audioEl.oncanplay = async () => {
      if (isCancelled) return;
      setIsLoadingAudio(false);
      setHasAudioStream(true);
      hasAudioStreamRef.current = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      await initAudioGraph();

      // If playing and transposed, start pitch shifted stream
      if (playerInstance?.getPlayerState && playerInstance.getPlayerState() === 1 && semitonesRef.current !== 0) {
        const ytTime = playerInstance.getCurrentTime() || 0;
        safePlay(audioEl, ytTime);
      }
    };

    audioEl.onerror = () => {
      if (isCancelled) return;
      setIsLoadingAudio(false);
      setHasAudioStream(false);
      hasAudioStreamRef.current = false;

      // If audio is downloading in background on server, retry every 3s
      if (semitonesRef.current !== 0) {
        retryTimeout = setTimeout(() => {
          tryLoadAudio();
        }, 3000);
      }

      if (playerInstance?.unMute) {
        try {
          playerInstance.unMute();
          playerInstance.setVolume(100);
        } catch (e) {}
      }
    };

    tryLoadAudio();

    // Heartbeat for continuous video-audio synchronization
    const intervalId = setInterval(() => {
      if (!playerInstance || typeof playerInstance.getPlayerState !== 'function') return;

      try {
        const ytState = playerInstance.getPlayerState();
        const ytTime = playerInstance.getCurrentTime() || 0;

        if (ytState === 1) {
          // YouTube is Playing
          if (semitonesRef.current !== 0 && hasAudioStreamRef.current) {
            // Transposed: Play stream
            if (audioEl.paused && !audioEl.error) {
              safePlay(audioEl, ytTime);
            } else if (Math.abs(audioEl.currentTime - ytTime) > 0.25) {
              audioEl.currentTime = ytTime;
            }
          } else {
            // Transpose is 0: Ensure stream is paused so only YouTube plays
            if (!audioEl.paused) {
              safePause(audioEl);
            }
          }
        } else if (ytState === 2 || ytState === 0) {
          // Paused or Ended
          if (!audioEl.paused) {
            safePause(audioEl);
          }
        }
      } catch (e) {}
    }, 120);

    return () => {
      isCancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      clearInterval(intervalId);
      safePause(audioEl);
    };
  }, [youtubeId, playerInstance, initAudioGraph, safePlay, safePause]);

  // Synchronize Play/Pause with YouTube state event
  const syncPlaybackState = useCallback(
    async (ytState) => {
      const audioEl = audioRef.current;
      if (!audioEl) return;

      if (ytState === 1) {
        if (semitonesRef.current !== 0 && hasAudioStreamRef.current) {
          const ytTime = playerInstance?.getCurrentTime ? playerInstance.getCurrentTime() : 0;
          await safePlay(audioEl, ytTime);
        } else {
          safePause(audioEl);
        }
      } else if (ytState === 2 || ytState === 0) {
        safePause(audioEl);
      }
    },
    [playerInstance, safePlay, safePause]
  );

  // Sync Seek Time with YouTube
  const syncSeekTime = useCallback(
    (targetTime) => {
      const audioEl = audioRef.current;
      if (!audioEl || !hasAudioStreamRef.current || semitonesRef.current === 0) return;
      audioEl.currentTime = targetTime;
    },
    []
  );

  return {
    isPitchShiftActive,
    hasAudioStream,
    isLoadingAudio,
    isPlaying,
    isReady,
    pitchShiftStatus,
    pitchShiftMessage,
    syncPlaybackState,
    syncSeekTime,
  };
}
