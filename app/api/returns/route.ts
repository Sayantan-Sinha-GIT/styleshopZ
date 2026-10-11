import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderItemId, reason, photoUrls = [] } = await req.json();
    if (!orderItemId || !reason) {
      return NextResponse.json({ error: 'Order item and reason are required' }, { status: 400 });
    }

    const [item] = await sql`
      SELECT 
        oi.id,
        oi.order_id,
        oi.unit_price_paise,
        oi.quantity,
        o.user_id,
        o.status as order_status
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.id = ${orderItemId}::uuid AND o.user_id = ${user.id}
    `;

    if (!item) {
      return NextResponse.json({ error: 'Order item not found' }, { status: 404 });
    }

    if (item.order_status !== 'delivered') {
      return NextResponse.json({ error: 'Returns can only be requested after delivery' }, { status: 400 });
    }

    // Verify 7-day return window
    const [deliveredEvent] = await sql`
      SELECT created_at FROM order_status_events
      WHERE order_id = ${item.order_id} AND status = 'delivered'
      ORDER BY created_at DESC LIMIT 1
    `;

    if (deliveredEvent) {
      const deliveredTime = new Date(deliveredEvent.created_at).getTime();
      const diffDays = (Date.now() - deliveredTime) / (1000 * 60 * 60 * 24);
      if (diffDays > 7) {
        return NextResponse.json({ error: '7-day return window has expired' }, { status: 400 });
      }
    }

    const refundAmountPaise = Number(item.unit_price_paise) * Number(item.quantity);

    const [ret] = await sql`
      INSERT INTO returns (
        order_item_id,
        reason,
        photo_urls,
        status,
        refund_amount_paise
      )
      VALUES (
        ${item.id},
        ${reason.trim()},
        ${photoUrls}::text[],
        'pending',
        ${refundAmountPaise}
      )
      RETURNING id, status, refund_amount_paise, created_at;
    `;

    await sql`
      INSERT INTO order_status_events (order_id, status, actor, note)
      VALUES (
        ${item.order_id},
        'delivered',
        'Customer Support',
        ${`Return requested for item: "${reason.trim()}". Pending verification.`}
      );
    `;

    return NextResponse.json({
      ok: true,
      returnId: ret.id,
      status: ret.status,
      refundAmountPaise: ret.refund_amount_paise,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit return request' }, { status: 500 });
  }
}
