import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Please sign in to place an order' }, { status: 401 });
    }

    const {
      items, // Array of { variantId, quantity }
      address, // { name, phone, line1, city, state, pincode }
      paymentMethod, // 'razorpay' | 'cod'
      couponCode,
    } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    if (!address || !address.name || !address.line1 || !address.pincode) {
      return NextResponse.json({ error: 'Complete delivery address is required' }, { status: 400 });
    }

    if (!['razorpay', 'cod'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    // SERVER RECALCULATES EVERY PRICE DIRECTLY FROM DATABASE
    let subtotalPaise = 0;
    const validatedItems = [];

    for (const item of items) {
      const qty = Math.max(1, Number(item.quantity || 1));
      const [variant] = await sql`
        SELECT 
          v.id,
          v.price_paise,
          v.stock,
          v.sku,
          v.options,
          p.id as product_id,
          p.title,
          p.seller_id,
          d.deal_price_paise
        FROM variants v
        JOIN products p ON p.id = v.product_id
        LEFT JOIN deals d ON d.variant_id = v.id AND d.ends_at > NOW() AND d.sold_count < d.quantity_cap
        WHERE v.id = ${item.variantId}::uuid
      `;

      if (!variant) {
        return NextResponse.json({ error: `Product variant not found: ${item.variantId}` }, { status: 404 });
      }

      if (variant.stock < qty) {
        return NextResponse.json(
          { error: `Insufficient stock for ${variant.title}. Only ${variant.stock} remaining.` },
          { status: 409 }
        );
      }

      const unitPricePaise = variant.deal_price_paise ? Number(variant.deal_price_paise) : Number(variant.price_paise);
      subtotalPaise += unitPricePaise * qty;

      validatedItems.push({
        variantId: variant.id,
        productId: variant.product_id,
        sellerId: variant.seller_id,
        title: variant.title,
        sku: variant.sku,
        options: variant.options,
        quantity: qty,
        unitPricePaise,
      });
    }

    // Delivery fee calculation
    const deliveryFeePaise = subtotalPaise >= 49900 ? 0 : 4000;

    // Coupon discount calculation
    let discountPaise = 0;
    if (couponCode) {
      const [coupon] = await sql`
        SELECT id, discount_type, discount_value, min_cart_paise, expires_at
        FROM coupons
        WHERE UPPER(code) = UPPER(${couponCode.trim()}) AND is_active = true
      `;
      if (coupon && new Date(coupon.expires_at) >= new Date() && subtotalPaise >= Number(coupon.min_cart_paise)) {
        if (coupon.discount_type === 'percent') {
          discountPaise = Math.round((subtotalPaise * Number(coupon.discount_value)) / 100);
        } else {
          discountPaise = Number(coupon.discount_value);
        }
        discountPaise = Math.min(discountPaise, subtotalPaise);
        await sql`UPDATE coupons SET times_used = times_used + 1 WHERE id = ${coupon.id}`;
      }
    }

    const totalPaise = Math.max(0, subtotalPaise + deliveryFeePaise - discountPaise);

    // Hard Rule: COD limit up to ₹50,000 (5,000,000 paise)
    if (paymentMethod === 'cod' && totalPaise > 5000000) {
      return NextResponse.json(
        { error: 'Cash on delivery is only available for orders up to ₹50,000' },
        { status: 400 }
      );
    }

    const razorpayOrderId =
      paymentMethod === 'razorpay'
        ? `order_test_${crypto.randomBytes(8).toString('hex')}`
        : null;

    // Insert Order
    const [order] = await sql`
      INSERT INTO orders (
        user_id,
        address_snapshot,
        status,
        total_paise,
        subtotal_paise,
        delivery_fee_paise,
        discount_paise,
        payment_method,
        razorpay_order_id
      )
      VALUES (
        ${user.id},
        ${JSON.stringify(address)}::jsonb,
        'placed',
        ${totalPaise},
        ${subtotalPaise},
        ${deliveryFeePaise},
        ${discountPaise},
        ${paymentMethod},
        ${razorpayOrderId}
      )
      RETURNING id, created_at, status, total_paise;
    `;

    // Insert Order Items and decrement stock
    for (const item of validatedItems) {
      const trackingId = `TRK-IN-${Math.floor(100000 + Math.random() * 900000)}`;
      const variantSnapshot = {
        title: item.title,
        sku: item.sku,
        options: item.options,
        price_paise: item.unitPricePaise,
      };

      await sql`
        INSERT INTO order_items (
          order_id,
          variant_id,
          variant_snapshot,
          quantity,
          seller_id,
          unit_price_paise,
          status,
          tracking_id
        )
        VALUES (
          ${order.id},
          ${item.variantId},
          ${JSON.stringify(variantSnapshot)}::jsonb,
          ${item.quantity},
          ${item.sellerId},
          ${item.unitPricePaise},
          'placed',
          ${trackingId}
        );
      `;

      // Decrement stock
      await sql`
        UPDATE variants
        SET stock = GREATEST(0, stock - ${item.quantity})
        WHERE id = ${item.variantId};
      `;
    }

    // Add initial tracking status event
    await sql`
      INSERT INTO order_status_events (order_id, status, actor, note)
      VALUES (
        ${order.id},
        'placed',
        'Customer Checkout',
        ${paymentMethod === 'cod' ? 'Order confirmed with Cash on Delivery' : 'Order placed in Razorpay test mode'}
      );
    `;

    // Clean up cart and stock holds
    await sql`DELETE FROM cart_items WHERE user_id = ${user.id}`;
    await sql`DELETE FROM stock_holds WHERE user_id = ${user.id}`;

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      totalPaise: order.total_paise,
      paymentMethod,
      razorpayOrderId,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_styleshopz_demo',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Order creation failed' }, { status: 500 });
  }
}
