import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { reason = 'Cancelled by customer' } = await req.json().catch(() => ({}));

    const [order] = await sql`
      SELECT id, status, user_id FROM orders
      WHERE id = ${id}::uuid AND user_id = ${user.id}
    `;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!['placed', 'packed'].includes(order.status)) {
      return NextResponse.json(
        { error: 'Order has already been shipped or delivered and cannot be cancelled. You can request a return after delivery.' },
        { status: 400 }
      );
    }

    // Update order status
    await sql`UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ${order.id}`;
    await sql`UPDATE order_items SET status = 'cancelled' WHERE order_id = ${order.id}`;

    // Restore inventory
    const items = await sql`SELECT variant_id, quantity FROM order_items WHERE order_id = ${order.id}`;
    for (const item of items) {
      if (item.variant_id) {
        await sql`UPDATE variants SET stock = stock + ${item.quantity} WHERE id = ${item.variant_id}`;
      }
    }

    // Log timeline event
    await sql`
      INSERT INTO order_status_events (order_id, status, actor, note)
      VALUES (${order.id}, 'cancelled', 'Customer', ${reason})
    `;

    return NextResponse.json({ ok: true, status: 'cancelled' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to cancel order' }, { status: 500 });
  }
}
