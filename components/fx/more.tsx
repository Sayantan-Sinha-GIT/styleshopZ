'use client';

// The rest of the page moves too (PART 9A.8): effects for the sections between and after the
// big scroll moments, down to the footer. Every effect switches itself off for
// prefers-reduced-motion and then shows its final state. Colours: the PART 7.1 tokens.
import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const MOUSE = '(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)';

/** Headline whose letters spring up, word by word, when it scrolls into view. */
export function SpringLetters({
  as = 'h2',
  children,
  className = '',
}: {
  as?: 'h1' | 'h2' | 'h3' | 'p';
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as as React.ElementType;
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        SplitText.create(ref.current!, {
          type: 'words,chars',
          mask: 'words',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.chars, {
              yPercent: 120,
              rotate: 14,
              duration: 0.9,
              stagger: 0.016,
              ease: 'back.out(1.7)',
              scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
            }),
        });
      });
    },
    { scope: ref },
  );
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}

/** A line drawn through (strike) or under words while they scroll past. Works across line breaks. */
export function DrawLine({ children, strike = false, className = '' }: { children: React.ReactNode; strike?: boolean; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const full = '100% 0.1em';
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.fromTo(
          ref.current,
          { backgroundSize: '0% 0.1em' },
          { backgroundSize: full, ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top 85%', end: 'top 50%', scrub: 0.6 } },
        );
      });
    },
    { scope: ref },
  );
  return (
    <span
      ref={ref}
      className={className}
      style={{
        backgroundImage: 'linear-gradient(var(--brand), var(--brand))',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: strike ? '0 60%' : '0 96%',
        backgroundSize: full,
      }}
    >
      {children}
    </span>
  );
}

/** A band that drifts sideways forever and speeds up (and turns around) with the scroll. */
export function Marquee({
  children,
  reverse = false,
  seconds = 40,
  className = '',
}: {
  children: React.ReactNode;
  reverse?: boolean;
  seconds?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        const track = ref.current!.firstElementChild!;
        const loop = reverse
          ? gsap.fromTo(track, { xPercent: -50 }, { xPercent: 0, duration: seconds, ease: 'none', repeat: -1 })
          : gsap.to(track, { xPercent: -50, duration: seconds, ease: 'none', repeat: -1 });
        const speed = { v: 1 };
        let dir = 1;
        const apply = () => loop.timeScale(speed.v * dir);
        ScrollTrigger.create({
          trigger: ref.current,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => loop.paused(!self.isActive),
          onUpdate: (self) => {
            dir = self.direction;
            gsap.to(speed, {
              v: 1 + Math.min(Math.abs(self.getVelocity()) / 220, 7),
              duration: 0.25,
              overwrite: true,
              onUpdate: apply,
              onComplete: () => {
                gsap.to(speed, { v: 1, duration: 1.4, ease: 'power2.out', onUpdate: apply });
              },
            });
          },
        });
      });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <div className="flex w-max">
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}

/** A real number whose digits roll into place, e.g. "3,000" or "~30 s". Use a tabular or mono font. */
export function Odometer({ value, className = '' }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.fromTo(
          ref.current!.querySelectorAll('[data-col]'),
          { '--roll': 0 },
          { '--roll': 1, duration: 2.2, stagger: 0.14, ease: 'expo.out', scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true } },
        );
      });
    },
    { scope: ref },
  );
  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <span ref={ref} aria-hidden="true" className="inline-flex">
        {[...value].map((ch, i) =>
          /\d/.test(ch) ? (
            <span key={i} className="inline-block h-[1em] overflow-hidden align-bottom leading-none">
              <span data-col className="flex flex-col" style={{ transform: `translateY(calc(${Number(ch) + 10} * -1em * var(--roll, 1)))` }}>
                {Array.from({ length: 20 }, (_, n) => (
                  <span key={n} className="h-[1em] leading-none">
                    {n % 10}
                  </span>
                ))}
              </span>
            </span>
          ) : (
            <span key={i} className="whitespace-pre">
              {ch}
            </span>
          ),
        )}
      </span>
    </span>
  );
}

/**
 * A sheet that opens from a rounded card to the full width while it scrolls in, with a soft
 * brand light that follows the pointer. For the closing call to action. Give it the colours
 * (for example "bg-ink text-on-ink"); keep its content inside a padded container.
 */
export function OpenSheet({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const light = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.fromTo(
          ref.current,
          { clipPath: 'inset(0% 3% 0% 3% round 28px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', scrollTrigger: { trigger: ref.current, start: 'top 92%', end: 'top 25%', scrub: 0.5 } },
        );
      });
      gsap.matchMedia().add(MOUSE, () => {
        const x = gsap.quickTo(light.current, '--mx', { duration: 0.6, ease: 'power3.out' });
        const y = gsap.quickTo(light.current, '--my', { duration: 0.6, ease: 'power3.out' });
        const move = (e: PointerEvent) => {
          const r = ref.current!.getBoundingClientRect();
          x(((e.clientX - r.left) / r.width) * 100);
          y(((e.clientY - r.top) / r.height) * 100);
        };
        ref.current!.addEventListener('pointermove', move);
        return () => ref.current?.removeEventListener('pointermove', move);
      });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={{ clipPath: 'inset(0% 3% 0% 3% round 28px)' }}>
      <div
        ref={light}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={
          {
            '--mx': 72,
            '--my': 28,
            background:
              'radial-gradient(560px circle at calc(var(--mx) * 1%) calc(var(--my) * 1%), color-mix(in srgb, var(--brand) 24%, transparent), transparent 62%)',
          } as React.CSSProperties
        }
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Wrap the ONE main action: it leans toward the mouse and springs back. */
export function Magnetic({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MOUSE, () => {
        const el = ref.current!;
        const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
        const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          x((e.clientX - (r.left + r.width / 2)) * 0.3);
          y((e.clientY - (r.top + r.height / 2)) * 0.4);
        };
        const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: true });
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        return () => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerleave', leave);
        };
      });
    },
    { scope: ref },
  );
  return (
    <span ref={ref} className="inline-block">
      {children}
    </span>
  );
}

/** The footer's big wordmark: its letters rise one by one while the footer scrolls in. */
export function WordmarkRise({ text, className = '' }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from(ref.current!.querySelectorAll('[data-letter]'), {
          yPercent: 105,
          rotate: (i: number) => (i % 2 ? 9 : -7),
          ease: 'power3.out',
          stagger: 0.06,
          scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'bottom bottom', scrub: 0.8 },
        });
      });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} aria-hidden="true" className="overflow-hidden">
      <p className={`flex select-none items-baseline justify-center whitespace-nowrap leading-[0.82] ${className}`}>
        {[...text].map((c, i) => (
          <span key={i} data-letter className="inline-block origin-bottom-left whitespace-pre pb-[0.06em]">
            {c}
          </span>
        ))}
      </p>
    </div>
  );
}
