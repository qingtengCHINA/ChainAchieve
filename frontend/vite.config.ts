import { existsSync } from 'fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const monoReact = path.resolve('../node_modules/react');
const alias = existsSync(monoReact)
  ? { react: monoReact, 'react-dom': path.resolve('../node_modules/react-dom') }
  : {};

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias,
  },
  server: { proxy: { '/api': 'http://localhost:3001' } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
    server: {
      deps: {
        inline: ['@testing-library/react', '@testing-library/user-event'],
      },
    },
  },
});
