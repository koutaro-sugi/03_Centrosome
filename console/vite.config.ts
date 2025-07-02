import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // APIリクエストをシミュレーターにプロキシ
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => {
          console.log(
            `[Vite] プロキシ: ${path} -> http://localhost:3001${path}`
          );
          return path;
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // MUIの「use client」ディレクティブ警告を抑制
        if (
          warning.message?.includes(
            'Module level directives cause errors when bundled'
          ) ||
          warning.message?.includes('"use client"')
        ) {
          return;
        }
        // ViteのCJS警告を抑制
        if (
          warning.message?.includes(
            "The CJS build of Vite's Node API is deprecated"
          )
        ) {
          return;
        }
        warn(warning);
      },
      external: [],
    },
  },
  publicDir: 'public',
  define: {
    // プロダクションビルドでの最適化
    'process.env.NODE_ENV': '"production"',
  },
});
