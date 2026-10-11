import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { query, type Query } from "./db";
import { assert, ApiError } from "./rules";

const devSecret = randomBytes(32).toString("hex");
function secret() {
  const value = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (
    value &&
    value.length >= 32 &&
    !/change|placeholder|super_secret|replace-with/i.test(value)
  )
    return value;
  if (process.env.NODE_ENV === "production")
    throw new Error("AUTH_NOT_CONFIGURED");
  return devSecret;
}
export function signToken(payload: Record<string, any>, lifetime = 7 * 86400) {
  const h = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  );
  const b = Buffer.from(
    JSON.stringify({
      ...payload,
      exp: Math.floor(Date.now() / 1000) + lifetime,
    }),
  ).toString("base64url");
  return `${h}.${b}.${createHmac("sha256", secret()).update(`${h}.${b}`).digest("base64url")}`;
}
export function verifyToken(token: string) {
  try {
    const [h, b, s, ...rest] = token.split(".");
    if (rest.length || !h || !b || !s) return null;
    const a = Buffer.from(s, "base64url");
    const e = createHmac("sha256", secret()).update(`${h}.${b}`).digest();
    if (a.length !== e.length || !timingSafeEqual(a, e)) return null;
    const header = JSON.parse(Buffer.from(h, "base64url").toString());
    const body = JSON.parse(Buffer.from(b, "base64url").toString());
    if (
      header.alg !== "HS256" ||
      !Number.isFinite(body.exp) ||
      body.exp <= Date.now() / 1000
    )
      return null;
    return body;
  } catch {
    return null;
  }
}
export async function currentUser() {
  const token = (await cookies()).get("styleshopz_session")?.value;
  const data = token && verifyToken(token);
  if (!data?.sub || data.kind) return null;
  const [u] = await query(
    `SELECT u.id,u.email,u.name,u.phone,u.photo_url,u.role,u.session_version,u.preferences,u.email_verified_at,s.id seller_id,s.status seller_status,s.shop_name FROM users u LEFT JOIN sellers s ON s.user_id=u.id WHERE u.id=$1 AND u.deleted_at IS NULL`,
    [data.sub],
  );
  return u && (data.version ?? 0) === u.session_version ? u : null;
}
export async function requireUser(role?: string) {
  const u = await currentUser();
  assert(u, "Please sign in to continue.", 401);
  assert(!role || u.role === role, "You do not have access to this area.", 403);
  return u;
}
export function cookie(token: string, clear = false) {
  return `styleshopz_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : 7 * 86400}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
export function sessionToken(user: any) {
  return signToken({ sub: user.id, version: user.session_version ?? 0 });
}
export async function rate(
  key: string,
  limit: number,
  seconds: number,
  q: Query = query,
) {
  const hashed = createHmac("sha256", secret()).update(key).digest("hex");
  const [r] = await q(
    `INSERT INTO rate_limits(key,hits,expires_at) VALUES($1,1,NOW()+$2*INTERVAL '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.expires_at<NOW() THEN 1 ELSE rate_limits.hits+1 END,expires_at=CASE WHEN rate_limits.expires_at<NOW() THEN NOW()+$2*INTERVAL '1 second' ELSE rate_limits.expires_at END RETURNING hits`,
    [hashed, seconds],
  );
  if (r.hits > limit)
    throw new ApiError(
      429,
      "Too many attempts. Please try again in 15 minutes.",
    );
}
