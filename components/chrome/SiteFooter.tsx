'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function SiteFooter() {
  const footerRef = useRef<HTMLElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const parcelRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const footer = footerRef.current;
    const rt = routeRef.current;
    const pcl = parcelRef.current;
    if (!footer || !rt || !pcl) return;

    const len = rt.getTotalLength();
    gsap.set(rt, { strokeDasharray: len, strokeDashoffset: len });

    const st = ScrollTrigger.create({
      trigger: footer,
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        rt.style.strokeDashoffset = String(len * (1 - self.progress));
        const p = rt.getPointAtLength(len * self.progress);
        pcl.style.left = `${((p.x + 10) / 1220) * 100}%`;
        pcl.style.top = `${(p.y / 230) * 100}%`;
      },
    });

    return () => {
      st.kill();
    };
  }, []);

  return (
    <footer ref={footerRef} className="relative pt-32 min-h-screen overflow-hidden flex flex-col bg-bg text-text" id="ft">
      {/* City skyline silhouettes from my-design/home.html */}
      <svg className="absolute left-0 bottom-0 w-full h-[56%] z-0 pointer-events-none" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 300V190h70v-60h60v50h50v-90h70v70h50v-40h60v90h60v-70h70v-50h60v80h60v-30h70v60h60v-90h60v60h70v-40h60v110h70V300z" fill="var(--surface)" stroke="var(--line)" strokeWidth="2" />
      </svg>
      <svg className="absolute left-0 bottom-0 w-full h-[44%] z-0 pointer-events-none" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 300V230h90v-40h70v50h60v-70h80v60h60v-30h70v60h80v-50h60v70h70v-60h90v40h60v-60h80v70h70V300z" fill="var(--bg)" stroke="var(--line)" strokeWidth="2" />
      </svg>

      {/* Delivery route sine curve with moving parcel */}
      <div className="absolute left-0 right-0 bottom-[90px] h-[230px] z-1 pointer-events-none" aria-hidden="true">
        <svg viewBox="0 0 1200 230" preserveAspectRatio="none" className="w-full h-full">
          <path d="M-10 190C200 190 250 70 450 110S700 200 900 100 1100 40 1210 90" fill="none" stroke="var(--line)" strokeWidth="3" strokeDasharray="4 10" />
          <path ref={routeRef} d="M-10 190C200 190 250 70 450 110S700 200 900 100 1100 40 1210 90" fill="none" stroke="var(--brand)" strokeWidth="4" />
        </svg>
        <svg ref={parcelRef} className="absolute w-8 h-8 -ml-4 -mt-6 left-0 top-0 text-brand" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7l9-4 9 4v10l-9 4-9-4z" fill="var(--brand)" />
          <path d="M3 7l9 4 9-4M12 11v10" fill="none" stroke="#17120a" strokeWidth="1.6" />
        </svg>
      </div>

      <div className="w relative z-10 max-w-6xl mx-auto w-full flex-1 flex flex-col justify-between">
        <div>
          <p className="m">Order in motion</p>
          <h2 className="d text-6xl sm:text-8xl lg:text-[140px] leading-none my-4 tracking-tight">
            Find. Buy. <em className="accent-serif">Track.</em>
          </h2>
          <p className="text-dim max-w-xl text-base sm:text-lg mb-8">
            The Android app needs Android 8 or newer. Seller and admin panels run in desktop browsers. iOS is deferred. Payments run in Razorpay test mode.
          </p>

          <div className="flex flex-wrap gap-3.5 mb-16">
            <a href="https://github.com/Sayantan-Sinha-GIT/styleshopZ/releases" target="_blank" rel="noreferrer" className="btn">
              Get the Android APK
            </a>
            <Link href="/seller" className="btn g">
              Open the seller portal
            </Link>
          </div>
        </div>

        {/* Footer navigation columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-t border-line/60">
          <div>
            <h4 className="m mb-3 text-text font-semibold">Shop</h4>
            <ul className="space-y-2 list-none p-0 text-sm">
              <li><Link href="/deals" className="text-dim hover:text-brand transition-colors">Deals of the day</Link></li>
              <li><Link href="/categories" className="text-dim hover:text-brand transition-colors">Categories</Link></li>
              <li><Link href="/assistant" className="text-dim hover:text-brand transition-colors">AI assistant</Link></li>
              <li><Link href="/orders" className="text-dim hover:text-brand transition-colors">Order tracking</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="m mb-3 text-text font-semibold">Panels</h4>
            <ul className="space-y-2 list-none p-0 text-sm">
              <li><Link href="/customer" className="text-dim hover:text-brand transition-colors">Customer account</Link></li>
              <li><Link href="/seller" className="text-dim hover:text-brand transition-colors">Seller portal</Link></li>
              <li><Link href="/admin" className="text-dim hover:text-brand transition-colors">Admin panel</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="m mb-3 text-text font-semibold">Help & Legal</h4>
            <ul className="space-y-2 list-none p-0 text-sm">
              <li><Link href="/help" className="text-dim hover:text-brand transition-colors">Help centre</Link></li>
              <li><Link href="/support" className="text-dim hover:text-brand transition-colors">Support tickets</Link></li>
              <li><Link href="/terms" className="text-dim hover:text-brand transition-colors">Terms of service</Link></li>
              <li><Link href="/privacy" className="text-dim hover:text-brand transition-colors">Privacy policy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="m mb-3 text-text font-semibold">Project</h4>
            <ul className="space-y-2 list-none p-0 text-sm">
              <li><a href="https://github.com/Sayantan-Sinha-GIT/styleshopZ" target="_blank" rel="noreferrer" className="text-dim hover:text-brand transition-colors">GitHub Repository</a></li>
              <li><Link href="/setup-guide" className="text-dim hover:text-brand transition-colors">Owner Setup Guide</Link></li>
              <li><span className="text-dim">Free tiers only · Razorpay test</span></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Marquee ticker at the very bottom */}
      <div className="relative z-10 border-t border-line overflow-hidden py-3 bg-bg text-dim font-mono text-xs">
        <div className="flex gap-8 whitespace-nowrap animate-[marquee-drift_35s_linear_infinite]">
          <span>Razorpay test mode only</span>
          <span>·</span>
          <span>Shipping, payouts and GST invoices are simulated</span>
          <span>·</span>
          <span>Free tiers only</span>
          <span>·</span>
          <span>Android APK, iOS deferred</span>
          <span>·</span>
          <span>English and Hindi</span>
          <span>·</span>
          <span>Razorpay test mode only</span>
          <span>·</span>
          <span>Shipping, payouts and GST invoices are simulated</span>
          <span>·</span>
          <span>Free tiers only</span>
          <span>·</span>
          <span>Android APK, iOS deferred</span>
          <span>·</span>
          <span>English and Hindi</span>
        </div>
      </div>
    </footer>
  );
}
