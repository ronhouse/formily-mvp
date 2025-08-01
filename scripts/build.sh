#!/bin/bash

# Build the client first
echo "Building client application..."
vite build

# Build the server
echo "Building server application..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server

# Copy client build files to where the server expects them
echo "Copying client files to server public directory..."
mkdir -p dist/server
cp -r dist/public dist/server/

# Verify build completed successfully
if [ -f "dist/server/index.js" ] && [ -f "dist/server/public/index.html" ]; then
    echo "✅ Build completed successfully!"
    echo "📁 Server: dist/server/index.js"
    echo "📁 Client: dist/server/public/"
else
    echo "❌ Build failed - missing expected files"
    exit 1
fi