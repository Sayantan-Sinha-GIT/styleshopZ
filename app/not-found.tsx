import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page">
      <div className="empty">
        <h1>This find took a wrong turn.</h1>
        <p>The page may have moved. There’s plenty more to explore.</p>
        <Link className="button" href="/search">
          Explore the shop
        </Link>
      </div>
    </div>
  );
}
