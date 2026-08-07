import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@universe/address-parser': resolve(
        import.meta.dirname,
        'node_modules/@universe/address-parser/dist/src/parser/index.js',
      ),
      '@universe/models': resolve(import.meta.dirname, 'src/vendor/universeModelsBrowser.ts'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/content/content-script.ts'),
      name: 'Click2ShipContentScript',
      formats: ['iife'],
      fileName: () => 'content-script.js',
    },
  },
});
