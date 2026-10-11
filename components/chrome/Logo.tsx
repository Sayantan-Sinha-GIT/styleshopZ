import Link from "next/link";

export function LogoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand-hi)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#logo-bg)" />
      {/* Dynamic shopping bag / box outline with golden spark */}
      <path d="M12 15h16l-2 15H14L12 15z" fill="var(--on-brand)" />
      <path
        d="M16 15v-3a4 4 0 0 1 8 0v3"
        fill="none"
        stroke="var(--on-brand)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="23" y="22" width="4" height="4" fill="var(--brand)" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display text-2xl font-black uppercase tracking-tight ${className}`}
    >
      styleshop<span className="text-brand">Z</span>
      <span className="inline-block h-[0.22em] w-[0.22em] ml-1 bg-brand align-baseline" />
    </span>
  );
}

export function BrandLogo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 text-text no-underline ${className}`}
      aria-label="styleshopZ home"
    >
      <LogoMark size={32} />
      <Wordmark />
    </Link>
  );
}
