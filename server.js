import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { build as viteBuild } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');
let buildError = null;

// Programmatic build using Vite's internal Node.js API (no shell or npm command required)
if (!existsSync(indexPath)) {
  console.log('⚡ [Hostinger Deploy] dist/index.html not found. Building with Vite programmatic API...');
  try {
    await viteBuild();
    console.log('✅ [Hostinger Deploy] Production build generated successfully!');
  } catch (err) {
    buildError = err?.stack || err?.message || String(err);
    console.error('❌ [Hostinger Deploy] Programmatic build failed:', buildError);
  }
}

// Serve static assets from Vite's build directory (dist)
app.use(express.static(distPath));

// SPA fallback: Route all incoming requests to index.html
app.get('*', async (req, res) => {
  if (existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }

  // If still not built, try building one more time
  try {
    await viteBuild();
    if (existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  } catch (err) {
    buildError = err?.stack || err?.message || String(err);
  }

  res.status(500).send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="refresh" content="5">
        <title>Muqabla - Build Status</title>
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
            padding: 1rem;
            box-sizing: border-box;
          }
          .card {
            background: rgba(15, 23, 42, 0.8);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 1.5rem;
            padding: 2rem;
            max-width: 500px;
            width: 100%;
            text-align: center;
          }
          .spinner {
            width: 36px;
            height: 36px;
            border: 3px solid rgba(16, 185, 129, 0.2);
            border-top-color: #10b981;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          h2 { margin: 0 0 0.5rem; font-size: 1.25rem; }
          p { color: #94a3b8; font-size: 0.875rem; margin: 0 0 1rem; line-height: 1.5; }
          pre { background: #000; color: #f87171; text-align: left; padding: 0.75rem; border-radius: 0.5rem; font-size: 11px; overflow-x: auto; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="spinner"></div>
          <h2>⚡ Initializing Muqabla Application...</h2>
          <p>The production bundle is compiling on Hostinger. Please wait a moment...</p>
          ${buildError ? `<pre>${buildError}</pre>` : ''}
        </div>
      </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Muqabla application running on http://0.0.0.0:${PORT}`);
});
