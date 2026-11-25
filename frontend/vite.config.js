import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'router';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('qrcode')) return 'qr';
            if (id.includes('react')) return 'react-vendor';
          }
        }
      }
    }
  }
});