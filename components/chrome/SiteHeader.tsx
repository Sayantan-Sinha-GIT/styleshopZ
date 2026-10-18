"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
import { useTheme, setTheme as applyTheme } from "@/lib/client/theme";
export function SiteHeader() {
  const { user, cart, language, switchLanguage } = useStore(),
    router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const activeQuery = params.get("q") || "";
  const [search, setSearch] = useState(""),
    [suggestions, setSuggestions] = useState<any[]>([]);
  const theme = useTheme();
  const searchInput = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [department, setDepartment] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);
  useEffect(() => {
    setSearch(pathname === "/search" ? activeQuery : "");
    setDepartment(pathname === "/search" ? params.get("category") || "" : "");
  }, [pathname, activeQuery]);
  useEffect(() => {
    const focusSearch = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement).closest('input,textarea,select,[contenteditable]')) return;
      e.preventDefault(); searchInput.current?.focus({ preventScroll: true });
    };
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);
  useEffect(() => {
    if (search.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    let alive = true;
    const timer = setTimeout(
      () =>
        api("suggest?q=" + encodeURIComponent(search) + (department ? "&category=" + encodeURIComponent(department) : ""))
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
  }, [search, department]);
  const count = cart.items
    .filter((i: any) => !i.saved_for_later)
    .reduce((s: number, i: any) => s + i.quantity, 0);
  const toggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    applyTheme(theme === "dark" ? "light" : "dark", { x: r.left + r.width / 2, y: r.top + r.height / 2 });
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
    setSearchFocused(false);
    router.push("/search?q=" + encodeURIComponent(q) + (department ? "&category=" + encodeURIComponent(department) : ""));
  };
  return (
    <>
      <div className="demo-strip">
        <span className="demo-strip-full">{language === "hi"
          ? "डेमो स्टोर · असली पैसे या डिलीवरी नहीं"
          : "A demonstration shop. No real payments or deliveries."}</span>
        <span className="demo-strip-compact">{language === "hi"
          ? "डेमो स्टोर · असली भुगतान या डिलीवरी नहीं"
          : "Demo shop · No real payments or deliveries"}</span>
        <Link href="/help">
          {language === "hi" ? "कैसे काम करता है" : "How it works"}
          <ArrowRight size={12} />
        </Link>
      </div>
      <header className="shop-header" style={{ viewTransitionName: 'site-header' }}>
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
            <select className="search-department" aria-label="Search department" value={department} onChange={e=>setDepartment(e.target.value)}>
              <option value="">All</option><option value="electronics">Electronics</option><option value="fashion">Fashion</option><option value="home-kitchen">Home & kitchen</option><option value="beauty-health">Beauty & health</option><option value="sports-fitness">Sports & fitness</option>
            </select>
            <MagnifyingGlass size={21} />
            <input
              ref={searchInput}
              type="search"
              name="q"
              enterKeyHint="search"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={searchFocused && (suggestions.length > 0 || (!search && recent.length > 0))}
              aria-controls="search-suggestions"
              aria-activedescendant={selectedSuggestion >= 0 ? `suggestion-${selectedSuggestion}` : undefined}
              aria-label="Search products"
              placeholder={
                language === "hi"
                  ? "आप क्या ढूंढ रहे हैं?"
                  : "Search products"
              }
              maxLength={100}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedSuggestion(-1); }}
              onFocus={() => { if (blurTimer.current) clearTimeout(blurTimer.current); setSearchFocused(true); try { setRecent(JSON.parse(localStorage.getItem("shop.recent-searches") || "[]")); } catch {} }}
              onBlur={() => { blurTimer.current = setTimeout(() => setSearchFocused(false), 180); }}
              onKeyDown={e=>{
                if (e.key === "Escape") {setSearchFocused(false);setSelectedSuggestion(-1);}
                if (e.key === "ArrowDown") { e.preventDefault(); setSelectedSuggestion(n=>Math.min(n+1,(search?suggestions.length:recent.length)-1));setSearchFocused(true); }
                if (e.key === "ArrowUp") {e.preventDefault();setSelectedSuggestion(n=>Math.max(-1,n-1));}
                if (e.key === "Enter" && selectedSuggestion >= 0) {if(search && suggestions[selectedSuggestion]){e.preventDefault();setSearchFocused(false);router.push('/products/'+suggestions[selectedSuggestion].id);}else if(!search && recent[selectedSuggestion]){e.preventDefault();setSearchFocused(false);router.push('/search?q='+encodeURIComponent(recent[selectedSuggestion]));}}
              }}
            />
            <button aria-label="Search" type="submit">
              <ArrowRight size={20} />
            </button>
            {searchFocused && suggestions.length > 0 && (
              <div className="suggestions" id="search-suggestions" role="listbox" aria-label="Suggested products">
                {suggestions.map((s, i) => (
                  <Link
                    id={`suggestion-${i}`} role="option" aria-selected={selectedSuggestion === i}
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
            {searchFocused && !search && recent.length > 0 && <div className="suggestions" id="search-suggestions" role="listbox" aria-label="Recent searches">{recent.map((q,i)=><Link id={`suggestion-${i}`} role="option" aria-selected={selectedSuggestion===i} key={q} href={'/search?q='+encodeURIComponent(q)} onClick={()=>setSearchFocused(false)}><MagnifyingGlass size={16}/>{q}</Link>)}</div>}
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
              className="header-saved icon-button"
              href="/wishlists"
              aria-label="Saved products"
            ><Heart size={23}/></Link>
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
          <Link href="/search">Browse all products</Link>
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
