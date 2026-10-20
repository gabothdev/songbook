import React from 'react';
import {
  Play,
  Pause,
  Square,
  Repeat,
  Gauge,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Radio,
} from 'lucide-react';

function formatTime(ms) {
  if (!ms || ms < 0 || isNaN(ms)) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export default function ScorePlaybackBar({
  isPlaying,
  isAudioHistoricalPlaying,
  onPlayPause,
  onStop,
  currentTimeMs,
  totalTimeMs,
  currentBar,
  isTangoArchive,
  audioCurrentTime,
  audioDuration,
  effectiveScore,
  activeRecordingIndex,
  onSelectRecording,
  audioHistoricalRef,
  playbackSpeed,
  onSpeedChange,
  isLooping,
  onToggleLoop,
  isMetronomeActive,
  onToggleMetronome,
  staveProfile,
  onStaveProfileChange,
  zoomScale,
  onZoomChange,
  tangoZoom,
  onTangoZoomChange,
}) {
  return (
    <div className="flex-shrink-0 bg-stone-900 text-stone-100 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 shadow-md z-20 print:hidden">
      {/* Play / Pause / Stop */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPlayPause}
          className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center transition shadow-md cursor-pointer flex-shrink-0"
          title={isPlaying || isAudioHistoricalPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying || isAudioHistoricalPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={onStop}
          className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition cursor-pointer flex-shrink-0"
          title="Detener y volver al inicio"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Tiempo y Compás */}
        <div className="font-mono text-xs text-stone-300 ml-2">
          {isTangoArchive ? (
            <span>{formatTime(audioCurrentTime * 1000)} / {formatTime(audioDuration * 1000)}</span>
          ) : (
            <>
              <span className="text-amber-300 font-bold">{formatTime(currentTimeMs)}</span>
              <span className="text-stone-500"> / </span>
              <span className="text-stone-400">{formatTime(totalTimeMs)}</span>
              <span className="ml-2 text-stone-400 font-sans text-[11px]">
                (Compás <strong className="text-stone-200 font-mono">{currentBar}</strong>)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Grabación Histórica de Tango si aplica */}
      {isTangoArchive && effectiveScore?.recordings?.length > 0 && (
        <div className="flex items-center gap-2 bg-stone-800/90 px-3 py-1 rounded-xl border border-stone-700 text-xs">
          <Radio className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
          <select
            value={activeRecordingIndex}
            onChange={(e) => onSelectRecording(Number(e.target.value))}
            className="bg-transparent text-stone-200 font-sans text-xs focus:outline-hidden cursor-pointer max-w-[200px] truncate"
          >
            {effectiveScore.recordings.map((rec, i) => (
              <option key={i} value={i} className="bg-stone-900 text-stone-200">
                {rec.formation || rec.title} ({rec.details || rec.duration})
              </option>
            ))}
          </select>
          <audio
            ref={audioHistoricalRef}
            src={effectiveScore.recordings[activeRecordingIndex]?.mp3}
          />
        </div>
      )}

      {/* Velocidad, Bucle, Metrónomo y Vistas */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {!isTangoArchive && (
          <>
            {/* Velocidad de Reproducción */}
            <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-0.5 border border-stone-700">
              {[0.75, 1.0, 1.25].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => onSpeedChange(speed)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                    playbackSpeed === speed
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'text-stone-300 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            {/* Bucle */}
            <button
              type="button"
              onClick={onToggleLoop}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isLooping
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-white'
              }`}
              title={isLooping ? 'Desactivar bucle' : 'Repetir en bucle'}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            {/* Metrónomo */}
            <button
              type="button"
              onClick={onToggleMetronome}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isMetronomeActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-stone-800 text-stone-400 border-stone-700 hover:text-white'
              }`}
              title={isMetronomeActive ? 'Silenciar metrónomo' : 'Activar clic de metrónomo'}
            >
              <Gauge className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-px bg-stone-700 mx-1" />

            {/* Modo de Vista: Tab vs Pentagrama vs Ambos */}
            <div className="flex items-center bg-stone-800 rounded-lg p-0.5 border border-stone-700">
              <button
                type="button"
                onClick={() => onStaveProfileChange('tab')}
                className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                  staveProfile === 'tab' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
                }`}
                title="Mostrar solo tablatura"
              >
                Tab
              </button>
              <button
                type="button"
                onClick={() => onStaveProfileChange('score')}
                className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                  staveProfile === 'score' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
                }`}
                title="Mostrar solo pentagrama clásico (ideal para Bandoneón y Piano)"
              >
                Notas
              </button>
              <button
                type="button"
                onClick={() => onStaveProfileChange('default')}
                className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                  staveProfile === 'default' ? 'bg-amber-500 text-stone-950 font-bold' : 'text-stone-300 hover:text-white'
                }`}
                title="Mostrar tablatura y pentagrama juntos"
              >
                Ambos
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-0.5 border border-stone-700">
              <button
                type="button"
                onClick={() => onZoomChange(Math.max(0.7, zoomScale - 0.1))}
                className="p-1 text-stone-300 hover:text-white transition cursor-pointer"
                title="Reducir tamaño"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="font-mono text-[10px] text-stone-400 px-1">
                {Math.round(zoomScale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => onZoomChange(Math.min(1.5, zoomScale + 0.1))}
                className="p-1 text-stone-300 hover:text-white transition cursor-pointer"
                title="Aumentar tamaño"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          </>
        )}

        {/* Controles de Zoom para Modo Tango Histórico */}
        {isTangoArchive && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-stone-800 rounded-lg p-0.5 border border-stone-700">
              <button
                type="button"
                onClick={() => onTangoZoomChange(Math.max(60, tangoZoom - 15))}
                className="p-1 text-stone-300 hover:text-white transition cursor-pointer"
                title="Reducir"
              >
                <ZoomOut className="w-3 h-3" />
              </button>
              <span className="font-mono text-[10px] text-stone-400 px-1">
                {tangoZoom}%
              </span>
              <button
                type="button"
                onClick={() => onTangoZoomChange(Math.min(180, tangoZoom + 15))}
                className="p-1 text-stone-300 hover:text-white transition cursor-pointer"
                title="Aumentar"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onTangoZoomChange(100)}
                className="p-1 text-stone-300 hover:text-white transition cursor-pointer text-[10px] font-mono"
                title="Resetear al 100%"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
