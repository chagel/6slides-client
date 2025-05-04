/**
 * Six Slides - Build Script
 * 
 * Build script to bundle modular code using Rollup
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import dotenv from 'dotenv';

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
  // Copy manifest.json from src directory and update version from package.json
  const manifestPath = path.join(SRC_DIR, 'manifest.json');
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  
  // Use VERSION from package.json (already defined at the top of the file)
  const updatedManifest = manifestContent.replace(
    /"version":\s*"[^"]+"/,
    `"version": "${VERSION}"`
  );
  
  // Log that we're updating the version
  console.log(`Setting extension version to ${VERSION} in manifest.json`);
  
  // Write the updated manifest to the dist directory
  fs.writeFileSync(path.join(DIST_DIR, 'manifest.json'), updatedManifest);
  
  // Copy HTML files from src/views to dist root
  const viewsDir = path.join(SRC_DIR, 'views');
  const htmlFiles = fs.readdirSync(viewsDir).filter(file => file.endsWith('.html'));
  
  for (const file of htmlFiles) {
    fs.copyFileSync(path.join(viewsDir, file), path.join(DIST_DIR, file));
  }
  
  // Copy components directory
  const componentsDir = path.join(SRC_DIR, 'views', 'components');
  const componentsDestDir = path.join(DIST_DIR, 'components');
  
  if (fs.existsSync(componentsDir)) {
    copyFiles(componentsDir, componentsDestDir);
  }
  
  // Create directories for services
  const servicesDestDir = path.join(DIST_DIR, 'services');
  if (!fs.existsSync(servicesDestDir)) {
    fs.mkdirSync(servicesDestDir, { recursive: true });
  }
  
  // Create directories for models and all subdirectories
  const modelsDestDir = path.join(DIST_DIR, 'models');
  if (!fs.existsSync(modelsDestDir)) {
    fs.mkdirSync(modelsDestDir, { recursive: true });
  }
  
  // Create directories for domain models
  const domainDestDir = path.join(DIST_DIR, 'models', 'domain');
  if (!fs.existsSync(domainDestDir)) {
    fs.mkdirSync(domainDestDir, { recursive: true });
  }
  
  // Create directories for extractors
  const extractorsDestDir = path.join(DIST_DIR, 'models', 'extractors');
  if (!fs.existsSync(extractorsDestDir)) {
    fs.mkdirSync(extractorsDestDir, { recursive: true });
  }
  
  // Create directories for notion extractors
  const notionExtractorsDir = path.join(DIST_DIR, 'models', 'extractors', 'notion');
  if (!fs.existsSync(notionExtractorsDir)) {
    fs.mkdirSync(notionExtractorsDir, { recursive: true });
  }
  
  // Create directories for markdown extractors
  const markdownExtractorsDir = path.join(DIST_DIR, 'models', 'extractors', 'markdown');
  if (!fs.existsSync(markdownExtractorsDir)) {
    fs.mkdirSync(markdownExtractorsDir, { recursive: true });
  }
  
  // Create directories for controllers
  const controllersDestDir = path.join(DIST_DIR, 'controllers');
  if (!fs.existsSync(controllersDestDir)) {
    fs.mkdirSync(controllersDestDir, { recursive: true });
  }
  
  // Models directory structure is now created by Rollup
  // We don't need to copy TypeScript source files manually
  
  // Icons are now in src/assets/icons - no need to copy them separately
  
  // Copy lib directory
  copyFiles(path.join(__dirname, 'lib'), path.join(DIST_DIR, 'lib'));
  
  // Copy assets directory (for CSS files)
  copyFiles(path.join(SRC_DIR, 'assets'), path.join(DIST_DIR, 'assets'));
}

// Run rollup to bundle JavaScript modules
function runRollup() {
  return new Promise((resolve, reject) => {
    // Determine environment from command line 
    const nodeEnv = process.env.NODE_ENV || 'production';
    console.log(`Building for environment: ${nodeEnv}`);
    
    // Load environment variables from the correct .env file
    dotenv.config({ path: `.env.${nodeEnv}` });
    
    // Create environment variables for the Rollup process
    // This ensures the dotenv variables are passed to the Rollup process
    const env = { 
      ...process.env,
      NODE_ENV: nodeEnv,
      API_URL: process.env.API_URL,
      WEB_URL: process.env.WEB_URL,
      // Pass the version from package.json to make it available in the code
      EXTENSION_VERSION: VERSION
    };
    
    // Log the URLs being used (without sensitive data)
    console.log(`Using API_URL: ${env.NODE_ENV}`);
    console.log(`Using API_URL: ${env.API_URL}`);
    console.log(`Using WEB_URL: ${env.WEB_URL}`);
    
    const rollup = spawn('npx', ['rollup', '-c'], { env });
    
    // Capture output but don't show it unless there's an error
    let stdoutBuffer = '';
    let stderrBuffer = '';
    
    rollup.stdout.on('data', (data) => {
      stdoutBuffer += data.toString();
    });
    
    rollup.stderr.on('data', (data) => {
      stderrBuffer += data.toString();
    });
    
    rollup.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        // Only show output on error
        if (stdoutBuffer) console.log(stdoutBuffer);
        if (stderrBuffer) console.error(stderrBuffer);
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
  // Use QUIET_BUILD=true for CI/production builds with no output
  const quietBuild = process.env.QUIET_BUILD === 'true';
  
  // Get NODE_ENV from command line arguments or process.env
  // Find the --env=xxx argument if it exists
  const envArg = process.argv.find(arg => arg.startsWith('--env='));
  if (envArg) {
    // Extract the environment name after the equals sign
    const envValue = envArg.split('=')[1];
    // Set it in process.env
    process.env.NODE_ENV = envValue;
  }
  
  const nodeEnv = process.env.NODE_ENV || 'production';
  
  if (!quietBuild) {
    console.log(`Building Six Slides extension v${VERSION} for ${nodeEnv} environment...`);
  }
  
  // Clean dist directory
  console.log('Cleaning dist directory for a fresh build...');
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
    console.log('Previous dist directory removed');
  }
  fs.mkdirSync(DIST_DIR);
  console.log('Created fresh dist directory');
  
  // Copy static files
  copyStaticFiles();
  
  // Bundle JavaScript modules with Rollup
  try {
    await runRollup();
    
    // Update HTML files to use bundled scripts
    updateHtmlFiles();
    
    if (!quietBuild) {
      console.log(`Build complete for ${nodeEnv} environment!`);
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Run build
build();
