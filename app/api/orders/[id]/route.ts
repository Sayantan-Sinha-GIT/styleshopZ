import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Checks ownership or seller/admin privileges
    const [order] = await sql`
      SELECT 
        o.id,
        o.user_id,
        o.address_snapshot,
        o.status,
        o.total_paise,
        o.subtotal_paise,
        o.delivery_fee_paise,
        o.discount_paise,
        o.payment_method,
        o.razorpay_order_id,
        o.razorpay_payment_id,
        o.created_at,
        o.updated_at
      FROM orders o
      WHERE o.id = ${id}::uuid
        ${user.role === 'admin' ? sql`` : sql`AND o.user_id = ${user.id}`};
    `;

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const items = await sql`
      SELECT 
        oi.id,
        oi.variant_id,
        oi.variant_snapshot,
        oi.quantity,
        oi.seller_id,
        oi.unit_price_paise,
        oi.status,
        oi.tracking_id,
        s.business_name as seller_name
      FROM order_items oi
      LEFT JOIN sellers s ON s.id = oi.seller_id
      WHERE oi.order_id = ${id}::uuid;
    `;

    const events = await sql`
      SELECT 
        id,
        status,
        actor,
        note,
        created_at
      FROM order_status_events
      WHERE order_id = ${id}::uuid
      ORDER BY created_at ASC;
    `;

    // Calculate 7-day return eligibility
    let returnEligible = false;
    const deliveredEvent = events.find((e: any) => e.status === 'delivered');
    if (deliveredEvent) {
      const deliveredAt = new Date(deliveredEvent.created_at).getTime();
      const now = Date.now();
      const diffDays = (now - deliveredAt) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7 && order.status === 'delivered') {
        returnEligible = true;
      }
    }

    return NextResponse.json({
      order,
      items,
      events,
      returnEligible,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch order details' }, { status: 500 });
  }
}
