import { defineConfig, loadEnv } from 'vite';
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
  };
});
