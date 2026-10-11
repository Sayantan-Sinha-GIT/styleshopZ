'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function SellerPortalPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [trackingInput, setTrackingInput] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/seller/orders');
      const data = await res.json();
      if (data.items) setOrders(data.items);
    } catch {
      // Fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderItemId: string, newStatus: string) => {
    setUpdatingId(orderItemId);
    const trackingId = trackingInput[orderItemId] || `TRK-IN-${Math.floor(100000 + Math.random() * 900000)}`;
    try {
      const res = await fetch('/api/seller/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderItemId, newStatus, trackingId }),
      });
      if (res.ok) {
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update order status');
      }
    } catch {
      alert('Error updating status');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="w max-w-6xl mx-auto pt-28 sm:pt-36 pb-24">
      {/* Header & KYC Banner */}
      <div className="mb-10">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-3">
          <p className="m text-xs font-mono text-dim">Merchant Dashboard</p>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--ok)]/30 bg-[var(--ok)]/10 text-[var(--ok)] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-[var(--ok)]" />
            <span>KYC Status: Approved Merchant</span>
          </div>
        </div>
        <h1 className="d text-4xl sm:text-6xl font-black uppercase">Seller Portal</h1>
        <p className="text-dim text-sm max-w-xl mt-2">
          Manage assigned orders, dispatch shipments, enter tracking numbers, and view sales.
        </p>
      </div>

      {/* Orders to Fulfill */}
      <div className="p-8 rounded-3xl bg-surface border border-line mb-10">
        <h2 className="d text-3xl font-black uppercase mb-6">Assigned Customer Shipments</h2>

        {loading ? (
          <div className="space-y-4">
            <div className="h-24 rounded-2xl skeleton" />
            <div className="h-24 rounded-2xl skeleton" />
          </div>
        ) : orders.length === 0 ? (
          <p className="text-dim text-sm font-mono">No customer orders currently awaiting fulfillment.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-bg border border-line flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-brand text-on-brand font-bold uppercase">
                      {item.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-mono text-dim">
                      {new Date(item.created_at).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base text-text mb-1">
                    {item.variant_snapshot?.title}
                  </h3>
                  <p className="text-xs font-mono text-dim">
                    Qty: {item.quantity} · Price: ₹{((item.unit_price_paise * item.quantity) / 100).toLocaleString('en-IN')}
                  </p>
                  {item.tracking_id && (
                    <p className="text-xs font-mono text-brand mt-1">
                      Tracking ID: {item.tracking_id}
                    </p>
                  )}
                </div>

                {/* Fulfillment Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  {item.status === 'placed' && (
                    <button
                      type="button"
                      disabled={updatingId === item.id}
                      onClick={() => handleUpdateStatus(item.id, 'packed')}
                      className="btn sm text-xs font-mono"
                    >
                      {updatingId === item.id ? 'Updating…' : 'Mark as Packed'}
                    </button>
                  )}

                  {item.status === 'packed' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Tracking ID (optional)"
                        value={trackingInput[item.id] || ''}
                        onChange={(e) =>
                          setTrackingInput({ ...trackingInput, [item.id]: e.target.value })
                        }
                        className="px-3 py-1.5 rounded-xl bg-surface border border-line text-xs font-mono text-text focus:outline-brand"
                      />
                      <button
                        type="button"
                        disabled={updatingId === item.id}
                        onClick={() => handleUpdateStatus(item.id, 'shipped')}
                        className="btn sm text-xs font-mono whitespace-nowrap"
                      >
                        {updatingId === item.id ? 'Dispatching…' : 'Dispatch / Ship'}
                      </button>
                    </div>
                  )}

                  {item.status === 'shipped' && (
                    <button
                      type="button"
                      disabled={updatingId === item.id}
                      onClick={() => handleUpdateStatus(item.id, 'out_for_delivery')}
                      className="btn sm text-xs font-mono"
                    >
                      Out for Delivery
                    </button>
                  )}

                  {item.status === 'out_for_delivery' && (
                    <button
                      type="button"
                      disabled={updatingId === item.id}
                      onClick={() => handleUpdateStatus(item.id, 'delivered')}
                      className="btn sm text-xs font-mono"
                    >
                      Mark Delivered
                    </button>
                  )}

                  {item.status === 'delivered' && (
                    <span className="text-xs font-mono text-[var(--ok)] font-bold px-3 py-1 rounded-full bg-[var(--ok)]/10 border border-[var(--ok)]/20">
                      Delivered
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seller Rules / Payout Ledger Card */}
      <div className="p-6 rounded-3xl bg-surface border border-line">
        <h3 className="text-base font-bold mb-2">Simulated Payout & Settlement Ledger</h3>
        <p className="text-xs font-mono text-dim leading-relaxed">
          Payouts settle within T+2 days directly to verified PAN and GSTIN accounts. All tax invoices and commission deductions are simulated.
        </p>
      </div>
    </div>
  );
}
