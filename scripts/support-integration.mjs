import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

process.loadEnvFile('.env.local');
const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
const q = neon(process.env.DATABASE_URL).query;
const ids = {customer: randomUUID(), other: randomUUID(), seller: randomUUID(), admin: randomUUID(), sellerId: randomUUID(), order: randomUUID(), foreignOrder: randomUUID()};
const prefix = 'support-qa-' + randomUUID().slice(0, 8);
const passed = [];
const ticketIds = [];
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII=', 'base64');

function session(id) {
  const h = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
  const b = Buffer.from(JSON.stringify({sub:id,version:0,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');
  return 'styleshopz_session=' + h + '.' + b + '.' + createHmac('sha256', process.env.AUTH_SECRET || process.env.JWT_SECRET).update(h+'.'+b).digest('base64url');
}
const auth = Object.fromEntries(['customer','other','seller','admin'].map(role => [role,session(ids[role])]));
async function request(path, method='GET', body, role='customer') {
  const response = await fetch(base+'/api/'+path,{method,headers:{...(role ? {Cookie:auth[role]} : {}),...(body === undefined ? {} : {'Content-Type':'application/json'})},body:body === undefined ? undefined : JSON.stringify(body)});
  let data; try { data = await response.json(); } catch { data = {}; }
  return {status:response.status,data};
}
async function upload(role, privateUpload=true, bytes=png) {
  const form = new FormData();
  form.set('file',new File([bytes],'evidence.png',{type:'image/png'}));
  if (privateUpload) form.set('private','true');
  const response = await fetch(base+'/api/uploads',{method:'POST',headers:{Cookie:auth[role]},body:form});
  const data = await response.json();
  return {status:response.status,url:data.url,error:data.error};
}
async function test(name, work) { await work(); passed.push(name); console.log('PASS '+name); }
let mainTicket;
try {
  await q("INSERT INTO users(id,email,password_hash,name,role,email_verified_at) VALUES($1::uuid,$1::text||'@qa.invalid','disabled',$5,'customer',NOW()),($2::uuid,$2::text||'@qa.invalid','disabled','Other QA customer','customer',NOW()),($3::uuid,$3::text||'@qa.invalid','disabled','QA seller','seller',NOW()),($4::uuid,$4::text||'@qa.invalid','disabled','QA owner','admin',NOW())",[ids.customer,ids.other,ids.seller,ids.admin,prefix]);
  await q("INSERT INTO sellers(id,user_id,shop_name,status) VALUES($1,$2,'Support QA seller','approved')",[ids.sellerId,ids.seller]);
  await q("INSERT INTO orders(id,user_id,address_snapshot,status,total_paise,subtotal_paise,payment_method,idempotency_key) VALUES($1,$2,'{}'::jsonb,'placed',10000,10000,'demo',$5),($3,$4,'{}'::jsonb,'placed',10000,10000,'demo',$6)",[ids.order,ids.customer,ids.foreignOrder,ids.other,randomUUID(),randomUUID()]);

  await test('anonymous requests and unsupported methods are denied',async()=>{
    assert.equal((await request('support','GET',undefined,null)).status,401);
    assert.equal((await request('support','POST',{subject:'A case',message:'Details'},null)).status,401);
    assert.equal((await request('support','DELETE',undefined,'customer')).status,405);
    assert.equal((await request('support','PATCH',{status:'resolved'},'customer')).status,400);
  });
  await test('categories, order ownership and input limits reject malformed cases',async()=>{
    for(const body of [
      {subject:'Wrong order',message:'Details',category:'order_delivery',orderId:ids.foreignOrder},
      {subject:'Wrong category',message:'Details',category:'nonsense'},
      {subject:'Bad',message:'Details',category:'other'},
      {subject:'Valid subject',message:'x',category:'other'},
      {subject:'Valid subject',message:'x'.repeat(2001),category:'other'},
      {subject:'Valid subject',message:'Details',category:'order_delivery',orderId:'bad-uuid'},
    ]) assert([400,404].includes((await request('support','POST',body)).status));
    assert.equal(Number((await q('SELECT COUNT(*)::int n FROM support_tickets WHERE user_id=$1',[ids.customer]))[0].n),0);
  });
  await test('private evidence upload is validated and owner/customer can view it',async()=>{
    const invalid = await upload('customer',true,Buffer.from('not an image'));
    assert.equal(invalid.status,400);
    const evidence = await upload('customer');
    const foreign = await upload('other');
    const publicPhoto = await upload('customer',false);
    assert.equal(evidence.status,200);
    assert.equal((await fetch(base+evidence.url,{headers:{Cookie:auth.customer}})).status,200);
    assert.equal((await fetch(base+evidence.url,{headers:{Cookie:auth.admin}})).status,200);
    assert.equal((await fetch(base+evidence.url,{headers:{Cookie:auth.other}})).status,404);
    for(const photos of [[foreign.url],[publicPhoto.url],[evidence.url,evidence.url],Array(5).fill(evidence.url),['/uploads/not-an-id']]) {
      assert.equal((await request('support','POST',{subject:'Evidence test',category:'other',message:'Details',photoUrls:photos})).status,400);
    }
    const created = await request('support','POST',{subject:'Package arrived damaged',category:'product_issue',orderId:ids.order,message:'The item has a visible crack. <script>alert(1)</script>',photoUrls:[evidence.url]});
    assert.equal(created.status,200,JSON.stringify(created.data));
    mainTicket=created.data.ticketId;
    ticketIds.push(mainTicket);
    const detail=await request('support?id='+mainTicket);
    assert.equal(detail.data.ticket.category,'product_issue');
    assert.equal(detail.data.ticket.order_id,ids.order);
    assert.deepEqual(detail.data.messages[0].attachment_urls,[evidence.url]);
    assert.match(detail.data.messages[0].message,/<script>/);
  });
  await test('cross-account ticket reads, replies and changes are denied',async()=>{
    assert.equal((await request('support?id='+mainTicket,'GET',undefined,'other')).status,404);
    assert.equal((await request('support','POST',{ticketId:mainTicket,message:'Wrong account'},'other')).status,404);
    assert.equal((await request('support','PATCH',{ticketId:mainTicket,status:'closed'},'other')).status,404);
    assert.equal((await request('support','POST',{ticketId:mainTicket,message:'Wrong seller'},'seller')).status,404);
  });
  await test('owner triage and internal notes stay hidden from the customer and export',async()=>{
    assert.equal((await request('support','PATCH',{ticketId:mainTicket,priority:'urgent'})).status,403);
    assert.equal((await request('support','PATCH',{ticketId:mainTicket,status:'in_progress'})).status,403);
    assert.equal((await request('support','PATCH',{ticketId:mainTicket,priority:'urgent'},'admin')).status,200);
    assert.equal((await request('support','POST',{ticketId:mainTicket,message:'Private escalation note',isInternal:true},'customer')).status,403);
    assert.equal((await request('support','POST',{ticketId:mainTicket,message:'Private escalation note',isInternal:true},'admin')).status,200);
    const owner = await request('support?id='+mainTicket,'GET',undefined,'admin');
    const customer = await request('support?id='+mainTicket);
    const exportData = await request('account/export');
    assert(owner.data.messages.some(m=>m.is_internal));
    assert(!customer.data.messages.some(m=>m.is_internal));
    assert(!exportData.data.supportMessages.some(m=>m.is_internal));
    assert.equal(customer.data.ticket.priority,'urgent');
    assert.equal((await q("SELECT COUNT(*)::int n FROM audit_logs WHERE actor_id=$1 AND action='support_triage'",[ids.admin]))[0].n,1);
  });
  await test('resolution, closure, reopening and replies use deliberate transitions',async()=>{
    assert.equal((await request('support','PATCH',{ticketId:mainTicket,status:'not-a-status'},'admin')).status,400);
    assert.equal((await request('support','PATCH',{ticketId:mainTicket,priority:'critical'},'admin')).status,400);
    assert.equal((await request('support','PATCH',{ticketId:mainTicket,status:'resolved'},'admin')).status,200);
    assert.equal((await request('support','POST',{ticketId:mainTicket,message:'Still broken'})).status,409);
    assert.equal((await request('support','PATCH',{ticketId:mainTicket,status:'open'})).status,200);
    assert.equal((await request('support','POST',{ticketId:mainTicket,message:'Still broken'})).status,200);
    assert.equal((await request('support','POST',{ticketId:mainTicket,message:'We will check this.',isInternal:false},'admin')).status,200);
    assert.equal((await request('support','PATCH',{ticketId:mainTicket,status:'closed'})).status,200);
    assert.equal((await request('support','POST',{ticketId:mainTicket,message:'Another reply'})).status,409);
    assert.equal((await request('support','PATCH',{ticketId:mainTicket,status:'open'})).status,200);
    assert.equal((await request('support','POST',{ticketId:mainTicket,message:'Reopened successfully'})).status,200);
    const detail=await request('support?id='+mainTicket);
    assert.equal(detail.data.ticket.status,'open');
    assert.equal(detail.data.messages.length,4);
  });
  await test('seller can open own shop case but cannot access another case',async()=>{
    const created=await request('support','POST',{subject:'My shop approval question',category:'seller_shop',message:'Please review this seller case.'},'seller');
    assert.equal(created.status,200,JSON.stringify(created.data));
    assert.equal((await request('support?id='+created.data.ticketId,'GET',undefined,'seller')).status,200);
    assert.equal((await request('support?id='+created.data.ticketId)).status,404);
    assert.equal((await request('support','POST',{subject:'Admin must not create',message:'No customer',category:'other'},'admin')).status,403);
  });
  await test('pagination, search, status and issue filters find cases beyond the first page',async()=>{
    const extra=Array.from({length:36},()=>randomUUID());
    await q("INSERT INTO support_tickets(id,user_id,subject,category,status) SELECT id,$2,$3||' '||row_number() OVER(),'other','closed' FROM unnest($1::uuid[]) id",[extra,ids.customer,prefix]);
    ticketIds.push(...extra);
    const first=await request('support');
    const second=await request('support?offset=30');
    assert.equal(first.status,200); assert.equal(first.data.tickets.length,30);
    assert.equal(second.data.tickets.length,7);
    assert.equal(first.data.total,37);
    assert.equal(new Set([...first.data.tickets,...second.data.tickets].map(t=>t.id)).size,37);
    assert.equal(first.data.tickets[0].id,mainTicket);
    assert.equal((await request('support?status=open&category=product_issue')).data.total,1);
    assert.equal((await request('support?status=closed&category=product_issue')).data.total,0);
    assert.equal((await request('support?q='+encodeURIComponent(prefix))).data.total,36);
    assert.equal((await request('support?q='+encodeURIComponent(ids.customer.slice(0,8)),'GET',undefined,'admin')).data.total,37);
    assert.equal((await request('support?offset=-1')).status,400);
    assert.equal((await request('support?category=invalid')).status,400);
    assert.equal((await request('support?status=invalid')).status,400);
    assert.equal((await request('support?q='+encodeURIComponent('x'.repeat(101)))).status,400);
  });
  await test('ticket creation rate limit stops the eleventh case',async()=>{
    for(let i=0;i<9;i++) assert.equal((await request('support','POST',{subject:'Rate sample '+i,category:'other',message:'A repeatable QA case.'})).status,200);
    assert.equal((await request('support','POST',{subject:'Rate sample 10',category:'other',message:'A repeatable QA case.'})).status,429);
  });
  await test('concurrent replies remain separate and ordered',async()=>{
    const replies=await Promise.all([
      request('support','POST',{ticketId:mainTicket,message:'Concurrent reply A'}),
      request('support','POST',{ticketId:mainTicket,message:'Concurrent reply B'}),
    ]);
    assert(replies.every(r=>r.status===200),JSON.stringify(replies));
    const detail=await request('support?id='+mainTicket);
    assert(detail.data.messages.some(m=>m.message==='Concurrent reply A'));
    assert(detail.data.messages.some(m=>m.message==='Concurrent reply B'));
  });
  await fs.mkdir('.qa',{recursive:true});
  await fs.writeFile('.qa/support-integration-results.json',JSON.stringify({base,at:new Date().toISOString(),passed},null,2));
  console.log(JSON.stringify({passed:passed.length},null,2));
} finally {
  try {
    await q('DELETE FROM support_tickets WHERE user_id=ANY($1::uuid[])',[[ids.customer,ids.other,ids.seller]]);
    await q('DELETE FROM orders WHERE id=ANY($1::uuid[])',[[ids.order,ids.foreignOrder]]);
    await q('DELETE FROM uploads WHERE user_id=ANY($1::uuid[])',[[ids.customer,ids.other,ids.seller,ids.admin]]);
    await q('DELETE FROM sellers WHERE id=$1',[ids.sellerId]);
    await q('DELETE FROM notifications WHERE user_id=ANY($1::uuid[])',[[ids.customer,ids.other,ids.seller,ids.admin]]);
    for(const id of [ids.customer,ids.other,ids.seller,ids.admin]) await q('DELETE FROM rate_limits WHERE key LIKE $1',['%'+id+'%']);
    const retained=await q('SELECT DISTINCT actor_id id FROM audit_logs WHERE actor_id=ANY($1::uuid[])',[[ids.customer,ids.other,ids.seller,ids.admin]]);
    const retainedIds=retained.map(row=>row.id);
    await q("UPDATE users SET email=id::text||'@qa.invalid',name='Disabled support QA',deleted_at=NOW(),session_version=session_version+1 WHERE id=ANY($1::uuid[])",[retainedIds]);
    await q('DELETE FROM users WHERE id=ANY($1::uuid[]) AND NOT (id=ANY($2::uuid[]))',[[ids.customer,ids.other,ids.seller,ids.admin],retainedIds]);
    console.log('Support fixtures removed; audit actors disabled: '+retainedIds.length);
  } catch (error) {
    console.error('Support fixture cleanup failed:',error.message);
    process.exitCode=1;
  }
}
