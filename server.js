import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

// Fallback: If Hostinger did not run npm run build before launch, build synchronously
if (!existsSync(indexPath)) {
  console.log('⚡ [Hostinger Deploy] dist/index.html not found! Triggering vite build now...');
  try {
    execSync('npx vite build', { stdio: 'inherit' });
    console.log('✅ [Hostinger Deploy] Production build succeeded!');
  } catch (err) {
    console.error('❌ [Hostinger Deploy] Auto-build failed:', err);
  }
}

// Serve static assets from Vite's build directory (dist)
app.use(express.static(distPath));

// SPA fallback: Route all incoming requests to index.html
app.get('*', (req, res) => {
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Return an auto-refreshing loading screen (checks every 3 seconds until build completes)
    res.status(503).send(`
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
            }
            .card {
              text-align: center;
              padding: 2.5rem;
              background: rgba(15, 23, 42, 0.6);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 1.5rem;
              backdrop-filter: blur(16px);
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
              max-width: 420px;
              width: 90%;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid rgba(16, 185, 129, 0.2);
              border-top-color: #10b981;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 1.5rem;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            h2 {
              font-size: 1.25rem;
              font-weight: 700;
              margin: 0 0 0.5rem;
            }
            p {
              color: #94a3b8;
              font-size: 0.875rem;
              margin: 0;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h2>⚡ Starting Muqabla Application...</h2>
            <p>Initial build is finalizing on Hostinger. This page will auto-refresh in a few seconds.</p>
          </div>
          <script>
            setTimeout(function() {
              window.location.reload();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Muqabla application running on http://0.0.0.0:${PORT}`);
});
