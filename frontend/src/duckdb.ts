import * as duckdb from '@duckdb/duckdb-wasm';

const bundle = {
  mainModule: new URL('@duckdb/duckdb-wasm/dist/duckdb-eh.wasm', import.meta.url).toString(),
  mainWorker: new URL('@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js', import.meta.url).toString(),
};

let db: duckdb.AsyncDuckDB | null = null;
let conn: duckdb.AsyncDuckDBConnection | null = null;

export async function initDuckDB() {
  if (!db) {
    const worker = new Worker(new URL(bundle.mainWorker, import.meta.url), {
      type: 'module',
    });
    db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
    await db.instantiate(bundle.mainModule);
    conn = await db.connect();
  }
  return { db, conn };
}
