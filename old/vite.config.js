import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: false,
                drop_debugger: true,
                passes: 2,
                unsafe: false
            },
            mangle: {
                reserved: ['seatableLoader', 'PhoneDirectory', 'window', 'document']
            },
            format: {
                comments: false
            }
        },
        rollupOptions: {
            input: 'index.html',
            output: {
                entryFileNames: 'assets/[name].[hash].js',
                chunkFileNames: 'assets/[name].[hash].js',
                assetFileNames: 'assets/[name].[hash].[ext]'
            }
        },
        sourcemap: false,
        target: 'es2015'
    },
    server: {
        port: 3000,
        open: true,
        host: true
    },
    preview: {
        port: 8080,
        open: true
    }
});