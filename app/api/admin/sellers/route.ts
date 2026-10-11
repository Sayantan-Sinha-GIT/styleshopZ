import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const sellers = await sql`
      SELECT 
        s.id,
        s.business_name,
        s.pan_number,
        s.gstin,
        s.kyc_status,
        s.rating,
        s.created_at,
        u.email,
        u.name as owner_name,
        u.phone,
        COUNT(p.id)::int as product_count
      FROM sellers s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN products p ON p.seller_id = s.id
      GROUP BY s.id, u.id
      ORDER BY s.created_at DESC;
    `;

    return NextResponse.json({ sellers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch sellers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { sellerId, kycStatus } = await req.json();
    if (!sellerId || !['approved', 'rejected', 'pending'].includes(kycStatus)) {
      return NextResponse.json({ error: 'Valid sellerId and kycStatus required' }, { status: 400 });
    }

    await sql`
      UPDATE sellers
      SET kyc_status = ${kycStatus}
      WHERE id = ${sellerId}::uuid;
    `;

    await sql`
      INSERT INTO audit_logs (actor_id, actor_role, action, resource_type, resource_id, details)
      VALUES (
        ${user.id},
        'admin',
        ${`seller_kyc_${kycStatus}`},
        'seller',
        ${sellerId},
        ${JSON.stringify({ kycStatus })}::jsonb
      );
    `;

    return NextResponse.json({ ok: true, sellerId, kycStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update seller KYC' }, { status: 500 });
  }
}
