import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    open: false,
    proxy: {
      '/rsshub-api': {
        target: 'http://127.0.0.1:1200',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rsshub-api/, ''),
      },
      '/rsshub-docs': {
        target: 'https://docs.rsshub.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/rsshub-docs/, ''),
      },
      '/nitter-proxy': {
        target: 'https://nitter.poast.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/nitter-proxy/, ''),
      },
      '/preview-proxy': {
        target: 'http://127.0.0.1',
        changeOrigin: true,
        secure: false,
        router: (request: { url?: string }) => {
          const incoming = new URL(request.url ?? '', 'http://127.0.0.1');
          const source = incoming.searchParams.get('source');

          if (!source) {
            return 'http://127.0.0.1';
          }

          try {
            return new URL(source).origin;
          } catch {
            return 'http://127.0.0.1';
          }
        },
        rewrite: (path: string) => {
          const incoming = new URL(path, 'http://127.0.0.1');
          const source = incoming.searchParams.get('source');

          if (!source) {
            return '/';
          }

          try {
            const target = new URL(source);
            return `${target.pathname}${target.search}`;
          } catch {
            return '/';
          }
        },
      } as any,
    },
  },
});
