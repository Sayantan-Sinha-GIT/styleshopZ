import fs from "node:fs/promises";
import { randomUUID, createHmac } from "node:crypto";
import assert from "node:assert/strict";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
for (const line of (await fs.readFile(".env.local", "utf8")).split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]])
    process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}
const base = process.env.TEST_BASE_URL || "http://localhost:3000",
  q = neon(process.env.DATABASE_URL).query,
  prefix = "qa-" + randomUUID().slice(0, 8),
  userIds = [],
  productId = randomUUID(),
  variantId = randomUUID(),
  couponId = randomUUID();
const address = {
    name: "QA Customer",
    phone: "9876543210",
    line1: "10 Test Road",
    city: "Kolkata",
    state: "West Bengal",
    pincode: "700001",
  },
  secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
function session(id, version = 0) {
  const h = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    b = Buffer.from(
      JSON.stringify({
        sub: id,
        version,
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
async function test(name, run) {
  await run();
  tests.push(name);
  console.log("PASS " + name);
}
try {
  const [seller] = await q(
      "SELECT s.id,s.user_id,u.session_version FROM sellers s JOIN users u ON u.id=s.user_id WHERE s.status='approved' LIMIT 1",
    ),
    [admin] = await q(
      "SELECT id,session_version FROM users WHERE role='admin' AND deleted_at IS NULL LIMIT 1",
    ),
    [cat] = await q("SELECT id FROM categories WHERE level=3 LIMIT 1");
  assert(seller && admin && cat, "Seeded seller, admin and category required");
  const hash = await bcrypt.hash(randomUUID(), 10);
  for (let i = 0; i < 50; i++) userIds.push(randomUUID());
  await q(
    `INSERT INTO users(id,email,password_hash,name) SELECT id,id::text||'@qa.invalid',$2,'QA fixture' FROM unnest($1::uuid[]) id`,
    [userIds, hash],
  );
  await q(
    "INSERT INTO products(id,seller_id,category_id,title,brand,description,status) VALUES($1,$2,$3,$4,'QA','Isolated integration fixture','live')",
    [productId, seller.id, cat.id, prefix],
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
    adm = session(admin.id, admin.session_version),
    sel = session(seller.user_id, seller.session_version),
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
    assert(r.cookie.includes("HttpOnly"));
  });
  await test("catalogue detail exposes structured options and correct pagination", async () => {
    const r = await api("products/" + productId);
    assert.equal(r.status, 200);
    assert.equal(typeof r.body.variants[0].options, "object");
    const list = await api("products?q=" + prefix + "&limit=1");
    assert.equal(list.body.count, 1);
    assert.equal(list.body.products[0].id, productId);
  });
  await test("unauthenticated and customer admin access denied", async () => {
    assert.equal((await api("orders")).status, 401);
    assert.equal(
      (await api("admin/overview", "GET", undefined, a)).status,
      403,
    );
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
  });
  await test("orders and support resist cross-account reads", async () => {
    assert.equal(
      (await api("orders/" + orderId, "GET", undefined, b)).status,
      404,
    );
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
} finally {
  await q("DELETE FROM support_tickets WHERE user_id=ANY($1::uuid[])", [
    userIds,
  ]);
  await q("DELETE FROM coupon_redemptions WHERE user_id=ANY($1::uuid[])", [
    userIds,
  ]);
  await q("DELETE FROM orders WHERE user_id=ANY($1::uuid[])", [userIds]);
  await q("DELETE FROM products WHERE id=$1", [productId]);
  await q("DELETE FROM coupons WHERE id=$1", [couponId]);
  await q("DELETE FROM uploads WHERE user_id=ANY($1::uuid[])", [userIds]);
  await q("DELETE FROM users WHERE id=ANY($1::uuid[])", [userIds]);
}
