import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { globSync } from 'glob';
import path from 'path';
import fs from 'fs';

// Define the main entry points for our bundles
const entries = [
  // Background script
  {
    input: 'src/background/index.ts', // Changed to .ts
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
  },
  {
    input: 'src/models/sourceManager.js',
    output: {
      file: 'dist/models/sourceManager.js',
      format: 'esm',
    }
  },
  {
    input: 'src/models/configManager.js',
    output: {
      file: 'dist/models/configManager.js',
      format: 'esm',
    }
  },
  {
    input: 'src/models/contentProcessor.js',
    output: {
      file: 'dist/models/contentProcessor.js',
      format: 'esm',
    }
  },
  {
    input: 'src/app.js',
    output: {
      file: 'dist/app.js',
      format: 'esm',
    }
  },
  {
    input: 'src/controllers/contentController.js',
    output: {
      file: 'dist/controllers/contentController.js',
      format: 'esm',
    }
  }
];

// Base extractor - add separately
const baseExtractor = 'src/models/extractors/baseExtractor.js';
entries.push({
  input: baseExtractor,
  output: {
    file: `dist/models/extractors/baseExtractor.js`,
    format: 'esm',
  }
});

// Add notion extractors
const notionExtractors = globSync('src/models/extractors/notion/*.{js,ts}', { ignore: 'src/models/extractors/notion/index.{js,ts}' });
notionExtractors.forEach(file => {
  const name = path.basename(file).replace('.ts', '.js');
  entries.push({
    input: file,
    output: {
      file: `dist/models/extractors/notion/${name}`,
      format: 'esm',
    }
  });
});

// Add notion extractors index
entries.push({
  input: 'src/models/extractors/notion/index.ts',
  output: {
    file: 'dist/models/extractors/notion/index.js',
    format: 'esm',
  }
});

// Add markdown extractors
const markdownExtractors = globSync('src/models/extractors/markdown/*.{js,ts}', { ignore: 'src/models/extractors/markdown/index.{js,ts}' });
markdownExtractors.forEach(file => {
  const name = path.basename(file).replace('.ts', '.js');
  entries.push({
    input: file,
    output: {
      file: `dist/models/extractors/markdown/${name}`,
      format: 'esm',
    }
  });
});

// Add markdown extractors index
entries.push({
  input: 'src/models/extractors/markdown/index.ts',
  output: {
    file: 'dist/models/extractors/markdown/index.js',
    format: 'esm',
  }
});

// Separate entry for extractors index
entries.push({
  input: 'src/models/extractors/index.ts',
  output: {
    file: 'dist/models/extractors/index.js',
    format: 'esm',
  }
});

// Common utilities
entries.push({
  input: 'src/common/messaging.js',
  output: {
    file: 'dist/common/messaging.js',
    format: 'esm',
  }
});

// Services
entries.push({
  input: 'src/services/LoggingService.js',
  output: {
    file: 'dist/services/LoggingService.js',
    format: 'esm',
  }
});

entries.push({
  input: 'src/services/ErrorService.js',
  output: {
    file: 'dist/services/ErrorService.js',
    format: 'esm',
  }
});

entries.push({
  input: 'src/services/DependencyContainer.js',
  output: {
    file: 'dist/services/DependencyContainer.js',
    format: 'esm',
  }
});

entries.push({
  input: 'src/services/serviceRegistry.js',
  output: {
    file: 'dist/services/serviceRegistry.js',
    format: 'esm',
  }
});

// Version is now managed directly by the build script

// Apply plugins to each bundle
export default entries.map(entry => ({
  ...entry,
  plugins: [
    resolve(), // Resolve node_modules
    commonjs(), // Convert CommonJS modules to ES6
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true,
    }), // Transform TypeScript files
    {
      // Replace process.env.NODE_ENV with 'production' for production builds
      name: 'replace-env',
      transform(code) {
        return code.replace(/process\.env\.NODE_ENV/g, JSON.stringify('production'));
      }
    }
  ],
  // Chrome extensions don't need external dependencies bundled
  external: ['chrome'],
  onwarn(warning, warn) {
    // Suppress circular dependency warnings
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    warn(warning);
  }
}));