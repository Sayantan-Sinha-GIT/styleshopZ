import fs from 'node:fs';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
if(fs.existsSync('.env.local'))process.loadEnvFile('.env.local');
if(process.env.DEMO_MODE!=='true'||process.env.ALLOW_DEMO_SEED!=='true')throw new Error('Set DEMO_MODE=true and ALLOW_DEMO_SEED=true for this development-only sample seed.');
const password=process.env.DEV_SEED_PASSWORD;
if(!password||password.length<16)throw new Error('Set DEV_SEED_PASSWORD with at least 16 characters.');
const db=postgres(process.env.DATABASE_URL!,{ssl:'require',max:1});
try{await db.begin(async tx=>{
 const [catalogue]=await tx.unsafe("SELECT EXISTS(SELECT 1 FROM products) AS populated, EXISTS(SELECT 1 FROM variants WHERE sku LIKE 'DEMO-%') AS seeded");
 if(catalogue.populated&&!catalogue.seeded){console.log('Existing catalogue detected; sample seed skipped. No accounts or products were changed.');return;}
 const hash=await bcrypt.hash(password,12);
 for(const role of ['customer','seller','admin'])await tx.unsafe('INSERT INTO users(email,password_hash,role,name) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING',[role+'@shop.test',hash,role,'Sample '+role]);
 const [u]=await tx.unsafe("SELECT id FROM users WHERE email='seller@shop.test'");
 const [seller]=await tx.unsafe("INSERT INTO sellers(user_id,shop_name,status) VALUES($1,'Everyday Sample Shop','approved') ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id",[u.id]);
 const categories=JSON.parse(fs.readFileSync('lib/demo-categories.json','utf8'));
 for(const c of categories)await tx.unsafe('INSERT INTO categories(id,parent_id,level,name,slug) VALUES($1,$2,$3,$4,$5) ON CONFLICT(slug) DO NOTHING',[c.id,c.parent_id,c.level,c.name,c.slug]);
 const leaves=await tx.unsafe('SELECT id,name FROM categories WHERE level=3 ORDER BY slug');
 for(let i=0;i<525;i++){
   const sku='DEMO-'+String(i).padStart(4,'0');
   const [old]=await tx.unsafe('SELECT id FROM variants WHERE sku=$1',[sku]);if(old)continue;
   const c=leaves[i%leaves.length];
   const [p]=await tx.unsafe("INSERT INTO products(seller_id,category_id,title,brand,description,status) VALUES($1,$2,$3,'Everyday','Sample catalogue item. Photography and specifications are illustrative. No manufacturer warranty, real payment or delivery is offered.','live') RETURNING id",[seller.id,c.id,'Everyday '+c.name+' · '+(i+1)]);
   for(let v=0;v<2;v++)await tx.unsafe('INSERT INTO variants(product_id,sku,options,price_paise,mrp_paise,stock) VALUES($1,$2,$3::jsonb,$4,$5,$6)',[p.id,v?sku+'-ALT':sku,JSON.stringify({color:v?'Light':'Dark'}),19900+i*100,24900+i*150,i%17===0?0:20]);
 }
 console.log('Sample catalogue ready. Existing catalogue and accounts were preserved.');
});}finally{await db.end();}
