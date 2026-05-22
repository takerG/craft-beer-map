import { defineConfig } from 'vite';

export default defineConfig({
  base: '/craft-beer-map/',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
  server: {
    open: true,
  },
});
