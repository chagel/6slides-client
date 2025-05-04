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
  },
  
  // Models
  {
    input: 'src/models/storage.ts',
    output: {
      file: 'dist/models/storage.js',
      format: 'es',
      name: 'storage'
    }
  },
  {
    input: 'src/models/renderer.ts',
    output: {
      file: 'dist/models/renderer.js',
      format: 'es',
      name: 'renderer'
    }
  },
  {
    input: 'src/models/content_processor.ts',
    output: {
      file: 'dist/models/content_processor.js',
      format: 'es',
      name: 'contentProcessor'
    }
  },
  {
    input: 'src/models/config_manager.ts',
    output: {
      file: 'dist/models/config_manager.js',
      format: 'es',
      name: 'configManager'
    }
  },
  {
    input: 'src/models/pdf_exporter.ts', 
    output: {
      file: 'dist/models/pdf_exporter.js',
      format: 'es',
      name: 'pdfExporter'
    }
  },
  
  // Domain models
  {
    input: 'src/models/domain/config.ts',
    output: {
      file: 'dist/models/domain/config.js',
      format: 'es',
      name: 'config'
    }
  },
  {
    input: 'src/models/domain/presentation.ts',
    output: {
      file: 'dist/models/domain/presentation.js',
      format: 'es',
      name: 'presentation'
    }
  },
  {
    input: 'src/models/domain/slide.ts',
    output: {
      file: 'dist/models/domain/slide.js',
      format: 'es',
      name: 'slide'
    }
  },
  {
    input: 'src/models/domain/types.ts',
    output: {
      file: 'dist/models/domain/types.js',
      format: 'es',
      name: 'domainTypes'
    }
  },
  
  // Extractors
  {
    input: 'src/models/extractors/base_extractor.ts',
    output: {
      file: 'dist/models/extractors/base_extractor.js',
      format: 'es',
      name: 'baseExtractor'
    }
  },
  // Notion Extractors
  {
    input: 'src/models/extractors/notion/notion_extractor.ts',
    output: {
      file: 'dist/models/extractors/notion/notion_extractor.js',
      format: 'es',
      name: 'notionExtractor'
    }
  },
  {
    input: 'src/models/extractors/notion/blockquote_extractor.ts',
    output: {
      file: 'dist/models/extractors/notion/blockquote_extractor.js',
      format: 'es',
      name: 'blockquoteExtractor'
    }
  },
  {
    input: 'src/models/extractors/notion/code_block_extractor.ts',
    output: {
      file: 'dist/models/extractors/notion/code_block_extractor.js',
      format: 'es',
      name: 'codeBlockExtractor'
    }
  },
  {
    input: 'src/models/extractors/notion/heading_extractor.ts',
    output: {
      file: 'dist/models/extractors/notion/heading_extractor.js',
      format: 'es',
      name: 'headingExtractor'
    }
  },
  {
    input: 'src/models/extractors/notion/image_extractor.ts',
    output: {
      file: 'dist/models/extractors/notion/image_extractor.js',
      format: 'es',
      name: 'imageExtractor'
    }
  },
  {
    input: 'src/models/extractors/notion/list_extractor.ts',
    output: {
      file: 'dist/models/extractors/notion/list_extractor.js',
      format: 'es',
      name: 'listExtractor'
    }
  },
  {
    input: 'src/models/extractors/notion/paragraph_extractor.ts',
    output: {
      file: 'dist/models/extractors/notion/paragraph_extractor.js',
      format: 'es',
      name: 'paragraphExtractor'
    }
  },
  {
    input: 'src/models/extractors/notion/subslide_extractor.ts',
    output: {
      file: 'dist/models/extractors/notion/subslide_extractor.js',
      format: 'es',
      name: 'subslideExtractor'
    }
  },
  {
    input: 'src/models/extractors/notion/table_extractor.ts',
    output: {
      file: 'dist/models/extractors/notion/table_extractor.js',
      format: 'es',
      name: 'tableExtractor'
    }
  },
  // Types
  {
    input: 'src/models/extractors/notion/types.ts',
    output: {
      file: 'dist/models/extractors/notion/types.js',
      format: 'es',
      name: 'notionTypes'
    }
  },
  // Markdown extractors
  {
    input: 'src/models/extractors/markdown/markdown_extractor.ts',
    output: {
      file: 'dist/models/extractors/markdown/markdown_extractor.js',
      format: 'es',
      name: 'markdownExtractor'
    }
  },
  {
    input: 'src/models/extractors/markdown/types.ts',
    output: {
      file: 'dist/models/extractors/markdown/types.js',
      format: 'es',
      name: 'markdownTypes'
    }
  }
];

// Configure the build based on environment
const isDevelopment = env === 'development';
const needObfuscation = env === 'beta';
const needMinification = env === 'production' || env === 'beta';

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
        compilerOptions: {
          // Make sure all module imports have .js extension in output files
          moduleResolution: 'node',
          outDir: 'dist'
        }
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
      // Minify with Terser 
      needMinification && terser({
        compress: {
          drop_console: true, // Remove console statements
          drop_debugger: true, // Remove debugger statements
          pure_funcs: ['console.debug', 'console.log', 'console.info'] // Remove specific console functions
        }
      }),
      // Obfuscate code 
      needObfuscation && obfuscator({
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
