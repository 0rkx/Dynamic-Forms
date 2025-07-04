import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      server: {
        host: '127.0.0.1',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        sourcemap: false,
        assetsDir: 'assets',
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom', 'react-router-dom'],
              'ui-vendor': ['lucide-react', 'framer-motion', 'recharts'],
              'api-vendor': ['@supabase/supabase-js', '@google/genai'],
            }
          }
        }
      },
      define: {
        // Ensure process.env is available in the browser
        'process.env': {}
      }
    };
});
