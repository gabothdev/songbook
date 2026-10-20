import React, { useState } from 'react';
import { Terminal, RefreshCw } from 'lucide-react';
import { config } from '../../../config';

const PRESET_QUERIES = [
  {
    label: 'Últimas 15 Canciones',
    query: 'SELECT id, title, artist, youtubeId, updatedAt FROM Song ORDER BY updatedAt DESC LIMIT 15;',
  },
  {
    label: 'Álbumes con Artista',
    query: 'SELECT al.id, al.title, al.releaseYear, al.versionType, ar.name as artista, count(s.id) as canciones FROM Album al JOIN Artist ar ON al.artistId = ar.id LEFT JOIN Song s ON al.id = s.albumId GROUP BY al.id ORDER BY al.releaseYear DESC;',
  },
  {
    label: 'Canciones y Estado Sync',
    query: "SELECT id, title, artist, youtubeId, CASE WHEN syncData IS NOT NULL AND syncData != '' AND syncData != '[]' THEN 'Sincronizada (BeatGrid)' ELSE 'Solo Letra' END as estadoSync FROM Song ORDER BY updatedAt DESC;",
  },
  {
    label: 'Usuarios y Preferencias',
    query: 'SELECT u.id, u.email, u.name, u.role, count(p.id) as totalPreferencias FROM User u LEFT JOIN UserSongPreference p ON u.id = p.userId GROUP BY u.id;',
  },
  {
    label: 'Artistas con más canciones',
    query: 'SELECT a.name as artista, count(s.id) as canciones FROM Artist a LEFT JOIN _ArtistToSong rel ON a.id = rel.A LEFT JOIN Song s ON rel.B = s.id GROUP BY a.id ORDER BY canciones DESC;',
  },
  {
    label: 'Repertorios con conteo',
    query: 'SELECT s.id, s.name, count(ss.id) as totalCanciones FROM Setlist s LEFT JOIN SetlistSong ss ON s.id = ss.setlistId GROUP BY s.id;',
  },
  {
    label: 'Listar Tablas SQLite',
    query: "SELECT name FROM sqlite_master WHERE type='table';",
  },
];

export default function SqlQueryConsoleTab({ onToast }) {
  const [sqlQuery, setSqlQuery] = useState('SELECT id, title, artist, youtubeId, updatedAt FROM Song ORDER BY updatedAt DESC LIMIT 10;');
  const [sqlResult, setSqlResult] = useState(null);
  const [sqlLoading, setSqlLoading] = useState(false);

  const handleRunSqlQuery = async (overrideQuery = null) => {
    const queryToRun = overrideQuery || sqlQuery;
    if (!queryToRun.trim()) return;

    setSqlLoading(true);
    setSqlResult(null);

    const startTime = performance.now();
    try {
      const res = await fetch(`${config.API_BASE_URL}/dev/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToRun }),
      });

      const data = await res.json();
      const executionTimeMs = (performance.now() - startTime).toFixed(1);

      if (!res.ok) {
        setSqlResult({ error: data.error || 'Error al ejecutar consulta', executionTimeMs });
        if (onToast) onToast(data.error || 'Error en la consulta', 'error');
      } else {
        setSqlResult({
          rows: data.rows || [],
          rowCount: data.rowCount !== undefined ? data.rowCount : (data.rows ? data.rows.length : 0),
          executionTimeMs,
        });
      }
    } catch (err) {
      const executionTimeMs = (performance.now() - startTime).toFixed(1);
      setSqlResult({ error: err.message, executionTimeMs });
      if (onToast) onToast(`Error de red: ${err.message}`, 'error');
    } finally {
      setSqlLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
      <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Consola SQL Directa</h2>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span>Atajo:</span>
            <kbd className="px-2 py-0.5 bg-stone-800 rounded text-stone-300 font-mono text-[11px] border border-stone-700">Ctrl + Enter</kbd>
          </div>
        </div>

        {/* Preset Queries */}
        <div className="flex flex-wrap gap-2 pt-1">
          {PRESET_QUERIES.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSqlQuery(preset.query);
                handleRunSqlQuery(preset.query);
              }}
              className="text-[11px] px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-stone-700 transition cursor-pointer font-mono"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Query Textarea */}
        <div className="relative">
          <textarea
            rows={4}
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleRunSqlQuery();
              }
            }}
            placeholder="Escribe tu consulta SQL aquí (ej: SELECT * FROM Song WHERE artist LIKE '%Soda%')..."
            className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 font-mono text-xs text-amber-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all leading-relaxed"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-500">Ejecuta consultas en vivo sobre SQLite con Prisma</span>
          <button
            onClick={() => handleRunSqlQuery()}
            disabled={sqlLoading || !sqlQuery.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer active:scale-95 shadow-lg shadow-cyan-600/20"
          >
            {sqlLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
            <span>Ejecutar Consulta</span>
          </button>
        </div>
      </div>

      {/* SQL Results */}
      {sqlResult && (
        <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-400 pb-2 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Resultado:</span>
              {sqlResult.rowCount !== undefined && (
                <span className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[11px]">
                  {sqlResult.rowCount} fila(s)
                </span>
              )}
            </div>
            {sqlResult.executionTimeMs !== undefined && (
              <span className="font-mono text-emerald-400 text-[11px]">
                ⏱ {sqlResult.executionTimeMs} ms
              </span>
            )}
          </div>

          {sqlResult.error ? (
            <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl text-xs font-mono text-rose-300">
              ⚠️ {sqlResult.error}
            </div>
          ) : Array.isArray(sqlResult.rows) && sqlResult.rows.length > 0 ? (
            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead className="bg-stone-900 sticky top-0 border-b border-stone-800">
                  <tr>
                    {Object.keys(sqlResult.rows[0]).map((col) => (
                      <th key={col} className="px-3 py-2 text-stone-400 font-semibold whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {sqlResult.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-stone-900/60 transition">
                      {Object.keys(sqlResult.rows[0]).map((col) => {
                        const val = row[col];
                        const isObj = typeof val === 'object' && val !== null;
                        return (
                          <td key={col} className="px-3 py-2 text-stone-300 max-w-xs truncate" title={String(val)}>
                            {isObj ? JSON.stringify(val) : String(val ?? 'NULL')}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-stone-500 font-mono">
              {sqlResult.message || 'No se devolvieron filas.'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
