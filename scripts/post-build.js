#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('🔧 Running post-build steps...');

// Copy client build files to where server expects them
const clientBuildPath = path.resolve(rootDir, 'dist/public');
const serverExpectedPath = path.resolve(rootDir, 'dist/server/public');

if (fs.existsSync(clientBuildPath)) {
  // Ensure server directory exists
  fs.mkdirSync(path.dirname(serverExpectedPath), { recursive: true });
  
  // Copy files
  copyDirectory(clientBuildPath, serverExpectedPath);
  console.log('✅ Client files copied to server public directory');
  
  // Verify critical files exist
  const indexHtmlPath = path.resolve(serverExpectedPath, 'index.html');
  if (fs.existsSync(indexHtmlPath)) {
    console.log('✅ index.html verified in server public directory');
  } else {
    console.error('❌ index.html missing after copy');
    process.exit(1);
  }
} else {
  console.error('❌ Client build not found at:', clientBuildPath);
  console.error('   Make sure client build completed successfully');
  process.exit(1);
}

console.log('🎉 Post-build steps completed successfully!');

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}