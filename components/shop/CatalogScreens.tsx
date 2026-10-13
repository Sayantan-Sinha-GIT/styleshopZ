"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Package,
  ShieldCheck,
  Truck,
  Heart,
  ShareNetwork,
  Check,
  MagnifyingGlass,
  Microphone,
  X,
  Pause,
  Play,
  CaretLeft,
  CaretRight,
} from "@phosphor-icons/react";
import {
  useData,
  useStore,
  api,
  ProductCard,
  State,
  Empty,
  Field,
  SelectField,
  ErrorText,
  money,
  date,
  type Item,
} from "./Store";
import { getCategoryCover } from "@/lib/images";

export function SearchScreen() {
  const params = useSearchParams(),
    router = useRouter(),
    cats = useData("categories"),
    { setNotice } = useStore();
  const queryString = params.toString(),
    result = useData("products?" + queryString);
  const [recent, setRecent] = useState<string[]>([]),
    [filterOpen, setFilterOpen] = useState(false),
    [desktopFilters, setDesktopFilters] = useState(false),
    [voice, setVoice] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 761px)');
    const sync = () => setDesktopFilters(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    try {
      setRecent(
        JSON.parse(localStorage.getItem("shop.recent-searches") || "[]"),
      );
    } catch {}
    setVoice(
      !!(
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      ),
    );
  }, []);
  const update = (key: string, value: string) => {
    const p = new URLSearchParams(queryString);
    p.delete("offset");
    if (value) p.set(key, value);
    else p.delete(key);
    router.push("/search?" + p.toString(), { scroll: false });
  };
  const listen = () => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    const speech = new SR();
    speech.lang = "en-IN";
    speech.onresult = (e: any) => update("q", e.results[0][0].transcript);
    speech.onerror = () =>
      setNotice("Microphone access was unavailable. You can type your search.");
    speech.start();
  };
  return (
    <div className="page">
      <div className="page-title row between">
        <div>
          <h1>
            {params.get("q")
              ? `Results for “${params.get("q")}”`
              : cats.data?.flat.find((c: Item)=>c.slug===params.get('category'))?.name || "Browse the whole shop"}
          </h1>
          <p>
            Everyday essentials, a few unexpected finds, and room to explore.
          </p>
        </div>
        {voice && (
          <button className="button secondary" onClick={listen}>
            <Microphone size={18} />
            Voice search
          </button>
        )}
      </div>
      {!params.get("q") && recent.length > 0 && (
        <div className="chips">
          {recent.map((s) => (
            <Link
              className="chip"
              key={s}
              href={"/search?q=" + encodeURIComponent(s)}
            >
              {s}
            </Link>
          ))}
        </div>
      )}
      <div className="search-layout">
        <aside className="filter-panel">
          <details
            open={desktopFilters || filterOpen}
            onToggle={(e) => { if (!desktopFilters) setFilterOpen(e.currentTarget.open); }}
          >
            <summary>Filter your finds</summary>
            <div className="space-top">
              <h3 className="small">Department</h3>
              <button
                className="filter-link"
                onClick={() => update("category", "")}
              >
                All departments
              </button>
              {cats.data?.tree.map((c: Item) => (
                <button
                  style={{ background: "none", border: 0, textAlign: "left" }}
                  className={
                    "filter-link " +
                    (params.get("category") === c.slug ? "active" : "")
                  }
                  onClick={() => update("category", c.slug)}
                  key={c.id}
                >
                  {c.name}
                </button>
              ))}
              {cats.data?.flat.filter((c:Item)=>c.parent_id===cats.data?.flat.find((x:Item)=>x.slug===params.get('category'))?.id).map((c:Item)=><button className="filter-link subcategory" type="button" key={c.id} onClick={()=>update('category',c.slug)}>{c.name} <span className="muted">({c.product_count})</span></button>)}
            </div>
            <Field
              label="Minimum price (₹)"
              type="number"
              min={0}
              key={'min-'+params.get('min_price')}
              defaultValue={
                params.get("min_price")
                  ? Number(params.get("min_price")) / 100
                  : ""
              }
              onBlur={(e) =>
                update(
                  "min_price",
                  e.target.value ? String(Number(e.target.value) * 100) : "",
                )
              }
            />
            <Field
              label="Maximum price (₹)"
              type="number"
              min={0}
              key={'max-'+params.get('max_price')}
              defaultValue={
                params.get("max_price")
                  ? Number(params.get("max_price")) / 100
                  : ""
              }
              onBlur={(e) =>
                update(
                  "max_price",
                  e.target.value ? String(Number(e.target.value) * 100) : "",
                )
              }
            />
            <SelectField label="Brand" value={params.get('brand') || ''} onChange={e=>update('brand',e.target.value)}><option value="">All brands</option>{result.data?.brands?.map((b:Item)=><option key={b.brand} value={b.brand}>{b.brand} ({b.count})</option>)}</SelectField>
            <SelectField
              label="Customer rating"
              value={params.get("rating") || ""}
              onChange={(e) => update("rating", e.target.value)}
            >
              <option value="">All ratings</option>
              {[4, 3, 2, 1].map((n) => (
                <option value={n} key={n}>
                  {n} stars & up
                </option>
              ))}
            </SelectField>
            <SelectField
              label="Minimum discount"
              value={params.get("discount") || ""}
              onChange={(e) => update("discount", e.target.value)}
            >
              <option value="">Any discount</option>
              {[10, 20, 30, 40].map((n) => (
                <option value={n} key={n}>
                  {n}% off or more
                </option>
              ))}
            </SelectField>
            <label className="check space-top">
              <input
                type="checkbox"
                checked={params.get("in_stock") === "true"}
                onChange={(e) =>
                  update("in_stock", e.target.checked ? "true" : "")
                }
              />
              In stock only
            </label>
            <button
              className="button quiet small space-top"
              onClick={() => router.push("/search")}
            >
              Reset filters
            </button>
          </details>
        </aside>
        <div>
          <div className="results-top">
            <span className="muted">
              {result.data
                ? `${result.data.count} finds`
                : "Looking through the shop…"}
            </span>
            <select
              aria-label="Sort products"
              value={params.get("sort") || (params.get('q') ? 'relevance' : 'newest')}
              onChange={(e) => update("sort", e.target.value)}
            >
              <option value="relevance">Most relevant</option>
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="rating">Best rated</option>
            </select>
          </div>
          {Array.from(params.entries()).some(([k])=>!['q','sort','offset','limit'].includes(k)) && <div className="chips active-filters" aria-label="Applied filters">{Array.from(params.entries()).filter(([k])=>!['q','sort','offset','limit'].includes(k)).map(([k,v])=><button className="chip" key={k} onClick={()=>update(k,'')}>{k==='category' ? cats.data?.flat.find((c:Item)=>c.slug===v)?.name || v : k.replaceAll('_',' ')+': '+(['min_price','max_price'].includes(k)?money(Number(v)):v)} <X size={12}/><span className="sr-only">Remove filter</span></button>)}</div>}
          <State
            loading={result.loading}
            error={result.error}
            retry={result.refresh}
          >
            {result.data?.fuzzy && <p className="small muted" style={{marginBottom:18}} role="status">Showing similar matches for “{params.get('q')}”. Try a different spelling to narrow your search.</p>}
            {result.data?.products.length ? (
              <>
                <div className="product-grid">
                  {result.data.products.map((p: Item) => (
                    <ProductCard product={p} key={p.id} />
                  ))}
                </div>
                <div className="pagination">
                  <button
                    className="button secondary small"
                    disabled={!Number(params.get("offset"))}
                    onClick={() => {
                      const p = new URLSearchParams(queryString);
                      p.set(
                        "offset",
                        String(
                          Math.max(0, Number(params.get("offset") || 0) - 24),
                        ),
                      );
                      router.push("/search?" + p);
                    }}
                  >
                    Previous
                  </button>
                  <span className="small muted">
                    Page{" "}
                    {Math.floor(Number(params.get("offset") || 0) / 24) + 1}
                  </span>
                  <button
                    className="button secondary small"
                    disabled={
                      Number(params.get("offset") || 0) + 24 >=
                      result.data.count
                    }
                    onClick={() => {
                      const p = new URLSearchParams(queryString);
                      p.set(
                        "offset",
                        String(Number(params.get("offset") || 0) + 24),
                      );
                      router.push("/search?" + p);
                    }}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <Empty
                title="Nothing quite matches yet"
                link="/search"
                label="Start a fresh search"
              >
                Try a shorter product name, another spelling, or fewer filters.
              </Empty>
            )}
          </State>
        </div>
      </div>
    </div>
  );
}
export function CategoriesScreen() {
  const data = useData("categories");
  return (
    <div className="page">
      <div className="page-title">
        <h1>Every corner of your day</h1>
        <p>Start with a department. Find something that fits.</p>
      </div>
      <State loading={data.loading} error={data.error} retry={data.refresh}>
        <div className="stack">
          {data.data?.tree.map((c: Item) => (
            <section className="panel" key={c.id}>
              <div className="row between">
                <Link href={"/search?category=" + c.slug}>
                  <h2>{c.name}</h2>
                </Link>
                <Link
                  className="text-link small"
                  href={"/search?category=" + c.slug}
                >
                  {c.product_count} products
                </Link>
              </div>
              <div className="form-grid space-top">
                <img
                  style={{
                    maxHeight: 200,
                    width: "100%",
                    objectFit: "cover",
                    borderRadius: 8,
                  }}
                  src={getCategoryCover(c.name)}
                  alt={c.name}
                />
                <div className="stack">
                  {c.subcategories.map((s: Item) => (
                    <div key={s.id}>
                      <Link href={"/search?category=" + s.slug}>
                        <h3 style={{ fontSize: 18 }}>{s.name}</h3>
                      </Link>
                      <div className="chips">
                        {s.leaves.map((l: Item) => (
                          <Link
                            className="chip"
                            href={"/search?category=" + l.slug}
                            key={l.id}
                          >
                            {l.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </State>
    </div>
  );
}
export function Countdown({ until }: { until: string }) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    const update = () =>
      setSeconds(
        Math.max(
          0,
          Math.floor((new Date(until).getTime() - Date.now()) / 1000),
        ),
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [until]);
  return (
    <span className="chip" style={{ fontVariantNumeric: "tabular-nums" }}>
      Ends in{" "}
      {seconds === null
        ? "…"
        : seconds === 0
          ? "Offer ended"
          : `${Math.floor(seconds / 3600)}h ${Math.floor(seconds / 60) % 60}m ${seconds % 60}s`}
    </span>
  );
}
export function DealsScreen() {
  const d = useData("deals"),
    { setNotice } = useStore();
  return (
    <div className="page">
      <div className="page-title">
        <h1>A little less. A lot to love.</h1>
        <p>
          Current offers from the catalogue. Discounts are applied again on the
          server at checkout.
        </p>
      </div>
      <State loading={d.loading} error={d.error} retry={d.refresh}>
        {d.data?.coupons.length > 0 && (
          <div className="form-grid">
            {d.data.coupons.map((c: Item) => (
              <div className="coupon-card" key={c.code}>
                <strong>{c.code}</strong>
                <p>
                  {c.discount_type === "percent"
                    ? c.discount_value + "%"
                    : money(c.discount_value)}{" "}
                  off · Cart from {money(c.min_cart_paise)} · Expires{" "}
                  {date(c.expires_at)}
                </p>
                <button
                  className="button secondary small"
                  onClick={() =>
                    navigator.clipboard
                      .writeText(c.code)
                      .then(() => setNotice("Coupon copied."))
                      .catch(() => setNotice("Use coupon " + c.code))
                  }
                >
                  Copy code
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="section-heading">
          <h2>Limited-time finds</h2>
          <span className="small muted">While the offer stock lasts</span>
        </div>
        {d.data?.deals.length ? (
          <div className="product-grid">
            {d.data.deals.map((p: Item) => (
              <div key={p.id}>
                <ProductCard product={p} />
                <div style={{ marginTop: 10 }}>
                  <Countdown until={p.deal_ends_at} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Empty title="The next good deal is on its way">
            Browse the catalogue while we refresh the offers.
          </Empty>
        )}
      </State>
    </div>
  );
}
export function ProductScreen({ id }: { id: string }) {
  const d = useData("products/" + id),
    { user, add, save, setNotice } = useStore(),
    router = useRouter();
  const [variantId, setVariantId] = useState(""),
    [qty, setQty] = useState(1),
    [image, setImage] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [pin, setPin] = useState(""),
    [estimate, setEstimate] = useState(""),
    [review, setReview] = useState(""),
    [rating, setRating] = useState("5"),
    [question, setQuestion] = useState("");
  const zoom = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!d.data) return;
    setVariantId(d.data.variants[0]?.id || "");
    try {
      const ids = JSON.parse(localStorage.getItem("shop.viewed") || "[]");
      localStorage.setItem(
        "shop.viewed",
        JSON.stringify(
          [id, ...ids.filter((v: string) => v !== id)].slice(0, 12),
        ),
      );
    } catch {}
  }, [d.data, id]);
  const p = d.data?.product,
    v = d.data?.variants.find((v: Item) => v.id === variantId),
    price = Number(v?.unit_price_paise || 0);
  const addItem = async (buy: boolean) => {
    if (!v) return;
    setBusy(true);
    setError("");
    try {
      await add(v.id, qty);
      if (buy) router.push("/cart");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const sendReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api("reviews", "POST", {
        productId: id,
        text: review,
        rating: Number(rating),
      });
      setReview("");
      setNotice("Review submitted.");
      d.refresh();
    } catch (e: any) {
      setError(e.message);
    }
  };
  return (
    <div className="page">
      <State loading={d.loading} error={d.error} retry={d.refresh}>
        {p && (
          <>
            <div className="breadcrumbs">
              <Link href="/">Home</Link>
              <span>/</span>
              <Link href={"/search?category=" + p.category_slug}>
                {p.category_name}
              </Link>
              <span>/</span>
              <span>{p.brand}</span>
            </div>
            <div className="product-detail">
              <div>
                <div className="product-gallery">
                  <img
                    src={d.data.images[image]?.url}
                    alt={p.title}
                    onClick={() => zoom.current?.showModal()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") zoom.current?.showModal();
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label="Zoom product photo"
                  />
                </div>
                <div className="gallery-thumbs">
                  {d.data.images.map((i: Item, n: number) => (
                    <button
                      key={n}
                      onClick={() => setImage(n)}
                      aria-label={"View image " + (n + 1)}
                    >
                      <img src={i.url} alt="" />
                    </button>
                  ))}
                </div>
                <dialog
                  ref={zoom}
                  className="panel"
                  style={{
                    border: "1px solid var(--line)",
                    maxWidth: "90vw",
                    maxHeight: "90dvh",
                    color: "var(--text)",
                  }}
                >
                  <button
                    className="icon-button"
                    style={{ marginLeft: "auto" }}
                    aria-label="Close zoom"
                    onClick={() => zoom.current?.close()}
                  >
                    <X size={22} />
                  </button>
                  <img
                    src={d.data.images[image]?.url}
                    alt={p.title}
                    style={{ maxHeight: "75dvh", objectFit: "contain" }}
                  />
                </dialog>
              </div>
              <div className="product-info">
                <Link
                  className="small muted text-link"
                  href={"/search?brand=" + encodeURIComponent(p.brand)}
                >
                  Explore {p.brand}
                </Link>
                <h1>{p.title}</h1>
                <p className="small muted">
                  {d.data.reviews.length
                    ? `${(d.data.reviews.reduce((s: number, r: Item) => s + r.rating, 0) / d.data.reviews.length).toFixed(1)} ★ · ${d.data.reviews.length} demo reviews`
                    : "No reviews yet"}{" "}
                  · Sold by {p.seller_name}
                </p>
                <div className="detail-price">
                  {money(price)}
                  {Number(v?.mrp_paise) > price && (
                    <del>{money(v?.mrp_paise)}</del>
                  )}
                </div>
                {v?.deal_ends_at && <Countdown until={v.deal_ends_at} />}
                <h3 className="small space-top">Choose your variant</h3>
                <div className="variant-grid">
                  {d.data.variants.map((opt: Item) => (
                    <button
                      key={opt.id}
                      className={
                        "variant-button " + (v?.id === opt.id ? "active" : "")
                      }
                      aria-pressed={v?.id === opt.id}
                      onClick={() => {
                        setVariantId(opt.id);
                        setQty(1);
                      }}
                    >
                      {Object.values(opt.options).join(" · ") || opt.sku}
                      <br />
                      <span className="muted small">
                        {opt.stock > 0 ? `${opt.stock} available` : "Sold out"}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="row">
                  <span className={v?.stock > 0 ? "success" : "form-error"}>
                    {v?.stock > 0 ? "In stock" : "Currently unavailable"}
                  </span>
                  <select
                    style={{ width: 75, marginLeft: "auto" }}
                    aria-label="Quantity"
                    value={qty}
                    onChange={(e) => setQty(Number(e.target.value))}
                  >
                    {Array.from(
                      { length: Math.max(1, Math.min(10, v?.stock || 1)) },
                      (_, n) => (
                        <option key={n} value={n + 1}>
                          {n + 1}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <ErrorText error={error} />
                <div className="detail-actions">
                  <button
                    className="button"
                    disabled={busy || !v?.stock}
                    onClick={() => addItem(false)}
                  >
                    {busy ? "Adding…" : "Add to bag"}
                  </button>
                  <button
                    className="button secondary"
                    disabled={busy || !v?.stock}
                    onClick={() => addItem(true)}
                  >
                    Buy now
                  </button>
                </div>
                <div className="row">
                  <button
                    className="button quiet small"
                    onClick={() =>
                      save(v?.id).catch((e: any) => setNotice(e.message))
                    }
                  >
                    <Heart size={17} />
                    Save
                  </button>
                  <button
                    className="button quiet small"
                    onClick={async () => {
                      try {
                        if (navigator.share)
                          await navigator.share({
                            title: p.title,
                            url: location.href,
                          });
                        else {
                          await navigator.clipboard.writeText(location.href);
                          setNotice("Product link copied.");
                        }
                      } catch {}
                    }}
                  >
                    <ShareNetwork size={17} />
                    Share
                  </button>
                  <Link
                    className="button quiet small"
                    href={"/compare?ids=" + id}
                  >
                    Compare
                  </Link>
                </div>
                <form
                  className="row space-top"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setEstimate(
                      /^[1-9]\d{5}$/.test(pin)
                        ? "Standard: 3–5 days · Express: 1–2 days. Delivery estimates are simulated."
                        : "Enter a valid six-digit Indian pincode.",
                    );
                  }}
                >
                  <input
                    style={{ flex: 1 }}
                    placeholder="Delivery pincode"
                    aria-label="Delivery pincode"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  />
                  <button className="button secondary" type="submit">
                    Check
                  </button>
                </form>
                {estimate && (
                  <p
                    className="small muted"
                    style={{ marginTop: 10 }}
                    role="status"
                  >
                    {estimate}
                  </p>
                )}
                <p className="small muted space-top">
                  <ShieldCheck
                    size={17}
                    style={{ display: "inline", verticalAlign: "middle" }}
                  />{" "}
                  This is a sample product. Payments and delivery are
                  demonstrations.
                </p>
              </div>
            </div>
            <section className="panel space-top">
              <h2>About this find</h2>
              <p className="description">{p.description}</p>
              <div className="chips">
                {Object.entries(v?.options || {}).map(([key, value]) => (
                  <span className="chip" key={key}>
                    {key}: {String(value)}
                  </span>
                ))}
                <span className="chip">SKU: {v?.sku}</span>
              </div>
            </section>
            <div className="two-columns space-top">
              <section className="panel">
                <h2>From people who bought it</h2>
                {d.data.reviews.length ? (
                  d.data.reviews.map((r: Item) => (
                    <div className="review" key={r.id}>
                      <div className="row between">
                        <strong>{r.user_name}</strong>
                        <span>{"★".repeat(r.rating)}</span>
                      </div>
                      <span className="badge">
                        {r.is_sample
                          ? "Sample review"
                          : "Verified demo purchase"}
                      </span>
                      <p>{r.text}</p>
                      <div className="row">
                        {r.photos?.map((url: string) => (
                          <img
                            src={url}
                            key={url}
                            alt="Customer review photo"
                          />
                        ))}
                      </div>
                      <div className="row">
                        <button
                          className="button quiet small"
                          onClick={() =>
                            api("reviews", "POST", {
                              action: "helpful",
                              productId: id,
                              reviewId: r.id,
                            })
                              .then(() => d.refresh())
                              .catch((e) => setNotice(e.message))
                          }
                        >
                          Helpful ({r.helpful})
                        </button>
                        <button
                          className="button quiet small"
                          onClick={() =>
                            api("reviews", "POST", {
                              action: "report",
                              productId: id,
                              reviewId: r.id,
                              reason: "Customer requested moderation",
                            })
                              .then(() => setNotice("Review reported."))
                              .catch((e) => setNotice(e.message))
                          }
                        >
                          Report
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">
                    Be the first delivered customer to leave a review.
                  </p>
                )}
                {user && (
                  <form className="stack space-top" onSubmit={sendReview}>
                    <h3>Your review</h3>
                    <p className="small muted">
                      Available after delivery. One review per product.
                    </p>
                    <SelectField
                      label="Rating"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option value={n} key={n}>
                          {n} stars
                        </option>
                      ))}
                    </SelectField>
                    <textarea
                      aria-label="Your review"
                      value={review}
                      onChange={(e) => setReview(e.target.value)}
                      required
                      minLength={10}
                      maxLength={2000}
                    />
                    <button className="button secondary" type="submit">
                      Submit review
                    </button>
                    <ErrorText error={error} />
                  </form>
                )}
              </section>
              <section className="panel">
                <h2>Questions, answered</h2>
                {d.data.qas.map((q: Item) => (
                  <div className="review" key={q.id}>
                    {q.is_sample && (
                      <p className="small muted">
                        Illustrative example · Not a product specification
                      </p>
                    )}
                    <strong>{q.question}</strong>
                    <p>{q.answer || "Waiting for an answer."}</p>
                    {q.answer && (
                      <span className="small muted">
                        Answered by {q.answered_by_name}
                      </span>
                    )}
                    {user && !q.answer && (
                      <form
                        className="row"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const answer = new FormData(e.currentTarget).get(
                            "answer",
                          );
                          try {
                            await api("questions", "POST", {
                              id: q.id,
                              answer,
                            });
                            d.refresh();
                          } catch (e: any) {
                            setNotice(e.message);
                          }
                        }}
                      >
                        <input
                          name="answer"
                          aria-label="Your answer"
                          required
                          minLength={2}
                          maxLength={500}
                        />
                        <button className="button secondary small">
                          Answer
                        </button>
                      </form>
                    )}
                  </div>
                ))}
                {!d.data.qas.length && (
                  <p className="muted">
                    Have something in mind? Ask about this product.
                  </p>
                )}
                {user ? (
                  <form
                    className="stack space-top"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await api("questions", "POST", {
                          productId: id,
                          question,
                        });
                        setQuestion("");
                        d.refresh();
                      } catch (e: any) {
                        setNotice(e.message);
                      }
                    }}
                  >
                    <textarea
                      aria-label="Product question"
                      placeholder="What would you like to know?"
                      required
                      minLength={5}
                      maxLength={500}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                    />
                    <button className="button secondary">Ask a question</button>
                  </form>
                ) : (
                  <Link className="button secondary space-top" href="/login">
                    Sign in to ask
                  </Link>
                )}
              </section>
            </div>
            {d.data.priceHistory.length > 0 && (
              <section className="panel space-top">
                <h2>Recent paid prices</h2>
                <p className="muted small">
                  Based on orders in this demo shop, rather than a fabricated
                  price chart.
                </p>
                <div className="chips">
                  {d.data.priceHistory.map((h: Item) => (
                    <span className="chip" key={h.day}>
                      {date(h.day)} · {money(h.price_paise)}
                    </span>
                  ))}
                </div>
              </section>
            )}
            <Similar category={p.category_slug} exclude={id} />
          </>
        )}
      </State>
    </div>
  );
}
function Similar({ category, exclude }: { category: string; exclude: string }) {
  const d = useData("products?category=" + category + "&limit=5");
  return d.data?.products.length > 1 ? (
    <>
      <div className="section-heading">
        <h2>More your kind of thing</h2>
      </div>
      <div className="product-grid">
        {d.data.products
          .filter((p: Item) => p.id !== exclude)
          .slice(0, 4)
          .map((p: Item) => (
            <ProductCard product={p} key={p.id} />
          ))}
      </div>
    </>
  ) : null;
}
export function CompareScreen() {
  const p = useSearchParams();
  const [ids, setIds] = useState(p.get("ids") || ""),
    [input, setInput] = useState(""),
    [products, setProducts] = useState<Item[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    Promise.all(
      ids
        .split(",")
        .filter(Boolean)
        .slice(0, 4)
        .map((id) => api("products/" + id)),
    )
      .then(setProducts)
      .catch((e) => setError(e.message));
  }, [ids]);
  return (
    <div className="page">
      <div className="page-title">
        <h1>Side by side</h1>
        <p>
          Compare up to four products. Paste a product link or ID to add
          another.
        </p>
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const id = input.trim().split("/").pop();
          if (id && !ids.split(",").includes(id) && ids.split(",").length < 4)
            setIds(ids ? ids + "," + id : id);
          setInput("");
        }}
      >
        <input
          aria-label="Product link to compare"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ maxWidth: 500 }}
        />
        <button className="button secondary">Add product</button>
      </form>
      <ErrorText error={error} />
      <div className="product-grid space-top">
        {products.map((d) => (
          <div className="panel" key={d.product.id}>
            <img
              src={d.product.image_url}
              alt={d.product.title}
              style={{
                width: "100%",
                aspectRatio: "1",
                objectFit: "cover",
                borderRadius: 7,
              }}
            />
            <h2 style={{ fontSize: 22, marginTop: 15 }}>{d.product.title}</h2>
            <p>{money(d.variants[0].unit_price_paise)}</p>
            <p className="small muted">
              {d.product.brand} · {d.product.category_name}
            </p>
            <p className="description small space-top">
              {d.product.description}
            </p>
            <div className="chips">
              {d.variants.map((v: Item) => (
                <span className="chip" key={v.id}>
                  {Object.values(v.options).join(" · ")} ·{" "}
                  {money(v.unit_price_paise)}
                </span>
              ))}
            </div>
            <Link className="button full" href={"/products/" + d.product.id}>
              View product
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
