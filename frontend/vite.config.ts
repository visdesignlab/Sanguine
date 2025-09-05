import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig(() => ({
  plugins: [
    react({ devTarget: 'es2024' }),
  ],
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'], // prevent Vite from pre-bundling DuckDB
  },
}));
