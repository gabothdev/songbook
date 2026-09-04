// src/config.js

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const config = {
  API_BASE_URL,
  AUDIO_ENABLED: true,
  DEFAULT_INSTRUMENT: 'guitar',
};