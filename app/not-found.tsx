import Link from 'next/link';
import { LostScene } from '@/components/chrome/LostScene';
import { PageShell } from '@/components/chrome/PageShell';

export default function NotFound() {
  return (
    <PageShell className="w flex flex-col items-center justify-center min-h-[75vh] text-center pt-24 pb-16">
      <LostScene code="404" />
      <h1 className="d text-4xl sm:text-6xl font-black mt-2 mb-4 tracking-tight">
        This parcel took a wrong turn
      </h1>
      <p className="text-dim max-w-md text-base sm:text-lg mb-8 leading-relaxed">
        The item or shelf you are searching for does not exist or has been moved to another category.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="btn">
          Back to marketplace
        </Link>
        <Link href="/categories" className="btn g">
          Browse categories
        </Link>
      </div>
    </PageShell>
  );
}
