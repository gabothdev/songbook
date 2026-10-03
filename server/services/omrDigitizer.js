import axios from 'axios';

/**
 * Servicio de Digitalización Musical (OMR - Optical Music Recognition) asistido por IA (Gemini Vision).
 * Convierte escaneos de partituras (TodoTango, imágenes o PDFs) a código AlphaTex reproducible por AlphaTab.
 */

/**
 * Obtiene dinámicamente los modelos de Gemini habilitados para esta API Key que soportan generateContent.
 */
const PREFERRED_VISION_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-pro-preview',
  'gemini-pro-latest',
  'gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-flash-latest'
];

/**
 * Obtiene dinámicamente los modelos de Gemini habilitados para esta API Key que soportan generateContent.
 * Excluye estrictamente modelos 'lite' (baja resolución visual) y modelos especializados en audio/TTS.
 */
async function getAvailableGeminiModels(apiKey) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const resp = await axios.get(url, { timeout: 10000 });
    const models = resp.data?.models || [];
    
    // Filtrar modelos que soporten 'generateContent' y descartar modelos no aptos para OMR
    const available = models
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((name) => {
        const lower = name.toLowerCase();
        if (lower.includes('lite')) return false; // Modelos lite alucinan escalas simples
        if (lower.includes('tts')) return false;
        if (lower.includes('audio')) return false;
        if (lower.includes('transcribe')) return false;
        if (lower.includes('clip')) return false;
        if (lower.includes('lyria')) return false;
        if (lower.includes('robotics')) return false;
        if (lower.includes('computer-use')) return false;
        if (lower.includes('banana')) return false;
        if (lower.includes('customtools')) return false;
        return true;
      });

    console.log('[OMR Digitizer] Modelos visuales de alta precisión disponibles:', available);

    // Ordenar según PREFERRED_VISION_MODELS
    const prioritized = available.sort((a, b) => {
      const idxA = PREFERRED_VISION_MODELS.indexOf(a);
      const idxB = PREFERRED_VISION_MODELS.indexOf(b);
      const scoreA = idxA === -1 ? 999 : idxA;
      const scoreB = idxB === -1 ? 999 : idxB;
      return scoreA - scoreB;
    });

    return prioritized.length > 0 ? prioritized : null;
  } catch (err) {
    console.warn('[OMR Digitizer] No se pudo listar modelos dinámicamente:', err.response?.data?.error?.message || err.message);
    return null;
  }
}

const DEFAULT_GEMINI_MODELS = PREFERRED_VISION_MODELS;

/**
 * Convierte una imagen (URL remota o buffer/base64) a formato inlineData para Gemini Vision.
 */
async function getImageInlineData(imageSource) {
  if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
    try {
      // Descargar imagen remota (como las de TodoTango)
      const resp = await axios.get(imageSource, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': 'https://www.todotango.com/'
        },
        timeout: 20000
      });
      const contentType = resp.headers['content-type'] || 'image/jpeg';
      const base64 = Buffer.from(resp.data).toString('base64');
      return {
        inlineData: {
          mimeType: contentType.includes('gif') ? 'image/gif' : (contentType.includes('png') ? 'image/png' : 'image/jpeg'),
          data: base64
        }
      };
    } catch (err) {
      console.warn(`[OMR Digitizer] Error al descargar imagen remota (${imageSource}):`, err.message);
      return null;
    }
  } else if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
    // Data URI (base64)
    const match = imageSource.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (match) {
      return {
        inlineData: {
          mimeType: match[1],
          data: match[2]
        }
      };
    }
    throw new Error('Formato de Data URI inválido');
  } else if (typeof imageSource === 'string' && imageSource.length > 50) {
    // Asumir base64 directo en JPEG/PNG
    return {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageSource
      }
    };
  }

  return null;
}

/**
 * Digitaliza una página de partitura usando Gemini Vision y devuelve notación AlphaTex.
 *
 * @param {string} imageSource - URL http(s) o Data URI base64 de la imagen de la partitura
 * @param {object} metadata - Información previa conocida (título, artista, ritmo)
 * @param {string} userApiKey - API Key opcional de Gemini provista por el usuario
 */
export async function digitizeScoreImage(imageSource, metadata = {}, userApiKey = null) {
  const apiKey = userApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error('No se encontró una API Key de Google Gemini válida. Haz clic en el botón [🔑 API Key] en el estudio para ingresar tu clave gratuita de Google AI Studio.');
  }

  let imagePart = null;
  try {
    imagePart = await getImageInlineData(imageSource);
  } catch (err) {
    console.warn('[OMR Digitizer] Error al preparar datos de la imagen:', err.message);
  }

  if (!imagePart) {
    throw new Error('No se pudo procesar la imagen de la partitura. Asegúrate de haber seleccionado una página o subido un archivo de imagen válido (PNG, JPG, WebP).');
  }

  const prompt = `Eres un transcriptor musical experto y motor OMR (Optical Music Recognition) de vanguardia.
Analiza con suma atención esta imagen de partitura musical${metadata.title ? ` (Obra: "${metadata.title}" de ${metadata.composer || metadata.artist || 'desconocido'})` : ''}.

Transcribe los pentagramas a código **AlphaTex** (el lenguaje de notación de AlphaTab) 100% fiel a la música real, libre de errores sintácticos.

REGLAS DE RECONOCIMIENTO VISUAL:
1. SELECCIÓN DE PENTAGRAMA: La partitura contiene sistemas con pentagramas (ej: el pentagrama superior de "Canto" / Voz solista, y pentagramas inferiores de "Piano" clave de Sol y Fa).
   DEBES TRANSCRIBIR EXCLUSIVAMENTE LA LÍNEA MELÓDICA PRINCIPAL (el pentagrama de "Canto" que lleva el texto cantado y la melodía principal).
2. ARMADURA DE CLAVE Y TONALIDAD:
   - Identifica la cantidad de sostenidos (#) o bemoles (b) en la armadura junto a la clave.
   - Aplica esas alteraciones a las notas correspondientes (por ejemplo, con 3 sostenidos Fa#, Do#, Sol#: f#4, c#5, g#4).
   - Respeta escrupulosamente los sostenidos, bemoles o becuadros accidentales que aparezcan antes de una nota.
3. MÉTRICA Y COMPÁS:
   - Identifica la cifra de compás al inicio (ejemplo: 2/4 en tangos, 4/4 o 3/4 en valses).
   - Coloca en el encabezado "\\ts (2 4)" o "\\ts (4 4)".
   - Cada compás delimitado por '|' debe sumar la duración exacta del compás (en 2/4 = 2 negras o 4 corcheas).
   - Si la canción comienza con anacrusa (un compás incompleto de entrada con una corchea o negra), transcribe ese compás de entrada tal como está escrito.
4. PROHIBICIÓN ESTRICTA DE ESCALAS INVENTADAS:
   - NUNCA inventes una escala genérica (como "b4 c5 d5 e5 f#5 g5 a5 b5...").
   - Lee la altura real de cada nota en las líneas y espacios del pentagrama.
   - Si se trata de una obra clásica conocida (como "${metadata.title || 'la obra mostrada'}"), utiliza tu conocimiento musical de la pieza para asegurar que las notas y ritmos transcritos sean exactos y coincidan con la melodía original.

REGLAS DE SINTAXIS ALPHATEX:
- Encabezado:
  \\tempo <BPM>
  \\ts (<Numerador> <Denominador>)
  .
  (NUNCA pongas barras '/' en \\ts: usa "\\ts (2 4)", NUNCA "2/4").
- Notas con octava: c4, d4, e4, f#4, g4, a4, b4, c5, c#5, d5, e5, f#5...
- Duraciones antepuestas con dos puntos:
  :8. c#5 (corchea con puntillo)
  :16 c#5 (semicorchea)
  :8 b4 (corchea)
  :4 a4 (negra)
  :2 a4 (blanca)
- Silencios: :8 r (silencio de corchea), :4 r (silencio de negra), :2 r (silencio de blanca). NUNCA escribas 'r2' ni 'r4'.
- Compases: separa cada compás con '|'.
- Cifrado armónico: si detectas acordes, pon el acorde {ch "Nombre"} después de la primera nota del compás. Ejemplo: :8 a4 {ch "A"} :8 c#5 |

Responde EXCLUSIVAMENTE con un JSON válido siguiendo este esquema exacto, sin backticks ni texto adicional:
{
  "title": "${metadata.title || 'Título detectado'}",
  "composer": "${metadata.composer || metadata.artist || 'Compositor'}",
  "tempo": 115,
  "timeSignature": "2/4",
  "clef": "treble",
  "keySignature": "A",
  "measuresCount": 16,
  "alphaTex": "\\\\tempo 115\\n\\\\ts (2 4)\\n.\\n:8 e4 | :8. c#5 :16 c#5 :8 c#5 :8 b4 | :8 a4 {ch \\"A\\"} :8 c#5 :8 a4 :8 c#5 | :8. b4 :16 b4 :8 b4 :8 a4 | :8 g#4 {ch \\"E7\\"} :8 b4 :8 g#4 :8 b4 |",
  "transcriptionNotes": "Transcripción de la línea melódica principal (Canto) con métrica 2/4.",
  "confidence": 0.96
}`;

  let lastError = null;

  // Obtener modelos activos soportados para la API Key o usar lista por defecto
  const dynamicModels = await getAvailableGeminiModels(apiKey);
  const modelsToTry = dynamicModels && dynamicModels.length > 0 ? dynamicModels : DEFAULT_GEMINI_MODELS;

  for (const model of modelsToTry) {
    try {
      console.log(`[OMR Digitizer] Intentando transcribir partitura con modelo ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              imagePart
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      };

      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 45000
      });

      const candidate = response.data?.candidates?.[0];
      const rawText = candidate?.content?.parts?.[0]?.text;

      if (rawText) {
        let cleanJson = rawText.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleanJson);
        if (parsed.alphaTex && typeof parsed.alphaTex === 'string') {
          // Normalización estricta de AlphaTex
          parsed.alphaTex = parsed.alphaTex
            .replace(/\\ts\s*\(?\s*(\d+)\s*\/\s*(\d+)\s*\)?/gi, '\\ts ($1 $2)')
            .replace(/\\ts\s+(\d+)\s+(\d+)(?!\))/gi, '\\ts ($1 $2)')
            .replace(/(^|\n)\s*(\d+)\/(\d+)\s*(\n|$)/g, '$1\\ts ($2 $3)$4')
            .replace(/(^|\s)\/([1248]|16|32)(\s|$)/g, '$1:$2$3')
            .replace(/(:\d+\s*)r\d+/g, '$1r')
            .replace(/(^|[\s|])r([1248]|16|32)(?=[\s|]|$)/g, '$1:$2 r')
            .replace(/\br\d+\b/g, 'r')
            .replace(/(\{ch\s+"[^"]+"\})\s*(:\d+)?\s*([a-gA-G][#b]?\d|\([^\)]+\)|r)\b/g, (m, ch, dur, note) => {
              const duration = dur ? `${dur} ` : '';
              return `${duration}${note} ${ch}`;
            });

          console.log(`[OMR Digitizer] ¡Transcripción exitosa con ${model}!`);
          return {
            success: true,
            isFallback: false,
            modelUsed: model,
            ...parsed
          };
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      console.warn(`[OMR Digitizer] Error con modelo ${model}:`, errMsg);
      lastError = errMsg;

      // Si el error es de API Key inválida o cuota, no tiene sentido probar los otros modelos con la misma clave
      if (errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID') || errMsg.includes('quota') || errMsg.includes('PERMISSION_DENIED')) {
        break;
      }
    }
  }

  // Si fallaron los modelos, NUNCA inventamos una partitura ficticia: explicamos el error exacto
  throw new Error(lastError ? `Error de Gemini Vision: ${lastError}` : 'No se pudo transcribir la imagen con ningún modelo de Gemini');
}
