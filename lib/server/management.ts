import { query, transaction } from "./db";
import { requireUser } from "./session";
import { assert, text, uuid, integer, safeImage } from "./rules";
import { audit, notify, photo } from "./catalog";
import { randomUUID } from "node:crypto";

export async function sellerData() {
  const u = await requireUser("seller");
  const [seller] = await query("SELECT * FROM sellers WHERE user_id=$1", [
    u.id,
  ]);
  assert(seller, "Seller profile not found.", 404);
  const [products, orders, returns, stats] = await Promise.all([
    query(
      `SELECT p.*,c.name category_name,COALESCE((SELECT jsonb_agg(v ORDER BY v.created_at) FROM variants v WHERE v.product_id=p.id),'[]') variants,(SELECT url FROM product_images WHERE product_id=p.id ORDER BY sort_order LIMIT 1) image_url FROM products p JOIN categories c ON c.id=p.category_id WHERE p.seller_id=$1 AND p.deleted_at IS NULL ORDER BY p.created_at DESC LIMIT 1000`,
      [seller.id],
    ),
    query(
      `SELECT i.*,o.status order_status,o.address_snapshot,o.payment_method FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.seller_id=$1 AND o.status<>'awaiting_payment' ORDER BY i.created_at DESC LIMIT 1000`,
      [seller.id],
    ),
    query(
      `SELECT r.*,i.variant_snapshot FROM returns r JOIN order_items i ON i.id=r.order_item_id WHERE i.seller_id=$1 ORDER BY r.created_at DESC LIMIT 1000`,
      [seller.id],
    ),
    query(
      `SELECT COUNT(*)::int item_count,COALESCE(SUM(unit_price_paise*quantity) FILTER(WHERE i.status IN('delivered','returned')),0)::bigint delivered_paise,COALESCE(SUM(unit_price_paise*quantity) FILTER(WHERE i.status IN('placed','packed','shipped','out_for_delivery')),0)::bigint pending_paise FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.seller_id=$1 AND o.status<>'awaiting_payment'`,
      [seller.id],
    ),
  ]);
  return {
    seller,
    products: products.map(photo),
    items: orders,
    returns,
    stats: stats[0],
  };
}
export async function sellerProfile(b: any) {
  const u = await requireUser("seller");
  const shopName = text(b.shopName, "Shop name", 2, 100);
  const kyc = {
    businessType: text(b.businessType || "Individual", "Business type", 2, 60),
    pan: String(b.pan || "").toUpperCase(),
    gstin: String(b.gstin || "").toUpperCase(),
    document: b.document ? String(b.document) : null,
  };
  assert(
    !kyc.pan || /^[A-Z]{5}\d{4}[A-Z]$/.test(kyc.pan),
    "Enter a valid PAN.",
  );
  if (kyc.document) {
    const [upload] = await query(
      "UPDATE uploads SET private=TRUE WHERE id=$1 AND user_id=$2 RETURNING id",
      [uuid(kyc.document.split("/").pop()), u.id],
    );
    assert(upload, "Upload your own KYC document.");
  }
  await query(
    "UPDATE sellers SET shop_name=$2,kyc_data=$3::jsonb,updated_at=NOW() WHERE user_id=$1",
    [u.id, shopName, JSON.stringify(kyc)],
  );
  return { ok: true };
}
export async function saveProduct(
  method: string,
  b: any,
  params: URLSearchParams,
) {
  const u = await requireUser("seller");
  assert(
    u.seller_status === "approved",
    "Your shop must be approved before you can list products.",
    403,
  );
  const id = b.id
    ? uuid(b.id)
    : params.get("id")
      ? uuid(params.get("id"))
      : randomUUID();
  return transaction(async (q) => {
    await q("SELECT id FROM sellers WHERE id=$1 FOR UPDATE", [u.seller_id]);
    if (b.id || params.get("id")) {
      const [p] = await q(
        "SELECT id FROM products WHERE id=$1 AND seller_id=$2 FOR UPDATE",
        [id, u.seller_id],
      );
      assert(p, "Product not found.", 404);
    }
    if (method === "DELETE") {
      await q(
        "UPDATE products SET status='hidden',deleted_at=NOW() WHERE id=$1",
        [id],
      );
      await audit(q, u, "product_delete", "product", id);
      return { ok: true };
    }
    const title = text(b.title, "Product title", 3, 150),
      brand = text(b.brand, "Brand", 2, 60),
      description = text(b.description, "Description", 10, 5000),
      categoryId = uuid(b.categoryId);
    const [category] = await q("SELECT id FROM categories WHERE id=$1", [
      categoryId,
    ]);
    assert(category, "Choose a category.");
    const status = ["draft", "live", "hidden"].includes(b.status)
      ? b.status
      : "draft";
    const variants = Array.isArray(b.variants) ? b.variants : [];
    assert(
      variants.length > 0 && variants.length <= 20,
      "Add between one and twenty variants.",
    );
    await q(
      "INSERT INTO products(id,seller_id,category_id,title,brand,description,status) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET category_id=EXCLUDED.category_id,title=EXCLUDED.title,brand=EXCLUDED.brand,description=EXCLUDED.description,status=EXCLUDED.status,updated_at=NOW()",
      [id, u.seller_id, categoryId, title, brand, description, status],
    );
    for (const v of variants) {
      const price = integer(v.price_paise, 100, 100000000, "Price in paise"),
        mrp = integer(v.mrp_paise, price, 100000000, "MRP in paise"),
        stock = integer(v.stock, 0, 100000, "Stock"),
        sku = text(v.sku, "SKU", 3, 80),
        options =
          v.options &&
          typeof v.options === "object" &&
          !Array.isArray(v.options)
            ? v.options
            : {};
      assert(
        JSON.stringify(options).length <= 1000,
        "Variant attributes are too long.",
      );
      if (v.id) {
        const [old] = await q(
          "SELECT id FROM variants WHERE id=$1 AND product_id=$2 FOR UPDATE",
          [uuid(v.id), id],
        );
        assert(old, "Variant not found.");
        const [holds] = await q(
          "SELECT COALESCE(SUM(quantity),0)::int n FROM stock_holds WHERE variant_id=$1 AND expires_at>NOW()",
          [v.id],
        );
        assert(
          stock >= holds.n,
          "Stock cannot be lower than active reservations.",
        );
        await q(
          "UPDATE variants SET sku=$2,price_paise=$3,mrp_paise=$4,stock=$5,options=$6::jsonb WHERE id=$1",
          [v.id, sku, price, mrp, stock, JSON.stringify(options)],
        );
      } else
        await q(
          "INSERT INTO variants(product_id,sku,price_paise,mrp_paise,stock,options) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
          [id, sku, price, mrp, stock, JSON.stringify(options)],
        );
    }
    if (b.imageUrl) {
      safeImage(b.imageUrl);
      await q("DELETE FROM product_images WHERE product_id=$1", [id]);
      await q(
        "INSERT INTO product_images(product_id,url,alt_text) VALUES($1,$2,$3)",
        [id, b.imageUrl, title],
      );
    }
    await audit(q, u, "product_save", "product", id, { title, status });
    return { ok: true, id };
  });
}
export async function adminData(section: string) {
  await requireUser("admin");
  if (section === "sellers")
    return {
      sellers: await query(
        `SELECT s.*,u.name owner_name,u.email,(SELECT COUNT(*)::int FROM products WHERE seller_id=s.id) product_count FROM sellers s JOIN users u ON u.id=s.user_id ORDER BY s.created_at DESC LIMIT 1000`,
      ),
    };
  if (section === "orders")
    return {
      orders: await query(
        `SELECT o.*,u.name customer_name,u.email customer_email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC LIMIT 1000`,
      ),
      returns: await query(
        `SELECT r.*,i.variant_snapshot,i.order_id,u.email customer_email FROM returns r JOIN order_items i ON i.id=r.order_item_id JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC LIMIT 1000`,
      ),
    };
  if (section === "users")
    return {
      users: await query(
        "SELECT id,name,email,role,created_at,deleted_at FROM users ORDER BY created_at DESC LIMIT 1000",
      ),
    };
  if (section === "moderation")
    return {
      products: await query(
        `SELECT p.*,s.shop_name FROM products p JOIN sellers s ON s.id=p.seller_id WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC LIMIT 1000`,
      ),
      reviews: await query(
        `SELECT r.*,p.title FROM reviews r JOIN products p ON p.id=r.product_id WHERE r.status='moderated' OR EXISTS(SELECT 1 FROM review_reports WHERE review_id=r.id) ORDER BY r.created_at DESC LIMIT 1000`,
      ),
    };
  if (section === "promotions")
    return {
      coupons: await query(
        "SELECT * FROM coupons ORDER BY expires_at DESC LIMIT 1000",
      ),
      deals: await query(
        `SELECT d.*,p.title FROM deals d JOIN variants v ON v.id=d.variant_id JOIN products p ON p.id=v.product_id ORDER BY d.ends_at DESC LIMIT 1000`,
      ),
      banners: await query("SELECT * FROM banners ORDER BY sort_order"),
      categories: await query("SELECT * FROM categories ORDER BY level,name"),
    };
  if (section === "audit")
    return {
      logs: await query(
        "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1000",
      ),
    };
  const [stats] = await query(
    `SELECT (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL) users,(SELECT COUNT(*)::int FROM products WHERE status='live' AND deleted_at IS NULL) products,(SELECT COUNT(*)::int FROM orders WHERE status NOT IN('cancelled','awaiting_payment')) orders,(SELECT COALESCE(SUM(total_paise),0)::bigint FROM orders WHERE status='delivered') delivered_paise,(SELECT COUNT(*)::int FROM support_tickets WHERE status IN('open','in_progress')) tickets,(SELECT COUNT(*)::int FROM sellers WHERE status='pending') pending_sellers`,
  );
  return { stats };
}
export async function adminMutation(section: string, b: any) {
  const u = await requireUser("admin");
  return transaction(async (q) => {
    if (section === "sellers") {
      const status = b.status || b.kycStatus;
      assert(
        ["pending", "approved", "suspended"].includes(status),
        "Invalid seller status.",
      );
      const [s] = await q(
        "UPDATE sellers SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *",
        [uuid(b.sellerId), status],
      );
      assert(s, "Seller not found.", 404);
      await notify(
        q,
        s.user_id,
        "Shop approval update",
        `Your shop is ${status}.`,
      );
      await audit(q, u, "seller_" + status, "seller", s.id);
    } else if (section === "moderation") {
      const product = b.type === "product";
      const statuses = product
        ? ["live", "hidden", "draft"]
        : ["approved", "rejected", "moderated"];
      assert(statuses.includes(b.status), "Invalid moderation status.");
      const rows = product
        ? await q(
            "UPDATE products SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING id",
            [uuid(b.id), b.status],
          )
        : await q("UPDATE reviews SET status=$2 WHERE id=$1 RETURNING id", [
            uuid(b.id),
            b.status,
          ]);
      assert(rows.length, "Record not found.", 404);
      await audit(
        q,
        u,
        "moderate_" + b.status,
        product ? "product" : "review",
        b.id,
      );
    } else if (section === "promotions") {
      const id = b.id ? uuid(b.id) : randomUUID();
      if (b.type === "coupon") {
        const code = text(b.code, "Coupon code", 3, 30).toUpperCase();
        assert(
          /^[A-Z0-9_-]+$/.test(code),
          "Use letters and numbers in coupon codes.",
        );
        assert(
          ["flat", "percent"].includes(b.discount_type),
          "Invalid discount type.",
        );
        const value = integer(
          b.discount_value,
          1,
          b.discount_type === "percent" ? 90 : 10000000,
          "Discount",
        );
        assert(
          Number.isFinite(Date.parse(b.expires_at)) &&
            Date.parse(b.expires_at) > Date.now(),
          "Choose a future expiry.",
        );
        await q(
          `INSERT INTO coupons(id,code,discount_type,discount_value,min_cart_paise,usage_limit,per_user_limit,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET code=EXCLUDED.code,discount_type=EXCLUDED.discount_type,discount_value=EXCLUDED.discount_value,min_cart_paise=EXCLUDED.min_cart_paise,usage_limit=EXCLUDED.usage_limit,per_user_limit=EXCLUDED.per_user_limit,expires_at=EXCLUDED.expires_at`,
          [
            id,
            code,
            b.discount_type,
            value,
            integer(b.min_cart_paise || 0, 0, 100000000),
            integer(b.usage_limit || 100, 1, 100000),
            integer(b.per_user_limit || 1, 1, 100),
            b.expires_at,
          ],
        );
      } else if (b.type === "deal") {
        const variant = uuid(b.variant_id);
        const [v] = await q("SELECT * FROM variants WHERE id=$1", [variant]);
        assert(v, "Variant not found.");
        const price = integer(
          b.deal_price_paise,
          100,
          Number(v.price_paise),
          "Deal price",
        );
        assert(Date.parse(b.ends_at) > Date.now(), "Choose a future end time.");
        await q(
          "INSERT INTO deals(id,variant_id,deal_price_paise,quantity_cap,ends_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET deal_price_paise=EXCLUDED.deal_price_paise,quantity_cap=EXCLUDED.quantity_cap,ends_at=EXCLUDED.ends_at",
          [
            id,
            variant,
            price,
            integer(b.quantity_cap || 50, 1, 100000),
            b.ends_at,
          ],
        );
      } else if (b.type === "banner") {
        const link = text(b.link_url, "Link", 1, 200);
        assert(
          link.startsWith("/") && !link.startsWith("//"),
          "Use an internal shop link.",
        );
        await q(
          "INSERT INTO banners(id,title,image_url,link_url,sort_order,is_active) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,image_url=EXCLUDED.image_url,link_url=EXCLUDED.link_url,sort_order=EXCLUDED.sort_order,is_active=EXCLUDED.is_active",
          [
            id,
            text(b.title, "Title", 3, 150),
            safeImage(b.image_url),
            link,
            integer(b.sort_order || 0, 0, 100),
            b.is_active !== false,
          ],
        );
      } else if (b.type === "category") {
        const level = integer(b.level, 1, 3);
        const parent = b.parent_id ? uuid(b.parent_id) : null;
        if (level > 1) {
          const [p] = await q("SELECT level FROM categories WHERE id=$1", [
            parent,
          ]);
          assert(
            p && p.level === level - 1,
            "Choose a parent one level above.",
          );
        }
        const slug = text(b.slug, "Slug", 2, 80);
        assert(
          /^[a-z0-9-]+$/.test(slug),
          "Use lowercase letters, numbers and hyphens.",
        );
        await q(
          "INSERT INTO categories(id,name,slug,level,parent_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug",
          [id, text(b.name, "Category name", 2, 80), slug, level, parent],
        );
      } else assert(false, "Unknown promotion type.");
      await audit(q, u, "promotion_save", b.type, id);
    } else assert(false, "Unknown admin action.");
    return { ok: true };
  });
}
