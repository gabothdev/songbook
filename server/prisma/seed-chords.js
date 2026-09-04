import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from '../services/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Buscar la carpeta chords-db en diferentes ubicaciones posibles
function findChordsDbPath() {
  const possiblePaths = [
    path.resolve(__dirname, '../../public/chords-db'),
    path.resolve(__dirname, '../../../chordbook/public/chords-db'),
    path.resolve(process.cwd(), 'public/chords-db'),
    path.resolve(process.cwd(), '../chordbook/public/chords-db'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      return p;
    }
  }
  return null;
}

// Normaliza el nombre canónico del acorde a partir de key y suffix
function getCanonicalChordName(key, suffix) {
  if (!suffix || suffix === 'major' || suffix === 'maj') {
    return key;
  }
  if (suffix === 'minor' || suffix === 'min') {
    return `${key}m`;
  }
  if (suffix.startsWith('/')) {
    return `${key}${suffix}`;
  }
  return `${key}${suffix}`;
}

async function seedChords() {
  const chordsDbPath = findChordsDbPath();
  if (!chordsDbPath) {
    console.error('❌ No se encontró la carpeta public/chords-db.');
    process.exit(1);
  }

  console.log(`📁 Leyendo base de acordes desde: ${chordsDbPath}`);

  const rootFolders = fs.readdirSync(chordsDbPath);
  const chordsToInsert = [];
  const seenKeys = new Set();

  for (const rootDir of rootFolders) {
    const rootPath = path.join(chordsDbPath, rootDir);
    if (!fs.statSync(rootPath).isDirectory()) continue;

    const files = fs.readdirSync(rootPath).filter((f) => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(rootPath, file);
      try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const json = JSON.parse(raw);

        const key = json.key || rootDir;
        const suffix = json.suffix || path.basename(file, '.json');
        const chordName = getCanonicalChordName(key, suffix);
        const uniqueKey = `guitar_${chordName}`;

        if (!seenKeys.has(uniqueKey)) {
          seenKeys.add(uniqueKey);
          chordsToInsert.push({
            instrument: 'guitar',
            key,
            suffix,
            chordName,
            positions: JSON.stringify(json.positions || []),
          });
        }
      } catch (err) {
        console.warn(`⚠️ Error leyendo ${filePath}:`, err.message);
      }
    }
  }

  console.log(`🔍 Total de acordes únicos preparados para importar: ${chordsToInsert.length}`);

  // Insertar en lotes de 250 para respetar los límites de SQLite
  const BATCH_SIZE = 250;
  let inserted = 0;

  for (let i = 0; i < chordsToInsert.length; i += BATCH_SIZE) {
    const chunk = chordsToInsert.slice(i, i + BATCH_SIZE);
    await prisma.chordDefinition.createMany({
      data: chunk,
    });
    inserted += chunk.length;
    process.stdout.write(`\r🚀 Progreso: ${inserted}/${chordsToInsert.length} acordes procesados...`);
  }

  console.log('\n✅ ¡Base de datos de acordes importada con éxito en SQLite!');
  await prisma.$disconnect();
}

seedChords().catch((err) => {
  console.error('❌ Error durante la migración de acordes:', err);
  prisma.$disconnect();
  process.exit(1);
});
