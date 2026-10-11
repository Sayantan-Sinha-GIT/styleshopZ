'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [subtotalPaise, setSubtotalPaise] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/cart');
      const data = await res.json();
      setItems(data.items || []);
      setSubtotalPaise(data.subtotalPaise || 0);
    } catch {
      // Cart fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleRemove = async (cartItemId: string) => {
    await fetch(`/api/cart?id=${cartItemId}`, { method: 'DELETE' });
    fetchCart();
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), cartSubtotalPaise: subtotalPaise }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponError(null);
      } else {
        setCouponError(data.message || 'Invalid coupon');
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError('Failed to validate coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const discountPaise = appliedCoupon ? appliedCoupon.discountPaise : 0;
  const deliveryFeePaise = subtotalPaise >= 49900 ? 0 : 4000;
  const totalPaise = Math.max(0, subtotalPaise + deliveryFeePaise - discountPaise);

  if (loading) {
    return (
      <div className="w max-w-5xl mx-auto pt-36 pb-24 min-h-[60vh]">
        <div className="h-10 w-48 rounded skeleton mb-8" />
        <div className="space-y-4">
          <div className="h-28 rounded-2xl skeleton" />
          <div className="h-28 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="w max-w-xl mx-auto pt-40 pb-24 text-center">
        <h1 className="d text-5xl font-black mb-4">Your Cart is Empty</h1>
        <p className="text-dim mb-8">Explore our catalogue of 500+ products with live deals.</p>
        <Link href="/" className="btn">Continue Shopping</Link>
      </div>
    );
  }

  return (
    <div className="w max-w-6xl mx-auto pt-28 sm:pt-36 pb-24">
      <h1 className="d text-4xl sm:text-6xl font-black uppercase mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Cart Item List */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div
              key={item.cart_item_id}
              className="p-5 rounded-2xl bg-surface border border-line flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-bg border border-line flex items-center justify-center flex-none">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-brand" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-base line-clamp-1 text-text">{item.title}</h3>
                  <p className="text-xs font-mono text-dim">
                    {item.brand} {item.options?.color ? `· ${item.options.color}` : ''}
                  </p>
                  <span className="text-xs font-mono text-[var(--ok)]">
                    {item.in_stock ? 'In Stock' : 'Low Stock'}
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3">
                <div className="text-right">
                  <span className="text-lg font-bold text-brand block">
                    ₹{((item.unit_price_paise * item.quantity) / 100).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-mono text-dim">
                    Qty: {item.quantity} × ₹{(item.unit_price_paise / 100).toLocaleString('en-IN')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(item.cart_item_id)}
                  className="text-xs font-mono text-dim hover:text-[var(--danger)] transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Delivery Threshold Banner */}
          <div className="p-4 rounded-xl bg-bg border border-line flex items-center justify-between text-xs font-mono">
            <span>
              {subtotalPaise >= 49900
                ? 'Free delivery eligible'
                : `Add ₹${((49900 - subtotalPaise) / 100).toFixed(0)} more for free delivery`}
            </span>
            <span className="text-dim">Standard: ₹40</span>
          </div>
        </div>

        {/* Order Summary & Coupon */}
        <div className="p-6 rounded-3xl bg-surface border border-line sticky top-28">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>

          <dl className="space-y-3 text-sm border-b border-line pb-4 mb-4">
            <div className="flex justify-between">
              <dt className="text-dim">Items Subtotal</dt>
              <dd className="font-mono font-medium">₹{(subtotalPaise / 100).toLocaleString('en-IN')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-dim">Delivery Fee</dt>
              <dd className="font-mono font-medium">
                {deliveryFeePaise === 0 ? <span className="text-[var(--ok)]">FREE</span> : `₹${(deliveryFeePaise / 100).toFixed(0)}`}
              </dd>
            </div>
            {discountPaise > 0 && (
              <div className="flex justify-between text-[var(--ok)]">
                <dt>Coupon Discount ({appliedCoupon?.code})</dt>
                <dd className="font-mono font-bold">-₹{(discountPaise / 100).toLocaleString('en-IN')}</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-line/60">
              <dt>Total Amount</dt>
              <dd className="text-brand font-mono text-xl">₹{(totalPaise / 100).toLocaleString('en-IN')}</dd>
            </div>
          </dl>

          {/* Coupon Entry */}
          <form onSubmit={handleApplyCoupon} className="mb-6">
            <label className="block text-xs font-mono text-dim mb-1.5 uppercase">Apply Coupon</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. WELCOME10, SAVE500"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 rounded-xl bg-bg border border-line text-xs font-mono text-text focus:outline-brand uppercase"
              />
              <button type="submit" disabled={validatingCoupon} className="btn sm text-xs">
                {validatingCoupon ? '…' : 'Apply'}
              </button>
            </div>
            {couponError && <p className="text-xs text-[var(--danger)] font-mono mt-1.5">{couponError}</p>}
            {appliedCoupon && <p className="text-xs text-[var(--ok)] font-mono mt-1.5">Coupon {appliedCoupon.code} applied</p>}
          </form>

          {/* 15-Min Hold Notice */}
          <div className="p-3 rounded-xl bg-bg/80 border border-brand/30 text-xs font-mono text-dim mb-6">
            <b className="text-brand">Stock Reservation:</b> Stock will be held for 15 minutes when proceeding to checkout.
          </div>

          <Link
            href={`/checkout?coupon=${appliedCoupon?.code || ''}`}
            className="btn w-full"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
