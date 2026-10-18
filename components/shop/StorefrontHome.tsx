"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, CaretLeft, CaretRight, Pause, Play, Package, MagnifyingGlass, ShoppingBag, MapPin, Heart } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { MaskLines, HorizontalPan } from "@/components/fx/scroll";
import { Magnetic, Marquee, OpenSheet, SpringLetters } from "@/components/fx/more";
import { ProductCard, State, useData, useStore, api, type Item } from "./Store";
import { getCategoryCover } from "@/lib/images";

type Campaign = { id: string; name: string; query: string; image: string; alt: string; link: string };
const fallbackCampaigns: Campaign[] = [
  { id: "audio", name: "Sound, your way.", query: "headphones", image: "/photos/banner1.webp", alt: "Black over-ear headphones in warm studio light", link: "/search?q=headphones" },
  { id: "desk", name: "Make room for ideas.", query: "laptops", image: "/photos/banner2.webp", alt: "Laptop and everyday desk essentials", link: "/search?category=laptops-computers" },
  { id: "everyday", name: "A little more everyday.", query: "smartwatches", image: "/photos/banner3.webp", alt: "Titanium smartwatch with a woven strap", link: "/search?category=smartwatches" },
];

export function StorefrontHome() {
  const products = useData("products?limit=8&featured=true");
  const cats = useData("categories");
  const deals = useData("deals");
  const banners = useData("banners");
  const campaigns: Campaign[] = banners.data?.banners?.length
    ? banners.data.banners.map((b: Item) => ({ id: b.id, name: b.title, query: "Featured collection", image: b.image_url, alt: b.title, link: b.link_url }))
    : fallbackCampaigns;
  const campaignSignature = campaigns.map(c => c.id).join(",");
  const { language } = useStore();
  const prefersReduced = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  const reduced = !hydrated || prefersReduced;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [visible, setVisible] = useState(true);
  const [recent, setRecent] = useState<Item[]>([]);
  const stage = useRef<HTMLElement>(null);
  const touch = useRef<number | null>(null);
  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => { setActive(0); }, [campaignSignature]);
  useEffect(() => {
    let live = true;
    try {
      const ids = JSON.parse(localStorage.getItem('shop.viewed') || '[]').slice(0, 4);
      Promise.all(ids.map((id: string) => api('products/' + id).catch(() => null))).then(rows => {
        if (live) setRecent(rows.filter(Boolean).map(d => ({ ...d.product, ...d.variants[0], id: d.product.id, default_variant_id: d.variants[0]?.id })));
      });
    } catch {}
    return () => { live = false; };
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && !document.hidden));
    if (stage.current) observer.observe(stage.current);
    const visibility = () => setVisible(!document.hidden && !!stage.current && stage.current.getBoundingClientRect().bottom > 0);
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (paused || reduced || interacting || !visible || campaigns.length < 2) return;
    const timer = setInterval(() => setActive(a => (a + 1) % campaigns.length), 6000);
    return () => clearInterval(timer);
  }, [paused, reduced, interacting, visible, campaigns.length, campaignSignature]);
  const activeIndex = active % campaigns.length;
  const campaign = campaigns[activeIndex];
  const shelf: Item[] = deals.data?.deals?.length ? deals.data.deals.slice(0, 4) : products.data?.products?.slice(0, 4) || [];
  return <div className="storefront">
    <section className="motion-hero storefront-wrap" ref={stage}>
      <div className="motion-hero-copy">
        <h1 className="display-title"><span>{language === 'hi' ? 'खोजें। चुनें।' : 'Find it. Buy it.'}</span><em>{language === 'hi' ? 'अपना बनाएं।' : 'Watch it come.'}</em></h1>
        <p>Tech, style and everyday essentials. Find a good fit, then follow every step of your demo order.</p>
        <div className="hero-link-row"><Magnetic><Link className="button" href="/search">Explore the shop <ArrowUpRight size={20}/></Link></Magnetic><Link className="plain-action" href="/deals">Today’s deals <ArrowRight size={18}/></Link></div>
      </div>
      <div className="orbit-stage" aria-roledescription="carousel" aria-label="Featured collections"
        onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
        onFocusCapture={() => setInteracting(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false); }}
        onTouchStart={e => { touch.current = e.touches[0].clientX; }} onTouchEnd={e => { if (touch.current !== null) { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 60) setActive(a => (a + (dx < 0 ? 1 : -1) + campaigns.length) % campaigns.length); touch.current = null; } }}>
        <svg className="orbit-lines" viewBox="0 0 600 600" aria-hidden="true"><circle cx="300" cy="300" r="284"/><circle cx="300" cy="300" r="240"/><path d="M16 300h44m480 0h44M300 16v44m0 480v44"/></svg>
        <Link className="orbit-query" href={campaign.link}><MagnifyingGlass size={18}/><span>{campaign.query}</span><ArrowUpRight size={16}/></Link>
        <div className="orbit-photograph">
          {campaigns.map((c, i) => <img key={c.id} src={c.image} alt={i === activeIndex ? c.alt : ''} aria-hidden={i !== activeIndex} className={i === activeIndex ? 'active' : ''} fetchPriority={i === 0 ? 'high' : 'auto'}/>)}
        </div>
        <div className="orbit-caption" key={campaign.id}><Link href={campaign.link}><span>{campaign.name}</span><ArrowUpRight size={22}/></Link></div>
        <div className="campaign-controls">
          <button aria-label="Previous collection" disabled={campaigns.length < 2} onClick={() => setActive(a => (a + campaigns.length - 1) % campaigns.length)}><CaretLeft size={18}/></button>
          {campaigns.map((c, i) => <button key={c.id} aria-label={`Show collection ${i + 1}`} aria-pressed={i === activeIndex} className="campaign-position" onClick={() => setActive(i)}><span/></button>)}
          <button aria-label="Next collection" disabled={campaigns.length < 2} onClick={() => setActive(a => (a + 1) % campaigns.length)}><CaretRight size={18}/></button>
          {!reduced && campaigns.length > 1 && <button aria-label={paused ? 'Play featured collections' : 'Pause featured collections'} onClick={() => setPaused(p => !p)}>{paused ? <Play size={16}/> : <Pause size={16}/>}</button>}
        </div>
      </div>
      <div className="order-journey" aria-label="Example order journey, simulated delivery">
        <p>From your first find to your doorstep.<span>Example journey · Delivery is simulated</span></p>
        <div className={'journey-track' + (paused || reduced || !visible ? ' paused' : '')} aria-hidden="true"><div className="journey-line"/><div className="journey-parcel"><Package size={24} weight="fill"/></div>{['Placed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'].map((s, i) => <span key={s} style={{'--step': i} as React.CSSProperties}><i/>{s}</span>)}</div>
      </div>
    </section>

    <div className="market-ticker" aria-hidden="true"><Marquee seconds={55}><span>Search.</span><em>Discover.</em><span>Make it yours.</span><em>Repeat.</em></Marquee></div>

    <section className="storefront-wrap home-shelf" id="deals">
      <div className="editorial-heading"><MaskLines className="display-section">Good finds. Better prices.</MaskLines><Link className="plain-action" href="/deals">Explore deals <ArrowUpRight size={21}/></Link></div>
      <State loading={products.loading || deals.loading} error={products.error || deals.error} retry={() => { products.refresh(); deals.refresh(); }}>
        <div className="product-grid">{shelf.map(p => <ProductCard key={p.id} product={p}/>)}</div>
      </State>
    </section>

    <section className="department-section" id="departments">
      <div className="storefront-wrap editorial-heading"><MaskLines className="display-section">Every shelf. A new possibility.</MaskLines><Link className="plain-action" href="/categories">All departments <ArrowUpRight size={21}/></Link></div>
      <State loading={cats.loading} error={cats.error} retry={cats.refresh}>
        <HorizontalPan className="department-pan">{cats.data?.tree.map((c: Item, i: number) => <Link href={'/search?category=' + c.slug} className="department-portrait shrink-0 snap-start" key={c.id}><img src={getCategoryCover(c.name)} alt={c.name} loading="lazy"/><div><h3>{c.name}</h3><span className="round-link"><ArrowUpRight size={24}/></span></div><p>{['For work. For play. For you.', 'Wear it your way.', 'Make room for everyday comfort.', 'A little time for yourself.', 'For whatever moves you.'][i % 5]}</p></Link>)}</HorizontalPan>
      </State>
    </section>

    <section className="storefront-wrap home-shelf">
      <div className="editorial-heading"><MaskLines className="display-section">Meet your next favourite.</MaskLines><Link className="plain-action" href="/search">See everything <ArrowUpRight size={21}/></Link></div>
      <State loading={products.loading} error={products.error} retry={products.refresh}><div className="product-grid">{products.data?.products.map((p: Item) => <ProductCard product={p} key={p.id}/>)}</div></State>
    </section>


    <section className="storefront-wrap shopping-loop" id="loop">
      <MaskLines className="display-section">Your find. Your way.</MaskLines>
      <div className="shopping-loop-grid">
        {[
          { title: 'Find.', text: 'Search by product, brand or budget. Compare the details before you choose.', href: '/search', action: 'Find your next favourite', icon: MagnifyingGlass },
          { title: 'Save.', text: 'Keep the things you love together. Your wishlist is ready when you are.', href: '/wishlists', action: 'Your saved finds', icon: Heart },
          { title: 'Track.', text: 'Follow your demo order from placed to delivered. Every update, in one place.', href: '/orders', action: 'Your orders', icon: Package },
        ].map(({ title, text, href, action }) => <motion.article key={title} initial={false} whileInView={{ opacity: 1 }} viewport={{ once: true }}><h3>{title}</h3><p>{text}</p><Link className="plain-action" href={href}>{action}<ArrowRight size={18}/></Link></motion.article>)}
      </div>
    </section>

    {recent.length > 0 && <section className="storefront-wrap home-shelf"><div className="editorial-heading"><MaskLines className="display-section">Take another look.</MaskLines><p className="muted">Recently viewed on this device</p></div><div className="product-grid">{recent.map(p => <ProductCard key={p.id} product={p}/>)}</div></section>}

    <OpenSheet className="assistant-story"><div className="storefront-wrap assistant-story-inner"><div><SpringLetters className="display-section">A good place to start.</SpringLetters><p>Have something in mind? Tell the shopping assistant what you’re looking for.</p><Magnetic><Link href="/assistant" className="button">Find something for me <ArrowUpRight size={20}/></Link></Magnetic></div><div className="assistant-ideas"><span>What’s on your list?</span>{[['Headphones under ₹3,000', '/search?q=headphones&max_price=300000'], ['Something for my desk', '/search?q=keyboard'], ['A little home comfort', '/search?category=home-kitchen']].map(([text, href]) => <Link href={href} key={text}>{text}<ArrowUpRight size={22}/></Link>)}<p>Explore the catalogue, or start a conversation.</p></div></div></OpenSheet>
    <section className="storefront-wrap store-promises"><div><MapPin size={26}/><p>Pin your place.<span>Save an address with map assistance.</span></p></div><div><Package size={26}/><p>Room to reconsider.<span>7-day returns after demo delivery.</span></p></div><div><ShoppingBag size={26}/><p>Try the whole shop.<span>No real payments or deliveries.</span></p></div></section>
  </div>;
}
