import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_DIR = path.resolve(__dirname, '../../storage/scores');

// Asegurar directorio de almacenamiento privado
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Busca canciones en el catálogo multitrack MIDI (BitMidi)
 * @param {string} query 
 * @returns {Promise<Array>}
 */
export async function searchMidiArchive(query) {
  if (!query || !query.trim()) return [];

  try {
    const encoded = encodeURIComponent(query.trim());
    const res = await axios.get(`https://bitmidi.com/api/midi/search?q=${encoded}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: 8000
    });

    const items = res.data?.result?.results || [];
    return items.map(item => {
      // Limpiar nombre de archivo (.mid) y detectar artista/título
      const cleanName = (item.name || '')
        .replace(/\.midi?$/i, '')
        .replace(/[-_]+/g, ' ')
        .trim();

      // Separación de Artista - Título si existe guión original
      let artist = 'Varios';
      let title = cleanName;
      if (cleanName.includes(' - ')) {
        const parts = cleanName.split(' - ');
        artist = parts[0].trim();
        title = parts.slice(1).join(' - ').trim();
      }

      return {
        id: `midi_${item.id}`,
        sourceId: String(item.id),
        source: 'midi_archive',
        sourceLabel: '🎹 MIDI Multitrack',
        title,
        artist,
        format: 'midi',
        plays: item.plays || 0,
        views: item.views || 0,
        isPublicDomain: false,
        downloadEndpoint: item.downloadUrl ? `https://bitmidi.com${item.downloadUrl}` : null
      };
    });
  } catch (err) {
    console.warn('[MidiArchiveSource] Error en búsqueda MIDI:', err.message);
    return [];
  }
}

/**
 * Descarga y guarda el archivo MIDI en el almacenamiento interno privado
 * @param {string} sourceId 
 * @param {string} customUrl 
 * @returns {Promise<{ filePath: string, buffer: Buffer, fileName: string }>}
 */
export async function fetchAndStoreMidi(sourceId, customUrl = null) {
  const fileUrl = customUrl || `https://bitmidi.com/uploads/${sourceId}.mid`;
  const fileName = `midi_${sourceId}.mid`;
  const localPath = path.join(STORAGE_DIR, fileName);

  // Si ya fue descargado previamente en la biblioteca privada, reutilizarlo
  if (fs.existsSync(localPath)) {
    const buffer = fs.readFileSync(localPath);
    return { filePath: localPath, buffer, fileName };
  }

  const res = await axios.get(fileUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://bitmidi.com/'
    },
    responseType: 'arraybuffer',
    timeout: 15000
  });

  const buffer = Buffer.from(res.data);
  fs.writeFileSync(localPath, buffer);

  return {
    filePath: localPath,
    buffer,
    fileName
  };
}
