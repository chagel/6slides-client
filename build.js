/**
 * Notion to Slides - Build Script
 * 
 * Build script to bundle modular code using Rollup
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

// Read package.json to get version
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const VERSION = packageJson.version;

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

// Copy static files excluding those that will be bundled
function copyStaticFiles() {
  // Copy manifest.json from src directory and update version
  const manifestPath = path.join(SRC_DIR, 'manifest.json');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  const updatedManifest = manifestContent.replace(
    /"version":\s*"[^"]+"/,
    `"version": "${VERSION}"`
  );
  fs.writeFileSync(path.join(DIST_DIR, 'manifest.json'), updatedManifest);
  
  // Copy HTML files from src/views to dist root
  const viewsDir = path.join(SRC_DIR, 'views');
  const htmlFiles = fs.readdirSync(viewsDir).filter(file => file.endsWith('.html'));
  
  for (const file of htmlFiles) {
    fs.copyFileSync(path.join(viewsDir, file), path.join(DIST_DIR, file));
  }
  
  // Copy models/extractors - these will be imported by the bundled modules
  const extractorsDir = path.join(SRC_DIR, 'models', 'extractors');
  const extractorsDestDir = path.join(DIST_DIR, 'models', 'extractors');
  
  if (!fs.existsSync(extractorsDestDir)) {
    fs.mkdirSync(extractorsDestDir, { recursive: true });
  }
  
  const extractorFiles = fs.readdirSync(extractorsDir);
  for (const file of extractorFiles) {
    fs.copyFileSync(path.join(extractorsDir, file), path.join(extractorsDestDir, file));
  }
  
  // Copy icons directory
  copyFiles(path.join(__dirname, 'icons'), path.join(DIST_DIR, 'icons'));
  
  // Copy lib directory
  copyFiles(path.join(__dirname, 'lib'), path.join(DIST_DIR, 'lib'));
}

// Run rollup to bundle JavaScript modules
function runRollup() {
  return new Promise((resolve, reject) => {
    const rollup = spawn('npx', ['rollup', '-c']);
    
    rollup.stdout.on('data', (data) => {
      console.log(`${data}`);
    });
    
    rollup.stderr.on('data', (data) => {
      console.error(`${data}`);
    });
    
    rollup.on('close', (code) => {
      if (code === 0) {
        console.log('Rollup bundling complete');
        resolve();
      } else {
        console.error(`Rollup process exited with code ${code}`);
        reject(new Error(`Rollup failed with code ${code}`));
      }
    });
  });
}

// Update HTML files to use bundled scripts and update version
function updateHtmlFiles() {
  // Get all HTML files in dist directory
  const htmlFiles = fs.readdirSync(DIST_DIR).filter(file => file.endsWith('.html'));
  
  for (const htmlFile of htmlFiles) {
    const filePath = path.join(DIST_DIR, htmlFile);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace module scripts with regular scripts
    content = content.replace(
      /<script type="module" src="([^"]+)"><\/script>/g,
      '<script src="$1"></script>'
    );
    
    // Update version placeholders
    content = content.replace(
      /\{\{VERSION\}\}/g, 
      `v${VERSION}`
    );
    
    // Update version without 'v' prefix
    content = content.replace(
      /\{\{VERSION_NO_V\}\}/g, 
      VERSION
    );
    
    fs.writeFileSync(filePath, content);
  }
  
  // No need to update version.js - we're replacing versions directly in HTML files
}

// Main build function
async function build() {
  console.log('Building Notion Slides extension...');
  
  // Clean dist directory
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(DIST_DIR);
  
  // Copy static files
  copyStaticFiles();
  
  // Bundle JavaScript modules with Rollup
  try {
    await runRollup();
    
    // Update HTML files to use bundled scripts
    updateHtmlFiles();
    
    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run build
build();