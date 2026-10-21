"use client";
import Link from "next/link";
import { useState } from "react";
import {
  UploadSimple,
  Plus,
  ArrowRight,
  ArrowClockwise,
  CaretDown,
} from "@phosphor-icons/react";
import {
  useData,
  useStore,
  api,
  AuthGate,
  State,
  Empty,
  Field,
  SelectField,
  ErrorText,
  money,
  date,
  statusName,
  type Item,
} from "./Store";
import { SupportWorkspace } from "./SupportScreens";
import { OwnerBar } from "./OwnerBar";

const nextStatus: Record<string, string> = {
  placed: "packed",
  packed: "shipped",
  shipped: "out_for_delivery",
  out_for_delivery: "delivered",
};
async function upload(file: File) {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Choose an image under 5 MB.");
  const f = new FormData();
  f.append("file", file);
  const r = await fetch("/api/uploads", { method: "POST", body: f });
  const b = await r.json();
  if (!r.ok) throw new Error(b.error);
  return b.url;
}
export function SellerScreen() {
  return (
    <div className="page">
      <AuthGate role="seller">
        <SellerWorkspace />
      </AuthGate>
    </div>
  );
}
function SellerWorkspace() {
  const d = useData("seller"),
    cats = useData("categories"),
    { setNotice } = useStore(),
    [tab, setTab] = useState("overview"),
    [editing, setEditing] = useState<Item | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState("");
  const refresh = () => {
    d.refresh();
    setEditing(null);
  };
  return (
    <>
      <div className="page-title row between">
        <div>
          <h1>{d.data?.seller.shop_name || "Your seller workspace"}</h1>
          <p>Your products, orders and the next chapter of your shop.</p>
        </div>
        <div className="row">
          <span className="badge">
            {d.data?.seller.status || "Loading shop"}
          </span>
          <button className="button quiet small" onClick={d.refresh}>
            <ArrowClockwise size={17} />
            Refresh
          </button>
        </div>
      </div>
      <div className="tabs">
        {["overview", "products", "orders", "returns", "ledger", "shop"].map(
          (s) => (
            <button
              key={s}
              className={tab === s ? "active" : ""}
              onClick={() => {
                setTab(s);
                setEditing(null);
                setError("");
              }}
            >
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ),
        )}
      </div>
      <State loading={d.loading && !d.data} error={d.error} retry={d.refresh}>
        {d.data && (
          <>
            {tab === "overview" && (
              <>
                <div className="stats">
                  {[
                    ["Products", d.data.products.length],
                    ["Order items", d.data.stats.item_count],
                    ["Delivered sales", money(d.data.stats.delivered_paise)],
                    ["In progress", money(d.data.stats.pending_paise)],
                  ].map(([label, value]) => (
                    <div className="stat" key={label}>
                      <strong>{value}</strong>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
                <section className="panel space-top">
                  <h2>Make the next good thing happen</h2>
                  <p className="muted">
                    {d.data.seller.status === "approved"
                      ? "Your shop is approved. Add a product, keep stock current and move each order through its delivery steps."
                      : "Complete your shop details and upload an optional KYC document. An administrator must approve your shop before products can go live."}
                  </p>
                  <button
                    className="button space-top"
                    onClick={() =>
                      setTab(
                        d.data.seller.status === "approved"
                          ? "products"
                          : "shop",
                      )
                    }
                  >
                    {d.data.seller.status === "approved"
                      ? "Manage products"
                      : "Complete shop details"}
                    <ArrowRight size={18} />
                  </button>
                </section>
              </>
            )}
            {tab === "shop" && (
              <form
                className="panel stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  try {
                    const f = new FormData(e.currentTarget),
                      file = f.get("document") as File;
                    const document = file?.size
                      ? await upload(file)
                      : d.data.seller.kyc_data?.document;
                    await api("seller/profile", "POST", {
                      ...Object.fromEntries(f),
                      document,
                    });
                    setNotice("Shop details saved.");
                    d.refresh();
                  } catch (e: any) {
                    setError(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <h2>Your shop, introduced</h2>
                <div className="form-grid">
                  <Field
                    label="Shop name"
                    name="shopName"
                    required
                    defaultValue={d.data.seller.shop_name}
                    minLength={2}
                    maxLength={100}
                  />
                  <SelectField
                    label="Business type"
                    name="businessType"
                    defaultValue={
                      d.data.seller.kyc_data?.businessType || "Individual"
                    }
                  >
                    <option>Individual</option>
                    <option>Partnership</option>
                    <option>Company</option>
                  </SelectField>
                  <Field
                    label="PAN (optional in this demo)"
                    name="pan"
                    defaultValue={d.data.seller.kyc_data?.pan || ""}
                    maxLength={10}
                  />
                  <Field
                    label="GSTIN (optional)"
                    name="gstin"
                    defaultValue={d.data.seller.kyc_data?.gstin || ""}
                    maxLength={15}
                  />
                  <Field
                    label="KYC document image (optional, under 5 MB)"
                    name="document"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                  />
                </div>
                <p className="small muted">
                  Use dummy identity details for this demonstration. Do not
                  upload real financial documents.
                </p>
                <ErrorText error={error} />
                <button className="button" disabled={busy}>
                  {busy ? "Saving…" : "Save shop details"}
                </button>
              </form>
            )}
            {tab === "products" && (
              <>
                <div className="row between">
                  <input
                    style={{ maxWidth: 400 }}
                    placeholder="Find a product in your shop"
                    aria-label="Search seller products"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button
                    className="button"
                    disabled={d.data.seller.status !== "approved"}
                    onClick={() => setEditing({})}
                  >
                    <Plus size={17} />
                    New product
                  </button>
                </div>
                {editing ? (
                  <ProductEditor
                    product={editing}
                    categories={cats.data?.flat || []}
                    done={refresh}
                    cancel={() => setEditing(null)}
                  />
                ) : (
                  <div className="panel table-wrap space-top">
                    <table>
                      <thead>
                        <tr>
                          <th>Your product</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.data.products
                          .filter((p: Item) =>
                            p.title
                              .toLowerCase()
                              .includes(search.toLowerCase()),
                          )
                          .map((p: Item) => (
                            <tr key={p.id}>
                              <td>
                                <strong>{p.title}</strong>
                                <span className="muted">
                                  {p.brand} · {p.category_name}
                                </span>
                              </td>
                              <td>{money(p.variants[0]?.price_paise)}</td>
                              <td>
                                {p.variants.reduce(
                                  (s: number, v: Item) => s + v.stock,
                                  0,
                                )}{" "}
                                across {p.variants.length} variants
                              </td>
                              <td>{p.status}</td>
                              <td>
                                <button
                                  className="button secondary small"
                                  onClick={() => setEditing(p)}
                                >
                                  Edit
                                </button>
                                <Link
                                  className="button quiet small"
                                  href={"/products/" + p.id}
                                >
                                  View
                                </Link>
                                <button
                                  className="button quiet small"
                                  onClick={() =>
                                    api("seller/products?id=" + p.id, "DELETE")
                                      .then(d.refresh)
                                      .catch((e) => setNotice(e.message))
                                  }
                                >
                                  Archive
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                    {!d.data.products.length && (
                      <p className="muted">Your first product belongs here.</p>
                    )}
                  </div>
                )}
                <CsvImport done={d.refresh} />
              </>
            )}
            {tab === "orders" && (
              <ShipmentTable items={d.data.items} refresh={d.refresh} />
            )}{" "}
            {tab === "returns" && (
              <div className="panel table-wrap">
                <h2>Returns from your shop</h2>
                <p className="small muted">
                  Refund decisions are made by admins. This view includes only
                  your products.
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Reason</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.data.returns.map((r: Item) => (
                      <tr key={r.id}>
                        <td>{r.variant_snapshot.title}</td>
                        <td>{r.reason}</td>
                        <td>{money(r.amount_paise)}</td>
                        <td>{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!d.data.returns.length && (
                  <p className="muted space-top">No returns to review.</p>
                )}
              </div>
            )}{" "}
            {tab === "ledger" && (
              <section className="panel">
                <h2>A clear view of your sales</h2>
                <p className="muted">
                  Simulated seller ledger. No bank transfer or payout is made.
                </p>
                <div className="stats">
                  <div className="stat">
                    <strong>{money(d.data.stats.delivered_paise)}</strong>
                    <span>Delivered sales after discounts</span>
                  </div>
                  <div className="stat">
                    <strong>
                      {money(
                        d.data.returns
                          .filter((r: Item) => r.status === "refunded")
                          .reduce(
                            (s: number, r: Item) => s + Number(r.amount_paise),
                            0,
                          ),
                      )}
                    </strong>
                    <span>Recorded returns</span>
                  </div>
                  <div className="stat">
                    <strong>
                      {money(
                        Math.max(
                          0,
                          Number(d.data.stats.delivered_paise) -
                            d.data.returns
                              .filter((r: Item) => r.status === "refunded")
                              .reduce(
                                (s: number, r: Item) =>
                                  s + Number(r.amount_paise),
                                0,
                              ),
                        ),
                      )}
                    </strong>
                    <span>Simulated net amount</span>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Gross</th>
                        <th>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.data.items.map((i: Item) => (
                        <tr key={i.id}>
                          <td>{date(i.created_at)}</td>
                          <td>{i.variant_snapshot.title}</td>
                          <td>{i.quantity}</td>
                          <td>{money(i.unit_price_paise * i.quantity)}</td>
                          <td>{statusName(i.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}
      </State>
    </>
  );
}
function ProductEditor({
  product: p,
  categories,
  done,
  cancel,
}: {
  product: Item;
  categories: Item[];
  done: () => void;
  cancel: () => void;
}) {
  const [variants, setVariants] = useState<Item[]>(
      p.variants?.map((v: Item) => ({
        ...v,
        optionsText: Object.entries(v.options)
          .map(([k, val]) => k + ": " + val)
          .join(", "),
      })) || [
        {
          sku: "",
          price_paise: 99900,
          mrp_paise: 129900,
          stock: 10,
          optionsText: "color: Black",
        },
      ],
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const update = (n: number, k: string, value: any) =>
    setVariants((old) =>
      old.map((v, i) => (i === n ? { ...v, [k]: value } : v)),
    );
  return (
    <form
      className="panel editor space-top"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const f = new FormData(e.currentTarget),
            file = f.get("image") as File;
          const imageUrl = file?.size ? await upload(file) : p.image_url;
          await api("seller/products", "POST", {
            ...Object.fromEntries(f),
            id: p.id,
            imageUrl,
            variants: variants.map((v) => ({
              ...v,
              options: Object.fromEntries(
                v.optionsText
                  .split(",")
                  .map((x: string) => {
                    const [key, ...value] = x.split(":");
                    return [key.trim(), value.join(":").trim()];
                  })
                  .filter(([k, v]: string[]) => k && v),
              ),
            })),
          });
          done();
        } catch (e: any) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{p.id ? "Edit your find" : "Introduce a new find"}</h2>
      <div className="form-grid">
        <Field
          label="Product title"
          name="title"
          required
          defaultValue={p.title || ""}
          minLength={3}
          maxLength={150}
        />
        <Field
          label="Brand"
          name="brand"
          required
          defaultValue={p.brand || ""}
          minLength={2}
          maxLength={60}
        />
        <SelectField
          label="Category"
          name="categoryId"
          required
          defaultValue={p.category_id || ""}
        >
          <option value="" disabled>
            Choose a category
          </option>
          {categories
            .filter((c) => c.level === 3)
            .map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
        </SelectField>
        <SelectField
          label="Visibility"
          name="status"
          defaultValue={p.status || "draft"}
        >
          <option value="draft">Draft</option>
          <option value="live">Live</option>
          <option value="hidden">Hidden</option>
        </SelectField>
        <label className="field full-span">
          <span>Description</span>
          <textarea
            name="description"
            required
            defaultValue={p.description || ""}
            minLength={10}
            maxLength={5000}
          />
        </label>
        <Field
          label="Product photo (optional, under 5 MB)"
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
      </div>
      <h3>Variants & inventory</h3>
      <p className="small muted">
        Each SKU has its own price and available stock. Existing variants remain
        to preserve order history.
      </p>
      {variants.map((v, n) => (
        <div className="variant-editor" key={v.id || n}>
          <Field
            label="SKU"
            value={v.sku}
            required
            onChange={(e) => update(n, "sku", e.target.value)}
          />
          <Field
            label="Price (₹)"
            type="number"
            min={1}
            step="0.01"
            required
            value={Number(v.price_paise) / 100}
            onChange={(e) =>
              update(n, "price_paise", Math.round(Number(e.target.value) * 100))
            }
          />
          <Field
            label="MRP (₹)"
            type="number"
            min={Number(v.price_paise) / 100}
            step="0.01"
            required
            value={Number(v.mrp_paise) / 100}
            onChange={(e) =>
              update(n, "mrp_paise", Math.round(Number(e.target.value) * 100))
            }
          />
          <Field
            label="Stock"
            type="number"
            min={0}
            required
            value={v.stock}
            onChange={(e) => update(n, "stock", Number(e.target.value))}
          />
          <label className="field full-span">
            <span>Attributes (e.g. color: Black, size: M)</span>
            <input
              value={v.optionsText}
              onChange={(e) => update(n, "optionsText", e.target.value)}
            />
          </label>
        </div>
      ))}
      <button
        className="button secondary"
        type="button"
        disabled={variants.length >= 20}
        onClick={() =>
          setVariants((old) => [
            ...old,
            {
              sku: "",
              price_paise: 99900,
              mrp_paise: 129900,
              stock: 0,
              optionsText: "",
            },
          ])
        }
      >
        Add a variant
      </button>
      <ErrorText error={error} />
      <div className="row">
        <button className="button" disabled={busy}>
          {busy ? "Saving product…" : "Save product"}
        </button>
        <button type="button" className="button quiet" onClick={cancel}>
          Back to products
        </button>
      </div>
    </form>
  );
}
function parseCsv(content: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c === '"') {
      if (quoted && content[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && content[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (quoted) throw new Error("A CSV quote was left open.");
  const [header, ...data] = rows;
  return data.map((r) =>
    Object.fromEntries(header.map((h, n) => [h.trim(), r[n]?.trim() || ""])),
  );
}
function CsvImport({ done }: { done: () => void }) {
  const [result, setResult] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <details className="panel space-top">
      <summary style={{ cursor: "pointer" }}>Import products from CSV</summary>
      <p className="small muted space-top">
        Headers: title, brand, description, categoryId, sku, price, mrp, stock.
        Price and MRP are in rupees. Up to 50 products per file. Imported
        products start as drafts.
      </p>
      <input
        className="space-top"
        type="file"
        accept=".csv,text/csv"
        aria-label="Import products CSV"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setResult("");
          try {
            if (file.size > 1024 * 1024)
              throw new Error("Choose a CSV under 1 MB.");
            const rows = parseCsv(await file.text());
            if (rows.length > 50)
              throw new Error(
                "Split the CSV into files with at most 50 products.",
              );
            let success = 0;
            const errors = [];
            for (const [n, r] of rows.entries()) {
              try {
                await api("seller/products", "POST", {
                  ...r,
                  status: "draft",
                  variants: [
                    {
                      sku: r.sku,
                      price_paise: Math.round(Number(r.price) * 100),
                      mrp_paise: Math.round(Number(r.mrp) * 100),
                      stock: Number(r.stock),
                      options: {},
                    },
                  ],
                });
                success++;
              } catch (e: any) {
                errors.push(`Row ${n + 2}: ${e.message}`);
              }
            }
            setResult(`${success} products imported. ${errors.join(" ")}`);
            done();
          } catch (e: any) {
            setResult(e.message);
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      <p className="small muted space-top" role="status">
        {busy ? "Importing rows…" : result}
      </p>
    </details>
  );
}
export function ShipmentTable({
  items,
  refresh,
  admin = false,
}: {
  items: Item[];
  refresh: () => void;
  admin?: boolean;
}) {
  const { setNotice } = useStore(),
    [busy, setBusy] = useState(""),
    [tracking, setTracking] = useState<Record<string, string>>({});
  return (
    <div className="panel table-wrap">
      <h2>Orders to move along</h2>
      <p className="small muted">
        Shipping is simulated. Advance one step at a time; enter a tracking ID
        when shipping.
      </p>
      <table>
        <thead>
          <tr>
            <th>Order & product</th>
            <th>Destination</th>
            <th>State</th>
            <th>Next step</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td data-label="Order & product">
                <strong>{i.variant_snapshot.title}</strong>
                <span className="muted">
                  Order {i.order_id.slice(0, 8)} · Qty {i.quantity} ·{" "}
                  {money(i.unit_price_paise * i.quantity)}
                </span>
              </td>
              <td data-label="Destination">
                {i.address_snapshot?.name}
                <br />
                {i.address_snapshot?.city} {i.address_snapshot?.pincode}
              </td>
              <td data-label="State">
                {statusName(i.status)}
                {i.tracking_id && (
                  <small style={{ display: "block" }}>{i.tracking_id}</small>
                )}
              </td>
              <td data-label="Next step">
                {nextStatus[i.status] && (
                  <div className="stack" style={{ gap: 8 }}>
                    {i.status === "packed" && (
                      <input
                        placeholder="Tracking ID"
                        aria-label={"Tracking ID for " + i.id}
                        value={tracking[i.id] || ""}
                        onChange={(e) =>
                          setTracking({ ...tracking, [i.id]: e.target.value })
                        }
                      />
                    )}
                    <button
                      className="button secondary small"
                      disabled={busy === i.id}
                      onClick={async () => {
                        setBusy(i.id);
                        try {
                          await api(
                            admin ? "admin/orders" : "seller/orders",
                            "POST",
                            {
                              orderItemId: i.id,
                              newStatus: nextStatus[i.status],
                              trackingId: tracking[i.id],
                            },
                          );
                          refresh();
                        } catch (e: any) {
                          setNotice(e.message);
                        } finally {
                          setBusy("");
                        }
                      }}
                    >
                      {busy === i.id
                        ? "Updating…"
                        : "Mark " + statusName(nextStatus[i.status])}
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && <p className="muted space-top">No order items yet.</p>}
    </div>
  );
}
export function AdminScreen() {
  const { logout, user } = useStore();
  return (
    <div className="owner-surface">
      <OwnerBar onSignOut={user?.role === "admin" ? logout : undefined} />
      <div className="page admin-console">
        <AuthGate role="admin">
          <AdminWorkspace />
        </AuthGate>
      </div>
    </div>
  );
}
const adminSections = ["overview", "users", "sellers", "moderation", "promotions", "orders", "support", "audit"] as const;
const adminDescriptions: Record<string, string> = {
  overview: "The shop's current activity and work awaiting review.",
  users: "Accounts and their access state.",
  sellers: "Shop approvals and seller verification.",
  moderation: "Catalogue visibility and reported reviews.",
  promotions: "Coupons, deals, banners and departments.",
  orders: "Orders, fulfilment and return decisions.",
  support: "Customer conversations needing a response.",
  audit: "A record of privileged changes.",
};
function AdminWorkspace() {
  const [tab, setTab] = useState("overview"),
    [menuOpen, setMenuOpen] = useState(false),
    [visible, setVisible] = useState(30),
    [orderId, setOrderId] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState("");
  const d = useData(tab === "support" ? null : "admin/" + tab),
    detail = useData(orderId ? "orders/" + orderId : null),
    { setNotice } = useStore();
  const switchTab = (section: string) => {
    setTab(section);
    setMenuOpen(false);
    setVisible(30);
    setOrderId("");
    setError("");
  };
  const mutate = async (section: string, b: Item) => {
    setBusy(b.id || b.sellerId || b.returnId || "form");
    setError("");
    try {
      await api("admin/" + section, "POST", b);
      d.refresh();
      setNotice("Changes saved.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <div className="page-title row between admin-heading">
        <div>
          <h1>{tab[0].toUpperCase() + tab.slice(1)}</h1>
          <p>{adminDescriptions[tab]}</p>
        </div>
        <button className="button quiet small" type="button" onClick={d.refresh} disabled={d.loading}>
          <ArrowClockwise size={17} />
          {d.loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      <div className="admin-section-picker" onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}>
        <span>Section</span>
        <button className="admin-current-section" type="button" aria-expanded={menuOpen} aria-controls="admin-section-menu" onClick={() => setMenuOpen(!menuOpen)}>
          {tab[0].toUpperCase() + tab.slice(1)} <CaretDown size={18} aria-hidden="true" />
        </button>
        {menuOpen && <div id="admin-section-menu" className="admin-section-menu">
          {adminSections.map((section) => <button key={section} type="button" className={tab === section ? "active" : ""} aria-current={tab === section ? "page" : undefined} onClick={() => switchTab(section)}>{section[0].toUpperCase() + section.slice(1)}</button>)}
        </div>}
      </div>
      <nav className="tabs admin-tabs" aria-label="Owner sections">
        {adminSections.map((t) => (
          <button
            className={t === tab ? "active" : ""}
            key={t}
            type="button"
            aria-pressed={t === tab}
            onClick={() => switchTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
      <ErrorText error={error} />
      {tab === "support" ? (
        <SupportWorkspace />
      ) : (
        <State loading={d.loading && !d.data} error={d.error} retry={d.refresh}>
          {d.data && (
            <>
              {tab === "overview" && (
                <>
                  <div className="stats admin-stats">
                    {Object.entries(d.data.stats || {}).map(([k, v]) => (
                      <div className="stat" key={k}>
                        <strong>
                          {k === "delivered_paise" ? money(v) : String(v)}
                        </strong>
                        <span>
                          {k === "delivered_paise"
                            ? "Delivered sales"
                            : statusName(k).replace(/^./, (letter) => letter.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                  <section className="admin-worklist" aria-label="Needs attention">
                    <h2>Needs attention</h2>
                    <button type="button" onClick={() => switchTab("sellers")}>
                      <span>Seller approvals</span><strong>{d.data.stats?.pending_sellers ?? 0}</strong>
                      <ArrowRight size={18} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => switchTab("support")}>
                      <span>Open support tickets</span><strong>{d.data.stats?.tickets ?? 0}</strong>
                      <ArrowRight size={18} aria-hidden="true" />
                    </button>
                  </section>
                  <p className="admin-demo-note">Demo payments and delivery are simulated. Changes to the shop are recorded in the audit log.</p>
                </>
              )}
              {tab === "users" && (
                <div className="panel table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.data.users?.slice(0, visible).map((u: Item) => (
                        <tr key={u.id}>
                          <td data-label="Name">{u.name}</td>
                          <td data-label="Email">{u.email}</td>
                          <td data-label="Role">{u.role}</td>
                          <td data-label="Joined">{date(u.created_at)}</td>
                          <td data-label="State">{u.deleted_at ? "Deleted" : "Active"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {d.data.users?.length > visible && <button className="button quiet small admin-show-more" onClick={() => setVisible(visible + 30)}>Show more users ({visible} of {d.data.users.length})</button>}
                </div>
              )}
              {tab === "sellers" && (
                <div className="panel table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Shop & owner</th>
                        <th>KYC</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.data.sellers?.map((s: Item) => (
                        <tr key={s.id}>
                          <td data-label="Shop & owner">
                            <strong>{s.shop_name}</strong>
                            {s.owner_name}
                            <br />
                            <span className="muted">
                              {s.email} · {s.product_count} products
                            </span>
                          </td>
                          <td data-label="KYC">
                            {s.kyc_data?.businessType || "No details yet"}
                            <br />
                            {s.kyc_data?.pan || ""}
                            {s.kyc_data?.document && (
                              <>
                              <br />
                              <a
                                href={s.kyc_data.document}
                                className="text-link"
                                target="_blank"
                                rel="noreferrer"
                              >
                                View uploaded document
                              </a>
                              </>
                            )}
                          </td>
                          <td data-label="Status">{s.status}</td>
                          <td data-label="Actions">
                            {["approved", "suspended", "pending"]
                              .filter((v) => v !== s.status)
                              .map((status) => (
                                <button
                                  key={status}
                                  className="button secondary small"
                                  disabled={busy === s.id}
                                  onClick={() =>
                                    mutate("sellers", {
                                      sellerId: s.id,
                                      status,
                                    })
                                  }
                                >
                                  {status === "approved"
                                    ? "Approve"
                                    : status === "suspended"
                                      ? "Suspend"
                                      : "Mark pending"}
                                </button>
                              ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {tab === "moderation" && (
                <>
                  <div className="panel table-wrap">
                    <h2>Catalogue visibility</h2>
                    <table>
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Shop</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.data.products?.slice(0, visible).map((p: Item) => (
                          <tr key={p.id}>
                            <td data-label="Product">{p.title}</td>
                            <td data-label="Shop">{p.shop_name}</td>
                            <td data-label="Status">{p.status}</td>
                            <td data-label="Actions">
                              <button
                                className="button secondary small"
                                disabled={busy === p.id}
                                onClick={() =>
                                  mutate("moderation", {
                                    id: p.id,
                                    type: "product",
                                    status:
                                      p.status === "live" ? "hidden" : "live",
                                  })
                                }
                              >
                                {p.status === "live" ? "Hide" : "Publish"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {d.data.products?.length > visible && <button className="button quiet small admin-show-more" onClick={() => setVisible(visible + 30)}>Show more products ({visible} of {d.data.products.length})</button>}
                  </div>
                  <div className="panel table-wrap space-top">
                    <h2>Reviews needing a look</h2>
                    <table>
                      <thead>
                        <tr>
                          <th>Product & review</th>
                          <th>Status</th>
                          <th>Decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.data.reviews?.map((r: Item) => (
                          <tr key={r.id}>
                            <td data-label="Product & review">
                              <strong>{r.title}</strong>
                              {r.text}
                            </td>
                            <td data-label="Status">{r.status}</td>
                            <td data-label="Decision">
                              {["approved", "rejected"].map((status) => (
                                <button
                                  className="button secondary small"
                                  key={status}
                                  disabled={busy === r.id}
                                  onClick={() =>
                                    mutate("moderation", {
                                      id: r.id,
                                      type: "review",
                                      status,
                                    })
                                  }
                                >
                                  {status === "approved" ? "Approve" : "Reject"}
                                </button>
                              ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!d.data.reviews?.length && (
                      <p className="muted space-top">
                        No reviews waiting for moderation.
                      </p>
                    )}
                  </div>
                </>
              )}
              {tab === "orders" && (
                <>
                  <div className="panel table-wrap">
                    <h2>Orders across the shop</h2>
                    <table>
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>State</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.data.orders?.map((o: Item) => (
                          <tr key={o.id}>
                            <td data-label="Order">
                              {o.id.slice(0, 8)}
                              <br />
                              {date(o.created_at)}
                            </td>
                            <td data-label="Customer">
                              {o.customer_name}
                              <br />
                              {o.customer_email}
                            </td>
                            <td data-label="Total">{money(o.total_paise)}</td>
                            <td data-label="State">{statusName(o.status)}</td>
                            <td data-label="Details">
                              <button
                                className="button secondary small"
                                onClick={() =>
                                  setOrderId(orderId === o.id ? "" : o.id)
                                }
                              >
                                View items
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {orderId && (
                    <div className="space-top">
                      <State
                        loading={detail.loading}
                        error={detail.error}
                        retry={detail.refresh}
                      >
                        {detail.data && (
                          <ShipmentTable
                            admin
                            items={detail.data.items.map((i: Item) => ({
                              ...i,
                              address_snapshot:
                                detail.data.order.address_snapshot,
                              order_status: detail.data.order.status,
                            }))}
                            refresh={() => {
                              detail.refresh();
                              d.refresh();
                            }}
                          />
                        )}
                      </State>
                    </div>
                  )}
                  <div className="panel table-wrap space-top">
                    <h2>Return decisions</h2>
                    <table>
                      <thead>
                        <tr>
                          <th>Product & reason</th>
                          <th>Photos</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Decision</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.data.returns?.map((r: Item) => (
                          <tr key={r.id}>
                            <td data-label="Product & reason">
                              <strong>{r.variant_snapshot.title}</strong>
                              {r.reason}
                            </td>
                            <td data-label="Photos">
                              <div className="row">
                                {r.photos?.map((url: string) => (
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    key={url}
                                  >
                                    <img
                                      src={url}
                                      alt="Return evidence"
                                      style={{
                                        width: 50,
                                        height: 50,
                                        objectFit: "cover",
                                        borderRadius: 5,
                                      }}
                                    />
                                  </a>
                                ))}
                              </div>
                            </td>
                            <td data-label="Amount">{money(r.amount_paise)}</td>
                            <td data-label="Status">{r.status}</td>
                            <td data-label="Decision">
                              {["requested", "pending"].includes(r.status) &&
                                ["approve", "reject"].map((action) => (
                                  <button
                                    className="button secondary small"
                                    key={action}
                                    disabled={busy === r.id}
                                    onClick={() =>
                                      mutate("orders", {
                                        returnId: r.id,
                                        action,
                                      })
                                    }
                                  >
                                    {action === "approve"
                                      ? "Approve refund"
                                      : "Reject"}
                                  </button>
                                ))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!d.data.returns?.length && (
                      <p className="muted space-top">No return requests yet.</p>
                    )}
                  </div>
                </>
              )}
              {tab === "promotions" && (
                <PromotionPanel
                  data={d.data}
                  mutate={(b) => mutate("promotions", b)}
                  busy={!!busy}
                />
              )}{" "}
              {tab === "audit" && (
                <div className="panel table-wrap">
                  <h2>The shop’s paper trail</h2>
                  <p className="small muted">
                    Append-only history of privileged changes.
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>When</th>
                        <th>Role</th>
                        <th>Action</th>
                        <th>Record</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.data.logs?.slice(0, visible).map((l: Item) => (
                        <tr key={l.id}>
                          <td data-label="When">{date(l.created_at)}</td>
                          <td data-label="Role">{l.actor_role}</td>
                          <td data-label="Action">{l.action}</td>
                          <td data-label="Record">
                            {l.target_type} · {l.target_id?.slice(0, 8)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {d.data.logs?.length > visible && <button className="button quiet small admin-show-more" onClick={() => setVisible(visible + 30)}>Show more activity ({visible} of {d.data.logs.length})</button>}
                </div>
              )}
            </>
          )}
        </State>
      )}
    </>
  );
}
function PromotionPanel({
  data,
  mutate,
  busy,
}: {
  data: Item;
  mutate: (b: Item) => Promise<void>;
  busy: boolean;
}) {
  const [type, setType] = useState("coupon"),
    [edit, setEdit] = useState<Item | null>(null);
  return (
    <div className="stack">
      <div className="panel">
        <h2>Give the shop something fresh</h2>
        <div className="tabs">
          {["coupon", "deal", "banner", "category"].map((t) => (
            <button
              className={type === t ? "active" : ""}
              key={t}
              onClick={() => {
                setType(t);
                setEdit(null);
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <form
          className="form-grid"
          key={type + "-" + (edit?.id || "new")}
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const fields = Object.fromEntries(form);
            await mutate({
              ...fields,
              id: edit?.id,
              type,
              is_active: fields.is_active === "on",
            });
          }}
        >
          {type === "coupon" && (
            <>
              <Field
                label="Coupon code"
                name="code"
                required
                defaultValue={edit?.code || ""}
                maxLength={30}
              />
              <SelectField
                label="Discount type"
                name="discount_type"
                defaultValue={edit?.discount_type || "percent"}
              >
                <option value="percent">Percent</option>
                <option value="flat">Flat (paise)</option>
              </SelectField>
              <Field
                label="Discount value"
                name="discount_value"
                type="number"
                min={1}
                required
                defaultValue={edit?.discount_value || 10}
              />
              <Field
                label="Minimum cart (paise)"
                name="min_cart_paise"
                type="number"
                min={0}
                defaultValue={edit?.min_cart_paise || 0}
              />
              <Field
                label="Total usage limit"
                name="usage_limit"
                type="number"
                min={1}
                defaultValue={edit?.usage_limit || 100}
              />
              <Field
                label="Uses per customer"
                name="per_user_limit"
                type="number"
                min={1}
                defaultValue={edit?.per_user_limit || 1}
              />
              <Field
                label="Expires at"
                name="expires_at"
                type="datetime-local"
                required
                defaultValue={edit?.expires_at?.slice(0, 16) || ""}
              />
            </>
          )}
          {type === "deal" && (
            <>
              <Field
                label="Variant ID (from product editor)"
                name="variant_id"
                required
                defaultValue={edit?.variant_id || ""}
              />
              <Field
                label="Deal price (paise)"
                name="deal_price_paise"
                type="number"
                min={100}
                required
                defaultValue={edit?.deal_price_paise || ""}
              />
              <Field
                label="Quantity cap"
                name="quantity_cap"
                type="number"
                min={1}
                defaultValue={edit?.quantity_cap || 50}
              />
              <Field
                label="Ends at"
                name="ends_at"
                type="datetime-local"
                required
                defaultValue={edit?.ends_at?.slice(0, 16) || ""}
              />
            </>
          )}
          {type === "banner" && (
            <>
              <Field
                label="Title"
                name="title"
                required
                defaultValue={edit?.title || ""}
              />
              <Field
                label="Image path"
                name="image_url"
                required
                defaultValue={edit?.image_url || "/photos/banner1.webp"}
              />
              <Field
                label="Destination path"
                name="link_url"
                required
                defaultValue={edit?.link_url || "/deals"}
              />
              <Field
                label="Display order"
                name="sort_order"
                type="number"
                min={0}
                defaultValue={edit?.sort_order || 0}
              />
              <label className="row">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={edit?.is_active !== false}
                />
                Active
              </label>
            </>
          )}
          {type === "category" && (
            <>
              <Field
                label="Category name"
                name="name"
                required
                defaultValue={edit?.name || ""}
              />
              <Field
                label="URL slug"
                name="slug"
                required
                defaultValue={edit?.slug || ""}
              />
              <Field
                label="Level (1–3)"
                name="level"
                type="number"
                min={1}
                max={3}
                defaultValue={edit?.level || 1}
              />
              <SelectField
                label="Parent"
                name="parent_id"
                defaultValue={edit?.parent_id || ""}
              >
                <option value="">No parent (level 1)</option>
                {data.categories
                  .filter((c: Item) => c.level < 3)
                  .map((c: Item) => (
                    <option value={c.id} key={c.id}>
                      {c.name} · level {c.level}
                    </option>
                  ))}
              </SelectField>
            </>
          )}
          <div className="full-span row">
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : edit ? "Save changes" : "Create " + type}
            </button>
            {edit && (
              <button
                className="button quiet"
                type="button"
                onClick={() => setEdit(null)}
              >
                New {type}
              </button>
            )}
          </div>
        </form>
      </div>
      <div className="panel table-wrap">
        <h2>{type[0].toUpperCase() + type.slice(1)}s</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Details</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {(data[type === "category" ? "categories" : type + "s"] || []).map(
              (r: Item) => (
                <tr key={r.id}>
                  <td data-label="Name">{r.code || r.title || r.name}</td>
                  <td data-label="Details">
                    {type === "coupon"
                      ? `${r.used_count} used · ${r.discount_type === "percent" ? r.discount_value + "%" : money(r.discount_value)}`
                      : type === "deal"
                        ? money(r.deal_price_paise) +
                          " · ends " +
                          date(r.ends_at)
                        : type === "banner"
                          ? (r.is_active ? "Active" : "Hidden") +
                            " · order " +
                            r.sort_order
                          : "Level " + r.level + " · " + r.slug}
                  </td>
                  <td data-label="Edit">
                    <button
                      className="button secondary small"
                      onClick={() => {
                        setEdit(r);
                        window.scrollTo({ top: 150, behavior: "smooth" });
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
