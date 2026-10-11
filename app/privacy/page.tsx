export default function Page() {
  return (
    <article className="page narrow legal">
      <div className="page-title">
        <h1>Your privacy in the shop</h1>
        <p>Updated 11 October 2026 · Demonstration environment</p>
      </div>
      <h2>What this app stores</h2>
      <p>
        When you create an account, the app stores your name, email and a
        password hash. Delivery addresses, phone numbers, carts, wishlists,
        orders, support messages, reviews, uploaded images and assistant
        conversations are stored when you use those features. Do not submit real
        identity or financial documents to this demonstration.
      </p>
      <h2>Where your data goes</h2>
      <p>
        The website runs on Cloudflare, and application data is stored in Neon
        PostgreSQL. Uploaded demo images are stored in the same database. If the
        owner enables Gemini or Groq, your assistant message and the relevant
        shop results are sent to that provider. If Razorpay test payments are
        enabled, its checkout handles test payment details directly. The app
        does not store card numbers.
      </p>
      <h2>Cookies and device storage</h2>
      <p>
        An HTTP-only session cookie keeps you signed in. Your theme, navigation
        language, recent searches, recently viewed product IDs and guest bag are
        saved on your device. The offline cache stores public images and an
        offline page. Authenticated pages, orders and API responses are excluded
        from that cache. Optional analytics, push and email providers are
        currently disabled.
      </p>
      <h2>Your controls</h2>
      <p>
        Settings lets you clear browsing history and cache, download your
        account data, and delete a customer account. Deletion removes saved
        addresses and assistant messages and anonymises retained order records.
        Seller or administrator accounts require a support request because they
        are attached to operational records. Uploaded images and immutable
        operational audit entries may remain attached to retained records.
      </p>
      <h2>Questions</h2>
      <p>
        Open an in-app support ticket to ask about your data. This portfolio app
        is provided as a demonstration; use dummy personal details whenever
        possible.
      </p>
    </article>
  );
}
