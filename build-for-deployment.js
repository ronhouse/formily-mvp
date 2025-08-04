#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy directory function
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`❌ Source directory does not exist: ${src}`);
    return false;
  }
  
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
  return true;
}

// Main build process for deployment
function buildForDeployment() {
  console.log('🚀 Starting complete build process for deployment...');
  
  const rootDir = path.resolve(__dirname);
  const clientBuildDir = path.join(rootDir, 'dist', 'public');
  const serverPublicDir = path.join(rootDir, 'dist', 'server', 'public');

  try {
    // Step 1: Clean previous builds
    console.log('🧹 Cleaning previous builds...');
    if (fs.existsSync(path.join(rootDir, 'dist'))) {
      fs.rmSync(path.join(rootDir, 'dist'), { recursive: true, force: true });
    }

    // Step 2: Build client (Vite)
    console.log('⚛️  Building client application...');
    execSync('vite build', { 
      stdio: 'inherit',
      cwd: rootDir 
    });

    // Step 3: Build server (esbuild)
    console.log('🖥️  Building server application...');
    execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/server', { 
      stdio: 'inherit',
      cwd: rootDir 
    });

    // Step 4: Copy client files to server public directory
    console.log('📁 Copying client files to server public directory...');
    console.log(`   From: ${clientBuildDir}`);
    console.log(`   To: ${serverPublicDir}`);

    if (!fs.existsSync(clientBuildDir)) {
      throw new Error(`Client build directory not found: ${clientBuildDir}`);
    }

    const copySuccess = copyDirectory(clientBuildDir, serverPublicDir);
    if (!copySuccess) {
      throw new Error('Failed to copy client files to server directory');
    }

    // Step 5: Verify the build
    console.log('✅ Verifying build outputs...');
    
    const serverIndexExists = fs.existsSync(path.join(rootDir, 'dist', 'server', 'index.js'));
    const clientIndexExists = fs.existsSync(path.join(serverPublicDir, 'index.html'));
    
    if (!serverIndexExists) {
      throw new Error('Server build failed: dist/server/index.js not found');
    }
    
    if (!clientIndexExists) {
      throw new Error('Client files copy failed: dist/server/public/index.html not found');
    }

    console.log('🎉 Build completed successfully!');
    console.log('📦 Build outputs:');
    console.log(`   ✅ Server: dist/server/index.js`);
    console.log(`   ✅ Client: dist/server/public/`);
    console.log('');
    console.log('🚀 Ready for deployment! Run: NODE_ENV=production node dist/server/index.js');

  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build process
buildForDeployment();