/**
 * Sistema de samples para bandoneón usando Tone.js Sampler
 */

import * as Tone from 'tone';

// Configuración real de samples para bandoneón
// 55 samples extraídos del NSM Buenos Aires Bandoneon ArgCompo (Kontakt)
// Mapeo basado en archivos realmente disponibles
const SAMPLE_CONFIG = {
  // Octava 2 (9 samples >= 0.8s)
  'A#2': '/bandoneon/samples/Asharp2.wav',
  'B2': '/bandoneon/samples/B2.wav',
  'C2': '/bandoneon/samples/C2.wav',
  'D2': '/bandoneon/samples/D2.wav',
  'D#2': '/bandoneon/samples/Dsharp2.wav',
  'F2': '/bandoneon/samples/F2.wav',
  'F#2': '/bandoneon/samples/Fsharp2.wav',
  'G2': '/bandoneon/samples/G2.wav',
  'G#2': '/bandoneon/samples/Gsharp2.wav',
  
  // Octava 3 (8 samples >= 0.8s)
  'A#3': '/bandoneon/samples/Asharp3.wav',
  'C3': '/bandoneon/samples/C3.wav',
  'D3': '/bandoneon/samples/D3.wav',
  'E3': '/bandoneon/samples/E3.wav',
  'F3': '/bandoneon/samples/F3.wav',
  'F#3': '/bandoneon/samples/Fsharp3.wav',
  'G3': '/bandoneon/samples/G3.wav',
  'G#3': '/bandoneon/samples/Gsharp3.wav',
  
  // Octava 4 (5 samples >= 0.8s)
  'D#4': '/bandoneon/samples/Dsharp4.wav',
  'F#4': '/bandoneon/samples/Fsharp4.wav',
  'G4': '/bandoneon/samples/G4.wav',
  'A4': '/bandoneon/samples/A4.wav',
  'B4': '/bandoneon/samples/B4.wav',
  
  // Octava 5 (6 samples >= 0.8s)
  'D5': '/bandoneon/samples/D5.wav',
  'F5': '/bandoneon/samples/F5.wav',
  'F#5': '/bandoneon/samples/Fsharp5.wav',
  'G#5': '/bandoneon/samples/Gsharp5.wav',
  'A#5': '/bandoneon/samples/Asharp5.wav',
  'B5': '/bandoneon/samples/B5.wav',
  
  // Octava 6 (6 samples >= 0.8s)
  'D6': '/bandoneon/samples/D6.wav',
  'D#6': '/bandoneon/samples/Dsharp6.wav',
  'F6': '/bandoneon/samples/F6.wav',
  'F#6': '/bandoneon/samples/Fsharp6.wav',
  'G6': '/bandoneon/samples/G6.wav',
  'G#6': '/bandoneon/samples/Gsharp6.wav'
};

let bandoneonSampler = null;
let isInitialized = false;
let usesSamples = false;

/**
 * Verifica si existen samples de bandoneón disponibles
 */
async function checkSamplesAvailability() {
  try {
    // Intentamos cargar un sample de prueba (probamos tanto WAV como MP3)
    let testResponse = await fetch('/bandoneon/samples/C4.wav', { method: 'HEAD' });
    if (testResponse.ok) {
      console.log('🎵 Samples WAV de bandoneón encontrados');
      return true;
    }
    
    testResponse = await fetch('/bandoneon/samples/C4.mp3', { method: 'HEAD' });
    if (testResponse.ok) {
      console.log('🎵 Samples MP3 de bandoneón encontrados');
      return true;
    }
    
    return false;
  } catch (error) {
    console.log('📄 Samples de bandoneón no encontrados, usando síntesis como fallback');
    return false;
  }
}
let loadingPromise = null;
let isPlayingBandoneon = false;
let hasPatchedBufferSource = false;

function patchBufferSource() {
  if (hasPatchedBufferSource) return;
  try {
    if (Tone && Tone.BufferSource && Tone.BufferSource.prototype) {
      const originalStart = Tone.BufferSource.prototype.start;
      Tone.BufferSource.prototype.start = function(time, offset, duration) {
        if (isPlayingBandoneon) {
          this.loop = true;
          // IMPEDIR que Tone.js programe un stop al final de la duración original del sample
          duration = undefined;
        }
        return originalStart.call(this, time, offset, duration);
      };
      hasPatchedBufferSource = true;
      console.log('🔮 Tone.BufferSource monkey-patched successfully for bandoneon looping');
    }
  } catch (e) {
    console.error('Error patching Tone.BufferSource:', e);
  }
}

/**
 * Inicializa el sampler de bandoneón
 */
export async function initializeBandoneonSampler() {
  if (isInitialized) return { sampler: bandoneonSampler, usesSamples };
  if (loadingPromise) return loadingPromise;
  
  patchBufferSource();
  
  loadingPromise = (async () => {
    try {
      await Tone.start();
      
      // Verificar disponibilidad de samples
      const samplesAvailable = await checkSamplesAvailability();
      
      if (samplesAvailable) {
        console.log('🎵 Inicializando bandoneón con samples reales...');
        
        // Crear sampler con los samples disponibles y esperar a que cargue
        await new Promise((resolve, reject) => {
          bandoneonSampler = new Tone.Sampler({
            urls: SAMPLE_CONFIG,
            baseUrl: "", // Ya incluimos la ruta completa en SAMPLE_CONFIG
            onload: () => {
              console.log('🪗 Samples de bandoneón cargados exitosamente');
              resolve();
            },
            onerror: (error) => {
              console.error('❌ Error cargando samples:', error);
              reject(error);
            }
          });
        });
        
        usesSamples = true;
        
      } else {
        console.log('🎹 Inicializando bandoneón con síntesis como fallback...');
        
        // Fallback a síntesis mejorada
        bandoneonSampler = new Tone.PolySynth(Tone.Synth, {
          oscillator: {
            type: "fatsawtooth",
            count: 3,
            spread: 30
          },
          envelope: {
            attack: 0.1,
            decay: 0.3,
            sustain: 0.8,
            release: 2.0
          }
        });
        
        usesSamples = false;
      }
      
      // Efectos comunes para ambos casos
      const reverb = new Tone.Reverb({
        decay: 3,
        preDelay: 0.05,
        wet: 0.3
      });
      
      const filter = new Tone.Filter({
        frequency: 1800,
        type: "lowpass",
        rolloff: -12,
        Q: 1.5
      });
      
      const compressor = new Tone.Compressor({
        threshold: -20,
        ratio: 3,
        attack: 0.003,
        release: 0.1
      });
      
      // Conectar efectos
      bandoneonSampler.chain(filter, compressor, reverb, Tone.Destination);
      
      // Ajustar volumen inicial (más bajo para evitar saltos)
      bandoneonSampler.volume.value = usesSamples ? -6 : -9;
      
      isInitialized = true;
      return { sampler: bandoneonSampler, usesSamples };
      
    } catch (error) {
      console.error('❌ Error inicializando sampler de bandoneón:', error);
      loadingPromise = null; // Resetear el promise en caso de error para permitir reintentos
      throw error;
    }
  })();
  
  return loadingPromise;
}

/**
 * Obtiene la nota de sample más cercana para una nota dada
 */
function getMappedNote(targetNote) {
  // Si tenemos el sample directo, usarlo
  if (SAMPLE_CONFIG[targetNote]) {
    return targetNote;
  }
  
  try {
    // Buscar la nota más cercana disponible
    const targetMidi = Tone.Frequency(targetNote).toMidi();
    let closestNote = 'C3';
    let closestDistance = Infinity;
    
    Object.keys(SAMPLE_CONFIG).forEach(sampleNote => {
      const sampleMidi = Tone.Frequency(sampleNote).toMidi();
      const distance = Math.abs(targetMidi - sampleMidi);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestNote = sampleNote;
      }
    });
    
    return closestNote;
  } catch (e) {
    return targetNote;
  }
}

/**
 * Reproduce un acorde de bandoneón con samples
 */
export async function playBandoneonChordWithSamples(notes, duration = '2n', bellowsDirection = 'open') {
  try {
    const { sampler, usesSamples: usingSamples } = await initializeBandoneonSampler();
    
    if (!notes || notes.length === 0) {
      console.warn('⚠️ No hay notas para reproducir');
      return;
    }
    
    // Filtrar notas válidas
    const validNotes = notes.filter(note => note && note.trim() !== '');
    
    if (validNotes.length === 0) {
      console.warn('⚠️ No se encontraron notas válidas para reproducir');
      return;
    }
    
    console.log(`🎵 Reproduciendo acorde de bandoneón (${usingSamples ? 'samples' : 'síntesis'}, ${bellowsDirection}):`, validNotes);
    
    // Mantener volumen constante para evitar saltos
    const baseVolume = usingSamples ? -6 : -9; // Reducir volumen base
    sampler.volume.value = baseVolume;
    
    // Ordenar notas por frecuencia (grave a agudo)
    const sortedNotes = validNotes.sort((a, b) => {
      const freqA = Tone.Frequency(a).toFrequency();
      const freqB = Tone.Frequency(b).toFrequency();
      return freqA - freqB;
    });
    
    // Reproducir con efecto de rasgueo
    const buttonDelay = 0.025; // 25ms entre botones
    const now = Tone.now();
    
    // Activar bandera para que el patch aplique loop = true a los BufferSources creados en triggerAttack
    isPlayingBandoneon = true;

    sortedNotes.forEach((note, i) => {
      const time = now + i * buttonDelay;
      
      try {
        if (usingSamples) {
          // Para samples, verificar si existe y usar mapeo si es necesario
          const mappedNote = getMappedNote(note);
          console.log(`🎵 Nota: ${note} → Sample: ${mappedNote}`);
          sampler.triggerAttack(note, time);
        } else {
          // Para síntesis, usar la nota directamente
          sampler.triggerAttack(note, time);
        }
      } catch (error) {
        console.warn(`⚠️ Error al iniciar nota ${note}:`, error);
      }
    });

    // Desactivar bandera
    isPlayingBandoneon = false;

    // Programar la liberación simultánea de todas las notas para asegurar que duren lo mismo
    const durationSeconds = Tone.Time(duration).toSeconds();
    sampler.triggerRelease(sortedNotes, now + durationSeconds);
    
  } catch (error) {
    console.error('❌ Error al reproducir acorde de bandoneón:', error);
  }
}

/**
 * Reproduce una nota individual del bandoneón con samples
 */
export async function playBandoneonNoteWithSamples(note, duration = '4n', bellowsDirection = 'open') {
  try {
    const { sampler, usesSamples: usingSamples } = await initializeBandoneonSampler();
    
    if (!note) {
      console.warn('⚠️ No hay nota para reproducir');
      return;
    }
    
    console.log(`🎵 Reproduciendo nota de bandoneón (${usingSamples ? 'samples' : 'síntesis'}): ${note} (${bellowsDirection})`);
    
    // Mantener volumen constante
    const baseVolume = usingSamples ? -6 : -9;
    sampler.volume.value = baseVolume;
    
    try {
      if (usingSamples) {
        // Para samples, verificar si existe y usar mapeo si es necesario
        const mappedNote = getMappedNote(note);
        console.log(`🎵 Nota individual: ${note} → Sample: ${mappedNote}`);
        
        isPlayingBandoneon = true;
        sampler.triggerAttackRelease(note, duration);
        isPlayingBandoneon = false;
      } else {
        // Para síntesis, usar la nota directamente
        sampler.triggerAttackRelease(note, duration);
      }
    } catch (error) {
      console.warn(`⚠️ Error reproduciendo nota individual ${note}:`, error);
    }
    
  } catch (error) {
    console.error('❌ Error al reproducir nota de bandoneón:', error);
  }
}

/**
 * Limpia y dispose los recursos de audio del sampler
 */
export function disposeBandoneonSampler() {
  if (bandoneonSampler) {
    bandoneonSampler.dispose();
    bandoneonSampler = null;
    isInitialized = false;
    usesSamples = false;
    console.log('🧹 Recursos de sampler de bandoneón liberados');
  }
}

/**
 * Obtiene información sobre el estado actual del sampler
 */
export function getSamplerInfo() {
  return {
    isInitialized,
    usesSamples,
    availableNotes: usesSamples ? Object.keys(SAMPLE_CONFIG) : null
  };
}