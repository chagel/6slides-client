import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';
import dotenv from 'dotenv';
import json from '@rollup/plugin-json';
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
      format: 'esm', // Service worker supports ES modules
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
          // Add a general debug flag based on environment
          'process.env.IS_DEVELOPMENT': JSON.stringify(isDevelopment),
          // Add a timestamp for cache busting in development
          'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
          // Add the version from package.json
          'process.env.EXTENSION_VERSION': JSON.stringify(process.env.npm_package_version || ''),
        }
      })
    ],
    external: ['chrome'],
    onwarn(warning, warn) {
      if (warning.code === 'CIRCULAR_DEPENDENCY') return;
      warn(warning);
    }
  };
});
