import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

async function main() {
  // Read .env.local if not already in process.env
  if (!process.env.DATABASE_URL && fs.existsSync('.env.local')) {
    const lines = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith('DATABASE_URL=')) {
        process.env.DATABASE_URL = line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
      }
    }
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('ERROR: DATABASE_URL not found in environment or .env.local');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const sql = postgres(url, { prepare: false, ssl: 'require' });

  const schemaPath = path.join(process.cwd(), 'lib', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Applying schema migrations...');
  await sql.unsafe(schemaSql);

  console.log('Schema migration applied successfully!');

  // Verify by checking table counts
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;

  console.log(`Verified: ${tables.length} tables in public schema:`);
  console.log(tables.map((t: { table_name: string }) => t.table_name).join(', '));

  await sql.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
