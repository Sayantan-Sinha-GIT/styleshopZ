import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const deals = await sql`
      SELECT 
        d.id,
        d.variant_id,
        d.deal_price_paise,
        d.quantity_cap,
        d.sold_count,
        d.starts_at,
        d.ends_at,
        v.price_paise as original_price_paise,
        v.mrp_paise,
        v.options,
        v.stock,
        p.id as product_id,
        p.title,
        p.brand,
        c.name as category_name
      FROM deals d
      JOIN variants v ON v.id = d.variant_id
      JOIN products p ON p.id = v.product_id
      JOIN categories c ON c.id = p.category_id
      WHERE d.ends_at > NOW() AND d.sold_count < d.quantity_cap
      ORDER BY d.ends_at ASC
      LIMIT 20;
    `;

    return NextResponse.json({ deals });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch deals' }, { status: 500 });
  }
}
