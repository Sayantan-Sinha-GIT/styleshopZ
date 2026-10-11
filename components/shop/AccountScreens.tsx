"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Package,
  Heart,
  MapPin,
  UserCircle,
  ChatCircle,
  Sliders,
  SignOut,
  ArrowRight,
  DownloadSimple,
  Storefront,
  Bell,
} from "@phosphor-icons/react";
import {
  api,
  useStore,
  useData,
  AuthGate,
  State,
  Empty,
  Field,
  SelectField,
  ErrorText,
  date,
  money,
  type Item,
} from "./Store";

export function LoginScreen() {
  const params = useSearchParams(),
    { setUser, setNotice } = useStore();
  const [mode, setMode] = useState(
      params.get("signup") ? "signup" : params.get("reset") ? "reset" : "login",
    ),
    [role, setRole] = useState("customer"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState("");
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (mode === "forgot" || mode === "reset") {
        const r = await api("auth/reset", "POST", {
          ...fields,
          token: mode === "reset" ? params.get("reset") : undefined,
        });
        setSuccess(r.message || "Password updated. You can sign in now.");
        if (mode === "reset") setMode("login");
        return;
      }
      const r = await api(
        "auth/" + (mode === "signup" ? "register" : "login"),
        "POST",
        { ...fields, role },
      );
      setUser(r.user);
      try {
        const guest = JSON.parse(
          localStorage.getItem("styleshopz.guest.v2") || "[]",
        );
        if (guest.length) {
          await api("cart", "POST", { items: guest });
          localStorage.removeItem("styleshopz.guest.v2");
        }
      } catch {
        setNotice(
          "Some guest items could not be merged. Your saved guest bag is still on this device.",
        );
      }
      const next = params.get("next");
      location.assign(
        next?.startsWith("/") && !next.startsWith("//")
          ? next
          : r.user.role === "seller"
            ? "/seller"
            : r.user.role === "admin"
              ? "/admin"
              : "/",
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="auth-wrap">
      <div className="auth-picture">
        <img src="/photos/banner1.webp" alt="Headphones in soft studio light" />
        <h2>Good finds start here.</h2>
        <p>One account for your bag, orders and saved favourites.</p>
      </div>
      <div className="auth-form">
        <h1>
          {mode === "signup"
            ? "Make yourself at home"
            : mode === "forgot"
              ? "Forgot your password?"
              : mode === "reset"
                ? "Choose a new password"
                : "Welcome back"}
        </h1>
        <p className="muted small">
          {mode === "signup"
            ? "Create your styleshopZ account."
            : "Your everyday finds are waiting."}
        </p>
        {!["forgot", "reset"].includes(mode) && (
          <div className="tabs" style={{ margin: 0 }}>
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              className={mode === "signup" ? "active" : ""}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Create account
            </button>
          </div>
        )}
        <form onSubmit={submit}>
          {mode === "signup" && (
            <Field
              label="Your name"
              name="name"
              required
              autoComplete="name"
              minLength={2}
              maxLength={100}
            />
          )}{" "}
          {mode !== "reset" && (
            <Field
              label="Email address"
              name="email"
              required
              type="email"
              autoComplete="email"
              maxLength={254}
            />
          )}{" "}
          {mode !== "forgot" && (
            <Field
              label="Password"
              name="password"
              required
              type="password"
              minLength={8}
              maxLength={72}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
          )}{" "}
          {mode === "signup" && (
            <>
              <SelectField
                label="I’m here to"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="customer">Shop</option>
                <option value="seller">Open a seller shop</option>
              </SelectField>
              {role === "seller" && (
                <Field
                  label="Shop name"
                  name="shopName"
                  required
                  minLength={2}
                  maxLength={100}
                />
              )}
              <p className="small muted">
                By creating an account, you agree to the{" "}
                <Link className="text-link" href="/terms">
                  terms
                </Link>{" "}
                and{" "}
                <Link className="text-link" href="/privacy">
                  privacy policy
                </Link>
                .
              </p>
            </>
          )}
          <ErrorText error={error} />
          {success && (
            <p className="success" role="status">
              {success}
            </p>
          )}
          <button className="button full" disabled={busy}>
            {busy
              ? "One moment…"
              : mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : mode === "reset"
                    ? "Update password"
                    : "Sign in"}
            <ArrowRight size={18} />
          </button>
        </form>
        {mode === "login" && (
          <button
            className="text-link small"
            style={{ background: "none", border: 0, color: "var(--dim)" }}
            onClick={() => {
              setMode("forgot");
              setError("");
            }}
          >
            Forgot your password?
          </button>
        )}
        {mode === "forgot" && (
          <button
            className="button quiet small"
            onClick={() => setMode("login")}
          >
            Back to sign in
          </button>
        )}
        <p className="small muted">
          Demonstration shop · Your details stay within this app.
        </p>
      </div>
    </div>
  );
}
export function AccountScreen() {
  const { user, logout, config } = useStore();
  const links = [
    {
      href: "/orders",
      icon: Package,
      title: "Your orders",
      copy: "Track, return or buy again.",
    },
    {
      href: "/wishlists",
      icon: Heart,
      title: "Saved finds",
      copy: "Keep a good thing in mind.",
    },
    {
      href: "/addresses",
      icon: MapPin,
      title: "Your addresses",
      copy: "A place for every delivery.",
    },
    {
      href: "/profile",
      icon: UserCircle,
      title: "Your profile",
      copy: "Name, phone and account details.",
    },
    {
      href: "/notifications",
      icon: Bell,
      title: "Notifications",
      copy: "Updates from the shop.",
    },
    {
      href: "/support",
      icon: ChatCircle,
      title: "Here to help",
      copy: "Your tickets and conversations.",
    },
    {
      href: "/settings",
      icon: Sliders,
      title: "Settings",
      copy: "Language, preferences and privacy.",
    },
  ];
  return (
    <div className="page">
      <AuthGate>
        <div className="page-title row between">
          <div>
            <h1>Your little corner of the shop</h1>
            <p>Hello, {user?.name}. Make yourself at home.</p>
          </div>
          <button className="button quiet" onClick={logout}>
            <SignOut size={18} />
            Sign out
          </button>
        </div>
        <div className="account-grid">
          {links.map(({ href, icon: Icon, title, copy }) => (
            <Link className="account-tile" key={href} href={href}>
              <Icon size={29} weight="light" />
              <h2>{title}</h2>
              <p className="muted">{copy}</p>
            </Link>
          ))}
          {user?.role !== "customer" && (
            <Link className="account-tile" href={"/" + user?.role}>
              <Storefront size={29} />
              <h2>{user?.role === "admin" ? "Admin" : "Seller"} workspace</h2>
              <p className="muted">Manage your side of the shop.</p>
            </Link>
          )}
        </div>
        {config.demo && (
          <p className="small muted space-top">
            This deployment is in demo mode. No money is charged, and shipments
            are simulated.
          </p>
        )}
      </AuthGate>
    </div>
  );
}
export function ProfileScreen() {
  return (
    <div className="page narrow">
      <AuthGate>
        <ProfileForm />
      </AuthGate>
    </div>
  );
}
function ProfileForm() {
  const d = useData("profile"),
    { setUser, setNotice } = useStore(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <div className="page-title">
        <h1>The details that make you, you</h1>
      </div>
      <State loading={d.loading} error={d.error} retry={d.refresh}>
        {d.data && (
          <form
            className="panel stack"
            key={d.data.user.updated_at}
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const data = Object.fromEntries(new FormData(e.currentTarget));
                await api("profile", "PATCH", {
                  ...data,
                  preferences: d.data.user.preferences,
                });
                setUser({ ...d.data.user, ...data });
                setNotice("Profile updated.");
                d.refresh();
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field
              label="Full name"
              name="name"
              required
              defaultValue={d.data.user.name}
              minLength={2}
              maxLength={100}
            />
            <Field label="Email" value={d.data.user.email} readOnly />
            <Field
              label="Mobile number"
              name="phone"
              defaultValue={d.data.user.phone || ""}
              placeholder="10-digit Indian mobile number"
              type="tel"
            />
            <ErrorText error={error} />
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
            <a className="button secondary" href="/api/account/export">
              <DownloadSimple size={18} />
              Download your data
            </a>
          </form>
        )}
      </State>
    </>
  );
}
export function AddressesScreen() {
  return (
    <div className="page narrow">
      <AuthGate>
        <AddressBook />
      </AuthGate>
    </div>
  );
}
export function AddressFields({ value = {} }: { value?: Item }) {
  return (
    <div className="form-grid">
      <Field
        label="Full name"
        name="name"
        required
        defaultValue={value.name || ""}
        minLength={2}
        maxLength={100}
        autoComplete="name"
      />
      <Field
        label="Mobile number"
        name="phone"
        type="tel"
        required
        defaultValue={value.phone || ""}
        autoComplete="tel"
      />
      <label className="field full-span">
        <span>Address line 1</span>
        <input
          name="line1"
          required
          defaultValue={value.line1 || ""}
          minLength={5}
          maxLength={200}
          autoComplete="address-line1"
        />
      </label>
      <label className="field full-span">
        <span>Address line 2 (optional)</span>
        <input
          name="line2"
          defaultValue={value.line2 || ""}
          maxLength={200}
          autoComplete="address-line2"
        />
      </label>
      <Field
        label="City"
        name="city"
        required
        defaultValue={value.city || ""}
        maxLength={80}
        autoComplete="address-level2"
      />
      <Field
        label="State"
        name="state"
        required
        defaultValue={value.state || ""}
        maxLength={80}
        autoComplete="address-level1"
      />
      <Field
        label="Pincode"
        name="pincode"
        required
        defaultValue={value.pincode || ""}
        pattern="[1-9][0-9]{5}"
        maxLength={6}
        inputMode="numeric"
        autoComplete="postal-code"
      />
    </div>
  );
}
function AddressBook() {
  const d = useData("profile"),
    [editing, setEditing] = useState<Item | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    { setNotice } = useStore();
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(e.currentTarget);
      await api("addresses", "POST", {
        ...Object.fromEntries(form),
        id: editing?.id,
        is_default: form.get("default") === "on",
      });
      setEditing(null);
      d.refresh();
      setNotice("Address saved.");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-title row between">
        <h1>A place for every delivery</h1>
        <button className="button secondary" onClick={() => setEditing({})}>
          Add address
        </button>
      </div>
      <State loading={d.loading} error={d.error} retry={d.refresh}>
        <div className="form-grid">
          {d.data?.addresses.map((a: Item) => (
            <div className="address-card" key={a.id}>
              <div className="row between">
                <strong>{a.name}</strong>
                {a.is_default && <span className="badge">Default</span>}
              </div>
              <p>
                {a.line1}
                <br />
                {a.line2 && (
                  <>
                    {a.line2}
                    <br />
                  </>
                )}
                {a.city}, {a.state} – {a.pincode}
                <br />
                {a.phone}
              </p>
              <div className="row">
                <button
                  className="button quiet small"
                  onClick={() => setEditing(a)}
                >
                  Edit
                </button>
                <button
                  className="button quiet small"
                  onClick={() =>
                    api("addresses?id=" + a.id, "DELETE")
                      .then(d.refresh)
                      .catch((e) => setNotice(e.message))
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        {!d.data?.addresses.length && !editing && (
          <Empty
            title="Where should your finds arrive?"
            link="#address-form"
            label="Add your first address"
          >
            Save up to ten delivery addresses.
          </Empty>
        )}
      </State>
      {(editing || (!d.loading && !d.data?.addresses.length)) && (
        <form
          id="address-form"
          className="panel stack space-top"
          onSubmit={submit}
          key={editing?.id || "new"}
        >
          <h2>{editing?.id ? "Edit address" : "Add address"}</h2>
          <AddressFields value={editing || {}} />
          <label className="row small">
            <input
              type="checkbox"
              name="default"
              defaultChecked={!!editing?.is_default}
            />
            Use as my default address
          </label>
          <ErrorText error={error} />
          <div className="row">
            <button className="button" disabled={busy}>
              {busy ? "Saving…" : "Save address"}
            </button>
            {editing && (
              <button
                className="button quiet"
                type="button"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </>
  );
}
export function WishlistScreen() {
  return (
    <div className="page">
      <AuthGate>
        <Wishlists />
      </AuthGate>
    </div>
  );
}
function Wishlists() {
  const d = useData("wishlists"),
    { add, setNotice } = useStore(),
    [selected, setSelected] = useState(""),
    [name, setName] = useState("");
  return (
    <>
      <div className="page-title">
        <h1>Good things, saved for later</h1>
        <p>A place for the finds you don’t want to forget.</p>
      </div>
      <State loading={d.loading} error={d.error} retry={d.refresh}>
        <div className="tabs">
          <button
            className={!selected ? "active" : ""}
            onClick={() => setSelected("")}
          >
            All saved
          </button>
          {d.data?.lists.map((l: Item) => (
            <button
              className={selected === l.id ? "active" : ""}
              key={l.id}
              onClick={() => setSelected(l.id)}
            >
              {l.name}
            </button>
          ))}
        </div>
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api("wishlists", "POST", { name });
              setName("");
              d.refresh();
            } catch (e: any) {
              setNotice(e.message);
            }
          }}
        >
          <input
            aria-label="New wishlist name"
            placeholder="Name a new list"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            style={{ maxWidth: 300 }}
          />
          <button className="button secondary">Create list</button>
          {selected && (
            <button
              className="button quiet"
              type="button"
              onClick={() =>
                api("wishlists?list=" + selected, "DELETE")
                  .then(() => {
                    setSelected("");
                    d.refresh();
                  })
                  .catch((e) => setNotice(e.message))
              }
            >
              Delete selected list
            </button>
          )}
        </form>
        <div className="product-grid space-top">
          {d.data?.items
            .filter((i: Item) => !selected || i.wishlist_id === selected)
            .map((i: Item) => (
              <article className="panel stack" key={i.id}>
                <Link href={"/products/" + i.product_id}>
                  <img
                    src={i.image_url}
                    alt={i.title}
                    style={{
                      aspectRatio: "1.2",
                      width: "100%",
                      objectFit: "cover",
                      borderRadius: 7,
                    }}
                  />
                  <h2 style={{ fontSize: 20, marginTop: 15 }}>{i.title}</h2>
                </Link>
                <span>{money(i.price_paise)}</span>
                <span className="small muted">
                  {i.list_name} · {i.stock > 0 ? "In stock" : "Out of stock"}
                </span>
                <button
                  className="button"
                  disabled={!i.stock}
                  onClick={() =>
                    add(i.variant_id)
                      .then(() => api("wishlists?id=" + i.id, "DELETE"))
                      .then(d.refresh)
                      .catch((e: any) => setNotice(e.message))
                  }
                >
                  Move to bag
                </button>
                <button
                  className="button quiet small"
                  onClick={() =>
                    api("wishlists?id=" + i.id, "DELETE")
                      .then(d.refresh)
                      .catch((e) => setNotice(e.message))
                  }
                >
                  Remove
                </button>
              </article>
            ))}
        </div>
        {!d.data?.items.filter(
          (i: Item) => !selected || i.wishlist_id === selected,
        ).length && (
          <Empty title="Leave a little room for a good find">
            Tap the heart on a product to save it here.
          </Empty>
        )}
      </State>
    </>
  );
}
export function NotificationsScreen() {
  return (
    <div className="page narrow">
      <AuthGate>
        <Notifications />
      </AuthGate>
    </div>
  );
}
function Notifications() {
  const d = useData("notifications"),
    { setNotice } = useStore();
  return (
    <>
      <div className="page-title row between">
        <h1>A word from the shop</h1>
        <button
          className="button secondary small"
          onClick={() =>
            api("notifications", "PATCH", {})
              .then(d.refresh)
              .catch((e) => setNotice(e.message))
          }
        >
          Mark all as read
        </button>
      </div>
      <State loading={d.loading} error={d.error} retry={d.refresh}>
        <div className="stack">
          {d.data?.notifications.map((n: Item) => (
            <button
              className="panel"
              style={{ textAlign: "left", color: "var(--text)" }}
              key={n.id}
              onClick={() =>
                api("notifications", "PATCH", { id: n.id })
                  .then(d.refresh)
                  .catch((e) => setNotice(e.message))
              }
            >
              <div className="row between">
                <strong>{n.title}</strong>
                {!n.is_read && <span className="badge">New</span>}
              </div>
              <p className="muted" style={{ margin: "8px 0" }}>
                {n.body}
              </p>
              <span className="small muted">{date(n.created_at)}</span>
            </button>
          ))}
        </div>
        {!d.data?.notifications.length && (
          <Empty title="All quiet for now">
            Order and support updates will appear here.
          </Empty>
        )}
      </State>
    </>
  );
}
export function SettingsScreen() {
  return (
    <div className="page narrow">
      <AuthGate>
        <Settings />
      </AuthGate>
    </div>
  );
}
function Settings() {
  const { user, language, switchLanguage, setNotice } = useStore(),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState(false),
    [confirmation, setConfirmation] = useState("");
  return (
    <>
      <div className="page-title">
        <h1>Make it feel like yours</h1>
      </div>
      <div className="stack">
        <section className="panel">
          <h2>Language & display</h2>
          <SelectField
            label="Navigation language"
            value={language}
            onChange={(e) => switchLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
          </SelectField>
          <p className="small muted space-top">
            Product descriptions and support content stay in the language they
            were written. Use the sun/moon control in the header to change the
            theme.
          </p>
        </section>
        <form
          className="panel stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            try {
              await api("profile", "PATCH", {
                name: user.name,
                phone: user.phone,
                preferences: {
                  language,
                  email: form.has("email"),
                  orders: form.has("orders"),
                  offers: form.has("offers"),
                },
              });
              setNotice("Preferences saved.");
            } catch (e: any) {
              setError(e.message);
            }
          }}
        >
          <h2>Updates you care about</h2>
          <label className="row">
            <input
              type="checkbox"
              name="orders"
              defaultChecked={user?.preferences?.orders !== false}
            />
            Order updates in the app
          </label>
          <label className="row">
            <input
              type="checkbox"
              name="offers"
              defaultChecked={!!user?.preferences?.offers}
            />
            Offers in the app
          </label>
          <p className="small muted">
            Push and email delivery are disabled until the owner configures
            those providers. Your in-app inbox remains available.
          </p>
          <button className="button secondary">Save preferences</button>
        </form>
        <section className="panel stack">
          <h2>Your data</h2>
          <a className="button secondary" href="/api/account/export">
            Download account data
          </a>
          <button
            className="button quiet"
            onClick={async () => {
              localStorage.removeItem("shop.viewed");
              localStorage.removeItem("shop.recent-searches");
              if ("caches" in window)
                for (const key of await caches.keys()) await caches.delete(key);
              setNotice("Browsing history and offline cache cleared.");
            }}
          >
            Clear browsing history & cache
          </button>
          <button
            className="button danger"
            onClick={() => setDeleting(!deleting)}
          >
            Delete account
          </button>
          {deleting && (
            <div className="stack">
              <p className="small muted">
                This removes your profile, saved addresses and assistant history
                and anonymises retained order records. Type DELETE to confirm.
              </p>
              <input
                aria-label="Type DELETE to confirm"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
              <button
                className="button danger"
                disabled={confirmation !== "DELETE"}
                onClick={() =>
                  api("profile", "DELETE")
                    .then(() => location.assign("/"))
                    .catch((e) => setError(e.message))
                }
              >
                Permanently delete account
              </button>
            </div>
          )}
          <ErrorText error={error} />
        </section>
      </div>
    </>
  );
}
