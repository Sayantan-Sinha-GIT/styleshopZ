'use client';

import { useEffect, useState } from 'react';

export default function AdminPanelPage() {
  const [loading, setLoading] = useState(true);
  const [sellers, setSellers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const [sellersRes, ordersRes] = await Promise.all([
        fetch('/api/admin/sellers'),
        fetch('/api/admin/orders'),
      ]);
      const sellersData = await sellersRes.json();
      const ordersData = await ordersRes.json();

      if (sellersData.sellers) setSellers(sellersData.sellers);
      if (ordersData.orders) setOrders(ordersData.orders);
      if (ordersData.returns) setReturns(ordersData.returns);
    } catch {
      // Data fetch error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateKyc = async (sellerId: string, kycStatus: string) => {
    setProcessingId(sellerId);
    try {
      const res = await fetch('/api/admin/sellers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, kycStatus }),
      });
      if (res.ok) {
        fetchAdminData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update KYC');
      }
    } catch {
      alert('Error updating KYC');
    } finally {
      setProcessingId(null);
    }
  };

  const handleProcessReturn = async (returnId: string, action: 'approve' | 'reject') => {
    setProcessingId(returnId);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnId, action }),
      });
      if (res.ok) {
        fetchAdminData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to process return');
      }
    } catch {
      alert('Error processing return');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w max-w-6xl mx-auto pt-28 sm:pt-36 pb-24">
      {/* Header */}
      <div className="mb-10">
        <p className="m text-xs font-mono text-dim mb-2">Platform Administration</p>
        <h1 className="d text-4xl sm:text-6xl font-black uppercase">Admin Panel</h1>
        <p className="text-dim text-sm max-w-xl mt-2">
          Moderation queue, seller KYC approvals, return verifications, and simulated refunds.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <div className="p-6 rounded-3xl bg-surface border border-line">
          <p className="text-xs font-mono text-dim uppercase">Registered Merchants</p>
          <span className="text-4xl font-bold font-mono text-brand block mt-2">{sellers.length}</span>
        </div>
        <div className="p-6 rounded-3xl bg-surface border border-line">
          <p className="text-xs font-mono text-dim uppercase">Total Orders</p>
          <span className="text-4xl font-bold font-mono text-text block mt-2">{orders.length}</span>
        </div>
        <div className="p-6 rounded-3xl bg-surface border border-line">
          <p className="text-xs font-mono text-dim uppercase">Return Requests</p>
          <span className="text-4xl font-bold font-mono text-brand block mt-2">{returns.length}</span>
        </div>
      </div>

      {/* SELLER KYC APPROVAL QUEUE */}
      <div className="p-8 rounded-3xl bg-surface border border-line mb-12">
        <h2 className="d text-3xl font-black uppercase mb-6">Seller KYC Approvals</h2>
        {loading ? (
          <div className="space-y-4">
            <div className="h-20 rounded-2xl skeleton" />
            <div className="h-20 rounded-2xl skeleton" />
          </div>
        ) : sellers.length === 0 ? (
          <p className="text-xs font-mono text-dim">No sellers in queue.</p>
        ) : (
          <div className="space-y-4">
            {sellers.map((s) => (
              <div
                key={s.id}
                className="p-5 rounded-2xl bg-bg border border-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-base">{s.business_name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        s.kyc_status === 'approved'
                          ? 'bg-[var(--ok)]/15 text-[var(--ok)]'
                          : s.kyc_status === 'rejected'
                          ? 'bg-[var(--danger)]/15 text-[var(--danger)]'
                          : 'bg-brand/15 text-brand'
                      }`}
                    >
                      {s.kyc_status}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-dim">
                    Owner: {s.owner_name} ({s.email}) · PAN: {s.pan_number} · GSTIN: {s.gstin}
                  </p>
                </div>

                <div className="flex gap-2">
                  {s.kyc_status !== 'approved' && (
                    <button
                      type="button"
                      disabled={processingId === s.id}
                      onClick={() => handleUpdateKyc(s.id, 'approved')}
                      className="btn sm text-xs font-mono"
                    >
                      Approve KYC
                    </button>
                  )}
                  {s.kyc_status !== 'rejected' && (
                    <button
                      type="button"
                      disabled={processingId === s.id}
                      onClick={() => handleUpdateKyc(s.id, 'rejected')}
                      className="btn g sm text-xs font-mono"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RETURN REQUESTS & REFUNDS */}
      <div className="p-8 rounded-3xl bg-surface border border-line">
        <h2 className="d text-3xl font-black uppercase mb-6">Return Requests & Refunds</h2>
        {returns.length === 0 ? (
          <p className="text-xs font-mono text-dim">No pending returns submitted.</p>
        ) : (
          <div className="space-y-4">
            {returns.map((ret) => (
              <div
                key={ret.id}
                className="p-5 rounded-2xl bg-bg border border-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">
                      {ret.variant_snapshot?.title || 'Returned Item'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                        ret.status === 'refunded'
                          ? 'bg-[var(--ok)]/15 text-[var(--ok)]'
                          : 'bg-brand/15 text-brand'
                      }`}
                    >
                      {ret.status}
                    </span>
                  </div>
                  <p className="text-xs text-dim mb-1">
Legacy demonstration credentials removed.
                  </p>
                  <p className="text-xs font-mono text-brand">
                    Reason: "{ret.reason}"
                  </p>
                </div>

                {ret.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={processingId === ret.id}
                      onClick={() => handleProcessReturn(ret.id, 'approve')}
                      className="btn sm text-xs font-mono"
                    >
                      Approve & Refund
                    </button>
                    <button
                      type="button"
                      disabled={processingId === ret.id}
                      onClick={() => handleProcessReturn(ret.id, 'reject')}
                      className="btn g sm text-xs font-mono"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
