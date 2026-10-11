import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { query, transaction, type Query, type Row } from "./db";
import {
  assert,
  address,
  lineItems,
  totals,
  discountFor,
  text,
  uuid,
  transitions,
  canReturn,
} from "./rules";
import { notify, audit } from "./catalog";

export const razorpayEnabled = () =>
  /^rzp_test_[A-Za-z0-9]{14}$/.test(process.env.RAZORPAY_KEY_ID || "") &&
  (process.env.RAZORPAY_KEY_SECRET || "").length >= 20 &&
  !!process.env.RAZORPAY_WEBHOOK_SECRET;
export const demoEnabled = () =>
  process.env.DEMO_MODE === "true" || process.env.NODE_ENV !== "production";
async function razorpay(path: string, body: any) {
  assert(
    razorpayEnabled(),
    "Razorpay test payments are not configured. Choose demo payment or COD.",
    503,
  );
  const r = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  assert(
    r.ok,
    "The payment provider could not process this request. Please retry.",
    502,
  );
  return r.json();
}
export function hmacValid(
  body: string,
  signature: string | null,
  secret: string | undefined,
) {
  if (!signature || !secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    createHmac("sha256", secret).update(body).digest(),
  );
}
async function lockUser(q: Query, userId: string) {
  await q("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
}
async function lockedVariants(
  q: Query,
  items: { variantId: string; quantity: number }[],
) {
  const rows = await q(
    `SELECT v.*,p.title,p.status,p.deleted_at,p.seller_id,c.name category_name,s.status seller_status FROM variants v JOIN products p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id JOIN sellers s ON s.id=p.seller_id WHERE v.id=ANY($1::uuid[]) ORDER BY v.id FOR UPDATE OF v`,
    [items.map((i) => i.variantId)],
  );
  assert(rows.length === items.length, "An item is no longer available.", 409);
  for (const v of rows)
    assert(
      v.status === "live" && !v.deleted_at && v.seller_status === "approved",
      `${v.title} is unavailable.`,
      409,
    );
  return rows;
}
async function available(q: Query, variant: Row, userId: string, qty: number) {
  const [held] = await q(
    "SELECT COALESCE(SUM(quantity),0)::int quantity FROM stock_holds WHERE variant_id=$1 AND expires_at>NOW() AND user_id<>$2",
    [variant.id, userId],
  );
  assert(
    Number(variant.stock) - held.quantity >= qty,
    `${variant.title} has insufficient stock. Reduce the quantity or remove it.`,
    409,
  );
}
export async function reserve(userId: string, payload: any) {
  const items = lineItems(payload.items);
  return transaction(async (q) => {
    await lockUser(q, userId);
    const expired = await q(
      `SELECT * FROM orders WHERE user_id=$1 AND status='awaiting_payment' AND payment_expires_at<=NOW() ORDER BY id FOR UPDATE`,
      [userId],
    );
    for (const o of expired) {
      await q(
        `UPDATE orders SET status='cancelled',updated_at=NOW() WHERE id=$1`,
        [o.id],
      );
      await q(`UPDATE order_items SET status='cancelled' WHERE order_id=$1`, [
        o.id,
      ]);
      await q(
        `UPDATE payments SET status='failed' WHERE order_id=$1 AND status='pending'`,
        [o.id],
      );
      if (o.coupon_id) {
        await q(
          "UPDATE coupons SET used_count=GREATEST(0,used_count-1) WHERE id=$1",
          [o.coupon_id],
        );
        await q("DELETE FROM coupon_redemptions WHERE order_id=$1", [o.id]);
      }
      await q("DELETE FROM stock_holds WHERE order_id=$1", [o.id]);
      await q(
        `INSERT INTO order_status_events(order_id,status,actor,note) VALUES($1,'cancelled','Shop','Unpaid reservation expired. No stock was deducted.')`,
        [o.id],
      );
    }
    const variants = await lockedVariants(q, items);
    for (const v of variants)
      await available(
        q,
        v,
        userId,
        items.find((i) => i.variantId === v.id)!.quantity,
      );
    const [pending] = await q(
      `SELECT id FROM orders WHERE user_id=$1 AND status='awaiting_payment' AND payment_expires_at>NOW() LIMIT 1`,
      [userId],
    );
    assert(
      !pending,
      "Finish or cancel your pending payment before starting another checkout.",
      409,
    );
    await q("DELETE FROM stock_holds WHERE user_id=$1 AND order_id IS NULL", [
      userId,
    ]);
    const batchId = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60000).toISOString();
    for (const i of items)
      await q(
        "INSERT INTO stock_holds(variant_id,user_id,quantity,expires_at,batch_id) VALUES($1,$2,$3,$4,$5)",
        [i.variantId, userId, i.quantity, expiresAt, batchId],
      );
    return { batchId, expiresAt };
  });
}
export async function checkCoupon(
  q: Query,
  code: string,
  userId: string,
  subtotal: number,
  lock = false,
): Promise<Row> {
  const [c] = await q(
    `SELECT * FROM coupons WHERE code=$1 ${lock ? "FOR UPDATE" : ""}`,
    [code.trim().toUpperCase()],
  );
  assert(
    c &&
      new Date(c.starts_at).getTime() <= Date.now() &&
      new Date(c.expires_at).getTime() > Date.now(),
    "This coupon is invalid or expired.",
  );
  assert(
    !c.usage_limit || c.used_count < c.usage_limit,
    "This coupon has reached its usage limit.",
  );
  const [usage] = await q(
    "SELECT COUNT(*)::int count FROM coupon_redemptions WHERE user_id=$1 AND coupon_id=$2",
    [userId, c.id],
  );
  assert(
    !c.per_user_limit || usage.count < c.per_user_limit,
    "You have already used this coupon.",
  );
  assert(
    subtotal >= Number(c.min_cart_paise),
    `This coupon needs a cart of at least ₹${Number(c.min_cart_paise) / 100}.`,
  );
  return { ...c, discountPaise: discountFor(c, subtotal) };
}
export async function createOrder(userId: string, payload: any) {
  const items = lineItems(payload.items),
    a = address(payload.address);
  const key = text(payload.idempotencyKey, "Checkout reference", 16, 100);
  const method = payload.paymentMethod;
  assert(
    ["demo", "cod", "razorpay"].includes(method),
    "Choose a payment method.",
  );
  assert(method !== "demo" || demoEnabled(), "Demo payments are disabled.");
  assert(
    method !== "razorpay" || razorpayEnabled(),
    "Razorpay test payments are not configured.",
    503,
  );
  const delivery = payload.delivery === "express" ? "express" : "standard";
  return transaction(async (q) => {
    await lockUser(q, userId);
    const [existing] = await q(
      "SELECT * FROM orders WHERE idempotency_key=$1",
      [key],
    );
    if (existing) {
      assert(existing.user_id === userId, "Invalid checkout reference.", 409);
      return orderResult(existing);
    }
    const variants = await lockedVariants(q, items);
    const holds = await q(
      "SELECT * FROM stock_holds WHERE user_id=$1 AND batch_id=$2 AND expires_at>NOW() AND order_id IS NULL",
      [userId, uuid(payload.batchId)],
    );
    assert(
      holds.length === items.length &&
        items.every((i) =>
          holds.some(
            (h) => h.variant_id === i.variantId && h.quantity === i.quantity,
          ),
        ),
      "Your stock reservation has expired or your cart changed. Refresh the reservation.",
      409,
    );
    let subtotal = 0;
    const lines: Row[] = [];
    for (const v of variants) {
      const quantity = items.find((i) => i.variantId === v.id)!.quantity;
      await available(q, v, userId, quantity);
      const [deal] = await q(
        "SELECT * FROM deals WHERE variant_id=$1 AND starts_at<=NOW() AND ends_at>NOW() AND sold_count+$2<=quantity_cap ORDER BY deal_price_paise LIMIT 1 FOR UPDATE",
        [v.id, quantity],
      );
      const price = Number(deal?.deal_price_paise ?? v.price_paise);
      subtotal += price * quantity;
      lines.push({ ...v, quantity, price, deal });
    }
    const coupon = payload.couponCode
      ? await checkCoupon(q, String(payload.couponCode), userId, subtotal, true)
      : null;
    const money = totals(subtotal, coupon?.discountPaise || 0, delivery);
    assert(
      method !== "cod" || money.totalPaise <= 5000000,
      "Cash on delivery is available for orders up to ₹50,000.",
    );
    const orderId = randomUUID();
    const provider =
      method === "razorpay"
        ? await razorpay("orders", {
            amount: money.totalPaise,
            currency: "INR",
            receipt: orderId,
          })
        : null;
    const status = method === "razorpay" ? "awaiting_payment" : "placed";
    const [order] = await q(
      `INSERT INTO orders(id,user_id,address_snapshot,status,total_paise,subtotal_paise,delivery_fee_paise,discount_paise,payment_method,idempotency_key,razorpay_order_id,coupon_id,payment_expires_at,delivery_method) VALUES($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW()+INTERVAL '15 minutes',$13) RETURNING *`,
      [
        orderId,
        userId,
        JSON.stringify(a),
        status,
        money.totalPaise,
        subtotal,
        money.deliveryFeePaise,
        money.discountPaise,
        method,
        key,
        provider?.id || null,
        coupon?.id || null,
        delivery,
      ],
    );
    for (const v of lines) {
      const snapshot = {
        title: v.title,
        sku: v.sku,
        product_id: v.product_id,
        category_name: v.category_name,
        options: v.options,
        price_paise: v.price,
        deal_id: v.deal?.id || null,
      };
      await q(
        `INSERT INTO order_items(order_id,variant_id,variant_snapshot,quantity,seller_id,unit_price_paise) VALUES($1,$2,$3::jsonb,$4,$5,$6)`,
        [
          orderId,
          v.id,
          JSON.stringify(snapshot),
          v.quantity,
          v.seller_id,
          v.price,
        ],
      );
      if (method !== "razorpay") {
        await q("UPDATE variants SET stock=stock-$2 WHERE id=$1", [
          v.id,
          v.quantity,
        ]);
        if (v.deal)
          await q("UPDATE deals SET sold_count=sold_count+$2 WHERE id=$1", [
            v.deal.id,
            v.quantity,
          ]);
      }
    }
    if (coupon) {
      await q("UPDATE coupons SET used_count=used_count+1 WHERE id=$1", [
        coupon.id,
      ]);
      await q(
        "INSERT INTO coupon_redemptions(coupon_id,user_id,order_id) VALUES($1,$2,$3)",
        [coupon.id, userId, orderId],
      );
    }
    await q(
      "INSERT INTO payments(order_id,provider,status,amount_paise,idempotency_key) VALUES($1,$2,$3,$4,$5)",
      [
        orderId,
        method,
        method === "razorpay" ? "pending" : "captured",
        money.totalPaise,
        key,
      ],
    );
    await q(
      "INSERT INTO order_status_events(order_id,status,actor,note) VALUES($1,$2,$3,$4)",
      [
        orderId,
        status,
        "Shop",
        method === "demo"
          ? "Demonstration payment completed. No money was charged."
          : method === "cod"
            ? "Pay on delivery. Shipping is simulated."
            : "Awaiting verified test payment and captured webhook.",
      ],
    );
    if (method === "razorpay")
      await q(
        "UPDATE stock_holds SET order_id=$2,expires_at=NOW()+INTERVAL '15 minutes' WHERE user_id=$1 AND batch_id=$3",
        [userId, orderId, payload.batchId],
      );
    else
      await q("DELETE FROM stock_holds WHERE user_id=$1 AND batch_id=$2", [
        userId,
        payload.batchId,
      ]);
    await q(
      "DELETE FROM cart_items WHERE cart_id IN(SELECT id FROM carts WHERE user_id=$1) AND variant_id=ANY($2::uuid[]) AND saved_for_later=FALSE",
      [userId, items.map((i) => i.variantId)],
    );
    await notify(
      q,
      userId,
      status === "placed" ? "Order placed" : "Payment pending",
      `Order ${orderId.slice(0, 8)} · ${method === "demo" ? "demo payment" : method === "cod" ? "pay on delivery" : "Razorpay test mode"}`,
    );
    return orderResult(order);
  });
}
function orderResult(o: Row) {
  return {
    orderId: o.id,
    status: o.status,
    totalPaise: Number(o.total_paise),
    paymentMethod: o.payment_method,
    razorpayOrderId: o.razorpay_order_id,
    keyId: razorpayEnabled() ? process.env.RAZORPAY_KEY_ID : null,
  };
}
export async function verifyPayment(userId: string, b: any) {
  const [o] = await query("SELECT * FROM orders WHERE id=$1 AND user_id=$2", [
    uuid(b.orderId),
    userId,
  ]);
  assert(o && o.payment_method === "razorpay", "Payment not found.", 404);
  assert(
    o.razorpay_order_id === b.razorpayOrderId &&
      hmacValid(
        `${o.razorpay_order_id}|${b.razorpayPaymentId}`,
        b.razorpaySignature,
        process.env.RAZORPAY_KEY_SECRET,
      ),
    "Payment verification failed. No order was confirmed.",
  );
  return {
    ok: true,
    status: o.status,
    message:
      o.status === "awaiting_payment"
        ? "Signature verified. Waiting for the captured payment webhook."
        : "Payment confirmed.",
  };
}
export async function paymentWebhook(req: Request) {
  const raw = await req.text();
  assert(
    hmacValid(
      raw,
      req.headers.get("x-razorpay-signature"),
      process.env.RAZORPAY_WEBHOOK_SECRET,
    ),
    "Invalid webhook signature.",
    401,
  );
  const event = JSON.parse(raw);
  if (event.event !== "payment.captured") return { ok: true };
  const p = event.payload?.payment?.entity;
  assert(
    p?.id && p?.order_id && p.currency === "INR" && p.status === "captured",
    "Invalid payment event.",
  );
  return transaction(async (q) => {
    const [lookup] = await q(
      "SELECT user_id FROM orders WHERE razorpay_order_id=$1",
      [p.order_id],
    );
    assert(lookup, "Unknown payment order.", 404);
    await lockUser(q, lookup.user_id);
    const [o] = await q(
      "SELECT * FROM orders WHERE razorpay_order_id=$1 FOR UPDATE",
      [p.order_id],
    );
    assert(Number(o.total_paise) === p.amount, "Payment amount mismatch.");
    if (o.status !== "awaiting_payment") return { ok: true };
    assert(
      new Date(o.payment_expires_at).getTime() > Date.now(),
      "Payment arrived after reservation expiry. Contact support.",
      409,
    );
    const items = await q(
      "SELECT * FROM order_items WHERE order_id=$1 ORDER BY variant_id",
      [o.id],
    );
    const variants = await lockedVariants(
      q,
      items.map((i) => ({ variantId: i.variant_id, quantity: i.quantity })),
    );
    for (const v of variants) {
      const item = items.find((i) => i.variant_id === v.id)!;
      await available(q, v, o.user_id, item.quantity);
      await q("UPDATE variants SET stock=stock-$2 WHERE id=$1", [
        v.id,
        item.quantity,
      ]);
      if (item.variant_snapshot.deal_id)
        await q("UPDATE deals SET sold_count=sold_count+$2 WHERE id=$1", [
          item.variant_snapshot.deal_id,
          item.quantity,
        ]);
    }
    await q(
      `UPDATE orders SET status='placed',razorpay_payment_id=$2,updated_at=NOW() WHERE id=$1`,
      [o.id, p.id],
    );
    await q(
      `UPDATE payments SET status='captured',provider_payment_id=$2 WHERE order_id=$1`,
      [o.id, p.id],
    );
    await q("DELETE FROM stock_holds WHERE order_id=$1", [o.id]);
    await q(
      `INSERT INTO order_status_events(order_id,status,actor,note) VALUES($1,'placed','Payment provider','Test payment captured and verified.')`,
      [o.id],
    );
    await notify(
      q,
      o.user_id,
      "Payment confirmed",
      `Order ${o.id.slice(0, 8)} is placed.`,
    );
    return { ok: true };
  });
}
export async function cancelOrder(userId: string, id: string, reason: string) {
  return transaction(async (q) => {
    await lockUser(q, userId);
    const [o] = await q(
      "SELECT * FROM orders WHERE id=$1 AND user_id=$2 FOR UPDATE",
      [uuid(id), userId],
    );
    assert(o, "Order not found.", 404);
    if (o.status === "cancelled") return { ok: true, status: "cancelled" };
    const items = await q(
      "SELECT * FROM order_items WHERE order_id=$1 ORDER BY variant_id FOR UPDATE",
      [id],
    );
    assert(
      ["awaiting_payment", "placed", "packed"].includes(o.status) &&
        items.every((i) =>
          ["placed", "packed", "cancelled"].includes(i.status),
        ),
      "This order has shipped and cannot be cancelled.",
      409,
    );
    // Real captured test payments require a provider refund before cancellation succeeds.
    if (o.payment_method === "razorpay" && o.razorpay_payment_id)
      await razorpay(`payments/${o.razorpay_payment_id}/refund`, {
        amount: Number(o.total_paise),
        notes: { reason: "Customer cancellation" },
      });
    for (const i of items)
      if (
        o.status !== "awaiting_payment" &&
        i.status !== "cancelled" &&
        i.variant_id
      ) {
        await q("SELECT id FROM variants WHERE id=$1 FOR UPDATE", [
          i.variant_id,
        ]);
        await q("UPDATE variants SET stock=stock+$2 WHERE id=$1", [
          i.variant_id,
          i.quantity,
        ]);
        if (i.variant_snapshot.deal_id)
          await q(
            "UPDATE deals SET sold_count=GREATEST(0,sold_count-$2) WHERE id=$1",
            [i.variant_snapshot.deal_id, i.quantity],
          );
      }
    await q(
      `UPDATE orders SET status='cancelled',updated_at=NOW() WHERE id=$1`,
      [id],
    );
    await q(`UPDATE order_items SET status='cancelled' WHERE order_id=$1`, [
      id,
    ]);
    await q(
      `UPDATE payments SET status=CASE WHEN status='pending' THEN 'failed' ELSE 'refunded' END WHERE order_id=$1`,
      [id],
    );
    if (o.coupon_id) {
      await q(
        "UPDATE coupons SET used_count=GREATEST(0,used_count-1) WHERE id=$1",
        [o.coupon_id],
      );
      await q("DELETE FROM coupon_redemptions WHERE order_id=$1", [id]);
    }
    await q("DELETE FROM stock_holds WHERE order_id=$1", [id]);
    await q(
      `INSERT INTO order_status_events(order_id,status,actor,note) VALUES($1,'cancelled','Customer',$2)`,
      [id, text(reason, "Reason", 3, 500)],
    );
    await notify(
      q,
      userId,
      "Order cancelled",
      `Order ${id.slice(0, 8)} was cancelled. ${o.payment_method === "demo" ? "Demo balance refunded; no real money was involved." : ""}`,
    );
    return { ok: true, status: "cancelled" };
  });
}
export async function fulfil(u: Row, b: any) {
  return transaction(async (q) => {
    const [lookup] = await q(
      "SELECT o.user_id FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.id=$1",
      [uuid(b.orderItemId)],
    );
    assert(lookup, "Order item not found.", 404);
    await lockUser(q, lookup.user_id);
    const [i] = await q(
      "SELECT i.*,o.status order_status FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.id=$1 FOR UPDATE OF i,o",
      [b.orderItemId],
    );
    assert(
      u.role === "admin" || i.seller_id === u.seller_id,
      "Order item not found.",
      404,
    );
    assert(
      !["awaiting_payment", "cancelled"].includes(i.order_status),
      "This order cannot be fulfilled.",
      409,
    );
    if (i.status === b.newStatus) return { ok: true };
    assert(
      transitions[i.status] === b.newStatus,
      "Advance one delivery step at a time.",
      409,
    );
    const tracking =
      b.newStatus === "shipped"
        ? text(b.trackingId, "Tracking ID", 4, 80)
        : i.tracking_id;
    await q("UPDATE order_items SET status=$2,tracking_id=$3,delivered_at=CASE WHEN $2='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END WHERE id=$1", [
      i.id,
      b.newStatus,
      tracking,
    ]);
    const all = await q("SELECT status FROM order_items WHERE order_id=$1", [
      i.order_id,
    ]);
    const steps = [
      "placed",
      "packed",
      "shipped",
      "out_for_delivery",
      "delivered",
    ];
    const status =
      steps[
        Math.min(
          ...all
            .filter((v) => v.status !== "cancelled" && v.status !== "returned")
            .map((v) => steps.indexOf(v.status)),
        )
      ];
    if (status && status !== i.order_status) {
      await q("UPDATE orders SET status=$2,updated_at=NOW() WHERE id=$1", [
        i.order_id,
        status,
      ]);
      await q(
        "INSERT INTO order_status_events(order_id,status,actor,note) VALUES($1,$2,$3,$4)",
        [
          i.order_id,
          status,
          u.name,
          `Simulated shipment${tracking ? " · " + tracking : ""}`,
        ],
      );
      await notify(
        q,
        lookup.user_id,
        "Order update",
        `Order ${i.order_id.slice(0, 8)}: ${status.replaceAll("_", " ")}`,
      );
    }
    await audit(q, u, "shipment_" + b.newStatus, "order_item", i.id);
    return { ok: true };
  });
}
export async function requestReturn(userId: string, b: any) {
  return transaction(async (q) => {
    await lockUser(q, userId);
    const [i] = await q(
      `SELECT i.*,o.status order_status,COALESCE(i.delivered_at,(SELECT MIN(created_at) FROM order_status_events WHERE order_id=o.id AND status='delivered')) delivered_at FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.id=$1 AND o.user_id=$2 FOR UPDATE OF i`,
      [uuid(b.orderItemId), userId],
    );
    assert(i, "Order item not found.", 404);
    assert(
      canReturn(i.status, i.delivered_at),
      "Returns are available within seven days of delivery.",
      409,
    );
    const [existing] = await q(
      `SELECT * FROM returns WHERE order_item_id=$1 AND status<>'rejected'`,
      [i.id],
    );
    if (existing)
      return { ok: true, returnId: existing.id, status: existing.status };
    const photos = Array.isArray(b.photoUrls) ? b.photoUrls : [];
    assert(photos.length <= 4, "Attach at most four photos.");
    for (const url of photos) {
      assert(
        typeof url === "string" && /^\/uploads\/[0-9a-f-]+$/.test(url),
        "Attach a photo uploaded through this shop.",
      );
      const [upload] = await q(
        "SELECT id FROM uploads WHERE id=$1 AND user_id=$2",
        [url.split("/").pop(), userId],
      );
      assert(upload, "Invalid return photo.");
    }
    const [r] = await q(
      `INSERT INTO returns(order_item_id,user_id,reason,photos,status,amount_paise,resolution) VALUES($1,$2,$3,$4::jsonb,'requested',$5,$6) RETURNING *`,
      [
        i.id,
        userId,
        text(b.reason, "Reason", 5, 500),
        JSON.stringify(photos),
        Number(i.unit_price_paise) * i.quantity,
        b.resolution === "replace" ? "replace" : "refund",
      ],
    );
    await notify(
      q,
      userId,
      "Return requested",
      `Your ${r.resolution} request is awaiting review.`,
    );
    return { ok: true, returnId: r.id, status: r.status };
  });
}
export async function processReturn(u: Row, b: any) {
  return transaction(async (q) => {
    const [r] = await q(
      `SELECT r.*,i.order_id,i.variant_id,i.quantity,o.payment_method,o.razorpay_payment_id,o.total_paise,o.subtotal_paise,o.discount_paise FROM returns r JOIN order_items i ON i.id=r.order_item_id JOIN orders o ON o.id=i.order_id WHERE r.id=$1 FOR UPDATE OF r`,
      [uuid(b.returnId)],
    );
    assert(r, "Return not found.", 404);
    assert(
      ["approve", "reject"].includes(b.action),
      "Choose approve or reject.",
    );
    if (!["requested", "pending"].includes(r.status))
      return { ok: true, status: r.status };
    let status = "rejected",
      refundId = null;
    if (b.action === "approve") {
      const amount = Math.min(
        Number(r.total_paise),
        Math.round(
          Number(r.amount_paise) *
            (1 -
              Number(r.discount_paise) / Math.max(1, Number(r.subtotal_paise))),
        ),
      );
      if (r.payment_method === "razorpay" && r.razorpay_payment_id) {
        const refund = await razorpay(
          `payments/${r.razorpay_payment_id}/refund`,
          { amount, notes: { return_id: r.id } },
        );
        refundId = refund.id;
      }
      status = "refunded";
      if (r.variant_id)
        await q("UPDATE variants SET stock=stock+$2 WHERE id=$1", [
          r.variant_id,
          r.quantity,
        ]);
      await q(`UPDATE order_items SET status='returned' WHERE id=$1`, [
        r.order_item_id,
      ]);
    }
    await q(
      "UPDATE returns SET status=$2,refund_id=$3,updated_at=NOW() WHERE id=$1",
      [r.id, status, refundId],
    );
    await notify(
      q,
      r.user_id,
      "Return update",
      `Your return was ${status}. ${r.resolution === "replace" && status === "refunded" ? "A refund was issued so you can reorder the available variant." : ""}`,
    );
    await audit(q, u, "return_" + b.action, "return", r.id, {
      status,
      refundId,
    });
    return { ok: true, status };
  });
}
