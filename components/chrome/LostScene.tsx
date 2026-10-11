'use client';

import { motion } from 'motion/react';

export function LostScene({ code }: { code: string }) {
  return (
    <div className="relative mx-auto h-56 w-full max-w-xl sm:h-72 flex items-center justify-center select-none" aria-hidden="true">
      <svg viewBox="0 0 100 60" className="absolute inset-0 h-full w-full pointer-events-none opacity-40">
        <circle cx="20" cy="18" r="1.5" fill="var(--brand)" />
        <circle cx="80" cy="40" r="1.2" fill="var(--brand)" />
        <circle cx="50" cy="10" r="1.8" fill="var(--brand)" />
        <circle cx="15" cy="45" r="1" fill="var(--brand)" />
        <circle cx="85" cy="15" r="1.4" fill="var(--brand)" />
      </svg>
      <motion.p
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="font-display text-[9rem] sm:text-[13rem] font-black leading-none tracking-tight text-transparent [-webkit-text-stroke:2px_var(--line-strong)]"
      >
        {code}
      </motion.p>
    </div>
  );
}
