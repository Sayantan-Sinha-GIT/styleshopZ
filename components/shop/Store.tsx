"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Heart,
  ArrowRight,
  WarningCircle,
  ArrowClockwise,
} from "@phosphor-icons/react";

export type Item = Record<string, any>;
export async function api(path: string, method = "GET", body?: any) {
  const r = await fetch("/api/" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(data.error || "Something went wrong. Please retry.");
  return data;
}
const Context = createContext<any>(null);
const guestKey = "styleshopz.guest.v2";
function guestItems() {
  try {
    return JSON.parse(localStorage.getItem(guestKey) || "[]");
  } catch {
    return [];
  }
}
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Item | null>(null),
    [ready, setReady] = useState(false),
    [cart, setCart] = useState<Item>({ items: [], subtotalPaise: 0 }),
    [config, setConfig] = useState<Item>({}),
    [notice, setNotice] = useState(""),
    [offline, setOffline] = useState(false),
    [language, setLanguage] = useState("en");
  const refreshCart = useCallback(
    async (signed?: boolean) => {
      const isSigned = signed ?? !!user;
      const entries = guestItems();
      const data = isSigned
        ? await api("cart")
        : entries.length
          ? await api("cart/preview", "POST", { items: entries })
          : { items: [], subtotalPaise: 0 };
      setCart(data);
      return data;
    },
    [user],
  );
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [session, cfg] = await Promise.all([
          api("auth/me"),
          api("config"),
        ]);
        if (!active) return;
        setUser(session.user);
        setConfig(cfg);
        const entries = guestItems();
        if (session.user && entries.length) {
          try {
            await api("cart", "POST", { items: entries });
            localStorage.removeItem(guestKey);
          } catch {
            setNotice(
              "Some guest items could not be merged. Your guest cart is still saved.",
            );
          }
        }
        const data = session.user
          ? await api("cart")
          : entries.length
            ? await api("cart/preview", "POST", { items: entries })
            : { items: [], subtotalPaise: 0 };
        if (active) setCart(data);
      } catch (e: any) {
        if (active) setNotice(e.message);
      } finally {
        if (active) setReady(true);
      }
    })();
    setLanguage(localStorage.getItem("styleshopz.language") || "en");
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      active = false;
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  const add = async (variantId: string, quantity = 1) => {
    if (user) await api("cart", "POST", { variantId, quantity });
    else {
      const entries = guestItems(),
        old = entries.find((i: any) => i.variantId === variantId);
      if (old) old.quantity = Math.min(10, old.quantity + quantity);
      else entries.push({ variantId, quantity });
      const preview = await api("cart/preview", "POST", { items: entries });
      if (preview.items.some((i: any) => !i.in_stock))
        throw new Error("There is not enough stock for that quantity.");
      localStorage.setItem(guestKey, JSON.stringify(entries));
    }
    await refreshCart();
    setNotice("Added to your bag.");
  };
  const changeCart = async (
    item: Item,
    quantity: number,
    savedForLater = false,
  ) => {
    if (user) {
      if (quantity === 0) await api("cart?id=" + item.cart_item_id, "DELETE");
      else
        await api("cart", "PATCH", {
          variantId: item.variant_id,
          quantity,
          savedForLater,
        });
    } else {
      const entries = guestItems().filter(
        (i: any) => i.variantId !== item.variant_id,
      );
      if (quantity > 0) entries.push({ variantId: item.variant_id, quantity });
      localStorage.setItem(guestKey, JSON.stringify(entries));
    }
    await refreshCart();
  };
  const save = async (variantId: string) => {
    if (!user) {
      setNotice("Sign in to save products across devices.");
      return;
    }
    await api("wishlists", "POST", { variantId });
    setNotice("Saved to your wishlist.");
  };
  const logout = async () => {
    await api("auth/logout", "POST", {});
    setUser(null);
    setCart({ items: [], subtotalPaise: 0 });
    location.assign("/");
  };
  const switchLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem("styleshopz.language", lang);
    document.documentElement.lang = lang;
  };
  return (
    <Context.Provider
      value={{
        user,
        setUser,
        ready,
        cart,
        config,
        refreshCart,
        add,
        changeCart,
        save,
        logout,
        notice,
        setNotice,
        offline,
        language,
        switchLanguage,
      }}
    >
      {children}
      {offline && (
        <div className="offline" role="status">
          You’re offline. Reconnect to load the shop and make changes.
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
export function useData(path: string | null) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(!!path),
    [nonce, setNonce] = useState(0);
  const refresh = useCallback(() => setNonce((n) => n + 1), []);
  useEffect(() => {
    if (!path) return;
    let active = true;
    setLoading(true);
    setError("");
    api(path)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, nonce]);
  return { data, error, loading, refresh, setData };
}
export const money = (n: any) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0) / 100);
export const date = (n: any) =>
  new Date(n).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const statusName = (s: string) => s?.replaceAll("_", " ");
export function State({
  loading,
  error,
  retry,
  children,
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
  children?: React.ReactNode;
}) {
  if (loading)
    return (
      <div className="skeleton-grid" aria-label="Loading shop" aria-busy="true">
        {[0, 1, 2, 3].map((n) => (
          <div className="skeleton" key={n} />
        ))}
      </div>
    );
  if (error)
    return (
      <div className="empty" role="alert">
        <WarningCircle size={38} />
        <h2>Let’s try that again</h2>
        <p>{error}</p>
        {retry && (
          <button className="button secondary" onClick={retry}>
            <ArrowClockwise size={18} />
            Retry
          </button>
        )}
      </div>
    );
  return <>{children}</>;
}
export function Empty({
  title,
  children,
  link = "/search",
  label = "Explore the shop",
}: {
  title: string;
  children?: React.ReactNode;
  link?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <ShoppingBag size={44} weight="light" />
      <h2>{title}</h2>
      <p>{children}</p>
      <Link className="button" href={link}>
        {label}
        <ArrowRight size={18} />
      </Link>
    </div>
  );
}
export function AuthGate({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: string;
}) {
  const { user, ready } = useStore();
  if (!ready) return <State loading />;
  if (!user)
    return (
      <Empty
        title="Make yourself at home"
        link={
          "/login?next=" +
          encodeURIComponent(
            typeof window !== "undefined" ? location.pathname : "/",
          )
        }
        label="Sign in"
      >
        Sign in to keep your bag, orders and saved finds together.
      </Empty>
    );
  if (role && user.role !== role)
    return (
      <Empty
        title="This area belongs to a different role"
        link="/customer"
        label="Your account"
      >
        You’re signed in as a {user.role}.
      </Empty>
    );
  return <>{children}</>;
}
export function ProductCard({ product: p }: { product: Item }) {
  const { add, save, setNotice } = useStore(),
    [busy, setBusy] = useState(false);
  const price = Number(p.deal_price_paise ?? p.price_paise),
    off = Math.round((1 - price / Number(p.mrp_paise)) * 100);
  return (
    <article className="product-card">
      <Link href={"/products/" + p.id} className="product-image">
        <img src={p.image_url} alt={p.title} loading="lazy" />
        {off > 0 && <span className="discount">−{off}%</span>}
      </Link>
      <button
        className="save-button"
        aria-label={"Save " + p.title}
        onClick={() =>
          save(p.default_variant_id).catch((e: any) => setNotice(e.message))
        }
      >
        <Heart size={21} />
      </button>
      <div className="product-body">
        <span className="muted small">{p.brand}</span>
        <Link href={"/products/" + p.id}>
          <h3>{p.title}</h3>
        </Link>
        <div className="rating">
          {p.review_count > 0 ? (
            <>
              <span aria-label={`${p.rating} out of 5 stars`}>
                ★ {p.rating}
              </span>
              <span className="muted">({p.review_count})</span>
            </>
          ) : (
            <span className="muted small">New in the shop</span>
          )}
        </div>
        <div className="product-bottom">
          <div>
            <strong>{money(price)}</strong>
            {off > 0 && <del>{money(p.mrp_paise)}</del>}
          </div>
          <button
            className="add-button"
            aria-label={"Add " + p.title + " to bag"}
            disabled={busy || Number(p.stock) < 1}
            onClick={async () => {
              setBusy(true);
              try {
                await add(p.default_variant_id);
              } catch (e: any) {
                setNotice(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {Number(p.stock) < 1 ? (
              "Sold out"
            ) : busy ? (
              "Adding…"
            ) : (
              <ShoppingBag size={20} />
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input aria-label={label} {...props} />
    </label>
  );
}
export function SelectField({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select aria-label={label} {...props}>{children}</select>
    </label>
  );
}
export function ErrorText({ error }: { error?: string }) {
  return error ? (
    <p className="form-error" role="alert">
      {error}
    </p>
  ) : null;
}
