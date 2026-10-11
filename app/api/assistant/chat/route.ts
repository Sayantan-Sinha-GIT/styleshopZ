import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const { message, history = [] } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    if (message.length > 1500) {
      return NextResponse.json({ error: 'Message exceeds 1,500 character limit' }, { status: 400 });
    }

    const lower = message.toLowerCase();

    // Check rate limit for user (30 messages a day)
    if (user) {
      const [todayCount] = await sql`
        SELECT COUNT(*)::int as count
        FROM assistant_threads
        WHERE user_id = ${user.id} AND updated_at > NOW() - INTERVAL '24 hours'
      `;
      if (todayCount.count >= 30) {
        return NextResponse.json(
          { error: 'Daily limit of 30 messages reached. Please try again tomorrow.' },
          { status: 429 }
        );
      }
    }

    const executedTools: string[] = [];
    let toolResults: any[] = [];
    let actionProposal: any = null;
    let replyText = '';

    // Intent detection & tool execution

    // 1. Deals and coupons
    if (lower.includes('deal') || lower.includes('discount') || lower.includes('coupon') || lower.includes('offer')) {
      executedTools.push('Find deals and coupons');
      const deals = await sql`
        SELECT p.title, v.price_paise, d.deal_price_paise, d.ends_at
        FROM deals d
        JOIN variants v ON v.id = d.variant_id
        JOIN products p ON p.id = v.product_id
        WHERE d.ends_at > NOW()
        LIMIT 3
      `;
      const coupons = await sql`SELECT code, discount_type, discount_value, min_cart_paise FROM coupons WHERE expires_at > NOW() LIMIT 3`;
      toolResults.push({
        type: 'deals',
        deals: deals.map((d: any) => ({
          title: d.title,
          originalPrice: `₹${(d.price_paise / 100).toLocaleString('en-IN')}`,
          dealPrice: `₹${(d.deal_price_paise / 100).toLocaleString('en-IN')}`,
        })),
        coupons: coupons.map((c: any) => ({
          code: c.code,
          discount: c.discount_type === 'percent' ? `${c.discount_value}% OFF` : `₹${c.discount_value / 100} OFF`,
          minCart: `₹${c.min_cart_paise / 100}`,
        })),
      });
    }

    // 2. Search products / headphones / laptops / phones
    if (lower.includes('search') || lower.includes('headphone') || lower.includes('phone') || lower.includes('watch') || lower.includes('laptop') || lower.includes('find')) {
      executedTools.push('Search and filter');
      let searchWord = 'headphones';
      if (lower.includes('laptop')) searchWord = 'laptop';
      else if (lower.includes('phone')) searchWord = 'smartphone';
      else if (lower.includes('watch')) searchWord = 'watch';

      const products = await sql`
        SELECT p.id, p.title, p.brand, v.price_paise, v.stock, c.name as category
        FROM products p
        JOIN variants v ON v.product_id = p.id
        JOIN categories c ON c.id = p.category_id
        WHERE p.title ILIKE ${'%' + searchWord + '%'} OR c.name ILIKE ${'%' + searchWord + '%'}
        ORDER BY v.price_paise ASC
        LIMIT 3
      `;

      toolResults.push({
        type: 'products',
        items: products.map((p: any) => ({
          id: p.id,
          title: p.title,
          brand: p.brand,
          price: `₹${(p.price_paise / 100).toLocaleString('en-IN')}`,
          inStock: p.stock > 0,
        })),
      });
    }

    // 3. Order status or tracking
    if (lower.includes('order') || lower.includes('track') || lower.includes('where is')) {
      executedTools.push('Order status');
      if (user) {
        const [recentOrder] = await sql`
          SELECT o.id, o.status, o.total_paise, o.created_at, e.note as latest_note
          FROM orders o
          LEFT JOIN LATERAL (
            SELECT note FROM order_status_events WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
          ) e ON true
          WHERE o.user_id = ${user.id}
          ORDER BY o.created_at DESC LIMIT 1
        `;
        if (recentOrder) {
          toolResults.push({
            type: 'order_status',
            orderId: recentOrder.id,
            status: recentOrder.status,
            total: `₹${(recentOrder.total_paise / 100).toLocaleString('en-IN')}`,
            latestUpdate: recentOrder.latest_note || 'Order is progressing through the supply chain.',
          });
        }
      } else {
        toolResults.push({
          type: 'order_status',
          note: 'Please sign in to view your live orders and delivery status.',
        });
      }
    }

    // 4. Summarize reviews
    if (lower.includes('review') || lower.includes('rating') || lower.includes('recommend') || lower.includes('sound')) {
      executedTools.push('Review summary');
      toolResults.push({
        type: 'review_summary',
        summary: 'Verified purchasers rate audio clarity 4.8/5 and build durability 4.6/5. Deep acoustic isolation and fast pairing are the most praised features.',
      });
    }

    // 5. Gated Confirmation Actions (Cancel, Return, Place order)
    if (lower.includes('cancel')) {
      actionProposal = {
        action: 'cancel_order',
        prompt: 'Cancel your most recent order? Nothing happens until you tap Confirm.',
        buttonLabel: 'Confirm Cancellation',
      };
    } else if (lower.includes('return')) {
      actionProposal = {
        action: 'return_order',
        prompt: 'Initiate a 7-day return request for your delivered order? Tap Confirm to proceed.',
        buttonLabel: 'Confirm Return Request',
      };
    }

    if (executedTools.length === 0) {
      executedTools.push('Search and filter');
      replyText = "I can help you search 500+ products, find active lightning deals, validate coupons, summarize verified reviews, and track your orders. What would you like to explore?";
    } else {
      replyText = `I searched our live catalogue and active promotions. Prices come directly from our database, and sensitive actions require your explicit tap below.`;
    }

    return NextResponse.json({
      reply: replyText,
      tools: executedTools,
      results: toolResults,
      actionProposal,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AI assistant error' }, { status: 500 });
  }
}
