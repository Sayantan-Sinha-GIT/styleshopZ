import fs from 'node:fs';
import postgres from 'postgres';
if(fs.existsSync('.env.local'))process.loadEnvFile('.env.local');
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
const db=postgres(process.env.DATABASE_URL,{ssl:'require',max:1,onnotice:()=>{}});
try{
  await db.unsafe('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for(const file of fs.readdirSync('scripts/migrations').filter(f=>f.endsWith('.sql')).sort()){
    const applied=await db`SELECT name FROM schema_migrations WHERE name=${file}`;
    if(applied.length){console.log('Already applied '+file);continue;}
    await db.begin(async tx=>{
      await tx.unsafe(fs.readFileSync('scripts/migrations/'+file,'utf8'));
      await tx`INSERT INTO schema_migrations(name) VALUES(${file})`;
    });
    console.log('Applied '+file);
  }
}finally{await db.end();}
