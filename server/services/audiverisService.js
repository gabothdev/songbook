import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec, spawn } from 'child_process';
import axios from 'axios';
import AdmZip from 'adm-zip';

const AUDIVERIS_HOME = 'C:\\Program Files\\Audiveris';
const JAVA_EXE = path.join(AUDIVERIS_HOME, 'runtime', 'bin', 'java.exe');
const APP_DIR = path.join(AUDIVERIS_HOME, 'app');

/**
 * Comprueba si el motor Audiveris OMR está instalado en el sistema
 */
export function isAudiverisAvailable() {
  try {
    return fs.existsSync(JAVA_EXE) && fs.existsSync(path.join(APP_DIR, 'audiveris.jar'));
  } catch {
    return false;
  }
}

/**
 * Prepara la imagen para Audiveris: descarga si es URL, decodifica si es base64,
 * y la reescala a resolución óptima de 300 DPI (mínimo 2000px de ancho) usando Python PIL.
 */
async function prepareImageForAudiveris(imageSource, targetDir) {
  const rawPath = path.join(targetDir, 'raw_input.png');
  const upscaledPath = path.join(targetDir, 'score_300dpi.png');

  if (typeof imageSource === 'string' && (imageSource.startsWith('http://') || imageSource.startsWith('https://'))) {
    const resp = await axios.get(imageSource, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://www.todotango.com/'
      },
      timeout: 25000
    });
    fs.writeFileSync(rawPath, Buffer.from(resp.data));
  } else if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
    const base64Data = imageSource.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(rawPath, Buffer.from(base64Data, 'base64'));
  } else if (typeof imageSource === 'string' && fs.existsSync(imageSource)) {
    fs.copyFileSync(imageSource, rawPath);
  } else {
    throw new Error('Fuente de imagen no reconocida o inválida');
  }

  // Escalar a 300 DPI / resolución óptima con Python PIL
  await new Promise((resolve, reject) => {
    const pyScript = `
import sys
from PIL import Image

src = sys.argv[1]
dst = sys.argv[2]
try:
    img = Image.open(src)
    w, h = img.size
    # Si la imagen tiene menos de 2000px de ancho, multiplicamos la resolución
    scale = max(1.0, 2400.0 / w)
    if scale > 1.2:
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    img.save(dst, format='PNG', dpi=(300, 300))
    sys.exit(0)
except Exception as e:
    sys.stderr.write(str(e))
    sys.exit(1)
`;
    const child = spawn('python', ['-c', pyScript, rawPath, upscaledPath]);
    let errOutput = '';
    child.stderr.on('data', (d) => { errOutput += d.toString(); });
    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(upscaledPath)) {
        resolve();
      } else {
        // Fallback: usar rawPath si falla Python
        console.warn('[Audiveris Service] Advertencia en escalado PIL:', errOutput);
        fs.copyFileSync(rawPath, upscaledPath);
        resolve();
      }
    });
  });

  return upscaledPath;
}

/**
 * Ejecuta el motor Audiveris OMR en modo batch y exporta a MusicXML
 */
export async function digitizeWithAudiveris(imageSource, metadata = {}) {
  if (!isAudiverisAvailable()) {
    throw new Error('El motor Audiveris OMR no está disponible en este servidor.');
  }

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'songbook_audiveris_'));

  try {
    console.log(`[Audiveris Service] Preparando imagen para OMR... (WorkDir: ${workDir})`);
    const preparedImage = await prepareImageForAudiveris(imageSource, workDir);

    const cp = path.join(APP_DIR, '*');
    const args = [
      '-cp',
      cp,
      'Audiveris',
      '-batch',
      '-transcribe',
      '-export',
      '-output',
      workDir,
      preparedImage
    ];

    console.log(`[Audiveris Service] Lanzando reconocimiento geométrico con Audiveris...`);
    const startTime = Date.now();

    await new Promise((resolve, reject) => {
      const child = spawn(JAVA_EXE, args, { cwd: workDir });
      let stdOut = '';
      let stdErr = '';

      child.stdout.on('data', (d) => {
        stdOut += d.toString();
      });
      child.stderr.on('data', (d) => {
        stdErr += d.toString();
      });

      child.on('close', (code) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Audiveris Service] Proceso finalizado en ${elapsed}s (Código: ${code})`);
        
        // Audiveris a veces devuelve 0 o 1 aun cuando exportó el archivo mxl exitosamente
        resolve({ code, stdOut, stdErr });
      });

      child.on('error', (err) => {
        reject(new Error(`Error al iniciar Audiveris: ${err.message}`));
      });
    });

    // Buscar el archivo .mxl generado en workDir recursivamente
    const findMxl = (dir) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const full = path.join(dir, item);
        const st = fs.statSync(full);
        if (st.isDirectory()) {
          const res = findMxl(full);
          if (res) return res;
        } else if (item.endsWith('.mxl')) {
          return full;
        }
      }
      return null;
    };

    const mxlFile = findMxl(workDir);

    if (!mxlFile || !fs.existsSync(mxlFile)) {
      throw new Error('Audiveris no pudo generar la partitura MusicXML para esta imagen. Puede deberse a baja calidad del escaneo o marcas manuales.');
    }

    console.log(`[Audiveris Service] Archivo .mxl encontrado: ${mxlFile}`);
    const zip = new AdmZip(mxlFile);
    const zipEntries = zip.getEntries();
    let musicXmlContent = null;

    for (const entry of zipEntries) {
      if (entry.entryName.endsWith('.xml') && !entry.entryName.startsWith('META-INF')) {
        musicXmlContent = entry.getData().toString('utf8');
        break;
      }
    }

    if (!musicXmlContent) {
      throw new Error('No se encontró el XML de partitura dentro del paquete .mxl generado.');
    }

    console.log(`[Audiveris Service] ¡Partitura MusicXML extraída con éxito! (${musicXmlContent.length} bytes)`);

    return {
      success: true,
      engine: 'audiveris',
      format: 'musicxml',
      musicXml: musicXmlContent,
      title: metadata.title || 'Partitura Digitalizada con Audiveris',
      composer: metadata.composer || '',
      measuresCount: (musicXmlContent.match(/<measure\b/g) || []).length
    };
  } finally {
    // Limpieza de archivos temporales en segundo plano
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch {}
  }
}
