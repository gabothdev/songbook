import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AlphaTabApi } from '@coderline/alphatab';
import {
  Sparkles,
  ArrowLeft,
  Play,
  Pause,
  Square,
  Repeat,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Upload,
  Check,
  Edit3,
  Bookmark,
  Music,
  Loader2,
  FileText,
  AlertCircle,
  Eye,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Key,
  HelpCircle,
  Copy,
  Wand2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { scoresApi } from '../../services/scoresApi';
import { sanitizeAlphaTex } from '../../utils/alphaTexSanitizer';

const SOUNDFONT_URL = 'https://cdn.jsdelivr.net/npm/@coderline/alphatab@latest/dist/soundfont/sonivox.sf2';

/**
 * ScoreDigitizerStudio (Split-View OMR):
 * Panel izquierdo: Escaneo de partitura original (TodoTango, imagen local o captura de portapapeles) con zoom, pan y drag&drop.
 * Panel derecho: Notación digital interactiva en AlphaTab con sonido real + editor AlphaTex en vivo para corrección en caliente.
 */
export default function ScoreDigitizerStudio({
  initialImage,
  initialScore,
  onClose,
  onSaveToLibrary,
  onLoadIntoStand,
}) {
  // Imagen original y lista de páginas
  const [currentImage, setCurrentImage] = useState(initialImage || initialScore?.pages?.[0] || null);
  const [pagesList, setPagesList] = useState(initialScore?.pages || (initialImage ? [initialImage] : []));
  const [activePageIndex, setActivePageIndex] = useState(0);

  // Metadatos de la obra
  const [title, setTitle] = useState(initialScore?.title || 'Partitura Digitalizada');
  const [composer, setComposer] = useState(initialScore?.composer || initialScore?.artist || '');
  const [rhythm, setRhythm] = useState(initialScore?.rhythm || 'Tango');

  // Zoom del escaneo
  const [imageZoom, setImageZoom] = useState(100);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // API Key de Gemini (almacenada en localStorage)
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    try {
      return localStorage.getItem('songbook_gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(geminiApiKey);

  // Motor de digitalización: 'audiveris' (OMR geométrico local) o 'gemini' (IA Multimodal)
  const [selectedEngine, setSelectedEngine] = useState('audiveris');
  const [musicXmlData, setMusicXmlData] = useState(initialScore?.musicXml || null);
  const xmlFileInputRef = useRef(null);

  // Estado OMR
  const [isDigitizing, setIsDigitizing] = useState(false);
  const [digitizeProgress, setDigitizeProgress] = useState('');
  const [omrResult, setOmrResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  // Código AlphaTex resultante y editable (siempre sanitizado para AlphaTab)
  const [alphaTexCode, setAlphaTexCode] = useState(() => {
    if (initialScore?.alphaTex) return sanitizeAlphaTex(initialScore.alphaTex);
    if (initialScore?.songData?.alphaTex) return sanitizeAlphaTex(initialScore.songData.alphaTex);
    // Plantilla limpia inicial (sin partituras ficticias inventadas)
    return '\\tempo 90\n\\ts (4 4)\n.\n// Presiona [🎼 Digitalizar con Audiveris OMR] para transcribir las notas reales\n:1 r |';
  });

  // Modos de visualización
  const [rightViewMode, setRightViewMode] = useState('both'); // 'both' | 'score' | 'editor'
  const [staveProfile, setStaveProfile] = useState('score'); // 'score' (pentagrama) | 'tab' (tablatura) | 'default' (ambos)

  // Reproductor AlphaTab
  const alphaTabContainerRef = useRef(null);
  const apiRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [volume, setVolume] = useState(100);
  const [currentBpm, setCurrentBpm] = useState(90);
  const [syntaxError, setSyntaxError] = useState(null);

  const fileInputRef = useRef(null);

  // Guardar API Key de Gemini
  const handleSaveApiKey = () => {
    const cleaned = tempApiKey.trim();
    setGeminiApiKey(cleaned);
    try {
      localStorage.setItem('songbook_gemini_api_key', cleaned);
    } catch {}
    setShowApiKeyModal(false);
    setSuccessToast(cleaned ? '¡API Key de Gemini guardada correctamente!' : 'API Key eliminada.');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // 1. Inicializar AlphaTabApi una única vez al montar
  useEffect(() => {
    if (!alphaTabContainerRef.current) return;

    let at = null;
    try {
      const profileCode = staveProfile === 'tab' ? 3 : (staveProfile === 'score' ? 2 : 0);
      at = new AlphaTabApi(alphaTabContainerRef.current, {
        core: {
          engine: 'svg',
          logLevel: 'warning',
          useWorkers: false,
        },
        display: {
          staveProfile: profileCode,
          scale: 0.9,
          padding: [20, 20, 20, 20],
        },
        notation: {
          rhythmMode: 2,
        },
        player: {
          enablePlayer: true,
          enableCursor: true,
          soundFont: SOUNDFONT_URL,
        },
      });

      at.playerReady.on(() => setIsPlayerReady(true));
      at.playerStateChanged.on((args) => {
        setIsPlaying(args.state === 1);
      });
      at.error.on((err) => {
        console.warn('[AlphaTab Studio] Error de parseo:', err);
        setSyntaxError(err?.message || 'Error de sintaxis en AlphaTex');
      });

      if (initialScore?.musicXml) {
        try {
          const bytes = typeof initialScore.musicXml === 'string'
            ? new TextEncoder().encode(initialScore.musicXml)
            : initialScore.musicXml;
          at.load(bytes);
        } catch (e) {
          console.warn('Error inicial cargando musicXml:', e);
        }
      } else {
        try {
          at.tex(sanitizeAlphaTex(alphaTexCode));
        } catch (e) {
          console.warn('Error inicial cargando tex:', e);
        }
      }

      apiRef.current = at;
    } catch (err) {
      console.warn('Error inicializando AlphaTab en Digitizer Studio:', err);
    }

    return () => {
      if (apiRef.current) {
        try {
          apiRef.current.destroy();
        } catch (e) {}
        apiRef.current = null;
      }
    };
  }, []);

  // Cargar MusicXML o binario en AlphaTab de forma segura como bytes (evita FileLoadError de XHR)
  const loadMusicXmlIntoAlphaTab = useCallback((xml) => {
    if (!apiRef.current || !xml) return;
    try {
      setSyntaxError(null);
      const bytes = typeof xml === 'string' ? new TextEncoder().encode(xml) : xml;
      apiRef.current.load(bytes);
    } catch (e) {
      console.warn('Error cargando MusicXML en AlphaTab:', e);
      setSyntaxError('Error al renderizar partitura MusicXML: ' + e.message);
    }
  }, []);

  // 2. Actualizar el score con debounce cuando cambia alphaTexCode (solo si no estamos viendo MusicXML)
  useEffect(() => {
    if (!apiRef.current || musicXmlData) return;

    const timer = setTimeout(() => {
      try {
        setSyntaxError(null);
        const clean = sanitizeAlphaTex(alphaTexCode);
        if (clean !== alphaTexCode) {
          setAlphaTexCode(clean);
          return;
        }
        apiRef.current.tex(clean);
      } catch (err) {
        setSyntaxError(err?.message || 'Error de sintaxis');
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [alphaTexCode, musicXmlData]);

  // 3. Captura global de pegar desde portapapeles (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleLocalImageUpload(file);
            setSuccessToast('¡Captura de pantalla pegada desde el portapapeles!');
            setTimeout(() => setSuccessToast(null), 3000);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Cambio de stave profile en caliente
  const handleStaveProfileChange = (newProfile) => {
    setStaveProfile(newProfile);
    if (apiRef.current) {
      const code = newProfile === 'tab' ? 3 : (newProfile === 'score' ? 2 : 0);
      try {
        apiRef.current.settings.display.staveProfile = code;
        apiRef.current.updateSettings();
        apiRef.current.render();
      } catch (e) {
        console.warn('Error cambiando perfil de pentagrama:', e);
      }
    }
  };

  // Reproducción / Pausa
  const handlePlayPause = () => {
    if (!apiRef.current) return;
    apiRef.current.playPause();
  };

  const handleStop = () => {
    if (!apiRef.current) return;
    apiRef.current.stop();
  };

  const handleToggleLoop = () => {
    setIsLooping((prev) => {
      const next = !prev;
      if (apiRef.current) {
        apiRef.current.isLooping = next;
      }
      return next;
    });
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    if (apiRef.current) {
      apiRef.current.masterVolume = newVol / 100;
    }
  };

  // Disparar transcripción OMR (Audiveris o Gemini Vision)
  const handleStartDigitize = async () => {
    if (!currentImage) {
      setErrorMessage('Por favor sube o selecciona una imagen de partitura para digitalizar.');
      return;
    }

    setIsDigitizing(true);
    setErrorMessage(null);
    setDigitizeProgress(
      selectedEngine === 'audiveris'
        ? 'Iniciando reconocimiento geométrico con Audiveris OMR...'
        : 'Conectando con Google Gemini Vision...'
    );

    try {
      if (selectedEngine === 'audiveris') {
        setDigitizeProgress('Escalando a 300 DPI y detectando pentagramas, notas y compases con Audiveris...');
      } else {
        setDigitizeProgress('Analizando pentagramas, armadura, compases y notas con IA...');
      }

      const response = await scoresApi.digitizeScore({
        imageSource: currentImage,
        metadata: {
          title,
          composer,
          rhythm,
        },
        apiKey: geminiApiKey || undefined,
        engine: selectedEngine
      });

      if (response && (response.musicXml || response.alphaTex)) {
        setOmrResult(response);
        if (response.title) setTitle(response.title);
        if (response.composer) setComposer(response.composer);

        if (response.musicXml) {
          setMusicXmlData(response.musicXml);
          loadMusicXmlIntoAlphaTab(response.musicXml);
          setSuccessToast(`¡Reconocimiento OMR profesional con Audiveris exitoso! (${response.measuresCount || ''} compases detectados)`);
        } else if (response.alphaTex) {
          setAlphaTexCode(sanitizeAlphaTex(response.alphaTex));
          if (response.tempo) setCurrentBpm(response.tempo);
          setSuccessToast(`¡Transcripción exitosa con ${response.modelUsed || 'Gemini Vision'}! (${response.measuresCount || ''} compases)`);
        }
        setTimeout(() => setSuccessToast(null), 4000);
      } else {
        throw new Error('No se pudo extraer la notación musical de la imagen.');
      }
    } catch (err) {
      console.error('Error en digitalización OMR:', err);
      const msg = err.message || 'Error al digitalizar la partitura.';
      setErrorMessage(msg);
      // Si el error se debe a la clave de API en modo Gemini, abrir modal de clave
      if (selectedEngine === 'gemini' && (msg.toLowerCase().includes('api key') || msg.toLowerCase().includes('clave') || msg.toLowerCase().includes('invalid'))) {
        setShowApiKeyModal(true);
      }
    } finally {
      setIsDigitizing(false);
      setDigitizeProgress('');
    }
  };

  // Importar archivo externo MusicXML (.musicxml, .xml, .mxl) o MIDI (.mid)
  const handleImportMusicXmlFile = (file) => {
    if (!file) return;
    const isBinary = file.name.endsWith('.mxl') || file.name.endsWith('.mid') || file.name.endsWith('.midi') || file.name.endsWith('.gp') || file.name.endsWith('.gp5');
    const reader = new FileReader();

    if (isBinary) {
      reader.onload = (e) => {
        try {
          const buffer = e.target.result;
          if (apiRef.current) {
            apiRef.current.load(buffer);
            setSuccessToast(`¡Partitura ${file.name} cargada en el atril interactivo!`);
            setTimeout(() => setSuccessToast(null), 3500);
          }
        } catch (err) {
          setErrorMessage('Error al leer archivo binario: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          setMusicXmlData(text);
          loadMusicXmlIntoAlphaTab(text);
          setSuccessToast(`¡Partitura MusicXML ${file.name} cargada!`);
          setTimeout(() => setSuccessToast(null), 3500);
        } catch (err) {
          setErrorMessage('Error al leer MusicXML: ' + err.message);
        }
      };
      reader.readAsText(file);
    }
  };

  // Cargar imagen local (PNG, JPG, WebP)
  const handleLocalImageUpload = (file) => {
    if (!file) return;

    if (file.type === 'application/pdf') {
      setErrorMessage('Para digitalizar PDFs, por favor convierte la página a imagen o toma una captura (Win+Shift+S) y presiona Ctrl+V aquí.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setCurrentImage(dataUrl);
      setPagesList((prev) => [dataUrl, ...prev]);
      setActivePageIndex(0);
      setErrorMessage(null);
      setSuccessToast('Imagen cargada en el panel izquierdo.');
      setTimeout(() => setSuccessToast(null), 2500);
    };
    reader.readAsDataURL(file);
  };

  // Guardar en la biblioteca SQLite local
  const handleSaveInteractiveScore = async () => {
    try {
      const payload = {
        title,
        artist: composer || 'Desconocido',
        songsterrId: null,
        defaultTrack: 0,
        tracks: [
          {
            trackIndex: 0,
            name: rhythm ? `${rhythm} (Piano / Melodía)` : 'Melodía Principal',
            tuning: [],
          },
        ],
        songData: {
          alphaTex: alphaTexCode,
          musicXml: musicXmlData,
          tempo: currentBpm,
          timeSignature: omrResult?.timeSignature || '4/4',
          originalScan: currentImage,
          rhythm: rhythm,
        },
      };

      let savedResult;
      if (onSaveToLibrary) {
        savedResult = await onSaveToLibrary(payload);
      } else {
        savedResult = await scoresApi.saveScoreToLibrary(payload);
      }

      setSuccessToast('¡Partitura interactiva guardada en tu biblioteca SQLite!');
      setTimeout(() => setSuccessToast(null), 3500);

      if (onLoadIntoStand) {
        onLoadIntoStand({
          ...payload,
          id: savedResult?.id,
          alphaTex: alphaTexCode,
          musicXml: musicXmlData,
          pages: pagesList,
        });
      }
    } catch (err) {
      console.error('Error guardando partitura digitalizada:', err);
      setErrorMessage('Error al guardar la partitura: ' + err.message);
    }
  };

  // Insertar snippets rápidos en el editor AlphaTex
  const insertAlphaTexSnippet = (snippet) => {
    setAlphaTexCode((prev) => `${prev.trim()} ${snippet} `);
  };

  // Auto-formatear código AlphaTex
  const handleFormatAlphaTex = () => {
    let clean = alphaTexCode.replace(/\\ts\s*(\d+)\/(\d+)/g, '\\ts ($1 $2)');
    clean = clean.replace(/\s*\|\s*/g, ' | ');
    setAlphaTexCode(clean.trim());
    setSuccessToast('AlphaTex formateado.');
    setTimeout(() => setSuccessToast(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900 text-stone-100 flex flex-col overflow-hidden select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-emerald-900/95 text-emerald-200 px-4 py-2.5 rounded-2xl shadow-2xl border border-emerald-500/50 text-xs font-sans font-bold flex items-center gap-2 pointer-events-none backdrop-blur-md"
          >
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MODAL DE CONFIGURACIÓN API KEY ================= */}
      <AnimatePresence>
        {showApiKeyModal && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-stone-900 border border-stone-700 rounded-2xl max-w-md w-full p-5 shadow-2xl text-stone-200 font-sans"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-100">
                    API Key de Google Gemini Vision
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Permite transcribir partituras directamente desde imágenes con IA multimodal.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Tu API Key de Gemini:
                  </label>
                  <input
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-700 rounded-xl text-xs font-mono text-amber-300 focus:outline-hidden focus:border-amber-500"
                  />
                  <p className="text-[10px] text-stone-500 mt-1">
                    Se almacena de forma segura en el almacenamiento local de tu navegador.
                  </p>
                </div>

                <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-[11px] text-stone-400">
                  <p className="flex items-center gap-1 text-stone-300 font-semibold mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>¿Cómo obtener una gratis?</span>
                  </p>
                  <span>Entra en </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 underline inline-flex items-center gap-0.5 hover:text-amber-300"
                  >
                    Google AI Studio <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <span>, crea una clave API y pégala aquí.</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setShowApiKeyModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-400 hover:text-white bg-stone-800 hover:bg-stone-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveApiKey}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 transition shadow-md cursor-pointer"
                >
                  Guardar Clave
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= BARRA SUPERIOR DEL ESTUDIO ================= */}
      <header className="flex-shrink-0 bg-stone-950 border-b border-stone-800 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-md z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-bold font-sans transition cursor-pointer border border-stone-700 shadow-xs"
            title="Volver al atril"
          >
            <ArrowLeft className="w-4 h-4 text-stone-400" />
            <span className="hidden sm:inline">Cerrar Estudio</span>
          </button>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-transparent font-serif font-black text-stone-100 text-base sm:text-lg focus:bg-stone-900 focus:outline-hidden px-1.5 py-0.5 rounded truncate"
                placeholder="Título de la Obra"
              />
              <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 flex-shrink-0">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Estudio OMR Split-View</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-stone-400 px-1 font-sans">
              <input
                type="text"
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                className="bg-transparent focus:bg-stone-900 focus:outline-hidden px-1 py-0.2 rounded truncate text-stone-300 font-medium"
                placeholder="Compositor / Artista"
              />
              <span>•</span>
              <input
                type="text"
                value={rhythm}
                onChange={(e) => setRhythm(e.target.value)}
                className="w-20 bg-transparent focus:bg-stone-900 focus:outline-hidden px-1 py-0.2 rounded font-mono text-stone-400"
                placeholder="Tango, Vals..."
              />
            </div>
          </div>
        </div>

        {/* Acciones de Cabecera: Configurar API Key / Guardar */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setTempApiKey(geminiApiKey);
              setShowApiKeyModal(true);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold font-sans border transition cursor-pointer ${
              geminiApiKey
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/60'
                : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
            }`}
            title="Configurar tu API Key de Google Gemini para reconocimiento visual neuronal"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {geminiApiKey ? 'Gemini Activo' : 'Configurar API Key'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSaveInteractiveScore}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl text-xs font-bold font-sans transition shadow-md cursor-pointer"
            title="Guardar partitura digitalizada en la biblioteca local"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Guardar en Biblioteca</span>
          </button>
        </div>
      </header>

      {/* Alerta de Error si aplica */}
      {errorMessage && (
        <div className="bg-red-950/90 border-b border-red-800 text-red-200 px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 font-sans shadow-inner">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {(errorMessage.toLowerCase().includes('api key') || errorMessage.toLowerCase().includes('clave') || errorMessage.toLowerCase().includes('gemini')) && (
              <button
                type="button"
                onClick={() => {
                  setTempApiKey(geminiApiKey);
                  setShowApiKeyModal(true);
                }}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold cursor-pointer transition shadow-xs flex items-center gap-1"
              >
                <Key className="w-3 h-3" />
                <span>Configurar Clave</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white cursor-pointer px-2 py-0.5 rounded text-sm"
              title="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ================= CONTENIDO PRINCIPAL: SPLIT-VIEW 50/50 ================= */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-stone-800 bg-stone-900 overflow-hidden">
        {/* ========================================================================= */}
        {/* PANEL IZQUIERDO (50%): ESCANEO ORIGINAL (TodoTango o Imagen Local)        */}
        {/* ========================================================================= */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingOver(false);
            if (e.dataTransfer.files?.[0]) handleLocalImageUpload(e.dataTransfer.files[0]);
          }}
          className={`flex-1 min-w-0 flex flex-col bg-stone-950/90 overflow-hidden relative transition-all ${
            isDraggingOver ? 'ring-2 ring-inset ring-amber-400 bg-amber-950/20' : ''
          }`}
        >
          {/* Barra de herramientas del escaneo */}
          <div className="flex-shrink-0 bg-stone-900/80 border-b border-stone-800 px-3 py-2 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-stone-300 font-sans font-bold">
              <span>🖼️ Escaneo Original</span>
              {pagesList.length > 1 && (
                <span className="font-mono text-[11px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Página {activePageIndex + 1}/{pagesList.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Zoom Controls */}
              <div className="flex items-center bg-stone-800 rounded-lg p-0.5 border border-stone-700">
                <button
                  type="button"
                  onClick={() => setImageZoom(Math.max(50, imageZoom - 15))}
                  className="p-1 text-stone-400 hover:text-white cursor-pointer"
                  title="Alejar"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[10px] text-stone-300 px-1 font-bold">
                  {imageZoom}%
                </span>
                <button
                  type="button"
                  onClick={() => setImageZoom(Math.min(220, imageZoom + 15))}
                  className="p-1 text-stone-400 hover:text-white cursor-pointer"
                  title="Acercar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageZoom(100)}
                  className="p-1 text-stone-500 hover:text-stone-300 cursor-pointer text-[10px]"
                  title="100%"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              {/* Botón Cargar imagen */}
              <label className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg text-xs font-semibold cursor-pointer border border-stone-700">
                <Upload className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Subir Imagen</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleLocalImageUpload(e.target.files[0]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
              </label>
            </div>
          </div>

          {/* Lienzo scrolleable con la imagen escaneada */}
          <div className="flex-1 min-h-0 overflow-auto p-4 flex flex-col items-center justify-start bg-stone-950/60 relative">
            {currentImage ? (
              <div
                style={{
                  transform: `scale(${imageZoom / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="shadow-2xl rounded-xl border border-stone-800 bg-white overflow-hidden max-w-full"
              >
                <img
                  src={currentImage}
                  alt="Escaneo original de la partitura"
                  className="max-w-full h-auto block select-none"
                />
              </div>
            ) : (
              <div className="my-auto text-center p-8 border-2 border-dashed border-stone-800 rounded-2xl max-w-sm">
                <Upload className="w-12 h-12 text-stone-600 mx-auto mb-3" />
                <h4 className="font-serif font-bold text-base text-stone-300">
                  Ninguna partitura cargada
                </h4>
                <p className="text-xs text-stone-500 mt-1 mb-4 font-sans leading-relaxed">
                  Arrastra aquí una imagen, sube un archivo o presiona <strong className="text-amber-400">Ctrl + V</strong> para pegar una captura del portapapeles.
                </p>
                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md">
                  <Upload className="w-4 h-4" />
                  <span>Seleccionar Archivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleLocalImageUpload(e.target.files[0]);
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Barra inferior del escaneo: Navegación de páginas + Botón Digitalizar con IA */}
          <div className="flex-shrink-0 bg-stone-900 border-t border-stone-800 p-3 flex flex-wrap items-center justify-between gap-3">
            {pagesList.length > 1 ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(0, activePageIndex - 1);
                    setActivePageIndex(next);
                    setCurrentImage(pagesList[next]);
                  }}
                  disabled={activePageIndex === 0}
                  className="p-1 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {pagesList.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActivePageIndex(idx);
                      setCurrentImage(pagesList[idx]);
                    }}
                    className={`w-6 h-6 rounded text-xs font-mono font-bold cursor-pointer transition ${
                      activePageIndex === idx
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-400'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(pagesList.length - 1, activePageIndex + 1);
                    setActivePageIndex(next);
                    setCurrentImage(pagesList[next]);
                  }}
                  disabled={activePageIndex === pagesList.length - 1}
                  className="p-1 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-stone-300 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-stone-400 font-sans flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Página activa lista para cotejo</span>
              </div>
            )}

            <input
              type="file"
              ref={xmlFileInputRef}
              onChange={(e) => e.target.files?.[0] && handleImportMusicXmlFile(e.target.files[0])}
              accept=".xml,.musicxml,.mxl,.mid,.midi,.gp,.gp5"
              className="hidden"
            />

            <div className="flex flex-wrap items-center gap-2">
              {/* Selector de Motor OMR */}
              <div className="flex items-center bg-stone-900 p-0.5 rounded-xl border border-stone-700 text-[11px] font-sans">
                <button
                  type="button"
                  onClick={() => setSelectedEngine('audiveris')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold cursor-pointer transition ${
                    selectedEngine === 'audiveris'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Audiveris OMR: Reconocimiento geométrico preciso local (Recomendado para partituras de piano y solista)"
                >
                  <Music className="w-3 h-3" />
                  <span>Audiveris (Local)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedEngine('gemini')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold cursor-pointer transition ${
                    selectedEngine === 'gemini'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Gemini Vision: Transcripción asistida por Inteligencia Artificial Multimodal"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Gemini Vision</span>
                </button>
              </div>

              {/* Botón para importar MusicXML/MIDI externo */}
              <button
                type="button"
                onClick={() => xmlFileInputRef.current?.click()}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white rounded-xl text-xs font-semibold font-sans transition border border-stone-700 cursor-pointer"
                title="Cargar archivo .musicxml, .mxl o .mid generado externamente"
              >
                <Upload className="w-3.5 h-3.5 text-stone-400" />
                <span className="hidden sm:inline">Cargar XML / MIDI</span>
              </button>

              {/* BOTÓN PROMINENTE DE DIGITALIZACIÓN OMR */}
              <button
                type="button"
                onClick={handleStartDigitize}
                disabled={isDigitizing || !currentImage}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-60 text-white rounded-xl text-xs font-bold font-sans transition shadow-lg cursor-pointer"
              >
                {isDigitizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-200" />
                    <span>{digitizeProgress || 'Procesando partitura...'}</span>
                  </>
                ) : (
                  <>
                    {selectedEngine === 'audiveris' ? (
                      <Music className="w-4 h-4 text-amber-300" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    )}
                    <span>
                      {selectedEngine === 'audiveris'
                        ? 'Digitalizar con Audiveris OMR'
                        : 'Digitalizar con Gemini IA'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PANEL DERECHO (50%): NOTACIÓN DIGITAL INTERACTIVA & EDITOR DE CORRECCIÓN   */}
        {/* ========================================================================= */}
        <div className="flex-1 min-w-0 flex flex-col bg-stone-900 overflow-hidden">
          {/* Barra superior de pestañas del panel derecho */}
          <div className="flex-shrink-0 bg-stone-900/90 border-b border-stone-800 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              {/* Selector de Vista: Split | Partitura | Código */}
              <div className="flex items-center bg-stone-950 p-0.5 rounded-lg border border-stone-800">
                <button
                  type="button"
                  onClick={() => setRightViewMode('both')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                    rightViewMode === 'both' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Partitura + Editor
                </button>
                <button
                  type="button"
                  onClick={() => setRightViewMode('score')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                    rightViewMode === 'score' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Solo Partitura
                </button>
                <button
                  type="button"
                  onClick={() => setRightViewMode('editor')}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                    rightViewMode === 'editor' ? 'bg-amber-600 text-white' : 'text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Solo Código
                </button>
              </div>

              {/* Selector de Perfil de Notación */}
              <div className="flex items-center bg-stone-950 p-0.5 rounded-lg border border-stone-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleStaveProfileChange('score')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition ${
                    staveProfile === 'score' ? 'bg-stone-800 text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Pentagrama tradicional para Piano, Bandoneón, Canto o Melodía"
                >
                  🎼 Pentagrama
                </button>
                <button
                  type="button"
                  onClick={() => handleStaveProfileChange('tab')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition ${
                    staveProfile === 'tab' ? 'bg-stone-800 text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Tablatura numérica de guitarra / cuerdas"
                >
                  🎸 Tab
                </button>
                <button
                  type="button"
                  onClick={() => handleStaveProfileChange('default')}
                  className={`px-2 py-0.5 rounded cursor-pointer transition ${
                    staveProfile === 'default' ? 'bg-stone-800 text-amber-300 font-bold' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  title="Ambos (Pentagrama + Tablatura)"
                >
                  Ambos
                </button>
              </div>
            </div>

            {/* Controles de Reproducción y Tempo */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePlayPause}
                disabled={!isPlayerReady}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-bold cursor-pointer transition shadow-xs disabled:opacity-50"
                title={isPlaying ? 'Pausar' : 'Escuchar partitura'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Pausa' : 'Oír'}</span>
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg cursor-pointer"
                title="Detener"
              >
                <Square className="w-3 h-3 fill-current" />
              </button>
              <button
                type="button"
                onClick={handleToggleLoop}
                className={`p-1.5 rounded-lg cursor-pointer transition ${
                  isLooping ? 'bg-amber-600 text-white' : 'bg-stone-800 hover:bg-stone-700 text-stone-400'
                }`}
                title={isLooping ? 'Bucle activado' : 'Activar bucle continuo'}
              >
                <Repeat className="w-3 h-3" />
              </button>

              <div className="flex items-center gap-1 text-stone-400 font-mono text-[11px] bg-stone-950 px-2 py-1 rounded-lg border border-stone-800">
                <span>BPM:</span>
                <input
                  type="number"
                  value={currentBpm}
                  onChange={(e) => {
                    const bpm = Number(e.target.value);
                    setCurrentBpm(bpm);
                    setAlphaTexCode((prev) => prev.replace(/\\tempo\s+\d+/, `\\tempo ${bpm}`));
                  }}
                  className="w-9 bg-transparent text-amber-300 font-bold focus:outline-hidden text-right"
                  min="40"
                  max="240"
                />
              </div>
            </div>
          </div>

          {/* ================= VISTA DE LA PARTITURA EN VIVO (ALPHATAB) ================= */}
          {(rightViewMode === 'both' || rightViewMode === 'score') && (
            <div className={`overflow-auto p-4 bg-[#fcf9f2] text-stone-900 border-b border-stone-800 relative paper-texture ${
              rightViewMode === 'both' ? 'flex-1 min-h-[220px]' : 'flex-1 min-h-0'
            }`}>
              <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-md border border-stone-200/90 p-4">
                <div ref={alphaTabContainerRef} className="w-full" />
              </div>
            </div>
          )}

          {/* ================= EDITOR DE ALPHATEX EN VIVO PARA CORRECCIÓN ================= */}
          {(rightViewMode === 'both' || rightViewMode === 'editor') && (
            <div className={`flex flex-col bg-stone-950 overflow-hidden ${
              rightViewMode === 'both' ? 'h-64 sm:h-72 flex-shrink-0' : 'flex-1 min-h-0'
            }`}>
              {/* Barra de atajos rápidos para notas y compases */}
              <div className="flex-shrink-0 bg-stone-900/90 border-b border-stone-800 px-3 py-1.5 flex items-center justify-between gap-1 overflow-x-auto text-[11px] font-mono">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-stone-500 mr-1 font-sans text-[10px]">Atajos:</span>
                  <button
                    type="button"
                    onClick={() => insertAlphaTexSnippet('|')}
                    className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded font-bold cursor-pointer"
                    title="Insertar barra de compás"
                  >
                    | Compás
                  </button>
                  <button
                    type="button"
                    onClick={() => insertAlphaTexSnippet(':4')}
                    className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded cursor-pointer"
                    title="Negra"
                  >
                    :4 Negra
                  </button>
                  <button
                    type="button"
                    onClick={() => insertAlphaTexSnippet(':8')}
                    className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded cursor-pointer"
                    title="Corchea"
                  >
                    :8 Corchea
                  </button>
                  <button
                    type="button"
                    onClick={() => insertAlphaTexSnippet(':4 r')}
                    className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded cursor-pointer"
                    title="Silencio de negra"
                  >
                    :4 r Silencio
                  </button>
                  <button
                    type="button"
                    onClick={() => insertAlphaTexSnippet('{ch "Am"}')}
                    className="px-1.5 py-0.5 bg-stone-800 hover:bg-stone-700 text-rose-300 rounded cursor-pointer"
                    title="Cifrado Armónico"
                  >
                    {'{ch "Am"}'}
                  </button>

                  <div className="h-4 w-px bg-stone-700 mx-1" />

                  {/* Patrones de Tango */}
                  <button
                    type="button"
                    onClick={() => insertAlphaTexSnippet(':4 a3 {ch "Am"} :4 c4 :4 e4 :4 a4 |')}
                    className="px-1.5 py-0.5 bg-amber-950/80 text-amber-300 hover:bg-amber-900 border border-amber-700/50 rounded cursor-pointer text-[10px]"
                    title="Insertar Marcato en 4 típico de Tango"
                  >
                    + Marcato 4T
                  </button>
                  <button
                    type="button"
                    onClick={() => insertAlphaTexSnippet(':8. a3 :16 c4 :4 e4 :8. a3 :16 c4 :4 e4 |')}
                    className="px-1.5 py-0.5 bg-amber-950/80 text-amber-300 hover:bg-amber-900 border border-amber-700/50 rounded cursor-pointer text-[10px]"
                    title="Insertar Síncopa de Tango"
                  >
                    + Síncopa
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {syntaxError && (
                    <span className="text-red-400 text-[10px] font-sans truncate max-w-xs" title={syntaxError}>
                      ⚠️ {syntaxError}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleFormatAlphaTex}
                    className="flex items-center gap-1 px-2 py-0.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-[10px] cursor-pointer"
                    title="Formatear y corregir sintaxis automáticamente"
                  >
                    <Wand2 className="w-3 h-3 text-amber-400" />
                    <span className="hidden sm:inline">Formatear</span>
                  </button>
                </div>
              </div>

              {/* Textarea de código AlphaTex */}
              <textarea
                value={alphaTexCode}
                onChange={(e) => setAlphaTexCode(e.target.value)}
                className="flex-1 w-full p-3 font-mono text-xs text-amber-200 bg-stone-950 focus:outline-hidden resize-none leading-relaxed select-text border-t border-stone-800/60"
                placeholder="Código AlphaTex..."
                spellCheck={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
