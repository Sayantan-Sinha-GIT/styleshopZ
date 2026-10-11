'use client';

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { MotionConfig } from 'motion/react';
import { useEffect } from 'react';

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Smooth, weighted scrolling (skipped for reduced motion) driven by GSAP's clock, so pinned
// and scrubbed ScrollTriggers move in step with it, plus a global motion policy.
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Positions change when the web fonts arrive; measure every ScrollTrigger again.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ lerp: 0.11, anchors: { offset: -90 } });
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user" transition={{ type: 'spring', stiffness: 260, damping: 30 }}>
      {children}
    </MotionConfig>
  );
}
