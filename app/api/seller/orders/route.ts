import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized seller access' }, { status: 403 });
    }

    const [seller] = await sql`SELECT id FROM sellers WHERE user_id = ${user.id}`;
    if (!seller && user.role !== 'admin') {
      return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    }

    const items = await sql`
      SELECT 
        oi.id,
        oi.order_id,
        oi.variant_snapshot,
        oi.quantity,
        oi.unit_price_paise,
        oi.status,
        oi.tracking_id,
        oi.created_at,
        o.address_snapshot,
        o.payment_method
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      ${user.role === 'admin' ? sql`` : sql`WHERE oi.seller_id = ${seller.id}`}
      ORDER BY oi.created_at DESC;
    `;

    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch seller orders' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'seller' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized seller access' }, { status: 403 });
    }

    const { orderItemId, newStatus, trackingId } = await req.json();
    if (!orderItemId || !newStatus) {
      return NextResponse.json({ error: 'orderItemId and newStatus required' }, { status: 400 });
    }

    const [item] = await sql`
      SELECT oi.id, oi.order_id, oi.status
      FROM order_items oi
      WHERE oi.id = ${orderItemId}::uuid;
    `;

    if (!item) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    // Update item
    await sql`
      UPDATE order_items
      SET 
        status = ${newStatus},
        tracking_id = COALESCE(${trackingId || null}, tracking_id)
      WHERE id = ${orderItemId}::uuid;
    `;

    // Also update parent order status if appropriate
    if (['packed', 'shipped', 'out_for_delivery', 'delivered'].includes(newStatus)) {
      await sql`
        UPDATE orders
        SET status = ${newStatus}, updated_at = NOW()
        WHERE id = ${item.order_id};
      `;

      await sql`
        INSERT INTO order_status_events (order_id, status, actor, note)
        VALUES (
          ${item.order_id},
          ${newStatus},
          ${user.name || 'Seller Logistics'},
          ${`Dispatched with tracking ID ${trackingId || 'TRK-IN-AUTO'}`}
        );
      `;
    }

    return NextResponse.json({ ok: true, newStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update order item' }, { status: 500 });
  }
}
