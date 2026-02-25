import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const openAipApiKey = env.VITE_OPENAIP_API_KEY;

  if (!openAipApiKey) {
    throw new Error('VITE_OPENAIP_API_KEY is not set');
  }

  return {
    plugins: [react(), svgr()],
    server: {
      open: true,
      proxy: {
        // "/api": "http://pulsar.imsi.athenarc.gr:9680",
        '/api': {
          target: 'http://vis-api:8080',
        },
        '/experiments': {
          target: 'http://vis-api:8080',
        },
        '/auth': {
          target: 'http://access-control-service:5521',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/auth/, ''),
        },
        '/eusome': {
          target: 'http://app:8000',
          rewrite: path => path.replace(/^\/eusome/, ''),
        },
        '/openAip': {
          target: 'https://api.core.openaip.net/api',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/openAip/, ''),
          headers: {
            'x-openaip-api-key': openAipApiKey,
          },
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: 'src/setupTests',
      mockReset: true,
    },
  };
});
