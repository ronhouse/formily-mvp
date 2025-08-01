#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Checking deployment configuration...\n');

// Check if client build exists
const clientBuildPath = path.resolve(rootDir, 'dist/public');
const serverExpectedPath = path.resolve(rootDir, 'dist/server/public');
const serverIndexPath = path.resolve(rootDir, 'dist/server/index.js');

let hasErrors = false;

// 1. Check client build
if (!fs.existsSync(clientBuildPath)) {
  console.error('❌ Client build not found at:', clientBuildPath);
  console.error('   Run: npm run build\n');
  hasErrors = true;
} else {
  console.log('✅ Client build found at:', clientBuildPath);
  
  // Check if index.html exists
  const indexHtmlPath = path.resolve(clientBuildPath, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error('❌ index.html missing from client build');
    hasErrors = true;
  } else {
    console.log('✅ index.html found in client build');
  }
}

// 2. Check server build
if (!fs.existsSync(serverIndexPath)) {
  console.error('❌ Server build not found at:', serverIndexPath);
  console.error('   Run: npm run build\n');
  hasErrors = true;
} else {
  console.log('✅ Server build found at:', serverIndexPath);
}

// 3. Check if client files are where server expects them
if (!fs.existsSync(serverExpectedPath)) {
  console.warn('⚠️  Client files not found where server expects them');
  console.warn('   Expected:', serverExpectedPath);
  console.warn('   Actual:', clientBuildPath);
  
  if (fs.existsSync(clientBuildPath)) {
    console.log('🔧 Copying client files to expected location...');
    try {
      // Create directory if it doesn't exist
      fs.mkdirSync(path.dirname(serverExpectedPath), { recursive: true });
      
      // Copy files
      copyDirectory(clientBuildPath, serverExpectedPath);
      console.log('✅ Client files copied successfully');
    } catch (error) {
      console.error('❌ Failed to copy client files:', error.message);
      hasErrors = true;
    }
  }
} else {
  console.log('✅ Client files found where server expects them:', serverExpectedPath);
}

// 4. Check environment variables for production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['DATABASE_URL', 'STRIPE_SECRET_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    hasErrors = true;
  } else {
    console.log('✅ Required environment variables present');
  }
}

// 5. Check package.json scripts
const packageJsonPath = path.resolve(rootDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const scripts = packageJson.scripts || {};
  
  if (!scripts.build) {
    console.error('❌ Missing build script in package.json');
    hasErrors = true;
  } else {
    console.log('✅ Build script found in package.json');
  }
  
  if (!scripts.start) {
    console.error('❌ Missing start script in package.json');
    hasErrors = true;
  } else {
    console.log('✅ Start script found in package.json');
  }
}

if (hasErrors) {
  console.log('\n❌ Deployment check failed. Please fix the issues above.');
  process.exit(1);
} else {
  console.log('\n✅ All deployment checks passed! Ready to deploy.');
  process.exit(0);
}

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