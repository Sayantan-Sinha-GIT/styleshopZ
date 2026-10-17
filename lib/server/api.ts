import { query, transaction } from "./db";
import {
  assert,
  ApiError,
  text,
  uuid,
  integer,
  lineItems,
  totals,
  canReturn,
} from "./rules";
import { currentUser, requireUser, cookie, rate } from "./session";
import {
  catalogue,
  categories,
  productDetail,
  cartItems,
  photo,
  notify,
  audit,
  pendingDealQuantity,
} from "./catalog";
import {
  reserve,
  createOrder,
  verifyPayment,
  paymentWebhook,
  cancelOrder,
  fulfil,
  requestReturn,
  processReturn,
  checkCoupon,
  razorpayEnabled,
  demoEnabled,
} from "./commerce";
import {
  authenticate,  cartMutation,
  profile,
  addresses,
  wishlists,
  support,
} from "./account";
import {
  sellerData,
  sellerProfile,
  saveProduct,
  adminData,
  adminMutation,
} from "./management";
import { assistant } from "./assistant";
import { aiEnabled } from "../ai";
import { googleAuthenticate, emailVerification, emailReset, emailReady } from './identity';
import { places } from './places';

async function dispatch(req: Request) {
  const url = new URL(req.url),
    path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, ""),
    m = req.method,
    p = url.searchParams;
  if (path === "payments/webhook" && m === "POST") return paymentWebhook(req);
  if (!["GET", "HEAD"].includes(m)) {
    const origin = req.headers.get("origin");
    assert(
      !origin || origin === url.origin,
      "This request came from another site.",
      403,
    );
    assert(
      Number(req.headers.get("content-length") || 0) < 7500000,
      "Request is too large.",
      413,
    );
  }
  const b = ["GET", "HEAD", "DELETE"].includes(m)
    ? {}
    : path === "uploads"
      ? {}
      : await req.json().catch(() => {
          throw new ApiError(400, "Send valid JSON.");
        });
  assert(b && typeof b === "object" && !Array.isArray(b), "Send a JSON object.");
  if (path === "version")
    return {
      commit:
        process.env.APP_COMMIT ||
        process.env.CF_PAGES_COMMIT_SHA ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        "local",
      builtAt: process.env.APP_BUILT_AT || null,
    };
  if (path === "config")
    return {
      demo: demoEnabled(),
      razorpay: razorpayEnabled(),
      keyId: razorpayEnabled() ? process.env.RAZORPAY_KEY_ID : null,
      ai: aiEnabled(),
      resetEmail: emailReady(),
      verificationEmail: emailReady(),
      google: !!process.env.FIREBASE_WEB_API_KEY,
      firebaseApiKey:process.env.FIREBASE_WEB_API_KEY || '',
      maps: !!process.env.OLA_MAPS_API_KEY,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || url.origin,
    };
  if (path === "auth/login" && m === "POST") return authenticate(req, b, false);
  if(path === 'auth/google' && m === 'POST')return googleAuthenticate(req,b);
  if(path === 'auth/verify-email' && m === 'POST')return emailVerification(req,b);
  if(path === 'auth/email-reset' && m === 'POST')return emailReset(req,b);
  if(path === 'places/search' && m === 'GET')return places(req,p,false);
  if(path === 'places/reverse' && m === 'GET')return places(req,p,true);
  if (path === "auth/register" && m === "POST")
    return authenticate(req, b, true);
  if (path === "auth/logout" && m === "POST")
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": cookie("", true) } },
    );
  if (path === "auth/me") return { user: await currentUser() };
  if (path === "auth/reset" && m === "POST") return emailReset(req, b);
  if (path === "products" && m === "GET") return catalogue(p);
  if (path === "categories" && m === "GET") return categories();
  if (path === "suggest" && m === "GET") {
    const result = await catalogue(
      new URLSearchParams({ q: (p.get("q") || "").slice(0, 100), limit: "6", category:p.get('category') || '' }),
    );
    return {
      suggestions: result.products.map((v) => ({ id: v.id, title: v.title })),
    };
  }
  if (path === "deals" && m === "GET") {
    const result = await catalogue(
      new URLSearchParams({ deals: "true", limit: "60" }),
    );
    return {
      deals: result.products,
      coupons: await query(
        "SELECT code,discount_type,discount_value,min_cart_paise,expires_at FROM coupons WHERE starts_at<=NOW() AND expires_at>NOW() AND (usage_limit IS NULL OR used_count<usage_limit) LIMIT 12",
      ),
    };
  }
  if (path === "banners" && m === "GET")
    return {
      banners: await query(
        "SELECT * FROM banners WHERE is_active=TRUE AND starts_at<=NOW() AND (ends_at IS NULL OR ends_at>NOW()) ORDER BY sort_order",
      ),
    };
  if (/^products\/[0-9a-f-]+$/.test(path) && m === "GET")
    return productDetail(path.split("/")[1]);
  if (path === "cart/preview" && m === "POST") {
    const items = lineItems(b.items),
      rows = await query(
        `SELECT v.id variant_id,v.stock,v.options,v.price_paise,v.mrp_paise,p.id product_id,p.title,p.brand,c.name category_name,COALESCE(d.deal_price_paise,v.price_paise) unit_price_paise FROM variants v JOIN products p ON p.id=v.product_id JOIN sellers s ON s.id=p.seller_id JOIN categories c ON c.id=p.category_id LEFT JOIN LATERAL(SELECT deal_price_paise FROM deals WHERE variant_id=v.id AND starts_at<=NOW() AND ends_at>NOW() AND sold_count+${pendingDealQuantity()}<quantity_cap ORDER BY deal_price_paise LIMIT 1)d ON TRUE WHERE v.id=ANY($1::uuid[]) AND p.status='live' AND p.deleted_at IS NULL AND s.status='approved'`,
        [items.map((i) => i.variantId)],
      );
    return {
      items: rows.map((r) => ({
        ...photo(r),
        cart_item_id: r.variant_id,
        quantity: items.find((i) => i.variantId === r.variant_id)!.quantity,
        in_stock:
          r.stock >= items.find((i) => i.variantId === r.variant_id)!.quantity,
      })),
      subtotalPaise: rows.reduce(
        (s, r) =>
          s +
          Number(r.unit_price_paise) *
            items.find((i) => i.variantId === r.variant_id)!.quantity,
        0,
      ),
    };
  }
  if (path === "cart") {
    const u = await requireUser();
    if (m === "GET") return cartItems(u.id);
    return cartMutation(u.id, m, b, p);
  }
  if (path === "checkout/hold" && m === "POST")
    return reserve((await requireUser()).id, b);
  if (path === "checkout/create-order" && m === "POST")
    return createOrder((await requireUser()).id, b);
  if (path === "checkout/verify" && m === "POST")
    return verifyPayment((await requireUser()).id, b);
  if (path === "coupons/validate" && m === "POST") {
    const u = await requireUser(),
      cart = await cartItems(u.id),
      coupon = await checkCoupon(
        query,
        text(b.code, "Coupon", 2, 30),
        u.id,
        cart.subtotalPaise,
      );
    return {
      valid: true,
      coupon,
      ...totals(cart.subtotalPaise, coupon.discountPaise, b.delivery),
    };
  }
  if (path === "profile") return profile(m, b);
  if (path === "addresses") return addresses(m, b, p);
  if (path === "wishlists") return wishlists(m, b, p);
  if (path === "support") return support(m, b, p);
  if (path === "assistant/chat") return assistant(m, b);
  if (path === "notifications") {
    const u = await requireUser();
    if (m === "GET")
      return {
        notifications: await query(
          "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
          [u.id],
        ),
      };
    await query(
      "UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND ($2::uuid IS NULL OR id=$2)",
      [u.id, b.id ? uuid(b.id) : null],
    );
    return { ok: true };
  }
  if (path === "orders" && m === "GET") {
    const u = await requireUser();
    return {
      orders: await query(
        `SELECT o.*,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'title',i.variant_snapshot->>'title','quantity',i.quantity,'status',i.status,'product_id',i.variant_snapshot->>'product_id','category_name',i.variant_snapshot->>'category_name')) FROM order_items i WHERE i.order_id=o.id),'[]') items FROM orders o WHERE o.user_id=$1 ORDER BY o.created_at DESC LIMIT 100`,
        [u.id],
      ),
    };
  }
  const orderMatch = path.match(/^orders\/([^/]+)(?:\/(cancel|invoice))?$/);
  if (orderMatch) {
    const u = await requireUser(),
      id = uuid(orderMatch[1]);
    if (orderMatch[2] === "cancel" && m === "POST")
      return cancelOrder(u.id, id, b.reason || "Cancelled by customer");
    const [order] = await query(
      "SELECT * FROM orders WHERE id=$1 AND (user_id=$2 OR $3='admin')",
      [id, u.id, u.role],
    );
    assert(order, "Order not found.", 404);
    const [items, events, returns] = await Promise.all([
      query(
        "SELECT i.*,NOW() eligibility_checked_at,s.shop_name seller_name FROM order_items i LEFT JOIN sellers s ON s.id=i.seller_id WHERE order_id=$1",
        [id],
      ),
      query(
        "SELECT * FROM order_status_events WHERE order_id=$1 ORDER BY created_at",
        [id],
      ),
      query(
        "SELECT r.* FROM returns r JOIN order_items i ON i.id=r.order_item_id WHERE i.order_id=$1",
        [id],
      ),
    ]);
    if (orderMatch[2] === "invoice") {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const doc = await PDFDocument.create(),
        font = await doc.embedFont(StandardFonts.Helvetica);
      let page = doc.addPage([595, 842]);
      let y = 790;
      const lines = [
        "styleshopZ | Demonstration invoice",
        "Not a tax invoice. No real sale or GST collection.",
        `Order: ${order.id}`,
        `Date: ${new Date(order.created_at).toISOString().slice(0, 10)}`,
        `Customer: ${order.address_snapshot.name}`,
        `Payment: ${order.payment_method}`,
        ...items.map(
          (i) =>
            `${i.quantity} x ${i.variant_snapshot.title} | INR ${((Number(i.unit_price_paise) * i.quantity) / 100).toFixed(2)}`,
        ),
        `Subtotal: INR ${(Number(order.subtotal_paise) / 100).toFixed(2)}`,
        `Discount: INR ${(Number(order.discount_paise) / 100).toFixed(2)}`,
        `Delivery: INR ${(Number(order.delivery_fee_paise) / 100).toFixed(2)}`,
        `Total: INR ${(Number(order.total_paise) / 100).toFixed(2)}`,
      ];
      for (const line of lines) {
        const ascii = line.replace(/[^\x20-\x7E]/g, "?");
        if (y < 50) {
          page = doc.addPage([595, 842]);
          y = 790;
        }
        page.drawText(ascii.slice(0, 90), {
          x: 40,
          y,
          size: 11,
          font,
          color: rgb(0.1, 0.1, 0.12),
        });
        y -= 25;
      }
      return new Response(new Uint8Array(await doc.save()), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="styleshopz-${id.slice(0, 8)}.pdf"`,
        },
      });
    }
    const delivered = events.find((e) => e.status === "delivered");
    return {
      order,
      items: items.map((i) => ({
        ...i,
        return_eligible: canReturn(
          i.status,
          i.delivered_at || delivered?.created_at,
          new Date(i.eligibility_checked_at).getTime(),
        ),
      })),
      events,
      returns,
      returnEligible:
        order.status === "delivered" &&
        !!delivered &&
        Date.now() - new Date(delivered.created_at).getTime() <= 7 * 86400000,
    };
  }
  if (path === "returns" && m === "POST")
    return requestReturn((await requireUser()).id, b);
  if (path === "seller" && m === "GET") return sellerData();
  if (path === "seller/profile" && m === "POST") return sellerProfile(b);
  if (path === "seller/products") return saveProduct(m, b, p);
  if (path === "seller/orders") {
    const u = await requireUser("seller");
    if (m === "GET") return sellerData();
    return fulfil(u, b);
  }
  if (path.startsWith("admin/")) {
    const section = path.split("/")[1];
    if (m === "GET") return adminData(section);
    const u = await requireUser("admin");
    if (section === "orders" && b.orderItemId) return fulfil(u, b);
    if (section === "orders") return processReturn(u, b);
    return adminMutation(section, b);
  }
  if (path === "reviews" && m === "POST") {
    const u = await requireUser(),
      productId = uuid(b.productId);
    if (b.action === "helpful") {
      await query(
        "INSERT INTO review_votes(review_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [uuid(b.reviewId), u.id],
      );
      return { ok: true };
    }
    if (b.action === "report") {
      await query(
        "INSERT INTO review_reports(review_id,user_id,reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [
          uuid(b.reviewId),
          u.id,
          text(b.reason || "Reported by customer", "Reason", 3, 500),
        ],
      );
      return { ok: true };
    }
    const [purchase] = await query(
      `SELECT i.id FROM order_items i JOIN orders o ON o.id=i.order_id JOIN variants v ON v.id=i.variant_id WHERE o.user_id=$1 AND v.product_id=$2 AND i.status='delivered' LIMIT 1`,
      [u.id, productId],
    );
    assert(purchase, "Only delivered purchasers can review this product.", 403);
    const content = text(b.text, "Review", 10, 2000),
      photos = Array.isArray(b.photos) ? b.photos : [];
    assert(photos.length <= 4, "Attach at most four photos.");
    for (const url of photos) {
      const [up] = await query(
        "SELECT id FROM uploads WHERE id=$1 AND user_id=$2",
        [uuid(String(url).split("/").pop()), u.id],
      );
      assert(up, "Invalid review photo.");
    }
    const status = /\b(fuck|shit|scam)\b/i.test(content)
      ? "moderated"
      : "approved";
    await query(
      `INSERT INTO reviews(user_id,product_id,rating,text,photos,is_verified,status) VALUES($1,$2,$3,$4,$5::jsonb,TRUE,$6) ON CONFLICT(user_id,product_id) DO UPDATE SET rating=EXCLUDED.rating,text=EXCLUDED.text,photos=EXCLUDED.photos,status=EXCLUDED.status`,
      [
        u.id,
        productId,
        integer(b.rating, 1, 5, "Rating"),
        content,
        JSON.stringify(photos),
        status,
      ],
    );
    return { ok: true, status };
  }
  if (path === "questions" && m === "POST") {
    const u = await requireUser();
    await rate("questions:" + u.id, 10, 3600);
    if (b.id) {
      const [qa] = await query(
        "SELECT p.seller_id FROM product_qa q JOIN products p ON p.id=q.product_id WHERE q.id=$1",
        [uuid(b.id)],
      );
      assert(
        qa &&
          (u.role === "customer" ||
            u.role === "admin" ||
            u.seller_id === qa.seller_id),
        "You cannot answer this question.",
        403,
      );
      await query(
        "UPDATE product_qa SET answer=$2,answered_by=$3 WHERE id=$1",
        [b.id, text(b.answer, "Answer", 2, 500), u.id],
      );
    } else {
      const product = await productDetail(uuid(b.productId));
      assert(product.product, "Product not found.", 404);
      await query(
        "INSERT INTO product_qa(product_id,user_id,question) VALUES($1,$2,$3)",
        [b.productId, u.id, text(b.question, "Question", 5, 500)],
      );
    }
    return { ok: true };
  }
  if (path === "uploads" && m === "POST") {
    const u = await requireUser();
    await rate("upload:" + u.id, 20, 3600);
    const form = await req.formData(),
      file = form.get("file");
    assert(
      file instanceof File && file.size > 0 && file.size <= 5 * 1024 * 1024,
      "Choose an image under 5 MB.",
    );
    const buffer = Buffer.from(await file.arrayBuffer());
    const mime =
      buffer[0] === 0xff && buffer[1] === 0xd8
        ? "image/jpeg"
        : buffer
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? "image/png"
          : buffer.toString("ascii", 0, 4) === "RIFF" &&
              buffer.toString("ascii", 8, 12) === "WEBP"
            ? "image/webp"
            : null;
    assert(mime, "Only JPEG, PNG and WebP images are supported.");
    const [up] = await query(
      "INSERT INTO uploads(user_id,mime,data) VALUES($1,$2,$3) RETURNING id",
      [u.id, mime, buffer.toString("base64")],
    );
    return { url: "/uploads/" + up.id };
  }
  if (path === "account/export") {
    const u = await requireUser();
    const [addresses, orders, lists, tickets] = await Promise.all([
      query("SELECT * FROM addresses WHERE user_id=$1", [u.id]),
      query("SELECT * FROM orders WHERE user_id=$1", [u.id]),
      query("SELECT * FROM wishlists WHERE user_id=$1", [u.id]),
      query("SELECT * FROM support_tickets WHERE user_id=$1", [u.id]),
    ]);
    return Response.json(
      { profile: u, addresses, orders, wishlists: lists, tickets },
      {
        headers: {
          "Content-Disposition": 'attachment; filename="styleshopz-data.json"',
        },
      },
    );
  }
  throw new ApiError(404, "This endpoint does not exist.");
}
export async function handle(req: Request) {
  try {
    const result = await dispatch(req);
    if (result instanceof Response) return result;
    return Response.json(result ?? { ok: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    if (e instanceof ApiError)
      return Response.json(
        { error: e.message },
        { status: e.status, headers: { "Cache-Control": "no-store" } },
      );
    if (e.code === "23505")
      return Response.json(
        { error: "This record already exists. Refresh and try again." },
        { status: 409 },
      );
    if (e.code === "22P02" || e.code === "23503" || e.code === "23514")
      return Response.json(
        { error: "Some fields are invalid. Check your input and retry." },
        { status: 400 },
      );
    console.error("API failure", {
      path: new URL(req.url).pathname,
      code: e.code || e.name,
    });
    return Response.json(
      { error: "The shop could not complete this request. Please retry." },
      { status: 503 },
    );
  }
}
