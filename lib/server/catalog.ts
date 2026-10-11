import { query, type Query, type Row } from "./db";
import { assert, integer, uuid } from "./rules";
import { getProductImage } from "../images";

export function photo(row: Row): Row {
  return {
    ...row,
    image_url:
      row.image_url ||
      getProductImage(row.title, row.category_name || row.category),
  };
}
export const priceJoins = `JOIN variants v ON v.product_id=p.id
  LEFT JOIN LATERAL(SELECT id,deal_price_paise,ends_at,quantity_cap,sold_count FROM deals WHERE variant_id=v.id AND starts_at<=NOW() AND ends_at>NOW() AND sold_count<quantity_cap ORDER BY deal_price_paise LIMIT 1) d ON TRUE`;
export async function catalogue(params: URLSearchParams, q: Query = query) {
  const values: any[] = [];
  const param = (v: any) => {
    values.push(v);
    return `$${values.length}`;
  };
  const where = [
    "p.status='live'",
    "p.deleted_at IS NULL",
    "s.status='approved'",
  ];
  const search = (params.get("q") || "").trim().slice(0, 100);
  const category = params.get("category") || params.get("category_id");
  if (search) {
    const words = search.split(/\s+/).filter(Boolean).slice(0, 8);
    for (const word of words) {
      const p = param("%" + word.replace(/[%_\\]/g, "\\$&") + "%");
      where.push(
        `(p.title ILIKE ${p} OR p.brand ILIKE ${p} OR c.name ILIKE ${p} OR p.description ILIKE ${p})`,
      );
    }
  }
  if (category) {
    const p = param(category);
    where.push(
      `p.category_id IN(WITH RECURSIVE cats AS(SELECT id FROM categories WHERE slug=${p} OR id::text=${p} UNION ALL SELECT c.id FROM categories c JOIN cats ON c.parent_id=cats.id) SELECT id FROM cats)`,
    );
  }
  if (params.get("brand")) where.push(`p.brand=${param(params.get("brand"))}`);
  const price = "COALESCE(d.deal_price_paise,v.price_paise)";
  for (const [key, op] of [
    ["min_price", ">="],
    ["max_price", "<="],
  ])
    if (params.has(key) && params.get(key) !== "")
      where.push(
        `${price}${op}${param(integer(params.get(key), 0, 100000000, "Price"))}`,
      );
  if (params.get("in_stock") === "true") where.push("v.stock>0");
  if (params.get("deals") === "true") where.push("d.id IS NOT NULL");
  if (params.get("rating"))
    where.push(
      `COALESCE(r.rating,0)>=${param(integer(params.get("rating"), 1, 5, "Rating"))}`,
    );
  if (params.get("discount"))
    where.push(
      `(v.mrp_paise-${price})*100/NULLIF(v.mrp_paise,0)>=${param(integer(params.get("discount"), 0, 99, "Discount"))}`,
    );
  const limit = integer(params.get("limit") || 24, 1, 60, "Page size");
  const offset = integer(params.get("offset") || 0, 0, 100000, "Page");
  const sort =
    (
      {
        price_asc: "price_paise ASC,id",
        price_desc: "price_paise DESC,id",
        rating: "rating DESC NULLS LAST,id",
        newest: "created_at DESC,id",
      } as Record<string, string>
    )[params.get("sort") || "newest"] || "created_at DESC,id";
  const base = `SELECT DISTINCT ON(p.id) p.id,p.title,p.brand,p.description,p.created_at,c.name category_name,c.slug category_slug,v.id default_variant_id,${price} price_paise,v.mrp_paise,v.stock,v.options default_options,r.rating,COALESCE(r.review_count,0)::int review_count,d.deal_price_paise,d.ends_at deal_ends_at,(SELECT url FROM product_images WHERE product_id=p.id ORDER BY sort_order LIMIT 1) image_url FROM products p JOIN sellers s ON s.id=p.seller_id JOIN categories c ON c.id=p.category_id ${priceJoins} LEFT JOIN LATERAL(SELECT ROUND(AVG(rating),1) rating,COUNT(*) review_count FROM reviews WHERE product_id=p.id AND status='approved') r ON TRUE WHERE ${where.join(" AND ")} ORDER BY p.id,${price},v.id`;
  const rows = await q(
    `WITH found AS(${base}) SELECT *,COUNT(*) OVER()::int total_count FROM found ORDER BY ${sort} LIMIT ${param(limit)} OFFSET ${param(offset)}`,
    values,
  );
  const [count] = rows.length
    ? [{ total: rows[0].total_count }]
    : await q(
        `SELECT COUNT(*)::int total FROM(${base}) t`,
        values.slice(0, -2),
      );
  return {
    products: rows.map(photo),
    count: Number(count?.total || 0),
    limit,
    offset,
  };
}
export async function categories() {
  const flat = await query(
    `WITH RECURSIVE paths AS(SELECT id,id ancestor FROM categories UNION ALL SELECT c.id,p.ancestor FROM categories c JOIN paths p ON c.parent_id=p.id) SELECT c.*,COUNT(DISTINCT p.id)::int product_count FROM categories c LEFT JOIN paths path ON path.ancestor=c.id LEFT JOIN products p ON p.category_id=path.id AND p.status='live' AND p.deleted_at IS NULL GROUP BY c.id ORDER BY c.level,c.name`,
  );
  return {
    flat,
    tree: flat
      .filter((c) => c.level === 1)
      .map((c) => ({
        ...c,
        subcategories: flat
          .filter((s) => s.parent_id === c.id)
          .map((s) => ({
            ...s,
            leaves: flat.filter((l) => l.parent_id === s.id),
          })),
      })),
  };
}
export async function productDetail(id: string) {
  uuid(id);
  const [product] = await query(
    `SELECT p.*,c.name category_name,c.slug category_slug,s.shop_name seller_name FROM products p JOIN categories c ON c.id=p.category_id JOIN sellers s ON s.id=p.seller_id WHERE p.id=$1 AND p.status='live' AND p.deleted_at IS NULL AND s.status='approved'`,
    [id],
  );
  assert(product, "This product is unavailable.", 404);
  const [variants, images, reviews, qas, history] = await Promise.all([
    query(
      `SELECT v.*,d.deal_price_paise,d.ends_at deal_ends_at,COALESCE(d.deal_price_paise,v.price_paise) unit_price_paise FROM products p ${priceJoins} WHERE p.id=$1 ORDER BY v.price_paise,v.id`,
      [id],
    ),
    query(
      "SELECT * FROM product_images WHERE product_id=$1 ORDER BY sort_order",
      [id],
    ),
    query(
      `SELECT r.*,u.name user_name,(SELECT COUNT(*)::int FROM review_votes WHERE review_id=r.id) helpful FROM reviews r JOIN users u ON u.id=r.user_id WHERE product_id=$1 AND r.status='approved' ORDER BY r.created_at DESC LIMIT 100`,
      [id],
    ),
    query(
      "SELECT q.*,u.name answered_by_name FROM product_qa q LEFT JOIN users u ON u.id=q.answered_by WHERE q.product_id=$1 ORDER BY q.created_at DESC LIMIT 50",
      [id],
    ),
    query(
      `SELECT MIN(unit_price_paise)::bigint price_paise,DATE_TRUNC('day',oi.created_at) AS "day" FROM order_items oi JOIN variants v ON v.id=oi.variant_id WHERE v.product_id=$1 GROUP BY 2 ORDER BY 2 DESC LIMIT 30`,
      [id],
    ),
  ]);
  return {
    product: photo(product),
    variants,
    images: images.length
      ? images
      : [{ url: photo(product).image_url, alt_text: product.title }],
    reviews,
    qas,
    priceHistory: history,
  };
}
export async function cartItems(userId: string, q: Query = query) {
  const rows = await q(
    `SELECT ci.id cart_item_id,ci.variant_id,ci.quantity,ci.saved_for_later,p.id product_id,p.title,p.brand,c.name category_name,v.options,v.stock,v.price_paise,v.mrp_paise,COALESCE(d.deal_price_paise,v.price_paise) unit_price_paise,(SELECT url FROM product_images WHERE product_id=p.id ORDER BY sort_order LIMIT 1) image_url,p.status product_status FROM cart_items ci JOIN carts cart ON cart.id=ci.cart_id JOIN variants v ON v.id=ci.variant_id JOIN products p ON p.id=v.product_id JOIN categories c ON c.id=p.category_id LEFT JOIN LATERAL(SELECT deal_price_paise FROM deals WHERE variant_id=v.id AND starts_at<=NOW() AND ends_at>NOW() AND sold_count<quantity_cap ORDER BY deal_price_paise LIMIT 1)d ON TRUE WHERE cart.user_id=$1 ORDER BY ci.created_at DESC`,
    [userId],
  );
  return {
    items: rows.map((r) => ({
      ...photo(r),
      in_stock: r.product_status === "live" && r.stock >= r.quantity,
    })),
    subtotalPaise: rows
      .filter((r) => !r.saved_for_later)
      .reduce((s, r) => s + Number(r.unit_price_paise) * r.quantity, 0),
  };
}
export async function notify(
  q: Query,
  userId: string,
  title: string,
  body: string,
  type = "orders",
) {
  await q(
    `INSERT INTO notifications(user_id,type,title,body) SELECT id,$2,$3,$4 FROM users WHERE id=$1 AND COALESCE((preferences->>$2)::boolean,TRUE)`,
    [userId, type, title, body],
  );
}
export async function audit(
  q: Query,
  u: Row,
  action: string,
  type: string,
  id: string,
  details: Row = {},
) {
  await q(
    "INSERT INTO audit_logs(actor_id,actor_role,action,target_type,target_id,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
    [u.id, u.role, action, type, id, JSON.stringify(details)],
  );
}
