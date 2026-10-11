'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getProductImage, getCategoryCover } from '@/lib/images';

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

const HERO_BANNERS = [
  {
    id: 1,
    title: 'Studio Pro Wireless ANC Headphones',
    tagline: 'Pure Acoustics · 40-Hour Battery · Active Noise Cancellation',
    price: '₹14,999',
    originalPrice: '₹24,999',
    badge: 'Deal of the Day · 40% OFF',
    image: '/photos/banner1.webp',
    ctaLink: '/products',
  },
  {
    id: 2,
    title: 'AeroBook Studio M2 Workstation',
    tagline: 'Minimalist Aluminum Body · Retina TrueTone Display · 18h Battery',
    price: '₹89,999',
    originalPrice: '₹1,09,999',
    badge: 'Flagship Electronics',
    image: '/photos/banner2.webp',
    ctaLink: '/categories',
  },
  {
    id: 3,
    title: 'Chronos Sapphire OLED Smartwatch',
    tagline: 'Grade 5 Titanium · ECG & SpO2 Sensors · 7-Day Battery Life',
    price: '₹19,999',
    originalPrice: '₹29,999',
    badge: 'Wearable Tech',
    image: '/photos/banner3.webp',
    ctaLink: '/products',
  },
];

const STORE_DEPARTMENTS = [
  {
    name: 'Electronics',
    desc: 'Audio, Wearables, Laptops, Mobile & Smart Home',
    image: '/photos/categories/electronics.webp',
    itemsCount: '180+ Products',
    link: '/search?category=Electronics',
  },
  {
    name: 'Fashion & Apparel',
    desc: 'Sneakers, Streetwear, Eyewear, Watches & Outerwear',
    image: '/photos/categories/fashion.webp',
    itemsCount: '120+ Products',
    link: '/search?category=Fashion',
  },
  {
    name: 'Home & Kitchen',
    desc: 'Smart Appliances, Air Fryers, Espresso & Cookware',
    image: '/photos/categories/home-kitchen.webp',
    itemsCount: '95+ Products',
    link: '/search?category=Home',
  },
  {
    name: 'Beauty & Health',
    desc: 'Skincare, Fragrances, Grooming & Wellness',
    image: '/photos/categories/beauty-health.webp',
    itemsCount: '70+ Products',
    link: '/search?category=Beauty',
  },
  {
    name: 'Sports & Fitness',
    desc: 'Training Gear, Running Shoes, Dumbbells & Mats',
    image: '/photos/categories/sports-fitness.webp',
    itemsCount: '60+ Products',
    link: '/search?category=Sports',
  },
];

export default function HomePage() {
  const [deals, setDeals] = useState<DealItem[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductItem[]>([]);
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');
  const [activeBanner, setActiveBanner] = useState(0);
  const [activeLoopStep, setActiveLoopStep] = useState(0);

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

  // GSAP Animations — Balanced & Clean (Amazon-style without scroll-jacking)
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
          yPercent: 110,
          rotate: 3,
          duration: 0.9,
          ease: 'expo.out',
          stagger: { amount: 0.4 },
          scrollTrigger: { trigger: el, start: 'top 92%' },
        });
      };

      document.querySelectorAll<HTMLElement>('[data-s]').forEach(splitAndRise);

      // 2. Smooth fade rise for [data-r]
      document.querySelectorAll<HTMLElement>('[data-r]').forEach((el) => {
        gsap.from(el, {
          y: 20,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 92%' },
        });
      });

      // 3. Gentle Hero Product Float
      gsap.to('.fl', {
        y: -10,
        rotate: 1.5,
        duration: 3.2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });

      gsap.from(['.pw', '.ring', '.chip', '.sr'], {
        scale: 0.92,
        opacity: 0,
        duration: 1.0,
        stagger: 0.08,
        ease: 'power3.out',
        delay: 0.2,
      });

      // 4. Parallax Stage Pointer Move
      const stg = document.getElementById('stg');
      if (stg) {
        const zElements = Array.from(stg.querySelectorAll<HTMLElement>('[data-z]')).map((el) => ({
          x: gsap.quickTo(el, 'x', { duration: 0.8, ease: 'power3' }),
          y: gsap.quickTo(el, 'y', { duration: 0.8, ease: 'power3' }),
          z: Number(el.dataset.z || 15),
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

      // 5. Interactive "Order in Motion" Sequence (Triggered ONLY on user click)
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
        for (let i = 0; i < 24; i++) {
          const p = document.createElement('i');
          p.className = 'cn';
          s.appendChild(p);
          const angle = Math.random() * 6.28;
          const dist = 70 + Math.random() * 150;
          gsap.fromTo(
            p,
            { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 },
            {
              x: Math.cos(angle) * dist,
              y: Math.sin(angle) * dist - 30,
              rotate: Math.random() * 360,
              opacity: 0,
              scale: 0.3,
              duration: 1.2,
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
            duration: 0.8,
            ease: 'none',
            onUpdate: () => {
              typingSpan.textContent = word.slice(0, Math.round(typeObj.progress));
            },
          })
          .call(() => {
            statusText.textContent = 'Buy: product flies to your cart';
          })
          .to(prodEl, { x: dx, y: dy, scale: 0.08, rotate: -15, duration: 0.7, ease: 'power3.in' }, '+=.2')
          .call(() => {
            badgeCount.textContent = '1';
          })
          .fromTo(cartBtn, { scale: 1 }, { scale: 1.2, yoyo: true, repeat: 1, duration: 0.16 })
          .set(prodEl, { x: 0, y: 0, scale: 1, rotate: 0, opacity: 0 })
          .fromTo(sheet, { autoAlpha: 1, yPercent: 105 }, { yPercent: 0, duration: 0.7, ease: 'expo.out' })
          .to(payBtn, { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1 }, '+=.6')
          .to(sheet, { yPercent: 105, duration: 0.4, ease: 'power3.in' }, '+=.2')
          .set(sheet, { autoAlpha: 0 })
          .call(triggerConfetti)
          .to(prodEl, { opacity: 1, duration: 0.6 })
          .call(() => {
            setNodeActive(0);
            statusText.textContent = `${labels[0]}. Your order is on its way.`;
          });

        for (let i = 1; i < 5; i++) {
          tl.to(parcelIcon, { left: `${i * 25}%`, duration: 0.6, ease: 'power2.inOut' }, '>.1')
            .to(fillLine, { scaleX: i / 4, duration: 0.6, ease: 'power2.inOut' }, '<')
            .call(() => {
              setNodeActive(i);
              statusText.textContent = i < 4 ? labels[i] : 'Delivered. Every step was tracked.';
            });
        }
      };

      if (buyBtn) {
        buyBtn.addEventListener('click', runOrderAnimation);
      }

      // 6. Marquee ticker loop
      const mqEl = document.getElementById('mq1');
      if (mqEl) {
        const words = ['Search', 'Cart', 'Checkout', 'Track', 'Return', 'Support', 'Assistant'];
        mqEl.innerHTML = words.map((w) => `<span>${w}</span><i></i>`).join('');
        mqEl.innerHTML += mqEl.innerHTML;
        let x = 0;
        gsap.ticker.add(() => {
          x -= 0.9;
          const halfWidth = mqEl.scrollWidth / 2;
          if (x <= -halfWidth) x += halfWidth;
          mqEl.style.transform = `translate3d(${x}px,0,0)`;
        });
      }

      // 7. Deal Cards Clean Fade-in (No jarring 3D tilt)
      document.querySelectorAll<HTMLElement>('.dl').forEach((c) => {
        gsap.from(c, {
          y: 25,
          opacity: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: { trigger: c, start: 'top 92%' },
        });
      });

      // 8. Categories Soft Reveal
      document.querySelectorAll<HTMLElement>('.dept-card').forEach((t) => {
        gsap.from(t, {
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: t, start: 'top 92%' },
        });
      });

      // 9. Stat Number Counters
      document.querySelectorAll<HTMLElement>('[data-n]').forEach((el) => {
        const target = Number(el.dataset.n || 0);
        const suffix = el.dataset.x || '';
        const obj = { val: 0 };
        gsap.to(obj, {
          val: target,
          duration: 1.8,
          ease: 'power2.out',
          snap: { val: 1 },
          onUpdate: () => {
            el.textContent = `${obj.val}${suffix}`;
          },
          scrollTrigger: { trigger: el, start: 'top 90%' },
        });
      });

      // 10. AI Chat Typing Reveal
      const bu = document.getElementById('bu');
      const ba = document.getElementById('ba');
      if (bu && ba) {
        const userPrompt = bu.textContent?.trim() || '';
        bu.textContent = '';
        gsap.set([bu, ba], { autoAlpha: 0 });
        const typeChat = { progress: 0 };
        gsap
          .timeline({ scrollTrigger: { trigger: '#chat', start: 'top 75%' } })
          .to(bu, { autoAlpha: 1, duration: 0.3 })
          .to(typeChat, {
            progress: userPrompt.length,
            duration: 1.6,
            ease: 'none',
            onUpdate: () => {
              bu.textContent = userPrompt.slice(0, Math.round(typeChat.progress));
            },
          })
          .to(ba, { autoAlpha: 1, duration: 0.3 })
          .fromTo(ba.children, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, stagger: 0.2, duration: 0.4 });
      }

      // 11. Smooth Rules Reveal (No aggressive pin lock)
      const rulesEl = document.getElementById('rules');
      if (rulesEl) {
        gsap.from('#rh', {
          y: 30,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: { trigger: rulesEl, start: 'top 85%' },
        });
        gsap.from('.rl li', {
          y: 20,
          opacity: 0,
          stagger: 0.08,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: { trigger: '.rl', start: 'top 88%' },
        });
      }

      // 12. Roles Matrix Underline
      document.querySelectorAll<HTMLElement>('.rr').forEach((r) => {
        gsap.from(r.querySelector('.ln'), {
          scaleX: 0,
          duration: 0.9,
          ease: 'power2.out',
          scrollTrigger: { trigger: r, start: 'top 90%' },
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
        <section className="hero pt-24 sm:pt-28 pb-12 flex flex-col justify-between" id="top">
          <div className="w hg grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-8 items-center max-w-7xl mx-auto w-full">
            <div className="hl flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-xs font-mono font-semibold w-max mb-4">
                <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                Amazon-Style Digital Marketplace
              </div>
              <h1 className="d text-5xl sm:text-7xl lg:text-[104px] font-black leading-[0.94] mb-5 tracking-tight" data-s>
                Find it. Buy it. <em className="accent-serif">Watch it come.</em>
              </h1>
              <p className="lead text-base sm:text-lg text-dim max-w-xl mb-6 leading-relaxed">
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
                <Link className="btn g" href="/categories">
                  Explore Catalogue
                </Link>
              </div>
              <p className="m text-xs sm:text-sm text-dim font-mono">
                Order in motion: tap &ldquo;Buy&rdquo; to simulate real-time cart, checkout &amp; 5-stage tracking.
              </p>
            </div>

            {/* 3D PARALLAX STAGE WITH REAL HEADPHONES PHOTOGRAPHY */}
            <div className="stage relative aspect-square w-full max-w-[540px] justify-self-center flex items-center justify-center" id="stg">
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

              {/* Floating Real Product Photography */}
              <div className="pw absolute inset-[14%_12%_16%]" data-z="30">
                <div className="prod w-full h-full flex items-center justify-center">
                  <div className="fl w-full h-full relative flex items-center justify-center">
                    <img
                      src="/photos/products/sony-headphones-black.webp"
                      alt="Studio Pro Wireless ANC Headphones"
                      className="w-full h-full object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.65)]"
                    />
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
          <div className="w max-w-7xl mx-auto w-full mt-8">
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

        {/* AMAZON-STYLE FEATURED PROMO BANNERS CAROUSEL */}
        <section className="py-6 border-y border-line bg-surface/30">
          <div className="w max-w-7xl mx-auto px-4">
            <div className="relative rounded-3xl overflow-hidden border border-line bg-surface">
              <div className="grid grid-cols-1 md:grid-cols-12 items-center min-h-[380px]">
                {/* Banner Text Details */}
                <div className="md:col-span-7 p-8 sm:p-12 z-2">
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold bg-brand text-on-brand mb-4">
                    {HERO_BANNERS[activeBanner].badge}
                  </span>
                  <h3 className="d text-3xl sm:text-5xl font-black mb-3 text-text leading-tight">
                    {HERO_BANNERS[activeBanner].title}
                  </h3>
                  <p className="text-dim text-sm sm:text-base mb-6 max-w-lg leading-relaxed">
                    {HERO_BANNERS[activeBanner].tagline}
                  </p>
                  <div className="flex items-baseline gap-4 mb-8">
                    <span className="text-3xl sm:text-4xl font-extrabold text-[var(--ax)]">
                      {HERO_BANNERS[activeBanner].price}
                    </span>
                    <span className="text-lg line-through text-dim">
                      {HERO_BANNERS[activeBanner].originalPrice}
                    </span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <Link href={HERO_BANNERS[activeBanner].ctaLink} className="btn">
                      Shop Flagship Now
                    </Link>
                    <div className="flex gap-2 ml-4">
                      {HERO_BANNERS.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveBanner(idx)}
                          className={`w-3 h-3 rounded-full transition-all ${
                            activeBanner === idx ? 'bg-brand w-8' : 'bg-line hover:bg-dim'
                          }`}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Banner Real Photography */}
                <div className="md:col-span-5 h-[280px] md:h-full relative overflow-hidden bg-bg">
                  <img
                    src={HERO_BANNERS[activeBanner].image}
                    alt={HERO_BANNERS[activeBanner].title}
                    className="w-full h-full object-cover transition-opacity duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-surface via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MARQUEE 1 */}
        <section className="mq py-0 overflow-hidden border-b border-line" aria-hidden="true">
          <div className="mt d flex gap-10 w-max text-4xl sm:text-6xl lg:text-[100px] font-black items-center py-3 text-text uppercase tracking-wider" id="mq1" />
        </section>

        {/* THE 4-STEP LOOP (UNPINNED & INTERACTIVE) */}
        <section className="py-20 border-b border-line" id="loop">
          <div className="w max-w-7xl mx-auto px-4">
            <div className="flex justify-between items-baseline mb-8 flex-wrap gap-4">
              <div>
                <p className="m text-sm font-mono text-dim mb-1">Interactive Marketplace Flow</p>
                <h2 className="d text-4xl sm:text-6xl font-black uppercase">The Shopping Loop</h2>
              </div>
              <div className="flex gap-2">
                {['01 Find', '02 Buy', '03 Track', '04 Return'].map((stepTitle, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveLoopStep(idx)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-mono transition-all ${
                      activeLoopStep === idx
                        ? 'bg-brand text-on-brand font-bold shadow'
                        : 'bg-surface border border-line text-dim hover:text-text'
                    }`}
                  >
                    {stepTitle}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center bg-surface p-8 sm:p-12 rounded-3xl border border-line">
              <div className="md:col-span-6">
                {activeLoopStep === 0 && (
                  <div className="space-y-4">
                    <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-mono font-bold">
                      Step 01 of 04
                    </span>
                    <h3 className="d text-4xl sm:text-5xl font-black">Find Instantly</h3>
                    <p className="text-dim text-base leading-relaxed">
                      Instant autocomplete, recent searches, and typo tolerance (&ldquo;headphnes&rdquo; &rarr; headphones).
                      Filter seamlessly by price range, star rating, brand, fast delivery, discount threshold, and stock availability.
                    </p>
                    <ul className="text-xs sm:text-sm font-mono text-dim space-y-2 pt-2">
                      <li className="flex items-center gap-2">
                        <span className="text-brand">✓</span> 3-level faceted catalog search
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-brand">✓</span> Voice &amp; barcode simulated input
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-brand">✓</span> Sort by Relevance, Price: Low to High, Ratings
                      </li>
                    </ul>
                  </div>
                )}

                {activeLoopStep === 1 && (
                  <div className="space-y-4">
                    <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-mono font-bold">
                      Step 02 of 04
                    </span>
                    <h3 className="d text-4xl sm:text-5xl font-black">Buy &amp; Hold Stock</h3>
                    <p className="text-dim text-base leading-relaxed">
                      Your cart syncs across devices, and guest carts merge automatically upon login.
                      At checkout, atomic database inventory locks hold stock for 15 minutes while the server recalculates every price.
                    </p>
                    <ul className="text-xs sm:text-sm font-mono text-dim space-y-2 pt-2">
                      <li className="flex items-center gap-2">
                        <span className="text-brand">✓</span> Razorpay Test Mode integration (UPI, Cards, Netbanking)
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-brand">✓</span> Cash on Delivery up to ₹50,000
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-brand">✓</span> Automated coupon validation on the backend
                      </li>
                    </ul>
                  </div>
                )}

                {activeLoopStep === 2 && (
                  <div className="space-y-4">
                    <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-mono font-bold">
                      Step 03 of 04
                    </span>
                    <h3 className="d text-4xl sm:text-5xl font-black">Track in Real Time</h3>
                    <p className="text-dim text-base leading-relaxed">
                      Five distinct lifecycle stages: Placed, Packed, Shipped, Out for Delivery, and Delivered.
                      Status updates poll every 30 seconds, while last-known states remain cached offline for bad network conditions.
                    </p>
                    <ul className="text-xs sm:text-sm font-mono text-dim space-y-2 pt-2">
                      <li className="flex items-center gap-2">
                        <span className="text-brand">✓</span> Push notifications &amp; transactional email alerts
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-brand">✓</span> Live simulated dispatch checkpoints
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-brand">✓</span> One-tap cancellation before shipment
                      </li>
                    </ul>
                  </div>
                )}

                {activeLoopStep === 3 && (
                  <div className="space-y-4">
                    <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-xs font-mono font-bold">
                      Step 04 of 04
                    </span>
                    <h3 className="d text-4xl sm:text-5xl font-black">7-Day Returns &amp; Refunds</h3>
                    <p className="text-dim text-base leading-relaxed">
                      Return eligible delivered products within 7 calendar days with a reason and photo proof.
                      Sellers or admins approve requests, and refunds route directly back to the original payment source.
                    </p>
                    <ul className="text-xs sm:text-sm font-mono text-dim space-y-2 pt-2">
                      <li className="flex items-center gap-2">
                        <span className="text-brand">✓</span> Full or partial refunds supported
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-brand">✓</span> Photo evidence stored securely
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-brand">✓</span> Complete audit log of return resolutions
                      </li>
                    </ul>
                  </div>
                )}

                <div className="pt-6">
                  <Link href="/products" className="btn sm">
                    Start Shopping &rarr;
                  </Link>
                </div>
              </div>

              {/* Vector Graphic Phone Display */}
              <div className="md:col-span-6 flex justify-center">
                <svg className="w-full max-w-[280px] h-auto text-text" viewBox="0 0 300 520" role="img" aria-label="Phone preview">
                  <rect x="15" y="10" width="270" height="500" rx="36" fill="var(--bg)" stroke="currentColor" strokeWidth="2" />
                  <rect x="100" y="20" width="100" height="14" rx="7" fill="var(--line)" />
                  {activeLoopStep === 0 && (
                    <g>
                      <rect x="35" y="60" width="230" height="36" rx="18" fill="var(--surface)" stroke="currentColor" strokeWidth="1.5" />
                      <text x="50" y="83" fill="var(--brand)" fontSize="13" fontFamily="Plus Jakarta Sans">headphnes</text>
                      <text x="35" y="125" fill="var(--dim)" fontSize="11" fontFamily="Plus Jakarta Sans">Showing results for &quot;headphones&quot;</text>
                      <rect x="35" y="145" width="230" height="70" rx="12" fill="var(--surface)" />
                      <rect x="35" y="230" width="230" height="70" rx="12" fill="var(--surface)" />
                      <rect x="35" y="315" width="230" height="70" rx="12" fill="var(--surface)" />
                    </g>
                  )}
                  {activeLoopStep === 1 && (
                    <g>
                      <text x="35" y="70" fill="var(--text)" fontSize="16" fontWeight="bold" fontFamily="Plus Jakarta Sans">Checkout</text>
                      <rect x="35" y="90" width="230" height="28" rx="8" fill="var(--surface)" />
                      <text x="45" y="108" fill="var(--brand)" fontSize="11" fontFamily="Plus Jakarta Sans">Stock held for 15 min</text>
                      <rect x="35" y="130" width="230" height="90" rx="12" fill="var(--surface)" />
                      <rect x="35" y="235" width="230" height="40" rx="20" fill="var(--brand)" />
                      <text x="150" y="260" fill="#17120a" fontSize="14" fontWeight="bold" textAnchor="middle" fontFamily="Plus Jakarta Sans">Pay ₹14,999</text>
                    </g>
                  )}
                  {activeLoopStep === 2 && (
                    <g>
                      <text x="35" y="70" fill="var(--text)" fontSize="16" fontWeight="bold" fontFamily="Plus Jakarta Sans">Track Order</text>
                      <circle cx="50" cy="110" r="6" fill="var(--brand)" />
                      <line x1="50" y1="116" x2="50" y2="170" stroke="var(--brand)" strokeWidth="2" />
                      <circle cx="50" cy="170" r="6" fill="var(--brand)" />
                      <line x1="50" y1="176" x2="50" y2="230" stroke="var(--brand)" strokeWidth="2" />
                      <circle cx="50" cy="230" r="6" fill="var(--brand)" />
                      <line x1="50" y1="236" x2="50" y2="290" stroke="var(--brand)" strokeWidth="2" />
                      <circle cx="50" cy="290" r="6" fill="var(--brand)" />
                      <line x1="50" y1="296" x2="50" y2="350" stroke="var(--line)" strokeWidth="2" />
                      <circle cx="50" cy="350" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                      <text x="70" y="115" fill="var(--text)" fontSize="12" fontFamily="Plus Jakarta Sans">Order Placed</text>
                      <text x="70" y="175" fill="var(--text)" fontSize="12" fontFamily="Plus Jakarta Sans">Packed at Hub</text>
                      <text x="70" y="235" fill="var(--text)" fontSize="12" fontFamily="Plus Jakarta Sans">Shipped</text>
                      <text x="70" y="295" fill="var(--brand)" fontSize="12" fontWeight="bold" fontFamily="Plus Jakarta Sans">Out for Delivery</text>
                      <text x="70" y="355" fill="var(--dim)" fontSize="12" fontFamily="Plus Jakarta Sans">Delivered</text>
                    </g>
                  )}
                  {activeLoopStep === 3 && (
                    <g>
                      <text x="35" y="70" fill="var(--text)" fontSize="16" fontWeight="bold" fontFamily="Plus Jakarta Sans">Return Window</text>
                      <rect x="35" y="90" width="230" height="90" rx="12" fill="var(--surface)" />
                      <text x="150" y="140" fill="var(--brand)" fontSize="36" fontWeight="bold" textAnchor="middle" fontFamily="Plus Jakarta Sans">7</text>
                      <text x="150" y="165" fill="var(--dim)" fontSize="12" textAnchor="middle" fontFamily="Plus Jakarta Sans">Days Hassle-Free Returns</text>
                      <rect x="35" y="200" width="230" height="38" rx="10" fill="var(--line)" />
                      <text x="45" y="224" fill="var(--text)" fontSize="11" fontFamily="Plus Jakarta Sans">Reason: Defective or Wrong Item</text>
                      <rect x="35" y="250" width="230" height="38" rx="10" fill="var(--line)" />
                      <text x="45" y="274" fill="var(--text)" fontSize="11" fontFamily="Plus Jakarta Sans">Proof: 2 Photos Uploaded</text>
                    </g>
                  )}
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* DEALS OF THE DAY */}
        <section className="py-20" id="deals">
          <div className="w max-w-7xl mx-auto px-4">
            <div className="dh flex justify-between items-end gap-8 flex-wrap mb-12">
              <div>
                <p className="m text-sm font-mono text-dim mb-2">Deals of the day</p>
                <h2 className="d text-4xl sm:text-6xl lg:text-[80px] font-black leading-none" data-s>
                  Gone when the clock says so
                </h2>
              </div>
              <div className="cd d flex text-4xl sm:text-6xl lg:text-7xl font-mono font-bold tracking-tight text-brand" role="timer" aria-label="Time left in today's deals">
                <span id="h">{hours}</span>
                <span>:</span>
                <span id="mi">{minutes}</span>
                <span>:</span>
                <span id="s">{seconds}</span>
              </div>
            </div>

            {/* LIVE DEALS ITEMS WITH REAL PRODUCT PHOTOGRAPHY */}
            {deals.length > 0 && (
              <div className="mb-16">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {deals.map((deal) => {
                    const discountPercent = Math.round(
                      ((deal.original_price_paise - deal.deal_price_paise) / deal.original_price_paise) * 100
                    );
                    const dealImg = getProductImage(deal.title, 'Electronics');

                    return (
                      <div key={deal.id} className="p-5 rounded-2xl bg-surface border border-line flex flex-col justify-between group hover:border-brand transition-all duration-200">
                        <div>
                          <div className="relative w-full h-48 rounded-xl overflow-hidden bg-bg mb-4 flex items-center justify-center">
                            <img
                              src={dealImg}
                              alt={deal.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-xs font-mono bg-brand text-on-brand font-bold shadow">
                              {discountPercent}% OFF
                            </span>
                          </div>

                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-mono text-dim">
                              {deal.sold_count} / {deal.quantity_cap} claimed
                            </span>
                            <span className="text-xs font-mono text-brand font-semibold">
                              Lightning Deal
                            </span>
                          </div>
                          <h4 className="font-semibold text-base line-clamp-2 mb-1 text-text group-hover:text-brand transition-colors">
                            {deal.title}
                          </h4>
                          <p className="text-xs text-dim font-mono mb-4">Brand: {deal.brand}</p>
                        </div>
                        <div className="flex items-baseline justify-between pt-3 border-t border-line/60">
                          <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl font-bold text-[var(--ax)]">
                              ₹{(deal.deal_price_paise / 100).toLocaleString('en-IN')}
                            </span>
                            <span className="text-sm line-through text-dim">
                              ₹{(deal.original_price_paise / 100).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <Link href={`/products/${deal.id}`} className="text-xs font-mono text-dim group-hover:text-text transition-colors">
                            Claim &rarr;
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5 Distinct Deal Mechanisms */}
            <div className="dg grid grid-cols-1 md:grid-cols-12 gap-6 pt-8 border-t border-line">
              <article className="dl md:col-span-4 p-6 rounded-2xl bg-surface border border-line">
                <h3 className="d text-2xl font-bold mb-2">Lightning deals</h3>
                <p className="text-dim text-sm leading-relaxed">
                  A deal price with a start, an end and a quantity cap. When the cap or the clock runs out, the deal automatically terminates on the server.
                </p>
              </article>

              <article className="dl md:col-span-4 p-6 rounded-2xl bg-surface border border-line">
                <h3 className="d text-2xl font-bold mb-2">Coupons</h3>
                <p className="text-dim text-sm leading-relaxed">
                  Discount codes with minimum cart value, total usage caps, and per-user limits, fully verified and applied during checkout calculation.
                </p>
              </article>

              <article className="dl md:col-span-4 p-6 rounded-2xl bg-surface border border-line">
                <h3 className="d text-2xl font-bold mb-2">Bank offers</h3>
                <p className="text-dim text-sm leading-relaxed">
                  Checkout discounts on simulated card or UPI payments, clearly marked for testing without charging real money.
                </p>
              </article>

              <article className="dl md:col-span-6 p-6 rounded-2xl bg-surface border border-line">
                <h3 className="d text-2xl font-bold mb-2">Seasonal campaigns</h3>
                <p className="text-dim text-sm leading-relaxed">
                  Admin-managed promotional banners and collection arrangements with customized scheduling windows.
                </p>
              </article>

              <article className="dl md:col-span-6 p-6 rounded-2xl bg-surface border border-line">
                <h3 className="d text-2xl font-bold mb-2">Price-drop alerts</h3>
                <p className="text-dim text-sm leading-relaxed">
                  Wishlist items notify customers when prices decrease or out-of-stock items are replenished.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* STORE DEPARTMENTS WITH REAL PHOTOGRAPHY */}
        <section className="py-20 border-t border-line" id="cats">
          <div className="w max-w-7xl mx-auto px-4">
            <div className="intro grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-end mb-12">
              <div>
                <p className="m text-sm font-mono text-dim mb-2">Curated Categories</p>
                <h2 className="d text-4xl sm:text-6xl lg:text-[80px] font-black leading-none" data-s>
                  Shop by Department
                </h2>
              </div>
              <p className="text-dim text-base sm:text-lg max-w-md leading-relaxed" data-r>
                Explore our 3-level taxonomy. Each top-level shelf features deep attribute-powered filtering, ratings, and instant stock availability.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {STORE_DEPARTMENTS.map((dept, idx) => (
                <Link
                  key={idx}
                  href={dept.link}
                  className="dept-card group rounded-2xl overflow-hidden bg-surface border border-line flex flex-col justify-between hover:border-brand transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="h-44 w-full relative overflow-hidden bg-bg">
                    <img
                      src={dept.image}
                      alt={dept.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-mono text-brand font-semibold block mb-1">
                        {dept.itemsCount}
                      </span>
                      <h3 className="text-lg font-bold text-text mb-1 group-hover:text-brand transition-colors">
                        {dept.name}
                      </h3>
                      <p className="text-xs text-dim line-clamp-2 leading-relaxed">
                        {dept.desc}
                      </p>
                    </div>
                    <div className="pt-4 mt-4 border-t border-line/60 flex items-center justify-between text-xs font-mono text-dim group-hover:text-text">
                      <span>Explore</span>
                      <span>&rarr;</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* STATS & RESILIENCE */}
        <section className="py-20 border-t border-line" id="stats">
          <div className="w max-w-7xl mx-auto px-4">
            <div className="sg grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="border-t border-line pt-3">
                <div className="big d text-5xl sm:text-7xl lg:text-[96px] font-black leading-none" data-n="525" data-x="+">
                  525+
                </div>
                <p className="m text-xs sm:text-sm text-dim mt-2">seeded products with variants and real stock</p>
              </div>
              <div className="border-t border-line pt-3">
                <div className="big d text-5xl sm:text-7xl lg:text-[96px] font-black leading-none" data-n="15">
                  15
                </div>
                <p className="m text-xs sm:text-sm text-dim mt-2">minute stock hold at checkout</p>
              </div>
              <div className="border-t border-line pt-3">
                <div className="big d text-5xl sm:text-7xl lg:text-[96px] font-black leading-none" data-n="30">
                  30
                </div>
                <p className="m text-xs sm:text-sm text-dim mt-2">second polling for order tracking</p>
              </div>
              <div className="border-t border-line pt-3">
                <div className="big d text-5xl sm:text-7xl lg:text-[96px] font-black leading-none" data-n="7">
                  7
                </div>
                <p className="m text-xs sm:text-sm text-dim mt-2">day return window after delivery</p>
              </div>
            </div>

            {/* BUILT FOR BAD DAYS */}
            <div className="bad grid grid-cols-1 md:grid-cols-2 gap-12 mt-16 items-center">
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
                <h3 className="d text-3xl sm:text-5xl font-black mb-4 leading-tight" data-s>
                  Built for bad days
                </h3>
                <p className="text-dim text-base sm:text-lg leading-relaxed" data-r>
                  Slow networks, sleeping backend instances, or intermittent connectivity. Features built-in skeleton loaders, automated exponential retries, and offline-readable local carts and order statuses.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* AI SHOPPING ASSISTANT */}
        <section className="py-20 border-t border-line" id="ai">
          <div className="w ag grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto px-4">
            <div>
              <p className="m text-sm font-mono text-dim mb-2">AI shopping assistant</p>
              <h2 className="d text-4xl sm:text-6xl lg:text-[76px] font-black leading-none my-4" data-s>
                Ask anything. <em className="accent-serif">Confirm every action.</em>
              </h2>
              <p className="text-dim text-base sm:text-lg leading-relaxed mb-6" data-r>
                Search, compare, summarise reviews and Q&amp;A, find coupons and check where an order is. It never places, cancels, returns or refunds without your tap in the chat, never asks for card data, and says it doesn&apos;t know instead of inventing a price.
              </p>
              <ul className="lm m flex flex-wrap gap-4 text-xs sm:text-sm font-mono text-dim p-0 list-none">
                <li className="px-3 py-1 rounded-full border border-line">30 messages a day</li>
                <li className="px-3 py-1 rounded-full border border-line">1,500 characters</li>
                <li className="px-3 py-1 rounded-full border border-line">10 tool calls per reply</li>
              </ul>
            </div>

            {/* Interactive Chat Mockup */}
            <div className="chat flex flex-col gap-3.5 p-6 sm:p-8 bg-surface rounded-3xl min-h-[460px] border border-line" id="chat">
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
                    <img
                      src="/photos/products/sony-headphones-black.webp"
                      alt="Headphones deal"
                      className="w-12 h-12 rounded-lg object-cover flex-none"
                    />
                    <div>
                      <b className="block font-semibold">Deals found</b>
                      <span className="text-dim text-xs">Prices come directly from our catalogue database.</span>
                    </div>
                  </div>
                  <div className="rc flex gap-3.5 items-center">
                    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center flex-none text-brand">
                      ★
                    </div>
                    <div>
                      <b className="block font-semibold">Review summary</b>
                      <span className="text-dim text-xs">Built from verified purchasers&apos; reviews.</span>
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

        {/* RULES THAT NEVER BREAK */}
        <section className="py-20 bg-surface/50 border-t border-line" id="rules">
          <div className="w max-w-7xl mx-auto px-4">
            <div className="max-w-3xl mb-12">
              <p className="m text-xs sm:text-sm font-mono text-brand font-semibold mb-2">Security &amp; Invariants</p>
              <h2 className="d text-4xl sm:text-6xl lg:text-[76px] font-black uppercase" id="rh">
                Rules that never break
              </h2>
            </div>
            <ul className="rl list-none p-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <li className="p-6 rounded-2xl bg-surface border border-line relative text-sm sm:text-base font-medium leading-relaxed">
                <span className="text-brand font-mono text-xs block mb-2 font-bold">01 · PRICING INVARIANT</span>
                The client never sets a price. The server recalculates every total, tax, and discount.
              </li>
              <li className="p-6 rounded-2xl bg-surface border border-line relative text-sm sm:text-base font-medium leading-relaxed">
                <span className="text-brand font-mono text-xs block mb-2 font-bold">02 · PAYMENT VERIFICATION</span>
                An order confirms only after server-side HMAC signature verification and the webhook capture.
              </li>
              <li className="p-6 rounded-2xl bg-surface border border-line relative text-sm sm:text-base font-medium leading-relaxed">
                <span className="text-brand font-mono text-xs block mb-2 font-bold">03 · CONCURRENCY SAFE</span>
                50 concurrent buyers of 10 inventory units: exactly 10 succeed, 40 safely fail without overselling.
              </li>
              <li className="p-6 rounded-2xl bg-surface border border-line relative text-sm sm:text-base font-medium leading-relaxed">
                <span className="text-brand font-mono text-xs block mb-2 font-bold">04 · IDEMPOTENT WEBHOOKS</span>
                Replay the same payment webhook 5 times: exactly one order confirmed, no duplicate charges.
              </li>
              <li className="p-6 rounded-2xl bg-surface border border-line relative text-sm sm:text-base font-medium leading-relaxed">
                <span className="text-brand font-mono text-xs block mb-2 font-bold">05 · RBAC AUTHORIZATION</span>
                Every API endpoint validates active session, user role, and resource ownership.
              </li>
              <li className="p-6 rounded-2xl bg-surface border border-line relative text-sm sm:text-base font-medium leading-relaxed">
                <span className="text-brand font-mono text-xs block mb-2 font-bold">06 · ZERO CARD LOGS</span>
                No raw credit or debit card data ever touches our servers, databases, or log files.
              </li>
            </ul>
          </div>
        </section>

        {/* FOUR ROLES, ONE MARKETPLACE */}
        <section className="py-20 border-t border-line" id="roles">
          <div className="w max-w-7xl mx-auto px-4">
            <h2 className="d text-4xl sm:text-6xl lg:text-[80px] font-black uppercase mb-12" data-s>
              Four roles, one marketplace
            </h2>
            <div className="space-y-8">
              <div className="rr grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-6 py-6 relative items-start">
                <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-line origin-left" />
                <h3 className="d text-4xl sm:text-5xl font-bold uppercase transition-all duration-300 hover:text-brand" data-s>
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
                <h3 className="d text-4xl sm:text-5xl font-bold uppercase transition-all duration-300 hover:text-brand" data-s>
                  Customer
                </h3>
                <p className="text-dim text-sm sm:text-base">
                  <b className="block text-text font-mono text-xs uppercase mb-1 font-bold">Can</b>
                  Run the whole shopping loop, write reviews, contact support and use the AI assistant.
                </p>
                <p className="text-dim text-sm sm:text-base">
                  <b className="block text-text font-mono text-xs uppercase mb-1 font-bold">Cannot</b>
                  See other users&apos; data, or use seller and admin tools.
                </p>
              </div>

              <div className="rr grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-6 py-6 relative items-start">
                <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-line origin-left" />
                <h3 className="d text-4xl sm:text-5xl font-bold uppercase transition-all duration-300 hover:text-brand" data-s>
                  Seller
                </h3>
                <p className="text-dim text-sm sm:text-base">
                  <b className="block text-text font-mono text-xs uppercase mb-1 font-bold">Can</b>
                  Manage their own catalogue, orders and returns, and see sales and the payout ledger. New sellers wait as pending until an admin approves them.
                </p>
                <p className="text-dim text-sm sm:text-base">
                  <b className="block text-text font-mono text-xs uppercase mb-1 font-bold">Cannot</b>
                  See other sellers&apos; data, moderate or refund.
                </p>
              </div>

              <div className="rr grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-6 py-6 relative items-start">
                <i className="ln absolute left-0 right-0 top-0 h-0.5 bg-line origin-left" />
                <h3 className="d text-4xl sm:text-5xl font-bold uppercase transition-all duration-300 hover:text-brand" data-s>
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

        {/* LIVE CATALOGUE PREVIEW WITH REAL PHOTOGRAPHY */}
        {featuredProducts.length > 0 && (
          <section className="py-20 border-t border-line" id="catalogue">
            <div className="w max-w-7xl mx-auto px-4">
              <div className="flex justify-between items-baseline mb-10 flex-wrap gap-4">
                <div>
                  <p className="m text-xs font-mono text-dim mb-1">Live from our 525 seeded products</p>
                  <h3 className="d text-3xl sm:text-5xl font-black uppercase">Browse the Catalogue</h3>
                </div>
                <Link href="/categories" className="btn g sm font-mono text-xs">
                  View all categories &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map((p) => {
                  const prodImg = getProductImage(p.title, p.category_name);

                  return (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      className="p-4 rounded-2xl bg-surface border border-line flex flex-col justify-between group hover:border-brand transition-all duration-200 hover:-translate-y-1"
                    >
                      <div>
                        <div className="w-full aspect-square rounded-xl overflow-hidden bg-bg mb-3.5 flex items-center justify-center">
                          <img
                            src={prodImg}
                            alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex justify-between items-center text-xs font-mono text-dim mb-1.5">
                          <span>{p.brand}</span>
                          <span className="text-[var(--ax)] font-semibold">★ {p.rating}</span>
                        </div>
                        <h4 className="font-semibold text-base line-clamp-2 mb-1 group-hover:text-[var(--ax)] transition-colors">
                          {p.title}
                        </h4>
                        <p className="text-xs text-dim mb-3">{p.category_name}</p>
                      </div>
                      <div className="pt-3 border-t border-line/60 flex justify-between items-baseline">
                        <span className="text-xl font-bold text-text">
                          ₹{(p.price_paise / 100).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-mono text-dim group-hover:text-text transition-colors">Details &rarr;</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
