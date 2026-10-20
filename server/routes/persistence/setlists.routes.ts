import express from 'express';
import { getResolvedUser } from '../../services/persistence/userHelper.js';
import {
  getUserSetlists,
  createSetlist,
  addSongToSetlist,
  removeSongFromSetlist,
  deleteSetlist
} from '../../services/persistence/setlistService.js';

const router = express.Router();

// --- SETLISTS ---

router.get('/setlists', async (req, res) => {
  try {
    const { user: userParam, userId } = req.query;
    const activeUser = await getResolvedUser(userId as string || userParam as string);
    const setlists = await getUserSetlists(activeUser);
    res.json(setlists);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/setlists', async (req, res) => {
  const { name, user: userParam, userId } = req.body;
  try {
    const activeUser = await getResolvedUser(userId || userParam);
    const setlist = await createSetlist(name, activeUser);
    res.json(setlist);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Agregar canción a una colección (creando la canción y colección si no existen)
router.post('/setlists/songs', async (req, res) => {
  const { user: userParam, userId } = req.body;
  try {
    const activeUser = await getResolvedUser(userId || userParam);
    const result = await addSongToSetlist(req.body, activeUser);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Quitar una canción de una colección
router.delete('/setlists/:setlistName/songs/:songId', async (req, res) => {
  const { setlistName, songId } = req.params;
  const { user: userParam, userId } = req.query;
  try {
    const activeUser = await getResolvedUser(userId as string || userParam as string);
    const result = await removeSongFromSetlist(setlistName, songId, activeUser);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Eliminar una colección completa
router.delete('/setlists/:name', async (req, res) => {
  const { name } = req.params;
  const { user: userParam, userId } = req.query;
  try {
    const activeUser = await getResolvedUser(userId as string || userParam as string);
    const result = await deleteSetlist(name, activeUser);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

export default router;
