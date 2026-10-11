'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import { SiteFooter } from '@/components/chrome/SiteFooter';

export default function SupportPage() {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('order_inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) return;
    const generated = 'TKT-' + Math.floor(100000 + Math.random() * 900000);
    setTicketId(generated);
    setSubmitted(true);
  };

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen pt-28 pb-20 bg-bg text-text">
        <div className="w max-w-4xl mx-auto">
          <div className="mb-12">
            <p className="m text-xs font-mono text-dim uppercase tracking-wider mb-2">Help Desk</p>
            <h1 className="d text-5xl sm:text-7xl font-black uppercase tracking-tight">Support Tickets</h1>
            <p className="text-dim text-base sm:text-lg mt-3 max-w-2xl">
              File a support inquiry regarding deliveries, payment verification, product queries, or return moderations.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-10 items-start">
            {/* Form */}
            <div className="p-8 rounded-2xl bg-surface border border-line">
              {submitted ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-ok/15 text-ok font-bold text-xl flex items-center justify-center mx-auto font-mono">
                    SENT
                  </div>
                  <h3 className="d text-3xl font-bold uppercase text-text">Ticket Created</h3>
                  <p className="text-dim text-sm max-w-md mx-auto">
                    Your request has been logged under ticket reference:
                  </p>
                  <div className="p-3 bg-bg rounded-xl font-mono text-base font-bold text-[var(--ax)] border border-line inline-block">
                    {ticketId}
                  </div>
                  <p className="text-xs text-dim pt-2">
                    Our team reviews tickets within 2 hours. You can also query this ticket with our AI assistant.
                  </p>
                  <div className="pt-4 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setSubmitted(false);
                        setSubject('');
                        setMessage('');
                      }}
                      className="btn g text-sm"
                    >
                      Submit Another Ticket
                    </button>
                    <Link href="/orders" className="btn text-sm">
                      Check Orders
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-xs font-mono text-dim uppercase mb-2">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-bg border border-line text-text focus:outline-none focus:border-[var(--ax)] font-mono text-sm"
                    >
                      <option value="order_inquiry">Order Status &amp; Tracking</option>
                      <option value="payment_issue">Razorpay Payment &amp; Refund</option>
                      <option value="return_request">Return &amp; Exchange Verification</option>
                      <option value="product_qa">Product Specification &amp; Stock</option>
                      <option value="seller_kyc">Seller KYC &amp; Onboarding</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-dim uppercase mb-2">Subject</label>
                    <input
                      type="text"
                      required
                      placeholder="Brief summary of the issue..."
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-bg border border-line text-text focus:outline-none focus:border-[var(--ax)] text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-dim uppercase mb-2">Description</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Describe your issue with order IDs or variant details..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-bg border border-line text-text focus:outline-none focus:border-[var(--ax)] text-sm leading-relaxed"
                    />
                  </div>

                  <button type="submit" className="btn w-full font-bold">
                    Submit Support Ticket &rarr;
                  </button>
                </form>
              )}
            </div>

            {/* Sidebar Guidelines */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-surface border border-line">
                <h4 className="m text-xs font-mono uppercase text-dim mb-3">Service Level Guarantees</h4>
                <ul className="space-y-3 text-xs text-dim list-none p-0">
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--ax)] font-bold">●</span>
                    <span><b className="text-text">Delivery issues:</b> Priority resolution within 2 hours during transit.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--ax)] font-bold">●</span>
                    <span><b className="text-text">Simulated refunds:</b> Triggered instantly upon return verification.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[var(--ax)] font-bold">●</span>
                    <span><b className="text-text">Seller approvals:</b> Moderated within 24 hours in Admin portal.</span>
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl bg-surface border border-line text-center">
                <h4 className="font-bold text-base mb-2">Need an instant answer?</h4>
                <p className="text-xs text-dim mb-4">
                  Our AI Shopping Assistant can check live order status and look up policies instantly.
                </p>
                <Link href="/assistant" className="btn g w-full text-xs font-mono">
                  Chat with Assistant
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
