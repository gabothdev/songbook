/**
 * Utilidades para cargar y trabajar con datos de bandoneón
 */

import { config } from "../config.js";
import { getUniversalChordNotes, getChordInfo } from './chordNormalization.js';

let bandoneonData = null;
let bandoneonSVG = null;

/**
 * Limpia el cache de SVG para forzar regeneración
 */
export function clearBandoneonSVGCache() {
  bandoneonSVG = null;
}

/**
 * Carga los datos del bandoneón desde el archivo JSON
 */
export async function loadBandoneonData() {
  if (bandoneonData) return bandoneonData;

  try {
    const response = await fetch('/bandoneon/bandoneon.json');
    bandoneonData = await response.json();
    return bandoneonData;
  } catch (error) {
    console.error('Error cargando datos del bandoneón:', error);
    throw error;
  }
}

/**
 * Carga el SVG del bandoneón - Siempre genera dinámicamente
 */
export async function loadBandoneonSVG(hand = 'right', state = 'open') {
  const isDarkMode = document.documentElement.classList.contains('dark');
  const key = `${hand}_${state}_${isDarkMode ? 'dark' : 'light'}`;

  // Verificar cache
  if (bandoneonSVG && bandoneonSVG[key]) return bandoneonSVG[key];

  try {
    // Cargar datos del bandoneón si no están cargados
    const data = bandoneonData || await loadBandoneonData();
    const handData = data[hand];

    if (handData) {
      const { generateBandoneonSVG } = await import('./generateBandoneonSVG.js');
      const generatedSVG = generateBandoneonSVG(handData, state, isDarkMode, hand);

      if (!bandoneonSVG) bandoneonSVG = {};
      bandoneonSVG[key] = generatedSVG;

      return generatedSVG;
    }

    throw new Error(`No hay datos disponibles para la mano ${hand}`);
  } catch (error) {
    console.error(`Error generando SVG del bandoneón ${hand} ${state}:`, error);
    throw error;
  }
}

/**
 * Encuentra todas las posibles combinaciones de botones para un acorde
 * @param {string} chordName 
 * @param {string} hand 
 * @param {string} state 
 * @returns {Array} Array de variaciones (cada una es un array de botones)
 */
export function findAllBandoneonVariations(chordName, hand = 'right', state = 'open') {
  if (!bandoneonData) return [];

  const chordNotes = getUniversalChordNotes(chordName);
  if (!chordNotes.length) return [];

  const handData = bandoneonData[hand] || [];
  const noteField = state === 'open' ? 'openNote' : 'closeNote';

  // 1. Agrupar todos los botones posibles por nota del acorde
  const buttonsPerNote = chordNotes.map(note => {
    return handData
      .filter(button => noteMatches(button[noteField], note))
      .map(button => ({
        ...button,
        note: button[noteField],
        chordNote: note
      }));
  });

  // Si alguna nota no tiene botones, no hay variaciones posibles
  if (buttonsPerNote.some(arr => arr.length === 0)) return [];

  // 2. Generar combinaciones
  // Para no explotar en combinaciones, limitamos a las primeras N de cada nota
  // o simplemente devolvemos algunas interesantes.
  const variations = [];

  // Variación 1: La que estaba antes (primer botón encontrado para cada nota)
  variations.push(buttonsPerNote.map(arr => arr[0]));

  // Variación 2: Inversa (últimos botones encontrados)
  if (buttonsPerNote.some(arr => arr.length > 1)) {
    variations.push(buttonsPerNote.map(arr => arr[arr.length - 1]));
  }

  // Variación 3: Mezcla (alternando si hay más de 2)
  if (buttonsPerNote.some(arr => arr.length > 2)) {
    variations.push(buttonsPerNote.map((arr, i) => arr[i % arr.length]));
  }

  // Eliminar duplicados si los hay (basado en IDs de botones si los tuvieran, o col/row)
  const uniqueVariations = [];
  const seen = new Set();

  for (const v of variations) {
    const key = v.map(b => `${b.col}-${b.row}`).sort().join('|');
    if (!seen.has(key)) {
      seen.add(key);
      uniqueVariations.push(v);
    }
  }

  return uniqueVariations;
}

/**
 * Encuentra los botones del bandoneón que contienen las notas del acorde
 * @param {string} chordName - Nombre del acorde (ej: "C", "Am", "G7")
 * @param {string} hand - "right" o "left"
 * @param {string} state - "open" o "close"
 * @param {number} variationIndex - Índice de la variación a devolver
 * @returns {Array} Array de botones que forman el acorde
 */
export function findBandoneonChord(chordName, hand = 'right', state = 'open', variationIndex = 0) {
  const variations = findAllBandoneonVariations(chordName, hand, state);
  if (variations.length === 0) return [];

  // Si el índice es mayor al número de variaciones, volver al principio (loop)
  return variations[variationIndex % variations.length] || variations[0];
}


/**
 * Retorna variaciones en un formato compatible con el cargador de guitarra para el ChordBrowser
 */
export async function loadAllBandoneonVariations(chordName, hand = 'right', state = 'open') {
  await loadBandoneonData();

  let customVariations = [];
  try {
    const res = await fetch(`${config.API_BASE_URL}/persistence/chords?instrument=bandoneon`);
    if (res.ok) {
      const allCustom = await res.json();
      customVariations = allCustom
        .filter(c => c.chordName === chordName)
        .map(c => ({
          ...c.data,
          isCustom: true,
          isBandoneon: true,
          variationIndex: 0 // Se ajustará después
        }));
    }
  } catch (e) { }

  const variations = findAllBandoneonVariations(chordName, hand, state);

  // Mapear variaciones estándar
  const standardVariations = variations.map((v, i) => ({
    variationIndex: i,
    isBandoneon: true,
    buttons: v
  }));

  // Combinar (Personalizados primero)
  const all = [...customVariations, ...standardVariations];

  // Re-indexar
  return all.map((v, i) => ({ ...v, variationIndex: i }));
}



/**
 * Verifica si dos notas coinciden (ignorando octava)
 * @param {string} note1 - Primera nota (ej: "C4")
 * @param {string} note2 - Segunda nota (ej: "C")
 * @returns {boolean}
 */
function noteMatches(note1, note2) {
  if (!note1 || !note2) return false;

  // Extraer solo la nota sin la octava
  const cleanNote1 = note1.replace(/\d+$/, '');
  const cleanNote2 = note2.replace(/\d+$/, '');

  return cleanNote1 === cleanNote2;
}

/**
 * Obtiene las coordenadas de un botón en el SVG
 * @param {number} col - Columna del botón
 * @param {number} row - Fila del botón  
 * @param {string} svgContent - Contenido del SVG
 * @returns {Object|null} Coordenadas {x, y} o null si no se encuentra
 */
export function getButtonCoordinates(col, row, svgContent) {
  if (!svgContent) return null;

  // Esta función necesitará ser refinada basándose en la estructura específica del SVG
  // Por ahora, retornamos null y la implementaremos después de analizar mejor el SVG
  return null;
}