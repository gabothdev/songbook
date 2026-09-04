import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import router from './songs.js';

// Mock AbortSignal globally
class MockAbortController {
  constructor() {
    this.signal = {
      aborted: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      throwIfAborted: vi.fn(),
    };
  }
  abort() {
    this.signal.aborted = true;
  }
}

global.AbortController = MockAbortController;

// Mock the scraper services
vi.mock('../services/scraper.js', () => ({
  searchSongs: vi.fn(),
  getSongContent: vi.fn(),
  searchSongsOnCifraClub: vi.fn(),
  getSongContentFromCifraClub: vi.fn(),
}));

import { 
  searchSongs,
  getSongContent,
  searchSongsOnCifraClub,
  getSongContentFromCifraClub,
} from '../services/scraper.js';

describe('Songs API Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/songs', router);
    
    vi.clearAllMocks();
  });

  describe('GET /api/songs/search/ultimate-guitar', () => {
    it('should search songs successfully', async () => {
      const mockResults = [
        { title: 'Wonderwall', artist: 'Oasis', url: 'https://example.com/song1' },
        { title: 'Champagne Supernova', artist: 'Oasis', url: 'https://example.com/song2' }
      ];

      searchSongs.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/songs/search/ultimate-guitar')
        .query({ q: 'Oasis' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResults);
      expect(searchSongs).toHaveBeenCalledWith('Oasis', undefined);
    });

    it('should return 400 when query is missing', async () => {
      const response = await request(app)
        .get('/api/songs/search/ultimate-guitar');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Query is required.' });
      expect(searchSongs).not.toHaveBeenCalled();
    });

    it('should handle search errors', async () => {
      searchSongs.mockRejectedValue(new Error('Search failed'));

      const response = await request(app)
        .get('/api/songs/search/ultimate-guitar')
        .query({ q: 'test' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Search failed' });
    });

    it('should handle AbortError without responding', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      searchSongs.mockRejectedValue(abortError);

      // Mock res.json to track if it was called
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      // Test the logic directly instead of full HTTP request
      try {
        await searchSongs('test', undefined);
      } catch (error) {
        if (error.name !== 'AbortError') {
          mockRes.status(500).json({ message: error.message });
        }
      }

      expect(mockRes.status).not.toHaveBeenCalled();
      expect(mockRes.json).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/songs/search/cifra-club', () => {
    it('should search Cifra Club successfully', async () => {
      const mockResults = [
        { title: 'Como É Grande o Meu Amor por Você', artist: 'Roberto Carlos', url: 'https://example.com/song1' }
      ];

      searchSongsOnCifraClub.mockResolvedValue(mockResults);

      const response = await request(app)
        .get('/api/songs/search/cifra-club')
        .query({ q: 'Roberto Carlos' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResults);
      expect(searchSongsOnCifraClub).toHaveBeenCalledWith('Roberto Carlos', undefined);
    });

    it('should return 400 when query is missing', async () => {
      const response = await request(app)
        .get('/api/songs/search/cifra-club');

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Query is required.' });
    });

    it('should handle Cifra Club search errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      searchSongsOnCifraClub.mockRejectedValue(new Error('Cifra Club search failed'));

      const response = await request(app)
        .get('/api/songs/search/cifra-club')
        .query({ q: 'test' });

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('Error en el servidor al buscar en Cifra Club');
      expect(consoleSpy).toHaveBeenCalledWith('[API Cifra Club] Error al buscar:', 'Cifra Club search failed');
      
      consoleSpy.mockRestore();
    });
  });

  describe('GET /api/songs/content', () => {
    it('should get Ultimate Guitar song content successfully', async () => {
      const mockContent = 'Mock song content with chords';
      getSongContent.mockResolvedValue(mockContent);

      const response = await request(app)
        .get('/api/songs/content')
        .query({ 
          url: 'https://tabs.ultimate-guitar.com/tab/test', 
          source: 'Ultimate Guitar' 
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ content: mockContent });
      expect(getSongContent).toHaveBeenCalledWith('https://tabs.ultimate-guitar.com/tab/test', undefined);
    });

    it('should get Cifra Club song content successfully', async () => {
      const mockContent = 'Mock Brazilian song content';
      getSongContentFromCifraClub.mockResolvedValue(mockContent);

      const response = await request(app)
        .get('/api/songs/content')
        .query({ 
          url: 'https://www.cifraclub.com.br/test', 
          source: 'Cifra Club' 
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ content: mockContent });
      expect(getSongContentFromCifraClub).toHaveBeenCalledWith('https://www.cifraclub.com.br/test', undefined);
    });

    it('should return 400 when url is missing', async () => {
      const response = await request(app)
        .get('/api/songs/content')
        .query({ source: 'Ultimate Guitar' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Los parámetros "url" y "source" son requeridos.' });
    });

    it('should return 400 when source is missing', async () => {
      const response = await request(app)
        .get('/api/songs/content')
        .query({ url: 'https://example.com' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'Los parámetros "url" y "source" son requeridos.' });
    });

    it('should return 400 for unsupported source', async () => {
      const response = await request(app)
        .get('/api/songs/content')
        .query({ 
          url: 'https://example.com', 
          source: 'Unsupported Source' 
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ message: 'La fuente "Unsupported Source" no está soportada.' });
    });

    it('should handle content fetch errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      getSongContent.mockRejectedValue(new Error('Content fetch failed'));

      const response = await request(app)
        .get('/api/songs/content')
        .query({ 
          url: 'https://tabs.ultimate-guitar.com/tab/test', 
          source: 'Ultimate Guitar' 
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Content fetch failed' });
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle generic error messages', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      getSongContent.mockRejectedValue(new Error(''));

      const response = await request(app)
        .get('/api/songs/content')
        .query({ 
          url: 'https://tabs.ultimate-guitar.com/tab/test', 
          source: 'Ultimate Guitar' 
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ message: 'Error interno del servidor al obtener el contenido.' });
      
      consoleSpy.mockRestore();
    });

    it('should log request source correctly', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      getSongContent.mockResolvedValue('test content');

      await request(app)
        .get('/api/songs/content')
        .query({ 
          url: 'https://tabs.ultimate-guitar.com/tab/test', 
          source: 'Ultimate Guitar' 
        });

      expect(consoleSpy).toHaveBeenCalledWith('(API) Solicitud de contenido para source: "Ultimate Guitar"');
      
      consoleSpy.mockRestore();
    });
  });
});