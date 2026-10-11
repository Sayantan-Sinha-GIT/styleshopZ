'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProductImage } from '@/lib/images';

function ProductDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [qas, setQas] = useState<any[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [pincode, setPincode] = useState('');
  const [pincodeEstimate, setPincodeEstimate] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedMessage, setAddedMessage] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.product) {
          setProduct(data.product);
          setVariants(data.variants || []);
          setReviews(data.reviews || []);
          setQas(data.qas || []);
          if (data.variants?.length) {
            setSelectedVariantId(data.variants[0].id);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const activeVariant = variants.find((v) => v.id === selectedVariantId) || variants[0];

  const handleCheckPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pincode.trim())) {
      setPincodeEstimate('Please enter a valid 6-digit Indian PIN code');
      return;
    }
    const days = 2 + (Number(pincode[0]) % 3);
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setPincodeEstimate(`Delivery by ${date.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} · Free delivery available`);
  };

  const handleAddToCart = async () => {
    if (!activeVariant) return;
    setAddingToCart(true);
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variantId: activeVariant.id, quantity: 1 }),
      });
      if (res.ok) {
        setAddedMessage(true);
        // Update header badge
        const badge = document.getElementById('bd');
        if (badge) badge.textContent = String(Number(badge.textContent || 0) + 1);
        setTimeout(() => setAddedMessage(false), 3000);
      } else {
        const data = await res.json();
        alert(data.error || 'Please sign in to add to cart');
      }
    } catch {
      alert('Error updating cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    router.push('/cart');
  };

  if (loading) {
    return (
      <div className="w max-w-6xl mx-auto pt-32 pb-24 min-h-[70vh]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="h-96 rounded-2xl skeleton" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded skeleton" />
            <div className="h-5 w-1/3 rounded skeleton" />
            <div className="h-12 w-1/2 rounded skeleton" />
            <div className="h-32 rounded skeleton" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="w max-w-2xl mx-auto pt-40 pb-24 text-center">
        <h1 className="d text-4xl mb-4">Product Not Found</h1>
        <p className="text-dim mb-8">This item may have been moved or removed by the seller.</p>
        <Link href="/" className="btn">Return Home</Link>
      </div>
    );
  }

  const effectivePricePaise = activeVariant?.deal_price_paise || activeVariant?.price_paise || 0;
  const mrpPaise = activeVariant?.mrp_paise || effectivePricePaise;
  const discountPercent = mrpPaise > effectivePricePaise ? Math.round(((mrpPaise - effectivePricePaise) / mrpPaise) * 100) : 0;

  return (
    <div className="w max-w-7xl mx-auto pt-28 sm:pt-36 pb-24">
      {/* Category Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-mono text-dim mb-8">
        <Link href="/" className="hover:text-brand transition-colors">Home</Link>
        <span>/</span>
        <Link href="/categories" className="hover:text-brand transition-colors">Categories</Link>
        <span>/</span>
        <span className="text-text">{product.category_name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-20">
        {/* Product Visual Area */}
        <div className="aspect-square bg-surface rounded-3xl border border-line p-8 flex items-center justify-center relative overflow-hidden group">
          <div className="w-full h-full flex items-center justify-center relative">
            <img
              src={getProductImage(product.title, product.category_name)}
              alt={product.title}
              className="w-full h-full object-contain rounded-2xl group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          {discountPercent > 0 && (
            <span className="absolute top-6 left-6 px-3 py-1 rounded-full text-xs font-mono font-bold bg-brand text-on-brand shadow-lg">
              {discountPercent}% OFF
            </span>
          )}
          <span className="absolute bottom-6 left-6 text-xs font-mono text-dim">
            Fulfilled by {product.seller_name}
          </span>
        </div>

        {/* Product Meta & Purchase Info */}
        <div className="flex flex-col">
          <p className="text-xs font-mono uppercase tracking-widest text-brand font-semibold mb-2">
            {product.brand}
          </p>
          <h1 className="d text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-4">
            {product.title}
          </h1>

          {/* Rating Snapshot */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-1 bg-brand text-on-brand px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
              <span>★</span>
              <span>4.6</span>
            </div>
            <span className="text-xs font-mono text-dim">
              {reviews.length} verified purchaser reviews
            </span>
          </div>

          {/* Price Box */}
          <div className="p-6 rounded-2xl bg-surface border border-line mb-8">
            <div className="flex items-baseline gap-4 mb-2">
              <span className="text-4xl sm:text-5xl font-black text-brand">
                ₹{(effectivePricePaise / 100).toLocaleString('en-IN')}
              </span>
              {mrpPaise > effectivePricePaise && (
                <span className="text-lg line-through text-dim">
                  M.R.P.: ₹{(mrpPaise / 100).toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <p className="text-xs text-dim font-mono mb-4">Inclusive of all simulated taxes</p>

            {/* Stock indicator */}
            {activeVariant && (
              <div className="flex items-center gap-2 mb-6">
                <span className={`w-2.5 h-2.5 rounded-full ${activeVariant.stock > 0 ? 'bg-[var(--ok)]' : 'bg-[var(--danger)]'}`} />
                <span className="text-xs font-mono font-medium">
                  {activeVariant.stock > 0
                    ? `In Stock (${activeVariant.stock} available)`
                    : 'Currently Out of Stock'}
                </span>
                <span className="text-xs text-dim font-mono ml-auto">
                  15-min stock hold at checkout
                </span>
              </div>
            )}

            {/* Variant Selector */}
            {variants.length > 1 && (
              <div className="mb-6">
                <label className="block text-xs font-mono text-dim mb-2 uppercase">Select Variant / Color</label>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const isSelected = v.id === activeVariant?.id;
                    const optColor = v.options?.color || v.sku;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariantId(v.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-mono border transition-all ${
                          isSelected
                            ? 'border-brand bg-brand/10 text-brand font-bold ring-1 ring-brand'
                            : 'border-line text-text hover:border-line-strong'
                        }`}
                      >
                        {optColor} · ₹{(v.price_paise / 100).toLocaleString('en-IN')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addingToCart || activeVariant?.stock < 1}
                className="btn flex-1"
              >
                {addingToCart ? 'Adding…' : addedMessage ? 'Added to Cart' : 'Add to Cart'}
              </button>
              <button
                type="button"
                onClick={handleBuyNow}
                disabled={activeVariant?.stock < 1}
                className="btn g flex-1"
              >
                Buy Now
              </button>
            </div>
          </div>

          {/* PINCODE ESTIMATOR */}
          <div className="p-6 rounded-2xl bg-surface border border-line mb-8">
            <h3 className="text-sm font-semibold mb-2">Delivery & Availability</h3>
            <form onSubmit={handleCheckPincode} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Enter 6-digit PIN code"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                maxLength={6}
                className="flex-1 px-4 py-2.5 rounded-xl bg-bg border border-line text-sm font-mono text-text focus:outline-brand"
              />
              <button type="submit" className="btn sm">
                Check
              </button>
            </form>
            {pincodeEstimate && (
              <p className="text-xs font-mono text-brand mt-2">{pincodeEstimate}</p>
            )}
            <ul className="text-xs text-dim space-y-1 mt-4 list-none p-0">
              <li>7 days replacement / return window</li>
              <li>Cash on Delivery eligible (up to ₹50,000)</li>
              <li>Official 1-year brand warranty included</li>
            </ul>
          </div>

          {/* Product Description */}
          <div className="border-t border-line pt-6">
            <h3 className="text-base font-semibold mb-2">Description</h3>
            <p className="text-dim text-sm leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>

      {/* REVIEWS & Q&A TABS */}
      <div className="border-t border-line pt-12 grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Verified Reviews */}
        <div>
          <h2 className="d text-3xl font-black uppercase mb-6">Customer Reviews</h2>
          {reviews.length === 0 ? (
            <p className="text-dim text-sm">No reviews yet for this product.</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="p-5 rounded-2xl bg-surface border border-line">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-sm">{r.user_name}</span>
                    <span className="text-brand font-mono text-xs font-bold">★ {r.rating}.0</span>
                  </div>
                  <p className="text-xs text-dim mb-3">Verified Purchaser</p>
                  <p className="text-sm text-text leading-relaxed">{r.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Q&A */}
        <div>
          <h2 className="d text-3xl font-black uppercase mb-6">Questions & Answers</h2>
          {qas.length === 0 ? (
            <p className="text-dim text-sm">No answered questions yet.</p>
          ) : (
            <div className="space-y-4">
              {qas.map((q) => (
                <div key={q.id} className="p-5 rounded-2xl bg-surface border border-line">
                  <p className="font-semibold text-sm mb-2 text-text">Q: {q.question}</p>
                  <p className="text-sm text-dim leading-relaxed">
                    <b className="text-brand">A: </b> {q.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense fallback={<div className="w max-w-6xl mx-auto pt-32 pb-24 min-h-[70vh] skeleton rounded-3xl" />}>
      <ProductDetailContent />
    </Suspense>
  );
}
