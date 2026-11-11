"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Lightning, Truck, ArrowCounterClockwise, ShieldCheck, Sparkle } from "@phosphor-icons/react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { money, useData, type Item } from "./Store";
import { getCategoryCover } from "@/lib/images";

/** Floating product chips that orbit the hero photograph. */
export function HeroChips({ products }: { products: Item[] }) {
  const picks = products.slice(0, 2);
  if (!picks.length) return null;
  return <>{picks.map((p, i) => {
    const price = Number(p.deal_price_paise ?? p.price_paise);
    return <Link key={p.id} href={"/products/" + p.id} className={"hero-chip hero-chip-" + (i + 1)} aria-label={`${p.title}, ${money(price)}`}>
      <img src={p.image_url} alt="" />
      <span><b>{p.title}</b><em>{money(price)}</em></span>
      <ArrowUpRight size={16} />
    </Link>;
  })}</>;
}

function Count({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();
  const [v, setV] = useState(reduced ? to : 0);
  useEffect(() => {
    if (!inView) return;
    if (reduced) { setV(to); return; }
    const c = animate(0, to, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: n => setV(Math.round(n)) });
    return () => c.stop();
  }, [inView, to, reduced]);
  return <span ref={ref}>{prefix}{v}{suffix}</span>;
}

export function TrustStrip() {
  const items = [
    { icon: Sparkle, n: 150, suffix: "+", label: "Sample products" },
    { icon: Lightning, n: 17, suffix: "", label: "Catalogue ranges" },
    { icon: ArrowCounterClockwise, n: 7, suffix: "-day", label: "Demo returns" },
    { icon: ShieldCheck, n: 0, prefix: "₹", label: "Real charges, ever" },
  ];
  return <section className="storefront-wrap trust-strip" aria-label="Shop highlights">
    {items.map(({ icon: Icon, n, suffix, prefix, label }) => <div key={label}>
      <Icon size={22} weight="duotone" />
      <strong><Count to={n} suffix={suffix} prefix={prefix} /></strong>
      <span>{label}</span>
    </div>)}
  </section>;
}

function useCountdown() {
  const [left, setLeft] = useState<string>("");
  useEffect(() => {
    const tick = () => {
      const end = new Date(); end.setHours(23, 59, 59, 999);
      const s = Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000));
      const p = (n: number) => String(n).padStart(2, "0");
      setLeft(`${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return left;
}

/** Bento: one hero deal with a live countdown plus quick department tiles. */
export function DealBento({ deal }: { deal?: Item }) {
  const cats = useData("categories");
  const left = useCountdown();
  const tree: Item[] = cats.data?.tree?.slice(0, 4) || [];
  const price = deal ? Number(deal.deal_price_paise ?? deal.price_paise) : 0;
  const off = deal ? Math.round((1 - price / Number(deal.mrp_paise)) * 100) : 0;
  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return <section className="storefront-wrap bento" aria-label="Highlights">
    {deal && <Link href={"/products/" + deal.id} className="bento-tile bento-deal" onPointerMove={onMove}>
      <img src={deal.image_url} alt={deal.title} />
      <div className="bento-shade" />
      <div className="bento-top"><span className="pill-live"><i />Deal of the day</span>{left && <span className="countdown" aria-label="Time left today">{left}</span>}</div>
      <div className="bento-bottom">
        <small>{deal.brand}</small>
        <h3>{deal.title}</h3>
        <p><strong>{money(price)}</strong>{off > 0 && <><del>{money(deal.mrp_paise)}</del><b>−{off}%</b></>}</p>
      </div>
      <span className="round-link"><ArrowUpRight size={22} /></span>
    </Link>}
    {tree.map((c, i) => <Link key={c.id} href={"/search?category=" + c.slug} className={"bento-tile bento-cat bento-cat-" + (i + 1)} onPointerMove={onMove}>
      <img src={getCategoryCover(c.name)} alt="" loading="lazy" />
      <div className="bento-shade" />
      <div className="bento-bottom"><h3>{c.name}</h3><span>Shop now <ArrowUpRight size={16} /></span></div>
    </Link>)}
    <Link href="/orders" className="bento-tile bento-track" onPointerMove={onMove}>
      <Truck size={30} weight="duotone" />
      <h3>Follow every parcel.</h3>
      <p>From placed to delivered, one clean timeline for each demo order.</p>
      <span>Your orders <ArrowUpRight size={16} /></span>
    </Link>
  </section>;
}

