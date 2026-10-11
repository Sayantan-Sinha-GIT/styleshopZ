import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q')?.trim() || '';
    const categoryId = searchParams.get('category_id') || '';
    const brand = searchParams.get('brand') || '';
    const minPrice = searchParams.get('min_price') ? Number(searchParams.get('min_price')) : null;
    const maxPrice = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null;
    const sort = searchParams.get('sort') || 'newest';
    const limit = Math.min(Number(searchParams.get('limit') || 24), 60);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

    const queryPattern = q ? `%${q}%` : null;

    const products = await sql`
      SELECT 
        p.id,
        p.title,
        p.brand,
        p.description,
        p.status,
        c.name as category_name,
        c.slug as category_slug,
        v.id as default_variant_id,
        v.price_paise,
        v.mrp_paise,
        v.stock,
        v.options as default_options,
        COALESCE(r.avg_rating, 4.5)::numeric(2,1) as rating,
        COALESCE(r.review_count, 12)::int as review_count,
        d.deal_price_paise,
        d.ends_at as deal_ends_at
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT id, price_paise, mrp_paise, stock, options
        FROM variants
        WHERE product_id = p.id
        ORDER BY price_paise ASC
        LIMIT 1
      ) v ON true
      LEFT JOIN (
        SELECT product_id, AVG(rating) as avg_rating, COUNT(*) as review_count
        FROM reviews
        WHERE status = 'approved'
        GROUP BY product_id
      ) r ON r.product_id = p.id
      LEFT JOIN deals d ON d.variant_id = v.id AND d.ends_at > NOW() AND d.sold_count < d.quantity_cap
      WHERE p.status = 'live'
        ${queryPattern ? sql`AND (p.title ILIKE ${queryPattern} OR p.brand ILIKE ${queryPattern} OR c.name ILIKE ${queryPattern})` : sql``}
        ${categoryId ? sql`AND (p.category_id = ${categoryId}::uuid OR c.parent_id = ${categoryId}::uuid)` : sql``}
        ${brand ? sql`AND p.brand ILIKE ${brand}` : sql``}
        ${minPrice !== null ? sql`AND v.price_paise >= ${minPrice}` : sql``}
        ${maxPrice !== null ? sql`AND v.price_paise <= ${maxPrice}` : sql``}
      ORDER BY 
        ${sort === 'price_asc' ? sql`v.price_paise ASC` : sql``}
        ${sort === 'price_desc' ? sql`v.price_paise DESC` : sql``}
        ${sort === 'rating' ? sql`COALESCE(r.avg_rating, 0) DESC` : sql``}
        ${sort === 'newest' ? sql`p.created_at DESC` : sql``}
      LIMIT ${limit}
      OFFSET ${offset};
    `;

    return NextResponse.json({
      products,
      count: products.length,
      limit,
      offset,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch products' }, { status: 500 });
  }
}
