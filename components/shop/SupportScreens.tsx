"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUp } from "@phosphor-icons/react";
import { SupportWorkspace } from "./SupportConsole";
import {
  useStore,
  useData,
  api,
  AuthGate,
  State,
  Empty,
  Field,
  ErrorText,
  date,
  money,
  type Item,
} from "./Store";

export function SupportScreen() {
  return (
    <div className="page">
      <AuthGate>
        <SupportWorkspace />
      </AuthGate>
    </div>
  );
}
export { SupportWorkspace } from "./SupportConsole";

export function AssistantScreen() {
  return (
    <div className="page narrow">
      <AuthGate>
        <Assistant />
      </AuthGate>
    </div>
  );
}
function Assistant() {
  const { config, setNotice } = useStore(),
    history = useData("assistant/chat"),
    [messages, setMessages] = useState<Item[]>([]),
    [input, setInput] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (history.data)
      setMessages(
        history.data.messages.map((m: Item) => ({
          role: m.role,
          content: m.content,
        })),
      );
  }, [history.data]);
  const send = async (message: string, confirmation?: string) => {
    setBusy(true);
    setError("");
    if (message)
      setMessages((old) => [...old, { role: "user", content: message }]);
    setInput("");
    try {
      const r = await api(
        "assistant/chat",
        "POST",
        confirmation ? { confirmation } : { message },
      );
      setMessages((old) => [
        ...old,
        {
          role: "assistant",
          content: r.reply,
          results: r.results,
          action: r.actionProposal,
          remaining: r.remaining,
        },
      ]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="assistant-intro">
        <div>
          <h1>A little help finding your thing.</h1>
          <p className="muted space-top">
            {config.ai
              ? "Ask about products, offers or your orders."
              : "Find products and offers, check your orders, or ask about returns. Open-ended chat is currently unavailable."}
          </p>
        </div>
        <img src="/photos/banner1.webp" alt="Headphones from the shop" />
      </div>
      <div className="chips">
        {[
          "Find wireless headphones",
          "Show current offers",
          "Track my order",
          "What is the return policy?",
        ].map((p) => (
          <button
            className="chip"
            style={{ color: "var(--text)", cursor: "pointer" }}
            disabled={busy}
            key={p}
            onClick={() => send(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="panel assistant-chat">
        <State
          loading={history.loading && !messages.length}
          error={history.error}
          retry={history.refresh}
        >
          <div
            className="messages"
            style={{ maxHeight: 600 }}
            aria-live="polite"
          >
            {!messages.length && (
              <div className="message">
                <small>styleshopZ assistant</small>Tell me what you’re after. I
                can search the shop, find offers, or look up your own orders.
                Changes need your confirmation.
              </div>
            )}
            {messages.map((m, n) => (
              <div
                className={"message " + (m.role === "user" ? "own" : "")}
                key={n}
              >
                <small>
                  {m.role === "user" ? "You" : "Shopping assistant"}
                </small>
                {m.content}
                {m.results?.map((r: Item, index: number) => (
                  <div key={index} className="assistant-results">
                    {r.type === "products" &&
                      r.items.map((p: Item) => (
                        <Link
                          className="assistant-product"
                          href={"/products/" + p.id}
                          key={p.id}
                        >
                          <img src={p.image_url} alt={p.title} />
                          <span>
                            {p.title}
                            <br />
                            <b>{money(p.price_paise)}</b>
                          </span>
                        </Link>
                      ))}
                    {r.type === "orders" &&
                      r.items.map((o: Item) => (
                        <Link
                          className="assistant-product"
                          href={"/orders/" + o.id}
                          key={o.id}
                        >
                          Order {o.id.slice(0, 8)} ·{" "}
                          {o.status.replaceAll("_", " ")} ·{" "}
                          {money(o.total_paise)}
                        </Link>
                      ))}
                    {r.type === "coupons" &&
                      r.items.map((c: Item) => (
                        <span className="chip" key={c.code}>
                          {c.code} ·{" "}
                          {c.discount_type === "percent"
                            ? c.discount_value + "%"
                            : money(c.discount_value)}{" "}
                          off
                        </span>
                      ))}
                    {r.type === "cart" && (
                      <Link className="button secondary small" href="/cart">
                        View your bag · {money(r.subtotalPaise)}
                      </Link>
                    )}
                  </div>
                ))}
                {m.action && !m.dismissed && (
                  <div className="stack space-top">
                    <p>{m.action.prompt}</p>
                    <div className="row">
                      <button
                        className="button small"
                        disabled={busy}
                        onClick={() => {
                          setMessages((old) =>
                            old.map((v, i) =>
                              i === n ? { ...v, dismissed: true } : v,
                            ),
                          );
                          send("", m.action.confirmation);
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        className="button quiet small"
                        onClick={() =>
                          setMessages((old) =>
                            old.map((v, i) =>
                              i === n ? { ...v, dismissed: true } : v,
                            ),
                          )
                        }
                      >
                        Keep things as they are
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <div className="message" role="status">
                Looking through the shop…
              </div>
            )}
          </div>
        </State>
        <ErrorText error={error} />
        <form
          className="chat-form"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            aria-label="Message the shopping assistant"
            placeholder="What’s on your mind?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={1500}
            required
          />
          <button
            className="button"
            aria-label="Send message"
            disabled={busy || !input.trim()}
          >
            <ArrowUp size={22} />
          </button>
        </form>
        <div className="row between space-top">
          <span className="small muted">
            30 messages per day · Prices from the catalogue
          </span>
          <button
            className="button quiet small"
            disabled={busy}
            onClick={() =>
              api("assistant/chat", "DELETE")
                .then(() => setMessages([]))
                .catch((e) => setNotice(e.message))
            }
          >
            Clear history
          </button>
        </div>
      </div>
    </>
  );
}
export function HelpScreen() {
  const faqs = [
    [
      "Is this a real shop?",
      "styleshopZ is a portfolio demonstration. Products, payments, shipping and seller payouts are simulated. No purchase will trigger a real delivery.",
    ],
    [
      "How do I place a demo order?",
      "Create an account, add products to your bag, enter a delivery address and choose Demo payment or simulated COD. Your order persists and can be fulfilled by the seller workspace.",
    ],
    [
      "How much does delivery cost?",
      "Standard delivery is ₹40 below a ₹499 subtotal and free from ₹499. Express delivery is ₹99. These are simulated fees.",
    ],
    [
      "Can I cancel an order?",
      "You can cancel before any item has shipped. Open the order and confirm cancellation. Stock is restored only once.",
    ],
    [
      "What is the return window?",
      "Request a return within seven days of delivery. Add a reason and optional JPEG, PNG or WebP photos (up to four, each under 5 MB). An admin reviews the request.",
    ],
    [
      "Where are my messages?",
      "Support tickets and replies are saved in your account. Open Contact support to read or continue a conversation. The owner handles the support inbox.",
    ],
    [
      "What if an item seems missing, damaged or incorrect?",
      "Open Contact support, choose Order or delivery or Product issue, link your demo order and attach up to four photos. No real parcel is sent; the owner can investigate the simulated order and reply in the same conversation.",
    ],
    [
      "How do payment or refund problems get help?",
      "Choose Payment or refund in Contact support and link the order. Include the order reference, but never card numbers or passwords. Razorpay payments and refunds here use test mode only.",
    ],
    [
      "Can sellers contact the owner?",
      "Yes. Sellers can open a Seller shop support case from their account or the website. The owner sees it in the same support queue.",
    ],
    [
      "Can I use real card details?",
      "No. Demo payment requires no card details. If Razorpay is enabled, use its test credentials only. The app never stores card data.",
    ],
    [
      "How does the assistant work?",
      "The assistant can find products and offers, look up your orders and explain shop policies. Actions such as cancellation require a confirmation tap.",
    ],
  ];
  return (
    <div className="page narrow">
      <div className="page-title">
        <h1>A little clarity goes a long way.</h1>
        <p>Answers to the everyday questions about this demonstration shop.</p>
      </div>
      <section className="faq">
        {faqs.map(([q, a]) => (
          <details key={q}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </section>
      <div className="panel row between space-top">
        <div>
          <h2>Still have something on your mind?</h2>
          <p className="muted" style={{ marginTop: 8 }}>
            Start a ticket and keep the conversation in one place.
          </p>
        </div>
        <Link className="button" href="/support">
          Contact support
        </Link>
      </div>
    </div>
  );
}
