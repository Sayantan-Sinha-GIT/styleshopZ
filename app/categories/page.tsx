'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function CategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<any[]>([]);
  const [selectedL1, setSelectedL1] = useState<string>('');

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.tree) {
          setTree(data.tree);
          if (data.tree.length) setSelectedL1(data.tree[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const activeCategory = tree.find((c) => c.id === selectedL1) || tree[0];

  if (loading) {
    return (
      <div className="w max-w-6xl mx-auto pt-36 pb-24 min-h-[60vh]">
        <div className="h-10 w-48 rounded skeleton mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 rounded-2xl skeleton" />
          <div className="h-64 rounded-2xl skeleton" />
          <div className="h-64 rounded-2xl skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="w max-w-7xl mx-auto pt-28 sm:pt-36 pb-24">
      <div className="mb-10">
        <p className="m text-xs font-mono text-dim mb-2">3-Level Hierarchical Shelves</p>
        <h1 className="d text-5xl sm:text-7xl font-black uppercase">Browse Categories</h1>
        <p className="text-dim text-sm sm:text-base max-w-xl mt-3">
          Every shelf carries defined attributes powering accurate faceted search and filtering.
        </p>
      </div>

      {/* Top Level Category Tabs (Level 1) */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-10 border-b border-line">
        {tree.map((cat) => {
          const isActive = cat.id === activeCategory?.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedL1(cat.id)}
              className={`px-5 py-3 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? 'bg-brand text-on-brand shadow-md font-bold'
                  : 'bg-surface text-dim hover:text-text border border-line'
              }`}
            >
              <span>{cat.name}</span>
              <span className="text-xs font-mono opacity-70">({cat.product_count || 100}+)</span>
            </button>
          );
        })}
      </div>

      {/* Sub-categories & Leaves Display (Level 2 & Level 3) */}
      {activeCategory && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activeCategory.subcategories?.map((sub: any) => (
              <div
                key={sub.id}
                className="p-6 rounded-3xl bg-surface border border-line flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-mono text-brand font-bold uppercase">Level 2 Branch</span>
                    <span className="text-xs font-mono text-dim">Sub-category</span>
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-text">{sub.name}</h3>

                  {/* Level 3 Leaf Nodes */}
                  <div className="space-y-2 mb-6">
                    <p className="text-xs font-mono text-dim uppercase">Leaves (Level 3):</p>
                    <ul className="space-y-1.5 list-none p-0 text-sm">
                      {sub.leaves?.map((leaf: any) => (
                        <li key={leaf.id}>
                          <Link
                            href={`/?category=${leaf.id}`}
                            className="text-dim hover:text-brand transition-colors flex items-center gap-2 group"
                          >
                            <span className="text-brand text-xs group-hover:translate-x-1 transition-transform">&rarr;</span>
                            <span>{leaf.name}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Link
                  href={`/?category=${sub.id}`}
                  className="btn sm text-xs font-mono w-full"
                >
                  Explore Products &rarr;
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
