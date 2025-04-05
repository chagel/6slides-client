/**
 * Notion to Slides - Build Script
 * 
 * Simple build script to bundle modular code
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Source and destination directories
const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR);
}

// Copy files from src to dist
function copyFiles(sourceDir, destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const files = fs.readdirSync(sourceDir);
  
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      copyFiles(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// Copy files with exclusions
function copyFilesWithExclusions(sourceDir, destDir, excludeDirs = []) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  const files = fs.readdirSync(sourceDir);
  
  for (const file of files) {
    const sourcePath = path.join(sourceDir, file);
    const destPath = path.join(destDir, file);
    
    const stats = fs.statSync(sourcePath);
    
    if (stats.isDirectory()) {
      // Skip excluded directories
      if (excludeDirs.includes(file)) {
        console.log(`Skipping excluded directory: ${file}`);
        continue;
      }
      copyFilesWithExclusions(sourcePath, destPath, excludeDirs);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// Bundle modules
function bundleModules() {
  // TODO: Replace with proper bundling using Webpack/Rollup
  
  // Copy source files with custom handling
  copyFilesWithExclusions(SRC_DIR, DIST_DIR, ['views']);
}

// Copy static files
function copyStaticFiles() {
  // Copy HTML files from src/views to dist root
  const htmlFiles = ['popup.html', 'viewer.html', 'settings.html', 'about.html', 'sidebar-template.html'];
  for (const file of htmlFiles) {
    fs.copyFileSync(path.join(__dirname, 'src', 'views', file), path.join(DIST_DIR, file));
  }
  
  // Copy manifest.json from src directory
  fs.copyFileSync(path.join(__dirname, 'src', 'manifest.json'), path.join(DIST_DIR, 'manifest.json'));
  
  // Copy icons directory
  copyFiles(path.join(__dirname, 'icons'), path.join(DIST_DIR, 'icons'));
  
  // Copy lib directory
  copyFiles(path.join(__dirname, 'lib'), path.join(DIST_DIR, 'lib'));
}

// Main build function
function build() {
  console.log('Building Notion Slides extension...');
  
  // Clean dist directory
  if (fs.existsSync(DIST_DIR)) {
    // Use fs.rm instead of fs.rmdir (fixes deprecation warning)
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR);
  
  // Bundle modules
  bundleModules();
  
  // Copy static files
  copyStaticFiles();
  
  console.log('Build complete!');
}

// Run build
build();