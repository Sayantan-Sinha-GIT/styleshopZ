'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const couponCode = searchParams.get('coupon') || '';

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [subtotalPaise, setSubtotalPaise] = useState(0);
  const [holdTimer, setHoldTimer] = useState(15 * 60); // 15 minutes in seconds
  const [processing, setProcessing] = useState(false);

  // Address State
  const [address, setAddress] = useState({
    name: 'Priya Sharma',
    phone: '+919876543212',
    line1: 'Flat 402, Lotus Residency, 7th Cross',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
  });

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');

  useEffect(() => {
    // 1. Fetch cart items
    fetch('/api/cart')
      .then((res) => res.json())
      .then(async (data) => {
        if (!data.items || data.items.length === 0) {
          router.push('/cart');
          return;
        }
        setItems(data.items);
        setSubtotalPaise(data.subtotalPaise);

        // 2. Request 15-minute stock hold
        try {
          await fetch('/api/checkout/hold', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: data.items.map((i: any) => ({
                variantId: i.variant_id,
                quantity: i.quantity,
              })),
            }),
          });
        } catch {
          // Continue if hold already registered
        }

        setLoading(false);
      })
      .catch(() => router.push('/cart'));
  }, [router]);

  // Hold Countdown Timer
  useEffect(() => {
    if (holdTimer <= 0) return;
    const interval = setInterval(() => {
      setHoldTimer((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [holdTimer]);

  const deliveryFeePaise = subtotalPaise >= 49900 ? 0 : 4000;
  const totalPaise = subtotalPaise + deliveryFeePaise;
  const isCodAllowed = totalPaise <= 5000000; // COD limit up to ₹50,000

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const orderPayload = {
        items: items.map((i) => ({ variantId: i.variant_id, quantity: i.quantity })),
        address,
        paymentMethod,
        couponCode: couponCode || undefined,
      };

      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await res.json();
      if (!res.ok) {
        alert(orderData.error || 'Failed to place order');
        setProcessing(false);
        return;
      }

      if (paymentMethod === 'razorpay') {
        // Razorpay Test Mode Verification
        const verifyRes = await fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: orderData.orderId,
            razorpayOrderId: orderData.razorpayOrderId,
            razorpayPaymentId: `pay_test_${Date.now()}`,
            razorpaySignature: 'sig_test_verified_server',
          }),
        });

        if (verifyRes.ok) {
          router.push(`/orders/${orderData.orderId}`);
        } else {
          router.push(`/orders/${orderData.orderId}`);
        }
      } else {
        // COD order placed directly
        router.push(`/orders/${orderData.orderId}`);
      }
    } catch {
      alert('An error occurred during checkout');
      setProcessing(false);
    }
  };

  const timerMin = String(Math.floor(holdTimer / 60)).padStart(2, '0');
  const timerSec = String(holdTimer % 60).padStart(2, '0');

  if (loading) {
    return (
      <div className="w max-w-5xl mx-auto pt-36 pb-24 min-h-[60vh]">
        <div className="h-8 w-60 rounded skeleton mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-64 rounded-2xl skeleton" />
          <div className="h-64 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="w max-w-6xl mx-auto pt-28 sm:pt-36 pb-24">
      {/* 15-Minute Hold Banner */}
      <div className="mb-8 p-4 rounded-2xl bg-surface border border-brand/40 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-brand animate-ping" />
          <div>
            <h3 className="font-semibold text-sm text-text">Stock Held Exclusively For You</h3>
            <p className="text-xs font-mono text-dim">
              Items reserved across India warehouses for 15 minutes.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-bg px-4 py-2 rounded-xl border border-line">
          <span className="text-xs font-mono text-dim">Time Left:</span>
          <span className="text-lg font-mono font-bold text-brand">
            {timerMin}:{timerSec}
          </span>
        </div>
      </div>

      <h1 className="d text-4xl sm:text-6xl font-black uppercase mb-8">Checkout</h1>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Address & Payment Sections */}
        <div className="lg:col-span-2 space-y-8">
          {/* Delivery Address */}
          <div className="p-6 rounded-3xl bg-surface border border-line">
            <h2 className="text-xl font-bold mb-4">1. Delivery Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-dim mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-sm text-text focus:outline-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-dim mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-sm text-text focus:outline-brand"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-mono text-dim mb-1">Address Line</label>
                <input
                  type="text"
                  required
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-sm text-text focus:outline-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-dim mb-1">City</label>
                <input
                  type="text"
                  required
                  value={address.city}
                  onChange={(e) => setAddress({ ...address, city: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-sm text-text focus:outline-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-mono text-dim mb-1">PIN Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={address.pincode}
                  onChange={(e) => setAddress({ ...address, pincode: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-sm font-mono text-text focus:outline-brand"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="p-6 rounded-3xl bg-surface border border-line">
            <h2 className="text-xl font-bold mb-4">2. Select Payment Method</h2>
            <div className="space-y-3">
              {/* Razorpay Test Mode */}
              <label
                className={`p-4 rounded-2xl border flex items-start gap-4 cursor-pointer transition-colors ${
                  paymentMethod === 'razorpay'
                    ? 'border-brand bg-brand/5 ring-1 ring-brand'
                    : 'border-line hover:border-line-strong'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="mt-1"
                />
                <div>
                  <span className="font-semibold block text-base text-text">
                    Razorpay Online Payment · Test Mode
                  </span>
                  <p className="text-xs text-dim mt-0.5">
                    UPI, Credit/Debit Cards, Netbanking, Wallets. No real money deducted.
                  </p>
                </div>
              </label>

              {/* Cash on Delivery */}
              <label
                className={`p-4 rounded-2xl border flex items-start gap-4 cursor-pointer transition-colors ${
                  !isCodAllowed ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  paymentMethod === 'cod'
                    ? 'border-brand bg-brand/5 ring-1 ring-brand'
                    : 'border-line hover:border-line-strong'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  disabled={!isCodAllowed}
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1"
                />
                <div>
                  <span className="font-semibold block text-base text-text">
                    Cash on Delivery (COD)
                  </span>
                  <p className="text-xs text-dim mt-0.5">
                    Pay with cash upon parcel delivery at your doorstep (Available up to ₹50,000).
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary Column */}
        <div className="p-6 rounded-3xl bg-surface border border-line sticky top-28">
          <h2 className="text-xl font-bold mb-4">Items & Billing</h2>

          <div className="space-y-3 max-h-52 overflow-y-auto mb-4 pr-1">
            {items.map((i) => (
              <div key={i.cart_item_id} className="flex justify-between text-xs">
                <span className="line-clamp-1 pr-2 text-text">
                  {i.quantity}× {i.title}
                </span>
                <span className="font-mono flex-none text-brand">
                  ₹{((i.unit_price_paise * i.quantity) / 100).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <dl className="space-y-2 text-xs border-t border-line pt-4 mb-6">
            <div className="flex justify-between">
              <dt className="text-dim">Subtotal</dt>
              <dd className="font-mono">₹{(subtotalPaise / 100).toLocaleString('en-IN')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-dim">Delivery Fee</dt>
              <dd className="font-mono">{deliveryFeePaise === 0 ? 'FREE' : `₹${deliveryFeePaise / 100}`}</dd>
            </div>
            {couponCode && (
              <div className="flex justify-between text-[var(--ok)]">
                <dt>Coupon ({couponCode})</dt>
                <dd className="font-mono">Applied</dd>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-3 border-t border-line/60">
              <dt>Total to Pay</dt>
              <dd className="font-mono text-xl text-brand">
                ₹{(totalPaise / 100).toLocaleString('en-IN')}
              </dd>
            </div>
          </dl>

          <button
            type="submit"
            disabled={processing || holdTimer <= 0}
            className="btn w-full text-base font-bold"
          >
            {processing ? 'Processing Payment…' : `Pay ₹${(totalPaise / 100).toLocaleString('en-IN')}`}
          </button>

          <p className="text-[11px] font-mono text-dim text-center mt-3">
            Secure checkout · Razorpay test mode only
          </p>
        </div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="w max-w-5xl mx-auto pt-36 min-h-[60vh] skeleton rounded-3xl" />}>
      <CheckoutContent />
    </Suspense>
  );
}
