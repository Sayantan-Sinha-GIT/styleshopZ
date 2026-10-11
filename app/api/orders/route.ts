import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await sql`
      SELECT 
        o.id,
        o.status,
        o.total_paise,
        o.subtotal_paise,
        o.delivery_fee_paise,
        o.discount_paise,
        o.payment_method,
        o.created_at,
        COUNT(oi.id)::int as item_count,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', oi.id,
            'variant_snapshot', oi.variant_snapshot,
            'quantity', oi.quantity,
            'unit_price_paise', oi.unit_price_paise,
            'status', oi.status,
            'tracking_id', oi.tracking_id
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = ${user.id}
      GROUP BY o.id
      ORDER BY o.created_at DESC;
    `;

    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch orders' }, { status: 500 });
  }
}
