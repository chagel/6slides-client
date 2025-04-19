import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

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

// Apply plugins to each bundle
export default entries.map(entry => ({
  ...entry,
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: true,
    }),
    {
      name: 'replace-env',
      transform(code) {
        return code.replace(/process\.env\.NODE_ENV/g, JSON.stringify('production'));
      }
    }
  ],
  external: ['chrome'],
  onwarn(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    warn(warning);
  }
}));
