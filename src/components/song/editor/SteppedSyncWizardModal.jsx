import React, { useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Sparkles,
  ChevronLeft,
  FileText,
  Clock,
  Layers,
  ArrowRight,
  Tag,
} from 'lucide-react';

import { useSteppedSyncEngine, formatTime } from './syncWizard/useSteppedSyncEngine';
import SectionClosingModal from './syncWizard/SectionClosingModal';
import LyricsCorrectionModal from './syncWizard/LyricsCorrectionModal';
import {
  buildFinalSynchronizedContent,
  buildDirectMountedContent,
} from './syncWizard/wizardChordDistributor';

export default function SteppedSyncWizardModal({
  isOpen,
  onClose,
  initialContent = '',
  uniqueChords = [],
  youtubeId = '',
  currentTime = 0,
  playerInstance = null,
  onComplete,
  currentBpm = 100,
  compases = [],
}) {
  const engine = useSteppedSyncEngine({
    isOpen,
    initialContent,
    uniqueChords,
    currentTime,
    playerInstance,
    currentBpm,
    compases,
  });

  const activePhraseListRef = useRef(null);
  const step1TextareaRef = useRef(null);

  // Auto-scroll active phrase in teleprompter
  useEffect(() => {
    if (activePhraseListRef.current) {
      const activeEl = activePhraseListRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [engine.currentPhraseIndex]);

  // Direct mount without video synchronization (from Step 1)
  const handleMountDirectWithoutSync = useCallback(() => {
    if (!engine.rawLyrics.trim()) return;

    const { generatedText, generatedCompases } = buildDirectMountedContent({
      rawLyrics: engine.rawLyrics,
      initialContent,
      compases,
      currentBpm,
    });

    if (onComplete) {
      onComplete({
        draftContent: generatedText,
        compases: generatedCompases,
        bpm: currentBpm,
        youtubeId,
      });
    }
    onClose();
  }, [engine.rawLyrics, initialContent, compases, currentBpm, youtubeId, onComplete, onClose]);

  // Finalize and mount chords into visual editor (auto-closes last phrase if left open)
  const handleFinalizeAndMount = useCallback(() => {
    const fourBeatsSec = (60 / (currentBpm || 100)) * 4;
    const nowTime = engine.liveCurrentTime || currentTime || 0;

    // Auto-close any open phrase in syncedSections
    const allSections = engine.syncedSections.map((sec) => ({
      ...sec,
      phrases: (sec.phrases || []).map((p) =>
        p.endTime == null
          ? { ...p, endTime: parseFloat(Math.max(p.time + fourBeatsSec, nowTime).toFixed(2)) }
          : p
      ),
    }));

    if (
      engine.currentSectionPhrases.length > 0 ||
      (engine.syncedSections.length === 0 && engine.hasStartedSync)
    ) {
      const activeName =
        (engine.currentSectionName && engine.currentSectionName.trim()) ||
        engine.firstSectionName ||
        'Verso 1';

      const closedCurrentPhrases = engine.currentSectionPhrases.map((p, idx, arr) => {
        if (p.endTime != null) return p;
        const nextP = arr[idx + 1];
        const fallbackEnd = nextP
          ? nextP.time
          : Math.max(p.time + fourBeatsSec, nowTime);
        return {
          ...p,
          endTime: parseFloat(fallbackEnd.toFixed(2)),
        };
      });

      const lastPhraseEnd =
        closedCurrentPhrases.length > 0
          ? closedCurrentPhrases[closedCurrentPhrases.length - 1].endTime
          : nowTime;

      allSections.push({
        name: activeName,
        startTime: engine.currentSectionStartTime,
        endTime:
          Math.max(nowTime, lastPhraseEnd || 0) > engine.currentSectionStartTime
            ? parseFloat(Math.max(nowTime, lastPhraseEnd || 0).toFixed(2))
            : undefined,
        phrases: closedCurrentPhrases,
      });
    }

    // Pause video when completing
    if (playerInstance && typeof playerInstance.pauseVideo === 'function') {
      try {
        playerInstance.pauseVideo();
      } catch (e) {}
    }

    const { generatedText, generatedCompases } = buildFinalSynchronizedContent({
      allSections,
      initialContent,
      compases,
      parsedPhrases: engine.parsedPhrases,
      currentPhraseIndex: engine.currentPhraseIndex,
      currentBpm,
      availableChords: engine.availableChords,
      allRecordedPhrases: engine.allRecordedPhrases,
      currentSectionStartTime: engine.currentSectionStartTime,
    });

    if (onComplete) {
      onComplete({
        draftContent: generatedText,
        compases: generatedCompases,
        bpm: currentBpm,
        youtubeId,
      });
    }
    onClose();
  }, [
    engine.syncedSections,
    engine.currentSectionPhrases,
    engine.firstSectionName,
    engine.currentSectionName,
    engine.currentSectionStartTime,
    engine.hasStartedSync,
    engine.parsedPhrases,
    engine.currentPhraseIndex,
    engine.availableChords,
    engine.allRecordedPhrases,
    engine.liveCurrentTime,
    currentTime,
    initialContent,
    compases,
    currentBpm,
    youtubeId,
    playerInstance,
    onComplete,
    onClose,
  ]);

  // Quick helper to insert a [Section] tag in Step 1 textarea
  const handleInsertSectionTagInStep1 = (secTag) => {
    const el = step1TextareaRef.current;
    const current = engine.rawLyrics;
    if (!el) {
      const prefix = current.trim().length === 0 ? '' : '\n\n';
      engine.setRawLyrics(`${current}${prefix}[${secTag}]\n`);
      return;
    }
    const start = el.selectionStart ?? current.length;
    const before = current.substring(0, start);
    const after = current.substring(start);
    const prefix = before.length === 0 || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const suffix = after.startsWith('\n') ? '' : '\n';
    const updated = `${before}${prefix}[${secTag}]${suffix}${after}`;
    engine.setRawLyrics(updated);
    setTimeout(() => {
      el.focus();
    }, 0);
  };

  if (!isOpen) return null;

  const progressPercent =
    engine.effectiveDuration > 0
      ? Math.min(100, Math.max(0, (engine.liveCurrentTime / engine.effectiveDuration) * 100))
      : 0;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-4xl h-[90vh] bg-[#f7f3e8] rounded-3xl border-4 border-[#3a281c] shadow-2xl flex flex-col overflow-hidden paper-texture relative"
      >
        {/* ================= HEADER DEL WIZARD ================= */}
        <div className="px-5 py-3.5 border-b border-stone-300 bg-white/60 flex items-center justify-between flex-shrink-0 gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
              <Wand2 className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h2 className="font-serif font-black text-base text-stone-900 flex items-center gap-2">
                <span>Añadir Letra y Sincronizar</span>
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold uppercase tracking-wider">
                  Etapa {engine.currentStep} de 2
                </span>
              </h2>
              <p className="text-[11px] font-sans text-stone-500">
                {engine.currentStep === 1
                  ? 'Paso 1: Pega o escribe la letra de la canción'
                  : 'Paso 2: Marca el inicio de cada verso al compás del audio'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {engine.currentStep === 1 && engine.parsedPhrases.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleMountDirectWithoutSync}
                  className="px-3 py-1.5 bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 rounded-xl font-sans font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Estructurar y montar la letra directamente en el editor sin pasar por la sincronización con video"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-800" />
                  <span className="hidden sm:inline">Montar letra directo sin sincronizar</span>
                  <span className="sm:hidden">Montar directo</span>
                </button>

                <button
                  type="button"
                  onClick={engine.handleProceedToStep2}
                  className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-sans font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <span>Siguiente: Sincronizar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= CONTENIDO POR ETAPAS ================= */}
        <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-5 overflow-hidden">
          {/* ================= ETAPA 1: LETRA LIMPIA ================= */}
          {engine.currentStep === 1 && (
            <div className="flex-1 min-h-0 flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs font-sans text-stone-700 px-1 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold">Pega o escribe aquí la letra:</span>
                  <span className="text-[11px] text-stone-500 hidden md:inline">
                    ({engine.parsedPhrases.length}{' '}
                    {engine.parsedPhrases.length === 1 ? 'verso detectado' : 'versos detectados'})
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-stone-500 hidden sm:inline">
                      Insertar sección:
                    </span>
                    {['Intro', 'Verso 1', 'Verso 2', 'Coro', 'Solo', 'Final'].map((secTag) => (
                      <button
                        key={secTag}
                        type="button"
                        onClick={() => handleInsertSectionTagInStep1(secTag)}
                        className="px-1.5 py-0.5 text-[10px] font-sans font-semibold bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-950 border border-stone-300 rounded-md cursor-pointer transition-colors"
                        title={`Insertar etiqueta [${secTag}]`}
                      >
                        [{secTag}]
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.readText().then((txt) => {
                        if (txt) engine.setRawLyrics(txt);
                      });
                    }}
                    className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer text-[11px]"
                  >
                    Pegar desde portapapeles
                  </button>
                </div>
              </div>

              <textarea
                ref={step1TextareaRef}
                value={engine.rawLyrics}
                onChange={(e) => engine.setRawLyrics(e.target.value)}
                placeholder="Escribe o pega aquí la letra de la canción...&#10;&#10;Puedes sincronizarla con el audio en el Paso 2, o hacer clic en 'Montar letra directo sin sincronizar' para pasarla enseguida al editor."
                className="flex-1 w-full p-4 bg-white/90 border border-stone-300 focus:border-amber-500 rounded-2xl outline-none focus:ring-2 focus:ring-amber-400/20 text-stone-900 font-serif text-sm leading-relaxed resize-none shadow-2xs custom-scrollbar"
              />
            </div>
          )}

          {/* ================= ETAPA 2: SINCRONIZACIÓN RÍTMICA ================= */}
          {engine.currentStep === 2 && (
            <div className="flex-1 min-h-0 flex flex-col justify-between gap-3">
              {/* Modal de inicio: nombrar primera sección */}
              {engine.isNamingFirstSection ? (
                <div className="flex-1 flex items-center justify-center p-4">
                  <div className="w-full max-w-md bg-white p-6 rounded-3xl border border-stone-300 shadow-xl text-center space-y-4">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
                      <Tag className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-serif font-black text-stone-900">
                        ¿Cómo se llama la primera sección?
                      </h3>
                      <p className="text-xs font-sans text-stone-500 mt-0.5">
                        Define cómo inicia la canción antes de arrancar la reproducción.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={engine.firstSectionName}
                        onChange={(e) => engine.setFirstSectionName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            engine.handleStartSyncAfterNaming(engine.firstSectionName);
                          }
                        }}
                        placeholder="Ej: Intro..."
                        className="flex-1 px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 font-serif font-bold text-stone-900"
                      />
                    </div>

                    {/* Chips rápidos */}
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {['Intro', 'Verso 1', 'Intro Instrumental', 'Preludio'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => engine.setFirstSectionName(sug)}
                          className="px-2.5 py-1 text-xs font-sans rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-200 transition-colors cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => engine.handleStartSyncAfterNaming(engine.firstSectionName)}
                      className="w-full py-2.5 bg-stone-900 hover:bg-black text-amber-200 rounded-xl font-sans font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Comenzar a Sincronizar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* BARRA SUPERIOR DE TIEMPO, PROGRESO DE AUDIO & GUÍA VISUAL PERMANENTE */}
                  <div className="flex-shrink-0 bg-stone-900 text-white p-3 rounded-2xl shadow-md border border-stone-800 space-y-2.5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-xl border border-stone-700 font-mono text-amber-300 font-bold text-sm">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span>{formatTime(engine.liveCurrentTime)}</span>
                          <span className="text-stone-500 text-xs font-normal">
                            / {formatTime(engine.effectiveDuration)}
                          </span>
                        </div>

                        <div className="text-xs font-sans text-stone-300 flex items-center gap-2">
                          <span>Sección activa: </span>
                          <strong className="text-amber-300 font-serif text-sm">
                            [{engine.currentSectionName}]
                          </strong>
                          {engine.isVideoPlaying ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-sans px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              Reproduciendo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-sans px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Pausado
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CHIPS DE GUÍA VISUAL DE TECLAS */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="flex items-center gap-1 bg-stone-800 px-2 py-1 rounded-lg border border-stone-700">
                          <kbd className="px-1.5 py-0.5 bg-stone-700 text-amber-300 rounded font-mono font-bold text-[10px]">
                            Espacio
                          </kbd>
                          <span className="text-[11px] text-stone-300">Play/Pausa</span>
                        </span>

                        <span className="flex items-center gap-1 bg-amber-900/60 px-2 py-1 rounded-lg border border-amber-600/40">
                          <kbd className="px-1.5 py-0.5 bg-amber-600 text-white rounded font-mono font-bold text-[10px]">
                            C
                          </kbd>
                          <span className="text-[11px] text-amber-200 font-bold">Inicio [C]</span>
                        </span>

                        <span className="flex items-center gap-1 bg-emerald-950/60 px-2 py-1 rounded-lg border border-emerald-600/40">
                          <kbd className="px-1.5 py-0.5 bg-emerald-700 text-white rounded font-mono font-bold text-[10px]">
                            V
                          </kbd>
                          <span className="text-[11px] text-emerald-200 font-bold">Fin [V]</span>
                        </span>

                        <span className="flex items-center gap-1 bg-rose-950/60 px-2 py-1 rounded-lg border border-rose-700/40">
                          <kbd className="px-1.5 py-0.5 bg-rose-700 text-white rounded font-mono font-bold text-[10px]">
                            Borrar
                          </kbd>
                          <span className="text-[11px] text-rose-200 font-bold">Desmarcar</span>
                        </span>

                        <span className="flex items-center gap-1 bg-stone-800 px-2 py-1 rounded-lg border border-stone-700">
                          <kbd className="px-1.5 py-0.5 bg-stone-700 text-amber-300 rounded font-mono font-bold text-[10px]">
                            X
                          </kbd>
                          <span className="text-[11px] text-stone-300">Nueva Sección</span>
                        </span>
                      </div>
                    </div>

                    {/* BARRA DE PROGRESO DE AUDIO INTERACTIVA */}
                    <div
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                        engine.seekToTime(ratio * engine.effectiveDuration);
                      }}
                      title="Haz clic para adelantar o retroceder en el audio"
                      className="w-full h-2 bg-stone-800 rounded-full overflow-hidden cursor-pointer border border-stone-700/80 relative group"
                    >
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-100 rounded-full"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* BARRA DE ESTADO PAUSADO (ACCIONES RÁPIDAS: CORREGIR LETRA / DESMARCAR) */}
                  {!engine.isVideoPlaying &&
                    engine.hasStartedSync &&
                    !engine.isNamingFirstSection &&
                    !engine.isNamingSection && (
                      <div className="flex-shrink-0 flex items-center justify-between px-3.5 py-2 bg-amber-50/95 border border-amber-300/80 rounded-2xl text-xs font-sans text-amber-950 flex-wrap gap-2 shadow-2xs">
                        <div className="flex items-center gap-2">
                          <Pause className="w-3.5 h-3.5 text-amber-700" />
                          <span className="font-bold text-stone-900">
                            Reproducción en pausa.
                          </span>
                          <span className="text-stone-600 hidden md:inline">
                            Puedes corregir la letra si faltó texto o desmarcar la última oración.
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={engine.openCorrectLyricsModal}
                            className="px-2.5 py-1 bg-amber-200/90 hover:bg-amber-300 text-amber-950 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3 h-3 text-amber-800" />
                            <span>Corregir letra</span>
                          </button>
                          {engine.currentPhraseIndex > 0 && (
                            <button
                              type="button"
                              onClick={engine.handleRemoveLastTimestamp}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>
                                Desmarcar última (
                                {engine.allRecordedPhrases[engine.currentPhraseIndex - 1]?.text?.slice(
                                  0,
                                  16
                                )}
                                ...)
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                  {/* VISUALIZADOR DE ORACIONES TIPO TELEPROMPTER */}
                  <div
                    ref={activePhraseListRef}
                    className="flex-1 min-h-0 overflow-y-auto p-3 bg-white/85 rounded-2xl border border-stone-300 space-y-2 custom-scrollbar shadow-inner"
                  >
                    {engine.parsedPhrases.map((phrase, idx) => {
                      const isPast = idx < engine.currentPhraseIndex;
                      const isActive = idx === engine.currentPhraseIndex;
                      const isLastRecorded = idx === engine.currentPhraseIndex - 1;
                      const recordedTime = isPast ? engine.allRecordedPhrases[idx]?.time : null;

                      return (
                        <div
                          key={idx}
                          data-active={isActive ? 'true' : undefined}
                          className={`p-2.5 rounded-xl border transition-all text-xs font-serif flex items-center justify-between ${
                            isActive
                              ? 'bg-amber-100 border-amber-400 text-stone-950 font-bold shadow-sm ring-2 ring-amber-400/30 scale-[1.01]'
                              : isPast
                              ? 'bg-emerald-50/70 border-emerald-200 text-stone-700 opacity-90'
                              : 'bg-stone-50/60 border-stone-200 text-stone-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[10px] font-bold flex-shrink-0 ${
                                isActive
                                  ? 'bg-amber-700 text-white'
                                  : isPast
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-stone-200 text-stone-500'
                              }`}
                            >
                              {isPast ? <Check className="w-3 h-3" /> : idx + 1}
                            </span>
                            <span className="truncate text-sm">{phrase}</span>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isActive && (
                              <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-amber-300 text-amber-950 animate-pulse">
                                ← Pulsa [C] cuando empiece
                              </span>
                            )}
                            {isPast && recordedTime != null && (
                              <div className="flex items-center gap-1">
                                {engine.allRecordedPhrases[idx]?.endTime == null ? (
                                  <span className="font-mono text-[11px] font-bold text-amber-950 bg-amber-300 px-2 py-0.5 rounded-md animate-pulse">
                                    @ {formatTime(recordedTime)} → Cantando... (opcional [V])
                                  </span>
                                ) : (
                                  <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                                    @ {formatTime(recordedTime)} -{' '}
                                    {formatTime(engine.allRecordedPhrases[idx].endTime)}
                                  </span>
                                )}
                                {isLastRecorded && (
                                  <button
                                    type="button"
                                    onClick={engine.handleRemoveLastTimestamp}
                                    title="Desmarcar fin de oración o eliminar marca"
                                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-md transition-colors cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {engine.currentPhraseIndex >= engine.parsedPhrases.length && (
                      <div className="py-6 text-center space-y-2 bg-emerald-50 rounded-2xl border border-emerald-300 p-4">
                        <Sparkles className="w-8 h-8 mx-auto text-emerald-600" />
                        <h4 className="font-serif font-bold text-sm text-emerald-950">
                          ¡Todas las oraciones fueron sincronizadas con éxito!
                        </h4>
                        <p className="text-xs font-sans text-stone-600">
                          Haz clic abajo para distribuir los acordes y abrir el Editor Visual.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* BOTONERA TÁCTIL INFERIOR */}
                  <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={engine.togglePlayPause}
                      className="py-2.5 px-2 bg-stone-900 hover:bg-black text-amber-200 rounded-xl font-sans font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      {engine.isVideoPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pausar [Espacio]</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play [Espacio]</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={engine.markCurrentPhrase}
                      disabled={engine.currentPhraseIndex >= engine.parsedPhrases.length}
                      className="py-2.5 px-2 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white rounded-xl font-sans font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Inicio [C]</span>
                    </button>

                    <button
                      type="button"
                      onClick={engine.markCurrentPhraseEnd}
                      disabled={!engine.isLastPhraseOpen}
                      className="py-2.5 px-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-xl font-sans font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      title="Opcional: marcar final del verso antes de un espacio instrumental"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Fin [V]</span>
                    </button>

                    <button
                      type="button"
                      onClick={engine.handleRemoveLastTimestamp}
                      disabled={engine.currentPhraseIndex <= 0}
                      className="py-2.5 px-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-40 text-rose-800 border border-rose-300 rounded-xl font-sans font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Desmarcar [Borrar]</span>
                    </button>

                    <button
                      type="button"
                      onClick={engine.handleTriggerSectionEnd}
                      className="py-2.5 px-2 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-xl font-sans font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-700" />
                      <span>Sección [X]</span>
                    </button>

                    <button
                      type="button"
                      onClick={engine.openCorrectLyricsModal}
                      className="py-2.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-xl font-sans font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-800" />
                      <span>Corregir Letra</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => engine.rewindSeconds(3)}
                      className="py-2.5 px-2 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 rounded-xl font-sans font-bold text-xs shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rebobinar 3s</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* ================= MODAL OVERLAY: CORREGIR LETRA DURANTE PAUSA ================= */}
        <LyricsCorrectionModal
          isOpen={engine.isCorrectingLyrics}
          tempLyrics={engine.tempLyrics}
          setTempLyrics={engine.setTempLyrics}
          onSave={engine.handleSaveCorrectedLyrics}
          onClose={() => engine.setIsCorrectingLyrics(false)}
          currentPhraseIndex={engine.currentPhraseIndex}
          totalPhrases={engine.parsedPhrases.length}
        />

        {/* ================= TOAST NOTIFICATION DENTRO DEL WIZARD ================= */}
        <AnimatePresence>
          {engine.toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-amber-200 px-4 py-1.5 rounded-full text-xs font-sans font-bold shadow-xl border border-amber-500/30 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{engine.toastMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= MODAL OVERLAY: CERRAR SECCIÓN ACTUAL Y NOMBRAR NUEVA SECCIÓN ================= */}
        <SectionClosingModal
          isOpen={engine.isNamingSection}
          currentSectionName={engine.currentSectionName}
          sectionToName={engine.sectionToName}
          setSectionToName={engine.setSectionToName}
          currentTime={engine.liveCurrentTime}
          currentSectionStartTime={engine.currentSectionStartTime}
          currentSectionPhrasesCount={engine.currentSectionPhrases.length}
          nextPhrasePreview={engine.nextPhrasePreview}
          onConfirm={engine.handleConfirmSection}
          onCancel={engine.handleCancelSectionModal}
          formatTime={formatTime}
        />

        {/* ================= FOOTER DEL WIZARD ================= */}
        <div className="px-5 py-3 border-t border-stone-300 bg-white/70 flex items-center justify-between flex-shrink-0 gap-2 flex-wrap">
          <div>
            {engine.currentStep === 2 ? (
              <button
                type="button"
                onClick={() => engine.setCurrentStep(1)}
                className="text-xs font-sans font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Volver a Editar Letra</span>
              </button>
            ) : (
              <span className="text-[11px] font-sans text-stone-500">
                💡 Puedes sincronizar con el audio en el Paso 2 o montar la letra directo al editor.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {engine.currentStep === 1 && engine.parsedPhrases.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleMountDirectWithoutSync}
                  className="px-3.5 py-2 bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 rounded-xl font-sans font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-800" />
                  <span>Montar letra directo sin sincronizar</span>
                </button>
                <button
                  type="button"
                  onClick={engine.handleProceedToStep2}
                  className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-sans font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <span>Siguiente: Sincronizar con Audio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {engine.currentStep === 2 && (
              <button
                type="button"
                onClick={handleFinalizeAndMount}
                className="px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-white rounded-xl font-sans font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {engine.currentPhraseIndex >= engine.parsedPhrases.length
                    ? 'Finalizar y Montar Acordes en Editor'
                    : `Guardar Progreso hasta aquí (${engine.currentPhraseIndex}/${engine.parsedPhrases.length})`}
                </span>
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

