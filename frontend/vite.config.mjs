import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  // .env ищем в frontend/ (рядом с package.json) или в корне проекта (родитель frontend)
  envDir: path.resolve(__dirname),
  server: {
    port: 5173,
    proxy: {
      // Все запросы с /api в dev-режиме уходят на backend на 4000 порту
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
