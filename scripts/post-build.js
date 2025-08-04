import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy directory function
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source directory does not exist: ${src}`);
    return;
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
}

// Main post-build process
function postBuild() {
  const rootDir = path.resolve(__dirname, '..');
  const clientBuildDir = path.join(rootDir, 'dist', 'public');
  const serverPublicDir = path.join(rootDir, 'dist', 'server', 'public');

  console.log('Starting post-build process...');
  console.log(`Copying client files from ${clientBuildDir} to ${serverPublicDir}`);

  if (!fs.existsSync(clientBuildDir)) {
    console.error(`Client build directory not found: ${clientBuildDir}`);
    console.error('Make sure to run the client build first');
    process.exit(1);
  }

  try {
    copyDirectory(clientBuildDir, serverPublicDir);
    console.log('✅ Successfully copied client files to server public directory');
  } catch (error) {
    console.error('❌ Error copying client files:', error);
    process.exit(1);
  }
}

// Run the post-build process
postBuild();