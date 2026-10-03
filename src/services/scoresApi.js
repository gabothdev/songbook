import { config } from '../config';

const BASE_URL = `${config.API_BASE_URL}/scores`;

export const scoresApi = {
  /**
   * Búsqueda unificada en todas las fuentes (Songsterr, Tango, MIDI, Clásicos) sin exponer URLs externas
   */
  async searchUnified(query, source = 'all') {
    if (!query || !query.trim()) return [];
    const res = await fetch(`${BASE_URL}/unified/search?q=${encodeURIComponent(query.trim())}&source=${encodeURIComponent(source)}`);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Error en búsqueda unificada');
    }
    return data.results || [];
  },

  /**
   * Cargar partitura de cualquier fuente a la memoria local sin URLs de terceros
   */
  async loadUnifiedScore(source, sourceId) {
    const res = await fetch(`${BASE_URL}/unified/load/${encodeURIComponent(source)}/${encodeURIComponent(sourceId)}`);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Error al cargar la partitura');
    }
    return data.score;
  },

  /**
   * Obtener stream binario interno para AlphaTab
   */
  async getScoreStreamBytes(streamUrl) {
    const fullUrl = streamUrl.startsWith('http') ? streamUrl : `${config.API_BASE_URL.replace('/api', '')}${streamUrl}`;
    const res = await fetch(fullUrl);
    if (!res.ok) {
      throw new Error(`Error al descargar partitura (${res.status})`);
    }
    return new Uint8Array(await res.arrayBuffer());
  },

  /**
   * Buscar canciones en Songsterr en tiempo real
   */
  async searchSongsterr(query) {
    if (!query || !query.trim()) return [];
    const res = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(query.trim())}`);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Error al buscar en Songsterr');
    }
    return data.results || [];
  },

  /**
   * Buscar partituras históricas de Tango en TodoTango
   */
  async searchTango(query) {
    if (!query || !query.trim()) return [];
    const res = await fetch(`${BASE_URL}/tango/search?q=${encodeURIComponent(query.trim())}`);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Error al buscar en TodoTango');
    }
    return data.results || [];
  },

  /**
   * Cargar partitura histórica y grabaciones de Tango desde TodoTango
   */
  async getTangoScore(id) {
    const res = await fetch(`${BASE_URL}/tango/${id}`);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Error al cargar partitura de Tango');
    }
    return data.score;
  },

  /**
   * Cargar partitura completa desde Songsterr con AlphaTex
   */
  async getSongsterrScore(songId, partId = null) {
    const url = partId !== null 
      ? `${BASE_URL}/songsterr/${songId}?partId=${partId}`
      : `${BASE_URL}/songsterr/${songId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Error al cargar partitura');
    }
    return data.score;
  },

  /**
   * Cambiar a otra pista/instrumento de la misma canción
   */
  async switchPart(songId, partId, { revisionId, image, title, artist }) {
    const params = new URLSearchParams({
      revisionId: String(revisionId),
      image: String(image),
      title: title || '',
      artist: artist || ''
    });
    const res = await fetch(`${BASE_URL}/songsterr/${songId}/part/${partId}?${params}`);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Error al cambiar pista');
    }
    return data;
  },

  /**
   * Obtener lista de partituras guardadas localmente
   */
  async getSavedScores() {
    const res = await fetch(`${BASE_URL}/library`);
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Error al obtener biblioteca de partituras');
    }
    return data.scores || [];
  },

  /**
   * Guardar partitura en la biblioteca del cuaderno
   */
  async saveScoreToLibrary(scoreData) {
    const res = await fetch(`${BASE_URL}/library`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scoreData)
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Error al guardar partitura');
    }
    return data.score;
  },

  /**
   * Eliminar partitura guardada
   */
  async removeScoreFromLibrary(id) {
    const res = await fetch(`${BASE_URL}/library/${id}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Error al eliminar partitura');
    }
    return data;
  },

  /**
   * Digitalizar partitura escaneada usando Audiveris OMR o Gemini Vision
   */
  async digitizeScore({ imageSource, metadata = {}, apiKey = null, engine = null }) {
    const res = await fetch(`${BASE_URL}/digitize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageSource,
        metadata,
        apiKey,
        engine
      })
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      const errorText = await res.text().catch(() => '');
      throw new Error(errorText || `Error de servidor HTTP ${res.status}`);
    }

    if (!data.success) {
      throw new Error(data.message || 'Error al digitalizar la partitura');
    }
    return data;
  }
};

