import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { query, transaction } from "./db";
import { assert, text, address, uuid, integer, passwordText } from "./rules";
import { rate, requireUser, sessionToken, cookie } from "./session";
import { cartItems, photo, notify } from "./catalog";
import { demoEnabled } from "./commerce";
import { emailReady, sendCode } from './identity';

export async function authenticate(req: Request, b: any, signup: boolean, ownerOnly = false) {
  const email = text(b.email, "Email", 5, 254).toLowerCase();
  assert(
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    "Enter a valid email address.",
  );
  const password = passwordText(b.password);
  await rate(
    `login:${email}:${req.headers.get("cf-connecting-ip") || "local"}`,
    5,
    900,
  );
  if (ownerOnly)
    await rate(`owner-login-ip:${req.headers.get("cf-connecting-ip") || "local"}`, 12, 900);
  assert(
    !email.endsWith("@shop.test") || demoEnabled(),
    "Sample logins are disabled on this deployment.",
    403,
  );
  let user;
  if (signup) {
    await rate(
      `signup-ip:${req.headers.get("cf-connecting-ip") || "local"}`,
      30,
      3600,
    );
    const name = text(b.name, "Name", 2, 100);
    const hash = await bcrypt.hash(password, 10);
    user = await transaction(async (q) => {
      const [exists] = await q("SELECT id FROM users WHERE email=$1", [email]);
      assert(
        !exists,
        "An account already uses this email. Please sign in.",
        409,
      );
      const role = b.role === "seller" ? "seller" : "customer";
      const [u] = await q(
        "INSERT INTO users(email,password_hash,role,name) VALUES($1,$2,$3,$4) RETURNING id,name,email,role,session_version,email_verified_at",
        [email, hash, role, name],
      );
      if (role === "seller")
        await q(
          "INSERT INTO sellers(user_id,shop_name,status) VALUES($1,$2,'pending')",
          [u.id, text(b.shopName || name + " Shop", "Shop name", 2, 100)],
        );
      await q("INSERT INTO carts(user_id) VALUES($1)", [u.id]);
      await notify(
        q,
        u.id,
        "Welcome to styleshopZ",
        "This is a demonstration shop. No live payments or real deliveries.",
        "account",
      );
      return u;
    });
  } else {
    const [u] = await query(
      "SELECT * FROM users WHERE email=$1 AND deleted_at IS NULL",
      [email],
    );
    // Always run a bcrypt comparison to avoid account-existence timing differences.
    const ok = await bcrypt.compare(
      password,
      u?.password_hash ||
        "$2b$10$7VhLQenLMqGKfEBaEqC.p.BwQBZ2WauLEmyROFu9NJiU5UrF1LkxS",
    );
    assert(
      u && ok && (ownerOnly ? u.role === "admin" : u.role !== "admin"),
      "Email or password is incorrect.",
      401,
    );
    user = u;
  }
  let verificationSent=false;
  if(signup && emailReady()) { try { await sendCode(user,'verify'); verificationSent=true; } catch {} }
  return Response.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        email_verified_at: user.email_verified_at,
      },
      verificationSent,
    },
    {
      headers: {
        "Set-Cookie": cookie(sessionToken(user), false, user.role === "admin" ? 12 * 3600 : 7 * 86400),
        "Cache-Control": "no-store",
      },
    },
  );
}
export async function cartMutation(
  userId: string,
  method: string,
  b: any,
  params: URLSearchParams,
) {
  return transaction(async (q) => {
    await q("SELECT id FROM users WHERE id=$1 FOR UPDATE", [userId]);
    const [cart] = await q(
      "INSERT INTO carts(user_id) VALUES($1) ON CONFLICT(user_id) DO UPDATE SET user_id=EXCLUDED.user_id RETURNING id",
      [userId],
    );
    if (method === "DELETE") {
      const id = params.get("id"),
        variant = params.get("variant_id");
      if (id)
        await q("DELETE FROM cart_items WHERE cart_id=$1 AND id=$2", [
          cart.id,
          uuid(id),
        ]);
      else if (variant)
        await q("DELETE FROM cart_items WHERE cart_id=$1 AND variant_id=$2", [
          cart.id,
          uuid(variant),
        ]);
      else await q("DELETE FROM cart_items WHERE cart_id=$1", [cart.id]);
    } else {
      const entries = Array.isArray(b.items) ? b.items : [b];
      assert(
        entries.length > 0 && entries.length <= 50,
        "Cart has too many items.",
      );
      for (const item of entries) {
        assert(item && typeof item === "object" && !Array.isArray(item), "Choose valid cart items.");
        const variantId = uuid(item.variantId),
          qty = integer(item.quantity ?? 1, 1, 10);
        const [v] = await q(
          "SELECT v.stock,p.status,p.deleted_at,s.status seller_status FROM variants v JOIN products p ON p.id=v.product_id JOIN sellers s ON s.id=p.seller_id WHERE v.id=$1",
          [variantId],
        );
        assert(
          v && v.status === "live" && !v.deleted_at && v.seller_status === "approved" && v.stock > 0,
          "This item is unavailable.",
          409,
        );
        const [old] = await q(
          "SELECT quantity FROM cart_items WHERE cart_id=$1 AND variant_id=$2",
          [cart.id, variantId],
        );
        const next =
          method === "PATCH" ? qty : Math.min(10, (old?.quantity || 0) + qty);
        assert(
          next <= v.stock,
          "There is not enough stock for this quantity.",
          409,
        );
        await q(
          `INSERT INTO cart_items(cart_id,variant_id,quantity,saved_for_later) VALUES($1,$2,$3,$4) ON CONFLICT(cart_id,variant_id) DO UPDATE SET quantity=EXCLUDED.quantity,saved_for_later=EXCLUDED.saved_for_later`,
          [cart.id, variantId, next, !!item.savedForLater],
        );
      }
    }
    return cartItems(userId, q);
  });
}
export async function profile(method: string, b: any) {
  const u = await requireUser();
  if (method === "GET")
    return {
      user: u,
      addresses: await query(
        "SELECT * FROM addresses WHERE user_id=$1 ORDER BY is_default DESC,created_at",
        [u.id],
      ),
    };
  if (method === "PATCH") {
    const name = text(b.name || u.name, "Name", 2, 100),
      phone = b.phone ? text(b.phone, "Phone", 10, 16) : null;
    if (phone)
      assert(
        /^(?:\+91|91)?[6-9]\d{9}$/.test(phone),
        "Enter a valid Indian phone number.",
      );
    const inputPreferences = b.preferences ?? u.preferences ?? {};
    const preferences = {
      language: inputPreferences?.language === "hi" ? "hi" : "en",
      email: inputPreferences?.email !== false,
      orders: inputPreferences?.orders !== false,
      offers: !!inputPreferences?.offers,
    };
    await query(
      "UPDATE users SET name=$2,phone=$3,preferences=$4::jsonb,updated_at=NOW() WHERE id=$1",
      [u.id, name, phone, JSON.stringify(preferences)],
    );
    return { ok: true };
  }
  if (method === "DELETE") {
    assert(
      u.role === "customer",
      "Seller or admin deletion requires a support request.",
      409,
    );
    await transaction(async (q) => {
      await q(
        "UPDATE users SET name='Deleted customer',email=$2,phone=NULL,photo_url=NULL,deleted_at=NOW(),session_version=session_version+1 WHERE id=$1",
        [u.id, `deleted-${u.id}@invalid.test`],
      );
      await q("DELETE FROM addresses WHERE user_id=$1", [u.id]);
      await q("DELETE FROM auth_identities WHERE user_id=$1", [u.id]);
      await q("DELETE FROM email_codes WHERE user_id=$1", [u.id]);
      await q("DELETE FROM assistant_messages WHERE user_id=$1", [u.id]);
      await q("DELETE FROM carts WHERE user_id=$1", [u.id]);
      await q("DELETE FROM wishlists WHERE user_id=$1", [u.id]);
      await q(
        'UPDATE orders SET address_snapshot=\'{"name":"Deleted customer"}\'::jsonb WHERE user_id=$1',
        [u.id],
      );
    });
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": cookie("", true) } },
    );
  }
}
export async function addresses(
  method: string,
  b: any,
  params: URLSearchParams,
) {
  const u = await requireUser();
  return transaction(async (q) => {
    await q("SELECT id FROM users WHERE id=$1 FOR UPDATE", [u.id]);
    if (method === "DELETE") {
      await q("DELETE FROM addresses WHERE user_id=$1 AND id=$2", [
        u.id,
        uuid(params.get("id")),
      ]);
      return { ok: true };
    }
    const a = address(b),
      id = b.id ? uuid(b.id) : randomUUID();
    const rows = await q("SELECT id FROM addresses WHERE user_id=$1", [u.id]);
    assert(
      b.id ? rows.some((r) => r.id === id) : rows.length < 10,
      b.id ? "Address not found." : "You can save up to ten addresses.",
    );
    const isDefault = !!b.is_default || rows.length === 0;
    if (isDefault)
      await q("UPDATE addresses SET is_default=FALSE WHERE user_id=$1", [u.id]);
    await q(
      "INSERT INTO addresses(id,user_id,name,phone,line1,line2,city,state,pincode,is_default,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,phone=EXCLUDED.phone,line1=EXCLUDED.line1,line2=EXCLUDED.line2,city=EXCLUDED.city,state=EXCLUDED.state,pincode=EXCLUDED.pincode,is_default=EXCLUDED.is_default,latitude=EXCLUDED.latitude,longitude=EXCLUDED.longitude",
      [
        id,
        u.id,
        a.name,
        a.phone,
        a.line1,
        a.line2,
        a.city,
        a.state,
        a.pincode,
        isDefault,
        a.latitude ?? null,
        a.longitude ?? null,
      ],
    );
    return { ok: true, id };
  });
}
export async function wishlists(
  method: string,
  b: any,
  params: URLSearchParams,
) {
  const u = await requireUser();
  if (method === "GET") {
    const lists = await query(
      "SELECT * FROM wishlists WHERE user_id=$1 ORDER BY created_at",
      [u.id],
    );
    const items = await query(
      `SELECT wi.*,p.title,p.id product_id,c.name category_name,v.price_paise,v.stock,v.options,w.name list_name,(p.status='live' AND p.deleted_at IS NULL AND s.status='approved' AND v.stock>0) in_stock FROM wishlist_items wi JOIN wishlists w ON w.id=wi.wishlist_id JOIN variants v ON v.id=wi.variant_id JOIN products p ON p.id=v.product_id JOIN sellers s ON s.id=p.seller_id JOIN categories c ON c.id=p.category_id WHERE w.user_id=$1 ORDER BY wi.created_at DESC`,
      [u.id],
    );
    return { lists, items: items.map(photo) };
  }
  if (method === "DELETE") {
    if (params.get("list"))
      await query("DELETE FROM wishlists WHERE id=$1 AND user_id=$2", [
        uuid(params.get("list")),
        u.id,
      ]);
    else
      await query(
        "DELETE FROM wishlist_items WHERE id=$1 AND wishlist_id IN(SELECT id FROM wishlists WHERE user_id=$2)",
        [uuid(params.get("id")), u.id],
      );
    return { ok: true };
  }
  return transaction(async (q) => {
    await q("SELECT id FROM users WHERE id=$1 FOR UPDATE", [u.id]);
    let list;
    if (b.listId)
      [list] = await q("SELECT id FROM wishlists WHERE id=$1 AND user_id=$2", [
        uuid(b.listId),
        u.id,
      ]);
    else if (!b.name)
      [list] = await q(
        "SELECT id FROM wishlists WHERE user_id=$1 ORDER BY created_at LIMIT 1",
        [u.id],
      );
    if (!list && !b.listId) {
      const [n] = await q(
        "SELECT COUNT(*)::int n FROM wishlists WHERE user_id=$1",
        [u.id],
      );
      assert(n.n < 20, "You can create up to twenty lists.");
      [list] = await q(
        "INSERT INTO wishlists(user_id,name) VALUES($1,$2) RETURNING id",
        [u.id, text(b.name || "Saved for later", "List name", 1, 80)],
      );
    }
    assert(list, "Wishlist not found.", 404);
    if (b.variantId)
      await q(
        "INSERT INTO wishlist_items(wishlist_id,variant_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        [list.id, uuid(b.variantId)],
      );
    return { ok: true, listId: list.id };
  });
}
export async function support(method: string, b: any, params: URLSearchParams) {
  const u = await requireUser(),
    id = params.get("id") || b.ticketId;
  if (method === "GET") {
    if (id) {
      const [ticket] = await query(
        "SELECT * FROM support_tickets WHERE id=$1 AND ($2='admin' OR user_id=$3)",
        [uuid(id), u.role, u.id],
      );
      assert(ticket, "Ticket not found.", 404);
      return {
        ticket,
        messages: await query(
          "SELECT m.*,u.name sender_name FROM support_messages m JOIN users u ON u.id=m.sender_id WHERE ticket_id=$1 ORDER BY m.created_at",
          [id],
        ),
      };
    }
    return {
      tickets: await query(
        "SELECT t.*,u.name customer_name FROM support_tickets t JOIN users u ON u.id=t.user_id WHERE $1='admin' OR t.user_id=$2 ORDER BY t.updated_at DESC LIMIT 100",
        [u.role, u.id],
      ),
    };
  }
  return transaction(async (q) => {
    let ticket;
    if (id)
      [ticket] = await q(
        "SELECT * FROM support_tickets WHERE id=$1 AND ($2='admin' OR user_id=$3) FOR UPDATE",
        [uuid(id), u.role, u.id],
      );
    else {
      await rate("ticket:" + u.id, 10, 3600, q);
      [ticket] = await q(
        "INSERT INTO support_tickets(user_id,subject) VALUES($1,$2) RETURNING *",
        [u.id, text(b.subject, "Subject", 4, 150)],
      );
    }
    assert(ticket, "Ticket not found.", 404);
    if (method === "PATCH") {
      assert(
        ["open", "resolved", "closed"].includes(b.status),
        "Invalid ticket status.",
      );
      await q(
        "UPDATE support_tickets SET status=$2,updated_at=NOW() WHERE id=$1",
        [ticket.id, b.status],
      );
    } else {
      const message = text(b.message, "Message", 2, 2000);
      await q(
        "INSERT INTO support_messages(ticket_id,sender_id,sender_role,message) VALUES($1,$2,$3,$4)",
        [ticket.id, u.id, u.role, message],
      );
      await q(
        "UPDATE support_tickets SET updated_at=NOW(),status=CASE WHEN $2='admin' THEN 'in_progress' ELSE 'open' END WHERE id=$1",
        [ticket.id, u.role],
      );
      if (u.role === "admin")
        await notify(
          q,
          ticket.user_id,
          "Support replied",
          ticket.subject,
          "support",
        );
    }
    return { ok: true, ticketId: ticket.id };
  });
}
