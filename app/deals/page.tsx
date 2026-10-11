'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DealsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/deals')
      .then((res) => res.json())
      .then((data) => {
        if (data.deals) setDeals(data.deals);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Countdown timer to midnight
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      setHours(pad(Math.floor(diff / 3600)));
      setMinutes(pad(Math.floor((diff % 3600) / 60)));
      setSeconds(pad(diff % 60));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const COUPONS = [
    { code: 'WELCOME10', discount: '10% OFF', minCart: '₹500', desc: 'New customer instant discount on first purchase' },
    { code: 'SAVE500', discount: '₹500 Flat OFF', minCart: '₹2,000', desc: 'Flat savings on orders above ₹2,000' },
    { code: 'SUPERDEAL', discount: '15% OFF', minCart: '₹1,000', desc: 'Special seasonal promotion' },
  ];

  return (
    <div className="w max-w-7xl mx-auto pt-28 sm:pt-36 pb-24">
      {/* Header with Countdown */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-12 border-b border-line pb-8">
        <div>
          <p className="m text-xs font-mono text-dim mb-2">Promotions & Flash Offers</p>
          <h1 className="d text-5xl sm:text-7xl font-black uppercase">Deals of the Day</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-dim mr-2">Ends in:</span>
          <div className="flex text-3xl sm:text-5xl font-mono font-bold text-brand bg-surface px-4 py-2 rounded-2xl border border-line">
            <span>{hours}</span>:<span>{minutes}</span>:<span>{seconds}</span>
          </div>
        </div>
      </div>

      {/* Lightning Deals Grid */}
      <div className="mb-16">
        <h2 className="d text-3xl font-black uppercase mb-6 text-brand">Lightning Deals</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="h-64 rounded-2xl skeleton" />
            <div className="h-64 rounded-2xl skeleton" />
            <div className="h-64 rounded-2xl skeleton" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map((deal) => {
              const discountPercent = Math.round(
                ((deal.original_price_paise - deal.deal_price_paise) / deal.original_price_paise) * 100
              );
              const claimedPercent = Math.round((deal.sold_count / deal.quantity_cap) * 100);

              return (
                <div key={deal.id} className="p-6 rounded-3xl bg-surface border border-line flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-brand text-on-brand">
                        {discountPercent}% OFF
                      </span>
                      <span className="text-xs font-mono text-dim">{deal.category_name}</span>
                    </div>
                    <h3 className="font-semibold text-lg line-clamp-2 mb-2">{deal.title}</h3>
                    <p className="text-xs font-mono text-dim mb-4">Brand: {deal.brand}</p>

                    {/* Quantity Cap Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs font-mono text-dim mb-1">
                        <span>{claimedPercent}% claimed</span>
                        <span>{deal.quantity_cap - deal.sold_count} left</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-bg overflow-hidden border border-line/40">
                        <div
                          className="h-full bg-brand rounded-full transition-all"
                          style={{ width: `${claimedPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-line/60 flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold text-brand block">
                        ₹{(deal.deal_price_paise / 100).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs line-through text-dim">
                        ₹{(deal.original_price_paise / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <Link
                      href={`/products/${deal.product_id}`}
                      className="btn sm text-xs font-mono"
                    >
                      Claim Deal &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verified Coupons Section */}
      <div className="mb-16">
        <h2 className="d text-3xl font-black uppercase mb-6">Verified Coupons</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {COUPONS.map((c) => (
            <div key={c.code} className="p-6 rounded-3xl bg-surface border border-line flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono text-brand font-bold uppercase">{c.discount}</span>
                  <span className="text-xs font-mono text-dim">Min cart {c.minCart}</span>
                </div>
                <h3 className="font-mono text-2xl font-black tracking-wider text-text mb-2">{c.code}</h3>
                <p className="text-xs text-dim leading-relaxed mb-4">{c.desc}</p>
              </div>

              <button
                type="button"
                onClick={() => copyCoupon(c.code)}
                className="btn g sm text-xs font-mono w-full"
              >
                {copiedCode === c.code ? 'Code Copied' : 'Copy Coupon Code'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Simulated Bank Offers */}
      <div className="p-8 rounded-3xl bg-surface border border-line">
        <h2 className="d text-3xl font-black uppercase mb-2">Bank & Payment Offers</h2>
        <p className="text-xs font-mono text-dim mb-6">Available at checkout · Simulated promotions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-bg border border-line/60">
            <b className="text-brand block mb-1">HDFC Bank Simulated Cards:</b>
            <span className="text-dim">10% Instant Discount up to ₹1,500 on Credit Card EMI transactions.</span>
          </div>
          <div className="p-4 rounded-xl bg-bg border border-line/60">
            <b className="text-brand block mb-1">ICICI Bank Simulated Netbanking:</b>
            <span className="text-dim">Flat ₹250 cashback on min order of ₹2,500.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
