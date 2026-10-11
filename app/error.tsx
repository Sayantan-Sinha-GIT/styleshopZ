'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { LostScene } from '@/components/chrome/LostScene';
import { PageShell } from '@/components/chrome/PageShell';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console without sensitive credentials
    console.error('styleshopZ runtime boundary caught error:', error.message);
  }, [error]);

  return (
    <PageShell className="w flex flex-col items-center justify-center min-h-[75vh] text-center pt-24 pb-16">
      <LostScene code="500" />
      <h1 className="d text-4xl sm:text-6xl font-black mt-2 mb-4 tracking-tight">
        Temporary hold on this request
      </h1>
      <p className="text-dim max-w-md text-base sm:text-lg mb-8 leading-relaxed">
        Something unexpected happened while processing your action. Our servers are ready for a retry.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-dim/80 mb-6 bg-surface px-3 py-1.5 rounded-md border border-line">
          Digest: {error.digest}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => reset()} className="btn">
          Try again
        </button>
        <Link href="/" className="btn g">
          Return home
        </Link>
      </div>
    </PageShell>
  );
}
