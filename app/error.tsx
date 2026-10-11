"use client";
import Link from "next/link";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page">
      <div className="empty">
        <h1>A little pause in the shop.</h1>
        <p>Something went wrong. Please retry, or return to the shop.</p>
        <div className="row">
          <button className="button" onClick={reset}>
            Try again
          </button>
          <Link className="button secondary" href="/">
            Back to the shop
          </Link>
        </div>
      </div>
    </div>
  );
}
