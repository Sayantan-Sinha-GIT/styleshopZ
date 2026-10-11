import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ items: [], subtotalPaise: 0 });
    }

    const items = await sql`
      SELECT 
        ci.id as cart_item_id,
        ci.variant_id,
        ci.quantity,
        v.price_paise,
        v.mrp_paise,
        v.stock,
        v.options,
        p.id as product_id,
        p.title,
        p.brand,
        d.deal_price_paise,
        d.ends_at as deal_ends_at
      FROM cart_items ci
      JOIN variants v ON v.id = ci.variant_id
      JOIN products p ON p.id = v.product_id
      LEFT JOIN deals d ON d.variant_id = v.id AND d.ends_at > NOW() AND d.sold_count < d.quantity_cap
      WHERE ci.user_id = ${user.id}
      ORDER BY ci.created_at DESC;
    `;

    let subtotalPaise = 0;
    const itemsWithPrices = items.map((item: any) => {
      const activePrice = item.deal_price_paise ? Number(item.deal_price_paise) : Number(item.price_paise);
      subtotalPaise += activePrice * item.quantity;
      return {
        ...item,
        unit_price_paise: activePrice,
        in_stock: item.stock >= item.quantity,
      };
    });

    return NextResponse.json({
      items: itemsWithPrices,
      subtotalPaise,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch cart' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to add to cart' }, { status: 401 });
    }

    const { variantId, quantity = 1 } = await req.json();
    if (!variantId) {
      return NextResponse.json({ error: 'Variant ID required' }, { status: 400 });
    }

    const [variant] = await sql`SELECT stock FROM variants WHERE id = ${variantId}::uuid`;
    if (!variant || variant.stock < 1) {
      return NextResponse.json({ error: 'Item is out of stock' }, { status: 400 });
    }

    await sql`
      INSERT INTO cart_items (user_id, variant_id, quantity)
      VALUES (${user.id}, ${variantId}::uuid, ${Math.max(1, Number(quantity))})
      ON CONFLICT (user_id, variant_id) 
      DO UPDATE SET quantity = LEAST(cart_items.quantity + ${Math.max(1, Number(quantity))}, ${variant.stock});
    `;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update cart' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cartItemId = searchParams.get('id');
    const variantId = searchParams.get('variant_id');

    if (cartItemId) {
      await sql`DELETE FROM cart_items WHERE id = ${cartItemId}::uuid AND user_id = ${user.id}`;
    } else if (variantId) {
      await sql`DELETE FROM cart_items WHERE variant_id = ${variantId}::uuid AND user_id = ${user.id}`;
    } else {
      await sql`DELETE FROM cart_items WHERE user_id = ${user.id}`;
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to remove from cart' }, { status: 500 });
  }
}
