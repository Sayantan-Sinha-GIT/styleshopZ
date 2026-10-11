'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const STAGES = ['placed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
const STAGE_LABELS: Record<string, string> = {
  placed: 'Placed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
};

function OrderTrackingContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [returnEligible, setReturnEligible] = useState(false);

  // Return modal state
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Poll order status every 30 seconds (PRD requirement)
  const fetchOrder = async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
        setItems(data.items || []);
        setEvents(data.events || []);
        setReturnEligible(data.returnEligible || false);
        // Persist last known order state for offline reading (localStorage)
        try {
          localStorage.setItem(`order_${id}`, JSON.stringify(data));
        } catch {}
      }
    } catch {
      // Fallback to offline cached state
      try {
        const cached = localStorage.getItem(`order_${id}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setOrder(parsed.order);
          setItems(parsed.items);
          setEvents(parsed.events);
          setReturnEligible(parsed.returnEligible);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 30000); // 30-sec polling
    return () => clearInterval(interval);
  }, [id]);

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order? Stock will be restored.')) return;
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer requested cancellation prior to shipment' }),
      });
      if (res.ok) {
        fetchOrder();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel order');
      }
    } catch {
      alert('Error cancelling order');
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !returnReason.trim()) return;
    setSubmittingReturn(true);
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderItemId: selectedItemId,
          reason: returnReason.trim(),
          photoUrls: ['/photos/return_proof_1.webp'],
        }),
      });
      if (res.ok) {
        alert('Return request submitted successfully. A pickup will be scheduled.');
        setReturnModalOpen(false);
        fetchOrder();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit return request');
      }
    } catch {
      alert('Error submitting return');
    } finally {
      setSubmittingReturn(false);
    }
  };

  if (loading) {
    return (
      <div className="w max-w-5xl mx-auto pt-36 pb-24 min-h-[60vh]">
        <div className="h-10 w-64 rounded skeleton mb-8" />
        <div className="h-44 rounded-3xl skeleton mb-8" />
        <div className="h-64 rounded-3xl skeleton" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="w max-w-xl mx-auto pt-40 pb-24 text-center">
        <h1 className="d text-5xl font-black mb-4">Order Not Found</h1>
        <p className="text-dim mb-8">Could not locate tracking information for this order.</p>
        <Link href="/orders" className="btn">View All Orders</Link>
      </div>
    );
  }

  const currentStageIndex = STAGES.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';
  const canCancel = ['placed', 'packed'].includes(order.status);

  return (
    <div className="w max-w-5xl mx-auto pt-28 sm:pt-36 pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <nav className="flex items-center gap-2 text-xs font-mono text-dim mb-2">
            <Link href="/orders" className="hover:text-brand">&larr; Back to Orders</Link>
            <span>/</span>
            <span>{order.id}</span>
          </nav>
          <h1 className="d text-4xl sm:text-5xl font-black uppercase">
            Order Tracking
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-dim">
            Live polling every 30s
          </span>
          {canCancel && (
            <button
              type="button"
              onClick={handleCancelOrder}
              className="px-4 py-2 rounded-full border border-[var(--danger)]/50 text-[var(--danger)] text-xs font-mono hover:bg-[var(--danger)]/10 transition-colors"
            >
              Cancel Order
            </button>
          )}
          {returnEligible && (
            <button
              type="button"
              onClick={() => {
                if (items.length) setSelectedItemId(items[0].id);
                setReturnModalOpen(true);
              }}
              className="btn sm text-xs font-mono"
            >
              Request 7-Day Return
            </button>
          )}
        </div>
      </div>

      {/* 5-STAGE INTERACTIVE TRACKING TIMELINE */}
      <div className="p-8 rounded-3xl bg-surface border border-line mb-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <span className="text-xs font-mono text-dim uppercase">Current Status</span>
            <h2 className="text-2xl font-bold capitalize text-brand">
              {order.status.replace(/_/g, ' ')}
            </h2>
          </div>
          <span className="text-xs font-mono text-dim">
            Payment: {order.payment_method.toUpperCase()} · Total: ₹{(order.total_paise / 100).toLocaleString('en-IN')}
          </span>
        </div>

        {!isCancelled ? (
          <div className="relative pt-6 pb-4 px-2 sm:px-6">
            {/* Progress track */}
            <div className="absolute top-9 left-6 right-6 h-1 bg-line rounded-full" />
            <div
              className="absolute top-9 left-6 h-1 bg-brand rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(0, (currentStageIndex / (STAGES.length - 1)) * 100)}%`,
              }}
            />

            {/* Stages nodes */}
            <div className="relative flex justify-between">
              {STAGES.map((stg, idx) => {
                const isPassed = currentStageIndex >= idx;
                const isCurrent = currentStageIndex === idx;
                return (
                  <div key={stg} className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isPassed
                          ? 'bg-brand text-on-brand shadow-lg ring-4 ring-brand/20'
                          : 'bg-bg text-dim border border-line'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`mt-3 text-xs font-mono text-center max-w-[80px] ${
                        isCurrent
                          ? 'text-brand font-bold'
                          : isPassed
                          ? 'text-text'
                          : 'text-dim'
                      }`}
                    >
                      {STAGE_LABELS[stg]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm font-mono">
            This order was cancelled prior to shipment. All payments and stock have been reversed.
          </div>
        )}
      </div>

      {/* ITEMS & LOGISTICS TIMELINE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Ordered Items */}
        <div className="p-6 rounded-3xl bg-surface border border-line">
          <h3 className="text-lg font-bold mb-4">Items in Shipment</h3>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="p-4 rounded-2xl bg-bg border border-line/60">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-sm line-clamp-1">{item.variant_snapshot?.title}</h4>
                  <span className="font-mono text-sm text-brand font-bold">
                    ₹{((item.unit_price_paise * item.quantity) / 100).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono text-dim">
                  <span>Qty: {item.quantity} · SKU: {item.variant_snapshot?.sku}</span>
                  <span className="text-text font-medium">{item.status.replace(/_/g, ' ')}</span>
                </div>
                {item.tracking_id && (
                  <div className="mt-3 pt-2 border-t border-line/40 text-xs font-mono flex justify-between text-dim">
                    <span>Tracking ID:</span>
                    <span className="text-brand font-bold">{item.tracking_id}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Delivery Address Snapshot */}
          {order.address_snapshot && (
            <div className="mt-6 pt-4 border-t border-line text-xs font-mono">
              <h4 className="text-text font-bold mb-1">Delivering to:</h4>
              <p className="text-dim leading-relaxed">
                {order.address_snapshot.name} ({order.address_snapshot.phone})<br />
                {order.address_snapshot.line1}, {order.address_snapshot.city}, {order.address_snapshot.state} - {order.address_snapshot.pincode}
              </p>
            </div>
          )}
        </div>

        {/* Milestone Activity Log */}
        <div className="p-6 rounded-3xl bg-surface border border-line">
          <h3 className="text-lg font-bold mb-4">Activity Timeline</h3>
          {events.length === 0 ? (
            <p className="text-xs text-dim font-mono">No milestone events logged yet.</p>
          ) : (
            <div className="space-y-4">
              {events.map((ev, i) => (
                <div key={ev.id || i} className="flex gap-4 items-start text-xs font-mono">
                  <span className="w-2 h-2 rounded-full bg-brand mt-1.5 flex-none" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text uppercase">{ev.status.replace(/_/g, ' ')}</span>
                      <span className="text-dim">· {ev.actor}</span>
                    </div>
                    <p className="text-dim mt-0.5">{ev.note}</p>
                    <span className="text-[10px] text-faint">
                      {new Date(ev.created_at).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 7-DAY RETURN MODAL */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface max-w-lg w-full rounded-3xl p-6 sm:p-8 border border-line shadow-2xl">
            <h2 className="d text-3xl font-black uppercase mb-2">Request 7-Day Return</h2>
            <p className="text-xs font-mono text-dim mb-6">
              Returns are accepted within 7 days of delivery. Refunds are credited via Razorpay.
            </p>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-dim mb-1">Select Item to Return</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg border border-line text-xs font-mono text-text focus:outline-brand"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.variant_snapshot?.title} (₹{((i.unit_price_paise * i.quantity) / 100).toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-dim mb-1">Reason for Return</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Size mismatch, defective audio channel, or changed preference"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full p-3 rounded-xl bg-bg border border-line text-xs text-text focus:outline-brand"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="btn g sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="btn sm"
                >
                  {submittingReturn ? 'Submitting…' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<div className="w max-w-5xl mx-auto pt-36 min-h-[60vh] skeleton rounded-3xl" />}>
      <OrderTrackingContent />
    </Suspense>
  );
}
