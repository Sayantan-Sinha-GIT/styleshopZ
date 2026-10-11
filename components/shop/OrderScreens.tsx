"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Clock,
  Package,
  DownloadSimple,
  ArrowRight,
  Truck,
  MapPin,
} from "@phosphor-icons/react";
import {
  useStore,
  useData,
  api,
  AuthGate,
  Empty,
  State,
  Field,
  SelectField,
  ErrorText,
  money,
  date,
  statusName,
  type Item,
} from "./Store";
import { AddressFields } from "./AccountScreens";
import { getProductImage } from "@/lib/images";

export function CartScreen() {
  const { cart, ready, changeCart, user, refreshCart, setNotice } = useStore(),
    [busy, setBusy] = useState(false),
    [code, setCode] = useState(""),
    [coupon, setCoupon] = useState<any>(null),
    [error, setError] = useState("");
  const items = cart.items.filter((i: Item) => !i.saved_for_later),
    saved = cart.items.filter((i: Item) => i.saved_for_later),
    subtotal = cart.subtotalPaise,
    delivery = subtotal >= 49900 ? 0 : 4000,
    total = subtotal + delivery - (coupon?.discountPaise || 0);
  const change = async (item: Item, quantity: number, saved = false) => {
    setBusy(true);
    setError("");
    setCoupon(null);
    try {
      await changeCart(item, quantity, saved);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const row = (i: Item, save = false) => (
    <div className="cart-item" key={i.cart_item_id}>
      <Link href={"/products/" + i.product_id}>
        <img src={i.image_url} alt={i.title} />
      </Link>
      <div>
        <Link href={"/products/" + i.product_id}>
          <h3>{i.title}</h3>
        </Link>
        <span className="small muted">
          {Object.values(i.options || {}).join(" · ")}
        </span>
        <p className={i.in_stock ? "success" : "form-error"}>
          {i.in_stock
            ? "In stock"
            : "Stock changed. Reduce quantity or remove this item."}
        </p>
        <div className="cart-controls">
          <select
            aria-label={"Quantity for " + i.title}
            value={i.quantity}
            disabled={busy}
            onChange={(e) => change(i, Number(e.target.value), save)}
          >
            {Array.from({ length: 10 }, (_, n) => (
              <option key={n} value={n + 1}>
                {n + 1}
              </option>
            ))}
          </select>
          <button disabled={busy} onClick={() => change(i, 0)}>
            Remove
          </button>
          {user && (
            <button
              disabled={busy}
              onClick={() => change(i, i.quantity, !save)}
            >
              {save ? "Move to bag" : "Save for later"}
            </button>
          )}
        </div>
      </div>
      <div className="cart-price">{money(i.unit_price_paise * i.quantity)}</div>
    </div>
  );
  return (
    <div className="page">
      <div className="page-title">
        <h1>Your bag of good finds</h1>
        <p>
          {user
            ? "Saved to your account, wherever you shop."
            : "Your bag is saved on this device. Sign in when you’re ready to check out."}
        </p>
      </div>
      <State loading={!ready}>
        {!items.length && !saved.length ? (
          <Empty title="A little room for something good">
            Explore the shop and add a find to your bag.
          </Empty>
        ) : (
          <div className="two-columns">
            <div className="stack">
              <section className="panel">
                {items.length ? (
                  items.map((i: Item) => row(i))
                ) : (
                  <p className="muted">
                    Your active bag is empty. Move a saved item back to get
                    started.
                  </p>
                )}
              </section>
              {saved.length > 0 && (
                <section className="panel">
                  <h2>For another day</h2>
                  {saved.map((i: Item) => row(i, true))}
                </section>
              )}
              <ErrorText error={error} />
              <Link href="/search" className="text-link small">
                Keep exploring
              </Link>
            </div>
            <aside className="panel summary">
              <h2>The whole picture</h2>
              <div className="summary-line">
                <span>
                  Subtotal (
                  {items.reduce((s: number, i: Item) => s + i.quantity, 0)}{" "}
                  items)
                </span>
                <span>{money(subtotal)}</span>
              </div>
              <div className="summary-line">
                <span>Standard delivery</span>
                <span>
                  {subtotal ? (delivery ? money(delivery) : "Free") : "—"}
                </span>
              </div>
              {coupon && (
                <div className="summary-line">
                  <span>{coupon.code}</span>
                  <span>−{money(coupon.discountPaise)}</span>
                </div>
              )}
              <div className="summary-line summary-total">
                <span>Total</span>
                <span>{money(subtotal ? total : 0)}</span>
              </div>
              <p className="small muted" style={{ margin: "15px 0" }}>
                No real charges. This is a demonstration shop.
              </p>
              <Link
                className="button full"
                href={
                  user
                    ? "/checkout" + (coupon ? "?coupon=" + coupon.code : "")
                    : "/login?next=/checkout"
                }
                aria-disabled={!items.length}
              >
                {user ? "Continue to checkout" : "Sign in to checkout"}
                <ArrowRight size={17} />
              </Link>
              {user && (
                <form
                  className="row space-top"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError("");
                    try {
                      const r = await api("coupons/validate", "POST", { code });
                      setCoupon(r.coupon);
                      setNotice("Coupon applied.");
                    } catch (e: any) {
                      setCoupon(null);
                      setError(e.message);
                    }
                  }}
                >
                  <input
                    style={{ flex: 1 }}
                    aria-label="Coupon code"
                    placeholder="Have a coupon?"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={30}
                  />
                  <button className="button secondary" disabled={!items.length}>
                    Apply
                  </button>
                </form>
              )}
            </aside>
          </div>
        )}
      </State>
    </div>
  );
}
export async function payRazorpay(order: any, keyId: string) {
  if (!(window as any).Razorpay)
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error("Payment checkout could not load. Please retry."));
      document.head.appendChild(script);
    });
  return new Promise<void>((resolve, reject) => {
    const payment = new (window as any).Razorpay({
      key: keyId,
      amount: Number(order.totalPaise || order.total_paise),
      currency: "INR",
      name: "styleshopZ · Test mode",
      order_id: order.razorpayOrderId || order.razorpay_order_id,
      handler: async (data: any) => {
        try {
          await api("checkout/verify", "POST", {
            orderId: order.orderId || order.id,
            razorpayOrderId: data.razorpay_order_id,
            razorpayPaymentId: data.razorpay_payment_id,
            razorpaySignature: data.razorpay_signature,
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () =>
          reject(
            new Error(
              "Payment closed. Your pending order is saved; you can retry from its order page.",
            ),
          ),
      },
      theme: { color: "#f0b429" },
    });
    payment.on("payment.failed", () =>
      reject(new Error("Test payment failed. You can retry from your order.")),
    );
    payment.open();
  });
}
export function CheckoutScreen() {
  return (
    <div className="page">
      <AuthGate>
        <Checkout />
      </AuthGate>
    </div>
  );
}
function Checkout() {
  const { cart, refreshCart, config, user, setNotice } = useStore(),
    router = useRouter(),
    params = useSearchParams(),
    profile = useData("profile");
  const [reservation, setReservation] = useState<any>(null),
    [seconds, setSeconds] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [initializing, setInitializing] = useState(true),
    [selected, setSelected] = useState(""),
    [delivery, setDelivery] = useState("standard"),
    [payment, setPayment] = useState(config.demo ? "demo" : "cod"),
    [coupon, setCoupon] = useState<any>(null),
    [code, setCode] = useState(params.get("coupon") || ""),
    [pendingOrder, setPendingOrder] = useState<any>(null);
  const key = useRef("");
  const items = cart.items.filter((i: Item) => !i.saved_for_later);
  const renew = async () => {
    setError("");
    setInitializing(true);
    try {
      const c = await refreshCart(true),
        active = c.items.filter((i: Item) => !i.saved_for_later);
      if (!active.length) {
        setReservation(null);
        return;
      }
      const r = await api("checkout/hold", "POST", {
        items: active.map((i: Item) => ({
          variantId: i.variant_id,
          quantity: i.quantity,
        })),
      });
      setReservation(r);
      if (!key.current) key.current = crypto.randomUUID();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setInitializing(false);
    }
  };
  useEffect(() => {
    renew();
  }, []);
  useEffect(() => {
    const addresses = profile.data?.addresses;
    if (addresses?.length) setSelected(addresses[0].id);
  }, [profile.data]);
  useEffect(() => {
    if (!reservation) return;
    const tick = () =>
      setSeconds(
        Math.max(
          0,
          Math.floor(
            (new Date(reservation.expiresAt).getTime() - Date.now()) / 1000,
          ),
        ),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [reservation]);
  useEffect(() => {
    if (!code.trim() || !user) return;
    let active = true;
    api("coupons/validate", "POST", { code, delivery })
      .then((r) => {
        if (active) setCoupon(r.coupon);
      })
      .catch(() => {
        if (active) setCoupon(null);
      });
    return () => {
      active = false;
    };
  }, [delivery]);
  const subtotal = cart.subtotalPaise,
    fee = delivery === "express" ? 9900 : subtotal >= 49900 ? 0 : 4000,
    total = subtotal + fee - (coupon?.discountPaise || 0);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (pendingOrder) {
        await payRazorpay(pendingOrder, pendingOrder.keyId);
        router.push("/orders/" + pendingOrder.orderId);
        return;
      }
      const form = Object.fromEntries(new FormData(e.currentTarget)),
        saved = profile.data?.addresses.find((a: Item) => a.id === selected);
      const a = saved || form;
      if (!saved && form.save_address === "on")
        await api("addresses", "POST", a);
      const o = await api("checkout/create-order", "POST", {
        items: items.map((i: Item) => ({
          variantId: i.variant_id,
          quantity: i.quantity,
        })),
        address: a,
        paymentMethod: payment,
        delivery,
        couponCode: coupon?.code || undefined,
        batchId: reservation?.batchId,
        idempotencyKey: key.current,
      });
      setPendingOrder(o);
      await refreshCart(true);
      if (o.paymentMethod === "razorpay") await payRazorpay(o, o.keyId);
      router.push("/orders/" + o.orderId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-title row between">
        <div>
          <h1>One last thing, then it’s yours.</h1>
          <p>Choose a destination and a demonstration payment method.</p>
        </div>
        {reservation && (
          <span className="chip row">
            <Clock size={16} />
            {seconds > 0
              ? `Reserved ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
              : "Reservation expired"}
          </span>
        )}
      </div>
      {config.verificationEmail && user && !user.email_verified_at && <div className="location-confirmed" style={{marginBottom:24}}><span>Confirm your email before placing your order.</span><Link className="button small" href="/verify-email?next=/checkout">Verify email</Link></div>}
      {initializing ? (
        <State loading />
      ) : !items.length && !pendingOrder ? (
        <>
          <ErrorText error={error} />
          <Empty
            title="Your bag is waiting for a good find"
            link="/cart"
            label="Back to your bag"
          />
        </>
      ) : (
        <form onSubmit={submit} className="two-columns">
          <div className="stack">
            <section className="panel">
              <h2>Where should it go?</h2>
              <State
                loading={profile.loading}
                error={profile.error}
                retry={profile.refresh}
              >
                {profile.data?.addresses.length > 0 && (
                  <SelectField
                    label="Saved address"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {profile.data.addresses.map((a: Item) => (
                      <option key={a.id} value={a.id}>
                        {a.name} · {a.line1} · {a.pincode}
                      </option>
                    ))}
                    <option value="">Use a new address</option>
                  </SelectField>
                )}
                {!selected && (
                  <>
                    <AddressFields
                      value={{ name: user?.name, phone: user?.phone }}
                    />
                    <label className="row small space-top">
                      <input type="checkbox" name="save_address" />
                      Save this address for next time
                    </label>
                  </>
                )}
                {selected && <div className="location-confirmed space-top"><MapPin size={20}/><div>{profile.data?.addresses.find((a:Item)=>a.id===selected)?.latitude != null ? 'This saved address includes a delivery pin.' : 'This saved address uses your written delivery details.'}<br/><Link className="text-link" href="/addresses">Review address or adjust its map pin</Link></div></div>}
              </State>
            </section>
            <section className="panel">
              <h2>Pick your pace</h2>
              <div className="stack">
                <label className="row">
                  <input
                    type="radio"
                    name="delivery"
                    value="standard"
                    checked={delivery === "standard"}
                    onChange={() => setDelivery("standard")}
                  />
                  <span>
                    Standard · 3–5 days{" "}
                    <span className="muted">
                      {subtotal >= 49900 ? "Free" : money(4000)}
                    </span>
                  </span>
                </label>
                <label className="row">
                  <input
                    type="radio"
                    name="delivery"
                    value="express"
                    checked={delivery === "express"}
                    onChange={() => setDelivery("express")}
                  />
                  <span>
                    Express · 1–2 days{" "}
                    <span className="muted">{money(9900)}</span>
                  </span>
                </label>
                <p className="small muted">
                  Delivery is simulated; no parcel will be sent.
                </p>
              </div>
            </section>
            <section className="panel">
              <h2>How would you like to pay?</h2>
              <div className="stack">
                {config.demo && (
                  <label className="row">
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === "demo"}
                      onChange={() => setPayment("demo")}
                    />
                    <span>
                      Demo payment{" "}
                      <span className="muted small">
                        · No card or money needed
                      </span>
                    </span>
                  </label>
                )}
                <label className="row">
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === "cod"}
                    onChange={() => setPayment("cod")}
                    disabled={total > 5000000}
                  />
                  <span>
                    Cash on delivery{" "}
                    <span className="muted small">
                      {total > 5000000
                        ? "· Available up to ₹50,000"
                        : "· Simulated"}
                    </span>
                  </span>
                </label>
                {config.razorpay && (
                  <label className="row">
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === "razorpay"}
                      onChange={() => setPayment("razorpay")}
                    />
                    <span>
                      Razorpay test payment{" "}
                      <span className="muted small">
                        · Test cards or UPI only
                      </span>
                    </span>
                  </label>
                )}
              </div>
            </section>
          </div>
          <aside className="panel summary">
            <h2>Your order</h2>
            {items.map((i: Item) => (
              <div className="summary-line" key={i.variant_id}>
                <span>
                  {i.quantity} × {i.title}
                </span>
                <span style={{ whiteSpace: "nowrap" }}>
                  {money(i.unit_price_paise * i.quantity)}
                </span>
              </div>
            ))}
            <div className="summary-line space-top">
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div className="summary-line">
              <span>Delivery</span>
              <span>{money(fee)}</span>
            </div>
            {coupon && (
              <div className="summary-line">
                <span>{coupon.code}</span>
                <span>−{money(coupon.discountPaise)}</span>
              </div>
            )}
            <div className="summary-line summary-total">
              <span>Total</span>
              <span>{money(total)}</span>
            </div>
            <div className="row space-top">
              <input
                style={{ flex: 1 }}
                aria-label="Coupon code"
                placeholder="Coupon code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button
                className="button secondary"
                type="button"
                onClick={async () => {
                  setError("");
                  try {
                    const r = await api("coupons/validate", "POST", {
                      code,
                      delivery,
                    });
                    setCoupon(r.coupon);
                  } catch (e: any) {
                    setCoupon(null);
                    setError(e.message);
                  }
                }}
              >
                Apply
              </button>
            </div>
            <ErrorText error={error} />
            {(!reservation || seconds <= 0) && !pendingOrder && (
              <button
                className="button secondary full space-top"
                type="button"
                onClick={renew}
              >
                Refresh reservation
              </button>
            )}
            <button
              className="button full space-top"
              disabled={
                busy ||
                (!pendingOrder && (!reservation || seconds <= 0)) ||
                profile.loading
              }
            >
              {busy
                ? "Processing…"
                : pendingOrder
                  ? "Retry test payment"
                  : payment === "demo"
                    ? "Place demo order"
                    : payment === "cod"
                      ? "Place COD order"
                      : "Continue to test payment"}
            </button>
            {pendingOrder && (
              <Link
                className="button quiet full space-top"
                href={"/orders/" + pendingOrder.orderId}
              >
                View pending order
              </Link>
            )}
            <p className="small muted space-top">
              Prices and availability are rechecked on the server. Repeated taps
              use the same checkout reference.
            </p>
          </aside>
        </form>
      )}
    </>
  );
}
export function OrdersScreen() {
  return (
    <div className="page">
      <AuthGate>
        <Orders />
      </AuthGate>
    </div>
  );
}
function Orders() {
  const d = useData("orders"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("");
  return (
    <>
      <div className="page-title">
        <h1>Your finds, on their way</h1>
        <p>Every order, from the first tap to the last delivery step.</p>
      </div>
      <div className="row" style={{ marginBottom: 25 }}>
        <input
          style={{ maxWidth: 400 }}
          aria-label="Search orders"
          placeholder="Search by product or order ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          style={{ maxWidth: 210 }}
          aria-label="Filter order status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All orders</option>
          {[
            "awaiting_payment",
            "placed",
            "packed",
            "shipped",
            "out_for_delivery",
            "delivered",
            "cancelled",
          ].map((s) => (
            <option key={s} value={s}>
              {statusName(s)}
            </option>
          ))}
        </select>
      </div>
      <State loading={d.loading} error={d.error} retry={d.refresh}>
        <div className="stack">
          {d.data?.orders
            .filter(
              (o: Item) =>
                (!filter || o.status === filter) &&
                (!search ||
                  JSON.stringify(o.items)
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                  o.id.includes(search)),
            )
            .map((o: Item) => (
              <article className="order-card" key={o.id}>
                <div className="order-meta">
                  <div>
                    <small>Placed on</small>
                    {date(o.created_at)}
                  </div>
                  <div>
                    <small>Total</small>
                    {money(o.total_paise)}
                  </div>
                  <div>
                    <small>Order reference</small>
                    {o.id.slice(0, 8)}
                  </div>
                  <span className="badge">{statusName(o.status)}</span>
                </div>
                <div className="row between">
                  <div className="stack">
                    {o.items.map((i: Item) => (
                      <div className="order-items" key={i.id}>
                        <img
                          src={getProductImage(i.title, i.category_name)}
                          alt={i.title}
                        />
                        <div>
                          <h3 style={{ fontSize: 16 }}>{i.title}</h3>
                          <span className="small muted">Qty {i.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link className="button secondary" href={"/orders/" + o.id}>
                    View order
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </article>
            ))}
        </div>
        {!d.data?.orders.length && (
          <Empty title="Your first find is still out there">
            Your order history will live here after checkout.
          </Empty>
        )}
      </State>
    </>
  );
}
export function OrderScreen({ id }: { id: string }) {
  return (
    <div className="page">
      <AuthGate>
        <Order id={id} />
      </AuthGate>
    </div>
  );
}
async function uploadPhotos(files: FileList | null) {
  const urls = [];
  for (const file of Array.from(files || [])) {
    if (file.size > 5 * 1024 * 1024)
      throw new Error("Each image must be under 5 MB.");
    const form = new FormData();
    form.append("file", file);
    const r = await fetch("/api/uploads", { method: "POST", body: form });
    const b = await r.json();
    if (!r.ok) throw new Error(b.error);
    urls.push(b.url);
  }
  return urls;
}
function Order({ id }: { id: string }) {
  const d = useData("orders/" + id),
    { setNotice, config, add } = useStore(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [cancel, setCancel] = useState(false),
    [returnItem, setReturnItem] = useState("");
  useEffect(() => {
    const t = setInterval(d.refresh, 30000);
    return () => clearInterval(t);
  }, [d.refresh]);
  const o = d.data?.order,
    steps = ["placed", "packed", "shipped", "out_for_delivery", "delivered"];
  return (
    <>
      <div className="breadcrumbs">
        <Link href="/orders">Your orders</Link>
        <span>/</span>
        <span>{id.slice(0, 8)}</span>
      </div>
      <State loading={d.loading && !d.data} error={d.error} retry={d.refresh}>
        {o && (
          <>
            <div className="page-title row between">
              <div>
                <h1>
                  {o.status === "awaiting_payment"
                    ? "Your order is waiting for payment"
                    : o.status === "cancelled"
                      ? "Order cancelled"
                      : o.status === "delivered"
                        ? "A good find, delivered"
                        : "Your order is in motion"}
                </h1>
                <p>
                  Order {id.slice(0, 8)} · {date(o.created_at)} ·{" "}
                  {money(o.total_paise)}
                </p>
              </div>
              <a
                className="button secondary"
                href={"/api/orders/" + id + "/invoice"}
              >
                <DownloadSimple size={18} />
                Demo invoice PDF
              </a>
            </div>
            {o.status === "awaiting_payment" && (
              <section className="panel stack">
                <h2>Awaiting confirmed test payment</h2>
                <p className="muted">
                  The order is confirmed only after the server receives a
                  verified captured payment webhook. Your reservation expires at{" "}
                  {new Date(o.payment_expires_at).toLocaleTimeString("en-IN")}.
                </p>
                <button
                  className="button"
                  disabled={
                    busy ||
                    new Date(o.payment_expires_at).getTime() < Date.now()
                  }
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await payRazorpay(o, config.keyId);
                      d.refresh();
                    } catch (e: any) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Retry test payment
                </button>
              </section>
            )}
            {!["cancelled", "awaiting_payment"].includes(o.status) && (
              <div className="panel">
                <div className="row between">
                  <h2>From shop to doorstep</h2>
                  <span className="small muted">Simulated delivery</span>
                </div>
                <div className="timeline">
                  {steps.map((s, n) => (
                    <div
                      className={
                        "timeline-step " +
                        (steps.indexOf(o.status) >= n ? "done" : "")
                      }
                      key={s}
                    >
                      <i>
                        {steps.indexOf(o.status) >= n ? (
                          <Check size={15} />
                        ) : (
                          <Package size={14} />
                        )}
                      </i>
                      <span>{statusName(s)}</span>
                      <small>
                        {d.data.events.find((e: Item) => e.status === s)
                          ? date(
                              d.data.events.find((e: Item) => e.status === s)
                                .created_at,
                            )
                          : ""}
                      </small>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="two-columns space-top">
              <div className="stack">
                <section className="panel">
                  <h2>Inside your order</h2>
                  {d.data.items.map((i: Item) => (
                    <div className="cart-item" key={i.id}>
                      <img
                        src={getProductImage(
                          i.variant_snapshot.title,
                          i.variant_snapshot.category_name,
                        )}
                        alt={i.variant_snapshot.title}
                      />
                      <div>
                        <h3>{i.variant_snapshot.title}</h3>
                        <p className="small muted">
                          Qty {i.quantity} ·{" "}
                          {Object.values(i.variant_snapshot.options || {}).join(
                            " · ",
                          )}
                        </p>
                        <p className="small muted">
                          {i.seller_name} · {statusName(i.status)}
                        </p>
                        {i.tracking_id && (
                          <p className="small muted">
                            Tracking: {i.tracking_id}
                          </p>
                        )}
                        <div className="row space-top">
                          {i.variant_id && (
                            <button
                              className="button quiet small"
                              onClick={() =>
                                add(i.variant_id, i.quantity).catch((e: any) =>
                                  setNotice(e.message),
                                )
                              }
                            >
                              Buy again
                            </button>
                          )}
                          {i.return_eligible &&
                            !d.data.returns.some(
                              (r: Item) =>
                                r.order_item_id === i.id &&
                                r.status !== "rejected",
                            ) && (
                              <button
                                className="button secondary small"
                                onClick={() =>
                                  setReturnItem(returnItem === i.id ? "" : i.id)
                                }
                              >
                                Return this item
                              </button>
                            )}
                        </div>
                        {d.data.returns
                          .filter((r: Item) => r.order_item_id === i.id)
                          .map((r: Item) => (
                            <p className="small muted space-top" key={r.id}>
                              Return {statusName(r.status)} · {r.reason}
                            </p>
                          ))}
                      </div>
                      <span className="cart-price">
                        {money(Number(i.unit_price_paise) * i.quantity)}
                      </span>
                    </div>
                  ))}
                </section>
                {returnItem && (
                  <form
                    className="panel stack"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setBusy(true);
                      setError("");
                      const form = e.currentTarget;
                      try {
                        const f = new FormData(form),
                          files = (
                            form.elements.namedItem(
                              "photos",
                            ) as HTMLInputElement
                          ).files;
                        if ((files?.length || 0) > 4)
                          throw new Error("Attach at most four photos.");
                        const photoUrls = await uploadPhotos(files);
                        await api("returns", "POST", {
                          orderItemId: returnItem,
                          reason: f.get("reason"),
                          resolution: "refund",
                          photoUrls,
                        });
                        setReturnItem("");
                        setNotice("Return request submitted.");
                        d.refresh();
                      } catch (e: any) {
                        setError(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <h2>What wasn’t quite right?</h2>
                    <textarea
                      name="reason"
                      aria-label="Return reason"
                      required
                      minLength={5}
                      maxLength={500}
                    />
                    <Field
                      label="Photos (up to 4, each under 5 MB)"
                      name="photos"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                    />
                    <p className="small muted">
                      Approved demo returns restore stock and record a simulated
                      refund. For a replacement, reorder your preferred variant
                      after the refund.
                    </p>
                    <button className="button" disabled={busy}>
                      {busy ? "Submitting…" : "Request return"}
                    </button>
                  </form>
                )}
                <section className="panel">
                  <h2>The latest chapter</h2>
                  <div className="event-list">
                    {d.data.events.map((e: Item) => (
                      <div key={e.id}>
                        <p>{statusName(e.status)}</p>
                        <small>
                          {e.note} · {date(e.created_at)}
                        </small>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <aside className="stack">
                <section className="panel">
                  <h2>Delivery address</h2>
                  <p className="description">
                    {o.address_snapshot.name}
                    <br />
                    {o.address_snapshot.line1}
                    <br />
                    {o.address_snapshot.line2}
                    <br />
                    {o.address_snapshot.city}, {o.address_snapshot.state}{" "}
                    {o.address_snapshot.pincode}
                    <br />
                    {o.address_snapshot.phone}
                  </p>
                </section>
                <section className="panel">
                  <h2>Order total</h2>
                  <div className="summary-line">
                    <span>Items</span>
                    <span>{money(o.subtotal_paise)}</span>
                  </div>
                  <div className="summary-line">
                    <span>Delivery</span>
                    <span>{money(o.delivery_fee_paise)}</span>
                  </div>
                  <div className="summary-line">
                    <span>Discount</span>
                    <span>−{money(o.discount_paise)}</span>
                  </div>
                  <div className="summary-line summary-total">
                    <span>Total</span>
                    <span>{money(o.total_paise)}</span>
                  </div>
                  <p className="small muted space-top">
                    {o.payment_method === "demo"
                      ? "Demo payment · No real money charged"
                      : o.payment_method === "cod"
                        ? "Cash on delivery · Simulated"
                        : "Razorpay test mode"}
                  </p>
                </section>
                {["awaiting_payment", "placed", "packed"].includes(
                  o.status,
                ) && (
                  <section className="panel stack">
                    <button
                      className="button danger"
                      onClick={() => setCancel(!cancel)}
                    >
                      Cancel order
                    </button>
                    {cancel && (
                      <form
                        className="stack"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setBusy(true);
                          setError("");
                          try {
                            await api("orders/" + id + "/cancel", "POST", {
                              reason: new FormData(e.currentTarget).get(
                                "reason",
                              ),
                            });
                            setCancel(false);
                            d.refresh();
                          } catch (e: any) {
                            setError(e.message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        <textarea
                          aria-label="Cancellation reason"
                          name="reason"
                          required
                          minLength={3}
                          maxLength={500}
                          placeholder="Tell us why you’re cancelling"
                        />
                        <button className="button danger" disabled={busy}>
                          {busy ? "Cancelling…" : "Confirm cancellation"}
                        </button>
                      </form>
                    )}
                  </section>
                )}
                <Link className="button secondary" href="/support">
                  Need a hand?
                </Link>
                <ErrorText error={error} />
              </aside>
            </div>
          </>
        )}
      </State>
    </>
  );
}
