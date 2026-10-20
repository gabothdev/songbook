import express from 'express';
import {
  getCustomChords,
  saveCustomChord,
  lookupChord
} from '../../services/persistence/chordService.js';

const router = express.Router();

// --- ACORDES PERSONALIZADOS ---

router.get('/chords', async (req, res) => {
  const { instrument } = req.query;
  try {
    const chords = await getCustomChords(instrument as string);
    res.json(chords);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/chords', async (req, res) => {
  const { instrument = 'guitar', chordName, data } = req.body;
  try {
    const result = await saveCustomChord(instrument, chordName, data);
    res.json(result);
  } catch (error: any) {
    console.error('Error in POST /chords:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// --- DICCIONARIO DE ACORDES (Catálogo oficial + Custom) ---

router.get('/chords/lookup', async (req, res) => {
  const { name, instrument = 'guitar' } = req.query;
  try {
    const result = await lookupChord(name as string, instrument as string);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

export default router;
