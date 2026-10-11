'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/lib/client/theme';

/**
 * Living canvas background from my-design/home.html:
 * Subtle geometric particles (squares with crosses, plus signs, nodes) that drift,
 * rotate, and react gently to scroll velocity and theme changes.
 */
export function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let vel = 0;
    let lastScroll = window.scrollY;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    interface Particle {
      x: number;
      y: number;
      s: number;
      r: number;
      v: number;
      t: number;
    }
    let particles: Particle[] = [];

    const getRgb = () => {
      const hHex = getComputedStyle(document.documentElement)
        .getPropertyValue('--tx')
        .trim()
        .replace('#', '');
      if (hHex.length === 6) {
        return [0, 2, 4].map((i) => parseInt(hHex.substring(i, i + 2), 16)).join(',');
      }
      return theme === 'dark' ? '241,239,233' : '16,18,22';
    };

    let tc = getRgb();

    const resize = () => {
      const d = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * d);
      canvas.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);

      const count = w < 700 ? 12 : 24;
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        s: 4 + Math.random() * 8,
        r: Math.random() * 6,
        v: 0.08 + Math.random() * 0.2,
        t: Math.floor(Math.random() * 3),
      }));

      tc = getRgb();
      if (reduce) paint();
    };

    const paint = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = `rgba(${tc}, 0.08)`;
      ctx.fillStyle = `rgba(${tc}, 0.08)`;
      ctx.lineWidth = 1;

      particles.forEach((p) => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.beginPath();
        if (p.t === 0) {
          ctx.strokeRect(-p.s, -p.s, p.s * 2, p.s * 2);
          ctx.moveTo(0, -p.s);
          ctx.lineTo(0, p.s);
          ctx.stroke();
        } else if (p.t === 1) {
          ctx.moveTo(-p.s, 0);
          ctx.lineTo(p.s, 0);
          ctx.moveTo(0, -p.s);
          ctx.lineTo(0, p.s);
          ctx.stroke();
        } else {
          ctx.arc(0, 0, p.s / 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
    };

    const loop = () => {
      const sy = window.scrollY;
      vel += (sy - lastScroll - vel) * 0.2;
      lastScroll = sy;

      particles.forEach((p) => {
        p.y -= p.v + Math.min(Math.abs(vel), 60) * 0.05;
        p.x += Math.sin(p.y / 80 + p.r) * 0.2;
        p.r += 0.003;
        if (p.y < -20) {
          p.y = h + 20;
          p.x = Math.random() * w;
        }
      });

      paint();
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('resize', resize);
    resize();

    if (!reduce) {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [theme]);

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
