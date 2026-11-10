import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { Readable } from 'stream';

// Guard against headless container environments (Hostinger/Docker) where stdin throws EEXIST
try {
  const dummyStdin = new Readable({ read() {} });
  Object.defineProperty(process, 'stdin', {
    value: dummyStdin,
    configurable: true,
    writable: true,
  });
} catch (_) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

let isBuilding = false;
let buildError = null;
let buildComplete = existsSync(indexPath);

async function startBackgroundBuild() {
  if (buildComplete || isBuilding) return;
  isBuilding = true;
  console.log('⚡ [Hostinger] Starting background Vite build...');
  try {
    const { build: viteBuild } = await import('vite');
    await viteBuild();
    buildComplete = true;
    buildError = null;
    console.log('✅ [Hostinger] Vite build completed successfully!');
  } catch (err) {
    buildError = err?.stack || err?.message || String(err);
    console.error('❌ [Hostinger] Vite build failed:', buildError);
  } finally {
    isBuilding = false;
  }
}

// 1. Immediately start listening so Hostinger reverse proxy never gets 503
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Muqabla server listening immediately on port ${PORT}`);
  if (!buildComplete) {
    startBackgroundBuild();
  }
});

// Dynamic static handler (once built, serves static files from dist)
app.use((req, res, next) => {
  if (buildComplete && existsSync(distPath)) {
    return express.static(distPath)(req, res, next);
  }
  next();
});

// SPA fallback & status router
app.get('*', (req, res) => {
  if (buildComplete && existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  // Return status 200 with auto-refresh so Hostinger does not treat it as an error
  res.status(200).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="refresh" content="3">
        <title>Muqabla - Launching</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #0b101b;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 1.5rem;
            box-sizing: border-box;
          }
          .card {
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 1.25rem;
            padding: 2.25rem;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
          }
          .spinner {
            width: 44px;
            height: 44px;
            border: 3px solid rgba(16, 185, 129, 0.2);
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1.25rem;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          h2 { margin: 0 0 0.5rem; font-size: 1.3rem; font-weight: 700; color: #f8fafc; }
          p { color: #94a3b8; font-size: 0.9rem; margin: 0 0 1rem; line-height: 1.5; }
          .error-box { background: #1e1b2e; border: 1px solid #ef4444; color: #fca5a5; text-align: left; padding: 1rem; border-radius: 0.75rem; font-size: 12px; overflow-x: auto; white-space: pre-wrap; margin-top: 1rem; }
          .btn { background: #10b981; color: #000; border: none; padding: 0.6rem 1.2rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; margin-top: 1rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="spinner"></div>
          <h2>⚡ Finalizing Muqabla Application...</h2>
          <p>Compiling assets for first-time launch. This page will refresh automatically in 3 seconds.</p>
          ${buildError ? `<div class="error-box"><strong>Build Diagnostic:</strong>\n${buildError}</div><button class="btn" onclick="location.reload()">Retry Now</button>` : ''}
        </div>
      </body>
    </html>
  `);
});
