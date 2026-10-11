import Link from "next/link";
export default function Page() {
  return (
    <div className="page narrow">
      <div className="page-title">
        <h1>About this demonstration</h1>
        <p>
          styleshopZ is a portfolio marketplace with simulated payments and
          deliveries.
        </p>
      </div>
      <div className="panel stack">
        <p>
          Account, cart, order, stock, support and seller records persist on the
          server. Gemini/Groq chat and external payment providers are enabled
          only after their credentials are configured by the owner.
        </p>
        <p className="muted">
          Deployment and setup instructions live in the private owner guide
          supplied with the project.
        </p>
        <Link className="button" href="/help">
          Visit the help centre
        </Link>
      </div>
    </div>
  );
}
