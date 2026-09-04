import { useState, useEffect, useCallback } from 'react';

const SEARCH_HISTORY_KEY = 'chordbook-search-history';
const MAX_HISTORY_ITEMS = 10;

/**
 * Hook para manejar el historial de búsquedas
 * Guarda las búsquedas en localStorage y proporciona funciones para gestionar el historial
 */
export const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState([]);

  // Cargar historial desde localStorage al montar
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        setSearchHistory(Array.isArray(history) ? history : []);
      }
    } catch (error) {
      console.error('Error cargando historial de búsqueda:', error);
      setSearchHistory([]);
    }
  }, []);

  // Guardar historial en localStorage
  const saveHistory = useCallback((history) => {
    try {
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error guardando historial de búsqueda:', error);
    }
  }, []);

  // Añadir una búsqueda al historial
  const addToHistory = useCallback((searchTerm) => {
    const trimmedTerm = searchTerm.trim();
    if (!trimmedTerm) return;

    setSearchHistory(prevHistory => {
      // Remover duplicados (case insensitive)
      const filteredHistory = prevHistory.filter(
        item => item.term.toLowerCase() !== trimmedTerm.toLowerCase()
      );
      
      // Crear nuevo item
      const newItem = {
        term: trimmedTerm,
        timestamp: Date.now(),
        count: 1
      };

      // Buscar si ya existe para incrementar contador
      const existingIndex = prevHistory.findIndex(
        item => item.term.toLowerCase() === trimmedTerm.toLowerCase()
      );
      
      if (existingIndex !== -1) {
        newItem.count = prevHistory[existingIndex].count + 1;
      }

      // Añadir al principio y limitar tamaño
      const newHistory = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
      
      saveHistory(newHistory);
      return newHistory;
    });
  }, [saveHistory]);

  // Remover un elemento del historial
  const removeFromHistory = useCallback((index) => {
    setSearchHistory(prevHistory => {
      const newHistory = prevHistory.filter((_, i) => i !== index);
      saveHistory(newHistory);
      return newHistory;
    });
  }, [saveHistory]);

  // Limpiar todo el historial
  const clearHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch (error) {
      console.error('Error limpiando historial:', error);
    }
  }, []);

  // Obtener sugerencias basadas en el input actual
  const getSuggestions = useCallback((input) => {
    if (!input.trim()) return searchHistory.slice(0, 5);
    
    const filtered = searchHistory.filter(item =>
      item.term.toLowerCase().includes(input.toLowerCase())
    );
    
    return filtered.slice(0, 5);
  }, [searchHistory]);

  return {
    searchHistory,
    addToHistory,
    removeFromHistory,
    clearHistory,
    getSuggestions
  };
};