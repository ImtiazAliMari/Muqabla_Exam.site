#!/bin/bash
# =======================================================================
# Hostinger Git Post-Deployment Script for Muqabla SPA
# =======================================================================
set -e

echo "🚀 [Hostinger Deployment] Starting automated build..."

# 1. Install dependencies cleanly
echo "📦 Installing npm dependencies..."
npm ci --prefer-offline --no-audit || npm install --no-audit

# 2. Build production assets with Vite
echo "⚙️ Building production bundle..."
npm run build

# 3. If running inside a custom subfolder on Hostinger (e.g. ~/git-repo),
# copy the built dist/ files into Hostinger's public_html directory if present.
if [ -d "../public_html" ] && [ "$(pwd)" != "$(readlink -f ../public_html)" ]; then
  echo "📂 Synchronizing dist/ to Hostinger public_html/..."
  rsync -av --delete dist/ ../public_html/
  echo "✅ Files successfully deployed to public_html!"
elif [ -d "dist" ]; then
  echo "✅ Build complete! Assets generated in ./dist"
  echo "ℹ️ If using Hostinger Document Root configuration, point your domain to the 'dist' folder."
fi

echo "🎉 [Hostinger Deployment] Deployment completed successfully!"
