import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import { chromium } from 'playwright-core';

process.loadEnvFile('.env.local');
const base=process.env.TEST_BASE_URL||'http://localhost:3000';
const q=neon(process.env.DATABASE_URL).query;
const ids={customer:randomUUID(),admin:randomUUID(),seller:randomUUID(),sellerId:randomUUID(),order:randomUUID()};
const title='QA cracked-item '+randomUUID().slice(0,8);
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII=','base64');
const checks=[];
function token(id){const h=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),b=Buffer.from(JSON.stringify({sub:id,version:0,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');return h+'.'+b+'.'+createHmac('sha256',process.env.AUTH_SECRET||process.env.JWT_SECRET).update(h+'.'+b).digest('base64url');}
async function context(browser,id,width){const c=await browser.newContext({viewport:{width,height:width<800?844:920},serviceWorkers:'block'});c.setDefaultTimeout(18000);await c.addCookies([{name:'styleshopz_session',value:token(id),url:base}]);return c;}
async function visit(page,path){await page.goto(base+path);await page.locator('main').waitFor();}
async function check(name,work){await work();checks.push(name);console.log('PASS '+name);}
async function noOverflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
let browser;
try{
  await fs.mkdir('.qa/support-browser',{recursive:true});
  await q("INSERT INTO users(id,email,password_hash,name,role,email_verified_at) VALUES($1::uuid,$1::text||'@qa.invalid','disabled','Mobile Customer QA','customer',NOW()),($2::uuid,$2::text||'@qa.invalid','disabled','Owner QA','admin',NOW()),($3::uuid,$3::text||'@qa.invalid','disabled','Seller QA','seller',NOW())",[ids.customer,ids.admin,ids.seller]);
  await q("INSERT INTO sellers(id,user_id,shop_name,status) VALUES($1,$2,'Support QA shop','approved')",[ids.sellerId,ids.seller]);
  await q("INSERT INTO orders(id,user_id,address_snapshot,status,total_paise,subtotal_paise,payment_method,idempotency_key) VALUES($1,$2,'{}'::jsonb,'delivered',10000,10000,'demo',$3)",[ids.order,ids.customer,randomUUID()]);
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const customer=await context(browser,ids.customer,390),cp=await customer.newPage();
  await check('mobile customer creates categorized order-linked case with private photo',async()=>{
    await visit(cp,'/support');
    await cp.getByRole('button',{name:'New ticket'}).click();
    await cp.getByRole('combobox',{name:'Issue type'}).selectOption('product_issue');
    await cp.getByRole('combobox',{name:/Related order/}).selectOption(ids.order);
    await cp.getByRole('textbox',{name:'Subject'}).fill(title);
    await cp.getByRole('textbox',{name:'How can we help?'}).fill('The screen arrived cracked. <img src=x onerror=alert(1)> Please help.');
    await cp.locator('input[name=photos]').first().setInputFiles({name:'proof.png',mimeType:'image/png',buffer:png});
    await cp.getByRole('button',{name:'Send to support'}).click();
    await cp.getByRole('heading',{name:title}).waitFor();
    await cp.getByText('Linked order: '+ids.order).waitFor();
    assert.equal(await cp.locator('script').filter({hasText:'alert(1)'}).count(),0);
    await cp.locator('.support-evidence img').first().waitFor();
    await noOverflow(cp);
    await cp.screenshot({path:'.qa/support-browser/customer-mobile.png',fullPage:true});
  });
  const admin=await context(browser,ids.admin,1365),ap=await admin.newPage();
  await check('owner filters queue, sets urgent, writes private note and public reply',async()=>{
    await visit(ap,'/4632/admin');
    await ap.locator('.admin-tabs').getByRole('button',{name:'Support'}).click();
    await ap.getByRole('textbox',{name:'Search tickets'}).fill(title);
    await ap.getByRole('button',{name:'Search',exact:true}).click();
    await ap.locator('.ticket-list').getByRole('button',{name:new RegExp(title)}).click();
    await ap.getByRole('combobox',{name:'Ticket priority'}).selectOption('urgent');
    await ap.getByRole('checkbox',{name:/Internal note/}).check();
    await ap.getByRole('textbox',{name:'Reply to ticket'}).fill('Owner only: inspect the sample photo.');
    await ap.getByRole('button',{name:'Save note'}).click();
    await ap.getByText('Owner only: inspect the sample photo.').waitFor();
    await ap.waitForFunction(() => !document.querySelector('textarea[aria-label="Reply to ticket"]')?.disabled);
    await ap.getByRole('checkbox',{name:/Internal note/}).uncheck();
    await ap.getByRole('textbox',{name:'Reply to ticket'}).fill('We can review the demo return with you.');
    await ap.getByRole('button',{name:'Send reply'}).click();
    await ap.getByText('We can review the demo return with you.').waitFor();
    await ap.waitForFunction(() => {
      const reply = document.querySelector('textarea[aria-label="Reply to ticket"]');
      return reply && !reply.disabled && reply.value === '';
    });
    await noOverflow(ap);
    await ap.screenshot({path:'.qa/support-browser/owner-desktop.png',fullPage:true});
  });
  await check('customer sees owner reply but never the internal case note',async()=>{
    await cp.reload();
    await cp.locator('.ticket-list').getByRole('button',{name:new RegExp(title)}).click();
    await cp.getByText('We can review the demo return with you.').waitFor();
    assert.equal(await cp.getByText('Owner only: inspect the sample photo.').count(),0);
    await cp.getByRole('button',{name:'Mark resolved'}).click();
    await cp.getByRole('button',{name:'Reopen ticket'}).waitFor();
    await cp.getByRole('button',{name:'Reopen ticket'}).click();
    await cp.getByRole('textbox',{name:'Reply to ticket'}).fill('The issue is still here.');
    await cp.getByRole('button',{name:'Send reply'}).click();
    await cp.getByText('The issue is still here.').waitFor();
    await noOverflow(cp);
  });
  await check('owner support remains usable on a phone',async()=>{
    const mobile=await context(browser,ids.admin,390),page=await mobile.newPage();
    await visit(page,'/4632/admin');
    await page.locator('.admin-current-section').click();
    await page.locator('#admin-section-menu').getByRole('button',{name:'Support'}).click();
    await page.getByRole('textbox',{name:'Search tickets'}).fill(title);
    await page.getByRole('button',{name:'Search',exact:true}).click();
    await page.locator('.ticket-list').getByRole('button',{name:new RegExp(title)}).click();
    await page.getByRole('heading',{name:title}).waitFor();
    await page.getByText('We can review the demo return with you.').waitFor();
    await noOverflow(page);
    await page.screenshot({path:'.qa/support-browser/owner-mobile.png',fullPage:true});
    await mobile.close();
  });
  await check('seller opens shop issue without a customer order selector',async()=>{
    const seller=await context(browser,ids.seller,390),page=await seller.newPage();
    await visit(page,'/support');
    await page.getByRole('button',{name:'New ticket'}).click();
    assert.equal(await page.getByRole('combobox',{name:/Related order/}).count(),0);
    await page.getByRole('combobox',{name:'Issue type'}).selectOption('seller_shop');
    await page.getByRole('textbox',{name:'Subject'}).fill('Shop setup question');
    await page.getByRole('textbox',{name:'How can we help?'}).fill('Please check my demo shop setup.');
    await page.getByRole('button',{name:'Send to support'}).click();
    await page.getByRole('heading',{name:'Shop setup question'}).waitFor();
    await noOverflow(page);
    await seller.close();
  });
  await check('owner sign-out returns to the private owner entrance',async()=>{
    await ap.getByRole('button',{name:'Sign out'}).click();
    await ap.waitForURL(base+'/4632/admin/login');
    await ap.getByRole('heading',{name:'Owner sign-in'}).waitFor();
    assert.equal(await ap.getByRole('heading',{name:/Find it\. Buy it\./}).count(),0);
  });
  await fs.writeFile('.qa/support-browser-results.json',JSON.stringify({base,at:new Date().toISOString(),checks},null,2));
  console.log(JSON.stringify({passed:checks.length}));
} finally {
  if(browser) await browser.close();
  try {
    await q('DELETE FROM support_tickets WHERE user_id=ANY($1::uuid[])',[[ids.customer,ids.seller]]);
    await q('DELETE FROM orders WHERE id=$1',[ids.order]);
    await q('DELETE FROM uploads WHERE user_id=ANY($1::uuid[])',[[ids.customer,ids.seller,ids.admin]]);
    await q('DELETE FROM notifications WHERE user_id=ANY($1::uuid[])',[[ids.customer,ids.seller,ids.admin]]);
    await q('DELETE FROM sellers WHERE id=$1',[ids.sellerId]);
    const retained=await q('SELECT DISTINCT actor_id id FROM audit_logs WHERE actor_id=ANY($1::uuid[])',[[ids.customer,ids.seller,ids.admin]]);
    const retainedIds=retained.map(r=>r.id);
    await q("UPDATE users SET email=id::text||'@qa.invalid',name='Disabled support browser QA',deleted_at=NOW(),session_version=session_version+1 WHERE id=ANY($1::uuid[])",[retainedIds]);
    await q('DELETE FROM users WHERE id=ANY($1::uuid[]) AND NOT(id=ANY($2::uuid[]))',[[ids.customer,ids.seller,ids.admin],retainedIds]);
    console.log('Browser support fixtures removed.');
  } catch(error) {console.error('Browser support cleanup failed:',error.message);process.exitCode=1;}
}
