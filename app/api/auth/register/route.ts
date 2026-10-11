import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';
import { signToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password, name, phone, role } = await req.json();
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const assignedRole = role === 'seller' ? 'seller' : 'customer';

    const [existing] = await sql`
      SELECT id FROM users WHERE LOWER(email) = LOWER(${email.trim()})
    `;
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await sql`
      INSERT INTO users (email, password_hash, role, name, phone)
      VALUES (${email.trim().toLowerCase()}, ${passwordHash}, ${assignedRole}, ${name.trim()}, ${phone || null})
      RETURNING id, email, role, name, phone
    `;

    if (assignedRole === 'seller') {
      await sql`
        INSERT INTO sellers (user_id, business_name, pan_number, gstin, kyc_status)
        VALUES (${user.id}, ${name.trim() + ' Enterprises'}, 'ABCDE1234F', '29ABCDE1234F1Z5', 'pending')
      `;
    }

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    });

    response.cookies.set('styleshopz_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 86400 * 7,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 });
  }
}
