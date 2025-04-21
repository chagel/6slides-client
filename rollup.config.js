import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import obfuscator from 'rollup-plugin-obfuscator';
import { nodeResolve } from '@rollup/plugin-node-resolve';

// Determine the environment and load env variables
const env = process.env.NODE_ENV || 'development';
console.log(`Rollup building for environment: ${env}`);

// Load environment variables from the appropriate .env file
const envResult = dotenv.config({ path: `.env.${env}` });

// Log whether env file was found or not
if (envResult.error) {
  console.warn(`Warning: Could not load .env.${env} file:`, envResult.error.message);
} else {
  console.log(`Successfully loaded environment from .env.${env}`);
}

// Define the main entry points for our bundles
const entries = [
  // Service worker
  {
    input: 'src/services/worker.ts',
    output: {
      file: 'dist/services/worker.js',
      format: 'iife',
      name: 'notionSlidesWorker'
    }
  },
  
  // App script
  {
    input: 'src/app.ts',
    output: {
      file: 'dist/app.js',
      format: 'iife',
      name: 'notionSlidesApp'
    }
  },
  
  // UI Controllers
  {
    input: 'src/controllers/popup/index.ts',
    output: {
      file: 'dist/controllers/popup/index.js', 
      format: 'iife',
      name: 'notionSlidesPopup'
    }
  },
  {
    input: 'src/controllers/about/index.ts',
    output: {
      file: 'dist/controllers/about/index.js',
      format: 'iife',
      name: 'notionSlidesAbout'
    }
  },
  {
    input: 'src/controllers/viewer/index.ts',
    output: {
      file: 'dist/controllers/viewer/index.js',
      format: 'iife',
      name: 'notionSlidesViewer'
    }
  }
];

// Configure the build based on environment
const isDevelopment = env === 'development';

// Apply plugins to each bundle
export default entries.map(entry => {
  // Clone the output config so we can modify it
  const output = { ...entry.output };
  
  // Add sourcemaps in development mode
  if (isDevelopment) {
    output.sourcemap = true;
  }
  
  return {
    ...entry,
    output,
    plugins: [
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        sourceMap: isDevelopment, // Only generate source maps in development
      }),
      nodeResolve(),
      json(),
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(env), // Use our local env variable to ensure it's consistent
          'process.env.API_URL': JSON.stringify(process.env.API_URL || ''),
          'process.env.WEB_URL': JSON.stringify(process.env.WEB_URL || ''),
          'process.env.OAUTH_CLIENT_ID': JSON.stringify(process.env.OAUTH_CLIENT_ID || ''),
          // Add a general debug flag based on environment
          'process.env.IS_DEVELOPMENT': JSON.stringify(isDevelopment),
          // Add a timestamp for cache busting in development
          'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
          // Add the version from package.json
          'process.env.EXTENSION_VERSION': JSON.stringify(process.env.npm_package_version || ''),
        }
      }),
      // Minify with Terser in production
      !isDevelopment && terser({
        compress: {
          drop_console: true, // Remove console statements
          drop_debugger: true, // Remove debugger statements
          pure_funcs: ['console.debug', 'console.log', 'console.info'] // Remove specific console functions
        }
      }),
      // Obfuscate code in production only (not in development)
      !isDevelopment && 
      obfuscator({
        options: entry.input.includes('worker.ts') ? 
        // Service worker obfuscation settings - more conservative to avoid window references
        {
          compact: true,
          controlFlowFlattening: false, // Disable for service workers
          deadCodeInjection: false, // Disable for service workers
          debugProtection: false, // Disable for service workers
          debugProtectionInterval: 0, // Set to 0 instead of false
          disableConsoleOutput: false, // Keep console output for service workers
          identifierNamesGenerator: 'hexadecimal',
          log: false,
          numbersToExpressions: false, // Disable complex transformations
          renameGlobals: false,
          selfDefending: false, // Disable for service workers
          simplify: true,
          splitStrings: false, // Disable for service workers
          stringArray: false, // Disable string array transformations that may use window
          transformObjectKeys: false, // Disable for service workers
          unicodeEscapeSequence: false
        } : 
        // UI code obfuscation settings - more aggressive (for code that has window access)
        {
          compact: true,
          controlFlowFlattening: true,
          controlFlowFlatteningThreshold: 0.5,
          deadCodeInjection: true,
          deadCodeInjectionThreshold: 0.3,
          debugProtection: true,
          debugProtectionInterval: 1000,
          disableConsoleOutput: true,
          identifierNamesGenerator: 'hexadecimal',
          log: false,
          numbersToExpressions: true,
          renameGlobals: false,
          selfDefending: true,
          simplify: true,
          splitStrings: true,
          splitStringsChunkLength: 5,
          stringArray: true,
          stringArrayCallsTransform: true,
          stringArrayEncoding: ['rc4'],
          stringArrayIndexShift: true,
          stringArrayRotate: true,
          stringArrayShuffle: true,
          stringArrayWrappersCount: 5,
          stringArrayWrappersChainedCalls: true,
          stringArrayWrappersParametersMaxCount: 5,
          stringArrayWrappersType: 'function',
          stringArrayThreshold: 0.8,
          transformObjectKeys: true,
          unicodeEscapeSequence: false
        }
      })
    ].filter(Boolean),
    external: ['chrome'],
    // Ensure globals for externals are properly defined
    globals: {
      chrome: 'chrome'
    },
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') return;
      warn(warning);
    }
  };
});
