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
    res.status(503).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Muqabla - Starting Up</title></head>
        <body style="font-family: sans-serif; background: #0b101b; color: white; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <h2>⚡ Starting Muqabla Application...</h2>
            <p style="color: #94a3b8;">Initial build is finalizing. Please refresh this page in a few seconds.</p>
          </div>
        </body>
      </html>
    `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Muqabla application running on http://0.0.0.0:${PORT}`);
});
