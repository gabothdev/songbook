import express from 'express';
import {
  updateArtistById,
  updateArtistImage
} from '../../services/persistence/artistService.js';

const router = express.Router();

// --- ARTISTAS ---

// Actualizar foto o datos de un artista por ID
router.patch('/artists/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const updated = await updateArtistById(id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Actualizar o asignar foto canónica a un artista (propagando a Song.artistImage)
router.post('/artists/update-image', async (req, res) => {
  const { id, name, image } = req.body;
  try {
    const result = await updateArtistImage(name, image, id);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /artists/update-image:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

export default router;
