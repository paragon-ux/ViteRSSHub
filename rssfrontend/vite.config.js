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
                rewrite: function (path) { return path.replace(/^\/rsshub-api/, ''); },
            },
            '/rsshub-docs': {
                target: 'https://docs.rsshub.app',
                changeOrigin: true,
                secure: true,
                rewrite: function (path) { return path.replace(/^\/rsshub-docs/, ''); },
            },
            '/nitter-proxy': {
                target: 'https://nitter.poast.org',
                changeOrigin: true,
                secure: true,
                rewrite: function (path) { return path.replace(/^\/nitter-proxy/, ''); },
            },
            '/preview-proxy': {
                target: 'http://127.0.0.1',
                changeOrigin: true,
                secure: false,
                router: function (request) {
                    var _a;
                    var incoming = new URL((_a = request.url) !== null && _a !== void 0 ? _a : '', 'http://127.0.0.1');
                    var source = incoming.searchParams.get('source');
                    if (!source) {
                        return 'http://127.0.0.1';
                    }
                    try {
                        return new URL(source).origin;
                    }
                    catch (_b) {
                        return 'http://127.0.0.1';
                    }
                },
                rewrite: function (path) {
                    var incoming = new URL(path, 'http://127.0.0.1');
                    var source = incoming.searchParams.get('source');
                    if (!source) {
                        return '/';
                    }
                    try {
                        var target = new URL(source);
                        return "".concat(target.pathname).concat(target.search);
                    }
                    catch (_a) {
                        return '/';
                    }
                },
            },
        },
    },
});
