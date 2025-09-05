import * as duckdb from '@duckdb/duckdb-wasm';

const bundle = {
  mainModule: new URL('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm', import.meta.url).toString(),
  mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).toString(),
};

const worker = new Worker(new URL(bundle.mainWorker, import.meta.url), {
  type: 'module',
});

// 4. Create the database instance
const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
await db.instantiate(bundle.mainModule);
export const conn = await db.connect();
