import fs from 'fs';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

async function fastSeed() {
  if (!process.env.DATABASE_URL && fs.existsSync('.env.local')) {
    const lines = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/);
    for (const line of lines) {
      if (line.startsWith('DATABASE_URL=')) {
        process.env.DATABASE_URL = line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
      }
    }
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('ERROR: DATABASE_URL not found');
    process.exit(1);
  }

  console.log('Connecting to Neon database for fast seeding...');
  const sql = postgres(url, { prepare: false, ssl: 'require' });

  // Get seller and customer IDs
  const [seller] = await sql`SELECT id FROM sellers LIMIT 1`;
  const [customer] = await sql`SELECT id FROM users WHERE role = 'customer' LIMIT 1`;
  const [admin] = await sql`SELECT id FROM users WHERE role = 'admin' LIMIT 1`;
  const [sellerUser] = await sql`SELECT id FROM users WHERE role = 'seller' LIMIT 1`;

  // Get leaf categories
  const leafCats = await sql`SELECT id FROM categories WHERE level = 3`;
  const leafIds = leafCats.map((c) => c.id);

  const [existingCount] = await sql`SELECT count(*)::int as count FROM products`;
  console.log(`Current product count: ${existingCount.count}`);

  const brands = ['Sony', 'Bose', 'Apple', 'Samsung', 'OnePlus', 'Boat', 'Nothing', 'Logitech', 'Asus', 'Nike', 'Zara', 'Puma', 'Titan', 'Philips', 'Prestige', 'Minimalist', 'Decathlon'];
  const adj = ['Pro', 'Ultra', 'Elite', 'Studio', 'Pulse', 'Aero', 'Max', 'Prime', 'Neo', 'Flow', 'Horizon', 'Vanguard', 'Apex', 'Titan', 'Zenith', 'Spectra', 'Quantum'];
  const colors = ['Midnight Black', 'Space Gray', 'Luminous Gold', 'Arctic Silver', 'Navy Blue', 'Forest Green', 'Sunset Amber', 'Pure White'];

  if (existingCount.count < 520) {
    const needed = 525 - existingCount.count;
    console.log(`Bulk inserting ${needed} products in batches of 100...`);

    for (let batchStart = 0; batchStart < needed; batchStart += 100) {
      const batchSize = Math.min(100, needed - batchStart);
      const prodRows: any[] = [];

      for (let i = 0; i < batchSize; i++) {
        const idx = existingCount.count + batchStart + i;
        const brand = brands[idx % brands.length];
        const modifier = adj[idx % adj.length];
        const catId = leafIds[idx % leafIds.length];
        const title = `${brand} ${modifier} Series ${100 + (idx % 900)} Premium Edition`;
        const description = `Engineered for high performance, precision craft, and durability. Includes 1-year official brand warranty, fast pan-India delivery, and 7-day hassle-free returns.`;

        prodRows.push({
          seller_id: seller.id,
          category_id: catId,
          title,
          brand,
          description,
          status: 'live',
        });
      }

      const insertedProds = await sql`
        INSERT INTO products ${sql(prodRows, 'seller_id', 'category_id', 'title', 'brand', 'description', 'status')}
        RETURNING id, brand
      `;

      // Now create 2 variants for each inserted product
      const variantRows: any[] = [];
      for (let p = 0; p < insertedProds.length; p++) {
        const prod = insertedProds[p];
        const idx = existingCount.count + batchStart + p;
        const basePrice = (999 + ((idx * 137) % 45000)) * 100;
        const mrpPrice = Math.round(basePrice * (1.15 + (idx % 5) * 0.08));

        for (let v = 0; v < 2; v++) {
          const color = colors[(idx + v) % colors.length];
          const modifier = adj[idx % adj.length];
          const sku = `SKU-${prod.brand.slice(0, 3).toUpperCase()}-${idx}-${v}-${Date.now().toString().slice(-4)}`;
          const stock = 10 + ((idx * 7 + v) % 85);

          variantRows.push({
            product_id: prod.id,
            options: JSON.stringify({ color, model: modifier }),
            sku,
            price_paise: basePrice,
            mrp_paise: mrpPrice,
            stock,
          });
        }
      }

      await sql`
        INSERT INTO variants ${sql(variantRows, 'product_id', 'options', 'sku', 'price_paise', 'mrp_paise', 'stock')}
      `;

      console.log(`Inserted batch of ${batchSize} products and ${variantRows.length} variants.`);
    }
  }

  const [finalProdCount] = await sql`SELECT count(*)::int as count FROM products`;
  const [finalVarCount] = await sql`SELECT count(*)::int as count FROM variants`;
  console.log(`Total Products: ${finalProdCount.count}, Total Variants: ${finalVarCount.count}`);

  // Seed Deals of the Day
  console.log('Seeding Deals of the Day...');
  const dealVariants = await sql`SELECT id, price_paise FROM variants LIMIT 12`;
  for (const v of dealVariants) {
    const dealPrice = Math.round(v.price_paise * 0.7); // 30% off
    await sql`
      INSERT INTO deals (variant_id, deal_price_paise, quantity_cap, sold_count, ends_at)
      VALUES (${v.id}, ${dealPrice}, 50, 18, NOW() + INTERVAL '12 hours')
      ON CONFLICT DO NOTHING;
    `;
  }

  // Seed Coupons
  console.log('Seeding coupons...');
  await sql`
    INSERT INTO coupons (code, discount_type, discount_value, min_cart_paise, usage_limit, per_user_limit, expires_at)
    VALUES 
      ('WELCOME10', 'percent', 10, 50000, 1000, 1, NOW() + INTERVAL '30 days'),
      ('SAVE500', 'flat', 50000, 200000, 500, 1, NOW() + INTERVAL '30 days'),
      ('SUPERDEAL', 'percent', 15, 100000, 200, 1, NOW() + INTERVAL '14 days')
    ON CONFLICT (code) DO NOTHING;
  `;

  // Seed Banners
  console.log('Seeding promotional banners...');
  await sql`
    INSERT INTO banners (image_url, link_url, title, sort_order, is_active)
    VALUES 
      ('/photos/banner1.webp', '/deals', 'Festival of Sound · Up to 40% Off Audio', 1, TRUE),
      ('/photos/banner2.webp', '/categories', 'Latest Workstations & Ultrabooks', 2, TRUE),
      ('/photos/banner3.webp', '/deals', 'Lightning Deals of the Day', 3, TRUE)
    ON CONFLICT DO NOTHING;
  `;

  // Ensure constraint supports out_for_delivery
  try {
    await sql`ALTER TABLE order_items DROP CONSTRAINT IF EXISTS order_items_status_check`;
    await sql`ALTER TABLE order_items ADD CONSTRAINT order_items_status_check CHECK (status IN ('placed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned'))`;
  } catch (e) {
    // Ignore if already altered
  }

  // Seed sample orders across all lifecycle states for user@shop.test
  console.log('Seeding sample orders across all 5 lifecycle states for user@shop.test...');
  const orderStates = ['placed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
  const [sampleVariant] = await sql`SELECT id, price_paise, product_id FROM variants LIMIT 1`;
  const [sampleProduct] = await sql`SELECT title FROM products WHERE id = ${sampleVariant.product_id}`;

  const addressSnapshot = {
    name: 'Priya Sharma',
    phone: '+919876543212',
    line1: 'Flat 402, Lotus Residency, 7th Cross',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
  };

  const variantSnapshot = {
    title: sampleProduct.title,
    sku: 'SKU-SAMPLE-01',
    price_paise: sampleVariant.price_paise,
    options: { color: 'Midnight Black' },
  };

  for (let s = 0; s < orderStates.length; s++) {
    const status = orderStates[s];
    const [ord] = await sql`
      INSERT INTO orders (user_id, address_snapshot, status, total_paise, subtotal_paise, delivery_fee_paise, discount_paise, payment_method, razorpay_payment_id)
      VALUES (${customer.id}, ${JSON.stringify(addressSnapshot)}::jsonb, ${status}, ${sampleVariant.price_paise}, ${sampleVariant.price_paise}, 0, 0, 'razorpay', 'pay_sample_test_mode')
      RETURNING id;
    `;

    await sql`
      INSERT INTO order_items (order_id, variant_id, variant_snapshot, quantity, seller_id, unit_price_paise, status, tracking_id)
      VALUES (${ord.id}, ${sampleVariant.id}, ${JSON.stringify(variantSnapshot)}::jsonb, 1, ${seller.id}, ${sampleVariant.price_paise}, ${status}, 'TRK-IN-982341')
    `;

    await sql`
      INSERT INTO order_status_events (order_id, status, actor, note)
      VALUES (${ord.id}, ${status}, 'System Automation', 'Automated logistics checkpoint verification')
    `;
  }

  // Seed reviews and Q&As
  console.log('Seeding reviews and Q&As...');
  await sql`
    INSERT INTO reviews (user_id, product_id, rating, text, is_verified, status)
    VALUES 
      (${customer.id}, ${sampleVariant.product_id}, 5, 'Exceptional audio clarity and deep bass response. Build quality is distinctly premium.', TRUE, 'approved')
    ON CONFLICT (user_id, product_id) DO NOTHING;
  `;

  const [existingQa] = await sql`SELECT count(*)::int as count FROM product_qa WHERE product_id = ${sampleVariant.product_id}`;
  if (existingQa.count === 0) {
    await sql`
      INSERT INTO product_qa (product_id, user_id, question, answer, answered_by)
      VALUES 
        (${sampleVariant.product_id}, ${customer.id}, 'Does this support dual-device Bluetooth multipoint pairing?', 'Yes, it supports seamless dual-device switching between laptop and phone.', ${sellerUser.id});
    `;
  }

  // Seed support ticket
  console.log('Seeding support ticket...');
  const [ticket] = await sql`
    INSERT INTO support_tickets (user_id, subject, status)
    VALUES (${customer.id}, 'Invoice clarification for recent order', 'open')
    RETURNING id;
  `;

  await sql`
    INSERT INTO support_messages (ticket_id, sender_id, sender_role, message)
    VALUES 
      (${ticket.id}, ${customer.id}, 'customer', 'Hello, could you please provide a GST invoice breakdown for my recent audio equipment purchase?'),
      (${ticket.id}, ${admin.id}, 'admin', 'Certainly! The invoice PDF can be generated directly from your order detail page with simulated GST line items.')
  `;

  console.log('Fast seeding finished successfully!');
  await sql.end();
}

fastSeed().catch((err) => {
  console.error('Fast seed error:', err);
  process.exit(1);
});
