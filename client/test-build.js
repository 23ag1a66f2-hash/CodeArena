#!/usr/bin/env node

/**
 * Test build script for CodeArena client
 * Run this to verify the build process works locally
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing CodeArena client build process...\n');

try {
  // Check if we're in the right directory
  if (!fs.existsSync('package.json')) {
    throw new Error('package.json not found. Please run this script from the client directory.');
  }

  // Check if vite.config.ts exists
  if (!fs.existsSync('vite.config.ts')) {
    throw new Error('vite.config.ts not found. Please ensure the Vite configuration exists.');
  }

  console.log('✅ Configuration files found');

  // Clean previous build
  if (fs.existsSync('dist')) {
    console.log('🧹 Cleaning previous build...');
    fs.rmSync('dist', { recursive: true, force: true });
  }

  // Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit' });

  // Run build
  console.log('🔨 Building application...');
  execSync('npm run build', { stdio: 'inherit' });

  // Check build output
  if (fs.existsSync('dist')) {
    const files = fs.readdirSync('dist');
    console.log('\n✅ Build successful!');
    console.log(`📁 Output directory: dist/`);
    console.log(`📄 Files generated: ${files.length}`);
    console.log('\n📋 Build contents:');
    files.forEach(file => {
      const stats = fs.statSync(path.join('dist', file));
      console.log(`  - ${file} ${stats.isDirectory() ? '(dir)' : `(${Math.round(stats.size / 1024)}KB)`}`);
    });
  } else {
    throw new Error('Build failed: dist directory not created');
  }

} catch (error) {
  console.error('\n❌ Build test failed:', error.message);
  process.exit(1);
} 