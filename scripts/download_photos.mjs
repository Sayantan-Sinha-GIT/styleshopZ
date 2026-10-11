import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const categories = {
  'electronics.webp': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
  'fashion.webp': 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80',
  'home-kitchen.webp': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
  'beauty-health.webp': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
  'sports-fitness.webp': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
};

const products = {
  'sony-headphones-black.webp': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80',
  'bose-earbuds-gold.webp': 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80',
  'apple-watch-titanium.webp': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80',
  'mechanical-keyboard.webp': 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
  'air-fryer-compact.webp': 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
  'urban-backpack.webp': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80',
  'nike-running-shoes.webp': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
  'designer-sunglasses.webp': 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
  'return_proof_1.webp': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
};

mkdirSync('public/photos/categories', { recursive: true });
mkdirSync('public/photos/products', { recursive: true });

async function download(url, path) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(path, buf);
    console.log(`Saved: ${path} (${buf.length} bytes)`);
  } catch (err) {
    console.error(`Failed ${url}:`, err.message);
  }
}

for (const [file, url] of Object.entries(categories)) {
  await download(url, join('public/photos/categories', file));
}

for (const [file, url] of Object.entries(products)) {
  await download(url, join('public/photos/products', file));
}

console.log('Finished downloading photos.');
