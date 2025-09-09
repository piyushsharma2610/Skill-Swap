import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@services': path.resolve(__dirname, 'services'),
      '@components': path.resolve(__dirname, 'components'),
      '@pages': path.resolve(__dirname, 'src/Pages'),
      // Add more aliases as needed
    },
  },
});

