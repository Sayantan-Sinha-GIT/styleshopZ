import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {chromium} from 'playwright-core';
import {neon} from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
process.loadEnvFile('.env.local');
const base=process.env.TEST_BASE_URL||'http://localhost:3000', q=neon(process.env.DATABASE_URL).query;
const prefix='ui-'+randomUUID().slice(0,8),uid=randomUUID(),suid=randomUUID(),sid=randomUUID(),pid=randomUUID(),vid=randomUUID(),soldout=randomUUID(),cid=randomUUID(),deletionId=randomUUID();
const password='Browser!'+randomUUID(),email=prefix+'@qa.invalid',title=prefix+' Test Headphones',checks=[],failures=[],errors=[];
const out='.qa/final-browser';await fs.mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
let admin,cat,orders=[];
function token(id,version=0){const h=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'),p=Buffer.from(JSON.stringify({sub:id,version,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url');return h+'.'+p+'.'+createHmac('sha256',process.env.AUTH_SECRET||process.env.JWT_SECRET).update(h+'.'+p).digest('base64url');}
async function context(width=1440,theme='dark',id){const c=await b.newContext({viewport:{width,height:width<800?844:1000},serviceWorkers:'block'});c.setDefaultTimeout(18000);await c.addInitScript(t=>localStorage.setItem('styleshopz-theme',t),theme);if(id)await c.addCookies([{name:'styleshopz_session',value:token(id),url:base}]);return c;}
async function page(c){const p=await c.newPage();p.on('pageerror',e=>errors.push({message:e.message,url:p.url()}));return p;}
async function test(name,fn,p){try{await fn();checks.push(name);console.log('PASS '+name);}catch(e){failures.push({name,error:e.message});console.log('FAIL '+name+': '+e.message.split('\n')[0]);if(p)await p.screenshot({path:`${out}/failure-${failures.length}.png`,fullPage:true}).catch(()=>{});}}
async function visit(p,route){await p.goto(base+route);await p.locator('main').waitFor();await p.waitForTimeout(500);}
async function ready(p,selector='.product-card'){await p.locator(selector).first().waitFor();}
async function noOverflow(p,label){assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'overflow '+label);}
async function request(c,path,method='GET',data){const r=await c.request.fetch(base+'/api/'+path,{method,data});let body;try{body=await r.json()}catch{body={}};return {status:r.status(),body};}
try {
  [admin]=await q("SELECT id,session_version FROM users WHERE role='admin' AND deleted_at IS NULL LIMIT 1");
  [cat]=await q('SELECT id FROM categories WHERE level=3 LIMIT 1');
  const hash=await bcrypt.hash(password,10);
  await q("INSERT INTO users(id,email,password_hash,name,role,email_verified_at) VALUES($1,$2,$3,'Browser QA','customer',NOW()),($4,$5,$3,'Browser Seller QA','seller',NOW()),($6,$7,$3,'Delete Browser QA','customer',NOW())",[uid,email,hash,suid,prefix+'-seller@qa.invalid',deletionId,prefix+'-delete@qa.invalid']);
  await q("INSERT INTO sellers(id,user_id,shop_name,status) VALUES($1,$2,$3,'approved')",[sid,suid,prefix+' Shop']);
  await q("INSERT INTO products(id,seller_id,category_id,title,brand,description,status) VALUES($1,$2,$3,$4,'Browser QA','An isolated browser testing product. No real product or shipment.','live')",[pid,sid,cat.id,title]);
  await q("INSERT INTO variants(id,product_id,sku,options,price_paise,mrp_paise,stock) VALUES($1,$2,$3,'{\"color\":\"Black\"}',29900,39900,20),($4,$2,$5,'{\"color\":\"White\"}',34900,49900,0)",[vid,pid,prefix+'-black',soldout,prefix+'-white']);
  await q("INSERT INTO coupons(id,code,discount_type,discount_value,min_cart_paise,usage_limit,per_user_limit,expires_at) VALUES($1,$2,'percent',10,10000,10,5,NOW()+INTERVAL '1 hour')",[cid,prefix.toUpperCase()]);
  const guest=await context(),g=await page(guest);
  await test('Homepage autoplay, manual controls, search scroll position and removed scene',async()=>{
    await visit(g,'/');await ready(g);assert.equal(await g.locator('.home-photo-moment').count(),0);
    await g.mouse.move(0,0);const old=await g.locator('.orbit-caption').innerText();await g.waitForTimeout(6500);assert.notEqual(await g.locator('.orbit-caption').innerText(),old);
    await g.getByRole('button',{name:'Pause featured collections'}).click();await g.getByRole('button',{name:'Show collection 1'}).click();
    await g.evaluate(()=>window.__lenis?window.__lenis.scrollTo(650,{immediate:true}):scrollTo(0,650));await g.waitForTimeout(300);const sy=await g.evaluate(()=>scrollY);
    await g.getByRole('combobox',{name:'Search products'}).focus();await g.keyboard.type('lamp',{delay:70});assert(Math.abs(await g.evaluate(()=>scrollY)-sy)<2);
    await g.keyboard.press('Enter');await g.getByRole('heading',{name:'Results for “lamp”'}).waitFor();await ready(g);await noOverflow(g,'home/search');
  },g);
  await test('Search sorting, price, rating, discount, stock, brand and reset filters',async()=>{
    await visit(g,'/search');await ready(g);
    await g.getByRole('combobox',{name:'Sort products'}).selectOption('price_asc');await g.waitForURL(/sort=price_asc/);await ready(g);
    const prices=await g.locator('.product-bottom strong').allTextContents();const values=prices.map(p=>Number(p.replace(/[^0-9.]/g,'')));assert(values.every((v,i)=>!i||v>=values[i-1]));
    await g.getByRole('spinbutton',{name:'Minimum price (₹)',exact:true}).fill('100');await g.getByRole('spinbutton',{name:'Minimum price (₹)',exact:true}).blur();await g.waitForURL(/min_price=10000/);
    await g.getByRole('spinbutton',{name:'Maximum price (₹)',exact:true}).fill('5000');await g.getByRole('spinbutton',{name:'Maximum price (₹)',exact:true}).blur();await g.waitForURL(/max_price=500000/);
    await g.getByRole('combobox',{name:'Customer rating',exact:true}).selectOption('4');await g.waitForURL(/rating=4/);
    await g.getByRole('combobox',{name:'Minimum discount',exact:true}).selectOption('10');await g.waitForURL(/discount=10/);
    await g.getByRole('checkbox',{name:'In stock only'}).click();await g.waitForURL(/in_stock=true/);await g.waitForFunction(()=>document.querySelector('.filter-panel input[type=checkbox]').checked);
    await g.getByRole('button',{name:'Reset filters',exact:true}).click();await g.waitForURL(base+'/search');await ready(g);
    const brand=await g.getByRole('combobox',{name:'Brand',exact:true}).locator('option').nth(1).getAttribute('value');await g.getByRole('combobox',{name:'Brand',exact:true}).selectOption(brand);await g.waitForURL(/brand=/);await ready(g);
    await visit(g,'/search?q=zzzzunfindable'+randomUUID());await g.getByRole('heading',{name:'Nothing quite matches yet'}).waitFor();
  },g);
  await test('Product variants, sold out, zoom, pincode validation, guest cart persistence and quantity',async()=>{
    await visit(g,'/products/'+pid);await ready(g,'.product-detail');
    await g.getByRole('button',{name:'Zoom product photo'}).click();await g.getByRole('dialog').waitFor();await g.keyboard.press('Escape');assert.equal(await g.getByRole('dialog').isVisible(),false);
    await g.getByRole('button',{name:/White.*Sold out/}).click();assert(await g.getByRole('button',{name:'Add to bag',exact:true}).isDisabled());
    await g.getByRole('button',{name:/Black.*available/}).click();await g.getByRole('combobox',{name:'Quantity',exact:true}).selectOption('2');
    await g.getByRole('textbox',{name:'Delivery pincode'}).fill('000000');await g.getByRole('button',{name:'Check',exact:true}).click();await g.getByText('Enter a valid six-digit Indian pincode.').waitFor();
    await g.getByRole('textbox',{name:'Delivery pincode'}).fill('700001');await g.getByRole('button',{name:'Check',exact:true}).click();await g.getByText(/Delivery estimates are simulated/).waitFor();
    await g.getByRole('button',{name:'Add to bag',exact:true}).click();await g.getByText('Added to your bag.',{exact:true}).waitFor();
    await visit(g,'/cart');await ready(g,'.cart-item');await g.getByRole('combobox',{name:'Quantity for '+title,exact:true}).selectOption('3');await g.waitForTimeout(700);await g.reload();await ready(g,'.cart-item');assert.equal(await g.getByRole('combobox',{name:'Quantity for '+title,exact:true}).inputValue(),'3');
  },g);
  await test('Email login merges guest cart and wrong password has recoverable error',async()=>{
    await visit(g,'/login');await g.getByRole('textbox',{name:'Email address'}).fill(email);await g.locator('input[name=password]').fill('WrongPassword!');await g.locator('.auth-form form').getByRole('button',{name:'Sign in',exact:true}).click();await g.locator('.form-error').waitFor();
    await g.locator('input[name=password]').fill(password);await g.locator('.auth-form form').getByRole('button',{name:'Sign in',exact:true}).click();await g.waitForURL(base+'/');
    await visit(g,'/cart');await ready(g,'.cart-item');assert.equal(await g.getByRole('combobox',{name:'Quantity for '+title,exact:true}).inputValue(),'3');assert.equal(await g.evaluate(()=>localStorage.getItem('styleshopz.guest.v2')),null);
  },g);
  await test('Profile long Unicode name, invalid phone and persisted valid changes',async()=>{
    await visit(g,'/profile');await g.getByRole('textbox',{name:'Full name',exact:true}).fill('QA ग्राहक 🌻 '+ 'A'.repeat(65));await g.getByRole('textbox',{name:'Mobile number'}).fill('123');await g.getByRole('button',{name:'Save changes'}).click();await g.locator('.form-error, .empty[role=alert]').waitFor();
    await g.getByRole('textbox',{name:'Mobile number'}).fill('9876543210');await g.getByRole('button',{name:'Save changes'}).click();await g.getByText('Profile updated.',{exact:true}).waitFor();await noOverflow(g,'long profile');await g.reload();assert.equal(await g.getByRole('textbox',{name:'Mobile number'}).inputValue(),'9876543210');
  },g);
  await test('Ola search selects and saves delivery coordinates; manual address and default edit',async()=>{
    await visit(g,'/addresses');await g.getByRole('textbox',{name:'Find a delivery location'}).fill('Victoria Memorial');await g.getByRole('button',{name:/Victoria Memorial/}).first().click();await g.getByRole('button',{name:'Use this delivery pin'}).waitFor();await g.waitForFunction(()=>!document.querySelector('.map-address button').disabled);await g.getByRole('button',{name:'Use this delivery pin'}).click();
    await g.getByRole('textbox',{name:'Full name',exact:true}).fill('QA Fixture');await g.getByRole('textbox',{name:'Mobile number',exact:true}).fill('9876543210');await g.getByRole('textbox',{name:'Address line 1',exact:true}).fill('10 QA Test Road');
    await g.getByRole('textbox',{name:'City',exact:true}).fill('Kolkata');await g.getByRole('textbox',{name:'State',exact:true}).fill('West Bengal');await g.getByRole('textbox',{name:'Pincode',exact:true}).fill('700001');await g.getByRole('checkbox',{name:'Use as my default address'}).check();await g.getByRole('button',{name:'Save address',exact:true}).click();await g.getByText('Address saved.',{exact:true}).waitFor();
    const [saved]=await q('SELECT latitude,longitude FROM addresses WHERE user_id=$1',[uid]);assert(saved.latitude&&saved.longitude);
    await g.getByRole('button',{name:'Edit',exact:true}).click();await g.getByRole('textbox',{name:'Address line 2 (optional)',exact:true}).fill('Floor 2, QA');await g.getByRole('button',{name:'Save address',exact:true}).click();await g.getByText('Address saved.',{exact:true}).waitFor();
  },g);
  await test('Wishlist save, create, move between lists and move to cart',async()=>{
    await visit(g,'/products/'+pid);await ready(g,'.product-detail');await g.getByRole('button',{name:'Save',exact:true}).click();await g.getByText('Saved to your wishlist.',{exact:true}).waitFor();await visit(g,'/wishlists');await g.getByRole('textbox',{name:'New wishlist name'}).fill('QA Special Finds');await g.getByRole('button',{name:'Create list'}).click();await g.getByRole('button',{name:'QA Special Finds',exact:true}).waitFor();
    const lists=await q('SELECT id FROM wishlists WHERE user_id=$1 AND name=$2',[uid,'QA Special Finds']);await g.getByRole('combobox',{name:'Saved list for '+title,exact:true}).selectOption(lists[0].id);await g.getByText('Saved find moved to your list.',{exact:true}).waitFor();await g.getByRole('button',{name:'QA Special Finds',exact:true}).click();await g.getByRole('button',{name:'Move to bag',exact:true}).click();await g.getByRole('heading',{name:'Leave a little room for a good find'}).waitFor();await g.getByRole('button',{name:'Delete selected list'}).click();
  },g);
  await test('Comparison full URL, malformed/duplicate additions, unavailable recovery and clear',async()=>{
    const catalogue=await request(guest,'products?limit=2');const second=catalogue.body.products.find(p=>p.id!==pid).id;
    await visit(g,'/compare?ids='+pid);await g.getByRole('link',{name:'View product',exact:true}).waitFor();await g.getByRole('textbox',{name:'Product link to compare'}).fill(base+'/products/'+second+'/?ref=test#top');await g.getByRole('button',{name:'Add product',exact:true}).click();await g.waitForURL(new RegExp(second));await g.waitForFunction(()=>document.querySelectorAll('.product-grid .panel').length===2);
    await g.getByRole('textbox',{name:'Product link to compare'}).fill('nonsense');await g.getByRole('button',{name:'Add product',exact:true}).click();await g.getByText('Paste a product link or product ID from this shop.').waitFor();
    await g.getByRole('textbox',{name:'Product link to compare'}).fill(pid);await g.getByRole('button',{name:'Add product',exact:true}).click();await g.getByText('That product is already in your comparison.').waitFor();
    await visit(g,'/compare?ids='+pid+','+randomUUID());await g.getByRole('button',{name:'Remove unavailable product',exact:true}).click();await g.waitForURL(base+'/compare?ids='+pid);await g.getByRole('link',{name:'View product',exact:true}).waitFor();assert.equal(await g.getByRole('link',{name:'View product',exact:true}).count(),1);await g.getByRole('button',{name:'Clear comparison'}).click();await g.getByRole('heading',{name:'Find your favourites, then compare'}).waitFor();
  },g);
  await test('Cart save for later, disabled empty checkout, coupon failure and success',async()=>{
    await visit(g,'/cart');await ready(g,'.cart-item');await g.getByRole('button',{name:'Save for later',exact:true}).click();await g.getByRole('button',{name:'Move to bag',exact:true}).waitFor();await g.getByRole('link',{name:'Continue to checkout'}).click({force:true});assert.equal(g.url(),base+'/cart');await g.getByRole('button',{name:'Move to bag',exact:true}).click();await g.getByRole('button',{name:'Save for later',exact:true}).waitFor();
    await g.getByRole('textbox',{name:'Coupon code'}).fill('NOT-A-REAL-COUPON');await g.getByRole('button',{name:'Apply',exact:true}).click();await g.locator('.form-error, .empty[role=alert]').waitFor();await g.getByRole('textbox',{name:'Coupon code'}).fill(prefix.toUpperCase());await g.getByRole('button',{name:'Apply',exact:true}).click();await g.getByText('Coupon applied.',{exact:true}).waitFor();
  },g);
  async function order(method='demo'){
    const cart=await request(guest,'cart');if(!cart.body.items.some(i=>!i.saved_for_later))await request(guest,'cart','POST',{variantId:vid,quantity:1});
    await visit(g,'/checkout');await g.getByRole('button',{name:/Place (demo|COD) order/}).waitFor();await g.getByRole('radio',{name:method==='demo'?/Demo payment/:/Cash on delivery/}).check();await g.getByRole('button',{name:method==='demo'?'Place demo order':'Place COD order',exact:true}).click();await g.waitForURL(/\/orders\/[0-9a-f-]+$/);const id=g.url().split('/').pop();orders.push(id);return id;
  }
  let firstOrder,secondOrder;
  await test('Checkout reserves stock, requires address, places demo order and generates invoice',async()=>{
    firstOrder=await order();await g.getByRole('heading',{name:'Your order is in motion'}).waitFor();const invoice=await guest.request.get(base+'/api/orders/'+firstOrder+'/invoice');assert.equal(invoice.status(),200);assert((await invoice.body()).subarray(0,4).toString()==='%PDF');assert.equal((await request(guest,'cart')).body.items.filter(i=>!i.saved_for_later).length,0);
  },g);
  await test('Cancellation restores stock once and buy again works',async()=>{
    const [before]=await q('SELECT stock FROM variants WHERE id=$1',[vid]);await g.getByRole('button',{name:'Cancel order',exact:true}).click();await g.locator('textarea[name=reason],input[name=reason]').fill('Browser QA cancellation');await g.getByRole('button',{name:'Confirm cancellation',exact:true}).click();await g.getByRole('heading',{name:'Order cancelled',exact:true}).waitFor();const [after]=await q('SELECT stock FROM variants WHERE id=$1',[vid]);assert.equal(after.stock,before.stock+Number((await q('SELECT SUM(quantity)::int quantity FROM order_items WHERE order_id=$1',[firstOrder]))[0].quantity));await g.getByRole('button',{name:'Buy again',exact:true}).click();await g.getByText('Added to your bag.',{exact:true}).waitFor();
  },g);
  const seller=await context(1440,'dark',suid),sp=await page(seller),owner=await context(1440,'dark');await owner.addCookies([{name:'styleshopz_session',value:token(admin.id,admin.session_version),url:base}]);const ap=await page(owner);
  await test('Seller overview/products/ledger/shop and admin workspace tabs load',async()=>{
    await visit(sp,'/seller');await sp.getByRole('heading',{name:prefix+' Shop',exact:true}).waitFor();for(const t of ['Products','Orders','Returns','Ledger','Shop','Overview']){await sp.locator('.tabs').getByRole('button',{name:t,exact:true}).click();await sp.waitForTimeout(350);assert.equal(await sp.locator('.form-error, .empty[role=alert]').count(),0);await noOverflow(sp,'seller '+t);}
    await visit(ap,'/4632/admin');await ap.getByRole('heading',{name:'Overview'}).waitFor();for(const t of ['Users','Sellers','Moderation','Promotions','Orders','Support','Audit','Overview']){await ap.locator('.admin-tabs').getByRole('button',{name:t,exact:true}).click();await ap.waitForTimeout(500);assert.equal(await ap.locator('.form-error, .empty[role=alert]').count(),0);await noOverflow(ap,'admin '+t);}
  },sp);
  await test('COD order seller fulfilment assigns demo tracking and advances to delivered',async()=>{
    secondOrder=await order('cod');await visit(sp,'/seller');await sp.locator('.tabs').getByRole('button',{name:'Orders',exact:true}).click();const row=sp.locator('tr').filter({hasText:title}).filter({hasText:secondOrder.slice(0,8)});await row.getByRole('button',{name:'Mark packed',exact:true}).click();await row.getByRole('button',{name:'Mark shipped',exact:true}).waitFor();await row.getByRole('button',{name:'Mark shipped',exact:true}).click();await row.getByText(/Demo courier · SZDEMO[A-F0-9]{14}/).waitFor();await row.getByRole('button',{name:'Mark out for delivery',exact:true}).click();await row.getByRole('button',{name:'Mark delivered',exact:true}).click();await row.locator('td').nth(2).filter({hasText:/^delivered/}).waitFor();await g.reload();await g.getByRole('heading',{name:'A good find, delivered'}).waitFor();
  },sp);
  await test('Delivered product review and question submission',async()=>{
    await visit(g,'/products/'+pid);await ready(g,'.product-detail');await g.getByRole('textbox',{name:'Your review',exact:true}).fill('Browser QA verified purchase review. Nice demo product.');await g.getByRole('button',{name:'Submit review',exact:true}).click();await g.getByText('Review submitted.',{exact:true}).waitFor();await g.getByRole('textbox',{name:'Product question',exact:true}).fill('Does this QA demo include a carrying case?');await g.getByRole('button',{name:'Ask a question',exact:true}).click();await g.getByText('Does this QA demo include a carrying case?',{exact:true}).waitFor();
  },g);
  await test('Return request and admin simulated refund',async()=>{
    await visit(g,'/orders/'+secondOrder);await g.getByRole('button',{name:'Return this item',exact:true}).click();await g.getByRole('textbox',{name:'Return reason'}).fill('Browser QA demonstration refund request');await g.getByRole('button',{name:'Request return',exact:true}).click();await g.getByText('Return request submitted.',{exact:true}).waitFor();await visit(ap,'/4632/admin');await ap.locator('.admin-tabs').getByRole('button',{name:'Orders',exact:true}).click();const row=ap.locator('tr').filter({hasText:'Browser QA demonstration refund request'});await row.getByRole('button',{name:'Approve refund'}).click();await row.getByText('refunded',{exact:true}).waitFor();await g.reload();await g.getByText(/Return refunded/).waitFor();
  },g);
  await test('Support ticket create/reply/resolve/reopen and notification read',async()=>{
    await visit(g,'/support');await g.getByRole('button',{name:'New ticket',exact:true}).click();await g.getByRole('combobox',{name:'Issue type'}).selectOption('technical_issue');await g.getByRole('textbox',{name:'Subject',exact:true}).fill(prefix+' Support ticket');await g.getByRole('textbox',{name:'How can we help?'}).fill('QA fixture, testing a support conversation.');await g.getByRole('button',{name:'Send to support'}).click();await g.getByRole('textbox',{name:'Reply to ticket'}).fill('Second browser QA message.');await g.getByRole('button',{name:'Send reply',exact:true}).click();await g.getByText('Second browser QA message.',{exact:true}).waitFor();await g.getByRole('button',{name:'Mark resolved',exact:true}).click();await g.getByRole('button',{name:'Reopen ticket',exact:true}).click();await g.getByRole('button',{name:'Mark resolved',exact:true}).waitFor();await visit(g,'/notifications');await g.getByRole('button',{name:'Mark all as read'}).click();await g.waitForTimeout(700);assert.equal(await g.getByText('New',{exact:true}).count(),0);
  },g);
  await test('Assistant product search, history persistence and clear',async()=>{
    await visit(g,'/assistant');await g.getByRole('textbox',{name:'Message the shopping assistant'}).fill('Find wireless headphones');const reply=g.waitForResponse(r=>r.url().includes('/api/assistant/chat')&&r.request().method()==='POST',{timeout:60000});await g.getByRole('button',{name:'Send message',exact:true}).click();assert.equal((await reply).status(),200);await g.locator('.assistant-product').first().waitFor();assert.equal(await g.locator('.form-error, .empty[role=alert]').count(),0);await g.reload();await g.locator('.message.own').filter({hasText:'Find wireless headphones'}).waitFor();await g.getByRole('button',{name:'Clear history',exact:true}).click();await g.waitForTimeout(700);assert.equal((await request(guest,'assistant/chat')).body.messages.length,0);
  },g);
  await test('Settings save, language persistence, data export and history clear',async()=>{
    await visit(g,'/settings');await g.getByRole('combobox',{name:'Navigation language'}).selectOption('hi');await g.getByRole('checkbox',{name:'Offers in the app'}).check();await g.getByRole('button',{name:'Save preferences'}).click();await g.getByText('Preferences saved.',{exact:true}).waitFor();await g.reload();assert.equal(await g.getByRole('combobox',{name:'Navigation language'}).inputValue(),'hi');await g.getByRole('combobox',{name:'Navigation language'}).selectOption('en');await g.getByRole('button',{name:'Save preferences'}).click();const exportData=await request(guest,'account/export');assert.equal(exportData.status,200);assert.equal(exportData.body.profile.id,uid);await g.getByRole('button',{name:'Clear browsing history & cache'}).click();await g.getByText('Browsing history and offline cache cleared.',{exact:true}).waitFor();
  },g);
  await test('Customer cannot access seller/admin workspaces and owner login has no Google',async()=>{
    assert.equal((await g.request.get(base+'/admin')).status(),404);
    for(const route of ['/4632/admin','/seller']){await visit(g,route);await g.getByRole('heading',{name:'This area belongs to a different role'}).waitFor();}
    const anon=await context(),p=await page(anon);await visit(p,'/4632/admin/login');assert.equal(await p.getByRole('button',{name:'Continue with Google'}).count(),0);assert.equal(await p.getByRole('button',{name:'Create account',exact:true}).count(),0);await visit(p,'/login');await p.getByRole('button',{name:'Continue with Google'}).waitFor();await anon.close();
  },g);
  await test('Customer account deletion confirmation and session invalidation',async()=>{
    const d=await context(390,'light',deletionId),p=await page(d);await visit(p,'/settings');await p.getByRole('button',{name:'Delete account',exact:true}).click();assert(await p.getByRole('button',{name:'Permanently delete account'}).isDisabled());await p.getByRole('textbox',{name:'Type DELETE to confirm'}).fill('DELETE');await p.getByRole('button',{name:'Permanently delete account'}).click();await p.waitForURL(base+'/');assert.equal((await request(d,'auth/me')).body.user,null);await d.close();
  });
  await test('Mobile dark/light all public and account routes, long query, legal content and reduced motion',async()=>{
    for(const theme of ['dark','light']){const c=await context(390,theme,uid),p=await page(c);for(const route of ['/','/search?q=lamp','/categories','/deals','/products/'+pid,'/cart','/compare?ids='+pid,'/customer','/profile','/addresses','/orders','/orders/'+secondOrder,'/wishlists','/notifications','/support','/assistant','/settings','/help','/terms','/privacy','/setup-guide','/missing-route']){await visit(p,route);await p.waitForFunction(()=>!document.querySelector('main [aria-busy=true]'));await p.waitForTimeout(250);await noOverflow(p,theme+route);assert.equal(await p.getByText('Application error: a client-side exception').count(),0);}await visit(p,'/search?q='+encodeURIComponent('長い検索🌻'.repeat(55)));await noOverflow(p,'long query');await c.close();}
    const c=await b.newContext({viewport:{width:360,height:800},reducedMotion:'reduce',serviceWorkers:'block'}),p=await page(c);await visit(p,'/');await ready(p);assert.equal(await p.locator('.pin-spacer').count(),0);assert.equal(await p.getByRole('button',{name:'Pause featured collections'}).count(),0);await noOverflow(p,'360 reduced motion');await p.screenshot({path:out+'/mobile-reduced.png'});await c.close();
  });
  await test('Corrupt guest storage, service unavailable and offline recovery',async()=>{
    for(const corrupted of ['{}','null','[null,{"variantId":123,"quantity":-1}]']){const c=await context(390,'light'),p=await page(c);await c.addInitScript(v=>localStorage.setItem('styleshopz.guest.v2',v),corrupted);await visit(p,'/products/'+pid);await ready(p,'.product-detail');await p.getByRole('button',{name:'Add to bag',exact:true}).click();await p.getByText('Added to your bag.',{exact:true}).waitFor();await c.close();}
    const c=await context(390,'dark'),p=await page(c);await p.route('**/api/products?*',route=>route.fulfill({status:503,contentType:'text/html',body:'Unavailable'}));await visit(p,'/search?q=lamp');await p.getByText('The shop is temporarily unavailable. Please try again.').waitFor();await p.unroute('**/api/products?*');await p.getByRole('button',{name:'Retry',exact:true}).click();await ready(p);await c.setOffline(true);await p.getByRole('combobox',{name:'Sort products'}).selectOption('price_desc');await p.getByText('Could not connect to the shop. Check your connection and try again.').waitFor();await c.setOffline(false);await p.getByRole('button',{name:'Retry',exact:true}).click();await ready(p);await c.close();
  });
  await test('Razorpay test order opens provider checkout and pending order can be cancelled',async()=>{
    assert.equal((await request(guest,'config')).body.razorpay,true,'Test gateway must be configured');
    await request(guest,'cart','POST',{variantId:vid,quantity:1});await visit(g,'/checkout');await g.getByRole('radio',{name:/Razorpay test payment/}).check();
    const created=g.waitForResponse(r=>r.url().includes('/api/checkout/create-order')&&r.request().method()==='POST');await g.getByRole('button',{name:'Continue to test payment',exact:true}).click();const response=await created;assert.equal(response.status(),200);const pending=await response.json();orders.push(pending.orderId);
    await g.locator('.summary-total').filter({hasText:'₹'+(pending.totalPaise/100).toLocaleString('en-IN')}).waitFor();await g.getByText('1 × '+title,{exact:true}).waitFor();assert(await g.getByRole('textbox',{name:'Coupon code'}).isDisabled());
    await g.locator('iframe.razorpay-checkout-frame').waitFor({timeout:30000});
    const f=g.frameLocator('iframe.razorpay-checkout-frame');await f.locator('body').filter({hasText:/test|contact|payment/i}).waitFor({timeout:30000});await g.screenshot({path:out+'/razorpay-test-widget.png'});
    await visit(g,'/orders/'+pending.orderId);await g.getByRole('heading',{name:'Your order is waiting for payment'}).waitFor();await g.getByRole('button',{name:'Cancel order',exact:true}).click();await g.getByRole('textbox',{name:'Cancellation reason'}).fill('QA test checkout cancelled without charging');await g.getByRole('button',{name:'Confirm cancellation',exact:true}).click();await g.getByRole('heading',{name:'Order cancelled',exact:true}).waitFor();
  },g);
} finally {
  await b.close();
  try {
    await q('DELETE FROM coupon_redemptions WHERE user_id=ANY($1::uuid[])',[[uid,deletionId]]);
    await q('DELETE FROM orders WHERE user_id=ANY($1::uuid[])',[[uid,deletionId]]);
    await q('DELETE FROM support_tickets WHERE user_id=ANY($1::uuid[])',[[uid,deletionId]]);
    await q('DELETE FROM uploads WHERE user_id=ANY($1::uuid[])',[[uid,deletionId,suid]]);
    await q('DELETE FROM products WHERE id=$1',[pid]);await q('DELETE FROM sellers WHERE id=$1',[sid]);await q('DELETE FROM coupons WHERE id=$1',[cid]);
    await q("UPDATE users SET name='Deleted browser QA',email=id::text||'@qa.invalid',phone=NULL,deleted_at=NOW(),session_version=session_version+1 WHERE id=ANY($1::uuid[])",[[uid,deletionId,suid]]);
    for(const table of ['addresses','auth_identities','email_codes','assistant_messages','carts','wishlists','notifications'])await q('DELETE FROM '+table+' WHERE user_id=ANY($1::uuid[])',[[uid,deletionId,suid]]);
  }catch(e){console.log('Fixture cleanup: '+e.message);failures.push({name:'fixture cleanup',error:e.message});}
  const result={base,at:new Date().toISOString(),checks,failures,errors};await fs.writeFile('.qa/final-browser-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify({checks:checks.length,failures,errors},null,2));
  if(failures.length||errors.length)process.exitCode=1;
}
