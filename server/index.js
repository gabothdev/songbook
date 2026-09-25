// server/index.js
import 'dotenv/config'; // Cargar variables de entorno PRIMERO
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import songRoutes from './routes/songs.js';
import persistenceRoutes from './routes/persistence.js';
import audioRoutes from './routes/audio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Rutas absolutas para evitar problemas en diferentes entornos
const distPath = path.resolve(__dirname, '../dist');

console.log(`[Server] Resolviendo distPath en: ${distPath}`);

// Middlewares
app.use(cors()); // Habilita CORS para todas las rutas
app.use(express.json()); // Permite al servidor entender JSON

// Servir archivos estáticos con una configuración más explícita
app.use(express.static(distPath, {
  maxAge: '1d',
  etag: true
}));

// Rutas de la API
app.use('/api/songs', songRoutes);
app.use('/api/persistence', persistenceRoutes);
app.use('/api/audio', audioRoutes);

// Catch-all mejorado
app.use((req, res) => {
  // Si la petición parece ser un archivo (tiene extensión) y llegó aquí, es un 404 real
  if (req.path.includes('.') && !req.path.endsWith('.html')) {
    return res.status(404).send('Not found');
  }

  // Si es una ruta de API que no existe
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ message: 'API Route not found' });
  }

  // Para navegación SPA, servimos el index.html
  res.sendFile(path.join(distPath, 'index.html'));
});

// Iniciar el servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`> SongBook Server listo`);
  console.log(`> Puerto: ${PORT}`);
  console.log(`> Directorio estático: ${distPath}`);
});
server.timeout = 300000; // 5 minutos de timeout para procesos de WSL lentos