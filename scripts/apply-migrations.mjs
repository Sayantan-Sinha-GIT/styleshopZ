import fs from 'node:fs';
import postgres from 'postgres';
if(fs.existsSync('.env.local'))process.loadEnvFile('.env.local');
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL is required');
const db=postgres(process.env.DATABASE_URL,{ssl:'require',max:1,onnotice:()=>{}});
try{for(const file of fs.readdirSync('scripts/migrations').filter(f=>f.endsWith('.sql')).sort()){await db.begin(async tx=>{await tx.unsafe(fs.readFileSync('scripts/migrations/'+file,'utf8'));});console.log('Applied '+file);}}finally{await db.end();}
