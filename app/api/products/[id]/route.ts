import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [product] = await sql`
      SELECT 
        p.id,
        p.title,
        p.brand,
        p.description,
        p.status,
        p.created_at,
        c.id as category_id,
        c.name as category_name,
        c.slug as category_slug,
        s.id as seller_id,
        s.business_name as seller_name,
        s.rating as seller_rating
      FROM products p
      JOIN categories c ON c.id = p.category_id
      JOIN sellers s ON s.id = p.seller_id
      WHERE p.id = ${id}::uuid
    `;

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const variants = await sql`
      SELECT 
        v.id,
        v.sku,
        v.options,
        v.price_paise,
        v.mrp_paise,
        v.stock,
        d.id as deal_id,
        d.deal_price_paise,
        d.ends_at as deal_ends_at
      FROM variants v
      LEFT JOIN deals d ON d.variant_id = v.id AND d.ends_at > NOW() AND d.sold_count < d.quantity_cap
      WHERE v.product_id = ${id}::uuid
      ORDER BY v.price_paise ASC
    `;

    const reviews = await sql`
      SELECT 
        r.id,
        r.rating,
        r.text,
        r.is_verified,
        r.created_at,
        u.name as user_name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.product_id = ${id}::uuid AND r.status = 'approved'
      ORDER BY r.created_at DESC
      LIMIT 20
    `;

    const qas = await sql`
      SELECT 
        q.id,
        q.question,
        q.answer,
        q.created_at,
        u.name as answered_by_name
      FROM product_qa q
      LEFT JOIN users u ON u.id = q.answered_by
      WHERE q.product_id = ${id}::uuid
      ORDER BY q.created_at DESC
      LIMIT 10
    `;

    return NextResponse.json({
      product,
      variants,
      reviews,
      qas,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch product details' }, { status: 500 });
  }
}
