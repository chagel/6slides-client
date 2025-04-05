import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { globSync } from 'glob';
import path from 'path';

// Define the main entry points for our bundles
const entries = [
  // Background script
  {
    input: 'src/background/index.js',
    output: {
      file: 'dist/background/index.js',
      format: 'esm', // Service worker supports ES modules
    }
  },
  
  // Content script (consolidated)
  {
    input: 'src/content/entry.js',
    output: {
      file: 'dist/content/entry.js',
      format: 'iife', // Immediately invoked function for content script context
      name: 'notionSlidesContent'
    }
  },
  
  // UI Controllers (popup, settings)
  {
    input: 'src/controllers/popup/index.js',
    output: {
      file: 'dist/controllers/popup/index.js', 
      format: 'iife', // Regular script for popup
      name: 'notionSlidesPopup'
    }
  },
  {
    input: 'src/controllers/settings/index.js',
    output: {
      file: 'dist/controllers/settings/index.js',
      format: 'iife', // Regular script for settings
      name: 'notionSlidesSettings'
    }
  },
  {
    input: 'src/controllers/viewer/index.js',
    output: {
      file: 'dist/controllers/viewer/index.js',
      format: 'iife', // Regular script for viewer
      name: 'notionSlidesViewer'
    }
  },
  {
    input: 'src/controllers/navigation.js',
    output: {
      file: 'dist/controllers/navigation.js',
      format: 'iife', // Regular script for navigation
      name: 'notionSlidesNavigation'
    }
  },
  
  // Models and utilities
  {
    input: 'src/models/storage.js',
    output: {
      file: 'dist/models/storage.js',
      format: 'esm', // ESM for imports
    }
  },
  {
    input: 'src/models/renderer.js',
    output: {
      file: 'dist/models/renderer.js',
      format: 'esm',
    }
  },
  {
    input: 'src/models/contentExtractor.js',
    output: {
      file: 'dist/models/contentExtractor.js',
      format: 'esm',
    }
  }
];

// Extractors need to be bundled separately as they are dynamically loaded
const extractors = globSync('src/models/extractors/*.js', { ignore: 'src/models/extractors/index.js' });
extractors.forEach(file => {
  const name = path.basename(file);
  entries.push({
    input: file,
    output: {
      file: `dist/models/extractors/${name}`,
      format: 'esm',
    }
  });
});

// Separate entry for extractors index
entries.push({
  input: 'src/models/extractors/index.js',
  output: {
    file: 'dist/models/extractors/index.js',
    format: 'esm',
  }
});

// Common utilities
entries.push({
  input: 'src/common/utils.js',
  output: {
    file: 'dist/common/utils.js',
    format: 'esm',
  }
});

entries.push({
  input: 'src/common/messaging.js',
  output: {
    file: 'dist/common/messaging.js',
    format: 'esm',
  }
});

// Version is now managed directly by the build script

// Apply plugins to each bundle
export default entries.map(entry => ({
  ...entry,
  plugins: [
    resolve(), // Resolve node_modules
    commonjs() // Convert CommonJS modules to ES6
  ],
  // Chrome extensions don't need external dependencies bundled
  external: ['chrome'],
  onwarn(warning, warn) {
    // Suppress circular dependency warnings
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    warn(warning);
  }
}));