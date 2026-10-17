export default function Page() {
  return (
    <article className="page narrow legal">
      <div className="page-title">
        <h1>Privacy policy</h1>
        <p>Updated 15 October 2026 · Prototype environment</p>
      </div>
      <h2>What this app stores</h2>
      <p>
        When you create an email account, the app stores your name, email and a
        password hash. Google sign-in stores the profile details used to create
        your shop account, including your Google account identifier and verified
        email. Delivery addresses, phone numbers, carts, wishlists,
        orders, support messages, reviews, uploaded images and assistant
        conversations are stored when you use those features. Do not submit real
        identity or financial documents to this demonstration.
      </p>
      <h2>Where your data goes</h2>
      <p>
        The website runs on Cloudflare, and application data is stored in Neon
        PostgreSQL. Uploaded demo images are stored in the same database. If the
        owner enables Gemini or Groq, your assistant message and relevant shop
        results are sent to that provider to answer your request.
        Google sign-in uses Firebase Authentication and Google to verify your
        identity. Brevo sends email verification and password-reset messages to
        your email address when email delivery is configured. If Razorpay test payments are
        enabled, its checkout handles test payment details directly. The app
        does not store card numbers.
      </p>
      <h2>Location and maps</h2>
      <p>
        Address search and pin-to-address lookup use Ola Maps. Your search text
        and the location used for the lookup are sent through the app to Ola.
        The visible map loads tiles from OpenStreetMap, which receives normal
        browser connection details and the map areas you view. Using your current
        location requires your device permission; the app uses it to help you
        choose an address and does not continuously track you. Confirming and
        saving an address stores its selected coordinates. You can instead enter
        an address manually without granting location permission.
      </p>
      <h2>Cookies and device storage</h2>
      <p>
        An HTTP-only session cookie keeps you signed in. Your theme, navigation
        language, recent searches, recently viewed product IDs and guest bag are
        saved on your device. The offline cache stores public images and an
        offline page. Authenticated pages, orders and API responses are excluded
        from that cache. The app does not use advertising trackers or optional
        analytics. Push notifications and promotional email delivery are not
        included; account verification and password-reset emails are separate.
      </p>
      <h2>Your controls</h2>
      <p>
        Settings lets you clear browsing history and cache, download your
        account data, and delete a customer account. Deletion removes saved
        addresses and assistant messages and anonymises retained order records.
        Seller or administrator accounts require a support request because they
        are attached to operational records. Uploaded images and immutable
        operational audit entries may remain attached to retained records.
        Reviews, product questions and support conversations may also remain in
        the demonstration after account deletion. Deleting your shop account does
        not delete your Google account or records held independently by external
        providers.
      </p>
      <h2>Questions</h2>
      <p>
        Open an in-app support ticket to ask about your data. This app is a
        prototype; use dummy personal details whenever possible. External
        providers process the requests they receive under their own terms and
        privacy policies.
      </p>
    </article>
  );
}
