import express from 'express';
import { getResolvedUser } from '../../services/persistence/userHelper.js';
import {
  getEnrichedSongs,
  upsertSongAsAdmin,
  restoreOriginalSong,
  updateSongPreferences
} from '../../services/persistence/songService.js';

const router = express.Router();

// Obtener todas las canciones guardadas con sus álbumes y preferencias personales del usuario
router.get('/songs', async (req, res) => {
  try {
    const { user: userParam, userId } = req.query;
    const enriched = await getEnrichedSongs(userParam as string, userId as string);
    res.json(enriched);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Guardar o actualizar versión personalizada de canción (Exclusivo Administradores)
router.post('/songs', async (req, res) => {
  const { user: userParam, userId } = req.body;
  try {
    const activeUser = await getResolvedUser(userId || userParam);
    const song = await upsertSongAsAdmin(req.body, activeUser);
    res.json(song);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Restaurar versión original de la canción (Exclusivo Administradores)
router.post('/songs/restore-original', async (req, res) => {
  const { id, title, artist, user: userParam, userId } = req.body;
  try {
    const activeUser = await getResolvedUser(userId || userParam);
    const result = await restoreOriginalSong({ id, title, artist }, activeUser);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Actualizar preferencias de una canción (transposición en perfil del usuario, imágenes, álbum y versión)
router.patch('/songs/preferences', async (req, res) => {
  const { user: userParam, userId } = req.body;
  try {
    const activeUser = await getResolvedUser(userId || userParam);
    const result = await updateSongPreferences(req.body, activeUser);
    res.json(result);
  } catch (error: any) {
    console.error('Error in /songs/preferences:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

export default router;
