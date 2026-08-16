import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const DATABASE_URL = process.env.DATABASE_URL || "postgres://localhost:5432/placestack_dev";

// Hosted Postgres (Neon, Supabase, Vercel) terminates TLS with certificates the
// default trust store rejects; a local socket needs no TLS at all.
const isLocal = /@?(localhost|127\.0\.0\.1)/.test(DATABASE_URL);

export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 10_000,
});

export const query = (text, params) => pool.query(text, params);

let schemaReady;

// The schema is idempotent, so applying it on first use costs one round trip
// and removes a deploy step. Memoised so concurrent requests share the work.
export function ensureSchema() {
  schemaReady ||= readFile(join(dirname(fileURLToPath(import.meta.url)), "schema.sql"), "utf8").then((sql) =>
    pool.query(sql),
  );

  return schemaReady;
}
