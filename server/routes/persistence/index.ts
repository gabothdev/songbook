import express from 'express';
import songsRoutes from './songs.routes.js';
import libraryRoutes from './library.routes.js';
import setlistsRoutes from './setlists.routes.js';
import artistsRoutes from './artists.routes.js';
import chordsRoutes from './chords.routes.js';

const router = express.Router();

// Montar sub-routers preservando exactamente el contrato de rutas públicas de /api/persistence
router.use('/', songsRoutes);
router.use('/', libraryRoutes);
router.use('/', setlistsRoutes);
router.use('/', artistsRoutes);
router.use('/', chordsRoutes);

export default router;
