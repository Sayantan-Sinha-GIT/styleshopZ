'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BrandLogo } from './Logo';
import { ThemeToggle } from './ThemeToggle';

const NAV_LINKS = [
  { href: '/#loop', label: 'The loop' },
  { href: '/deals', label: 'Deals' },
  { href: '/categories', label: 'Categories' },
  { href: '/assistant', label: 'Assistant' },
  { href: '/seller', label: 'Seller' },
  { href: '/admin', label: 'Admin' },
];

export function SiteHeader({ cartCount = 0 }: { cartCount?: number }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-gradient-to-b from-bg via-bg/90 to-transparent backdrop-blur-sm transition-colors duration-300">
        <BrandLogo />

        <nav className="hidden md:flex items-center gap-7 text-sm font-mono tracking-wide text-dim">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-text ${isActive ? 'text-brand font-semibold' : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link
            href="/cart"
            id="cart"
            className="ib relative"
            aria-label={`Cart with ${cartCount} items`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0" />
            </svg>
            <b id="bd">{cartCount}</b>
          </Link>

          <Link
            href="/orders"
            className="hidden sm:inline-flex items-center justify-center h-10 px-4 rounded-full text-xs font-mono tracking-wider border border-line text-text hover:border-line-strong transition-colors"
          >
            Track Order
          </Link>

          <button
            type="button"
            className="ib md:hidden"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-bg/95 backdrop-blur-lg flex flex-col justify-between p-8 pt-28 md:hidden">
          <nav className="flex flex-col gap-6 font-display text-4xl font-black uppercase">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="hover:text-brand transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/orders"
              onClick={() => setMobileOpen(false)}
              className="text-dim hover:text-brand transition-colors text-2xl font-mono lowercase"
            >
              /orders
            </Link>
          </nav>
          <div className="pt-8 border-t border-line text-xs font-mono text-dim">
            styleshopZ · mobile marketplace
          </div>
        </div>
      )}
    </>
  );
}
