import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  server: { port: 5173, host: true },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split Firebase SDK into its own chunk (~300kb)
          'firebase-core': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/storage',
          ],
          // Split messaging separately (optional, lazy loaded)
          'firebase-messaging': ['firebase/messaging'],
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI icons (lucide is large)
          'lucide': ['lucide-react'],
        },
      },
    },
  },
});
