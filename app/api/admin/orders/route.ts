import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const orders = await sql`
      SELECT 
        o.id,
        o.status,
        o.total_paise,
        o.payment_method,
        o.razorpay_payment_id,
        o.created_at,
        u.email as customer_email,
        u.name as customer_name
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
      LIMIT 50;
    `;

    const returns = await sql`
      SELECT 
        r.id,
        r.reason,
        r.photo_urls,
        r.status,
        r.refund_amount_paise,
        r.created_at,
        oi.variant_snapshot,
        o.id as order_id,
        u.email as customer_email
      FROM returns r
      JOIN order_items oi ON oi.id = r.order_item_id
      JOIN orders o ON o.id = oi.order_id
      JOIN users u ON u.id = o.user_id
      ORDER BY r.created_at DESC;
    `;

    return NextResponse.json({ orders, returns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch admin orders' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { returnId, action } = await req.json(); // action: 'approve' | 'reject'
    if (!returnId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Valid returnId and action required' }, { status: 400 });
    }

    if (action === 'approve') {
      const refundId = `rfnd_test_${crypto.randomBytes(8).toString('hex')}`;
      await sql`
        UPDATE returns
        SET 
          status = 'refunded',
          refund_id = ${refundId},
          refunded_at = NOW()
        WHERE id = ${returnId}::uuid;
      `;

      await sql`
        INSERT INTO audit_logs (actor_id, actor_role, action, resource_type, resource_id, details)
        VALUES (
          ${user.id},
          'admin',
          'refund_processed',
          'return',
          ${returnId},
          ${JSON.stringify({ refundId })}::jsonb
        );
      `;

      return NextResponse.json({ ok: true, status: 'refunded', refundId });
    } else {
      await sql`
        UPDATE returns
        SET status = 'rejected'
        WHERE id = ${returnId}::uuid;
      `;

      return NextResponse.json({ ok: true, status: 'rejected' });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process return' }, { status: 500 });
  }
}
