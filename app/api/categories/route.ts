import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function GET() {
  try {
    const categories = await sql`
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.level,
        c.parent_id,
        c.attribute_definitions,
        COUNT(p.id)::int as product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.status = 'live'
      GROUP BY c.id
      ORDER BY c.level ASC, c.name ASC;
    `;

    // Group into 3-tier hierarchy
    const l1 = categories.filter((c) => c.level === 1);
    const l2 = categories.filter((c) => c.level === 2);
    const l3 = categories.filter((c) => c.level === 3);

    const tree = l1.map((top) => {
      const subs = l2
        .filter((sub) => sub.parent_id === top.id)
        .map((sub) => {
          const leaves = l3.filter((leaf) => leaf.parent_id === sub.id);
          return {
            ...sub,
            leaves,
          };
        });
      return {
        ...top,
        subcategories: subs,
      };
    });

    return NextResponse.json({ tree, flat: categories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch categories' }, { status: 500 });
  }
}
