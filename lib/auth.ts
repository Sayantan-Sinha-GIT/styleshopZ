import { cookies } from 'next/headers';
import crypto from 'crypto';
import { sql } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'REMOVED_LEGACY_SECRET';

export interface UserSession {
  id: string;
  email: string;
  role: 'customer' | 'seller' | 'admin';
  name: string;
  phone?: string;
  sellerId?: string;
}

// Simple base64url HMAC token without heavy external jwt dependencies
export function signToken(payload: Record<string, any>, expiresInSec = 86400 * 7): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSec;
  const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');
    if (expectedSig !== signature) return null;
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('styleshopz_session')?.value;
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded || !decoded.sub) return null;

  const [user] = await sql`
    SELECT u.id, u.email, u.role, u.name, u.phone, s.id as seller_id
    FROM users u
    LEFT JOIN sellers s ON s.user_id = u.id
    WHERE u.id = ${decoded.sub}
  `;

  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    phone: user.phone || undefined,
    sellerId: user.seller_id || undefined,
  };
}

export function setSessionCookie(token: string, responseHeaders?: Headers) {
  const cookieValue = `styleshopz_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${86400 * 7}${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
  if (responseHeaders) {
    responseHeaders.append('Set-Cookie', cookieValue);
  }
}
