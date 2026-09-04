// Sistema de cache simple en memoria con TTL
class SimpleCache {
  constructor(defaultTTL = 300000) { // 5 minutos por defecto
    this.cache = new Map();
    this.timers = new Map();
    this.defaultTTL = defaultTTL;
  }

  set(key, value, ttl = this.defaultTTL) {
    // Limpiar timer existente si existe
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Guardar valor
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });

    // Configurar auto-limpieza
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);

    this.timers.set(key, timer);
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    return entry.value;
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    // Limpiar timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    // Eliminar del cache
    this.cache.delete(key);
  }

  clear() {
    // Limpiar todos los timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  size() {
    return this.cache.size;
  }

  // Limpieza de entradas expiradas (opcional, manual)
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.defaultTTL) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }

  // Obtener estadísticas del cache
  getStats() {
    return {
      size: this.size(),
      keys: Array.from(this.cache.keys()),
      oldestEntry: Math.min(...Array.from(this.cache.values()).map(e => e.timestamp))
    };
  }
}

// Instancias de cache específicas
export const searchCache = new SimpleCache(600000); // 10 minutos para búsquedas
export const chordCache = new SimpleCache(1800000); // 30 minutos para acordes
export const songCache = new SimpleCache(300000); // 5 minutos para contenido de canciones

// Función helper para crear claves de cache
export function createCacheKey(prefix, ...params) {
  return `${prefix}:${params.map(p => 
    typeof p === 'object' ? JSON.stringify(p) : String(p)
  ).join(':')}`;
}

// Hook para usar cache con React (requiere import de React en el componente que lo use)
export function useCachedData(cacheKey, fetcher, cacheInstance = searchCache) {
  // Este hook debe usarse dentro de un componente React que importe React
  // const [data, setData] = React.useState(null);
  // const [loading, setLoading] = React.useState(false);
  // const [error, setError] = React.useState(null);

  // React.useEffect(() => {
  //   // Lógica del hook aquí
  // }, [cacheKey, fetcher, cacheInstance]);

  // return { data, loading, error };
  
  // Por ahora, devolvemos una implementación simplificada
  throw new Error('useCachedData hook needs to be implemented in a React component');
}

export default SimpleCache;