"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import {
  MagnifyingGlass,
  ShoppingBag,
  Heart,
  UserCircle,
  Sun,
  Moon,
  Package,
  House,
  ArrowRight,
} from "@phosphor-icons/react";
import { useStore, api } from "@/components/shop/Store";
export function SiteHeader() {
  const { user, cart, language, switchLanguage } = useStore(),
    router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const activeQuery = params.get("q") || "";
  const [search, setSearch] = useState(""),
    [suggestions, setSuggestions] = useState<any[]>([]),
    [theme, setTheme] = useState("dark");
  const [searchFocused, setSearchFocused] = useState(false);
  useEffect(() => {
    setSearch(pathname === "/search" ? activeQuery : "");
  }, [pathname, activeQuery]);
  useEffect(
    () => setTheme(document.documentElement.dataset.theme || "dark"),
    [],
  );
  useEffect(() => {
    if (search.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let alive = true;
    const timer = setTimeout(
      () =>
        api("suggest?q=" + encodeURIComponent(search))
          .then((d) => {
            if (alive) setSuggestions(d.suggestions);
          })
          .catch(() => {}),
      300,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [search]);
  const count = cart.items
    .filter((i: any) => !i.saved_for_later)
    .reduce((s: number, i: any) => s + i.quantity, 0);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem("styleshopz-theme", next);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim().slice(0, 100);
    if (q) {
      try {
        const recent = JSON.parse(
          localStorage.getItem("shop.recent-searches") || "[]",
        );
        localStorage.setItem(
          "shop.recent-searches",
          JSON.stringify(
            [q, ...recent.filter((v: string) => v !== q)].slice(0, 6),
          ),
        );
      } catch {}
    }
    setSuggestions([]);
    router.push("/search?q=" + encodeURIComponent(q));
  };
  return (
    <>
      <div className="demo-strip">
        {language === "hi"
          ? "डेमो स्टोर · असली पैसे या डिलीवरी नहीं"
          : "A demonstration shop. No real payments or deliveries."}
        <Link href="/help">
          {language === "hi" ? "कैसे काम करता है" : "How it works"}
          <ArrowRight size={12} />
        </Link>
      </div>
      <header className="shop-header">
        <div className="header-inner">
          <Link href="/" className="brand" aria-label="styleshopZ home">
            <span className="brand-mark">
              s<span>z</span>
            </span>
            <span>
              styleshop<span>Z</span>
            </span>
          </Link>
          <form className="search-bar" onSubmit={submit} role="search">
            <MagnifyingGlass size={21} />
            <input
              aria-label="Search products"
              placeholder={
                language === "hi"
                  ? "आप क्या ढूंढ रहे हैं?"
                  : "What are you looking for?"
              }
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
            />
            <button aria-label="Search" type="submit">
              <ArrowRight size={20} />
            </button>
            {searchFocused && suggestions.length > 0 && (
              <div className="suggestions">
                {suggestions.map((s) => (
                  <Link
                    key={s.id}
                    href={"/products/" + s.id}
                    onClick={() => {
                      setSearch("");
                      setSuggestions([]);
                    }}
                  >
                    {s.title}
                  </Link>
                ))}
              </div>
            )}
          </form>
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={toggle}
              aria-label={
                "Switch to " + (theme === "dark" ? "light" : "dark") + " theme"
              }
            >
              {theme === "dark" ? <Sun size={22} /> : <Moon size={22} />}
            </button>
            <Link
              className="header-account"
              href={user ? "/customer" : "/login"}
            >
              <UserCircle size={25} />
              <span>
                <small>
                  {user
                    ? "Hello, " + user.name.split(" ")[0]
                    : language === "hi"
                      ? "नमस्ते"
                      : "Hello there"}
                </small>
                <b>{language === "hi" ? "आपका खाता" : "Your account"}</b>
              </span>
            </Link>
            <Link
              className="bag-link"
              href="/cart"
              aria-label={`Bag with ${count} items`}
            >
              <ShoppingBag size={25} />
              <span className="bag-count">{count}</span>
            </Link>
          </div>
        </div>
        <nav className="shop-nav" aria-label="Shop navigation">
          <Link href="/categories">
            {language === "hi" ? "सभी विभाग" : "All departments"}
          </Link>
          <Link href="/deals">
            {language === "hi" ? "आज के ऑफर" : "Today’s deals"}
          </Link>
          <Link href="/search?category=electronics">Electronics</Link>
          <Link href="/search?category=fashion">Fashion</Link>
          <Link href="/search?category=home-kitchen">Home & kitchen</Link>
          <Link href="/assistant">Shopping assistant</Link>
          <Link href="/orders" className="nav-orders">
            <Package size={16} />
            {language === "hi" ? "आपके ऑर्डर" : "Your orders"}
          </Link>
          <button
            className="language-button"
            onClick={() => switchLanguage(language === "hi" ? "en" : "hi")}
          >
            {language === "hi" ? "English" : "हिन्दी"}
          </button>
        </nav>
      </header>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {[
          { href: "/", icon: House, label: "Home" },
          { href: "/search", icon: MagnifyingGlass, label: "Search" },
          { href: "/wishlists", icon: Heart, label: "Saved" },
          { href: "/orders", icon: Package, label: "Orders" },
          { href: "/customer", icon: UserCircle, label: "You" },
        ].map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={pathname === href ? "active" : ""}
          >
            <Icon size={23} weight={pathname === href ? "fill" : "regular"} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
