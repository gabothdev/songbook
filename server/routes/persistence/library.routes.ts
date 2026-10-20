import express from 'express';
import { getResolvedUser } from '../../services/persistence/userHelper.js';
import {
  getUserLibrary,
  saveToLibrary,
  unsaveFromLibrary,
  getUserFavorites,
  addFavorite,
  removeFavorite
} from '../../services/persistence/libraryService.js';

const router = express.Router();

// --- BIBLIOTECA PERSONAL (CANCIONES GUARDADAS EN EL CUADERNO) ---

router.get('/library', async (req, res) => {
  try {
    const { user: userParam, userId } = req.query;
    const activeUser = await getResolvedUser(userId as string || userParam as string);
    const library = await getUserLibrary(activeUser);
    res.json(library);
  } catch (error: any) {
    console.error('Error in /library:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/library/save', async (req, res) => {
  const { user: userParam, userId } = req.body;
  try {
    const activeUser = await getResolvedUser(userId || userParam);
    const result = await saveToLibrary(req.body, activeUser);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /library/save:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/library/unsave', async (req, res) => {
  const { songId, user: userParam, userId } = req.body;
  try {
    const activeUser = await getResolvedUser(userId || userParam);
    const result = await unsaveFromLibrary(songId, activeUser);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /library/unsave:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// --- FAVORITOS ---

router.get('/favorites', async (req, res) => {
  try {
    const { user: userParam, userId } = req.query;
    const activeUser = await getResolvedUser(userId as string || userParam as string);
    const favorites = await getUserFavorites(activeUser);
    res.json(favorites);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/favorites', async (req, res) => {
  const { user: userParam, userId } = req.body;
  try {
    const activeUser = await getResolvedUser(userId || userParam);
    const result = await addFavorite(req.body, activeUser);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.delete('/favorites/:songId', async (req, res) => {
  const { songId } = req.params;
  const { user: userParam, userId } = req.query;
  try {
    const activeUser = await getResolvedUser(userId as string || userParam as string);
    const result = await removeFavorite(songId, activeUser);
    res.json(result);
  } catch (error: any) {
    res.json({ success: true, message: 'Already removed or not found' });
  }
});

export default router;
