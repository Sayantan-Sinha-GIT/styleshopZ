"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/lib/client/theme";

/**
 * Living canvas background from my-design/home.html:
 * Subtle geometric particles (squares with crosses, plus signs, nodes) that drift,
 * rotate, and react gently to scroll velocity and theme changes on desktop.
 * Touch devices get one painted frame to keep scrolling smooth.
 */
export function Background() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/4632/admin")) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let vel = 0;
    let lastScroll = window.scrollY;
    let seed = 7;
    const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const staticScene = window.matchMedia(
      "(prefers-reduced-motion: reduce), (pointer: coarse), (max-width: 767px)",
    ).matches;

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
        .getPropertyValue("--tx")
        .trim()
        .replace("#", "");
      if (hHex.length === 6) {
        return [0, 2, 4]
          .map((i) => parseInt(hHex.substring(i, i + 2), 16))
          .join(",");
      }
      return theme === "dark" ? "241,239,233" : "16,18,22";
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
      seed = 7;
      particles = Array.from({ length: count }, () => ({
        x: random() * w,
        y: random() * h,
        s: 4 + random() * 8,
        r: random() * 6,
        v: 0.08 + random() * 0.2,
        t: Math.floor(random() * 3),
      }));

      tc = getRgb();
      if (staticScene) paint();
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
          p.x = random() * w;
        }
      });

      paint();
      if (!document.hidden) raf = requestAnimationFrame(loop);
    };

    window.addEventListener("resize", resize);
    resize();

    if (!staticScene) {
      raf = requestAnimationFrame(loop);
    }
    const visibility = () => { cancelAnimationFrame(raf); if (!document.hidden && !staticScene) raf = requestAnimationFrame(loop); };
    document.addEventListener('visibilitychange', visibility);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [theme, pathname]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="shop-background-canvas pointer-events-none fixed inset-0 z-0 h-full w-full"
    />
  );
}
