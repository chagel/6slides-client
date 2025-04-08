import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { globSync } from 'glob';
import path from 'path';
import fs from 'fs';

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
  
  // App script (includes content script functionality)
  {
    input: 'src/app.ts',
    output: {
      file: 'dist/app.js',
      format: 'iife', // Immediately invoked function for content script context
      name: 'notionSlidesApp'
    }
  },
  
  // UI Controllers (popup, settings, about)
  {
    input: 'src/controllers/popup/index.ts',
    output: {
      file: 'dist/controllers/popup/index.js', 
      format: 'iife', // Regular script for popup
      name: 'notionSlidesPopup'
    }
  },
  // Settings controller removed - functionality moved to about/index.ts
  {
    input: 'src/controllers/about/index.ts',
    output: {
      file: 'dist/controllers/about/index.js',
      format: 'iife', // Regular script for about page
      name: 'notionSlidesAbout'
    }
  },
  {
    input: 'src/controllers/viewer/index.ts',
    output: {
      file: 'dist/controllers/viewer/index.js',
      format: 'iife', // Regular script for viewer
      name: 'notionSlidesViewer'
    }
  },
  {
    input: 'src/controllers/navigation.ts',
    output: {
      file: 'dist/controllers/navigation.js',
      format: 'iife', // Regular script for navigation
      name: 'notionSlidesNavigation'
    }
  },
  
  // Models and utilities
  {
    input: 'src/models/storage.ts',
    output: {
      file: 'dist/models/storage.js',
      format: 'esm', // ESM for imports
    }
  },
  {
    input: 'src/models/renderer.ts',
    output: {
      file: 'dist/models/renderer.js',
      format: 'esm',
    }
  },
  {
    input: 'src/models/content_extractor.ts',
    output: {
      file: 'dist/models/content_extractor.js',
      format: 'esm',
    }
  },
  {
    input: 'src/models/source_manager.ts',
    output: {
      file: 'dist/models/source_manager.js',
      format: 'esm',
    }
  },
  {
    input: 'src/models/config_manager.ts',
    output: {
      file: 'dist/models/config_manager.js',
      format: 'esm',
    }
  },
  {
    input: 'src/models/content_processor.ts',
    output: {
      file: 'dist/models/content_processor.js',
      format: 'esm',
    }
  },
  
  // Domain models
  {
    input: 'src/models/domain/index.ts',
    output: {
      file: 'dist/models/domain/index.js',
      format: 'esm',
    }
  },
  {
    input: 'src/models/domain/slide.ts',
    output: {
      file: 'dist/models/domain/slide.js',
      format: 'esm',
    }
  },
  {
    input: 'src/models/domain/presentation.ts',
    output: {
      file: 'dist/models/domain/presentation.js',
      format: 'esm',
    }
  },
  {
    input: 'src/controllers/content_controller.ts',
    output: {
      file: 'dist/controllers/content_controller.js',
      format: 'esm',
    }
  }
];

// Base extractor - add separately
const baseExtractor = 'src/models/extractors/base_extractor.ts';
entries.push({
  input: baseExtractor,
  output: {
    file: `dist/models/extractors/base_extractor.js`,
    format: 'esm',
  }
});

// Add notion extractors
const notionExtractors = globSync('src/models/extractors/notion/*.ts', { ignore: 'src/models/extractors/notion/index.ts' });
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
const markdownExtractors = globSync('src/models/extractors/markdown/*.ts', { ignore: 'src/models/extractors/markdown/index.ts' });
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

// Common utilities (removed messaging.ts, now a service)

// Data files
entries.push({
  input: 'src/assets/data/changelog.ts',
  output: {
    file: 'dist/assets/data/changelog.js',
    format: 'iife',
    name: 'changelog'
  }
});

// Services
entries.push({
  input: 'src/services/logging_service.ts',
  output: {
    file: 'dist/services/logging_service.js',
    format: 'esm',
  }
});

entries.push({
  input: 'src/services/error_service.ts',
  output: {
    file: 'dist/services/error_service.js',
    format: 'esm',
  }
});

entries.push({
  input: 'src/services/dependency_container.ts',
  output: {
    file: 'dist/services/dependency_container.js',
    format: 'esm',
  }
});

entries.push({
  input: 'src/services/messaging_service.ts',
  output: {
    file: 'dist/services/messaging_service.js',
    format: 'esm',
  }
});

entries.push({
  input: 'src/services/service_registry.ts',
  output: {
    file: 'dist/services/service_registry.js',
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