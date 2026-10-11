'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  tools?: string[];
  results?: any[];
  actionProposal?: {
    action: string;
    prompt: string;
    buttonLabel: string;
  } | null;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "Hello! I'm your styleshopZ AI shopping assistant. I can search 500+ live products, verify flash deals & coupons, summarize verified reviews, and check real-time order tracking. What are you looking for today?",
      tools: ['Search and filter', 'Find deals and coupons'],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (userText: string) => {
    if (!userText.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: userText.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText.trim() }),
      });
      const data = await res.json();

      if (res.ok) {
        const assistantMsg: ChatMessage = {
          id: `a_${Date.now()}`,
          sender: 'assistant',
          text: data.reply,
          tools: data.tools || [],
          results: data.results || [],
          actionProposal: data.actionProposal || null,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: 'assistant',
            text: data.error || 'Sorry, I encountered an issue. Please try again.',
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: 'Network error communicating with shopping assistant.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleActionConfirm = (action: string) => {
    if (action === 'cancel_order') {
      sendMessage('Yes, please confirm cancellation of my order.');
    } else if (action === 'return_order') {
      sendMessage('Yes, please open the 7-day return request flow.');
    }
  };

  return (
    <div className="w max-w-4xl mx-auto pt-28 sm:pt-36 pb-24 flex flex-col min-h-[85vh]">
      <div className="mb-6">
        <p className="m text-xs font-mono text-dim mb-1">AI Co-pilot · Strict Confirmation Gating</p>
        <h1 className="d text-4xl sm:text-6xl font-black uppercase">AI Shopping Assistant</h1>
        <p className="text-dim text-xs font-mono mt-1">
          Catalogue-backed answers only · Never invents prices · Gated confirmations
        </p>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 bg-surface border border-line rounded-3xl p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto mb-6 shadow-inner">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col max-w-[88%] sm:max-w-[80%] ${
              m.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
            }`}
          >
            {/* Message Bubble */}
            <div
              className={`p-4 sm:p-5 rounded-2xl text-sm leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-brand text-on-brand font-medium rounded-br-none shadow-md'
                  : 'bg-bg text-text border border-line/60 rounded-bl-none'
              }`}
            >
              {/* Tool Execution Chips */}
              {m.tools && m.tools.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {m.tools.map((tool) => (
                    <span
                      key={tool}
                      className="text-[11px] font-mono px-2.5 py-0.5 rounded-full border border-brand/50 text-brand bg-brand/5"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              )}

              <p>{m.text}</p>

              {/* Rich Tool Results Cards */}
              {m.results && m.results.length > 0 && (
                <div className="mt-4 space-y-3 pt-3 border-t border-line/40">
                  {m.results.map((res, idx) => {
                    if (res.type === 'products') {
                      return (
                        <div key={idx} className="space-y-2">
                          <p className="text-xs font-mono text-dim uppercase">Found in Catalogue:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {res.items.map((prod: any) => (
                              <Link
                                key={prod.id}
                                href={`/products/${prod.id}`}
                                className="p-3 rounded-xl bg-surface border border-line hover:border-brand transition-colors block text-xs"
                              >
                                <span className="font-semibold block text-text line-clamp-1">{prod.title}</span>
                                <div className="flex justify-between items-center mt-1 font-mono">
                                  <span className="text-brand font-bold">{prod.price}</span>
                                  <span className="text-dim">{prod.inStock ? 'In Stock' : 'Out'}</span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (res.type === 'deals') {
                      return (
                        <div key={idx} className="space-y-2">
                          <p className="text-xs font-mono text-brand uppercase">Active Deals & Coupons:</p>
                          <div className="grid gap-2">
                            {res.deals.map((d: any, dIdx: number) => (
                              <div key={dIdx} className="p-3 rounded-xl bg-surface border border-line flex justify-between items-center text-xs">
                                <span className="font-medium line-clamp-1 pr-2">{d.title}</span>
                                <span className="font-mono text-brand font-bold flex-none">{d.dealPrice}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    if (res.type === 'review_summary') {
                      return (
                        <div key={idx} className="p-3 rounded-xl bg-surface border border-line text-xs font-mono text-dim">
                          <b className="text-brand block mb-1">Customer Sentiment Breakdown:</b>
                          {res.summary}
                        </div>
                      );
                    }

                    if (res.type === 'order_status') {
                      return (
                        <div key={idx} className="p-3 rounded-xl bg-surface border border-line text-xs font-mono">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-brand font-bold uppercase">{res.status}</span>
                            <span className="text-dim">{res.total}</span>
                          </div>
                          <p className="text-dim">{res.latestUpdate || res.note}</p>
                        </div>
                      );
                    }

                    return null;
                  })}
                </div>
              )}

              {/* Action Confirmation Card (Gated confirmation) */}
              {m.actionProposal && (
                <div className="mt-4 pt-3 border-t border-line/60">
                  <p className="text-xs font-mono text-text font-semibold mb-2">
                    {m.actionProposal.prompt}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleActionConfirm(m.actionProposal!.action)}
                      className="btn sm text-xs"
                    >
                      {m.actionProposal.buttonLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => sendMessage('No, cancel this action.')}
                      className="btn g sm text-xs"
                    >
                      Not now
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="self-start p-4 rounded-2xl bg-bg border border-line text-xs font-mono text-dim flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
            Querying live catalogue and active promotions…
          </div>
        )}
      </div>

      {/* Suggested Prompts Pill Bar */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2">
        <button
          type="button"
          onClick={() => sendMessage('Find me deals on wireless headphones')}
          className="px-3 py-1.5 rounded-full text-xs font-mono border border-line text-dim hover:text-text hover:border-brand whitespace-nowrap transition-colors"
        >
          Headphones deals
        </button>
        <button
          type="button"
          onClick={() => sendMessage('Show active coupons and flash offers')}
          className="px-3 py-1.5 rounded-full text-xs font-mono border border-line text-dim hover:text-text hover:border-brand whitespace-nowrap transition-colors"
        >
          Active coupons
        </button>
        <button
          type="button"
          onClick={() => sendMessage('Summarize reviews for audio clarity')}
          className="px-3 py-1.5 rounded-full text-xs font-mono border border-line text-dim hover:text-text hover:border-brand whitespace-nowrap transition-colors"
        >
          Review summary
        </button>
        <button
          type="button"
          onClick={() => sendMessage('Where is my recent order?')}
          className="px-3 py-1.5 rounded-full text-xs font-mono border border-line text-dim hover:text-text hover:border-brand whitespace-nowrap transition-colors"
        >
          Check order tracking
        </button>
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          maxLength={1500}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about products, deals, orders, or policies…"
          className="flex-1 px-5 py-3.5 rounded-2xl bg-surface border border-line text-sm text-text focus:outline-brand"
        />
        <button type="submit" disabled={loading || !input.trim()} className="btn">
          Send
        </button>
      </form>
    </div>
  );
}
