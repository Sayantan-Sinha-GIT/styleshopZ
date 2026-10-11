import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Global singleton to prevent connection leaks during Next.js hot reloads
const globalForDb = globalThis as unknown as {
  sql?: NeonQueryFunction<false, false>;
};

const databaseUrl = process.env.DATABASE_URL || '';

export const sql: any =
  globalForDb.sql ||
  (databaseUrl ? neon(databaseUrl) : (null as any));

if (process.env.NODE_ENV !== 'production' && sql) {
  globalForDb.sql = sql;
}

export function isDbConnected(): boolean {
  return !!sql && !!databaseUrl;
}
