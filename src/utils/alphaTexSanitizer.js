/**
 * Sanitizador y normalizador de código AlphaTex para AlphaTab.
 * Garantiza que las directivas de compás, tempo y duraciones cumplan
 * estrictamente con la especificación de AlphaTex y no disparen errores
 * del lexer (como el error AT001 por '/' no esperado).
 */
export function sanitizeAlphaTex(rawTex) {
  if (!rawTex || typeof rawTex !== 'string') return '';

  let tex = rawTex.trim();

  // 1. Corregir formato de armadura de compás: \ts 4/4 o \ts (4/4) -> \ts (4 4)
  tex = tex.replace(/\\ts\s*\(?\s*(\d+)\s*\/\s*(\d+)\s*\)?/gi, '\\ts ($1 $2)');

  // 2. Corregir \ts 4 4 sin paréntesis -> \ts (4 4)
  tex = tex.replace(/\\ts\s+(\d+)\s+(\d+)(?!\))/gi, '\\ts ($1 $2)');

  // 3. Corregir números de compás sueltos en cabecera tipo "4/4" o "2/4" -> \ts (4 4)
  tex = tex.replace(/(^|\n)\s*(\d+)\/(\d+)\s*(\n|$)/g, '$1\\ts ($2 $3)$4');

  // 4. Asegurar que haya un punto '.' separando la cabecera del cuerpo musical si hay \tempo o \ts
  if ((tex.includes('\\tempo') || tex.includes('\\ts')) && !/\n\s*\.\s*(\n|$)/.test(tex)) {
    const lines = tex.split('\n');
    let dotInserted = false;
    const newLines = [];
    for (let i = 0; i < lines.length; i++) {
      newLines.push(lines[i]);
      if (!dotInserted && (lines[i].startsWith('\\tempo') || lines[i].startsWith('\\ts') || lines[i].startsWith('\\title'))) {
        const nextLine = lines[i + 1]?.trim() || '';
        if (!nextLine.startsWith('\\') && nextLine !== '.') {
          newLines.push('.');
          dotInserted = true;
        }
      }
    }
    if (dotInserted) {
      tex = newLines.join('\n');
    }
  }

  // 5. Corregir cualquier '/4' o '/8' espurio que no sea comentario
  // (evita que un '/' aislado de duración rompa el parser como error AT001)
  tex = tex.replace(/(^|\s)\/([1248]|16|32)(\s|$)/g, '$1:$2$3');

  // 6. Normalizar silencios mal formateados generados por la IA:
  // Casos como ":2 r2" -> ":2 r", ":4 r4" -> ":4 r"
  tex = tex.replace(/(:\d+\s*)r\d+/g, '$1r');
  // Casos como "r2" -> ":2 r", "r4" -> ":4 r", "r8" -> ":8 r", "r16" -> ":16 r", "r1" -> ":1 r"
  tex = tex.replace(/(^|[\s|])r([1248]|16|32)(?=[\s|]|$)/g, '$1:$2 r');
  // Cualquier 'r' con dígito residual restante que rompería como percusión (AT209)
  tex = tex.replace(/\br\d+\b/g, 'r');

  // 7. Corregir posición de {ch "..."} si está antepuesto a la nota o al compás (error AT202 LBrace)
  // En AlphaTex, {ch "..."} es un modificador de pulso y DEBE ir DESPUÉS de la nota/acorde o silencio
  tex = tex.replace(/(\{ch\s+"[^"]+"\})\s*(:\d+)?\s*(\d+\.\d+|[a-gA-G][#b]?(?:\.|\d+)\d*|\([^\)]+\)|r)\b/g, (match, ch, dur, note) => {
    const duration = dur ? `${dur} ` : '';
    return `${duration}${note} ${ch}`;
  });

  return tex;
}
