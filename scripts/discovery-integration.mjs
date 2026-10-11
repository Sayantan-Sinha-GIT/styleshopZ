import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {neon} from '@neondatabase/serverless';
process.loadEnvFile('.env.local');
const base=process.env.TEST_BASE_URL || 'http://localhost:3000';
const q=neon(process.env.DATABASE_URL).query;
const email='discovery-'+randomUUID()+'@qa.invalid';
const password='Fixture!'+randomUUID();
let uid,session,addressId,orderId,stockBefore,variant;
const checks=[];
async function call(path,method='GET',body,cookie=session){const res=await fetch(base+'/api/'+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')};}
async function check(label,run){await run();checks.push(label);console.log('PASS '+label);}
try{
  const registered=await call('auth/register','POST',{email,password,name:'Discovery Fixture'},null);
  assert.equal(registered.status,200);uid=registered.body.user.id;session=registered.cookie.split(';')[0];
  await check('expanded catalogue, synonyms, typo recovery, category isolation and stable pagination',async()=>{
    const all=await call('products');assert(all.body.count>=102);assert(all.body.products.every(p=>! / · \d+$/.test(p.title)));
    const featured=await call('products?featured=true&limit=60');assert.equal(featured.body.count,102);
    const mobile=await call('products?q=mobile');assert(mobile.body.products.some(p=>p.title.includes('smartphone')));
    const typo=await call('products?q=haedphones');assert(typo.body.fuzzy);assert(typo.body.products[0].title.includes('headphones'));
    const shoes=await call('products?category=running-shoes');assert.equal(shoes.body.count,6);assert(shoes.body.products.every(p=>p.category_slug==='running-shoes'));
    const one=await call('products?q=headphones&limit=3'),two=await call('products?q=headphones&limit=3&offset=3');assert(!one.body.products.some(a=>two.body.products.some(b=>a.id===b.id)));
  });
  await check('Ola endpoints require a session and reject invalid coordinates',async()=>{
    assert.equal((await call('places/search?q=Kolkata','GET',null,null)).status,401);
    assert.equal((await call('places/reverse?lat=Infinity&lng=88')).status,400);
  });
  if((await call('config')).body.maps)await check('real Ola landmark search and reverse geocoding return Indian address fields',async()=>{
    const places=await call('places/search?q=Victoria%20Memorial&lat=22.57&lng=88.36');assert.equal(places.status,200);assert(places.body.suggestions.length);
    const reverse=await call('places/reverse?lat=22.5448&lng=88.3426');assert.equal(reverse.status,200);assert.equal(reverse.body.address.city,'Kolkata');assert.match(reverse.body.address.pincode,/^[1-9]\d{5}$/);assert(reverse.body.address.line1);assert.notEqual(reverse.body.address.line1,reverse.body.address.line2);
  });
  await check('expired and incorrect email codes cannot verify an account; a valid code is consumed',async()=>{
    const hash=code=>createHmac('sha256',process.env.AUTH_SECRET).update(`${uid}:verify:${code}`).digest('hex');
    await q("INSERT INTO email_codes(user_id,purpose,code_hash,expires_at) VALUES($1,'verify',$2,NOW()-INTERVAL '1 minute')",[uid,hash('11112222')]);
    assert.equal((await call('auth/verify-email','POST',{code:'11112222'})).status,400);
    assert.equal((await call('auth/verify-email','POST',{code:'22223333'})).status,400);
    await q("INSERT INTO email_codes(user_id,purpose,code_hash,expires_at) VALUES($1,'verify',$2,NOW()+INTERVAL '5 minutes')",[uid,hash('33334444')]);
    assert.equal((await call('auth/verify-email','POST',{code:'33334444'})).status,200);
    assert((await call('auth/me')).body.user.email_verified_at);
    assert((await q('SELECT used_at FROM email_codes WHERE user_id=$1 AND code_hash=$2',[uid,hash('33334444')]))[0].used_at);
  });
  const address={name:'Discovery Fixture',phone:'9876543210',line1:'10 QA Road, Maidan',line2:'Test only',city:'Kolkata',state:'West Bengal',pincode:'700071',latitude:22.5448,longitude:88.3426};
  await check('delivery coordinates persist in saved addresses and order snapshots',async()=>{
    const saved=await call('addresses','POST',address);assert.equal(saved.status,200);addressId=saved.body.id;
    const profile=await call('profile');assert.equal(profile.body.addresses[0].latitude,address.latitude);
    const product=(await call('products?featured=true&in_stock=true&limit=1')).body.products[0];variant=product.default_variant_id;stockBefore=(await q('SELECT stock FROM variants WHERE id=$1',[variant]))[0].stock;
    await call('cart','POST',{variantId:variant,quantity:1});
    const hold=await call('checkout/hold','POST',{items:[{variantId:variant,quantity:1}]});assert.equal(hold.status,200);
    const created=await call('checkout/create-order','POST',{items:[{variantId:variant,quantity:1}],address:profile.body.addresses[0],batchId:hold.body.batchId,idempotencyKey:randomUUID(),paymentMethod:'demo',delivery:'standard'});assert.equal(created.status,200);orderId=created.body.orderId;
    const [order]=await q('SELECT address_snapshot FROM orders WHERE id=$1',[orderId]);assert.equal(order.address_snapshot.latitude,address.latitude);assert.equal(order.address_snapshot.longitude,address.longitude);
    assert.equal((await call('orders/'+orderId+'/cancel','POST',{reason:'Disposable integration fixture'})).status,200);
    assert.equal((await q('SELECT stock FROM variants WHERE id=$1',[variant]))[0].stock,stockBefore);
  });
  await fs.mkdir('.qa',{recursive:true});await fs.writeFile('.qa/discovery-integration-results.json',JSON.stringify({base,at:new Date().toISOString(),checks},null,2));
}finally{
  if(orderId){await call('orders/'+orderId+'/cancel','POST',{reason:'Disposable integration cleanup'}).catch(()=>{});await q('DELETE FROM orders WHERE id=$1',[orderId]);}
  if(uid){await q('DELETE FROM stock_holds WHERE user_id=$1',[uid]);await q('DELETE FROM email_codes WHERE user_id=$1',[uid]);await q('DELETE FROM auth_identities WHERE user_id=$1',[uid]);await q('DELETE FROM users WHERE id=$1',[uid]);}
}
