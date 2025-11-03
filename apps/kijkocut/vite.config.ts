import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@opencut/ui': path.resolve(__dirname, '../../packages/ui/src'),
          '@opencut/editor': path.resolve(__dirname, '../../packages/editor/src'),
          '@opencut/config': path.resolve(__dirname, '../../packages/config/src'),
          '@opencut/db': path.resolve(__dirname, '../../packages/db/src'),
          '@opencut/auth': path.resolve(__dirname, '../../packages/auth/src'),
        }
      }
    };
});
