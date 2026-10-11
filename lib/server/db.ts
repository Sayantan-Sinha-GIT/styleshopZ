import { neon, Pool, neonConfig } from "@neondatabase/serverless";

export type Row = Record<string, any>;
export type Query = <T extends Row = Row>(
  text: string,
  values?: any[],
) => Promise<T[]>;
export const query: Query = async (text, values = []) => {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_UNAVAILABLE");
  return neon(process.env.DATABASE_URL).query(text, values) as any;
};

// A connection lives only for the request. Every read/lock/write below shares it.
export async function transaction<T>(
  run: (q: Query) => Promise<T>,
): Promise<T> {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_UNAVAILABLE");
  neonConfig.webSocketConstructor = WebSocket;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 15000,
  });
  let client;
  try {
    client = await pool.connect();
  } catch (error) {
    await pool.end();
    throw error;
  }
  const q: Query = async (text, values = []) =>
    (await client.query(text, values)).rows as any;
  try {
    await q("BEGIN");
    const result = await run(q);
    await q("COMMIT");
    return result;
  } catch (error) {
    await q("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
