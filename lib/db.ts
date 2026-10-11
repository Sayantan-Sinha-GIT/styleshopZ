import postgres from 'postgres';

// Global singleton to prevent connection leaks during Next.js hot reloads
const globalForDb = globalThis as unknown as {
  sql?: postgres.Sql;
};

const databaseUrl = process.env.DATABASE_URL || '';

export const sql =
  globalForDb.sql ||
  (databaseUrl
    ? postgres(databaseUrl, {
        prepare: false, // Required for transaction poolers (Neon / Supabase PgBouncer)
        max: 4,
        idle_timeout: 20,
        max_lifetime: 300,
        connect_timeout: 10,
        ssl: 'require',
      })
    : (null as unknown as postgres.Sql));

if (process.env.NODE_ENV !== 'production' && sql) {
  globalForDb.sql = sql;
}

export function isDbConnected(): boolean {
  return !!sql && !!databaseUrl;
}
