import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8000';

  return {
    plugins: [
      react({ devTarget: 'es2024' }),
    ],
    optimizeDeps: {
      exclude: ['@duckdb/duckdb-wasm'], // prevent Vite from pre-bundling DuckDB
    },
    server: {
      proxy: { // Proxy API requests to the backend server during development
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['./src/setupTests.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
      fileParallelism: true,
      maxWorkers: '100%',
      minWorkers: 1,
      coverage: {
        provider: 'v8',
        all: true,
        include: ['src/**/*.{ts,tsx}'],
        exclude: [
          'src/**/*.d.ts',
          'src/main.tsx',
          'src/vite-env.d.ts',
        ],
      },
    },
  };
});
