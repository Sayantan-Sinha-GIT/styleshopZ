import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID, createHmac } from "node:crypto";
import { neon } from "@neondatabase/serverless";

process.loadEnvFile(".env.local");
const base=process.env.TEST_BASE_URL || "http://localhost:3000",q=neon(process.env.DATABASE_URL).query;
const prefix="mgmt-qa-"+randomUUID().slice(0,8),adminId=randomUUID(),sellerUserId=randomUUID(),customerId=randomUUID(),otherCustomerId=randomUUID(),sellerId=randomUUID(),unrelatedSellerId=randomUUID();
const userIds=[adminId,sellerUserId,customerId,otherCustomerId],categoryIds=[randomUUID(),randomUUID(),randomUUID()],couponId=randomUUID(),dealId=randomUUID(),bannerId=randomUUID();
let productId,variantId,currentTest;
const checks=[];
const future=new Date(Date.now()+3600000).toISOString();
function cookie(id){const head=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),body=Buffer.from(JSON.stringify({sub:id,version:0,exp:Math.floor(Date.now()/1000)+3600})).toString("base64url");return "styleshopz_session="+head+"."+body+"."+createHmac("sha256",process.env.AUTH_SECRET || process.env.JWT_SECRET).update(head+"."+body).digest("base64url");}
const admin=cookie(adminId),seller=cookie(sellerUserId),customer=cookie(customerId),other=cookie(otherCustomerId);
async function api(path,method="GET",body,session=customer){const response=await fetch(base+"/api/"+path,{method,headers:{...(session?{Cookie:session}:{}),...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});return {status:response.status,body:await response.json()};}
async function test(name,run){currentTest=name;await run();checks.push(name);console.log("PASS "+name);}
async function manifest(){await fs.mkdir(".qa",{recursive:true});await fs.writeFile(".qa/management-fixtures.json",JSON.stringify({at:new Date().toISOString(),base,userIds,sellerId,categoryIds,couponId,dealId,bannerId,productId},null,2));}
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII=","base64");
async function upload(session){const form=new FormData();form.set("file",new File([png],"fixture.png",{type:"image/png"}));const response=await fetch(base+"/api/uploads",{method:"POST",headers:{Cookie:session},body:form});assert.equal(response.status,200);return (await response.json()).url;}
try{
  await manifest();
  await q("INSERT INTO users(id,email,password_hash,name,role,email_verified_at) VALUES($1::uuid,$1::uuid::text||'@qa.invalid','fixture-disabled','Management QA admin','admin',NOW()),($2::uuid,$2::uuid::text||'@qa.invalid','fixture-disabled','Management QA seller','seller',NOW()),($3::uuid,$3::uuid::text||'@qa.invalid','fixture-disabled','Management QA customer','customer',NOW()),($4::uuid,$4::uuid::text||'@qa.invalid','fixture-disabled','Management QA second customer','customer',NOW())",userIds);
  await q("INSERT INTO sellers(id,user_id,shop_name,status) VALUES($1,$2,$3,'pending')",[sellerId,sellerUserId,prefix]);
  await test("seller approval and admin management writes enforce role permissions",async()=>{
    assert.equal((await api("admin/sellers","POST",{sellerId,status:"approved"},customer)).status,403);
    assert.equal((await api("admin/sellers","POST",{sellerId,status:"approved"},seller)).status,403);
    assert.equal((await api("seller/products","POST",{},seller)).status,403);
    assert.equal((await api("admin/sellers","POST",{sellerId,status:"unknown"},admin)).status,400);
    assert.equal((await api("admin/sellers","POST",{sellerId,status:"approved"},admin)).status,200);
    assert.equal((await api("seller","GET",undefined,seller)).body.seller.status,"approved");
  });
  await test("category creation validates hierarchy and slug input",async()=>{
    for(let index=0;index<3;index++){
      const result=await api("admin/promotions","POST",{type:"category",id:categoryIds[index],name:prefix+" level "+(index+1),slug:prefix+"-"+(index+1),level:index+1,parent_id:index?categoryIds[index-1]:null},admin);
      assert.equal(result.status,200,JSON.stringify(result.body));
    }
    assert.equal((await api("admin/promotions","POST",{type:"category",id:randomUUID(),name:"Invalid parent",slug:prefix+"-bad",level:2,parent_id:categoryIds[2]},admin)).status,400);
    assert.equal((await api("admin/promotions","POST",{type:"category",id:randomUUID(),name:"Invalid slug",slug:"Invalid Slug!",level:1},admin)).status,400);
  });
  await test("seller KYC accepts owned uploads and keeps documents private",async()=>{
    const ownDocument=await upload(seller),foreignDocument=await upload(customer);
    const profile={shopName:prefix,businessType:"Individual",pan:"ABCDE1234F",gstin:"",document:foreignDocument};
    assert.equal((await api("seller/profile","POST",profile,seller)).status,400);
    assert.equal((await api("seller/profile","POST",{...profile,document:ownDocument},seller)).status,200);
    assert.equal((await fetch(base+ownDocument,{headers:{Cookie:customer}})).status,404);
    assert.equal((await fetch(base+ownDocument,{headers:{Cookie:seller}})).status,200);
    assert.equal((await fetch(base+ownDocument,{headers:{Cookie:admin}})).status,200);
    assert.equal((await api("seller/profile","POST",{...profile,document:ownDocument,pan:"bad-pan"},seller)).status,400);
  });
  let productPayload;
  await test("seller product creation rejects malformed variants and invalid money",async()=>{
    productPayload={title:prefix+" product",brand:"QA",description:"An isolated management integration fixture.",categoryId:categoryIds[2],status:"live",imageUrl:"/photos/categories/home-kitchen.webp",variants:[{sku:prefix+"-SKU",price_paise:10000,mrp_paise:12000,stock:3,options:{Color:"Amber"}}]};
    assert.equal((await api("seller/products","POST",{...productPayload,variants:[null]},seller)).status,400);
    assert.equal((await api("seller/products","POST",{...productPayload,variants:[{...productPayload.variants[0],price_paise:1.5}]},seller)).status,400);
    const created=await api("seller/products","POST",productPayload,seller);assert.equal(created.status,200,JSON.stringify(created.body));productId=created.body.id;await manifest();
    const detail=await api("products/"+productId);assert.equal(detail.status,200);variantId=detail.body.variants[0].id;productPayload.variants[0].id=variantId;assert.deepEqual(detail.body.variants[0].options,{Color:"Amber"});
  });
  await test("seller product photo upload is public only when owned and not private",async()=>{
    const ownPhoto=await upload(seller),foreignPhoto=await upload(customer),privatePhoto=await upload(seller);
    await q("UPDATE uploads SET private=TRUE WHERE id=$1",[privatePhoto.split('/').pop()]);
    for(const imageUrl of [foreignPhoto,privatePhoto]){
      const rejected=await api("seller/products","POST",{...productPayload,id:productId,imageUrl},seller);
      assert.equal(rejected.status,400,JSON.stringify(rejected.body));
    }
    const saved=await api("seller/products","POST",{...productPayload,id:productId,imageUrl:ownPhoto},seller);
    assert.equal(saved.status,200,JSON.stringify(saved.body));
    const detail=await api("products/"+productId);
    assert.equal(detail.body.images[0].url,ownPhoto);
    const image=await fetch(base+ownPhoto);
    assert.equal(image.status,200);
    assert.equal(image.headers.get('content-type'),'image/png');
    assert.equal((await image.arrayBuffer()).byteLength,png.byteLength);
    productPayload={...productPayload,imageUrl:ownPhoto};
  });
  await test("seller inventory updates respect active holds and visibility",async()=>{
    const hold=await api("checkout/hold","POST",{items:[{variantId,quantity:2}]});assert.equal(hold.status,200);
    const edited={...productPayload,id:productId,variants:[{...productPayload.variants[0],id:variantId,stock:1}]};
    assert.equal((await api("seller/products","POST",edited,seller)).status,400);
    edited.variants[0].stock=4;edited.variants[0].price_paise=11000;
    assert.equal((await api("seller/products","POST",edited,seller)).status,200);
    await q("DELETE FROM stock_holds WHERE user_id=$1",[customerId]);
    assert.equal((await api("seller/products","POST",{...edited,status:"hidden"},seller)).status,200);
    assert.equal((await api("products/"+productId)).status,404);
    assert.equal((await api("seller/products","POST",edited,seller)).status,200);
    productPayload=edited;
  });
  await test("admin coupon and deal writes validate amounts and update catalogue prices",async()=>{
    const coupon={type:"coupon",id:couponId,code:prefix.toUpperCase(),discount_type:"percent",discount_value:10,min_cart_paise:0,usage_limit:2,per_user_limit:1,expires_at:future};
    assert.equal((await api("admin/promotions","POST",coupon,customer)).status,403);
    assert.equal((await api("admin/promotions","POST",{...coupon,discount_value:91},admin)).status,400);
    assert.equal((await api("admin/promotions","POST",coupon,admin)).status,200);
    assert.equal((await api("admin/promotions","POST",{...coupon,discount_value:15},admin)).status,200);
    assert.equal((await q("SELECT discount_value FROM coupons WHERE id=$1",[couponId]))[0].discount_value,15);
    const deal={type:"deal",id:dealId,variant_id:variantId,deal_price_paise:9000,quantity_cap:2,ends_at:future};
    assert.equal((await api("admin/promotions","POST",{...deal,deal_price_paise:12000},admin)).status,400);
    assert.equal((await api("admin/promotions","POST",{...deal,quantity_cap:0},admin)).status,400);
    assert.equal((await api("admin/promotions","POST",deal,admin)).status,200);
    assert.equal((await api("admin/promotions","POST",{...deal,deal_price_paise:8000},admin)).status,200);
    const found=await api("products?q="+encodeURIComponent(prefix)+"&deals=true");assert.equal(Number(found.body.products[0].price_paise),8000);
  });
  await test("pending payment quotes reserve promotional quantity and retain their price after offer expiry",async()=>{
    const address={name:"Management QA",phone:"9876543210",line1:"10 Fixture Road",city:"Kolkata",state:"West Bengal",pincode:"700001"};
    const items=[{variantId,quantity:2}],hold=await api("checkout/hold","POST",{items});assert.equal(hold.status,200);
    const quoted=await api("checkout/create-order","POST",{items,batchId:hold.body.batchId,address,paymentMethod:"razorpay",idempotencyKey:randomUUID()});assert.equal(quoted.status,200,JSON.stringify(quoted.body));assert.equal(quoted.body.totalPaise,20000);
    assert.equal(Number((await api("products/"+productId)).body.variants[0].unit_price_paise),11000);
    const deal={type:"deal",id:dealId,variant_id:variantId,deal_price_paise:8000,quantity_cap:1,ends_at:future};
    assert.equal((await api("admin/promotions","POST",deal,admin)).status,400);
    await q("UPDATE orders SET payment_expires_at=NOW()-INTERVAL '1 minute' WHERE id=$1",[quoted.body.orderId]);
    assert.equal(Number((await api("products/"+productId)).body.variants[0].unit_price_paise),8000);
    await q("UPDATE orders SET payment_expires_at=NOW()+INTERVAL '10 minutes' WHERE id=$1",[quoted.body.orderId]);
    const nextItems=[{variantId,quantity:1}],nextHold=await api("checkout/hold","POST",{items:nextItems},other);
    const nextOrder=await api("checkout/create-order","POST",{items:nextItems,batchId:nextHold.body.batchId,address,paymentMethod:"demo",idempotencyKey:randomUUID()},other);assert.equal(nextOrder.status,200,JSON.stringify(nextOrder.body));assert.equal(nextOrder.body.totalPaise,15000);
    assert.equal(Number((await q("SELECT unit_price_paise FROM order_items WHERE order_id=$1",[nextOrder.body.orderId]))[0].unit_price_paise),11000);
    assert.equal((await api("orders/"+nextOrder.body.orderId+"/cancel","POST",{reason:"Disposable management quote test"},other)).status,200);
    await q("UPDATE deals SET ends_at=NOW()-INTERVAL '1 second' WHERE id=$1",[dealId]);
    const raw=JSON.stringify({event:"payment.captured",payload:{payment:{entity:{id:"pay_qa_"+randomUUID(),order_id:quoted.body.razorpayOrderId,amount:20000,currency:"INR",status:"captured"}}}});
    const captured=await fetch(base+"/api/payments/webhook",{method:"POST",headers:{"Content-Type":"application/json","x-razorpay-signature":createHmac("sha256",process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest("hex")},body:raw});
    assert.equal(captured.status,200,JSON.stringify(await captured.json()));
    assert.equal((await q("SELECT sold_count FROM deals WHERE id=$1",[dealId]))[0].sold_count,2);
    assert.equal(Number((await q("SELECT unit_price_paise FROM order_items WHERE order_id=$1",[quoted.body.orderId]))[0].unit_price_paise),8000);
    await q("DELETE FROM orders WHERE id=ANY($1::uuid[])",[[quoted.body.orderId,nextOrder.body.orderId]]);
    await q("UPDATE variants SET stock=4 WHERE id=$1",[variantId]);
    await q("UPDATE deals SET sold_count=0,ends_at=$2 WHERE id=$1",[dealId,future]);
  });
  await test("admin banners stay internal and can be disabled",async()=>{
    const banner={type:"banner",id:bannerId,title:prefix+" banner",image_url:"/photos/categories/home-kitchen.webp",link_url:"/search?q="+prefix,sort_order:99,is_active:true};
    assert.equal((await api("admin/promotions","POST",{...banner,link_url:"https://outside.invalid"},admin)).status,400);
    assert.equal((await api("admin/promotions","POST",{...banner,link_url:"//outside.invalid"},admin)).status,400);
    assert.equal((await api("admin/promotions","POST",{...banner,link_url:"/\\outside.invalid"},admin)).status,400);
    assert.equal((await api("admin/promotions","POST",{...banner,link_url:"/\n/outside.invalid"},admin)).status,400);
    assert.equal((await api("admin/promotions","POST",banner,admin)).status,200);
    assert((await api("banners")).body.banners.some(row=>row.id===bannerId));
    assert.equal((await api("admin/promotions","POST",{...banner,is_active:false},admin)).status,200);
    assert(!(await api("banners")).body.banners.some(row=>row.id===bannerId));
  });
  await test("product questions accept owner answers and reject unrelated sellers",async()=>{
    assert.equal((await api("questions","POST",{productId,question:"Is this isolated fixture available in amber?"})).status,200);
    const [question]=await q("SELECT id FROM product_qa WHERE product_id=$1 AND user_id=$2",[productId,customerId]);
    await q("UPDATE users SET role='seller' WHERE id=$1",[otherCustomerId]);
    await q("INSERT INTO sellers(id,user_id,shop_name,status) VALUES($1,$2,'Unrelated management QA shop','approved')",[unrelatedSellerId,otherCustomerId]);
    assert.equal((await api("questions","POST",{id:question.id,answer:"Unrelated seller cannot answer"},other)).status,403);
    await q("DELETE FROM sellers WHERE id=$1",[unrelatedSellerId]);await q("UPDATE users SET role='customer' WHERE id=$1",[otherCustomerId]);
    assert.equal((await api("questions","POST",{id:question.id,answer:"Yes, the owned fixture is amber."},seller)).status,200);
    assert.equal((await api("questions","POST",{id:question.id,answer:"Administrator verified the answer."},admin)).status,200);
    assert.equal((await api("products/"+productId)).body.qas[0].answer,"Administrator verified the answer.");
  });
  await test("review votes, reports and moderation persist without duplicate votes",async()=>{
    const orderId=randomUUID();
    await q("INSERT INTO orders(id,user_id,address_snapshot,status,total_paise,subtotal_paise,payment_method,idempotency_key) VALUES($1,$2,'{}'::jsonb,'delivered',8000,8000,'demo',$3)",[orderId,customerId,randomUUID()]);
    await q("INSERT INTO order_items(order_id,variant_id,variant_snapshot,quantity,seller_id,unit_price_paise,status,delivered_at) VALUES($1,$2,$3::jsonb,1,$4,8000,'delivered',NOW()-INTERVAL '1 minute')",[orderId,variantId,JSON.stringify({title:prefix}),sellerId]);
    const review={productId,rating:5,text:"This is a shit fixture that should enter moderation."};
    assert.equal((await api("reviews","POST",review)).body.status,"moderated");
    assert.equal((await api("reviews","POST",{...review,rating:6})).status,400);
    assert.equal((await api("reviews","POST",review,other)).status,403);
    const [row]=await q("SELECT id FROM reviews WHERE product_id=$1 AND user_id=$2",[productId,customerId]);
    assert(!(await api("products/"+productId)).body.reviews.some(review=>review.id===row.id));
    assert.equal((await api("admin/moderation","POST",{id:row.id,type:"review",status:"approved"},admin)).status,200);
    for(let index=0;index<2;index++){
      assert.equal((await api("reviews","POST",{productId,reviewId:row.id,action:"helpful"},other)).status,200);
      assert.equal((await api("reviews","POST",{productId,reviewId:row.id,action:"report",reason:"Disposable report fixture"},other)).status,200);
    }
    assert.equal((await q("SELECT COUNT(*)::int n FROM review_votes WHERE review_id=$1",[row.id]))[0].n,1);
    assert.equal((await q("SELECT COUNT(*)::int n FROM review_reports WHERE review_id=$1",[row.id]))[0].n,1);
    assert.equal((await api("products/"+productId)).body.reviews[0].helpful,1);
    assert.equal((await api("admin/moderation","POST",{id:row.id,type:"review",status:"rejected"},admin)).status,200);
    assert(!(await api("products/"+productId)).body.reviews.some(review=>review.id===row.id));
  });
  await test("notification reads are scoped and product removal preserves order history",async()=>{
    const [notification]=await q("INSERT INTO notifications(user_id,type,title,body) VALUES($1,'orders','QA notice','Disposable fixture') RETURNING id",[customerId]);
    assert.equal((await api("notifications","POST",{id:notification.id},other)).status,200);
    assert.equal((await q("SELECT is_read FROM notifications WHERE id=$1",[notification.id]))[0].is_read,false);
    assert.equal((await api("notifications","POST",{id:notification.id})).status,200);
    assert.equal((await q("SELECT is_read FROM notifications WHERE id=$1",[notification.id]))[0].is_read,true);
    assert.equal((await api("seller/products?id="+productId,"DELETE",undefined,seller)).status,200);
    assert.equal((await api("products/"+productId)).status,404);
    assert.equal((await q("SELECT COUNT(*)::int n FROM variants WHERE product_id=$1",[productId]))[0].n,1);
    assert.equal((await q("SELECT COUNT(*)::int n FROM order_items WHERE variant_id=$1",[variantId]))[0].n,1);
  });
  await fs.writeFile(".qa/management-integration-results.json",JSON.stringify({base,at:new Date().toISOString(),checks},null,2));
  console.log(JSON.stringify({passed:checks.length,checks},null,2));
}catch(error){await fs.writeFile(".qa/management-integration-failure.json",JSON.stringify({base,at:new Date().toISOString(),passed:checks,failedCheck:currentTest,error:error.message},null,2));throw error;}
finally{
  await q("DELETE FROM coupon_redemptions WHERE user_id=ANY($1::uuid[])",[userIds]);
  await q("DELETE FROM orders WHERE user_id=ANY($1::uuid[])",[userIds]);
  await q("DELETE FROM products WHERE seller_id=ANY($1::uuid[])",[[sellerId,unrelatedSellerId]]);
  await q("DELETE FROM coupons WHERE id=$1",[couponId]);await q("DELETE FROM banners WHERE id=$1",[bannerId]);
  await q("DELETE FROM categories WHERE id=ANY($1::uuid[])",[categoryIds]);
  await q("DELETE FROM uploads WHERE user_id=ANY($1::uuid[])",[userIds]);
  const actors=await q("SELECT DISTINCT actor_id id FROM audit_logs WHERE actor_id=ANY($1::uuid[])",[userIds]),retainedIds=actors.map(row=>row.id);
  await q("UPDATE users SET deleted_at=NOW(),session_version=session_version+1 WHERE id=ANY($1::uuid[])",[retainedIds]);
  await q("UPDATE sellers SET status='suspended' WHERE user_id=ANY($1::uuid[])",[retainedIds]);
  await q("DELETE FROM users WHERE id=ANY($1::uuid[]) AND NOT(id=ANY($2::uuid[]))",[userIds,retainedIds]);
  await fs.writeFile(".qa/management-cleanup.json",JSON.stringify({at:new Date().toISOString(),removedUsers:userIds.length-retainedIds.length,disabledAuditActors:retainedIds.length,retainedIds,fixturesRemoved:true},null,2));
  console.log(`Management cleanup: ${userIds.length-retainedIds.length} users removed; ${retainedIds.length} audit actors disabled.`);
}
