import * as dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from './schema.ts';

// Must run before buildPoolConfig() reads process.env below. This module is
// intentionally self-contained on env loading rather than relying on the
// importing file (server.ts) to have called dotenv first — ESM import
// evaluation order previously caused the pool to be built with undefined
// credentials even when a valid .env file was present.
dotenv.config({ quiet: true });

declare global {
  var _postgresPool: Pool | undefined;
}

function buildPoolConfig(): PoolConfig {
  const databaseUrl = process.env.DATABASE_URL;

  // SSL is required by most hosted providers (e.g. Supabase, Cloud SQL over
  // the public IP) but must stay off for a bare local Postgres instance.
  const sslMode = process.env.PGSSLMODE || process.env.DB_SSL;
  const ssl =
    sslMode === 'disable'
      ? undefined
      : sslMode === 'require' || sslMode === 'true'
        ? { rejectUnauthorized: false }
        : databaseUrl && !/localhost|127\.0\.0\.1/.test(databaseUrl)
          ? { rejectUnauthorized: false }
          : undefined;

  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      max: 10,
      connectionTimeoutMillis: 15000,
      ssl,
    };
  }

  const missing = ['SQL_HOST', 'SQL_DB_NAME', 'SQL_USER', 'SQL_PASSWORD'].filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Database is not configured. Set DATABASE_URL, or all of SQL_HOST, SQL_DB_NAME, SQL_USER, SQL_PASSWORD ` +
        `in your .env file. Missing: ${missing.join(', ')}`
    );
  }

  return {
    host: process.env.SQL_HOST,
    port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : undefined,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: 10,
    connectionTimeoutMillis: 15000,
    ssl,
  };
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool(buildPoolConfig());

    global._postgresPool.on('error', (err) => {
      // A broken idle client should never crash the whole process.
      console.error('[db] Unexpected error on idle SQL pool client:', err.message);
    });
  }
  return global._postgresPool;
};

const pool = createPool();

export const db = drizzle(pool, { schema });

export async function checkDatabaseConnection(): Promise<{ ok: boolean; error: string | null }> {
  try {
    await pool.query('SELECT 1');
    return { ok: true, error: null };
  } catch (err: any) {
    return { ok: false, error: err?.message || err?.code || 'Unknown database error' };
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (global._postgresPool) {
    await global._postgresPool.end();
    global._postgresPool = undefined;
  }
}
