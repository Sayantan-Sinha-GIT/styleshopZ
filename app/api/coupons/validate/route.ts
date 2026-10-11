import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { code, cartSubtotalPaise } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Coupon code required' }, { status: 400 });
    }

    const [coupon] = await sql`
      SELECT id, code, discount_type, discount_value, min_cart_paise, usage_limit, times_used, expires_at
      FROM coupons
      WHERE UPPER(code) = UPPER(${code.trim()}) AND is_active = true
    `;

    if (!coupon) {
      return NextResponse.json({ valid: false, message: 'Invalid or inactive coupon code' });
    }

    if (new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, message: 'Coupon code has expired' });
    }

    if (coupon.times_used >= coupon.usage_limit) {
      return NextResponse.json({ valid: false, message: 'Coupon usage limit has been reached' });
    }

    const subtotal = Number(cartSubtotalPaise || 0);
    if (subtotal < Number(coupon.min_cart_paise)) {
      const minRs = Math.round(Number(coupon.min_cart_paise) / 100);
      return NextResponse.json({
        valid: false,
        message: `Cart subtotal must be at least ₹${minRs} to apply this coupon`,
      });
    }

    // Calculate discount in paise
    let discountPaise = 0;
    if (coupon.discount_type === 'percent') {
      discountPaise = Math.round((subtotal * Number(coupon.discount_value)) / 100);
    } else {
      discountPaise = Number(coupon.discount_value);
    }

    discountPaise = Math.min(discountPaise, subtotal);

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value,
        discountPaise,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Coupon validation failed' }, { status: 500 });
  }
}
