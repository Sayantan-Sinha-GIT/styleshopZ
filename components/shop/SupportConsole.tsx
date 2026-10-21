"use client";

import { useEffect, useState } from "react";
import { ChatCircle, Paperclip } from "@phosphor-icons/react";
import { supportCategories, supportCategoryLabel } from "@/lib/support";
import { api, date, ErrorText, State, useData, useStore, type Item } from "./Store";

async function uploadEvidence(files: FileList | null): Promise<string[]> {
  const selected = Array.from(files || []);
  if (selected.length > 4) throw new Error("Attach at most four photos.");
  const urls: string[] = [];
  for (const file of selected) {
    if (file.size > 5 * 1024 * 1024) throw new Error("Each photo must be under 5 MB.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Use JPEG, PNG or WebP photos.");
    const form = new FormData();
    form.append("file", file);
    form.append("private", "true");
    const response = await fetch("/api/uploads", { method: "POST", body: form });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "The photo could not be uploaded.");
    urls.push(body.url);
  }
  return urls;
}

function EvidenceField({ disabled = false }: { disabled?: boolean }) {
  return <label className="support-evidence-field">
    <Paperclip size={18} aria-hidden="true" />
    <span>Add photos <small>(optional · up to four, 5 MB each)</small></span>
    <input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={disabled} />
  </label>;
}

export function SupportWorkspace() {
  const { user, setNotice } = useStore();
  const [ticketId, setTicketId] = useState("");
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const list = useData(`support?status=${status}&category=${category}&q=${encodeURIComponent(search)}&offset=${page * 30}`);
  const detail = useData(ticketId ? `support?id=${ticketId}` : null);
  const orders = useData(creating && user?.role === "customer" ? "orders" : null);
  const admin = user?.role === "admin";
  useEffect(() => {
    if (!ticketId) return;
    const timer = setInterval(detail.refresh, 8000);
    return () => clearInterval(timer);
  }, [ticketId, detail.refresh]);

  const refresh = () => { detail.refresh(); list.refresh(); };
  const change = async (update: Item) => {
    setBusy(true);
    setError("");
    try {
      await api("support", "PATCH", { ticketId, ...update });
      refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return <div className="support-workspace">
    {!admin && <div className="page-title row between">
      <div>
        <h1>Here when you need us.</h1>
        <p>Tell us what happened. Every conversation stays in your account.</p>
      </div>
      <button className="button" type="button" onClick={() => { setCreating(!creating); setError(""); }}>
        {creating ? "Close form" : "New ticket"}
      </button>
    </div>}

    {creating && !admin && <form className="panel stack support-create" onSubmit={async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      setBusy(true); setError("");
      try {
        const values = new FormData(form);
        const photos = (form.elements.namedItem("photos") as HTMLInputElement).files;
        const photoUrls = await uploadEvidence(photos);
        const created = await api("support", "POST", {
          category: values.get("category"),
          orderId: values.get("orderId") || undefined,
          subject: values.get("subject"),
          message: values.get("message"),
          photoUrls,
        });
        setTicketId(created.ticketId);
        setCreating(false);
        setPage(0);
        list.refresh();
      } catch (e: any) { setError(e.message); }
      finally { setBusy(false); }
    }}>
      <h2>What can we help with?</h2>
      <div className="support-form-grid">
        <label>Issue type
          <select name="category" required defaultValue="">
            <option value="" disabled>Choose an issue</option>
            {supportCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        {user?.role === "customer" && <label>Related order <span className="muted">(optional)</span>
          <select name="orderId" defaultValue="">
            <option value="">No order to link</option>
            {orders.data?.orders?.map((order: Item) => <option key={order.id} value={order.id}>Order {order.id.slice(0, 8)} · {order.status.replaceAll("_", " ")}</option>)}
          </select>
        </label>}
      </div>
      <label>Subject
        <input name="subject" required minLength={4} maxLength={150} placeholder="A short description of the issue" />
      </label>
      <label>How can we help?
        <textarea name="message" aria-label="How can we help?" required minLength={2} maxLength={2000} placeholder="Include the steps you tried and what you expected to happen." />
      </label>
      <EvidenceField disabled={busy} />
      <p className="small muted">Photos are visible only to you and the owner support team. Do not include card numbers or passwords.</p>
      <button className="button" disabled={busy}>{busy ? "Sending…" : "Send to support"}</button>
      <ErrorText error={error} />
    </form>}

    <form className="support-toolbar" role="search" onSubmit={(event) => { event.preventDefault(); setPage(0); setSearch(searchDraft.trim()); }}>
      <label>Status
        <select aria-label="Ticket status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}>
          <option value="all">All statuses</option><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
        </select>
      </label>
      <label>Issue type
        <select aria-label="Ticket category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(0); }}>
          <option value="all">All issues</option>
          {supportCategories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label>Find a conversation
        <input aria-label="Search tickets" value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} maxLength={100} placeholder={admin ? "Subject, customer or reference" : "Subject or reference"} />
      </label>
      <button className="button secondary small" type="submit">Search</button>
    </form>

    <State loading={list.loading} error={list.error} retry={list.refresh}>
      {list.data && <>
        <p className="support-count small muted">{list.data.total} {list.data.total === 1 ? "conversation" : "conversations"} · Showing {list.data.tickets.length ? list.data.offset + 1 : 0}–{list.data.offset + list.data.tickets.length}</p>
        {list.data.tickets.length ? <div className="ticket-grid">
          <aside className="ticket-list" aria-label="Support conversations">
            {list.data.tickets.map((ticket: Item) => <button key={ticket.id} type="button" className={ticketId === ticket.id ? "active" : ""} aria-pressed={ticketId === ticket.id} onClick={() => { setTicketId(ticket.id); setError(""); }}>
              <strong>{ticket.subject}</strong>
              <span className="support-ticket-meta">{supportCategoryLabel(ticket.category)} · {ticket.status.replaceAll("_", " ")}{ticket.priority === "urgent" ? " · Urgent" : ""}</span>
              <span className="small muted">{admin ? `${ticket.customer_name} · ` : ""}{date(ticket.updated_at)}</span>
            </button>)}
            <div className="support-pages">
              <button className="button quiet small" type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
              <span className="small muted">Page {page + 1}</span>
              <button className="button quiet small" type="button" disabled={(page + 1) * 30 >= list.data.total} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          </aside>
          <div>
            {ticketId ? <State loading={detail.loading && !detail.data} error={detail.error} retry={detail.refresh}>
              {detail.data && <section className="panel support-detail">
                <div className="support-detail-head">
                  <div>
                    <h2>{detail.data.ticket.subject}</h2>
                    <p className="small muted">{supportCategoryLabel(detail.data.ticket.category)} · {detail.data.ticket.status.replaceAll("_", " ")} · Ref {detail.data.ticket.id.slice(0, 8)}</p>
                    {admin && <p className="small muted">{detail.data.ticket.customer_name} · {detail.data.ticket.customer_email}</p>}
                    {detail.data.ticket.order_id && <p className="small muted">Linked order: {detail.data.ticket.order_id}</p>}
                  </div>
                  {admin && <label className="support-priority">Priority
                    <select aria-label="Ticket priority" value={detail.data.ticket.priority} disabled={busy} onChange={(event) => change({ priority: event.target.value })}>
                      <option value="normal">Normal</option><option value="urgent">Urgent</option>
                    </select>
                  </label>}
                </div>
                <div className="row support-actions">
                  {admin && detail.data.ticket.status === "open" && <button className="button quiet small" type="button" disabled={busy} onClick={() => change({ status: "in_progress" })}>Mark in progress</button>}
                  {["open", "in_progress"].includes(detail.data.ticket.status) ? <button className="button quiet small" type="button" disabled={busy} onClick={() => change({ status: "resolved" })}>Mark resolved</button> : <button className="button quiet small" type="button" disabled={busy} onClick={() => change({ status: "open" })}>Reopen ticket</button>}
                  {detail.data.ticket.status !== "closed" && <button className="button quiet small" type="button" disabled={busy} onClick={() => change({ status: "closed" })}>Close ticket</button>}
                </div>
                <div className="messages" aria-live="polite">
                  {detail.data.messages.map((entry: Item) => <div className={`message ${entry.sender_id === user?.id ? "own" : ""} ${entry.is_internal ? "support-internal" : ""}`} key={entry.id}>
                    <small>{entry.sender_name} · {entry.is_internal ? "Internal owner note" : entry.sender_role} · {date(entry.created_at)}</small>
                    <p>{entry.message}</p>
                    {Array.isArray(entry.attachment_urls) && entry.attachment_urls.length > 0 && <div className="support-evidence">
                      {entry.attachment_urls.map((url: string, index: number) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Evidence photo ${index + 1}`} /></a>)}
                    </div>}
                  </div>)}
                </div>
                {["open", "in_progress"].includes(detail.data.ticket.status) ? <form className="chat-form support-reply" onSubmit={async (event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  setBusy(true); setError("");
                  try {
                    const photoUrls = await uploadEvidence((form.elements.namedItem("photos") as HTMLInputElement).files);
                    await api("support", "POST", { ticketId, message, photoUrls, isInternal: admin && internal });
                    setMessage(""); setInternal(false); form.reset(); refresh();
                  } catch (e: any) { setError(e.message); }
                  finally { setBusy(false); }
                }}>
                  <textarea aria-label="Reply to ticket" placeholder={admin && internal ? "Write a private case note…" : "Write a reply…"} value={message} onChange={(event) => setMessage(event.target.value)} required minLength={2} maxLength={2000} disabled={busy} />
                  <EvidenceField disabled={busy} />
                  {admin && <label className="support-internal-toggle"><input type="checkbox" checked={internal} onChange={(event) => setInternal(event.target.checked)} disabled={busy} /> Internal note — only the owner can see this</label>}
                  <button className="button" disabled={busy || !message.trim()}>{busy ? "Sending…" : admin && internal ? "Save note" : "Send reply"}</button>
                </form> : <p className="small muted space-top">This conversation is {detail.data.ticket.status}. Reopen it to send another message.</p>}
                <ErrorText error={error} />
                <p className="small muted space-top">Messages refresh every eight seconds. You can return to this conversation later.</p>
              </section>}
            </State> : <div className="empty"><ChatCircle size={44} /><h2>A conversation starts here.</h2><p>Choose a ticket to read its history and reply.</p></div>}
          </div>
        </div> : <div className="empty"><ChatCircle size={44} /><h2>No conversations here yet.</h2><p>{search || status !== "all" || category !== "all" ? "Try different filters or search terms." : admin ? "New conversations will appear here." : "Open a ticket when you need a hand."}</p></div>}
      </>}
    </State>
    {!admin && <p className="small muted space-top">For immediate account access or payment safety issues, choose the matching issue type and describe the problem. This is a demo shop; no real payment or parcel is involved.</p>}
  </div>;
}
