// scripts/share.js
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('\n=============================================================');
console.log('       🎵  SONGBOOK - COMPARTIR SESIÓN EN VIVO  🎵');
console.log('=============================================================\n');

// 1. Respaldar dev.db antes de iniciar
const dbPath = path.join(rootDir, 'server', 'prisma', 'dev.db');
const backupDir = path.join(rootDir, 'server', 'prisma', 'backups');

if (fs.existsSync(dbPath)) {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupDir, `dev_${timestamp}.db`);
  const bakFile = path.join(rootDir, 'server', 'prisma', 'dev.db.bak');

  fs.copyFileSync(dbPath, backupFile);
  fs.copyFileSync(dbPath, bakFile);
  console.log(`[Seguridad] Base de datos SQLite respaldada correctamente:`);
  console.log(`  -> ${bakFile}`);
  console.log(`  -> ${backupFile}\n`);
} else {
  console.log('[Aviso] No se encontró server/prisma/dev.db. Se omitió el respaldo.\n');
}

// 2. Verificar o compilar frontend (dist/)
const distPath = path.join(rootDir, 'dist', 'index.html');
const forceBuild = process.argv.includes('--build');

async function ensureBuild() {
  if (!fs.existsSync(distPath) || forceBuild) {
    console.log('[Build] Compilando frontend para producción (Vite build)...');
    await new Promise((resolve, reject) => {
      const buildProc = spawn('cmd.exe', ['/c', 'npm', 'run', 'build'], {
        cwd: rootDir,
        stdio: 'inherit',
      });
      buildProc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Error compilando frontend (código: ${code})`));
      });
    });
    console.log('[Build] Frontend compilado con éxito en /dist.\n');
  } else {
    console.log('[Build] Carpeta /dist encontrada. Usando compilación existente.');
    console.log('  (Tip: ejecuta con --build para forzar recompilar si hiciste cambios)\n');
  }
}

// 3. Localizar binario de cloudflared
function getCloudflaredPath() {
  const candidatePaths = [
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
    'cloudflared.exe',
    'cloudflared',
  ];
  for (const p of candidatePaths) {
    if (p.includes('\\') && fs.existsSync(p)) {
      return p;
    }
  }
  return 'cloudflared';
}

// 4. Iniciar procesos
async function start() {
  await ensureBuild();

  console.log('[Servidor] Levantando servidor Node/Express en puerto 3001...');
  const serverProc = spawn('cmd.exe', ['/c', 'npm', 'run', 'start', '--prefix', 'server'], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProc.stdout.on('data', (d) => {
    const text = d.toString();
    if (text.includes('SongBook Server listo')) {
      console.log('  -> ' + text.trim());
    }
  });

  serverProc.stderr.on('data', (d) => {
    // Si hay errores críticos en el server
    const errText = d.toString();
    if (errText.includes('EADDRINUSE')) {
      console.error('\n[Error] El puerto 3001 ya está en uso. Detén el servidor previo e inténtalo de nuevo.');
      cleanup();
    }
  });

  // Esperar a que el servidor esté listo
  await new Promise((res) => setTimeout(res, 3000));

  const cloudflaredBin = getCloudflaredPath();
  console.log('[Túnel] Abriendo túnel seguro con Cloudflare...');

  const tunnelProc = spawn(cloudflaredBin, ['tunnel', '--url', 'http://127.0.0.1:3001'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let publicUrlFound = false;

  const handleTunnelOutput = (data) => {
    const output = data.toString();
    const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match && !publicUrlFound) {
      publicUrlFound = true;
      const url = match[0];
      console.log('\n=============================================================');
      console.log('🎉  ¡TU APLICACIÓN YA ESTÁ EN LÍNEA PARA TUS USUARIOS!  🎉');
      console.log('=============================================================');
      console.log(`\n  👉 Enlace público HTTPS (comparte este link):`);
      console.log(`     \x1b[32m\x1b[1m${url}\x1b[0m\n`);
      console.log(`  🏠 Acceso local en tu máquina:`);
      console.log(`     http://localhost:3001\n`);
      console.log('  ⚠️  Nota: La sesión permanecerá activa mientras esta ventana');
      console.log('      siga abierta. Para terminarla, presiona Ctrl + C.');
      console.log('=============================================================\n');
    }
  };

  tunnelProc.stdout.on('data', handleTunnelOutput);
  tunnelProc.stderr.on('data', handleTunnelOutput);

  function cleanup() {
    console.log('\n[Cierre] Cerrando túnel y servidor...');
    try {
      tunnelProc.kill();
    } catch (e) {}
    try {
      serverProc.kill();
    } catch (e) {}
    // Matar procesos secundarios de cmd en Windows si quedaran colgados
    spawn('taskkill', ['/F', '/T', '/PID', serverProc.pid], { stdio: 'ignore' });
    spawn('taskkill', ['/F', '/T', '/PID', tunnelProc.pid], { stdio: 'ignore' });
    console.log('[Cierre] Sesión compartida finalizada. ¡Hasta luego!\n');
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

start().catch((err) => {
  console.error('[Error]:', err.message);
  process.exit(1);
});
