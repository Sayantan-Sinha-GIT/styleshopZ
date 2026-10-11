'use client';

// Scroll moments (PART 9A). Each one is a client leaf: GSAP owns these elements, so never
// animate the same element with motion/react too. Every effect switches itself off for
// prefers-reduced-motion, and the markup still reads well without it.
import Image from 'next/image';
import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const HIDDEN_UNTIL_JS = 'invisible opacity-0 motion-reduce:visible motion-reduce:opacity-100';

/** Headline whose lines rise from behind a mask when it scrolls into view. */
export function MaskLines({
  as = 'h2',
  children,
  className = '',
}: {
  as?: 'h1' | 'h2' | 'h3' | 'p';
  children: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const Tag = as as React.ElementType;
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        SplitText.create(ref.current!, {
          type: 'lines',
          mask: 'lines',
          autoSplit: true,
          onSplit: (self) => {
            gsap.set(ref.current, { autoAlpha: 1 });
            return gsap.from(self.lines, {
              yPercent: 110,
              duration: 0.9,
              ease: 'expo.out',
              stagger: 0.08,
              scrollTrigger: { trigger: ref.current, start: 'top 88%', once: true },
            });
          },
        });
      });
    },
    { scope: ref },
  );
  return (
    <Tag ref={ref} className={`${HIDDEN_UNTIL_JS} ${className}`}>
      {children}
    </Tag>
  );
}

/** Paragraph whose words light up one by one while it scrolls through the screen. */
export function ScrubWords({ children, className = '' }: { children: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        SplitText.create(ref.current!, {
          type: 'words',
          autoSplit: true,
          onSplit: (self) =>
            gsap.fromTo(
              self.words,
              { opacity: 0.16 },
              {
                opacity: 1,
                ease: 'none',
                stagger: 0.1,
                scrollTrigger: { trigger: ref.current, start: 'top 80%', end: 'bottom 45%', scrub: true },
              },
            ),
        });
      });
    },
    { scope: ref },
  );
  return (
    <p ref={ref} className={className}>
      {children}
    </p>
  );
}

export type Step = { title: string; body: string; visual: React.ReactNode };

/** Section that pins for one screen per step; the words and the picture change as you scroll. */
export function PinnedSteps({ steps, className = '' }: { steps: Step[]; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        const texts = gsap.utils.toArray<HTMLElement>('[data-step-text]');
        const visuals = gsap.utils.toArray<HTMLElement>('[data-step-visual]');
        const tl = gsap.timeline({
          defaults: { ease: 'power2.inOut', duration: 0.5 },
          scrollTrigger: { trigger: ref.current, start: 'top top', end: `+=${steps.length * 100}%`, pin: true, scrub: 0.6 },
        });
        tl.fromTo('[data-step-bar]', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: steps.length - 1 }, 0);
        for (let i = 1; i < steps.length; i++) {
          const at = i - 0.5;
          tl.to(texts[i - 1], { autoAlpha: 0, y: -40 }, at)
            .fromTo(texts[i], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0 }, at)
            .to(visuals[i - 1], { autoAlpha: 0, scale: 0.92 }, at)
            .fromTo(visuals[i], { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1 }, at);
        }
      });
    },
    { scope: ref },
  );
  const layer = (i: number) => `[grid-area:1/1] motion-reduce:[grid-area:auto] ${i ? HIDDEN_UNTIL_JS : ''}`;
  return (
    <section ref={ref} className={`relative flex min-h-[100dvh] items-center overflow-hidden px-4 sm:px-6 ${className}`}>
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-16">
        <div className="grid gap-10">
          {steps.map((s, i) => (
            <div key={s.title} data-step-text className={layer(i)}>
              <h3 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">{s.title}</h3>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-dim">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-10">
          {steps.map((s, i) => (
            <div key={s.title} data-step-visual className={layer(i)}>
              {s.visual}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden="true" className="absolute inset-x-4 bottom-8 h-px bg-line motion-reduce:hidden sm:inset-x-6">
        <div data-step-bar className="h-full origin-left scale-x-0 bg-brand" />
      </div>
    </section>
  );
}

/** Cards that stick to the top and stack; each one sinks back as the next slides over it. */
export function StackCards({ cards, className = '' }: { cards: React.ReactNode[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        const els = gsap.utils.toArray<HTMLElement>('[data-stack-card]');
        els.forEach((card, i) => {
          const next = els[i + 1];
          if (!next) return;
          gsap.to(card.firstElementChild, {
            scale: 0.9,
            autoAlpha: 0.4,
            ease: 'none',
            scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true },
          });
        });
      });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className={`relative mx-auto max-w-5xl px-4 ${className}`}>
      {cards.map((card, i) => (
        <div
          key={i}
          data-stack-card
          className="sticky top-0 flex min-h-[100dvh] items-center py-10 motion-reduce:static motion-reduce:min-h-0"
          style={{ zIndex: i + 1 }}
        >
          <div className="w-full origin-top">{card}</div>
        </div>
      ))}
    </div>
  );
}

/** Scrolling down moves a row of panels sideways (desktop). Phones get a swipeable row.
 *  Give each child `shrink-0 snap-start` and a width such as w-[82vw] md:w-[34rem]. */
export function HorizontalPan({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const wrap = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(`(min-width: 768px) and ${MOTION_OK}`, () => {
        const distance = () => track.current!.scrollWidth - window.innerWidth;
        gsap.to(track.current, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: wrap.current,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
      });
    },
    { scope: wrap },
  );
  return (
    <section ref={wrap} className={`relative overflow-hidden ${className}`}>
      <div
        ref={track}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 py-10 [scrollbar-width:none] md:h-[100dvh] md:w-max md:snap-none md:items-center md:overflow-visible md:px-[8vw] motion-reduce:md:w-auto motion-reduce:md:overflow-x-auto"
      >
        {children}
      </div>
    </section>
  );
}

/** Picture that starts as a small rounded card and opens to fill the screen as you scroll. */
export function ExpandMedia({
  src,
  alt,
  children,
  className = '',
}: {
  src: string;
  alt: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=150%', pin: true, scrub: 0.6 } })
          .fromTo('[data-expand-media]', { clipPath: 'inset(18% 22% 18% 22% round 32px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' })
          .fromTo('[data-expand-media] img', { scale: 1.25 }, { scale: 1, ease: 'none' }, 0)
          .fromTo('[data-expand-copy]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.7);
      });
    },
    { scope: ref },
  );
  return (
    <section ref={ref} className={`relative h-[100dvh] overflow-hidden ${className}`}>
      <div
        data-expand-media
        className="absolute inset-0 overflow-hidden [clip-path:inset(18%_22%_18%_22%_round_32px)] motion-reduce:[clip-path:inset(0_round_0)]"
      >
        <Image src={src} alt={alt} fill sizes="100vw" className="object-cover" />
      </div>
      {children && (
        <div data-expand-copy className={`relative flex h-full items-end bg-linear-to-t from-ink/80 via-ink/20 to-transparent p-6 sm:p-12 ${HIDDEN_UNTIL_JS}`}>
          {children}
        </div>
      )}
    </section>
  );
}

/** Pinned canvas that plays a numbered frame sequence (001.jpg, 002.jpg, ...) as you scroll.
 *  Make the frames from a video with: node .qa/look.mjs sequence clip.mp4 public/seq 90 1280 */
export function FrameSequence({
  path,
  count,
  width,
  height,
  alt,
  className = '',
}: {
  path: string;
  count: number;
  width: number;
  height: number;
  alt: string;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useGSAP(
    () => {
      const ctx = canvas.current!.getContext('2d')!;
      const frames: HTMLImageElement[] = [];
      const state = { frame: 0 };
      const draw = () => {
        const img = frames[Math.round(state.frame)];
        if (img?.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, width, height);
      };
      for (let i = 0; i < count; i++) {
        const img = new window.Image();
        img.decoding = 'async';
        img.src = `${path}${String(i + 1).padStart(3, '0')}.jpg`;
        if (i === 0) img.onload = draw;
        frames.push(img);
      }
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.to(state, {
          frame: count - 1,
          snap: 'frame',
          ease: 'none',
          onUpdate: draw,
          scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=250%', pin: true, scrub: 0.5 },
        });
      });
    },
    { scope: ref },
  );
  return (
    <section ref={ref} className={`relative flex h-[100dvh] items-center justify-center overflow-hidden ${className}`}>
      <canvas ref={canvas} width={width} height={height} role="img" aria-label={alt} className="h-full w-full object-contain" />
    </section>
  );
}
