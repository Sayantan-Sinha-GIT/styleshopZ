import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { SpringLetters, Magnetic } from "@/components/fx/more";
export function SiteFooter() {
  return (
    <footer className="shop-footer">
      <div className="storefront-wrap footer-scene">
        <SpringLetters>Find. Buy. <em>Track.</em></SpringLetters>
        <p>The everyday find, wherever you are.</p>
        <div className="android-download"><Magnetic><a className="button" href="/downloads/styleshopz-1.3.1.apk">Get the Android app <ArrowUpRight size={20}/></a></Magnetic></div>
        <svg className="footer-route" viewBox="0 0 1200 90" preserveAspectRatio="none" aria-hidden="true"><path d="M0 65C180 65 220 10 400 35S650 85 800 40 1080 5 1200 40"/><path d="M0 65C180 65 220 10 400 35S650 85 800 40 1080 5 1200 40"/></svg>
      </div>
      <div className="footer-inner">
        <div>
          <Link href="/" className="brand">
            styleshop<span>Z</span>
          </Link>
          <p>Good finds. All in one place.</p>
          <span className="muted small">
            A portfolio marketplace with demo checkout and simulated delivery.
          </span>
        </div>
        <div>
          <h3>Make it yours</h3>
          <Link href="/search">Explore the shop</Link>
          <Link href="/wishlists">Saved finds</Link>
          <Link href="/orders">Your orders</Link>
          <Link href="/assistant">Shopping assistant</Link>
        </div>
        <div>
          <h3>Here to help</h3>
          <Link href="/help">Help centre</Link>
          <Link href="/support">Contact support</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <div>
          <h3>Behind the shop</h3>
          <Link href="/seller">Seller workspace</Link>
          <Link href="/admin">Admin workspace</Link>
          <a className="android-download" href="/downloads/styleshopz-1.3.1.apk">
            Get the Android app <ArrowUpRight size={14} />
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>styleshopZ · Made for the everyday find.</span>
        <span>Prices in INR · Test environment</span>
      </div>
    </footer>
  );
}
