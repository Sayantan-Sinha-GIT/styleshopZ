'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function OrdersListPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/orders')
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) setOrders(data.orders);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'bg-[var(--ok)]/15 text-[var(--ok)] border-[var(--ok)]/30';
      case 'out_for_delivery':
      case 'shipped':
        return 'bg-brand/20 text-brand border-brand/30';
      case 'cancelled':
        return 'bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/30';
      default:
        return 'bg-surface-2 text-dim border-line';
    }
  };

  if (loading) {
    return (
      <div className="w max-w-5xl mx-auto pt-36 pb-24 min-h-[60vh]">
        <div className="h-10 w-48 rounded skeleton mb-8" />
        <div className="space-y-4">
          <div className="h-32 rounded-2xl skeleton" />
          <div className="h-32 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="w max-w-xl mx-auto pt-40 pb-24 text-center">
        <h1 className="d text-5xl font-black mb-4">No Orders Yet</h1>
        <p className="text-dim mb-8">You haven't placed any orders yet. Discover our latest deals.</p>
        <Link href="/" className="btn">Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="w max-w-5xl mx-auto pt-28 sm:pt-36 pb-24">
      <h1 className="d text-4xl sm:text-6xl font-black uppercase mb-8">My Orders</h1>

      <div className="space-y-6">
        {orders.map((ord) => (
          <div
            key={ord.id}
            className="p-6 rounded-3xl bg-surface border border-line flex flex-col sm:flex-row justify-between gap-6 items-start sm:items-center hover:border-line-strong transition-colors"
          >
            <div>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${getStatusColor(ord.status)}`}>
                  {ord.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-mono text-dim">
                  Placed on {new Date(ord.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <p className="text-sm text-dim font-mono mb-1">
                Order ID: <span className="text-text">{ord.id}</span>
              </p>
              <p className="text-xs text-dim">
                {ord.item_count} {ord.item_count === 1 ? 'item' : 'items'} · Payment: {ord.payment_method.toUpperCase()}
              </p>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4">
              <span className="text-2xl font-bold font-mono text-brand">
                ₹{(ord.total_paise / 100).toLocaleString('en-IN')}
              </span>
              <Link
                href={`/orders/${ord.id}`}
                className="btn sm text-xs font-mono"
              >
                Track & Details &rarr;
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
