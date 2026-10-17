import fs from "node:fs/promises";
import { randomUUID, createHmac, createHash } from "node:crypto";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
process.loadEnvFile(".env.local");
const base = process.env.TEST_BASE_URL || "http://localhost:3000",
  q = neon(process.env.DATABASE_URL).query,
  prefix = "qa-" + randomUUID().slice(0, 8),
  userIds = [],
  actionKeys = [],
  productId = randomUUID(),
  variantId = randomUUID(),
  couponId = randomUUID(),
  roundingCouponId = randomUUID(),
  adminId = randomUUID(),
  sellerUserId = randomUUID(),
  sellerId = randomUUID();
const address = {
    name: "QA Customer",
    phone: "9876543210",
    line1: "10 Test Road",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700001",
  },
  secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
function session(id, version = 0, extra = {}) {
  const h = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    b = Buffer.from(
      JSON.stringify({
        sub: id,
        version,
        ...extra,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString("base64url");
  return (
    "styleshopz_session=" +
    h +
    "." +
    b +
    "." +
    createHmac("sha256", secret)
      .update(h + "." + b)
      .digest("base64url")
  );
}
async function api(path, method = "GET", body, cookie = "") {
  const res = await fetch(base + "/api/" + path, {
    method,
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: res.status,
    body: await res.json(),
    cookie: res.headers.get("set-cookie"),
  };
}
const tests = [];
let currentTest;
async function test(name, run) {
  currentTest = name;
  await run();
  tests.push(name);
  console.log("PASS " + name);
}
try {
  const [cat] = await q("SELECT id FROM categories WHERE level=3 LIMIT 1");
  assert(cat, "Seeded category required");
  const fixturePassword=randomUUID();
  const hash = await bcrypt.hash(fixturePassword, 10);
  for (let i = 0; i < 50; i++) userIds.push(randomUUID());
  await q(
    `INSERT INTO users(id,email,password_hash,name,email_verified_at) SELECT id,id::text||'@qa.invalid',$2,'QA fixture',NOW() FROM unnest($1::uuid[]) id`,
    [userIds, hash],
  );
  userIds.push(adminId, sellerUserId);
  await fs.mkdir(".qa",{recursive:true});
  await fs.writeFile(".qa/integration-fixtures.json",JSON.stringify({base,at:new Date().toISOString(),userIds,productId,variantId,couponIds:[couponId,roundingCouponId],sellerId},null,2));
  await q("INSERT INTO users(id,email,password_hash,name,role,email_verified_at) VALUES($1::uuid,$1::uuid::text||'@qa.invalid',$3,'QA admin fixture','admin',NOW()),($2::uuid,$2::uuid::text||'@qa.invalid',$3,'QA seller fixture','seller',NOW())", [adminId,sellerUserId,hash]);
  await q("INSERT INTO sellers(id,user_id,shop_name,status) VALUES($1,$2,$3,'approved')", [sellerId,sellerUserId,prefix]);
  await q(
    "INSERT INTO products(id,seller_id,category_id,title,brand,description,status) VALUES($1,$2,$3,$4,'QA','Isolated integration fixture','live')",
    [productId, sellerId, cat.id, prefix],
  );
  await q(
    "INSERT INTO variants(id,product_id,sku,price_paise,mrp_paise,stock) VALUES($1,$2,$3,100000,120000,10)",
    [variantId, productId, prefix],
  );
  await q(
    "INSERT INTO coupons(id,code,discount_type,discount_value,min_cart_paise,usage_limit,per_user_limit,expires_at) VALUES($1,$2,'percent',10,50000,1,1,NOW()+INTERVAL '1 hour')",
    [couponId, prefix.toUpperCase()],
  );
  const a = session(userIds[0]),
    b = session(userIds[1]),
    adm = session(adminId),
    sel = session(sellerUserId),
    items = [{ variantId, quantity: 1 }];
  await test("registration persists and prevents admin escalation", async () => {
    const r = await api("auth/register", "POST", {
      name: "QA Signup",
      email: prefix + "@example.test",
      password: randomUUID(),
      role: "admin",
    });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.role, "customer");
    userIds.push(r.body.user.id);
    await fs.writeFile(".qa/integration-fixtures.json",JSON.stringify({base,at:new Date().toISOString(),userIds,productId,variantId,couponIds:[couponId,roundingCouponId],sellerId},null,2));
    assert(r.cookie.includes("HttpOnly"));
  });
  await test("catalogue detail exposes structured options and correct pagination", async () => {
    const r = await api("products/" + productId);
    assert.equal(r.status, 200);
    assert.equal(typeof r.body.variants[0].options, "object");
    const list = await api("products?q=" + prefix + "&limit=1");
    assert.equal(list.body.count, 1);
    assert.equal(list.body.products[0].id, productId);
    for(const filter of ["limit=0","limit=61","offset=-1","min_price=-1","rating=6","discount=100"]){assert.equal((await api("products?"+filter)).status,400,filter);}
    const hostile=await api("products?q="+encodeURIComponent("' OR 1=1 --")+"&category=missing-category");
    assert.equal(hostile.status,200);assert.equal(hostile.body.count,0);
  });
  await test("unauthenticated and customer admin access denied", async () => {
    assert.equal((await api("orders")).status, 401);
    assert.equal(
      (await api("admin/overview", "GET", undefined, a)).status,
      403,
    );
  });
  await test("email login, logout, duplicate signup and invalid sessions behave correctly",async()=>{
    const body={email:userIds[0]+"@qa.invalid",password:fixturePassword};
    assert.equal((await api("auth/login","POST",{...body,password:"Wrong!"+randomUUID()})).status,401);
    const login=await api("auth/login","POST",body);
    assert.equal(login.status,200);assert.equal(login.body.user.id,userIds[0]);assert(login.cookie.includes("HttpOnly"));
    assert.equal((await api("auth/register","POST",{...body,name:"Duplicate QA fixture"})).status,409);
    const logout=await api("auth/logout","POST",{},login.cookie.split(";")[0]);assert.equal(logout.status,200);assert(logout.cookie.includes("Max-Age=0"));
    assert.equal((await api("orders","GET",undefined,a.slice(0,-3)+"xxx")).status,401);
    assert.equal((await api("auth/register","POST",{email:prefix+"-unicode@qa.invalid",name:"Invalid Unicode password",password:"é".repeat(37)})).status,400);
  });
  await test("malformed bodies and unsafe quantities return validation errors", async () => {
    for (const body of [null, [], true, 2, "text"]) {
      const res=await fetch(base+"/api/checkout/hold",{method:"POST",headers:{Cookie:a,"Content-Type":"application/json"},body:JSON.stringify(body)});
      assert.equal(res.status,400,`Body ${JSON.stringify(body)}`);
    }
    for (const invalidItems of [[null],[true],[[]],[{variantId,quantity:true}],[{variantId,quantity:1.5}],[{variantId,quantity:-1}],[{variantId,quantity:11}]]) {
      const r=await api("checkout/hold","POST",{items:invalidItems},a);
      assert.equal(r.status,400,JSON.stringify(r.body));
    }
    const malformed=await fetch(base+"/api/cart/preview",{method:"POST",headers:{"Content-Type":"application/json"},body:"{oops"});
    assert.equal(malformed.status,400);
    const crossOrigin=await fetch(base+"/api/checkout/hold",{method:"POST",headers:{Cookie:a,"Content-Type":"application/json",Origin:"https://unrelated.invalid"},body:JSON.stringify({items})});
    assert.equal(crossOrigin.status,403);
  });
  await test("cart, saved items and wishlists persist", async () => {
    assert.equal(
      (await api("cart", "POST", { variantId, quantity: 2 }, a)).status,
      200,
    );
    assert.equal(
      (
        await api(
          "cart",
          "PATCH",
          { variantId, quantity: 1, savedForLater: true },
          a,
        )
      ).body.items[0].saved_for_later,
      true,
    );
    assert.equal(
      (await api("wishlists", "POST", { variantId }, a)).status,
      200,
    );
    assert.equal(
      (await api("wishlists", "GET", undefined, a)).body.items.length,
      1,
    );
    const list=(await api("wishlists","GET",undefined,a)).body.lists[0];
    assert.equal((await api("wishlists","POST",{listId:list.id,variantId},b)).status,404);
    const cartLine=(await api("cart","GET",undefined,a)).body.items[0];
    assert.equal((await api("cart?id="+cartLine.cart_item_id,"DELETE",undefined,b)).status,200);
    assert.equal((await api("cart","GET",undefined,a)).body.items.length,1);
  });
  await test("suspended and deleted listings are unavailable in cart, wishlists and guest previews",async()=>{
    try{
      await q("UPDATE sellers SET status='suspended' WHERE id=$1",[sellerId]);
      assert.equal((await api("cart","GET",undefined,a)).body.items[0].in_stock,false);
      assert.equal((await api("wishlists","GET",undefined,a)).body.items[0].in_stock,false);
      assert.equal((await api("cart","POST",{variantId,quantity:1},b)).status,409);
      assert.equal((await api("cart/preview","POST",{items})).body.items.length,0);
      assert.equal((await api("products/"+productId)).status,404);
      assert.equal((await api("checkout/hold","POST",{items},a)).status,409);
      await q("UPDATE sellers SET status='approved' WHERE id=$1",[sellerId]);
      await q("UPDATE products SET deleted_at=NOW() WHERE id=$1",[productId]);
      assert.equal((await api("cart","GET",undefined,a)).body.items[0].in_stock,false);
      assert.equal((await api("wishlists","GET",undefined,a)).body.items[0].in_stock,false);
    }finally{
      await q("UPDATE sellers SET status='approved' WHERE id=$1",[sellerId]);
      await q("UPDATE products SET deleted_at=NULL WHERE id=$1",[productId]);
    }
  });
  await test("assistant confirmations cannot be replayed or used by another customer",async()=>{
    const confirmation=session(userIds[0],0,{kind:"action",action:"cart",id:variantId,nonce:randomUUID()}).split("=")[1];
    actionKeys.push("assistant-action:"+createHash("sha256").update(confirmation).digest("hex"));
    assert.equal((await api("assistant/chat","POST",{confirmation},b)).status,400);
    const results=await Promise.all([api("assistant/chat","POST",{confirmation},a),api("assistant/chat","POST",{confirmation},a)]);
    assert.deepEqual(results.map(result=>result.status).sort(),[200,409]);
    assert.equal((await api("assistant/chat","POST",{confirmation},a)).status,409);
    assert.equal((await api("cart","GET",undefined,a)).body.items[0].quantity,2);
  });
  let orderId, itemId;
  await test("checkout ignores forged prices, applies coupon and retries once", async () => {
    const hold = await api("checkout/hold", "POST", { items }, a);
    assert.equal(hold.status, 200);
    const body = {
      items,
      batchId: hold.body.batchId,
      address,
      paymentMethod: "demo",
      idempotencyKey: randomUUID(),
      couponCode: prefix.toUpperCase(),
      totalPaise: 1,
    };
    const r = await api("checkout/create-order", "POST", body, a);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    orderId = r.body.orderId;
    assert.equal(r.body.totalPaise, 90000);
    assert.equal(
      (await api("checkout/create-order", "POST", body, a)).body.orderId,
      orderId,
    );
    assert.equal(
      (await q("SELECT stock FROM variants WHERE id=$1", [variantId]))[0].stock,
      9,
    );
    assert.equal((await api("checkout/create-order","POST",body,b)).status,409);
  });
  await test("orders and support resist cross-account reads", async () => {
    assert.equal(
      (await api("orders/" + orderId, "GET", undefined, b)).status,
      404,
    );
    assert.equal((await api("orders/"+orderId+"/cancel","POST",{reason:"Unauthorized cancellation"},b)).status,404);
    const invoice=await fetch(base+"/api/orders/"+orderId+"/invoice",{headers:{Cookie:a}});
    assert.equal(invoice.status,200);
    assert.equal(invoice.headers.get("content-type"),"application/pdf");
    assert.equal(Buffer.from(await invoice.arrayBuffer()).subarray(0,4).toString(),"%PDF");
    assert.equal((await api("orders/"+orderId+"/invoice","GET",undefined,b)).status,404);
    const t = await api(
      "support",
      "POST",
      {
        subject: "QA integration",
        message: "Test ownership and persisted messages",
      },
      a,
    );
    assert.equal(t.status, 200, JSON.stringify(t.body));
    assert.equal(
      (await api("support?id=" + t.body.ticketId, "GET", undefined, b)).status,
      404,
    );
    assert.equal((await api("support","POST",{ticketId:t.body.ticketId,message:"Cross-account write attempt"},b)).status,404);
    assert.equal(
      (
        await api(
          "support",
          "POST",
          { ticketId: t.body.ticketId, message: "Owner support reply" },
          adm,
        )
      ).status,
      200,
    );
    assert.equal(
      (await api("support?id=" + t.body.ticketId, "GET", undefined, a)).body
        .messages.length,
      2,
    );
  });
  await test("delivery rejects skipped states and enables verified reviews", async () => {
    const order = await api("orders/" + orderId, "GET", undefined, a);
    itemId = order.body.items[0].id;
    assert.equal((await api("returns","POST",{orderItemId:itemId,reason:"Cannot return before delivery"},a)).status,409);
    assert.equal((await api("admin/orders","POST",{orderItemId:itemId,newStatus:"packed"},a)).status,403);
    const unrelatedSeller=randomUUID();
    try{
      await q("UPDATE users SET role='seller' WHERE id=$1",[userIds[8]]);
      await q("INSERT INTO sellers(id,user_id,shop_name,status) VALUES($1,$2,'Unrelated QA fixture shop','approved')",[unrelatedSeller,userIds[8]]);
      assert.equal((await api("seller/orders","POST",{orderItemId:itemId,newStatus:"packed"},session(userIds[8]))).status,404);
      assert.equal((await api("seller/products","PATCH",{id:productId},session(userIds[8]))).status,404);
    }finally{
      await q("DELETE FROM sellers WHERE id=$1",[unrelatedSeller]);
      await q("UPDATE users SET role='customer' WHERE id=$1",[userIds[8]]);
    }
    assert.equal(
      (
        await api(
          "reviews",
          "POST",
          { productId, rating: 5, text: "A useful integration test review." },
          a,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await api(
          "seller/orders",
          "POST",
          { orderItemId: itemId, newStatus: "delivered" },
          sel,
        )
      ).status,
      409,
    );
    for (const newStatus of [
      "packed",
      "shipped",
      "out_for_delivery",
      "delivered",
    ]) {
      const r = await api(
        "seller/orders",
        "POST",
        { orderItemId: itemId, newStatus, trackingId: "QA-TRACK" },
        sel,
      );
      assert.equal(r.status, 200, JSON.stringify(r.body));
    }
    assert.equal(
      (
        await api(
          "reviews",
          "POST",
          { productId, rating: 5, text: "A useful integration test review." },
          a,
        )
      ).status,
      200,
    );
  });
  await test("return refund restores stock exactly once", async () => {
    const ret = await api(
      "returns",
      "POST",
      { orderItemId: itemId, reason: "QA item return request" },
      a,
    );
    assert.equal(ret.status, 200, JSON.stringify(ret.body));
    assert.equal((await api("returns","POST",{orderItemId:itemId,reason:"Duplicate return request"},a)).body.returnId,ret.body.returnId);
    assert.equal((await api("returns","POST",{orderItemId:itemId,reason:"Cross-account return request"},b)).status,404);
    for (let i = 0; i < 2; i++)
      assert.equal(
        (
          await api(
            "admin/orders",
            "POST",
            { returnId: ret.body.returnId, action: "approve" },
            adm,
          )
        ).status,
        200,
      );
    assert.equal(
      (await q("SELECT stock FROM variants WHERE id=$1", [variantId]))[0].stock,
      10,
    );
    assert.equal(Number((await q("SELECT amount_paise FROM returns WHERE id=$1",[ret.body.returnId]))[0].amount_paise),90000);
    assert.equal((await q("SELECT status FROM payments WHERE order_id=$1",[orderId]))[0].status,"refunded");
    const ledger=await api("seller","GET",undefined,sel);
    assert.equal(ledger.status,200,JSON.stringify(ledger.body));
    assert.equal(Number(ledger.body.stats.delivered_paise),90000);
  });
  await test("invalid webhook and unpurchased reviews rejected", async () => {
    assert.equal(
      (await api("payments/webhook", "POST", { event: "payment.captured" }))
        .status,
      401,
    );
    assert.equal(
      (
        await api(
          "reviews",
          "POST",
          { productId, rating: 5, text: "Not a real verified purchase" },
          b,
        )
      ).status,
      403,
    );
  });
  await test("signed payment events reject malformed input and capture stock exactly once", async () => {
    assert(process.env.RAZORPAY_WEBHOOK_SECRET,"Set a test webhook secret before running payment integration checks");
    const pendingId=randomUUID(),providerOrder="order_qa_"+randomUUID(),paymentId="pay_qa_"+randomUUID();
    await q("INSERT INTO orders(id,user_id,address_snapshot,status,total_paise,subtotal_paise,payment_method,idempotency_key,razorpay_order_id,payment_expires_at) VALUES($1,$2,$3::jsonb,'awaiting_payment',200000,200000,'razorpay',$4,$5,NOW()+INTERVAL '10 minutes')",[pendingId,userIds[2],JSON.stringify(address),randomUUID(),providerOrder]);
    await q("INSERT INTO order_items(order_id,variant_id,variant_snapshot,quantity,seller_id,unit_price_paise) VALUES($1,$2,$3::jsonb,2,$4,100000)",[pendingId,variantId,JSON.stringify({title:prefix,product_id:productId}),sellerId]);
    await q("INSERT INTO payments(order_id,provider,status,amount_paise) VALUES($1,'razorpay','pending',200000)",[pendingId]);
    await q("INSERT INTO stock_holds(variant_id,user_id,quantity,expires_at,order_id,batch_id) VALUES($1,$2,2,NOW()+INTERVAL '10 minutes',$3,$4)",[variantId,userIds[2],pendingId,randomUUID()]);
    const event={event:"payment.captured",payload:{payment:{entity:{id:paymentId,order_id:providerOrder,amount:200000,currency:"INR",status:"captured"}}}};
    async function signed(raw){const res=await fetch(base+"/api/payments/webhook",{method:"POST",headers:{"Content-Type":"application/json","x-razorpay-signature":createHmac("sha256",process.env.RAZORPAY_WEBHOOK_SECRET).update(raw).digest("hex")},body:raw});return {status:res.status,body:await res.json()};}
    for(const raw of ["{broken","null","[]",JSON.stringify({...event,payload:{payment:{entity:{...event.payload.payment.entity,currency:"USD"}}}}),JSON.stringify({...event,payload:{payment:{entity:{...event.payload.payment.entity,amount:1}}}})]){
      const r=await signed(raw);assert.equal(r.status,400,JSON.stringify(r.body));
    }
    const verification={orderId:pendingId,razorpayOrderId:providerOrder,razorpayPaymentId:paymentId,razorpaySignature:createHmac("sha256",process.env.RAZORPAY_KEY_SECRET).update(providerOrder+"|"+paymentId).digest("hex")};
    assert.equal((await api("checkout/verify","POST",verification,session(userIds[3]))).status,404);
    assert.equal((await api("checkout/verify","POST",{...verification,razorpaySignature:"0".repeat(64)},session(userIds[2]))).status,400);
    assert.equal((await api("checkout/verify","POST",verification,session(userIds[2]))).body.status,"awaiting_payment");
    for(const r of await Promise.all([signed(JSON.stringify(event)),signed(JSON.stringify(event)),signed(JSON.stringify(event))]))assert.equal(r.status,200,JSON.stringify(r.body));
    assert.equal((await q("SELECT stock FROM variants WHERE id=$1",[variantId]))[0].stock,8);
    assert.equal((await q("SELECT status FROM orders WHERE id=$1",[pendingId]))[0].status,"placed");
    assert.equal((await q("SELECT COUNT(*)::int n FROM stock_holds WHERE order_id=$1",[pendingId]))[0].n,0);
    await q("DELETE FROM orders WHERE id=$1",[pendingId]);
    await q("UPDATE variants SET stock=stock+2 WHERE id=$1",[variantId]);
    const expiredId=randomUUID(),expiredProvider="order_qa_expired_"+randomUUID();
    await q("INSERT INTO orders(id,user_id,address_snapshot,status,total_paise,subtotal_paise,payment_method,idempotency_key,razorpay_order_id,payment_expires_at) VALUES($1,$2,$3::jsonb,'awaiting_payment',100000,100000,'razorpay',$4,$5,NOW()-INTERVAL '1 minute')",[expiredId,userIds[3],JSON.stringify(address),randomUUID(),expiredProvider]);
    await q("INSERT INTO order_items(order_id,variant_id,variant_snapshot,quantity,seller_id,unit_price_paise) VALUES($1,$2,$3::jsonb,1,$4,100000)",[expiredId,variantId,JSON.stringify({title:prefix,product_id:productId}),sellerId]);
    await q("INSERT INTO payments(order_id,provider,status,amount_paise) VALUES($1,'razorpay','pending',100000)",[expiredId]);
    const delayed=JSON.stringify({event:"payment.captured",payload:{payment:{entity:{...event.payload.payment.entity,order_id:expiredProvider,amount:100000}}}});
    assert.equal((await signed(delayed)).status,409);
    assert.equal((await q("SELECT stock FROM variants WHERE id=$1",[variantId]))[0].stock,10);
    const renewed=await api("checkout/hold","POST",{items},session(userIds[3]));
    assert.equal(renewed.status,200,JSON.stringify(renewed.body));
    assert.equal((await q("SELECT status FROM orders WHERE id=$1",[expiredId]))[0].status,"cancelled");
    assert.equal((await q("SELECT status FROM payments WHERE order_id=$1",[expiredId]))[0].status,"failed");
    await q("DELETE FROM stock_holds WHERE user_id=$1 AND order_id IS NULL",[userIds[3]]);
  });
  await test("real Razorpay test order creation reserves stock and pending cancellation never deducts it",async()=>{
    const config=await api("config");assert.equal(config.body.razorpay,true,"Test Razorpay credentials must be configured");
    const owner=session(userIds[6]);
    const hold=await api("checkout/hold","POST",{items},owner);assert.equal(hold.status,200);
    const body={items,batchId:hold.body.batchId,address,paymentMethod:"razorpay",idempotencyKey:randomUUID()};
    const created=await api("checkout/create-order","POST",body,owner);assert.equal(created.status,200,JSON.stringify(created.body));
    assert.equal(created.body.status,"awaiting_payment");assert(created.body.razorpayOrderId.startsWith("order_"));
    const retried=await api("checkout/create-order","POST",body,owner);assert.equal(retried.status,200);assert.equal(retried.body.razorpayOrderId,created.body.razorpayOrderId);
    assert.equal((await q("SELECT stock FROM variants WHERE id=$1",[variantId]))[0].stock,10);
    assert.equal((await api("checkout/hold","POST",{items},owner)).status,409);
    assert.equal((await api("orders/"+created.body.orderId+"/cancel","POST",{reason:"Cancelled test-only pending payment"},owner)).status,200);
    assert.equal((await q("SELECT stock FROM variants WHERE id=$1",[variantId]))[0].stock,10);
    assert.equal((await q("SELECT status FROM payments WHERE order_id=$1",[created.body.orderId]))[0].status,"failed");
  });
  await test("assistant can return an individually delivered item before the whole order is delivered",async()=>{
    const mixedId=randomUUID(),deliveredItem=randomUUID(),otherVariant=randomUUID(),owner=session(userIds[7]);
    await q("INSERT INTO variants(id,product_id,sku,price_paise,mrp_paise,stock) VALUES($1::uuid,$2,$1::uuid::text,100000,100000,2)",[otherVariant,productId]);
    await q("INSERT INTO orders(id,user_id,address_snapshot,status,total_paise,subtotal_paise,payment_method,idempotency_key) VALUES($1,$2,$3::jsonb,'shipped',200000,200000,'demo',$4)",[mixedId,userIds[7],JSON.stringify(address),randomUUID()]);
    await q("INSERT INTO order_items(id,order_id,variant_id,variant_snapshot,quantity,seller_id,unit_price_paise,status,delivered_at) VALUES($1,$2,$3,$4::jsonb,1,$5,100000,'delivered',NOW())",[deliveredItem,mixedId,variantId,JSON.stringify({title:prefix,product_id:productId}),sellerId]);
    await q("INSERT INTO order_items(order_id,variant_id,variant_snapshot,quantity,seller_id,unit_price_paise,status) VALUES($1,$2,$3::jsonb,1,$4,100000,'shipped')",[mixedId,otherVariant,JSON.stringify({title:prefix,product_id:productId}),sellerId]);
    const reply=await api("assistant/chat","POST",{message:"Please return my delivered item"},owner);
    assert.equal(reply.status,200,JSON.stringify(reply.body));assert(reply.body.actionProposal?.confirmation);assert(["gemini","groq"].includes(reply.body.provider),"A configured AI provider should answer");
    const confirmation=reply.body.actionProposal.confirmation;
    actionKeys.push("assistant-action:"+createHash("sha256").update(confirmation).digest("hex"));
    const confirmed=await api("assistant/chat","POST",{confirmation},owner);assert.equal(confirmed.status,200,JSON.stringify(confirmed.body));
    assert.equal((await q("SELECT order_item_id FROM returns WHERE id=$1",[confirmed.body.result.returnId]))[0].order_item_id,deliveredItem);
    await q("DELETE FROM orders WHERE id=$1",[mixedId]);
  });
  await test("concurrent discounted returns preserve exact paise totals without duplicate restocking",async()=>{
    const secondVariant=randomUUID();
    await q("INSERT INTO variants(id,product_id,sku,price_paise,mrp_paise,stock) VALUES($1::uuid,$2,$1::uuid::text,101,101,2)",[secondVariant,productId]);
    await q("INSERT INTO coupons(id,code,discount_type,discount_value,expires_at) VALUES($1,$2,'flat',100100,NOW()+INTERVAL '1 hour')",[roundingCouponId,prefix.toUpperCase()+"-ROUND"]);
    const mixed=[{variantId,quantity:1},{variantId:secondVariant,quantity:1}],owner=session(userIds[4]);
    const hold=await api("checkout/hold","POST",{items:mixed},owner);
    const created=await api("checkout/create-order","POST",{items:mixed,batchId:hold.body.batchId,address,paymentMethod:"demo",idempotencyKey:randomUUID(),couponCode:prefix.toUpperCase()+"-ROUND"},owner);
    assert.equal(created.status,200,JSON.stringify(created.body));assert.equal(created.body.totalPaise,1);
    await q("UPDATE orders SET status='delivered' WHERE id=$1",[created.body.orderId]);
    await q("UPDATE order_items SET status='delivered',delivered_at=NOW() WHERE order_id=$1",[created.body.orderId]);
    const orderItems=await q("SELECT id FROM order_items WHERE order_id=$1",[created.body.orderId]);
    const returns=await Promise.all(orderItems.map(item=>api("returns","POST",{orderItemId:item.id,reason:"Exact paise refund fixture"},owner)));
    returns.forEach(ret=>assert.equal(ret.status,200,JSON.stringify(ret.body)));
    const approvals=await Promise.all(returns.flatMap(ret=>[api("admin/orders","POST",{returnId:ret.body.returnId,action:"approve"},adm),api("admin/orders","POST",{returnId:ret.body.returnId,action:"approve"},adm)]));
    approvals.forEach(result=>assert.equal(result.status,200,JSON.stringify(result.body)));
    assert.equal(Number((await q("SELECT SUM(r.amount_paise) amount FROM returns r JOIN order_items i ON i.id=r.order_item_id WHERE i.order_id=$1 AND r.status='refunded'",[created.body.orderId]))[0].amount),1);
    assert.equal((await q("SELECT status FROM payments WHERE order_id=$1",[created.body.orderId]))[0].status,"refunded");
    assert.equal((await q("SELECT stock FROM variants WHERE id=$1",[secondVariant]))[0].stock,2);
    assert.equal((await q("SELECT stock FROM variants WHERE id=$1",[variantId]))[0].stock,10);
    const ledger=await api("seller","GET",undefined,sel);
    assert.equal(ledger.status,200,JSON.stringify(ledger.body));
    assert.equal(Number(ledger.body.stats.delivered_paise),90001);
  });
  await test("coupons enforce minimum, global limit, expiry and ownership", async () => {
    const hold=await api("checkout/hold","POST",{items},b);
    assert.equal(hold.status,200);
    const body={items,batchId:hold.body.batchId,address,paymentMethod:"demo",idempotencyKey:randomUUID(),couponCode:prefix.toUpperCase()};
    assert.equal((await api("checkout/create-order","POST",body,b)).status,400);
    await q("UPDATE coupons SET used_count=0,min_cart_paise=200000 WHERE id=$1",[couponId]);
    assert.equal((await api("checkout/create-order","POST",body,b)).status,400);
    await q("UPDATE coupons SET min_cart_paise=0,expires_at=NOW()-INTERVAL '1 second' WHERE id=$1",[couponId]);
    assert.equal((await api("checkout/create-order","POST",body,b)).status,400);
    await q("DELETE FROM stock_holds WHERE user_id=$1 AND order_id IS NULL",[userIds[1]]);
  });
  await test("expired reservations cannot create orders", async () => {
    const hold = await api("checkout/hold", "POST", { items }, b);
    assert.equal(hold.status, 200);
    await q(
      "UPDATE stock_holds SET expires_at=NOW()-INTERVAL '1 second' WHERE batch_id=$1",
      [hold.body.batchId],
    );
    assert.equal(
      (
        await api(
          "checkout/create-order",
          "POST",
          {
            items,
            batchId: hold.body.batchId,
            address,
            paymentMethod: "demo",
            idempotencyKey: randomUUID(),
          },
          b,
        )
      ).status,
      409,
    );
  });
  await test("stock holds are owned, match exact quantities and reject unavailable stock",async()=>{
    const hold=await api("checkout/hold","POST",{items},a);
    assert.equal(hold.status,200);
    const body={items,batchId:hold.body.batchId,address,paymentMethod:"demo",idempotencyKey:randomUUID()};
    assert.equal((await api("checkout/create-order","POST",body,b)).status,409);
    assert.equal((await api("checkout/create-order","POST",{...body,items:[{variantId,quantity:2}]},a)).status,409);
    assert.equal((await api("checkout/create-order","POST",{...body,address:{...address,pincode:"000000"}},a)).status,400);
    await q("DELETE FROM stock_holds WHERE user_id=$1 AND order_id IS NULL",[userIds[0]]);
    await q("UPDATE variants SET stock=0 WHERE id=$1",[variantId]);
    assert.equal((await api("checkout/hold","POST",{items},a)).status,409);
    await q("UPDATE variants SET stock=10 WHERE id=$1",[variantId]);
  });
  let successes = [];
  await test("50 simultaneous buyers compete for 10 units without overselling", async () => {
    const results = await Promise.all(
      userIds.slice(0, 50).map(async (id) => {
        const cookie = session(id),
          hold = await api("checkout/hold", "POST", { items }, cookie);
        if (hold.status !== 200) {
          assert.equal(hold.status, 409, JSON.stringify(hold));
          return null;
        }
        const order = await api(
          "checkout/create-order",
          "POST",
          {
            items,
            batchId: hold.body.batchId,
            address,
            paymentMethod: "demo",
            idempotencyKey: randomUUID(),
          },
          cookie,
        );
        assert.equal(order.status, 200, JSON.stringify(order));
        return { id, orderId: order.body.orderId };
      }),
    );
    successes = results.filter(Boolean);
    assert.equal(successes.length, 10);
    assert.equal(
      (await q("SELECT stock FROM variants WHERE id=$1", [variantId]))[0].stock,
      0,
    );
  });
  await test("repeated cancellation restores each sale once", async () => {
    for (const sale of successes) {
      const results = await Promise.all(
        [1, 2].map(() =>
          api(
            "orders/" + sale.orderId + "/cancel",
            "POST",
            { reason: "QA cleanup cancellation" },
            session(sale.id),
          ),
        ),
      );
      for (const r of results)
        assert.equal(r.status, 200, JSON.stringify(r.body));
    }
    assert.equal(
      (await q("SELECT stock FROM variants WHERE id=$1", [variantId]))[0].stock,
      10,
    );
  });
  await test("uploads enforce size/type limits and private image ownership",async()=>{
    const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlS8AAAAASUVORK5CYII=","base64");
    async function upload(bytes,name,cookie){const form=new FormData();form.set("file",new File([bytes],name));const res=await fetch(base+"/api/uploads",{method:"POST",headers:cookie?{Cookie:cookie}:{},body:form});return {status:res.status,body:await res.json()};}
    assert.equal((await upload(png,"fixture.png",null)).status,401);
    assert.equal((await upload(Buffer.from("not an image"),"fake.png",a)).status,400);
    assert.equal((await upload(Buffer.alloc(0),"empty.png",a)).status,400);
    assert.equal((await upload(Buffer.alloc(5*1024*1024+1),"large.png",a)).status,400);
    const saved=await upload(png,"fixture.png",a);assert.equal(saved.status,200,JSON.stringify(saved.body));
    const uploadId=saved.body.url.split("/").pop();
    assert.equal((await fetch(base+saved.body.url)).status,200);
    await q("UPDATE uploads SET private=TRUE WHERE id=$1 AND user_id=$2",[uploadId,userIds[0]]);
    assert.equal((await fetch(base+saved.body.url)).status,404);
    assert.equal((await fetch(base+saved.body.url,{headers:{Cookie:b}})).status,404);
    assert.equal((await fetch(base+saved.body.url,{headers:{Cookie:a}})).status,200);
    assert.equal((await fetch(base+saved.body.url,{headers:{Cookie:adm}})).status,200);
  });
  await test("account export excludes credentials and account deletion revokes sessions and personal address data",async()=>{
    const deletionUser=userIds[49],owner=session(deletionUser);
    const saved=await api("addresses","POST",{...address,latitude:22.5448,longitude:88.3426},owner);assert.equal(saved.status,200);
    assert.equal((await api("cart","POST",{variantId,quantity:1},owner)).status,200);
    assert.equal((await api("wishlists","POST",{variantId},owner)).status,200);
    await q("INSERT INTO assistant_messages(user_id,role,content) VALUES($1,'user','Disposable deletion fixture')",[deletionUser]);
    const exported=await api("account/export","GET",undefined,owner);assert.equal(exported.status,200);assert.equal(exported.body.profile.id,deletionUser);assert.equal(exported.body.addresses.length,1);assert(!("password_hash" in exported.body.profile));
    const deleted=await api("profile","DELETE",undefined,owner);assert.equal(deleted.status,200);assert(deleted.cookie.includes("Max-Age=0"));
    assert.equal((await api("auth/me","GET",undefined,owner)).body.user,null);
    assert.equal((await api("orders","GET",undefined,owner)).status,401);
    const [record]=await q("SELECT name,email,phone,deleted_at,session_version FROM users WHERE id=$1",[deletionUser]);
    assert(record.deleted_at);assert.equal(record.name,"Deleted customer");assert.equal(record.phone,null);assert.equal(record.session_version,1);assert(record.email.startsWith("deleted-"));
    for(const table of ["addresses","carts","wishlists","assistant_messages"]){assert.equal((await q(`SELECT COUNT(*)::int n FROM ${table} WHERE user_id=$1`,[deletionUser]))[0].n,0,table);}
    const retained=await q("SELECT address_snapshot FROM orders WHERE user_id=$1",[deletionUser]);
    retained.forEach(order=>assert.deepEqual(order.address_snapshot,{name:"Deleted customer"}));
    assert.equal((await api("profile","DELETE",undefined,owner)).status,401);
  });
  const report = {
    base,
    at: new Date().toISOString(),
    checks: tests,
    simultaneousBuyers: 50,
    availableUnits: 10,
    successfulOrders: successes.length,
  };
  await fs.mkdir(".qa", { recursive: true });
  await fs.writeFile(
    ".qa/integration-results.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} catch(error) {
  await fs.mkdir(".qa", {recursive:true});
  await fs.writeFile(".qa/integration-failure.json",JSON.stringify({base,at:new Date().toISOString(),passed:tests,failedCheck:currentTest,error:error.message},null,2));
  throw error;
} finally {
  await q("DELETE FROM support_tickets WHERE user_id=ANY($1::uuid[])", [
    userIds,
  ]);
  await q("DELETE FROM coupon_redemptions WHERE user_id=ANY($1::uuid[])", [
    userIds,
  ]);
  await q("DELETE FROM orders WHERE user_id=ANY($1::uuid[])", [userIds]);
  await q("DELETE FROM products WHERE id=$1", [productId]);
  await q("DELETE FROM coupons WHERE id=ANY($1::uuid[])", [[couponId,roundingCouponId]]);
  await q("DELETE FROM uploads WHERE user_id=ANY($1::uuid[])", [userIds]);
  await q("DELETE FROM email_codes WHERE user_id=ANY($1::uuid[])",[userIds]);
  await q("DELETE FROM auth_identities WHERE user_id=ANY($1::uuid[])",[userIds]);
  await q("DELETE FROM password_resets WHERE user_id=ANY($1::uuid[])",[userIds]);
  await q("DELETE FROM rate_limits WHERE key=ANY($1::text[])",[actionKeys]);
  const audited=await q("SELECT DISTINCT actor_id id FROM audit_logs WHERE actor_id=ANY($1::uuid[])",[userIds]);
  const retainedIds=audited.map(row=>row.id);
  if(retainedIds.length){
    await q("UPDATE users SET deleted_at=NOW(),session_version=session_version+1 WHERE id=ANY($1::uuid[])",[retainedIds]);
    await q("UPDATE sellers SET status='suspended' WHERE user_id=ANY($1::uuid[])",[retainedIds]);
  }
  await q("DELETE FROM users WHERE id=ANY($1::uuid[]) AND NOT(id=ANY($2::uuid[]))", [userIds,retainedIds]);
  await fs.writeFile(".qa/integration-cleanup.json",JSON.stringify({at:new Date().toISOString(),removedUsers:userIds.length-retainedIds.length,disabledAuditActors:retainedIds.length,retainedIds,productRemoved:true,ordersRemoved:true},null,2));
  console.log(`QA cleanup: ${userIds.length-retainedIds.length} users removed; ${retainedIds.length} audit actors disabled and retained because audit history is append-only.`);
}
