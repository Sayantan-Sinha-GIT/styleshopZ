'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface DealItem {
  id: string;
  title: string;
  brand: string;
  original_price_paise: number;
  deal_price_paise: number;
  quantity_cap: number;
  sold_count: number;
}

interface ProductItem {
  id: string;
  title: string;
  brand: string;
  price_paise: number;
  rating: number;
  category_name: string;
}

export default function HomePage() {
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductItem[]>([]);
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');

  // Fetch live deals and products from API
  useEffect(() => {
    fetch('/api/deals')
      .then((res) => res.json())
      .then((data) => {
        if (data.deals) setDeals(data.deals.slice(0, 6));
      })
      .catch(() => {});

    fetch('/api/products?limit=8')
      .then((res) => res.json())
      .then((data) => {
        if (data.products) setFeaturedProducts(data.products);
      })
      .catch(() => {});
  }, []);

  // Deals countdown timer
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const updateCountdown = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(24, 0, 0, 0);
      const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      setHours(pad(Math.floor(diff / 3600)));
      setMinutes(pad(Math.floor((diff % 3600) / 60)));
      setSeconds(pad(diff % 60));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // GSAP Animations and Order in Motion Timeline
  useEffect(() => {
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReducedMotion) return;

    const ctx = gsap.context(() => {
      // 1. Text rise animations for [data-s] headings
      const splitAndRise = (el: HTMLElement) => {
        const text = el.textContent || '';
        el.setAttribute('aria-label', text);
        el.innerHTML = text
          .split(/(\s+)/)
          .map((word) => {
            if (/^\s+$/.test(word)) return ' ';
            return `<span class="sw">${word.split('').map((c) => `<span class="c">${c}</span>`).join('')}</span>`;
          })
          .join('');

        gsap.from(el.querySelectorAll('.c'), {
          yPercent: 115,
          rotate: 5,
          duration: 1.1,
          ease: 'expo.out',
          stagger: { amount: 0.6 },
          scrollTrigger: { trigger: el, start: 'top 90%' },
        });
      };

      document.querySelectorAll<HTMLElement>('[data-s]').forEach(splitAndRise);

      // 2. Fade rise for [data-r]
      document.querySelectorAll<HTMLElement>('[data-r]').forEach((el) => {
        gsap.from(el, {
          y: 30,
          opacity: 0,
          duration: 0.9,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 90%' },
        });
      });

      // 3. Floating Hero Product
      gsap.to('.fl', {
        y: -16,
        rotate: 3,
        duration: 2.6,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });

      gsap.from(['.pw', '.ring', '.chip', '.sr'], {
        scale: 0.85,
        opacity: 0,
        duration: 1.2,
        stagger: 0.12,
        ease: 'expo.out',
        delay: 0.3,
      });

      // 4. Parallax Stage Pointer Move
      const stg = document.getElementById('stg');
      if (stg) {
        const zElements = Array.from(stg.querySelectorAll<HTMLElement>('[data-z]')).map((el) => ({
          x: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power3' }),
          y: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power3' }),
          z: Number(el.dataset.z || 20),
        }));

        const handlePointerMove = (e: PointerEvent) => {
          const rect = stg.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          zElements.forEach((o) => {
            o.x(x * o.z);
            o.y(y * o.z);
          });
        };

        const handlePointerLeave = () => {
          zElements.forEach((o) => {
            o.x(0);
            o.y(0);
          });
        };

        stg.addEventListener('pointermove', handlePointerMove);
        stg.addEventListener('pointerleave', handlePointerLeave);
      }

      // 5. Interactive "Order in Motion" Sequence
      const buyBtn = document.getElementById('buy');
      const cartBtn = document.getElementById('cart');
      const sheet = document.getElementById('sh');
      const payBtn = document.getElementById('pay');
      const typingSpan = document.getElementById('ty');
      const statusText = document.getElementById('st');
      const badgeCount = document.getElementById('bd');
      const nodes = Array.from(document.querySelectorAll<HTMLElement>('.nd'));
      const parcelIcon = document.querySelector<HTMLElement>('.pc');
      const fillLine = document.querySelector<HTMLElement>('.fi');

      const labels = ['Placed', 'Packed', 'Shipped', 'Out for delivery', 'Delivered'];
      let isBusy = false;

      const setNodeActive = (activeIdx: number) => {
        nodes.forEach((n, idx) => n.classList.toggle('on', idx <= activeIdx));
      };

      const triggerConfetti = () => {
        const s = document.getElementById('stg');
        if (!s) return;
        for (let i = 0; i < 30; i++) {
          const p = document.createElement('i');
          p.className = 'cn';
          s.appendChild(p);
          const angle = Math.random() * 6.28;
          const dist = 80 + Math.random() * 170;
          gsap.fromTo(
            p,
            { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 },
            {
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist - 40,
              rotate: Math.random() * 540,
              opacity: 0,
              scale: 0.4,
              duration: 1.4,
              ease: 'power3.out',
              onComplete: () => p.remove(),
            }
          );
        }
      };

      const runOrderAnimation = () => {
        if (isBusy || !cartBtn || !buyBtn || !sheet || !typingSpan || !statusText || !badgeCount) return;
        isBusy = true;

        const prodEl = document.querySelector<HTMLElement>('.prod');
        if (!prodEl) return;

        const b = prodEl.getBoundingClientRect();
        const c = cartBtn.getBoundingClientRect();
        const dx = c.left + c.width / 2 - b.left - b.width / 2;
        const dy = c.top + c.height / 2 - b.top - b.height / 2;
        const typeObj = { progress: 0 };
        const word = 'headphones';

        const tl = gsap.timeline({
          onComplete: () => {
            isBusy = false;
            buyBtn.textContent = 'Buy again';
          },
        });

        tl.call(() => {
          setNodeActive(-1);
          statusText.textContent = 'Find: searching for headphones';
          typingSpan.textContent = '';
          badgeCount.textContent = '0';
        })
          .set(parcelIcon, { left: '0%' })
          .set(fillLine, { scaleX: 0 })
          .to(typeObj, {
            progress: word.length,
            duration: 0.9,
            ease: 'none',
            onUpdate: () => {
              typingSpan.textContent = word.slice(0, Math.round(typeObj.progress));
            },
          })
          .call(() => {
            statusText.textContent = 'Buy: product flies to your cart';
          })
          .to(prodEl, { x: dx, y: dy, scale: 0.08, rotate: -25, duration: 0.8, ease: 'power3.in' }, '+=.2')
          .call(() => {
            badgeCount.textContent = '1';
          })
          .fromTo(cartBtn, { scale: 1 }, { scale: 1.25, yoyo: true, repeat: 1, duration: 0.16 })
          .set(prodEl, { x: 0, y: 0, scale: 1, rotate: 0, opacity: 0 })
          .fromTo(sheet, { autoAlpha: 1, yPercent: 105 }, { yPercent: 0, duration: 0.8, ease: 'expo.out' })
          .to(payBtn, { scale: 0.92, duration: 0.1, yoyo: true, repeat: 1 }, '+=.8')
          .to(sheet, { yPercent: 105, duration: 0.5, ease: 'power3.in' }, '+=.2')
          .set(sheet, { autoAlpha: 0 })
          .call(triggerConfetti)
          .to(prodEl, { opacity: 1, duration: 0.7 })
          .call(() => {
            setNodeActive(0);
            statusText.textContent = `${labels[0]}. Your order is on its way.`;
          });

        for (let i = 1; i < 5; i++) {
          tl.to(parcelIcon, { left: `${i * 25}%`, duration: 0.7, ease: 'power2.inOut' }, '>.1')
            .to(fillLine, { scaleX: i / 4, duration: 0.7, ease: 'power2.inOut' }, '<')
            .call(() => {
              setNodeActive(i);
              statusText.textContent = i < 4 ? labels[i] : 'Delivered. Every step was tracked.';
            });
        }
      };

      if (buyBtn) {
        buyBtn.addEventListener('click', runOrderAnimation);
      }

      // Auto trigger demo order after 2.4s
      gsap.delayedCall(2.4, runOrderAnimation);

      // 6. Marquee 1 Continuous loop
      const mqEl = document.getElementById('mq1');
      if (mqEl) {
        const words = ['Search', 'Cart', 'Checkout', 'Track', 'Return', 'Support', 'Assistant'];
        mqEl.innerHTML = words.map((w) => `<span>${w}</span><i></i>`).join('');
        mqEl.innerHTML += mqEl.innerHTML;
        let x = 0;
        gsap.ticker.add(() => {
          x -= 1.2;
          const halfWidth = mqEl.scrollWidth / 2;
          if (x <= -halfWidth) x += halfWidth;
          mqEl.style.transform = `translate3d(${x}px,0,0)`;
        });
      }

      // 7. Pinned 4-Step Loop Story
      const phone = document.querySelector('.phone');
      const stepGroups = document.querySelectorAll('.phone .g');
      const steps = document.querySelectorAll('.step');
      const stepNum = document.getElementById('sn');

      if (phone && stepGroups.length && steps.length) {
        document.querySelectorAll<SVGGeometryElement>('.phone .dr').forEach((e) => {
          try {
            const length = e.getTotalLength();
            gsap.set(e, { strokeDasharray: length, strokeDashoffset: length });
          } catch {}
        });

        gsap.set(stepGroups, { opacity: 0 });
        gsap.set(steps, { autoAlpha: 0 });

        const loopTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: '.pin',
            pin: true,
            start: 'top top',
            end: '+=320%',
            scrub: 0.5,
            onUpdate: (self) => {
              if (stepNum) {
                stepNum.textContent = `0${Math.min(3, Math.floor(self.progress * 4)) + 1}`;
              }
            },
          },
        });

        loopTimeline.to('.phone .fr', { strokeDashoffset: 0, duration: 0.5, ease: 'none' });

        stepGroups.forEach((g, i) => {
          const s = 0.3 + i * 1.4;
          loopTimeline
            .fromTo(steps[i], { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.35 }, s)
            .set(g, { opacity: 1 }, s)
            .to(g.querySelectorAll('.dr'), { strokeDashoffset: 0, duration: 0.7, stagger: 0.05, ease: 'none' }, s)
            .fromTo(g.querySelectorAll('.fd'), { opacity: 0 }, { opacity: 1, duration: 0.4, stagger: 0.05 }, s + 0.2);

          if (i === 2) {
            loopTimeline.fromTo('.pc2', { y: 0 }, { y: 320, duration: 0.9, ease: 'none' }, s + 0.3);
          }
          if (i < 3) {
            loopTimeline.to([steps[i], g], { autoAlpha: 0, duration: 0.25 }, s + 1.15);
          }
        });

        loopTimeline.to('.rail i', { scaleX: 1, duration: loopTimeline.duration(), ease: 'none' }, 0);
        gsap.set('.rail i', { scaleX: 0 });
      }

      // 8. 3D Tilt on Deal Cards
      document.querySelectorAll<HTMLElement>('.dl').forEach((c, i) => {
        gsap.from(c.querySelectorAll('.dv, h3, p'), {
          x: i % 2 ? 80 : -80,
          y: 60,
          opacity: 0,
          rotateY: i % 2 ? -18 : 18,
          transformPerspective: 900,
          duration: 1.1,
          stagger: 0.1,
          ease: 'expo.out',
          scrollTrigger: { trigger: c, start: 'top 90%' },
        });
      });

      // 9. Categories Inset Expand
      document.querySelectorAll<HTMLElement>('.tile').forEach((t) => {
        gsap.from(t, {
          clipPath: 'inset(32% 32% 32% 32% round 40px)',
          y: 80,
          duration: 1.3,
          ease: 'expo.out',
          scrollTrigger: { trigger: t, start: 'top 88%' },
        });
      });

      // 10. Stat Number Counters
      document.querySelectorAll<HTMLElement>('[data-n]').forEach((el) => {
        const target = Number(el.dataset.n || 0);
        const suffix = el.dataset.x || '';
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 2.2,
          ease: 'power3.out',
          snap: { val: 1 },
          onUpdate: () => {
            el.textContent = `${obj.val}${suffix}`;
          },
          scrollTrigger: { trigger: el, start: 'top 90%' },
        });
      });

      // 11. AI Chat Typing Reveal
      const bu = document.getElementById('bu');
      const ba = document.getElementById('ba');
      if (bu && ba) {
        const userPrompt = bu.textContent?.trim() || '';
        bu.textContent = '';
        gsap.set([bu, ba], { autoAlpha: 0 });
        const typeChat = { progress: 0 };
        gsap
          .timeline({ scrollTrigger: { trigger: '#chat', start: 'top 70%' } })
          .to(bu, { autoAlpha: 1, duration: 0.3 })
          .to(typeChat, {
            progress: userPrompt.length,
            duration: 2.0,
            ease: 'none',
            onUpdate: () => {
              bu.textContent = userPrompt.slice(0, Math.round(typeChat.progress));
            },
          })
          .to(ba, { autoAlpha: 1, duration: 0.3 })
          .fromTo(ba.children, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.25, duration: 0.5 });
      }

      // 12. Pinned Rules Reveal ("Never break")
      const rh = document.getElementById('rh');
      if (rh) {
        splitAndRise(rh);
      }
      const rulesTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.rs',
          pin: true,
          start: 'top top',
          end: '+=170%',
          scrub: 0.6,
        },
      });

      rulesTl
        .fromTo('.rp', { clipPath: 'inset(14% 10% 14% 10% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1, ease: 'none' })
        .from('.ob', { scale: 0.75, duration: 1, ease: 'none' }, 0)
        .from('.rl li', { autoAlpha: 0, y: 24, stagger: 0.12, duration: 0.4 }, 0.4)
        .from('.rl .ln', { scaleX: 0, stagger: 0.12, duration: 0.4 }, 0.4);

      // 13. Roles Matrix Underline Expands
      document.querySelectorAll<HTMLElement>('.rr').forEach((r) => {
        gsap.from(r.querySelector('.ln'), {
          scaleX: 0,
          duration: 1.2,
          ease: 'expo.out',
          scrollTrigger: { trigger: r, start: 'top 88%' },
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <>
      {/* SVG Package Icon Definition */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <symbol id="pk" viewBox="0 0 24 24">
          <path d="M3 7l9-4 9 4v10l-9 4-9-4z" className="fa" fill="var(--brand)" />
          <path d="M3 7l9 4 9-4M12 11v10" fill="none" stroke="#17120a" strokeWidth="1.6" />
        </symbol>
      </svg>

      <main className="w-full relative z-10" id="main">
        {/* HERO SECTION */}
        <section className="hero pt-24 sm:pt-28 pb-16 min-h-screen flex flex-col justify-between" id="top">
          <div className="w hg grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-8 items-center max-w-7xl mx-auto w-full">
            <div className="hl flex flex-col justify-center">
              <h1 className="d text-6xl sm:text-8xl lg:text-[130px] font-black leading-[0.88] mb-6 tracking-tight" data-s>
                Find it. Buy it. <em className="accent-serif">Watch it come.</em>
              </h1>
              <p className="lead text-base sm:text-xl text-dim max-w-xl mb-7 leading-relaxed">
                A mobile-first marketplace modelled on Amazon.in. Browse, search, buy and track on Android, while sellers ship and admins moderate.{' '}
                <b className="text-text font-semibold">Payments run in Razorpay test mode only.</b>
              </p>
              <div className="bt flex flex-wrap gap-3.5 mb-6">
                <button className="btn" id="buy">
                  Buy
                </button>
                <a className="btn g" href="#loop">
                  See the loop
                </a>
              </div>
              <p className="m text-xs sm:text-sm text-dim font-mono">
                Order in motion: find, buy and track in five seconds.
              </p>
            </div>

            {/* 3D PARALLAX STAGE */}
            <div className="stage relative aspect-square w-full max-w-[580px] justify-self-center flex items-center justify-center" id="stg">
              <svg className="ring absolute inset-0 w-full h-full text-line pointer-events-none" data-z="14" viewBox="0 0 400 400" aria-hidden="true">
                <circle cx="200" cy="200" r="196" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 10" />
                <circle cx="200" cy="200" r="150" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>

              <div className="sr absolute top-[2%] left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 h-11 rounded-full bg-surface shadow-[inset_0_0_0_1.5px_var(--line)] text-text min-w-[240px] text-sm z-3" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M16 16l5 5" />
                </svg>
                <span id="ty" className="font-mono text-sm">headphones</span>
                <u className="w-0.5 h-4 bg-brand inline-block" />
              </div>

              {/* Floating Product Headphones Illustration */}
              <div className="pw absolute inset-[16%_14%_18%]" data-z="30">
                <div className="prod w-full h-full">
                  <div className="fl w-full h-full">
                    <svg viewBox="0 0 300 300" role="img" aria-label="Headphones illustration" className="w-full h-full overflow-visible">
                      <ellipse cx="150" cy="288" rx="78" ry="8" fill="var(--line)" />
                      <path d="M62 176C62 62 238 62 238 176" stroke="var(--text)" strokeWidth="16" strokeLinecap="round" fill="none" />
                      <rect x="38" y="148" width="60" height="112" rx="30" fill="var(--brand)" />
                      <rect x="202" y="148" width="60" height="112" rx="30" fill="var(--brand)" />
                      <path d="M56 182v52M244 182v52" stroke="#17120a" strokeOpacity="0.35" strokeWidth="7" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              <span className="chip m c1 text-xs" data-z="46" style={{ left: '0%', top: '30%' }}>
                Pincode delivery estimate
              </span>
              <span className="chip m c2 text-xs" data-z="52" style={{ right: '0%', top: '48%' }}>
                Variants with their own stock
              </span>
              <span className="chip m c3 text-xs" data-z="40" style={{ left: '6%', bottom: '22%' }}>
                Price-drop alerts
              </span>

              {/* Checkout Bottom Sheet (Rises during animation) */}
              <div className="sheet absolute inset-x-0 mx-auto bottom-0 w-[min(360px,94%)] bg-surface border-t-3 border-brand rounded-t-3xl p-5 z-4 shadow-2xl invisible" id="sh" role="dialog" aria-label="Checkout demo">
                <p className="m text-xs mb-2">Checkout · Razorpay test mode</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs my-3">
                  <dt className="text-dim">Address</dt>
                  <dd className="text-right font-medium">Default address</dd>
                  <dt className="text-dim">Delivery</dt>
                  <dd className="text-right font-medium">Standard or express</dd>
                  <dt className="text-dim">Stock</dt>
                  <dd className="text-right font-medium text-text">Held for 15 min</dd>
                </dl>
                <div className="flex flex-wrap gap-1.5 mb-4 text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded-full border border-line">UPI</span>
                  <span className="px-2 py-0.5 rounded-full border border-line">Cards</span>
                  <span className="px-2 py-0.5 rounded-full border border-line">Netbanking</span>
                  <span className="px-2 py-0.5 rounded-full border border-line">Wallets</span>
                  <span className="px-2 py-0.5 rounded-full border border-line">COD</span>
                </div>
                <button className="btn w-full" id="pay" tabIndex={-1}>
                  Pay
                </button>
              </div>
            </div>
          </div>

          {/* 5-STAGE TIMELINE TRACKER */}
          <div className="w max-w-7xl mx-auto w-full mt-10">
            <div className="tl py-3">
              <p className="m text-sm font-mono text-dim mb-2" id="st" role="status">
                Delivered. Every step was tracked.
              </p>
              <div className="tr relative h-20 mx-4 sm:mx-8">
                <i className="fi absolute left-0 right-0 top-5 h-0.5 bg-brand origin-left scale-x-0" />
                <span className="nd on absolute top-3 -translate-x-1/2 text-center w-20 font-mono text-xs text-dim" style={{ left: '0%' }}>
                  <b className="block w-4 h-4 mx-auto mb-2 rounded-full bg-surface shadow-[inset_0_0_0_2px_var(--line)]" />
                  Placed
                </span>
                <span className="nd on absolute top-3 -translate-x-1/2 text-center w-20 font-mono text-xs text-dim" style={{ left: '25%' }}>
                  <b className="block w-4 h-4 mx-auto mb-2 rounded-full bg-surface shadow-[inset_0_0_0_2px_var(--line)]" />
                  Packed
                </span>
                <span className="nd on absolute top-3 -translate-x-1/2 text-center w-20 font-mono text-xs text-dim" style={{ left: '50%' }}>
                  <b className="block w-4 h-4 mx-auto mb-2 rounded-full bg-surface shadow-[inset_0_0_0_2px_var(--line)]" />
                  Shipped
                </span>
                <span className="nd on absolute top-3 -translate-x-1/2 text-center w-20 font-mono text-xs text-dim" style={{ left: '75%' }}>
                  <b className="block w-4 h-4 mx-auto mb-2 rounded-full bg-surface shadow-[inset_0_0_0_2px_var(--line)]" />
                  Out for delivery
                </span>
                <span className="nd on absolute top-3 -translate-x-1/2 text-center w-20 font-mono text-xs text-dim" style={{ left: '100%' }}>
                  <b className="block w-4 h-4 mx-auto mb-2 rounded-full bg-surface shadow-[inset_0_0_0_2px_var(--line)]" />
                  Delivered
                </span>
                <svg className="pc absolute top-0 w-8 h-8 -ml-4 z-2" style={{ left: '100%' }} aria-hidden="true">
                  <use href="#pk" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* MARQUEE 1 */}
        <section className="mq py-0 overflow-hidden border-y border-line" aria-hidden="true">
          <div className="mt d flex gap-10 w-max text-5xl sm:text-7xl lg:text-[130px] font-black items-center py-4 text-text uppercase tracking-wider" id="mq1" />
        </section>

        {/* THE LOOP PINNED STORY */}
        <section className="loop py-0" id="loop">
          <div className="pin h-screen flex items-center">
            <div className="w lp grid grid-cols-1 md:grid-cols-2 gap-10 items-center max-w-7xl mx-auto w-full">
              <div className="lt">
                <p className="m text-sm font-mono text-dim mb-3">
                  The loop · step <span id="sn" className="text-text font-bold">04</span> of 04
                </p>
                <div className="steps relative h-72 sm:h-96 mt-4">
                  <div className="step absolute inset-0">
                    <h2 className="d text-6xl sm:text-8xl font-black">Find</h2>
                    <p className="text-dim max-w-md mt-4 text-base sm:text-lg">
                      Autocomplete, recent searches and typo tolerance. Filter by price, rating, brand, delivery speed, discount and availability, then sort.
                    </p>
                    <p className="m mt-3 text-xs sm:text-sm">Search, filters and voice or barcode input</p>
                  </div>
                  <div className="step absolute inset-0">
                    <h2 className="d text-6xl sm:text-8xl font-black">Buy</h2>
                    <p className="text-dim max-w-md mt-4 text-base sm:text-lg">
                      Your cart syncs across devices, and a guest cart merges when you log in. At checkout your stock is held for 15 minutes and the server recalculates every price.
                    </p>
                    <p className="m mt-3 text-xs sm:text-sm">Razorpay in test mode, or cash on delivery up to ₹50,000</p>
                  </div>
                  <div className="step absolute inset-0">
                    <h2 className="d text-6xl sm:text-8xl font-black">Track</h2>
                    <p className="text-dim max-w-md mt-4 text-base sm:text-lg">
                      Placed, packed, shipped, out for delivery, delivered. Updates arrive by polling every 30 seconds, and the last known status stays readable offline.
                    </p>
                    <p className="m mt-3 text-xs sm:text-sm">Push and email on every status change</p>
                  </div>
                  <div className="step absolute inset-0">
                    <h2 className="d text-6xl sm:text-8xl font-black">Return</h2>
                    <p className="text-dim max-w-md mt-4 text-base sm:text-lg">
                      Return within 7 days of delivery with a reason and photos. Refunds go back through Razorpay, in full or in part.
                    </p>
                    <p className="m mt-3 text-xs sm:text-sm">Cancel before shipment, return after delivery</p>
                  </div>
                </div>
                <div className="rail h-0.5 bg-line mt-6 max-w-md">
                  <i className="block h-full bg-brand origin-left scale-x-0" />
                </div>
              </div>

              {/* VECTOR PHONE ILLUSTRATION */}
              <svg className="phone h-[44vh] sm:h-[66vh] max-h-[660px] justify-self-center text-text" viewBox="0 0 300 560" role="img" aria-label="Phone illustration showing 4 stages">
                <rect className="dr fr" x="20" y="10" width="260" height="540" rx="38" fill="none" stroke="currentColor" strokeWidth="2" />
                <g className="g" id="g1">
                  <rect className="dr" x="44" y="64" width="212" height="40" rx="20" fill="none" stroke="currentColor" strokeWidth="2" />
                  <text className="t fd" x="66" y="89" fill="var(--text)" fontSize="12" fontFamily="DM Mono">headphnes</text>
                  <text className="t fd" x="44" y="128" fill="var(--brand)" fontSize="12" fontFamily="DM Mono">Showing results for headphones</text>
                  <rect className="dr" x="44" y="146" width="56" height="26" rx="13" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect className="dr" x="108" y="146" width="64" height="26" rx="13" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect className="dr" x="180" y="146" width="56" height="26" rx="13" fill="none" stroke="currentColor" strokeWidth="2" />
                  <text className="t fd" x="54" y="163" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Price</text>
                  <text className="t fd" x="118" y="163" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Rating</text>
                  <text className="t fd" x="190" y="163" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Brand</text>
                  <rect className="dr" x="44" y="196" width="64" height="64" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path className="dr" d="M124 210h100M124 230h70M124 250h40" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect className="dr" x="44" y="276" width="64" height="64" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path className="dr" d="M124 290h100M124 310h70M124 330h40" fill="none" stroke="currentColor" strokeWidth="2" />
                </g>
                <g className="g" id="g2">
                  <rect className="dr" x="44" y="70" width="64" height="64" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path className="dr" d="M124 84h100M124 104h70M124 124h50" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect className="dr" x="44" y="150" width="212" height="34" rx="17" fill="none" stroke="currentColor" strokeWidth="2" />
                  <text className="t fd" x="62" y="172" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Stock held for 15 min</text>
                  <text className="t fd" x="44" y="226" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Items</text>
                  <path className="dr" d="M44 236h212" fill="none" stroke="currentColor" strokeWidth="2" />
                  <text className="t fd" x="44" y="268" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Delivery, simulated fee</text>
                  <path className="dr" d="M44 278h212" fill="none" stroke="currentColor" strokeWidth="2" />
                  <text className="t fd" x="44" y="310" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Total, set by the server</text>
                  <path className="dr" d="M44 320h212" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect className="fd fa" x="44" y="440" width="212" height="48" rx="24" fill="var(--brand)" />
                  <text className="t fd" x="150" y="469" textAnchor="middle" fill="#17120a" fontSize="14" fontWeight="bold">Pay</text>
                </g>
                <g className="g" id="g3">
                  <path className="dr" d="M70 110V430" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle className="dr" cx="70" cy="110" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle className="dr" cx="70" cy="190" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle className="dr" cx="70" cy="270" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle className="dr" cx="70" cy="350" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle className="dr" cx="70" cy="430" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
                  <text className="t fd" x="94" y="114" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Placed</text>
                  <text className="t fd" x="94" y="194" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Packed</text>
                  <text className="t fd" x="94" y="274" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Shipped</text>
                  <text className="t fd" x="94" y="354" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Out for delivery</text>
                  <text className="t fd" x="94" y="434" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Delivered</text>
                  <rect className="fa pc2" x="60" y="100" width="20" height="20" rx="4" fill="var(--brand)" />
                  <text className="t fd" x="44" y="500" fill="var(--dim)" fontSize="12" fontFamily="DM Mono">Polling every 30 seconds</text>
                </g>
                <g className="g" id="g4">
                  <path className="dr" d="M118 166a62 62 0 1 1-14 66" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path className="dr" d="M96 150l22 16-24 10" fill="none" stroke="currentColor" strokeWidth="2" />
                  <text className="tb fd" x="150" y="238" textAnchor="middle" fill="var(--brand)" fontSize="64" fontFamily="Big Shoulders Display" fontWeight="900">7</text>
                  <text className="t fd" x="150" y="262" textAnchor="middle" fill="var(--text)" fontSize="12" fontFamily="DM Mono">days to return</text>
                  <rect className="dr" x="44" y="330" width="60" height="60" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect className="dr" x="116" y="330" width="60" height="60" rx="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <text className="t fd" x="44" y="420" fill="var(--dim)" fontSize="12" fontFamily="DM Mono">Reason and photos</text>
                  <rect className="dr" x="44" y="448" width="212" height="46" rx="23" fill="none" stroke="currentColor" strokeWidth="2" />
                  <text className="t fd" x="150" y="476" textAnchor="middle" fill="var(--text)" fontSize="12" fontFamily="DM Mono">Refund in full or in part</text>
                </g>
              </svg>
            </div>
          </div>
        </section>

        {/* DEALS OF THE DAY */}
        <section className="py-24" id="deals">
          <div className="w max-w-7xl mx-auto">
            <div className="dh flex justify-between items-end gap-8 flex-wrap mb-16">
              <div>
                <p className="m text-sm font-mono text-dim mb-2">Deals of the day</p>
                <h2 className="d text-5xl sm:text-7xl lg:text-[110px] font-black leading-none" data-s>
                  Gone when the clock says so
                </h2>
              </div>
              <div className="cd d flex text-5xl sm:text-7xl lg:text-9xl font-mono font-bold tracking-tight" role="timer" aria-label="Time left in today's deals">
                <span id="h">{hours}</span>
                <span>:</span>
                <span id="mi">{minutes}</span>
                <span>:</span>
                <span id="s">{seconds}</span>
              </div>
            </div>

            {/* 5 Distinct Deal Mechanisms */}
            <div className="dg grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
              <article className="dl md:col-span-7 border-t border-line pt-5">
                <div className="dv h-40 flex items-center justify-center mb-4 text-text">
                  <svg viewBox="0 0 200 120" className="h-full max-w-full overflow-visible" aria-hidden="true">
                    <circle cx="100" cy="60" r="52" fill="none" stroke="var(--line)" strokeWidth="2" />
                    <circle cx="100" cy="60" r="52" fill="none" stroke="var(--brand)" strokeWidth="5" strokeDasharray="90 240" />
                    <path d="M108 22L82 66h20l-8 32 30-48h-22z" fill="var(--brand)" />
                  </svg>
                </div>
                <h3 className="d text-3xl sm:text-4xl font-bold mb-2">Lightning deals</h3>
                <p className="text-dim text-sm sm:text-base leading-relaxed">
                  A deal price with a start, an end and a quantity cap. When the cap or the clock runs out, the deal is over.
                </p>
              </article>

              <article className="dl md:col-span-5 md:mt-20 border-t border-line pt-5">
                <div className="dv h-40 flex items-center justify-center mb-4 text-text">
                  <svg viewBox="0 0 200 120" className="h-full max-w-full overflow-visible" aria-hidden="true">
                    <path d="M20 20h160v30a10 10 0 0 0 0 20v30H20V70a10 10 0 0 0 0-20z" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <path d="M130 24v72" stroke="var(--brand)" strokeWidth="2.5" strokeDasharray="4 6" />
                    <path d="M40 50h70M40 70h50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="d text-3xl sm:text-4xl font-bold mb-2">Coupons</h3>
                <p className="text-dim text-sm sm:text-base leading-relaxed">
                  One code with a minimum cart, a usage limit and a per-user limit. Start and expiry are checked on the server.
                </p>
              </article>

              <article className="dl md:col-span-4 border-t border-line pt-5">
                <div className="dv h-40 flex items-center justify-center mb-4 text-text">
                  <svg viewBox="0 0 200 120" className="h-full max-w-full overflow-visible" aria-hidden="true">
                    <rect x="24" y="22" width="152" height="86" rx="12" fill="none" stroke="currentColor" strokeWidth="2.5" />
                    <rect x="40" y="42" width="30" height="22" rx="4" fill="var(--brand)" />
                    <path d="M40 86h60" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="d text-3xl sm:text-4xl font-bold mb-2">Bank offers</h3>
                <p className="text-dim text-sm sm:text-base leading-relaxed">
                  Offers at checkout, clearly marked as simulated. Instant discounts with cards or netbanking.
                </p>
              </article>

              <article className="dl md:col-span-4 md:mt-16 border-t border-line pt-5">
                <div className="dv h-40 flex items-center justify-center mb-4 text-text">
                  <svg viewBox="0 0 200 120" className="h-full max-w-full overflow-visible" aria-hidden="true">
                    <circle cx="100" cy="60" r="26" fill="var(--brand)" />
                    <path d="M100 14v18M100 88v18M54 60h18M128 60h18M67 27l12 12M121 81l12 12M67 93l12-12M121 39l12-12" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="d text-3xl sm:text-4xl font-bold mb-2">Seasonal pages</h3>
                <p className="text-dim text-sm sm:text-base leading-relaxed">
                  Banners and the homepage layout are set from the admin panel, each with its own active window.
                </p>
              </article>

              <article className="dl md:col-span-4 border-t border-line pt-5">
                <div className="dv h-40 flex items-center justify-center mb-4 text-text">
                  <svg viewBox="0 0 200 120" className="h-full max-w-full overflow-visible" aria-hidden="true">
                    <path d="M60 24v60M36 62l24 24 24-24" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="132" cy="60" r="38" fill="var(--brand)" />
                    <path d="M116 52l16 18 16-18" fill="none" stroke="#17120a" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="d text-3xl sm:text-4xl font-bold mb-2">Price-drop badges</h3>
                <p className="text-dim text-sm sm:text-base leading-relaxed">
                  Save a product to a wishlist and get an alert when the price falls or it is back in stock.
                </p>
              </article>
            </div>

            {/* LIVE DEALS ITEMS FROM DATABASE */}
            {deals.length > 0 && (
              <div className="mt-12 pt-8 border-t border-line">
                <h3 className="d text-3xl font-black uppercase mb-6 text-[var(--ax)]">Live Lightning Deals · Claim before timer expires</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {deals.map((deal) => {
                    const discountPercent = Math.round(
                      ((deal.original_price_paise - deal.deal_price_paise) / deal.original_price_paise) * 100
                    );
                    return (
                      <div key={deal.id} className="p-5 rounded-2xl bg-surface border border-line flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-brand text-on-brand font-bold">
                              {discountPercent}% OFF
                            </span>
                            <span className="text-xs font-mono text-dim">
                              {deal.sold_count} / {deal.quantity_cap} claimed
                            </span>
                          </div>
                          <h4 className="font-semibold text-lg line-clamp-2 mb-2 text-text">{deal.title}</h4>
                          <p className="text-xs text-dim font-mono mb-4">Brand: {deal.brand}</p>
                        </div>
                        <div className="flex items-baseline gap-3 pt-3 border-t border-line/60">
                          <span className="text-2xl font-bold text-[var(--ax)]">
                            ₹{(deal.deal_price_paise / 100).toLocaleString('en-IN')}
                          </span>
                          <span className="text-sm line-through text-dim">
                            ₹{(deal.original_price_paise / 100).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* CATEGORIES SECTION */}
        <section className="py-24" id="cats">
          <div className="w max-w-7xl mx-auto">
            <div className="intro grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-end mb-16">
              <h2 className="d text-5xl sm:text-7xl lg:text-[110px] font-black leading-none" data-s>
                Three levels deep, every shelf a page
              </h2>
              <p className="text-dim text-base sm:text-lg max-w-md leading-relaxed" data-r>
                A 3-level category tree with a landing page for each. Every category carries attribute definitions, and those power the filters in search.
              </p>
            </div>

            <div className="ct grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 items-start">
              <div className="tile bg-surface p-7 overflow-hidden min-h-[440px] rounded-2xl border border-line">
                <div className="d text-8xl font-black text-[var(--ax)] mb-2">1</div>
                <svg viewBox="0 0 200 120" className="w-full my-4 text-text overflow-visible" aria-hidden="true">
                  <rect className="dr" x="10" y="10" width="54" height="44" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect className="dr" x="73" y="10" width="54" height="44" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect className="dr" x="136" y="10" width="54" height="44" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect className="dr" x="10" y="66" width="54" height="44" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect className="dr" x="73" y="66" width="54" height="44" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
                  <rect className="dr" x="136" y="66" width="54" height="44" rx="6" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
                <h3 className="text-xl font-bold mb-2">Top-level categories</h3>
                <p className="text-dim text-sm leading-relaxed">The landing pages people start from. Electronics, Fashion, Home, Beauty, Sports.</p>
              </div>

              <div className="tile bg-surface p-7 overflow-hidden min-h-[500px] md:mt-16 rounded-2xl border border-line">
                <div className="d text-8xl font-black text-[var(--ax)] mb-2">2</div>
                <svg viewBox="0 0 200 140" className="w-full my-4 text-text overflow-visible" aria-hidden="true">
                  <circle className="dr" cx="100" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path className="dr" d="M100 25v20M30 45h140M30 45v30M100 45v30M170 45v30" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle className="dr" cx="30" cy="84" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle className="dr" cx="100" cy="84" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle className="dr" cx="170" cy="84" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
                <h3 className="text-xl font-bold mb-2">Sub-categories</h3>
                <p className="text-dim text-sm leading-relaxed">Branches that narrow the shelf: Audio, Wearables, Laptops, Men's, Women's, Appliances.</p>
              </div>

              <div className="tile bg-surface p-7 overflow-hidden min-h-[440px] md:mt-8 rounded-2xl border border-line">
                <div className="d text-8xl font-black text-[var(--ax)] mb-2">3</div>
                <svg viewBox="0 0 200 150" className="w-full my-4 text-text overflow-visible" aria-hidden="true">
                  <circle className="dr" cx="100" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path className="dr" d="M100 20v14M40 34h120M40 34v16M100 34v16M160 34v16" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle className="dr" cx="40" cy="58" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle className="dr" cx="100" cy="58" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle className="dr" cx="160" cy="58" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                </svg>
                <h3 className="text-xl font-bold mb-2">Leaves with attributes</h3>
                <p className="text-dim text-sm leading-relaxed">Where products live, each with variants, price and stock. Powers faceted filters.</p>
              </div>
            </div>
          </div>
        </section>

        {/* STATS & RESILIENCE */}
        <section className="py-24" id="stats">
          <div className="w max-w-7xl mx-auto">
            <div className="sg grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="border-t border-line pt-3">
                <div className="big d text-6xl sm:text-8xl lg:text-[130px] font-black leading-none" data-n="500" data-x="+">
                  500+
                </div>
                <p className="m text-xs sm:text-sm text-dim mt-2">products seeded, with variants and stock</p>
              </div>
              <div className="border-t border-line pt-3">
                <div className="big d text-6xl sm:text-8xl lg:text-[130px] font-black leading-none" data-n="15">
                  15
                </div>
                <p className="m text-xs sm:text-sm text-dim mt-2">minute stock hold at checkout</p>
              </div>
              <div className="border-t border-line pt-3">
                <div className="big d text-6xl sm:text-8xl lg:text-[130px] font-black leading-none" data-n="30">
                  30
                </div>
                <p className="m text-xs sm:text-sm text-dim mt-2">second polling for order tracking</p>
              </div>
              <div className="border-t border-line pt-3">
                <div className="big d text-6xl sm:text-8xl lg:text-[130px] font-black leading-none" data-n="7">
                  7
                </div>
                <p className="m text-xs sm:text-sm text-dim mt-2">day return window after delivery</p>
              </div>
            </div>

            {/* BUILT FOR BAD DAYS */}
            <div className="bad grid grid-cols-1 md:grid-cols-2 gap-12 mt-20 items-center">
              <div className="skw grid gap-4 bg-surface p-6 rounded-2xl border border-line" aria-hidden="true">
                <div className="sk flex gap-4 items-center">
                  <i className="w-16 h-16 rounded-xl skeleton flex-none" />
                  <div className="flex-1 space-y-2">
                    <u className="block h-3 rounded skeleton w-4/5 no-underline" />
                    <u className="block h-3 rounded skeleton w-1/2 no-underline" />
                  </div>
                </div>
                <div className="sk flex gap-4 items-center">
                  <i className="w-16 h-16 rounded-xl skeleton flex-none" />
                  <div className="flex-1 space-y-2">
                    <u className="block h-3 rounded skeleton w-3/4 no-underline" />
                    <u className="block h-3 rounded skeleton w-2/5 no-underline" />
                  </div>
                </div>
                <p className="m text-xs font-mono text-dim mt-2" id="wk">
                  Waking up the shop…
                </p>
              </div>
              <div>
                <h3 className="d text-4xl sm:text-6xl font-black mb-4 leading-tight" data-s>
                  Built for bad days
                </h3>
                <p className="text-dim text-base sm:text-lg leading-relaxed" data-r>
                  Slow network, a sleeping backend or no signal at all. You get skeleton cards, up to 3 automatic retries, and home, categories, cart and orders stay readable offline. Changes you make queue and retry.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI SHOPPING ASSISTANT */}
        <section className="py-24" id="ai">
          <div className="w ag grid grid-cols-1 lg:grid-cols-2 gap-14 items-center max-w-7xl mx-auto">
            <div>
              <p className="m text-sm font-mono text-dim mb-2">AI shopping assistant</p>
              <h2 className="d text-5xl sm:text-7xl lg:text-[96px] font-black leading-none my-4" data-s>
                Ask anything. <em className="accent-serif">Confirm every action.</em>
              </h2>
              <p className="text-dim text-base sm:text-lg leading-relaxed mb-6" data-r>
                Search, compare, summarise reviews and Q&amp;A, find coupons and check where an order is. It never places, cancels, returns or refunds without your tap in the chat, never asks for card data, and says it doesn't know instead of inventing a price.
              </p>
              <ul className="lm m flex flex-wrap gap-4 text-xs sm:text-sm font-mono text-dim p-0 list-none">
                <li className="px-3 py-1 rounded-full border border-line">30 messages a day</li>
                <li className="px-3 py-1 rounded-full border border-line">1,500 characters</li>
                <li className="px-3 py-1 rounded-full border border-line">10 tool calls per reply</li>
              </ul>
            </div>

            {/* Interactive Chat Mockup */}
            <div className="chat flex flex-col gap-3.5 p-6 sm:p-8 bg-surface rounded-3xl min-h-[500px] border border-line" id="chat">
              <div className="b u self-end bg-brand text-on-brand rounded-2xl rounded-br-none px-4 py-3 font-semibold max-w-[90%] text-sm sm:text-base" id="bu">
                Find me a headphones deal, then cancel my last order.
              </div>
              <div className="b a self-start bg-bg rounded-2xl rounded-bl-none p-5 max-w-[92%] border border-line/60" id="ba">
                <div className="tools flex flex-wrap gap-1.5 mb-3">
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border border-[var(--ax)] text-[var(--ax)]">Search and filter</span>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border border-[var(--ax)] text-[var(--ax)]">Find deals and coupons</span>
                  <span className="font-mono text-xs px-2.5 py-0.5 rounded-full border border-[var(--ax)] text-[var(--ax)]">Order status</span>
                </div>
                <div className="res grid gap-3 text-xs sm:text-sm">
                  <div className="rc flex gap-3.5 items-center">
                    <svg viewBox="0 0 300 300" className="w-12 h-12 flex-none" aria-hidden="true">
                      <path d="M62 176C62 62 238 62 238 176" stroke="var(--text)" strokeWidth="18" strokeLinecap="round" fill="none" />
                      <rect x="38" y="148" width="60" height="112" rx="30" fill="var(--brand)" />
                      <rect x="202" y="148" width="60" height="112" rx="30" fill="var(--brand)" />
                    </svg>
                    <div>
                      <b className="block font-semibold">Deals found</b>
                      <span className="text-dim text-xs">Prices come from the catalogue, not from me.</span>
                    </div>
                  </div>
                  <div className="rc flex gap-3.5 items-center">
                    <svg viewBox="0 0 60 60" className="w-12 h-12 flex-none" aria-hidden="true">
                      <path d="M8 14h44M8 30h32M8 46h38" stroke="var(--text)" strokeWidth="5" strokeLinecap="round" />
                    </svg>
                    <div>
                      <b className="block font-semibold">Review summary</b>
                      <span className="text-dim text-xs">Built from verified purchasers' reviews.</span>
                    </div>
                  </div>
                </div>
                <div className="cfm flex gap-2.5 items-center flex-wrap mt-4 pt-4 border-t border-line">
                  <span className="w-full text-xs text-text font-medium">Cancel your last order? Nothing happens until you tap Confirm.</span>
                  <button className="btn sm">Confirm</button>
                  <button className="btn g sm">Not now</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* RULES THAT NEVER BREAK (PINNED EXPANDING CANOPY) */}
        <section className="rs h-screen relative overflow-hidden flex items-center justify-center" id="rules">
          <div className="ob d absolute inset-0 grid place-items-center text-7xl sm:text-[180px] lg:text-[280px] font-black uppercase text-transparent whitespace-nowrap pointer-events-none select-none" style={{ WebkitTextStroke: '2px var(--line)' }} aria-hidden="true">
            Never break
          </div>
          <div className="rp absolute inset-0 bg-brand text-on-brand flex items-center">
            <div className="ri w-full px-6 sm:px-16 lg:px-28">
              <p className="m text-xs sm:text-sm font-mono text-on-brand font-semibold mb-2" style={{ color: 'var(--on-brand)' }}>Hard rules, each with a named test</p>
              <h2 className="d text-4xl sm:text-7xl lg:text-9xl font-black uppercase mb-8" id="rh">
                Rules that never break
              </h2>
              <ul className="rl list-none p-0 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                <li className="relative pl-9 text-sm sm:text-lg font-bold leading-snug">
                  <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-on-brand origin-left" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute left-0 top-3 w-5 h-5">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                  The client never sets a price. The server recalculates every total.
                </li>
                <li className="relative pl-9 text-sm sm:text-lg font-bold leading-snug">
                  <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-on-brand origin-left" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute left-0 top-3 w-5 h-5">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                  An order confirms only after server-side signature verification and the payment.captured webhook.
                </li>
                <li className="relative pl-9 text-sm sm:text-lg font-bold leading-snug">
                  <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-on-brand origin-left" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute left-0 top-3 w-5 h-5">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                  50 concurrent buyers of 10 units: exactly 10 succeed.
                </li>
                <li className="relative pl-9 text-sm sm:text-lg font-bold leading-snug">
                  <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-on-brand origin-left" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute left-0 top-3 w-5 h-5">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                  Replay the same webhook five times: one order, one payment.
                </li>
                <li className="relative pl-9 text-sm sm:text-lg font-bold leading-snug">
                  <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-on-brand origin-left" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute left-0 top-3 w-5 h-5">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                  Every endpoint checks session, role and ownership.
                </li>
                <li className="relative pl-9 text-sm sm:text-lg font-bold leading-snug">
                  <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-on-brand origin-left" />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute left-0 top-3 w-5 h-5">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                  No card data on our servers or in logs.
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FOUR ROLES, ONE MARKETPLACE */}
        <section className="py-24" id="roles">
          <div className="w max-w-7xl mx-auto">
            <h2 className="d text-5xl sm:text-7xl lg:text-[110px] font-black uppercase mb-16" data-s>
              Four roles, one marketplace
            </h2>
            <div className="space-y-12">
              <div className="rr grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-6 py-6 relative items-start">
                <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-line origin-left" />
                <h3 className="d text-5xl sm:text-7xl font-bold uppercase transition-all duration-300 hover:text-brand hover:translate-x-3" data-s>
                  Guest
                </h3>
                <p className="text-dim text-sm sm:text-base">
                  <b className="block text-text font-mono text-xs uppercase mb-1 font-bold">Can</b>
                  Browse, search, view products and keep a local cart.
                </p>
                <p className="text-dim text-sm sm:text-base">
                  <b className="block text-text font-mono text-xs uppercase mb-1 font-bold">Cannot</b>
                  Check out, review or sync wishlists.
                </p>
              </div>

              <div className="rr grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-6 py-6 relative items-start">
                <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-line origin-left" />
                <h3 className="d text-5xl sm:text-7xl font-bold uppercase transition-all duration-300 hover:text-brand hover:translate-x-3" data-s>
                  Customer
                </h3>
                <p className="text-dim text-sm sm:text-base">
                  <b className="block text-text font-mono text-xs uppercase mb-1 font-bold">Can</b>
                  Run the whole shopping loop, write reviews, contact support and use the AI assistant.
                </p>
                <p className="text-dim text-sm sm:text-base">
                  <b className="block text-text font-mono text-xs uppercase mb-1 font-bold">Cannot</b>
                  See other users' data, or use seller and admin tools.
                </p>
              </div>

              <div className="rr grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-6 py-6 relative items-start">
                <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-line origin-left" />
                <h3 className="d text-5xl sm:text-7xl font-bold uppercase transition-all duration-300 hover:text-brand hover:translate-x-3" data-s>
                  Seller
                </h3>
                <p className="text-dim text-sm sm:text-base">
                  <b className="block text-text font-mono text-xs uppercase mb-1 font-bold">Can</b>
                  Manage their own catalogue, orders and returns, and see sales and the payout ledger. New sellers wait as pending until an admin approves them.
                </p>
                <p className="text-dim text-sm sm:text-base">
                  <b className="block text-text font-mono text-xs uppercase mb-1 font-bold">Cannot</b>
                  See other sellers' data, moderate or refund.
                </p>
              </div>

              <div className="rr grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-6 py-6 relative items-start">
                <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-line origin-left" />
                <h3 className="d text-5xl sm:text-7xl font-bold uppercase transition-all duration-300 hover:text-brand hover:translate-x-3" data-s>
                  Admin
                </h3>
                <p className="text-dim text-sm sm:text-base">
                  <b className="block text-text font-mono text-xs uppercase mb-1 font-bold">Can</b>
                  Run users, sellers, moderation, promotions, refunds, the support inbox and analytics.
                </p>
                <p className="text-dim text-sm sm:text-base">
                  <b className="block text-text font-mono text-xs uppercase mb-1 font-bold">Cannot</b>
                  Edit audit log entries.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* LIVE CATALOGUE PREVIEW */}
        {featuredProducts.length > 0 && (
          <section className="py-20 border-t border-line" id="catalogue">
            <div className="w max-w-7xl mx-auto">
              <div className="flex justify-between items-baseline mb-10 flex-wrap gap-4">
                <div>
                  <p className="m text-xs font-mono text-dim mb-1">Live from our 525 seeded products</p>
                  <h3 className="d text-4xl sm:text-6xl font-black uppercase">Browse the Catalogue</h3>
                </div>
                <Link href="/categories" className="btn g sm font-mono text-xs">
                  View all categories &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="p-5 rounded-2xl bg-surface border border-line flex flex-col justify-between group hover:border-brand transition-colors"
                  >
                    <div>
                      <div className="flex justify-between items-center text-xs font-mono text-dim mb-2">
                        <span>{p.brand}</span>
                        <span className="text-[var(--ax)] font-semibold">★ {p.rating}</span>
                      </div>
                      <h4 className="font-semibold text-base line-clamp-2 mb-2 group-hover:text-[var(--ax)] transition-colors">
                        {p.title}
                      </h4>
                      <p className="text-xs text-dim mb-4">{p.category_name}</p>
                    </div>
                    <div className="pt-3 border-t border-line/60 flex justify-between items-baseline">
                      <span className="text-xl font-bold text-text">
                        ₹{(p.price_paise / 100).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-mono text-dim">Details &rarr;</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
