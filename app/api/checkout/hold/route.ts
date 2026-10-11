import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const { items } = await req.json(); // Array of { variantId, quantity }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided for stock hold' }, { status: 400 });
    }

    const holdResults = [];

    // Clean up expired holds first
    await sql`DELETE FROM stock_holds WHERE expires_at < NOW()`;

    for (const item of items) {
      const { variantId, quantity = 1 } = item;
      const qty = Math.max(1, Number(quantity));

      // Check current stock vs active unexpired holds
      const [variant] = await sql`
        SELECT v.id, v.stock, COALESCE(SUM(h.quantity), 0)::int as held_quantity
        FROM variants v
        LEFT JOIN stock_holds h ON h.variant_id = v.id AND h.expires_at > NOW()
        WHERE v.id = ${variantId}::uuid
        GROUP BY v.id, v.stock
      `;

      if (!variant) {
        return NextResponse.json({ error: `Variant not found: ${variantId}` }, { status: 404 });
      }

      const available = variant.stock - variant.held_quantity;
      if (available < qty) {
        return NextResponse.json(
          {
            error: `Insufficient stock for item. Requested ${qty}, available ${Math.max(0, available)}`,
            insufficientVariantId: variantId,
          },
          { status: 409 }
        );
      }

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      const [hold] = await sql`
        INSERT INTO stock_holds (variant_id, user_id, quantity, expires_at)
        VALUES (${variantId}::uuid, ${user?.id || null}, ${qty}, ${expiresAt.toISOString()})
        RETURNING id, expires_at
      `;

      holdResults.push({
        holdId: hold.id,
        variantId,
        quantity: qty,
        expiresAt: hold.expires_at,
      });
    }

    return NextResponse.json({
      held: true,
      holdResults,
      expiresInMinutes: 15,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Stock hold failed' }, { status: 500 });
  }
}
