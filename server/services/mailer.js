import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_DIR = path.resolve(__dirname, '../storage');
const LOG_FILE = path.join(STORAGE_DIR, 'reported_broken_images.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// In-memory set of reported broken URLs, synced with disk
let reportedUrls = new Set();
try {
  if (fs.existsSync(LOG_FILE)) {
    const raw = fs.readFileSync(LOG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      reportedUrls = new Set(parsed);
    }
  }
} catch (e) {
  console.warn('[Mailer] Could not read existing broken images log:', e.message);
}

function persistReportedUrls() {
  try {
    fs.writeFileSync(LOG_FILE, JSON.stringify(Array.from(reportedUrls), null, 2), 'utf-8');
  } catch (e) {
    console.warn('[Mailer] Error saving broken images log:', e.message);
  }
}

/**
 * Configure Nodemailer transport
 */
function createTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    const isGmail = user.includes('@gmail.com');
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || (isGmail ? 'smtp.gmail.com' : undefined),
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: { user, pass },
    });
  }

  return null;
}

/**
 * Sends an email notification to gabothdev@gmail.com if an image has failed to load.
 * Guarantees that each broken URL is only alerted ONCE.
 */
export async function sendBrokenImageAlert({
  type = 'artist', // 'artist' | 'album'
  name = '',
  songTitle = '',
  url = '',
  httpStatus = null,
}) {
  if (!url || typeof url !== 'string') {
    return { sent: false, reason: 'invalid_url' };
  }

  const cleanUrl = url.trim();

  // Deduplication check: only alert the first time a particular URL fails
  if (reportedUrls.has(cleanUrl)) {
    return { sent: false, reason: 'already_reported' };
  }

  // Mark as reported immediately to avoid race conditions
  reportedUrls.add(cleanUrl);
  persistReportedUrls();

  const recipient = process.env.ADMIN_ALERT_EMAIL || 'gabothdev@gmail.com';
  const typeLabel = type === 'artist' ? 'Foto de Artista (Polaroid)' : 'Carátula de Álbum (CD)';
  const subject = `🚨 [SongBook] Imagen no disponible: ${name || songTitle || 'Elemento multimedia'}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #1c1917; color: #f5f5f4; margin: 0; padding: 24px; }
          .card { background-color: #292524; border: 1px solid #44403c; border-radius: 16px; max-width: 600px; margin: 0 auto; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #78350f, #b45309); padding: 20px 24px; color: #fef3c7; }
          .header h2 { margin: 0 0 6px 0; font-size: 18px; font-weight: 800; letter-spacing: -0.5px; }
          .content { padding: 24px; }
          .badge { display: inline-block; padding: 4px 10px; background-color: #ef4444; color: #fff; font-size: 11px; font-weight: 700; border-radius: 9999px; margin-bottom: 16px; }
          .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
          .table td { padding: 10px 12px; border-bottom: 1px solid #44403c; }
          .table td.label { font-weight: bold; color: #d6d3d1; width: 30%; }
          .table td.val { color: #fafaf9; }
          .url-box { background-color: #1c1917; border: 1px solid #44403c; border-radius: 8px; padding: 10px; font-family: monospace; font-size: 11px; word-break: break-all; color: #fca5a5; margin-bottom: 20px; }
          .footer { padding: 16px 24px; background-color: #1c1917; border-top: 1px solid #44403c; font-size: 11px; color: #a8a29e; text-align: center; }
          .note { color: #fbbf24; font-size: 12px; line-height: 1.5; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <h2>🎸 SongBook — Alerta de Imagen Caída</h2>
            <div style="font-size: 12px; opacity: 0.9;">Detección automática en tiempo real</div>
          </div>
          <div class="content">
            <span class="badge">Error de carga detectado</span>
            <p class="note">
              Una imagen configurada en el cancionero ya no está disponible en su servidor de origen y no pudo cargarse en el navegador.
            </p>
            <table class="table">
              <tr>
                <td class="label">Elemento:</td>
                <td class="val"><strong>${typeLabel}</strong></td>
              </tr>
              ${name ? `<tr><td class="label">Artista:</td><td class="val">${name}</td></tr>` : ''}
              ${songTitle ? `<tr><td class="label">Canción:</td><td class="val">${songTitle}</td></tr>` : ''}
              <tr>
                <td class="label">Estado HTTP:</td>
                <td class="val"><span style="color: #ef4444; font-weight: bold;">${httpStatus ? `${httpStatus} (No disponible)` : 'Error de conexión / 404'}</span></td>
              </tr>
              <tr>
                <td class="label">Fecha:</td>
                <td class="val">${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</td>
              </tr>
            </table>

            <div style="font-size: 12px; font-weight: bold; color: #d6d3d1; margin-bottom: 6px;">URL no disponible:</div>
            <div class="url-box">${cleanUrl}</div>

            <p style="font-size: 12px; color: #d6d3d1; line-height: 1.5;">
              💡 <em>Puedes abrir SongBook como administrador, hacer clic en la Polaroid o CD y seleccionar una nueva foto desde el buscador multifuente integrado.</em>
            </p>
          </div>
          <div class="footer">
            Notificación enviada automáticamente a ${recipient} • SongBook System
          </div>
        </div>
      </body>
    </html>
  `;

  const transporter = createTransporter();

  if (!transporter) {
    console.log(`\n========================================================`);
    console.log(`📧 [ALERTA DE IMAGEN CAÍDA] Para: ${recipient}`);
    console.log(`📌 Asunto: ${subject}`);
    console.log(`🖼️ URL: ${cleanUrl}`);
    console.log(`💡 Para enviar correos reales por Gmail, añade en server/.env:`);
    console.log(`   SMTP_USER=tu_correo@gmail.com`);
    console.log(`   SMTP_PASS=tu_contraseña_de_aplicacion`);
    console.log(`   ADMIN_ALERT_EMAIL=gabothdev@gmail.com`);
    console.log(`========================================================\n`);
    return { sent: true, mode: 'console_logged', recipient };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"SongBook Alertas" <${process.env.SMTP_USER}>`,
      to: recipient,
      subject,
      html: htmlContent,
    });
    console.log(`[Mailer] Alerta enviada a ${recipient}: MessageID ${info.messageId}`);
    return { sent: true, mode: 'smtp', messageId: info.messageId };
  } catch (error) {
    console.error('[Mailer] Error enviando correo vía SMTP:', error);
    return { sent: false, error: error.message };
  }
}
