import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: { '/api': 'http://localhost:8080' },
  },
});
